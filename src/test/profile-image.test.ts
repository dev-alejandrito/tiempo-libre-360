import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateProfileImage } from '@/lib/profile-image';

const png = [137, 80, 78, 71, 13, 10, 26, 10];
function file(bytes: number[], name = 'foto.png', type = 'image/png', size = bytes.length) {
  return {
    name, type, size,
    slice: () => ({ arrayBuffer: async () => new Uint8Array(bytes).buffer }),
  };
}
afterEach(() => vi.unstubAllGlobals());

describe('validación previa de fotografías', () => {
  it('conserva el límite de 5 MB y rechaza un byte adicional antes de decodificar', async () => {
    const close = vi.fn();
    const decode = vi.fn().mockResolvedValue({ width: 100, height: 100, close });
    vi.stubGlobal('createImageBitmap', decode);
    await expect(validateProfileImage(file(png, 'foto.png', 'image/png', 5 * 1024 * 1024))).resolves.toBeUndefined();
    await expect(validateProfileImage(file(png, 'foto.png', 'image/png', 5 * 1024 * 1024 + 1))).rejects.toThrow();
    expect(decode).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('rechaza archivos vacíos', async () => {
    await expect(validateProfileImage(file([]))).rejects.toThrow('vacía');
  });
  it('rechaza contenido disfrazado con extensión y tipo de imagen', async () => {
    await expect(validateProfileImage(file([60, 104, 116, 109, 108, 62]))).rejects.toThrow('contenido');
  });
  it('rechaza discordancia entre extensión y tipo', async () => {
    await expect(validateProfileImage(file(png, 'foto.jpg'))).rejects.toThrow();
  });
  it('rechaza imágenes truncadas aunque tengan una cabecera válida', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('Decode failed')));
    await expect(validateProfileImage(file(png))).rejects.toThrow('dañada');
  });
  it.each([
    ['foto.JPG', 'image/jpeg', [255, 216, 255]],
    ['foto.png', 'image/png', png],
    ['foto.webp', 'image/webp', [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]],
  ])('admite %s decodificable', async (name, type, bytes) => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 10, height: 10, close: vi.fn() }));
    await expect(validateProfileImage(file(bytes, name, type))).resolves.toBeUndefined();
  });
});