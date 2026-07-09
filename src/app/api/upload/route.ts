import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MIME_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const ALLOWED_TYPES = Object.keys(MIME_MAP);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }

    const ext = MIME_MAP[file.type];
    if (!ext) {
      return NextResponse.json({
        error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, PDF, DOC, DOCX`,
      }, { status: 400 });
    }

    const maxSize = type === 'candidate_doc' ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `File size exceeds ${type === 'candidate_doc' ? '10MB' : '2MB'} limit`,
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const filename = `${type}_${timestamp}.${ext}`;

    const uploadDir = process.env.VERCEL
      ? path.join('/tmp', 'uploads')
      : path.join(process.cwd(), 'public', 'uploads');

    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const url = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
