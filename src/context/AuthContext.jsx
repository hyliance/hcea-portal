import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
//  AuthContext – Real Supabase Auth
//
//  Roles (stored in public.profiles.roles as text[]):
//    'head_admin'   – Full access (inherits league_admin permissions)
//    'league_admin' – Tournaments, leagues, flags, social mod only
//    'coach'        – Edit own coach profile and schedule
//    'org_manager'  – Manage HCEA youth org
//    'player'       – Default base role (always present)
//
//  Users can hold MULTIPLE roles simultaneously (e.g. head_admin + coach).
//  Legacy profiles.role string is kept in sync as the primary/highest role.
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

function calcAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const ROLE_RANK = { head_admin: 5, admin: 5, league_admin: 4, coach: 3, org_manager: 2, player: 1 };

function getPrimaryRole(roles) {
  return [...roles].sort((a, b) => (ROLE_RANK[b] || 0) - (ROLE_RANK[a] || 0))[0] || 'player';
}

// Normalize roles from a Supabase profiles row.
// Prefers the new roles[] column; falls back to legacy role string.
function normalizeRolesFromProfile(profile) {
  if (Array.isArray(profile.roles) && profile.roles.length > 0) {
    const r = profile.roles.map(x => x.toLowerCase());
    return r.includes('player') ? r : [...r, 'player'];
  }
  const legacy = profile.role?.toLowerCase();
  if (legacy && legacy !== 'player') return [legacy, 'player'];
  return ['player'];
}

function profileToUser(profile) {
  if (!profile) return null;
  const roles = normalizeRolesFromProfile(profile);
  return {
    id:               profile.id,
    roles,                              // ← NEW: full array e.g. ['head_admin','coach','player']
    role:             getPrimaryRole(roles), // ← LEGACY: highest role string for compat
    firstName:        profile.first_name,
    lastName:         profile.last_name,
    email:            profile.email,
    phone:            profile.phone,
    initials:         profile.initials ||
                        ((profile.first_name||'?')[0] + (profile.last_name||'?')[0]).toUpperCase(),
    avatarColor:      profile.avatar_color  || '#1d4ed8',
    avatarImg:        profile.avatar_img    || null,
    dob:              profile.dob           || null,
    age:              calcAge(profile.dob),
    school:           profile.school        || null,
    grade:            profile.grade         || null,
    location:         profile.location      || null,
    games:            profile.games         || [],
    membershipActive: profile.membership_active || false,
    membershipType:   profile.membership_type   || null,
    membershipYear:   profile.membership_year   || null,
    memberSince:      profile.member_since       || null,
    coachId:          profile.coach_id           || null,
    orgId:            profile.org_id             || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const loadProfile = useCallback(async (supabaseUser) => {
    if (!supabaseUser) { setUser(null); return; }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();
    if (profileError) {
      console.error('Failed to load profile:', profileError.message);
      setUser(null);
    } else {
      setUser(profileToUser(profile));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await loadProfile(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, [loadProfile]);

  // LOGIN
  const login = useCallback(async (email, password, rememberMe = false) => {
    setLoading(true);
    setError(null);
    try {
      if (rememberMe) {
        localStorage.setItem('hcg_remember_me', '1');
        sessionStorage.removeItem('hcg_session_only');
      } else {
        localStorage.removeItem('hcg_remember_me');
        sessionStorage.setItem('hcg_session_only', '1');
      }
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError) throw new Error(authError.message);
      await loadProfile(data.user);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  // REGISTER – new users always start as ['player']
  const register = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const { firstName, lastName, email, password, dob, phone, school, grade } = formData;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { first_name: firstName, last_name: lastName } },
      });
      if (signUpError) throw new Error(signUpError.message);
      const userId = data.user?.id;
      if (userId) {
        await supabase.from('profiles').update({
          first_name:   firstName,
          last_name:    lastName,
          phone:        phone  || null,
          dob:          dob    || null,
          school:       school || null,
          grade:        grade  || null,
          avatar_color: '#059669',
          member_since: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          role:         'player',
          roles:        ['player'],
        }).eq('id', userId);
      }
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // LOGOUT
  const logout = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    sessionStorage.removeItem('hcg_session_only');
    setLoading(false);
  }, []);

  // UPDATE PROFILE
  const updateProfile = useCallback(async (updates) => {
    if (!user?.id) return { success: false, error: 'Not logged in' };
    setLoading(true);
    try {
      const dbUpdates = {};
      if (updates.firstName   !== undefined) dbUpdates.first_name   = updates.firstName;
      if (updates.lastName    !== undefined) dbUpdates.last_name    = updates.lastName;
      if (updates.phone       !== undefined) dbUpdates.phone        = updates.phone;
      if (updates.dob         !== undefined) dbUpdates.dob          = updates.dob;
      if (updates.school      !== undefined) dbUpdates.school       = updates.school;
      if (updates.grade       !== undefined) dbUpdates.grade        = updates.grade;
      if (updates.location    !== undefined) dbUpdates.location     = updates.location;
      if (updates.games       !== undefined) dbUpdates.games        = updates.games;
      if (updates.avatarColor !== undefined) dbUpdates.avatar_color = updates.avatarColor;
      if (updates.avatarImg   !== undefined) dbUpdates.avatar_img   = updates.avatarImg;
      const { error: updateError } = await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
      if (updateError) throw new Error(updateError.message);
      setUser(prev => ({ ...prev, ...updates, age: calcAge(updates.dob ?? prev?.dob) }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── ROLE HELPERS ──────────────────────────────────────────────────────────
  // All checks now use roles[] so multi-role users work correctly.
  const userRoles     = user?.roles || (user?.role ? [user.role] : ['player']);

  const isAdmin       = userRoles.some(r => ['admin','head_admin','league_admin'].includes(r));
  const isHeadAdmin   = userRoles.some(r => ['head_admin','admin'].includes(r));
  // head_admin inherits league_admin access
  const isLeagueAdmin = userRoles.includes('league_admin') || isHeadAdmin;
  const isCoach       = userRoles.includes('coach');
  const isPlayer      = userRoles.includes('player');
  const isOrgManager  = userRoles.includes('org_manager');
  // hasRole(...roles) – true if user holds ANY of the given roles
  const hasRole       = (...roles) => roles.some(r => userRoles.includes(r));

  const leagueAdminCan = {
    tournaments: true, leagues: true,
    flags: true, flagHistory: true, socialModeration: true,
  };
  const leagueAdminCannot = {
    coachApplications: true, scholarshipApps: true,
    hceaOrgs: true, playerManagement: true, coachRoster: true,
  };

  // AGE-GATING
  const userAge            = user?.age ?? null;
  const canAccessSocial    = userAge === null || userAge >= 16;
  const canAccessCashMatch = userAge === null || userAge >= 18;
  const isMinor            = userAge !== null && userAge < 18;
  const isYouthPlayer      = userAge !== null && userAge < 16;

  return (
    <AuthContext.Provider value={{
      user, loading, error,
      login, register, logout, updateProfile,
      isAdmin, isHeadAdmin, isLeagueAdmin, isCoach, isPlayer, isOrgManager, hasRole,
      leagueAdminCan, leagueAdminCannot,
      userAge, canAccessSocial, canAccessCashMatch, isMinor, isYouthPlayer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
