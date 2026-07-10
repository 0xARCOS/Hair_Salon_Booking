// Compresión de fotos en el cliente antes de persistir en IndexedDB:
// redimensiona al lado máximo y re-codifica a JPEG. Una foto de móvil de
// ~4 MB queda en ~150-300 KB, suficiente para una ficha de peluquería.

const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.8;

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no soportado en este navegador");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) throw new Error("No se pudo comprimir la imagen");
  return blob;
}
