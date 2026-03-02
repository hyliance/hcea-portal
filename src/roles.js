// ─────────────────────────────────────────────────────────────────────────────
//  roles.js — HCEA Role System
//  Roles are STACKABLE and INDEPENDENT. A user can hold multiple roles.
//  Hierarchy only matters for UI display ordering and permission checks.
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = {
  head_admin:   { label: 'Head Admin',    color: '#dc2626', bg: 'rgba(220,38,38,0.12)',   icon: '👑', rank: 5 },
  league_admin: { label: 'League Admin',  color: '#7c3aed', bg: 'rgba(124,58,237,0.12)',  icon: '🏆', rank: 4 },
  coach:        { label: 'Coach',         color: '#059669', bg: 'rgba(5,150,105,0.12)',   icon: '🎓', rank: 3 },
  org_manager:  { label: 'Org Manager',   color: '#d97706', bg: 'rgba(217,119,6,0.12)',   icon: '🏢', rank: 2 },
  player:       { label: 'Player',        color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: '🎮', rank: 1 },
};

// All assignable roles (excludes player — everyone is a player by default)
export const ASSIGNABLE_ROLES = ['head_admin', 'league_admin', 'coach', 'org_manager'];

// Returns true if the user holds the specified role
export function hasRole(user, role) {
  if (!user) return false;
  const roles = user.roles || (user.role ? [user.role] : ['player']);
  return roles.includes(role);
}

// Returns true if the user holds ANY of the specified roles
export function hasAnyRole(user, ...roles) {
  return roles.some(r => hasRole(user, r));
}

// Returns the user's highest-ranked role (for primary badge / sort order)
export function getPrimaryRole(user) {
  const roles = user.roles || (user.role ? [user.role] : ['player']);
  return roles.reduce((highest, r) => {
    const rank = ROLES[r]?.rank || 0;
    return rank > (ROLES[highest]?.rank || 0) ? r : highest;
  }, 'player');
}

// Normalize a user record — always returns a roles array
export function normalizeRoles(user) {
  if (user.roles && Array.isArray(user.roles)) return user.roles;
  if (user.role) return [user.role];
  return ['player'];
}

// Sort users: highest primary role first, then alphabetically
export function sortByRole(users) {
  return [...users].sort((a, b) => {
    const rankA = ROLES[getPrimaryRole(a)]?.rank || 0;
    const rankB = ROLES[getPrimaryRole(b)]?.rank || 0;
    if (rankB !== rankA) return rankB - rankA;
    return (a.name || '').localeCompare(b.name || '');
  });
}
