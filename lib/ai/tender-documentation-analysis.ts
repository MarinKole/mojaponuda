import { getOpenAIClient } from "@/lib/openai";
import type { Tender } from "@/types/database";
import type { AnalysisChecklistItem, AnalysisDeadline, AnalysisResult } from "@/lib/ai/tender-analysis";

export interface GroundedChecklistItem extends AnalysisChecklistItem {
  source_page: number;
  verbatim_quote: string;
}

const SYSTEM_PROMPT = `Ti si ekspert za javne nabavke u Bosni i Hercegovini.

U tekstu ispod — odlomci tenderske dokumentacije po stranicama — tvoj je zadatak:
- Izvući ISKLJUČIVO konkretne zahtjeve za dokumentaciju koje ponuđač mora dostaviti uz ponudu ili tijekom postupka (administrativni dio, obrazci, izjave, dokaz o registraciji, garancije, reference, itd.).
- NE dodavaj dokumente koji se ne spominju: bez “tipičnih” ili zakonskih pretpostavki ako ih tekst ne traži.
- NE dupliciraj isti zahtjev — svaka stavka mora biti jedinstvena.
- Ako u odlomcima nema zahtjeva za dokumentima, vrati prazan niz checklist_items.

Za svaku stavku obavezno navedi:
- name: kratak jasan naziv traženog dokumenta/zahtjeva
- description: šta točno treba (jezik kao u dokumentaciji, sažeto)
- document_type: jedna od klasifikacija (registration|tax|contributions|guarantee|reference|financial|staff|license|declaration|other)
- is_required: true ako je obavezno, false samo ako tekst jasno kaže opcionalno
- source_page: broj stranice tačno onaj iz zaglavlja --- STRANICA N --- u korisničkoj poruci
- verbatim_quote: DOSLOVAN citat iz te stranice (minimalno 15 znakova), mora biti identičan odlomku iz teksta te stranice (razmaci mogu varirati malo, ali sadržaj mora biti isti)
- risk_note: null ili kratka napomena ako tekst ukazuje na stroge/česte greške

Rokovi i rizike općenito: popuni deadlines, eligibility_conditions, risk_flags samo ako proizlaze iz istog teksta; inače prazne nizove.

Odgovori ISKLJUČIVO u JSON shemi.`;

const RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "tender_documentation_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        checklist_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              document_type: {
                type: "string",
                enum: [
                  "registration",
                  "tax",
                  "contributions",
                  "guarantee",
                  "reference",
                  "financial",
                  "staff",
                  "license",
                  "declaration",
                  "other",
                ],
              },
              is_required: { type: "boolean" },
              risk_note: { type: ["string", "null"] },
              source_page: { type: "integer", minimum: 1 },
              verbatim_quote: { type: "string", minLength: 15 },
            },
            required: [
              "name",
              "description",
              "document_type",
              "is_required",
              "risk_note",
              "source_page",
              "verbatim_quote",
            ],
            additionalProperties: false,
          },
        },
        deadlines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              date: { type: "string" },
            },
            required: ["label", "date"],
            additionalProperties: false,
          },
        },
        eligibility_conditions: { type: "array", items: { type: "string" } },
        risk_flags: { type: "array", items: { type: "string" } },
      },
      required: ["checklist_items", "deadlines", "eligibility_conditions", "risk_flags"],
      additionalProperties: false,
    },
  },
};

export async function analyzeTenderDocumentationText(params: {
  tender: Tender;
  pageTextForPrompt: string;
  pages: Array<{ pageNumber: number; text: string }>;
}): Promise<{ analysis: AnalysisResult; groundedItems: GroundedChecklistItem[] }> {
  const { tender, pageTextForPrompt, pages } = params;
  const pageMap = new Map(pages.map((p) => [p.pageNumber, p.text] as const));

  const tenderIntro = [
    `Naziv: ${tender.title}`,
    tender.contracting_authority ? `Naručilac: ${tender.contracting_authority}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${tenderIntro}\n\n--- DOKUMENTACIJA PO STRANICAMA ---\n\n${pageTextForPrompt}`,
      },
    ],
    response_format: RESPONSE_SCHEMA,
    temperature: 0.1,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("AI nije vratio odgovor.");
  }

  const parsed = JSON.parse(raw) as {
    checklist_items: GroundedChecklistItem[];
    deadlines: AnalysisDeadline[];
    eligibility_conditions: string[];
    risk_flags: string[];
  };

  const groundedItems: GroundedChecklistItem[] = [];
  for (const item of parsed.checklist_items) {
    const pageText = pageMap.get(item.source_page);
    if (!pageText) {
      continue;
    }
    const normPage = pageText.replace(/\s+/g, " ").toLowerCase();
    const normQuote = item.verbatim_quote.replace(/\s+/g, " ").toLowerCase().trim();
    if (normQuote.length < 12) {
      continue;
    }
    if (!normPage.includes(normQuote)) {
      continue;
    }
    groundedItems.push(item);
  }

  const analysis: AnalysisResult = {
    checklist_items: groundedItems.map(
      ({ source_page: _sp, verbatim_quote: _vq, ...rest }) => rest
    ),
    deadlines: parsed.deadlines ?? [],
    eligibility_conditions: parsed.eligibility_conditions ?? [],
    risk_flags: parsed.risk_flags ?? [],
  };

  return { analysis, groundedItems };
}
