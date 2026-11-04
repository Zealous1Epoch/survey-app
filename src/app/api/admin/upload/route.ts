import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import sharp from "sharp";

// 允许的扩展名白名单（GIF 透传时使用，防止客户端伪造后缀落盘）
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "仅支持 JPG/PNG/GIF/WebP 格式" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "文件不能超过 10MB" }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());

    let filename: string;
    let output: Buffer;

    if (file.type === "image/gif") {
      // GIF 直接落盘，避免丢失动画
      const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
      const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : "gif";
      filename = `${uuid()}.${ext}`;
      output = buffer;
    } else {
      // 统一压缩：最长边 1600px、WebP 质量 80，自动修正 EXIF 方向
      const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
      const keepExt = ALLOWED_EXTENSIONS.has(rawExt) && rawExt !== "gif" ? rawExt : "jpg";
      let ext = "webp";
      try {
        const converted = await sharp(buffer)
          .rotate()
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        if (converted.length < buffer.length) {
          output = converted;
        } else {
          // WebP 对图案化/小图可能反而变大：只缩不胀，保留原图
          ext = keepExt;
          output = buffer;
        }
      } catch {
        // 无法解析的图像原样保存，不让上传失败
        ext = keepExt;
        output = buffer;
      }
      filename = `${uuid()}.${ext}`;
    }

    await writeFile(path.join(uploadsDir, filename), output);

    return NextResponse.json({ url: `/survey/uploads/${filename}` });
  } catch (error) {
    console.error("文件上传失败:", error);
    return NextResponse.json({ error: "文件上传失败" }, { status: 500 });
  }
}
