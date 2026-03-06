// api/index.js — HCEA Live Supabase Service Layer
// All data comes from Supabase. No mock data.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../supabaseClient';

const SUPABASE_URL  = 'https://yelicgqkqerpmmifhewn.supabase.co';
const SUPABASE_ANON = 'sb_publishable_8brgEBU1zPSCdl6oVXu6Bg_IHMHwShi';

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'apikey':        SUPABASE_ANON,
    'Authorization': token ? 'Bearer ' + token : 'Bearer ' + SUPABASE_ANON,
    'Content-Type':  'application/json',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  STATIC CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const GAME_TEAM_SIZES = {
  'League of Legends':  { min: 5, max: 5, label: '5v5' },
  'Valorant':           { min: 5, max: 5, label: '5v5' },
  'Team Fight Tactics': { min: 1, max: 1, label: '1v1 (FFA)' },
  'Rocket League':      { min: 2, max: 3, label: '2v2 or 3v3' },
  'Fortnite':           { min: 1, max: 4, label: '1-4 players' },
  'Smash Bros.':        { min: 1, max: 1, label: '1v1' },
  'Marvel Rivals':      { min: 5, max: 6, label: '5v5 or 6v6' },
};

export const BRACKET_FORMATS = [
  { id: 'single_elim', label: 'Single Elimination',    desc: "One loss and you're out. Fast, high-stakes." },
  { id: 'double_elim', label: 'Double Elimination',    desc: 'Two losses to be eliminated. More forgiving.' },
  { id: 'round_robin', label: 'Round Robin',            desc: 'Everyone plays everyone. Best overall record wins.' },
  { id: 'swiss',       label: 'Swiss',                  desc: 'Matched by record each round. No elimination until X losses.' },
  { id: 'group_stage', label: 'Group Stage + Playoffs', desc: 'Groups feed into a single-elim playoff bracket.' },
];

export const FEED_CATEGORIES = [
  { id: 'scrims',        icon: '⚔️',  label: 'Scrims',        color: '#ef4444', description: 'Scrim requests — game, platform, region, rank, format' },
  { id: 'lft',           icon: '🔎',  label: 'LFT',           color: '#3b82f6', description: 'Looking for Team — post your roles, rank & availability' },
  { id: 'lfo',           icon: '🏢',  label: 'LFO',           color: '#8b5cf6', description: 'Looking for Organization — players & clans seeking pickup' },
  { id: 'announcements', icon: '📢',  label: 'Announcements', color: '#f59e0b', description: 'Official posts from verified Orgs, Clans & Admins', restricted: true },
  { id: 'montages',      icon: '🎬',  label: 'Montages',      color: '#06b6d4', description: 'YouTube / Twitch video montages with game tagging' },
  { id: 'vod_review',    icon: '🎯',  label: 'VoD Review',    color: '#10b981', description: 'Request or offer analytical VOD breakdowns' },
  { id: 'roster_move',   icon: '🔄',  label: 'Roster Move',   color: '#6366f1', description: 'Player joins, departures & role changes' },
  { id: 'discussion',    icon: '💬',  label: 'Discussion',    color: '#64748b', description: 'Open discussion with optional game tagging' },
  { id: 'highlight',     icon: '⚡',  label: 'Highlight',     color: '#f97316', description: 'Short clip embeds from YouTube, Twitch & Streamable' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  GAME MANAGEMENT API  →  game_titles, game_maps, game_modes, game_seasons
// ─────────────────────────────────────────────────────────────────────────────

export const gameApi = {
  getAll: async () => {
    const { data, error } = await supabase.from('game_titles').select('*').order('name');
    if (error) throw error;
    return data || [];
  },
  getActive: async () => {
    const { data, error } = await supabase.from('game_titles').select('*').eq('active', true).order('name');
    if (error) throw error;
    return data || [];
  },
  getById: async (id) => {
    const { data } = await supabase.from('game_titles').select('*').eq('id', id).single();
    return data || null;
  },
  create: async (gameData) => {
    const { data, error } = await supabase.from('game_titles').insert([gameData]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, game: data };
  },
  update: async (id, updates) => {
    const { data, error } = await supabase.from('game_titles').update(updates).eq('id', id).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, game: data };
  },
  toggleActive: async (id) => {
    const { data: current } = await supabase.from('game_titles').select('active').eq('id', id).single();
    const { error } = await supabase.from('game_titles').update({ active: !current?.active }).eq('id', id);
    if (error) return { success: false };
    return { success: true, active: !current?.active };
  },
  getModes: async (gameId) => {
    const { data } = await supabase.from('game_modes').select('name').eq('game_id', gameId).order('sort_order');
    return (data || []).map(m => m.name);
  },
  getSeasons: async (gameId) => {
    const { data } = await supabase.from('game_seasons').select('*').eq('game_id', gameId).order('created_at');
    return data || [];
  },
  addSeason: async (gameId, season) => {
    const { data, error } = await supabase.from('game_seasons').insert([{ ...season, game_id: gameId }]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, season: data };
  },
  updateSeason: async (gameId, seasonId, updates) => {
    const { error } = await supabase.from('game_seasons').update(updates).eq('id', seasonId).eq('game_id', gameId);
    return error ? { success: false } : { success: true };
  },
  deleteSeason: async (gameId, seasonId) => {
    const { error } = await supabase.from('game_seasons').delete().eq('id', seasonId).eq('game_id', gameId);
    return error ? { success: false } : { success: true };
  },
  updateModes: async (gameId, modes) => {
    await supabase.from('game_modes').delete().eq('game_id', gameId);
    if (modes.length > 0) {
      const { error } = await supabase.from('game_modes').insert(modes.map((name, i) => ({ game_id: gameId, name, sort_order: i })));
      if (error) return { success: false };
    }
    return { success: true };
  },
  getMaps: async (gameId) => {
    const { data } = await supabase.from('game_maps').select('*').eq('game_id', gameId).order('sort_order');
    return data || [];
  },
  addMap: async (gameId, { name, type, notes }) => {
    const { data, error } = await supabase.from('game_maps').insert([{ game_id: gameId, name, type, notes, active: true }]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, map: data };
  },
  updateMap: async (gameId, mapId, updates) => {
    const { data, error } = await supabase.from('game_maps').update(updates).eq('id', mapId).eq('game_id', gameId).select().single();
    if (error) return { success: false };
    return { success: true, map: data };
  },
  toggleMapActive: async (gameId, mapId) => {
    const { data: current } = await supabase.from('game_maps').select('active').eq('id', mapId).single();
    const { error } = await supabase.from('game_maps').update({ active: !current?.active }).eq('id', mapId);
    if (error) return { success: false };
    return { success: true, active: !current?.active };
  },
  deleteMap: async (gameId, mapId) => {
    const { error } = await supabase.from('game_maps').delete().eq('id', mapId).eq('game_id', gameId);
    return error ? { success: false } : { success: true };
  },
  reorderMaps: async (gameId, orderedIds) => {
    await Promise.all(orderedIds.map((id, i) => supabase.from('game_maps').update({ sort_order: i }).eq('id', id)));
    return { success: true };
  },
  updateCoverImage: async (gameId, base64DataUrl) => {
    const { error } = await supabase.from('game_titles').update({ cover_image: base64DataUrl }).eq('id', gameId);
    return error ? { success: false } : { success: true };
  },
  removeCoverImage: async (gameId) => {
    const { error } = await supabase.from('game_titles').update({ cover_image: '' }).eq('id', gameId);
    return error ? { success: false } : { success: true };
  },
};

export async function getGameNames() {
  const { data } = await supabase.from('game_titles').select('name').eq('active', true).order('name');
  return (data || []).map(g => g.name);
}

export async function searchPlayers(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();
  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(10);
  return (data || []).map(p => ({
    id: p.id,
    name: ((p.first_name || '') + ' ' + (p.last_name || '')).trim() || p.email,
    email: p.email,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEAMS API  →  teams, team_members, team_invites
// ─────────────────────────────────────────────────────────────────────────────

const mapTeam = (t) => ({
  ...t,
  captainId:   t.captain_id,
  captainName: t.captain_name,
  maxSize:     t.max_size,
  members:     (t.team_members || []).map(m => ({
    ...m,
    id:          m.user_id,
    avatarColor: m.avatar_color,
  })),
});

export const teamsApi = {
  getAll: async () => {
    const { data, error } = await supabase.from('teams').select('*, team_members(*)').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapTeam);
  },
  getByGame: async (game) => {
    const { data, error } = await supabase.from('teams').select('*, team_members(*)').eq('game', game);
    if (error) throw error;
    return (data || []).map(mapTeam);
  },
  getById: async (id) => {
    const { data } = await supabase.from('teams').select('*, team_members(*)').eq('id', id).single();
    return data ? mapTeam(data) : null;
  },
  getMyTeams: async (userId) => {
    const { data } = await supabase.from('team_members').select('team_id, teams(*, team_members(*))').eq('user_id', userId);
    return (data || []).map(r => r.teams).filter(Boolean).map(mapTeam);
  },
  getByIds: async (ids) => {
    const { data } = await supabase.from('teams').select('*, team_members(*)').in('id', ids);
    return (data || []).map(mapTeam);
  },
  create: async ({ name, game, maxSize, captainId, captainName, captainInitials, captainColor }) => {
    const size = maxSize || 5;
    const { data: team, error } = await supabase.from('teams').insert([{
      name, game, captain_id: captainId, captain_name: captainName, max_size: size, wins: 0, losses: 0,
    }]).select().single();
    if (error) return { success: false, error: error.message };
    await supabase.from('team_members').insert([{
      team_id: team.id, user_id: captainId, name: captainName,
      role: 'Captain', initials: captainInitials, avatar_color: captainColor,
    }]);
    return { success: true, team };
  },
  invitePlayer: async (teamId, playerEmail) => {
    const { error } = await supabase.from('team_invites').insert([{ team_id: teamId, email: playerEmail }]);
    return error ? { success: false, error: error.message } : { success: true };
  },
  acceptInvite: async (teamId, userId, userName, userInitials, userColor) => {
    const { error } = await supabase.from('team_members').insert([{
      team_id: teamId, user_id: userId, name: userName, role: 'Member', initials: userInitials, avatar_color: userColor,
    }]);
    return error ? { success: false, error: error.message } : { success: true };
  },
  removeMember: async (teamId, userId) => {
    const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId);
    return error ? { success: false } : { success: true };
  },
  delete: async (teamId) => {
    await supabase.from('team_members').delete().eq('team_id', teamId);
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    return error ? { success: false } : { success: true };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  TOURNAMENTS API  →  tournaments, tournament_registrations, tournament_matches, score_reports
// ─────────────────────────────────────────────────────────────────────────────

export const tournamentsApi = {
  getAll: async () => {
    const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  getById: async (id) => {
    const { data } = await supabase.from('tournaments').select('*').eq('id', id).single();
    return data || null;
  },
  create: async (tournamentData) => {
    const { data, error } = await supabase.from('tournaments').insert([{ ...tournamentData, status: 'open', phase: 'registration' }]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, tournament: data };
  },
  update: async (id, updates) => {
    const { error } = await supabase.from('tournaments').update(updates).eq('id', id);
    return error ? { success: false, error: error.message } : { success: true };
  },
  delete: async (id) => {
    const { error } = await supabase.from('tournaments').delete().eq('id', id);
    return error ? { success: false } : { success: true };
  },
  register: async (tournamentId, teamId) => {
    const { error } = await supabase.from('tournament_registrations').insert([{ tournament_id: tournamentId, team_id: teamId }]);
    return error ? { success: false, error: error.message } : { success: true };
  },
  start: async (tournamentId) => {
    const { error } = await supabase.from('tournaments').update({ status: 'active', phase: 'bracket' }).eq('id', tournamentId);
    if (error) return { success: false, error: error.message };
    const { data } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
    return { success: true, tournament: data };
  },
  reportScore: async (tournamentId, matchId, reportingTeamId, score1, score2) => {
    const { error } = await supabase.from('score_reports').insert([{
      tournament_id: tournamentId, match_id: matchId,
      reporting_team_id: reportingTeamId, score1, score2, confirmed: false,
    }]);
    return error ? { success: false, error: error.message } : { success: true, message: 'Score submitted. Waiting for opponent confirmation.' };
  },
  confirmScore: async (tournamentId, matchId, confirmingTeamId) => {
    const { data: report } = await supabase.from('score_reports').select('*').eq('match_id', matchId).eq('confirmed', false).single();
    if (!report) return { success: false, error: 'No pending report found' };
    await supabase.from('score_reports').update({ confirmed: true }).eq('id', report.id);
    const winner = report.score1 > report.score2 ? report.team1_id : report.team2_id;
    await supabase.from('tournament_matches').update({
      score1: report.score1, score2: report.score2, winner_id: winner,
      status: 'complete', reported_by: report.reporting_team_id, confirmed_by: confirmingTeamId,
    }).eq('id', matchId);
    return { success: true };
  },
  getPendingReport: async (tournamentId, matchId) => {
    const { data } = await supabase.from('score_reports').select('*').eq('match_id', matchId).eq('confirmed', false).single();
    return data || null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  COACHES API  →  coaches, coach_games, coach_accolades, coach_reviews
// ─────────────────────────────────────────────────────────────────────────────

function normalizeCoach(c) {
  return {
    id:             c.id,
    userId:         c.user_id,
    name:           c.name,
    title:          c.title,
    initials:       c.initials,
    accentColor:    c.accent_color,
    experience:     c.experience,
    location:       c.location,
    rating:         c.rating          ?? 5.0,
    totalSessions:  c.total_sessions  ?? 0,
    bio:            c.bio             ?? '',
    philosophy:     c.philosophy      ?? '',
    social:         c.social          ?? {},
    availableDays:  c.available_days  ?? [],
    availableHours: c.available_hours ?? [],
    isActive:       c.is_active,
    onRoster:       c.is_active,
    games: (c.coach_games || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(g => ({ id: g.game_id, label: g.label, icon: g.icon, rank: g.rank, specialty: g.specialty })),
    accolades: (c.coach_accolades || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(a => ({ icon: a.icon, text: a.text })),
    reviews: (c.coach_reviews || []).map(r => ({
      id: r.id, author: r.author, game: r.game, rating: r.rating, text: r.text,
      date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '',
    })),
  };
}

export const coachesApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('coaches').select('*, coach_games(*), coach_accolades(*), coach_reviews(*)')
      .eq('is_active', true).order('created_at');
    if (error) throw error;
    return (data || []).map(normalizeCoach);
  },
  getAllAdmin: async () => {
    const { data, error } = await supabase
      .from('coaches').select('*, coach_games(*), coach_accolades(*), coach_reviews(*)')
      .order('created_at');
    if (error) throw error;
    return (data || []).map(normalizeCoach);
  },
  addToRoster: async (app) => {
    // Support both camelCase (from component state) and snake_case (from raw DB response)
    const userId = app.userId ?? app.user_id;
    // maybeSingle returns null instead of throwing when no row exists
    const { data: existing } = await supabase.from('coaches').select('id').eq('user_id', userId).maybeSingle();
    let coachId;
    if (existing) {
      await supabase.from('coaches').update({ is_active: true }).eq('id', existing.id);
      coachId = existing.id;
    } else {
      // Support both { firstName, lastName } (from coach app) and { name } (from player role assignment)
      const firstName = app.firstName || (app.name || '').split(' ')[0] || '';
      const lastName  = app.lastName  || (app.name || '').split(' ').slice(1).join(' ') || '';
      const fullName  = `${firstName} ${lastName}`.trim();
      const { data: newCoach, error } = await supabase.from('coaches').insert([{
        id:              crypto.randomUUID(),
        user_id:         userId,
        name:            fullName,
        title:           'Coach',
        initials:        `${(firstName[0] || '?')}${(lastName[0] || '?')}`.toUpperCase(),
        accent_color:    '#059669',
        experience:      app.yearsCoaching ? `${app.yearsCoaching} years coaching` : '',
        location:        app.location || '',
        rating:          5.0,
        total_sessions:  0,
        bio:             app.experience  || '',
        philosophy:      app.philosophy  || '',
        available_days:  app.availableDays || [1, 2, 3, 4, 5],
        available_hours: app.preferredHours ? [app.preferredHours] : ['4:00 PM CST', '5:30 PM CST', '7:00 PM CST'],
        is_active:       true,
      }]).select().single();
      if (error) return { success: false, error: error.message };
      coachId = newCoach.id;
    }
    // Grant the coach role and link coach_id in the user's profile
    if (userId) {
      const { data: profile } = await supabase.from('profiles').select('roles, role').eq('id', userId).single();
      if (profile) {
        const currentRoles = Array.isArray(profile.roles) && profile.roles.length > 0
          ? profile.roles
          : (profile.role && profile.role !== 'player' ? [profile.role, 'player'] : ['player']);
        const profileUpdates = { coach_id: coachId };
        if (!currentRoles.includes('coach')) {
          profileUpdates.roles = [...currentRoles, 'coach'];
          if (!profile.role || profile.role === 'player') profileUpdates.role = 'coach';
        }
        await supabase.from('profiles').update(profileUpdates).eq('id', userId);
      }
    }
    return { success: true, coachId };
  },
  removeFromRoster: async (coachId) => {
    const { error } = await supabase.from('coaches').update({ is_active: false }).eq('id', coachId);
    return error ? { success: false } : { success: true };
  },
  getAvailability: async (coachId, year, month) => {
    const { data } = await supabase.from('coaches').select('available_days, available_hours').eq('id', coachId).single();
    if (!data) return {};
    const avail = {};
    const today = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (!isPast && (data.available_days || []).includes(date.getDay())) {
        avail[`${year}-${month}-${d}`] = data.available_hours || [];
      }
    }
    return avail;
  },
  update: async (coachId, updates) => {
    const { games, accolades, ...coachFields } = updates;
    const dbFields = {};
    if (coachFields.name           !== undefined) dbFields.name            = coachFields.name;
    if (coachFields.title          !== undefined) dbFields.title           = coachFields.title;
    if (coachFields.experience     !== undefined) dbFields.experience      = coachFields.experience;
    if (coachFields.location       !== undefined) dbFields.location        = coachFields.location;
    if (coachFields.bio            !== undefined) dbFields.bio             = coachFields.bio;
    if (coachFields.philosophy     !== undefined) dbFields.philosophy      = coachFields.philosophy;
    if (coachFields.accentColor    !== undefined) dbFields.accent_color    = coachFields.accentColor;
    if (coachFields.availableDays  !== undefined) dbFields.available_days  = coachFields.availableDays;
    if (coachFields.availableHours !== undefined) dbFields.available_hours = coachFields.availableHours;
    if (coachFields.initials       !== undefined) dbFields.initials        = coachFields.initials;
    if (Object.keys(dbFields).length > 0) {
      const { error } = await supabase.from('coaches').update(dbFields).eq('id', coachId);
      if (error) return { success: false, error: error.message };
    }
    if (Array.isArray(games)) {
      await supabase.from('coach_games').delete().eq('coach_id', coachId);
      if (games.length > 0) {
        await supabase.from('coach_games').insert(games.map((g, i) => ({
          coach_id: coachId, game_id: g.id, label: g.label,
          icon: g.icon, rank: g.rank, specialty: g.specialty, sort_order: i,
        })));
      }
    }
    if (Array.isArray(accolades)) {
      await supabase.from('coach_accolades').delete().eq('coach_id', coachId);
      if (accolades.length > 0) {
        await supabase.from('coach_accolades').insert(accolades.map((a, i) => ({
          coach_id: coachId, icon: a.icon, text: a.text, sort_order: i,
        })));
      }
    }
    return { success: true };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  SESSIONS API  →  coaching_sessions
// ─────────────────────────────────────────────────────────────────────────────

const HOURLY_NON_MEMBER = 60;
const HOURLY_MEMBER     = Math.round(60 * 0.85);
const COACH_HOURLY      = 20;
const sessionPrice      = (hrs, isMember) => Math.round((isMember ? HOURLY_MEMBER : HOURLY_NON_MEMBER) * hrs);
const sessionEarning    = (hrs) => Math.round(COACH_HOURLY * hrs);

function normalizeSession(s) {
  const hrs = s.hours ?? 1;
  return {
    ...s,
    price:        sessionPrice(hrs, s.is_member ?? false),
    coachEarning: sessionEarning(hrs),
    isMember:     s.is_member,
    playerName:   s.player_name,
    coachId:      s.coach_id,
    userId:       s.user_id,
    isoDate:      s.iso_date,
    date: s.iso_date
      ? new Date(s.iso_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : s.date,
  };
}

export const sessionsApi = {
  getAll: async (userId) => {
    let query = supabase.from('coaching_sessions').select('*').order('iso_date');
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(normalizeSession);
  },
  getAllCoach: async (coachId) => {
    let query = supabase.from('coaching_sessions').select('*').order('iso_date');
    if (coachId) query = query.eq('coach_id', coachId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(normalizeSession);
  },
  getAvailability: async (year, month) => {
    const { data } = await supabase.from('coaches').select('id').eq('is_active', true).limit(1).single();
    if (!data) return {};
    return coachesApi.getAvailability(data.id, year, month);
  },
  book: async (sessionData) => {
    const { data, error } = await supabase.from('coaching_sessions').insert([{
      user_id: sessionData.userId, player_name: sessionData.playerName,
      is_member: sessionData.isMember ?? false, game: sessionData.game,
      title: sessionData.title, coach_id: sessionData.coachId, coach: sessionData.coach,
      duration: sessionData.duration, hours: sessionData.hours,
      iso_date: sessionData.isoDate, time: sessionData.time, status: 'upcoming',
    }]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, session: normalizeSession(data) };
  },
  cancel: async (sessionId) => {
    const { error } = await supabase.from('coaching_sessions').delete().eq('id', sessionId);
    return error ? { success: false } : { success: true };
  },
  getAllAdmin: async () => {
    const { data, error } = await supabase.from('coaching_sessions').select('*').order('iso_date');
    if (error) throw error;
    return (data || []).map(normalizeSession);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  SCHOLARSHIPS API  →  scholarships, scholarship_applications
// ─────────────────────────────────────────────────────────────────────────────

export const scholarshipsApi = {
  getAll: async () => {
    const { data, error } = await supabase.from('scholarships').select('*').order('created_at');
    if (error) throw error;
    return data || [];
  },
  apply: async (scholarshipId, userId, formData) => {
    const { data, error } = await supabase.from('scholarship_applications').insert([{
      scholarship_id: scholarshipId, user_id: userId, ...formData, status: 'pending',
    }]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, applicationId: data.id };
  },
  getMyApplications: async (userId) => {
    const { data } = await supabase.from('scholarship_applications').select('*').eq('user_id', userId);
    return data || [];
  },
  getAllApplications: async () => {
    const { data } = await supabase.from('scholarship_applications').select('*').order('submitted_at', { ascending: false });
    return data || [];
  },
  updateApplicationStatus: async (appId, status) => {
    const { error } = await supabase.from('scholarship_applications').update({ status }).eq('id', appId);
    return error ? { success: false } : { success: true };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  COACH APPLICATION API  →  coach_applications
// ─────────────────────────────────────────────────────────────────────────────

// Normalize a raw DB row (snake_case) → camelCase for component consumption
function normalizeApp(a) {
  return {
    id:                     a.id,
    userId:                 a.user_id,
    status:                 a.status,
    reviewNote:             a.review_note       || null,
    reviewedBy:             a.reviewed_by       || null,
    submittedAt:            a.submitted_at ? new Date(a.submitted_at).getTime() : Date.now(),
    updatedAt:              a.updated_at   ? new Date(a.updated_at).getTime()   : Date.now(),
    firstName:              a.first_name,
    lastName:               a.last_name,
    email:                  a.email,
    phone:                  a.phone             || '',
    location:               a.location          || '',
    yearsPlaying:           a.years_playing     || '',
    yearsCoaching:          a.years_coaching    || '',
    competitiveLevel:       a.competitive_level || '',
    primaryGames:           a.primary_games     || [],
    gameRanks:              a.game_ranks        || {},
    philosophy:             a.philosophy        || '',
    coachingStyle:          a.coaching_style    || '',
    targetAgeGroups:        a.target_age_groups || [],
    experience:             a.experience        || '',
    certifications:         a.certifications    || '',
    references:             a.references        || [],
    availableDays:          a.available_days    || [],
    preferredHours:         a.preferred_hours   || '',
    proposedMemberRate:     a.proposed_member_rate     ?? 51,
    proposedNonMemberRate:  a.proposed_non_member_rate ?? 60,
    personalStatement:      a.personal_statement       || '',
    agreedToTerms:          a.agreed_to_terms          || false,
    backgroundCheckConsent: a.background_check_consent || false,
  };
}

// Convert camelCase formData → snake_case DB columns for insert
function appFormToDb(userId, formData) {
  return {
    user_id:                  userId,
    status:                   'pending',
    submitted_at:             new Date().toISOString(),
    first_name:               formData.firstName,
    last_name:                formData.lastName,
    email:                    formData.email,
    phone:                    formData.phone                || null,
    location:                 formData.location,
    years_playing:            formData.yearsPlaying,
    years_coaching:           formData.yearsCoaching,
    competitive_level:        formData.competitiveLevel,
    primary_games:            formData.primaryGames         || [],
    game_ranks:               formData.gameRanks            || {},
    philosophy:               formData.philosophy,
    coaching_style:           formData.coachingStyle,
    target_age_groups:        formData.targetAgeGroups      || [],
    experience:               formData.experience,
    certifications:           formData.certifications       || null,
    available_days:           formData.availableDays        || [],
    preferred_hours:          formData.preferredHours,
    personal_statement:       formData.personalStatement,
    agreed_to_terms:          formData.agreedToTerms        || false,
    background_check_consent: formData.backgroundCheckConsent || false,
  };
}

export const coachAppApi = {
  submit: async (userId, formData) => {
    const { data: existing } = await supabase.from('coach_applications').select('id')
      .eq('user_id', userId).in('status', ['pending', 'under_review']).single();
    if (existing) return { success: false, error: 'You already have an active application in progress.' };
    const { data, error } = await supabase.from('coach_applications')
      .insert([appFormToDb(userId, formData)]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, applicationId: data.id };
  },
  getMyApplication: async (userId) => {
    const { data } = await supabase.from('coach_applications').select('*')
      .eq('user_id', userId).order('submitted_at', { ascending: false }).limit(1).single();
    return data ? normalizeApp(data) : null;
  },
  getAll: async (status) => {
    let query = supabase.from('coach_applications').select('*').order('submitted_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data } = await query;
    return (data || []).map(normalizeApp);
  },
  updateStatus: async (appId, status, reviewNote, reviewerId) => {
    const { error } = await supabase.from('coach_applications').update({
      status, review_note: reviewNote, reviewed_by: reviewerId, updated_at: new Date().toISOString(),
    }).eq('id', appId);
    return error ? { success: false } : { success: true };
  },
  getSummary: async () => {
    const { data } = await supabase.from('coach_applications').select('status');
    const counts = { pending: 0, under_review: 0, approved: 0, rejected: 0, total: 0 };
    (data || []).forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; counts.total++; });
    return counts;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  ACTIVITY API  →  activity_log
// ─────────────────────────────────────────────────────────────────────────────

export const activityApi = {
  getRecent: async (userId) => {
    let query = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(20);
    if (userId) query = query.eq('user_id', userId);
    const { data } = await query;
    return (data || []).map(a => ({
      id:   a.id,
      type: a.type,
      text: a.text,
      dot:  a.dot_color,
      time: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }));
  },
  log: async (userId, type, text, dotColor = 'blue') => {
    await supabase.from('activity_log').insert([{ user_id: userId, type, text, dot_color: dotColor }]);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  CONTACT API  →  contact_submissions
// ─────────────────────────────────────────────────────────────────────────────

export const contactApi = {
  send: async (formData) => {
    const { error } = await supabase.from('contact_submissions').insert([formData]);
    return error ? { success: false, error: error.message } : { success: true };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN: USERS API  →  profiles
// ─────────────────────────────────────────────────────────────────────────────

export const adminApi = {
  getPlayers: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { console.warn('getPlayers: no session'); return []; }
    const url = `${SUPABASE_URL}/rest/v1/profiles?select=id,first_name,last_name,email,school,grade,role,roles,created_at,coach_id&order=created_at.desc`;
    const res = await fetch(url, { headers: await authHeaders() });
    if (!res.ok) { console.error('getPlayers error:', res.status); return []; }
    const data = await res.json();
    return (data || []).map(p => {
      let roles = Array.isArray(p.roles) && p.roles.length > 0
        ? p.roles.map(r => r.toLowerCase())
        : p.role && p.role !== 'player' ? [p.role.toLowerCase()] : [];
      if (!roles.includes('player')) roles = [...roles, 'player'];
      return {
        id: p.id,
        name: ((p.first_name || '') + ' ' + (p.last_name || '')).trim() || p.email,
        email: p.email, school: p.school || '', grade: p.grade || '',
        coachId: p.coach_id || null, roles, role: roles[0],
        membershipActive: false, joinedAt: p.created_at ? p.created_at.slice(0, 10) : '',
      };
    });
  },
  updatePlayer: async (userId, updates) => {
    const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
    const res = await fetch(url, { method: 'PATCH', headers: { ...(await authHeaders()), 'Prefer': 'return=minimal' }, body: JSON.stringify(updates) });
    return res.ok ? { success: true } : { success: false, error: await res.text() };
  },
  deletePlayer: async (userId) => {
    const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
    const res = await fetch(url, { method: 'DELETE', headers: await authHeaders() });
    return res.ok ? { success: true } : { success: false, error: await res.text() };
  },
  addRole: async (userId, role, currentRoles = []) => {
    const VALID = ['player', 'coach', 'org_manager', 'league_admin', 'head_admin'];
    if (!VALID.includes(role)) return { success: false, error: 'Invalid role.' };
    const RANK = { head_admin: 5, league_admin: 4, coach: 3, org_manager: 2, player: 1 };
    const newRoles = [...new Set([...currentRoles, role, 'player'])];
    const primaryRole = [...newRoles].sort((a, b) => (RANK[b] || 0) - (RANK[a] || 0))[0];
    const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
    const res = await fetch(url, { method: 'PATCH', headers: { ...(await authHeaders()), 'Prefer': 'return=minimal' }, body: JSON.stringify({ roles: newRoles, role: primaryRole }) });
    return res.ok ? { success: true, roles: newRoles } : { success: false, error: await res.text() };
  },
  removeRole: async (userId, role, currentRoles = []) => {
    if (role === 'player') return { success: false, error: 'Cannot remove base player role.' };
    const RANK = { head_admin: 5, league_admin: 4, coach: 3, org_manager: 2, player: 1 };
    const newRoles = currentRoles.filter(r => r !== role);
    if (!newRoles.includes('player')) newRoles.push('player');
    const primaryRole = [...newRoles].sort((a, b) => (RANK[b] || 0) - (RANK[a] || 0))[0];
    const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
    const res = await fetch(url, { method: 'PATCH', headers: { ...(await authHeaders()), 'Prefer': 'return=minimal' }, body: JSON.stringify({ roles: newRoles, role: primaryRole }) });
    return res.ok ? { success: true, roles: newRoles } : { success: false, error: await res.text() };
  },
  setPlayerRole: async (userId, role) => {
    const valid = ['player', 'coach', 'org_manager', 'league_admin', 'head_admin'];
    const dbRole = role.toLowerCase();
    if (!valid.includes(dbRole)) return { success: false, error: 'Invalid role.' };
    const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
    const res = await fetch(url, { method: 'PATCH', headers: { ...(await authHeaders()), 'Prefer': 'return=minimal' }, body: JSON.stringify({ role: dbRole }) });
    return res.ok ? { success: true } : { success: false, error: await res.text() };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  ORGS API  →  organizations, youth_players, youth_teams, youth_team_members, youth_player_tournaments
// ─────────────────────────────────────────────────────────────────────────────

export const orgsApi = {
  getAll: async () => { const { data } = await supabase.from('organizations').select('*').order('created_at', { ascending: false }); return data || []; },
  create: async (orgData) => { const { data, error } = await supabase.from('organizations').insert([orgData]).select().single(); return error ? { success: false, error: error.message } : { success: true, org: data }; },
  update: async (id, updates) => { const { error } = await supabase.from('organizations').update(updates).eq('id', id); return error ? { success: false } : { success: true }; },
  delete: async (id) => { const { error } = await supabase.from('organizations').delete().eq('id', id); return error ? { success: false } : { success: true }; },
  getMyOrg: async (managerId) => { const { data } = await supabase.from('organizations').select('*').eq('manager_id', managerId).single(); return data || null; },
  getYouthPlayers: async (orgId) => { const { data } = await supabase.from('youth_players').select('*').eq('org_id', orgId); return data || []; },
  createYouthPlayer: async (orgId, playerData) => { const { data, error } = await supabase.from('youth_players').insert([{ org_id: orgId, ...playerData }]).select().single(); return error ? { success: false, error: error.message } : { success: true, player: data }; },
  updateYouthPlayer: async (playerId, updates) => { const { error } = await supabase.from('youth_players').update(updates).eq('id', playerId); return error ? { success: false } : { success: true }; },
  deleteYouthPlayer: async (playerId) => { const { error } = await supabase.from('youth_players').delete().eq('id', playerId); return error ? { success: false } : { success: true }; },
  getYouthTeams: async (orgId) => { const { data } = await supabase.from('youth_teams').select('*, youth_team_members(*)').eq('org_id', orgId); return data || []; },
  createYouthTeam: async (orgId, teamData) => { const { data, error } = await supabase.from('youth_teams').insert([{ org_id: orgId, ...teamData }]).select().single(); return error ? { success: false, error: error.message } : { success: true, team: data }; },
  addPlayerToTeam: async (teamId, playerId) => { const { error } = await supabase.from('youth_team_members').insert([{ team_id: teamId, player_id: playerId }]); return error ? { success: false } : { success: true }; },
  removePlayerFromTeam: async (teamId, playerId) => { const { error } = await supabase.from('youth_team_members').delete().eq('team_id', teamId).eq('player_id', playerId); return error ? { success: false } : { success: true }; },
  deleteYouthTeam: async (teamId) => { await supabase.from('youth_team_members').delete().eq('team_id', teamId); const { error } = await supabase.from('youth_teams').delete().eq('id', teamId); return error ? { success: false } : { success: true }; },
  registerYouthForTournament: async (playerId, tournamentId) => { const { error } = await supabase.from('youth_player_tournaments').insert([{ player_id: playerId, tournament_id: tournamentId }]); return error ? { success: false } : { success: true }; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  MATCH ROOM API  →  match_rooms, match_room_messages, match_room_games
// ─────────────────────────────────────────────────────────────────────────────

const SERIES_WINS_NEEDED = { bo1: 1, bo3: 2, bo5: 3, bo7: 4 };

export const matchRoomApi = {
  getRoom: async (tournamentId, matchId) => {
    let { data: room } = await supabase.from('match_rooms').select('*').eq('match_id', matchId).single();
    if (!room) {
      const { data: newRoom } = await supabase.from('match_rooms').insert([{
        match_id: matchId, tournament_id: tournamentId, series_format: 'bo3', status: 'pending',
      }]).select().single();
      room = newRoom;
      await supabase.from('match_room_messages').insert([{
        match_id: matchId, user_id: 'sys', user_name: 'System', role: 'system',
        text: 'Match room opened. Use this chat to coordinate your match start and report scores.', is_system: true,
      }]);
    }
    const { data: messages } = await supabase.from('match_room_messages').select('*').eq('match_id', matchId).order('created_at');
    const { data: games }    = await supabase.from('match_room_games').select('*').eq('match_id', matchId).order('game_num');
    return { ...room, seriesFormat: room.series_format, chat: messages || [], games: games || [] };
  },
  setSeriesFormat: async (matchId, format) => {
    await supabase.from('match_rooms').update({ series_format: format }).eq('match_id', matchId);
    const label = { bo1: 'Best of 1', bo3: 'Best of 3', bo5: 'Best of 5', bo7: 'Best of 7' }[format];
    await supabase.from('match_room_messages').insert([{ match_id: matchId, user_id: 'sys', user_name: 'System', role: 'system', text: `Series format changed to ${label}.`, is_system: true }]);
    return { success: true };
  },
  sendMessage: async (matchId, userId, userName, role, text) => {
    const { data, error } = await supabase.from('match_room_messages').insert([{ match_id: matchId, user_id: userId, user_name: userName, role, text: text.trim(), is_system: false }]).select().single();
    return error ? { success: false } : { success: true, message: data };
  },
  reportGame: async (matchId, reportingTeamId, winnerTeamId, losingTeamId) => {
    const { data: existing } = await supabase.from('match_room_games').select('game_num').eq('match_id', matchId).order('game_num', { ascending: false }).limit(1).single();
    const gameNum = (existing?.game_num ?? 0) + 1;
    await supabase.from('match_room_games').insert([{ match_id: matchId, game_num: gameNum, reporting_team_id: reportingTeamId, winner_team_id: winnerTeamId, losing_team_id: losingTeamId, confirmed: false }]);
    await supabase.from('match_room_messages').insert([{ match_id: matchId, user_id: 'sys', user_name: 'System', role: 'system', text: `Game ${gameNum} reported — waiting for opponent confirmation.`, is_system: true }]);
    return { success: true, gameNum };
  },
  confirmGame: async (matchId, gameNum, confirmingTeamId) => {
    await supabase.from('match_room_games').update({ confirmed: true, confirmed_by: confirmingTeamId }).eq('match_id', matchId).eq('game_num', gameNum);
    const { data: room }  = await supabase.from('match_rooms').select('series_format').eq('match_id', matchId).single();
    const { data: games } = await supabase.from('match_room_games').select('*').eq('match_id', matchId).eq('confirmed', true);
    const winsNeeded = SERIES_WINS_NEEDED[room?.series_format] || 2;
    const winCounts  = {};
    (games || []).forEach(g => { winCounts[g.winner_team_id] = (winCounts[g.winner_team_id] || 0) + 1; });
    const seriesWinner = Object.entries(winCounts).find(([, w]) => w >= winsNeeded);
    if (seriesWinner) {
      await supabase.from('match_rooms').update({ status: 'complete', series_winner_id: seriesWinner[0] }).eq('match_id', matchId);
      await supabase.from('match_room_messages').insert([{ match_id: matchId, user_id: 'sys', user_name: 'System', role: 'system', text: '🏆 Series complete! Match winner determined. Admins will update the bracket shortly.', is_system: true }]);
    } else {
      await supabase.from('match_room_messages').insert([{ match_id: matchId, user_id: 'sys', user_name: 'System', role: 'system', text: `Game ${gameNum} confirmed. Series continues.`, is_system: true }]);
    }
    return { success: true, winCounts, seriesWinner: seriesWinner ? seriesWinner[0] : null };
  },
  disputeGame: async (matchId, gameNum, disputingTeamId, reason) => {
    await supabase.from('match_room_games').update({ disputed: true }).eq('match_id', matchId).eq('game_num', gameNum);
    await supabase.from('match_room_messages').insert([{ match_id: matchId, user_id: 'sys', user_name: 'System', role: 'system', text: `⚠️ Game ${gameNum} disputed. Reason: "${reason}" — An admin has been notified.`, is_system: true }]);
    return { success: true };
  },
  adminSetWinner: async (matchId, winnerTeamId, score1, score2) => {
    await supabase.from('match_rooms').update({ status: 'complete', series_winner_id: winnerTeamId, admin_override: true }).eq('match_id', matchId);
    await supabase.from('match_room_messages').insert([{ match_id: matchId, user_id: 'sys', user_name: 'System', role: 'system', text: `⚙️ Admin has set the final result: ${score1}–${score2}. Match complete.`, is_system: true }]);
    return { success: true };
  },
  getMessages: async (matchId, since) => {
    let query = supabase.from('match_room_messages').select('*').eq('match_id', matchId).order('created_at');
    if (since) query = query.gt('created_at', new Date(since).toISOString());
    const { data } = await query;
    return data || [];
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  SEASONAL LEAGUE API  →  leagues, league_groups, league_group_teams, league_standings, league_matches
// ─────────────────────────────────────────────────────────────────────────────

export const leagueApi = {
  getAll: async () => {
    const { data, error } = await supabase.from('leagues').select('*, league_groups(*, league_standings(*))').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  getById: async (id) => {
    const { data } = await supabase.from('leagues').select('*, league_groups(*, league_standings(*))').eq('id', id).single();
    return data || null;
  },
  create: async (leagueData) => {
    const { data: league, error } = await supabase.from('leagues').insert([{ ...leagueData, status: 'draft', current_week: 0 }]).select().single();
    if (error) return { success: false, error: error.message };
    await supabase.from('league_groups').insert(['A', 'B', 'C', 'D'].map(l => ({
      league_id: league.id, name: `Group ${l}`,
      label: { A: 'North Division', B: 'South Division', C: 'East Division', D: 'West Division' }[l],
    })));
    return { success: true, league };
  },
  update: async (id, updates) => { const { error } = await supabase.from('leagues').update(updates).eq('id', id); return error ? { success: false } : { success: true }; },
  delete: async (id) => { const { error } = await supabase.from('leagues').delete().eq('id', id); return error ? { success: false } : { success: true }; },
  advanceStatus: async (id) => {
    const order = ['draft', 'active', 'playoffs', 'complete'];
    const { data } = await supabase.from('leagues').select('status').eq('id', id).single();
    const next = order[order.indexOf(data?.status) + 1];
    if (next) await supabase.from('leagues').update({ status: next }).eq('id', id);
    return { success: true, status: next };
  },
  addTeamToGroup: async (leagueId, groupId, team) => {
    await supabase.from('league_group_teams').insert([{ league_id: leagueId, group_id: groupId, team_id: team.id, team_name: team.name }]);
    await supabase.from('league_standings').insert([{ league_id: leagueId, group_id: groupId, team_id: team.id, team_name: team.name, wins: 0, losses: 0, points: 0, games_played: 0, streak: '—' }]);
    return { success: true };
  },
  removeTeamFromGroup: async (leagueId, groupId, teamId) => {
    await supabase.from('league_group_teams').delete().eq('group_id', groupId).eq('team_id', teamId);
    await supabase.from('league_standings').delete().eq('group_id', groupId).eq('team_id', teamId);
    return { success: true };
  },
  scheduleMatch: async (leagueId, matchData) => {
    const { data, error } = await supabase.from('league_matches').insert([{ league_id: leagueId, ...matchData, status: 'pending' }]).select().single();
    return error ? { success: false, error: error.message } : { success: true, match: data };
  },
  getMatches: async (leagueId, { groupId, week } = {}) => {
    let query = supabase.from('league_matches').select('*').eq('league_id', leagueId);
    if (groupId) query = query.eq('group_id', groupId);
    if (week !== undefined) query = query.eq('week', week);
    const { data } = await query;
    return data || [];
  },
  reportMatchResult: async (matchId, reportingTeamId, score1, score2) => {
    const { error } = await supabase.from('league_matches').update({ reported_by: reportingTeamId, pending_score1: score1, pending_score2: score2 }).eq('id', matchId);
    return error ? { success: false } : { success: true };
  },
  confirmMatchResult: async (matchId, confirmingTeamId) => {
    const { data: match } = await supabase.from('league_matches').select('*').eq('id', matchId).single();
    if (!match) return { success: false };
    const score1  = match.pending_score1;
    const score2  = match.pending_score2;
    const winner  = score1 > score2 ? match.team1_id : match.team2_id;
    const loserId = winner === match.team1_id ? match.team2_id : match.team1_id;
    await supabase.from('league_matches').update({ score1, score2, winner_id: winner, confirmed_by: confirmingTeamId, status: 'complete', pending_score1: null, pending_score2: null }).eq('id', matchId);
    await supabase.rpc('increment_standing_win',  { p_league_id: match.league_id, p_group_id: match.group_id, p_team_id: winner   }).catch(() => {});
    await supabase.rpc('increment_standing_loss', { p_league_id: match.league_id, p_group_id: match.group_id, p_team_id: loserId  }).catch(() => {});
    return { success: true };
  },
  getPendingReport: async (matchId) => {
    const { data } = await supabase.from('league_matches').select('pending_score1, pending_score2, reported_by').eq('id', matchId).single();
    if (!data?.pending_score1) return null;
    return { score1: data.pending_score1, score2: data.pending_score2, reportingTeamId: data.reported_by };
  },
  getPlayoffSeedings: async (leagueId) => {
    const { data: groups } = await supabase.from('league_groups').select('id').eq('league_id', leagueId);
    if (!groups) return null;
    const divisional = {}, championship = [];
    for (const g of groups) {
      const { data: standings } = await supabase.from('league_standings').select('*').eq('group_id', g.id).order('points', { ascending: false });
      divisional[g.id] = (standings || []).slice(0, 8);
      championship.push(...(standings || []).slice(0, 4));
    }
    return { divisional, championship };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  MATCH FLAGS API  →  match_flags, match_flag_notes
// ─────────────────────────────────────────────────────────────────────────────

export const matchFlagApi = {
  flag: async (matchId, reason, reportedBy) => {
    const { data, error } = await supabase.from('match_flags').insert([{ match_id: matchId, reason, reported_by: reportedBy, status: 'active' }]).select().single();
    return error ? { success: false } : { success: true, id: data.id };
  },
  resolve: async (flagId, resolvedBy, note) => {
    await supabase.from('match_flags').update({ status: 'resolved', resolved_by: resolvedBy, resolved_at: new Date().toISOString() }).eq('id', flagId);
    if (note) await supabase.from('match_flag_notes').insert([{ flag_id: flagId, note, created_by: resolvedBy }]);
    return { success: true };
  },
  getForMatch: async (matchId) => { const { data } = await supabase.from('match_flags').select('*, match_flag_notes(*)').eq('match_id', matchId); return data || []; },
  getActive: async () => { const { data } = await supabase.from('match_flags').select('*').eq('status', 'active').order('created_at', { ascending: false }); return data || []; },
  getHistory: async (filters = {}) => {
    let query = supabase.from('match_flags').select('*').order('created_at', { ascending: false });
    if (filters.status) query = query.eq('status', filters.status);
    const { data } = await query;
    return data || [];
  },
  getRetentionSummary: async () => {
    const { data } = await supabase.from('match_flags').select('status');
    const active   = (data || []).filter(f => f.status === 'active').length;
    const resolved = (data || []).filter(f => f.status === 'resolved').length;
    return { active, totalResolved: resolved, expiringThisWeek: 0 };
  },
  clearFlag: async (flagId) => { const { error } = await supabase.from('match_flags').update({ status: 'cleared' }).eq('id', flagId); return error ? { success: false } : { success: true }; },
  setEventEndDate: async (eventId, endTs) => { return { success: true }; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export const publicApi = {
  getAll:      async () => { return []; },
  getTopPosts: async () => { return []; },
  getUpcomingTournament: async () => {
    const { data } = await supabase.from('tournaments').select('*').eq('status', 'open').order('created_at').limit(1).single();
    return data || null;
  },
  getActiveleague: async () => {
    const { data } = await supabase.from('leagues').select('*').eq('status', 'active').order('created_at').limit(1).single();
    return data || null;
  },
  getTopTeam: async () => {
    const { data: league } = await supabase.from('leagues').select('id, name').eq('status', 'active').limit(1).single();
    if (!league) return null;
    const { data: standing } = await supabase.from('league_standings').select('*').eq('league_id', league.id).order('points', { ascending: false }).limit(1).single();
    return standing ? { ...standing, leagueName: league.name } : null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  SOCIAL API  →  posts, post_comments, post_votes, comment_votes, user_timeouts
// ─────────────────────────────────────────────────────────────────────────────

function normalizePost(p, userId) {
  const votes    = p.post_votes    || [];
  const comments = p.post_comments || [];
  const score    = votes.filter(v => !v.is_downvote).length;
  const myUpvote = votes.some(v => v.user_id === userId);
  return {
    id:              p.id,
    userId:          p.user_id,
    userName:        p.user_name,
    userRole:        p.user_role,
    userInitials:    p.user_initials,
    userAvatarColor: p.user_avatar_color,
    category:        p.media?.category || p.category || p.community_id || 'discussion',
    communityMeta:   p.media?.communityMeta || null,
    title:           p.title || '',
    text:            p.text  || '',
    media:           p.media || null,
    score,
    myUpvote,
    comments: comments.map(c => ({
      id:              c.id,
      userId:          c.user_id,
      userName:        c.user_name,
      userRole:        c.user_role,
      userInitials:    c.user_initials,
      userAvatarColor: c.user_avatar_color,
      text:            c.text  || '',
      media:           c.media || null,
      upvotes:         [],
      createdAt:       c.created_at ? new Date(c.created_at).getTime() : Date.now(),
    })),
    pinned:    p.pinned    || false,
    flagged:   p.flagged   || false,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
  };
}

export const socialApi = {
  getCommunities: async () => {
    const sys = FEED_CATEGORIES.map(c => ({ ...c, type: 'system', name: c.label }));
    const { data } = await supabase.from('communities').select('*').order('created_at', { ascending: false });
    const user = (data || []).map(c => ({
      id: c.id, name: c.name, slug: c.slug, label: c.name, description: c.description || '',
      icon: c.icon, color: c.color, type: 'community',
    }));
    return [...sys, ...user];
  },
  getCommunity: async (id) => {
    const sys = FEED_CATEGORIES.find(c => c.id === id);
    if (sys) return { ...sys, type: 'system', name: sys.label };
    const { data } = await supabase.from('communities').select('*').eq('id', id).maybeSingle();
    return data ? { id: data.id, name: data.name, slug: data.slug, label: data.name, description: data.description || '', icon: data.icon, color: data.color, type: 'community' } : null;
  },
  createCommunity: async (userId, name, description, icon, color) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data, error } = await supabase.from('communities').insert([{
      id: crypto.randomUUID(), name, slug, description: description || '',
      icon: icon || '🎮', color: color || '#3b82f6', created_by: userId,
    }]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, community: { id: data.id, name: data.name, slug: data.slug, label: data.name, description: data.description, icon: data.icon, color: data.color, type: 'community' } };
  },

  getFeedPosts: async (userId, userAge, sort = 'new', category = null) => {
    const { data, error } = await supabase
      .from('posts').select('*, post_comments(*), post_votes(*)')
      .order('created_at', { ascending: false }).limit(200);
    if (error) return { allowed: true, posts: [] };
    let posts = (data || []).map(p => normalizePost(p, userId));
    if (category) posts = posts.filter(p => p.category === category);
    if (sort === 'top') posts = posts.sort((a, b) => b.score - a.score);
    if (sort === 'hot') posts = posts.sort((a, b) => {
      const age = (ts) => Math.max(1, (Date.now() - ts) / 3600000);
      return (b.score / age(b.createdAt)) - (a.score / age(a.createdAt));
    });
    return { allowed: true, posts };
  },

  createForumPost: async (userId, userName, userRole, userInitials, userAvatarColor, category, title, text, _tags, media, communityMeta = null) => {
    // Category is embedded in the media JSONB so no extra column is needed
    const extra = communityMeta ? { communityMeta } : {};
    const mediaWithCategory = media
      ? { ...media, category, ...extra }
      : { category, ...extra };
    const { data, error } = await supabase.from('posts').insert([{
      id:                crypto.randomUUID(),
      user_id:           userId,
      user_name:         userName,
      user_role:         userRole,
      user_initials:     userInitials,
      user_avatar_color: userAvatarColor,
      title,
      text:              text || '',
      media:             mediaWithCategory,
      pinned:            false,
      flagged:           false,
    }]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, post: normalizePost(data, userId) };
  },

  deletePost: async (postId) => {
    await supabase.from('post_comments').delete().eq('post_id', postId);
    await supabase.from('post_votes').delete().eq('post_id', postId);
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    return error ? { success: false } : { success: true };
  },
  flagPost: async (postId) => { await supabase.from('posts').update({ flagged: true }).eq('id', postId); return { success: true }; },
  pinPost:  async (postId, pinned) => { await supabase.from('posts').update({ pinned }).eq('id', postId); return { success: true }; },

  toggleUpvote: async (postId, uid) => {
    const { data: ex } = await supabase.from('post_votes').select('id').eq('post_id', postId).eq('user_id', uid).maybeSingle();
    if (ex) await supabase.from('post_votes').delete().eq('id', ex.id);
    else    await supabase.from('post_votes').insert([{ post_id: postId, user_id: uid }]);
    return { success: true };
  },

  addComment: async (postId, userId, userName, userRole, userInitials, userAvatarColor, text, _userAge, media) => {
    const { data, error } = await supabase.from('post_comments').insert([{
      id:                crypto.randomUUID(),
      post_id:           postId,
      user_id:           userId,
      user_name:         userName,
      user_role:         userRole,
      user_initials:     userInitials,
      user_avatar_color: userAvatarColor,
      text:              text || '',
      media:             media || null,
    }]).select().single();
    if (error) return { success: false };
    return {
      success: true,
      comment: {
        id: data.id, userId: data.user_id, userName: data.user_name,
        userRole: data.user_role, userInitials: data.user_initials,
        userAvatarColor: data.user_avatar_color,
        text: data.text, media: data.media || null,
        upvotes: [], createdAt: new Date(data.created_at).getTime(),
      },
    };
  },

  deleteComment: async (postId, commentId) => {
    await supabase.from('comment_votes').delete().eq('comment_id', commentId);
    const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
    return error ? { success: false } : { success: true };
  },

  upvoteComment: async (postId, commentId, uid) => {
    const { data: ex } = await supabase.from('comment_votes').select('id').eq('comment_id', commentId).eq('user_id', uid).maybeSingle();
    if (ex) await supabase.from('comment_votes').delete().eq('id', ex.id);
    else    await supabase.from('comment_votes').insert([{ comment_id: commentId, user_id: uid }]);
    return { success: true };
  },

  joinCommunity:  async () => ({ success: true }),
  leaveCommunity: async () => ({ success: true }),

  parseMediaUrl: (url) => {
    if (!url?.trim()) return null;
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}`, url };
    const twClip = url.match(/twitch\.tv\/\w+\/clip\/(\w+)/);
    if (twClip) return { type: 'twitch', embedUrl: `https://clips.twitch.tv/embed?clip=${twClip[1]}&parent=${host}`, url };
    const twVod = url.match(/twitch\.tv\/videos\/(\d+)/);
    if (twVod) return { type: 'twitch', embedUrl: `https://player.twitch.tv/?video=${twVod[1]}&parent=${host}`, url };
    const streamable = url.match(/streamable\.com\/([a-zA-Z0-9]+)/);
    if (streamable) return { type: 'youtube', embedUrl: `https://streamable.com/e/${streamable[1]}`, url };
    return null;
  },

  timeoutUser: async (uid, duration) => {
    const { error } = await supabase.from('user_timeouts').insert([{ user_id: uid, expires_at: new Date(Date.now() + duration).toISOString() }]);
    return error ? { success: false } : { success: true };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  CLANS API  →  clans, clan_members
// ─────────────────────────────────────────────────────────────────────────────

export const clansApi = {
  getAll: async () => { const { data } = await supabase.from('clans').select('*, clan_members(*)').order('created_at', { ascending: false }); return data || []; },
  getMyClans: async (uid) => { const { data } = await supabase.from('clan_members').select('clan_id, clans(*, clan_members(*))').eq('user_id', uid); return (data || []).map(r => r.clans).filter(Boolean); },
  create: async (clanData) => { const { data, error } = await supabase.from('clans').insert([clanData]).select().single(); return error ? { success: false } : { success: true, id: data.id }; },
  update: async (id, clanData) => { const { error } = await supabase.from('clans').update(clanData).eq('id', id); return error ? { success: false } : { success: true }; },
  delete: async (id) => { await supabase.from('clan_members').delete().eq('clan_id', id); const { error } = await supabase.from('clans').delete().eq('id', id); return error ? { success: false } : { success: true }; },
  addMember: async (clanId, uid) => { const { error } = await supabase.from('clan_members').insert([{ clan_id: clanId, user_id: uid }]); return error ? { success: false } : { success: true }; },
  removeMember: async (clanId, uid) => { const { error } = await supabase.from('clan_members').delete().eq('clan_id', clanId).eq('user_id', uid); return error ? { success: false } : { success: true }; },
  updateMemberRole: async (clanId, uid, role) => { const { error } = await supabase.from('clan_members').update({ role }).eq('clan_id', clanId).eq('user_id', uid); return error ? { success: false } : { success: true }; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  CASH MATCH API  →  cash_matches
// ─────────────────────────────────────────────────────────────────────────────

export const cashMatchApi = {
  getOpenMatches: async () => { const { data } = await supabase.from('cash_matches').select('*').eq('status', 'open').order('created_at', { ascending: false }); return data || []; },
  getMyMatches: async (uid) => { const { data } = await supabase.from('cash_matches').select('*').or(`team1_captain.eq.${uid},team2_captain.eq.${uid},created_by.eq.${uid}`).order('created_at', { ascending: false }); return data || []; },
  create: async (matchData) => { const { data, error } = await supabase.from('cash_matches').insert([matchData]).select().single(); return error ? { success: false } : { success: true, id: data.id }; },
  cancel: async (id) => { const { error } = await supabase.from('cash_matches').update({ status: 'cancelled' }).eq('id', id); return error ? { success: false } : { success: true }; },
  accept: async (id, uid) => { const { error } = await supabase.from('cash_matches').update({ status: 'active' }).eq('id', id); return error ? { success: false } : { success: true }; },
  dispute: async (id, disputeData) => { const { error } = await supabase.from('cash_matches').update({ status: 'disputed', ...disputeData }).eq('id', id); return error ? { success: false } : { success: true }; },
  reportResult: async (id, resultData) => { const { error } = await supabase.from('cash_matches').update(resultData).eq('id', id); return error ? { success: false } : { success: true }; },
  confirmResult: async (id) => { const { error } = await supabase.from('cash_matches').update({ status: 'complete', completed_at: new Date().toISOString() }).eq('id', id); return error ? { success: false } : { success: true }; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  HALO MLG SETTINGS (static) & LADDER API  →  user_stats
// ─────────────────────────────────────────────────────────────────────────────

export const HALO_MLG_SETTINGS = {
  version: 'V8',
  modes: ['Slayer', 'CTF', 'Ball', 'Oddball', 'Territories'],
  maps: [
    { id: 'guardian',   name: 'Guardian',    modes: ['Slayer', 'CTF', 'Ball'] },
    { id: 'narrows',    name: 'Narrows',     modes: ['Slayer', 'CTF', 'Ball', 'Territories'] },
    { id: 'construct',  name: 'Construct',   modes: ['Slayer', 'CTF', 'Ball'] },
    { id: 'highground', name: 'High Ground', modes: ['Slayer', 'CTF', 'Territories'] },
    { id: 'sandtrap',   name: 'Sand Trap',   modes: ['Slayer', 'CTF', 'Oddball'] },
    { id: 'epitaph',    name: 'Epitaph',     modes: ['Slayer', 'Ball', 'Territories'] },
    { id: 'snowbound',  name: 'Snowbound',   modes: ['Slayer', 'CTF', 'Oddball'] },
    { id: 'isolation',  name: 'Isolation',   modes: ['Slayer', 'Ball', 'Territories'] },
  ],
  seriesPool: { bo1: 1, bo3: 3, bo5: 5, bo7: 7 },
};

export const ladderApi = {
  getSeasons: async () => {
    const { data, error } = await supabase.from('ladder_seasons').select('*').order('created_at', { ascending: false });
    if (error || !data?.length) return [{ id: 'season-1', name: 'Season 1', active: true }];
    return data;
  },
  getStandings: async (seasonId, teamSize) => {
    const { data } = await supabase.from('ladder_teams').select('*').eq('season_id', seasonId).eq('team_size', teamSize).order('xp', { ascending: false });
    return (data || []).map(t => ({ id: t.id, name: t.name, tag: t.tag, color: t.color, xp: t.xp || 0, wins: t.wins || 0, losses: t.losses || 0, teamSize: t.team_size }));
  },
  getMyTeams: async (userId, seasonId) => {
    if (!userId) return [];
    const { data } = await supabase.from('ladder_teams').select('*').eq('season_id', seasonId).eq('created_by', userId);
    return (data || []).map(t => ({ id: t.id, name: t.name, tag: t.tag, color: t.color, xp: t.xp || 0, wins: t.wins || 0, losses: t.losses || 0, teamSize: t.team_size }));
  },
  registerTeam: async (seasonId, teamSize, name, tag, userId, color) => {
    const { data, error } = await supabase.from('ladder_teams').insert([{ season_id: seasonId, team_size: teamSize, name, tag, color, created_by: userId, xp: 0, wins: 0, losses: 0 }]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, team: { id: data.id, name: data.name, tag: data.tag, color: data.color, xp: 0, wins: 0, losses: 0, teamSize: data.team_size } };
  },
  getQueueStatus:   async ()                => { return {}; },
  joinQueue:        async (teamId, format)  => { return { success: true }; },
  leaveQueue:       async (teamId)          => { return { success: true }; },
  pollQueue:        async (teamId)          => { return { matched: false }; },
  getRoom:          async (matchId)         => { return matchRoomApi.getRoom(null, matchId); },
  getMessages:      async (matchId)         => { return matchRoomApi.getMessages(matchId); },
  sendMessage:      async (matchId, userId, userName, role, text) => { return matchRoomApi.sendMessage(matchId, userId, userName, role, text); },
  reportGame:       async (matchId, reportingTeamId, winnerTeamId, losingTeamId) => { return matchRoomApi.reportGame(matchId, reportingTeamId, winnerTeamId, losingTeamId); },
  confirmGame:      async (matchId, gameNum, teamId) => { return matchRoomApi.confirmGame(matchId, gameNum, teamId); },
  disputeGame:      async (matchId, gameNum, teamId, reason) => { return { success: true }; },
  adminSetWinner:   async (matchId, wId)    => { return matchRoomApi.adminSetWinner(matchId, wId, 0, 0); },
  setSeriesFormat:  async (matchId, fmt)    => { return matchRoomApi.setSeriesFormat(matchId, fmt); },
  getRecentMatches: async (seasonId, teamSize) => {
    const { data } = await supabase.from('match_rooms').select('*').eq('status', 'complete').order('created_at', { ascending: false }).limit(20);
    return (data || []).map(m => ({ id: m.id, team1Id: m.team1_id, team1Name: m.team1_name, team2Id: m.team2_id, team2Name: m.team2_name, winnerId: m.winner_id, seriesFormat: m.series_format || 'bo3', games: m.games?.length || 0, xpAwarded: m.xp_awarded, completedAt: new Date(m.updated_at || m.created_at).getTime() }));
  },
  getTopTeam:       async (gameId)          => { const { data } = await supabase.from('user_stats').select('*').eq('game_id', gameId).order('rating', { ascending: false }).limit(1).single(); return data || null; },
};
