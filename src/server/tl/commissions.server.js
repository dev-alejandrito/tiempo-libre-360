// All amounts are integer MXN cents. This module is server-only; it never moves time credits.
export function commissionSplit(totalCents, { kind = 'private', paid = false, refundedCents = 0 } = {}) {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0 || !Number.isSafeInteger(refundedCents) || refundedCents < 0 || refundedCents > totalCents) throw new Error('Importe o reembolso no válido.');
  if (kind !== 'private' || !paid) return { total_cents: totalCents, commission_cents: 0, instructor_cents: 0, refunded_cents: refundedCents };
  const remaining = totalCents - refundedCents;
  const commission = Math.round(remaining / 10);
  return { total_cents: totalCents, commission_cents: commission, instructor_cents: remaining - commission, refunded_cents: refundedCents };
}
export function commissionEstimate(priceMxn) {
  const total = Math.round(Number(priceMxn) * 100);
  return { ...commissionSplit(total, { paid: true }), status: 'awaiting_configuration', applied: false, currency: 'MXN' };
}