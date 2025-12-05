import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, data } = body as { filename?: string; data?: string };
    if (!data) return NextResponse.json({ error: "No data provided" }, { status: 400 });

    // data should be a data URL or base64 string
    const matches = data.match(/^data:(.+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = "";
    if (matches) {
      const mime = matches[1];
      const b64 = matches[2];
      buffer = Buffer.from(b64, "base64");
      // derive extension from mime
      ext = mime.split("/").pop() || "bin";
    } else {
      // assume raw base64
      buffer = Buffer.from(data, "base64");
      ext = filename?.split(".").pop() || "bin";
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const name = `${uuidv4()}.${ext}`;
    const filePath = path.join(uploadsDir, name);
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${name}`;
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("/api/assets/upload error", err);
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
