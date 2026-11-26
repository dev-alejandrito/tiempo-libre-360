import { db, q, fail, BUCKET } from './core.server.js';

export const PROFILE_IMAGE_MAX = 5 * 1024 * 1024;
export function validProfileImagePath(uid, path) {
  return typeof path === 'string' && path.startsWith(uid + '/profile/') && !path.includes('..') && /\.(jpg|jpeg|png|webp)$/.test(path);
}
function imageType(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return 'image/png';
  const text = new TextDecoder().decode(bytes.slice(0,12));
  return text.startsWith('RIFF') && text.endsWith('WEBP') ? 'image/webp' : '';
}
export async function saveProfileImage(me, body) {
  const column = body.kind === 'avatar' ? 'avatar_path' : body.kind === 'cover' ? 'cover_path' : '';
  if (!column || !validProfileImagePath(me.id, body.path)) fail('Imagen no válida.');
  const { data: blob, error } = await db.storage.from(BUCKET).download(body.path);
  if (error || !blob) fail('No encontramos la imagen subida.');
  if (!blob.size || blob.size > PROFILE_IMAGE_MAX) fail('La imagen debe pesar 5 MB o menos.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mime = imageType(bytes);
  const extension = body.path.split('.').pop();
  const expected = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[extension];
  if (!mime || mime !== expected) fail('El archivo no es una imagen JPG, PNG o WEBP válida.');
  await q(db.from('members').update({ [column]: body.path }).eq('id', me.id));
  return { ok: true };
}
export async function profileImageUrls(member) {
  const paths = [member.avatar_path, member.cover_path].filter((p) => validProfileImagePath(member.id, p));
  if (!paths.length) return { avatar_url: '', cover_url: '' };
  const { data, error } = await db.storage.from(BUCKET).createSignedUrls(paths, 3600);
  if (error) return { avatar_url: '', cover_url: '' };
  const url = (path) => data?.find((x) => x.path === path)?.signedUrl || '';
  return { avatar_url: url(member.avatar_path), cover_url: url(member.cover_path) };
}