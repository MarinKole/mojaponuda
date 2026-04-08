# Requirements Document

## Introduction

Sistem za poboljšanje kvaliteta i tačnosti sadržaja prilika (opportunities/poticaji) transformiše postojeći agregator u decision tool koji pruža stvarnu vrijednost korisnicima. Sistem rješava probleme netačnih izvora, generičkog AI sadržaja, slabih CTA-ova, nedostatka urgency signala, loše SEO optimizacije i nedostatka decision support elemenata.

## Glossary

- **Opportunity_System**: Sistem za prikupljanje, obradu i prikaz poslovnih prilika (poticaji, grantovi, javne nabavke)
- **Content_Generator**: AI modul koji generiše SEO-optimizovan sadržaj za prilike
- **Source_Validator**: Komponenta koja validira tačnost source_url polja
- **Decision_Tool**: Modul koji pruža analitičke podatke za donošenje odluka (konkurencija, šanse, tipične greške)
- **Urgency_Layer**: Vizualni i tekstualni elementi koji naglašavaju blizinu roka
- **Related_Opportunities**: Sistem za preporuku sličnih prilika sa kontekstom
- **SEO_Optimizer**: Komponenta koja osigurava optimizaciju sadržaja za pretraživače
- **CTA_Component**: Call-to-action elementi koji vode korisnika ka akciji
- **Filter_System**: Sistem za filtriranje i sortiranje prilika po različitim kriterijumima

## Requirements

### Requirement 1: Source URL Validation and Correction

**User Story:** Kao korisnik, želim da svaki post ima tačan source_url koji vodi na stvarni izvor, tako da mogu provjeriti autentičnost informacija.

#### Acceptance Criteria

1. WHEN Scraper_System prikuplja novu priliku, THE Source_Validator SHALL validirati da source_url vodi na dostupnu stranicu
2. WHEN source_url vraća HTTP status različit od 200-299, THE Source_Validator SHALL označiti priliku za manual review
3. THE Source_Validator SHALL provjeriti da URL domena odgovara očekivanom izvoru (npr. fmrpo.gov.ba za FMRPO prilike)
4. WHEN se detektuje netačan source_url, THE Opportunity_System SHALL logirati grešku sa detaljima (opportunity_id, očekivani izvor, stvarni URL)
5. THE Admin_Dashboard SHALL prikazati listu prilika sa netačnim izvorima za manual korekciju
6. WHEN admin koriguje source_url, THE Opportunity_System SHALL ažurirati bazu i označiti priliku kao validiranu

### Requirement 2: Contextual AI Content Generation

**User Story:** Kao korisnik, želim da sadržaj sadrži konkretne podatke i kontekst (historija poziva, statistika dodjela, tipični dobijači), tako da mogu procijeniti stvarnu vrijednost prilike.

#### Acceptance Criteria

1. WHEN Content_Generator generiše sadržaj, THE Content_Generator SHALL uključiti historijske podatke o sličnim pozivima iz baze (broj poziva u zadnjih 12 mjeseci)
2. WHERE historijski podaci postoje, THE Content_Generator SHALL uključiti statistiku o učestalosti poziva ("ovakvi pozivi se objavljuju 2-3 puta godišnje")
3. THE Content_Generator SHALL analizirati prethodne prilike od istog issuera i uključiti insights ("prošle godine ova institucija je dodijelila 15 grantova")
4. THE Content_Generator SHALL izbjeći generičke fraze ("odlična prilika", "ne propustite") i fokusirati se na konkretne činjenice
5. WHEN generiše ai_content, THE Content_Generator SHALL strukturirati sadržaj sa konkretnim podacima u prvom paragrafu
6. THE Content_Generator SHALL uključiti eligibility_signals u kontekst ("ovaj poziv je namijenjen MSP u proizvodnom sektoru")

### Requirement 3: Outcome-Focused Call-to-Action

**User Story:** Kao korisnik, želim CTA koji jasno komunicira outcome i vrijednost akcije, tako da razumijem šta dobijam klikom.

#### Acceptance Criteria

1. THE CTA_Component SHALL zamijeniti generički "Prati ovu priliku" sa outcome-fokusiranim tekstom
2. WHEN prilika ima deadline, THE CTA_Component SHALL prikazati "Automatski prati rok i dokumentaciju" kao primarni CTA
3. WHEN prilika ima kompleksne uvjete, THE CTA_Component SHALL ponuditi "Provjeri ispunjavaš li uslove" kao sekundarni CTA
4. THE CTA_Component SHALL prikazati "Dobij checklistu za prijavu" za prilike sa ai_difficulty = "tesko"
5. WHEN korisnik nije prijavljen, THE CTA_Component SHALL voditi na signup sa kontekstom (opportunity_id, category)
6. WHEN korisnik je prijavljen, THE CTA_Component SHALL omogućiti direktno praćenje prilike sa potvrdom

### Requirement 4: Visual Urgency Layer

**User Story:** Kao korisnik, želim da vizualno vidim koliko je hitna prilika, tako da mogu prioritizovati svoje akcije.

#### Acceptance Criteria

1. WHEN rok za prijavu je ≤ 7 dana, THE Urgency_Layer SHALL prikazati urgency banner na vrhu opportunity page
2. WHEN rok je ≤ 3 dana, THE Urgency_Layer SHALL koristiti crvenu boju i "⚡" emoji
3. WHEN rok je ≤ 7 dana, THE Urgency_Layer SHALL koristiti narandžastu boju i "⏰" emoji
4. THE Urgency_Layer SHALL prikazati tačan broj dana do roka u formatu "ROK ZA PRIJAVU ZA X DANA"
5. WHEN rok je istekao, THE Urgency_Layer SHALL prikazati "ROK ZA PRIJAVU JE ISTEKAO" sa Ban ikonom
6. THE Opportunity_Card SHALL prikazati urgency badge za prilike sa rokom ≤ 7 dana u listama

### Requirement 5: SEO-Optimized Content Structure

**User Story:** Kao vlasnik platforme, želim da sadržaj rangira na Google.ba za relevantne upite, tako da privučem organički trafik.

#### Acceptance Criteria

1. THE SEO_Optimizer SHALL osigurati da prvi paragraf ai_content sadrži: tip finansiranja, lokaciju, ciljanu skupinu i godinu (2026)
2. THE SEO_Optimizer SHALL generirati seo_title u formatu "[Vrsta] za [ko] u [lokacija] (2026)" umjesto kopiranja originalnog naslova
3. THE SEO_Optimizer SHALL uključiti prirodno keywordove: "poticaji", "grantovi", lokacija, "BiH", "2026" u ai_content
4. THE SEO_Optimizer SHALL osigurati da seo_description sadrži akcijsku riječ (Prijavite se, Saznajte, Iskoristite)
5. THE SEO_Optimizer SHALL limitirati seo_title na 65 znakova i seo_description na 140-155 znakova
6. THE Content_Generator SHALL strukturirati ai_content sa jasnim heading-ima (## O ovom pozivu, ## Ko treba aplicirati)

### Requirement 6: Enhanced Related Opportunities

**User Story:** Kao korisnik, želim da vidim relevantne slične prilike sa objašnjenjem zašto su slične, tako da mogu istražiti dodatne opcije.

#### Acceptance Criteria

1. THE Related_Opportunities SHALL prikazati 3-5 sličnih prilika rankiranih po relevantnosti (category, location, type)
2. WHEN prikazuje sličnu priliku, THE Related_Opportunities SHALL uključiti kratak opis zašto je slična ("Ista kategorija, isti kanton")
3. THE Related_Opportunities SHALL prikazati key metadata za svaku sličnu priliku (deadline, value, difficulty)
4. THE Related_Opportunities SHALL prioritizovati aktivne prilike sa bliskim rokovima
5. THE Related_Opportunities SHALL izbjeći prikazivanje isteklih prilika osim ako nema aktivnih alternativa
6. THE Related_Opportunities SHALL uključiti link ka kategoriji za prikaz svih sličnih prilika

### Requirement 7: Decision Support Module

**User Story:** Kao korisnik, želim da vidim analizu konkurencije, tipičnih grešaka i šansi za uspjeh, tako da mogu donijeti informisanu odluku o prijavi.

#### Acceptance Criteria

1. THE Decision_Tool SHALL generirati "Koliko je ovo dobra prilika?" sekciju za svaku priliku
2. THE Decision_Tool SHALL prikazati procjenu konkurencije (niska/srednja/visoka) baziranu na historijskim podacima
3. WHEN postoje podaci o prošlim pozivima, THE Decision_Tool SHALL prikazati broj prijava i broj dodjela
4. THE Decision_Tool SHALL generirati listu "Tipične greške pri prijavi" baziranu na requirements i ai_difficulty
5. THE Decision_Tool SHALL prikazati "Šansa za uspjeh" procjenu baziranu na eligibility_signals i konkurenciji
6. THE Decision_Tool SHALL uključiti preporuku "Da li vrijedi aplicirati?" sa obrazloženjem

### Requirement 8: Advanced Opportunity Filtering

**User Story:** Kao korisnik, želim da filtriram prilike po hitnosti, iznosu i težini prijave, tako da brzo pronađem najrelevantnije opcije.

#### Acceptance Criteria

1. THE Filter_System SHALL omogućiti filtriranje po "Rok uskoro" (deadline ≤ 14 dana)
2. THE Filter_System SHALL omogućiti sortiranje po "Najveći iznosi" (value DESC)
3. THE Filter_System SHALL omogućiti filtriranje po "Najlakši za dobiti" (ai_difficulty = "lako")
4. THE Filter_System SHALL omogućiti kombinovanje filtera (npr. "Rok uskoro" + "Lako")
5. THE Filter_System SHALL prikazati broj rezultata za svaki filter prije primjene
6. THE Filter_System SHALL sačuvati filter preferences u URL query parametrima za dijeljenje

### Requirement 9: Content Quality Monitoring

**User Story:** Kao admin, želim da vidim metriku kvaliteta sadržaja i identifikujem problematične prilike, tako da mogu kontinuirano poboljšavati sistem.

#### Acceptance Criteria

1. THE Opportunity_System SHALL računati quality_score baziran na: tačnost source_url, kompletnost AI sadržaja, SEO optimizaciju
2. THE Admin_Dashboard SHALL prikazati listu prilika sa quality_score < 70 za review
3. THE Opportunity_System SHALL logirati AI review rejections sa razlogom
4. THE Admin_Dashboard SHALL prikazati statistiku: broj objavljenih, broj odbijenih, prosječan quality_score
5. THE Opportunity_System SHALL omogućiti manual override za AI review odluke
6. THE Admin_Dashboard SHALL prikazati trend kvaliteta sadržaja tokom vremena (chart)

### Requirement 10: Historical Context Integration

**User Story:** Kao korisnik, želim da vidim historiju poziva od iste institucije, tako da mogu procijeniti pouzdanost i učestalost.

#### Acceptance Criteria

1. WHEN prikazuje opportunity page, THE Opportunity_System SHALL prikazati "Drugi pozivi od [issuer]" sekciju
2. THE Opportunity_System SHALL prikazati do 3 prethodna poziva od istog issuera
3. THE Opportunity_System SHALL uključiti status svakog prethodnog poziva (aktivan/istekao)
4. WHEN postoji trend (npr. godišnji poziv), THE Opportunity_System SHALL prikazati "Ovaj poziv se objavljuje svake godine u [mjesec]"
5. THE Opportunity_System SHALL prikazati ukupan broj poziva od issuera u zadnjih 12 mjeseci
6. THE Opportunity_System SHALL omogućiti klik na issuer za prikaz svih njihovih poziva
