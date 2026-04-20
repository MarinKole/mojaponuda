-- ============================================================
-- Sačuvati NoticeId i ProcedureId iz EJN award feed-a
-- ============================================================
--
-- Do sada je award sync čuvao samo AwardId (portal_award_id) i poneki match
-- na tender_id. Kad match nije pogodio (jer je tender bio iz starog perioda
-- koji nije u `tenders` tablici), informacija se zauvijek gubila.
--
-- Sada čuvamo NoticeId i ProcedureId kao dodatne identifikatore. Ovo nam
-- omogućava da kasnije, kada ingestiramo historijske tendere, rekonstruiramo
-- award ↔ tender link bez ponovnog pozivanja EJN API-ja.
--
-- Također indeksiramo procedure_name (trimovan) da fuzzy reconciliation
-- skripta može raditi brzo.

alter table public.award_decisions
  add column if not exists notice_id text,
  add column if not exists procedure_id text,
  -- procedure_name je dodat u migraciji 20260321123500_add_award_procedure_name.sql,
  -- ali neke baze su napravljene prije nje. Garantujemo njegovo postojanje ovdje
  -- da bi indeks ispod radio bez obzira na redoslijed migracija.
  add column if not exists procedure_name text;

-- Indeksi za post-hoc matching
create index if not exists award_decisions_notice_id_idx
  on public.award_decisions (notice_id)
  where notice_id is not null;

create index if not exists award_decisions_procedure_id_idx
  on public.award_decisions (procedure_id)
  where procedure_id is not null;

-- Composite indeks za fuzzy match po (authority + procedure_name)
create index if not exists award_decisions_authority_procedure_idx
  on public.award_decisions (contracting_authority_jib, procedure_name)
  where contracting_authority_jib is not null and procedure_name is not null;

-- Indeks za tender_id NULL filter (reconciliation skripta ga skenira)
create index if not exists award_decisions_tender_id_null_idx
  on public.award_decisions (tender_id)
  where tender_id is null;
