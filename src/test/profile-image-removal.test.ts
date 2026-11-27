import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(),
  storage: vi.fn(),
}));
vi.mock('@/server/tl/core.server.js', () => ({
  db: { from: mocks.from, storage: { from: mocks.storage } },
  q: async (builder: Promise<{ data: unknown }>) => (await builder).data,
  fail: (message: string) => { throw new Error(message); },
  BUCKET: 'evidencias',
}));
import { saveProfileImage } from '@/server/tl/profile-images.server.js';

beforeEach(() => {
  vi.clearAllMocks();
  const builder = { update: mocks.update, eq: mocks.eq, select: mocks.select, maybeSingle: mocks.maybeSingle };
  mocks.from.mockReturnValue(builder);
  mocks.update.mockReturnValue(builder);
  mocks.eq.mockReturnValue(builder);
  mocks.select.mockReturnValue(builder);
  mocks.maybeSingle.mockResolvedValue({ data: { id: 'owner' } });
});

describe('retirada propia sin borrar archivos', () => {
  it.each([['avatar', 'avatar_path'], ['cover', 'cover_path']])('retira solo %s del miembro autenticado y conserva el archivo', async (kind, column) => {
    await saveProfileImage({ id: 'owner' }, { kind, action: 'remove', path: 'owner/profile/photo.jpg', member: 'other' });
    expect(mocks.from).toHaveBeenCalledWith('members');
    expect(mocks.update).toHaveBeenCalledWith({ [column]: '' });
    expect(mocks.eq).toHaveBeenCalledWith('id', 'owner');
    expect(mocks.eq).toHaveBeenCalledWith(column, 'owner/profile/photo.jpg');
    expect(mocks.storage).not.toHaveBeenCalled();
  });
  it('rechaza la fotografía de otra cuenta sin escribir', async () => {
    await expect(saveProfileImage({ id: 'owner' }, { kind: 'avatar', action: 'remove', path: 'other/profile/photo.jpg' })).rejects.toThrow();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('rechaza un campo que no sea fotografía o portada', async () => {
    await expect(saveProfileImage({ id: 'owner' }, { kind: 'email', action: 'remove', path: 'owner/profile/photo.jpg' })).rejects.toThrow();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('no declara éxito si la foto se sustituyó en otra pestaña', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null });
    await expect(saveProfileImage({ id: 'owner' }, { kind: 'avatar', action: 'remove', path: 'owner/profile/old.jpg' })).rejects.toThrow('La imagen cambió');
  });
  it('rechaza acciones desconocidas', async () => {
    await expect(saveProfileImage({ id: 'owner' }, { kind: 'avatar', action: 'delete-file', path: 'owner/profile/photo.jpg' })).rejects.toThrow();
    expect(mocks.storage).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});