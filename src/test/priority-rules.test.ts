import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: {} }));
import { commissionSplit, commissionEstimate } from '@/server/tl/commissions.server.js';
import { validProfileImagePath } from '@/server/tl/profile-images.server.js';
import { approvedSkill } from '@/lib/accreditation';

describe('comisión solo en clases particulares pagadas', () => {
  it('asigna 10% a la plataforma y 90% al instructor de 1000 MXN', () => {
    expect(commissionSplit(100000, { paid: true })).toEqual({ total_cents: 100000, commission_cents: 10000, instructor_cents: 90000, refunded_cents: 0 });
  });
  it('no aplica comisión en intercambios de créditos', () => {
    expect(commissionSplit(120, { kind: 'exchange', paid: true }).commission_cents).toBe(0);
  });
  it('no registra ganancias sin pago y no presenta presupuestos como cobros', () => {
    expect(commissionSplit(100000).commission_cents).toBe(0);
    expect(commissionEstimate(1000).applied).toBe(false);
  });
  it('revierte completamente comisión e importe del instructor al reembolsar', () => {
    expect(commissionSplit(100000, { paid: true, refundedCents: 100000 })).toEqual({ total_cents: 100000, commission_cents: 0, instructor_cents: 0, refunded_cents: 100000 });
  });
  it('recalcula 10/90 sobre el importe restante tras reembolso parcial', () => {
    expect(commissionSplit(100000, { paid: true, refundedCents: 25000 })).toEqual({ total_cents: 100000, commission_cents: 7500, instructor_cents: 67500, refunded_cents: 25000 });
  });
  it('conserva todos los centavos y rechaza reembolsos superiores al total', () => {
    const split = commissionSplit(10001, { paid: true });
    expect(split.commission_cents + split.instructor_cents).toBe(10001);
    expect(() => commissionSplit(100, { paid: true, refundedCents: 101 })).toThrow();
  });
});
describe('estrella de acreditación', () => {
  it('solo admite acreditación aprobada de la misma habilidad', () => {
    expect(approvedSkill('Guitarra', [{ skill_name: 'Guitarra', status: 'approved' }])).toBe(true);
    expect(approvedSkill('Guitarra', [{ skill_name: 'Inglés', status: 'approved' }])).toBe(false);
  });
  it.each(['pending','review','correction','rejected','suspended','withdrawn'])('no admite estado %s', (status) => {
    expect(approvedSkill('Guitarra', [{ skill_name: 'Guitarra', status }])).toBe(false);
  });
});
describe('fotografías propias', () => {
  it('impide sustituir imágenes de otra cuenta o adjuntar documentos', () => {
    expect(validProfileImagePath('owner', 'owner/profile/photo.jpg')).toBe(true);
    expect(validProfileImagePath('owner', 'other/profile/photo.jpg')).toBe(false);
    expect(validProfileImagePath('owner', 'owner/profile/../photo.jpg')).toBe(false);
    expect(validProfileImagePath('owner', 'owner/profile/photo.pdf')).toBe(false);
  });
});