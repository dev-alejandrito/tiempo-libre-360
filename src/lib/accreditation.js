// Matches the normalization used by the server. Only server-approved rows grant the badge.
export function approvedSkill(name, rows) {
  const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const target = normalize(name);
  return !!target && (rows || []).some((a) => a.status === 'approved' && normalize(a.skill_name) === target);
}