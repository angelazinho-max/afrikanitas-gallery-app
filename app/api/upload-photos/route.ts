import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const normalizeName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const cliente = String(formData.get("cliente") || "");
    const files = formData.getAll("files") as File[];

    if (!cliente) {
      return NextResponse.json(
        { error: "Nome do cliente em falta." },
        { status: 400 }
      );
    }

    if (!files.length) {
      return NextResponse.json(
        { error: "Nenhuma fotografia enviada." },
        { status: 400 }
      );
    }

    const folderName = normalizeName(cliente);

    let uploaded = 0;

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const originalPath = `${folderName}/originals/${file.name}`;
      const previewPath = `${folderName}/previews/${file.name}.webp`;

      await supabaseAdmin.storage.from("photos").upload(originalPath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

      const previewBuffer = await sharp(buffer)
        .rotate()
        .resize({
          width: 1600,
          withoutEnlargement: true,
        })
        .webp({
          quality: 70,
        })
        .toBuffer();

      await supabaseAdmin.storage.from("photos").upload(previewPath, previewBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

      uploaded++;
    }

    return NextResponse.json({
      success: true,
      uploaded,
      message: `${uploaded} fotografia(s) carregada(s) com sucesso.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao processar fotografias." },
      { status: 500 }
    );
  }
}