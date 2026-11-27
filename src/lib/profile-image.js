// Preflight only: the existing server remains the authority for uploads and ownership.
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function signatureType(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return 'image/png';
  if (bytes.length >= 12 && [82, 73, 70, 70].every((value, index) => bytes[index] === value)
    && [87, 69, 66, 80].every((value, index) => bytes[index + 8] === value)) return 'image/webp';
  return '';
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    try { return bitmap.width > 0 && bitmap.height > 0; }
    finally { bitmap.close(); }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
      image.onerror = () => reject(new Error('Imagen dañada.'));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

export async function validateProfileImage(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const expected = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[extension];
  if (!expected || file.type !== expected || file.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error('Elige una imagen JPG, PNG o WEBP de hasta 5 MB.');
  }
  if (!file.size) throw new Error('La imagen está vacía. Elige otro archivo.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (signatureType(bytes) !== expected) throw new Error('El contenido del archivo no corresponde a una imagen JPG, PNG o WEBP válida.');
  try {
    if (!await decodeImage(file)) throw new Error('Sin dimensiones.');
  } catch {
    throw new Error('No pudimos abrir la imagen. Puede estar dañada; elige otro archivo.');
  }
}