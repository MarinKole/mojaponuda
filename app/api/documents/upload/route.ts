import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  // Check subscription and limits
  const { plan } = await getSubscriptionStatus(user.id, user.email);

  // Dohvati company_id korisnika
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json(
      { error: "Firma nije pronađena." },
      { status: 404 }
    );
  }

  // Calculate current storage usage
  const { data: documents } = await supabase
    .from("documents")
    .select("size")
    .eq("company_id", company.id);

  const currentStorageBytes = documents?.reduce((acc, doc) => acc + (doc.size || 0), 0) || 0;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string | null;
  const type = formData.get("type") as string | null;
  const expiresAt = formData.get("expires_at") as string | null;

  if (!file || !name) {
    return NextResponse.json(
      { error: "Naziv i fajl su obavezni." },
      { status: 400 }
    );
  }

  // Check if new file fits in storage limit
  if (currentStorageBytes + file.size > plan.limits.maxStorageBytes) {
    return NextResponse.json(
      { 
        error: "Prekoračen limit prostora za dokumente.",
        code: "LIMIT_REACHED",
        limit: plan.limits.maxStorageBytes,
        current: currentStorageBytes,
        upgradeRequired: true
      },
      { status: 403 }
    );
  }

  // Upload u Supabase Storage: {company_id}/{timestamp}_{filename}
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${company.id}/${timestamp}_${sanitizedFilename}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json(
      { error: "Greška pri uploadu fajla." },
      { status: 500 }
    );
  }

  // Kreiraj zapis u bazi
  const { data: document, error: dbError } = await supabase
    .from("documents")
    .insert({
      company_id: company.id,
      name: name.trim(),
      type: type || null,
      file_path: storagePath,
      expires_at: expiresAt || null,
      size: file.size, // Save file size
    })
    .select()
    .single();

  if (dbError) {
    console.error("DB insert error:", dbError);
    // Pokušaj obrisati uploadani fajl ako DB insert propadne
    await supabase.storage.from("documents").remove([storagePath]);
    return NextResponse.json(
      { error: "Greška pri spremanju dokumenta." },
      { status: 500 }
    );
  }

  return NextResponse.json({ document }, { status: 201 });
}

