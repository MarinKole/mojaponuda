import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import { buildProfileContextText } from "@/lib/company-profile";

export const maxDuration = 30;

const SYSTEM_PROMPT = `Ti si ekspert za javne nabavke i CPV (Common Procurement Vocabulary) kodove.
Tvoj zadatak je da na osnovu opisa djelatnosti firme generišeš profil za pretragu tendera.

Izlaz mora biti JSON objekat sa sljedećim poljima:
- cpv_codes: niz stringova (samo glavni kodovi, npr. "45000000-7")
- keywords: niz stringova (ključne riječi za pretragu, na bosanskom jeziku, skraćene na korijen riječi kako bi hvatale sve padeže npr. umjesto "gradnja" koristi "gradnj", umjesto "rekonstrukcija" koristi "rekonstrukcij", max 15 riječi)
- suggested_regions: niz stringova sa regijama koje imaju smisla za ovaj profil; ako korisnik već pošalje regije, vrati iste te regije
- summary: kratki sažetak profila firme za internu upotrebu, do 2 rečenice

Budi precizan i fokusiraj se na ono što je najrelevantnije za javne nabavke.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      description,
      primaryIndustry,
      offeringCategories = [],
      preferredTenderTypes = [],
      regions = [],
    } = await request.json();

    if (!description || description.length < 10) {
      return NextResponse.json(
        { error: "Opis djelatnosti je prekratak." },
        { status: 400 }
      );
    }

    const profileContext = buildProfileContextText({
      description,
      primaryIndustry: primaryIndustry ?? null,
      offeringCategories,
      preferredTenderTypes,
      regions,
    });

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Na osnovu sljedećeg profila firme generiši CPV kodove i ključne riječi za pretragu tendera:\n\n${profileContext}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content from AI");

    const profile = JSON.parse(content);

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile generation error:", error);
    return NextResponse.json(
      { error: "Greška prilikom generisanja profila." },
      { status: 500 }
    );
  }
}
