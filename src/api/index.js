// ─────────────────────────────────────────────────────────────────────────────
//  api/index.js — HCEA Backend Service Layer
//  All mock data lives here. Replace each function body with real fetch() calls.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../supabaseClient';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const delay = ms => new Promise(r => setTimeout(r, ms));

async function request(path, options = {}) {
  const token = localStorage.getItem('hcea_token');
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────
//  GAME TEAM SIZE CONFIG
// ─────────────────────────────────────────────
export const GAME_TEAM_SIZES = {
  'League of Legends': { min: 5, max: 5,  label: '5v5' },
  'Valorant':          { min: 5, max: 5,  label: '5v5' },
  'Team Fight Tactics':{ min: 1, max: 1,  label: '1v1 (FFA)' },
  'Rocket League':     { min: 2, max: 3,  label: '2v2 or 3v3' },
  'Fortnite':          { min: 1, max: 4,  label: '1-4 players' },
  'Smash Bros.':       { min: 1, max: 1,  label: '1v1' },
  'Marvel Rivals':     { min: 5, max: 6,  label: '5v5 or 6v6' },
};

export const BRACKET_FORMATS = [
  { id: 'single_elim',  label: 'Single Elimination',  desc: 'One loss and you\'re out. Fast, high-stakes.' },
  { id: 'double_elim',  label: 'Double Elimination',  desc: 'Two losses to be eliminated. More forgiving.' },
  { id: 'round_robin',  label: 'Round Robin',          desc: 'Everyone plays everyone. Best overall record wins.' },
  { id: 'swiss',        label: 'Swiss',                desc: 'Matched by record each round. No elimination until X losses.' },
  { id: 'group_stage',  label: 'Group Stage + Playoffs', desc: 'Groups feed into a single-elim playoff bracket.' },
];

// ─────────────────────────────────────────────
//  GAME MANAGEMENT API
// ─────────────────────────────────────────────
// Master game catalog — single source of truth.
// Add a game here and it becomes available across tournaments,
// leagues, the ladder, coaching sessions, and player profiles.

let MOCK_GAMES = [
  {
    id: 'game_lol',    name: 'League of Legends', shortName: 'LoL',
    genre: 'MOBA',     platform: 'PC',
    teamSize: { min: 5, max: 5, label: '5v5' },
    active: true, featured: true, hasLadder: false,
    icon: '⚔️',  color: '#c89b3c',
    coverImage: '',
    modes: ['Summoners Rift (5v5)', 'ARAM', 'Arena'],
    maps: [
      { id: 'map_lol_sr',   name: "Summoner's Rift", type: 'Standard', active: true,  image: '', notes: '5v5 main competitive map' },
      { id: 'map_lol_ha',   name: 'Howling Abyss',   type: 'ARAM',     active: true,  image: '', notes: 'Single lane all random map' },
      { id: 'map_lol_ar',   name: 'Arena',            type: 'Special',  active: true,  image: '', notes: '2v2v2v2 rotating arena mode' },
    ],
    seasons: [
      { id: 'lol_s1', name: 'Spring 2025', startDate: '2025-01-15', endDate: '2025-04-15', active: true },
    ],
  },
  {
    id: 'game_val',    name: 'Valorant',           shortName: 'VAL',
    genre: 'FPS',      platform: 'PC',
    teamSize: { min: 5, max: 5, label: '5v5' },
    active: true, featured: true, hasLadder: false,
    icon: '🔫',  color: '#ff4655',
    coverImage: '',
    modes: ['Standard (5v5)', 'Spike Rush', 'Deathmatch'],
    maps: [
      { id: 'map_val_haven',    name: 'Haven',    type: 'Competitive', active: true,  image: '', notes: '3 spike sites' },
      { id: 'map_val_bind',     name: 'Bind',     type: 'Competitive', active: true,  image: '', notes: 'Teleporters, no mid' },
      { id: 'map_val_ascent',   name: 'Ascent',   type: 'Competitive', active: true,  image: '', notes: 'Open mid with doors' },
      { id: 'map_val_split',    name: 'Split',    type: 'Competitive', active: true,  image: '', notes: 'Vertical map design' },
      { id: 'map_val_fracture', name: 'Fracture', type: 'Competitive', active: false, image: '', notes: 'Currently in rotation' },
      { id: 'map_val_lotus',    name: 'Lotus',    type: 'Competitive', active: true,  image: '', notes: '3 sites with rotating doors' },
    ],
    seasons: [
      { id: 'val_s1', name: 'Spring 2025', startDate: '2025-01-15', endDate: '2025-04-15', active: true },
    ],
  },
  {
    id: 'game_tft',    name: 'Team Fight Tactics', shortName: 'TFT',
    genre: 'Auto Battler', platform: 'PC/Mobile',
    teamSize: { min: 1, max: 1, label: '1v1 (FFA)' },
    active: true, featured: true, hasLadder: false,
    icon: '🎲',  color: '#7c3aed',
    coverImage: '',
    modes: ['Standard', 'Double Up'],
    maps: [],
    seasons: [
      { id: 'tft_s1', name: 'Set 13 Season', startDate: '2025-01-01', endDate: '2025-06-01', active: true },
    ],
  },
  {
    id: 'game_rl',     name: 'Rocket League',      shortName: 'RL',
    genre: 'Sports',   platform: 'PC/Console',
    teamSize: { min: 2, max: 3, label: '2v2 or 3v3' },
    active: true, featured: false, hasLadder: false,
    icon: '🚀',  color: '#00b4d8',
    coverImage: '',
    modes: ['3v3 Soccar', '2v2 Soccar', '1v1 Duel', 'Rumble'],
    maps: [
      { id: 'map_rl_dfe',    name: 'DFH Stadium',       type: 'Standard', active: true, image: '', notes: 'Main competitive arena' },
      { id: 'map_rl_manor',  name: 'Mannfield',          type: 'Standard', active: true, image: '', notes: 'Night variant available' },
      { id: 'map_rl_urban',  name: 'Urban Central',      type: 'Standard', active: true, image: '', notes: '' },
      { id: 'map_rl_utopia', name: 'Utopia Coliseum',    type: 'Standard', active: true, image: '', notes: '' },
    ],
    seasons: [],
  },
  {
    id: 'game_fn',     name: 'Fortnite',            shortName: 'FN',
    genre: 'Battle Royale', platform: 'PC/Console/Mobile',
    teamSize: { min: 1, max: 4, label: '1-4 players' },
    active: true, featured: false, hasLadder: false,
    icon: '🏗️',  color: '#f59e0b',
    coverImage: '',
    modes: ['Battle Royale', 'Zero Build', 'Reload'],
    maps: [
      { id: 'map_fn_chapter6', name: 'Chapter 6 Island', type: 'Battle Royale', active: true, image: '', notes: 'Current chapter map' },
      { id: 'map_fn_reload',   name: 'Reload Island',    type: 'Reload',        active: true, image: '', notes: 'Smaller Reload-mode map' },
    ],
    seasons: [],
  },
  {
    id: 'game_ssb',    name: 'Smash Bros. Ultimate', shortName: 'SSBU',
    genre: 'Fighting', platform: 'Nintendo Switch',
    teamSize: { min: 1, max: 1, label: '1v1' },
    active: true, featured: false, hasLadder: false,
    icon: '💥',  color: '#ef4444',
    coverImage: '',
    modes: ['1v1 Tournament', 'Crews', 'Amateur Bracket'],
    maps: [
      { id: 'map_ssb_fd',      name: "Final Destination",      type: 'Starter',  active: true, image: '', notes: 'Flat, no platforms' },
      { id: 'map_ssb_bf',      name: 'Battlefield',            type: 'Starter',  active: true, image: '', notes: '3 soft platforms' },
      { id: 'map_ssb_sbf',     name: 'Small Battlefield',      type: 'Starter',  active: true, image: '', notes: 'Tighter platform layout' },
      { id: 'map_ssb_tw',      name: 'Town & City',            type: 'Starter',  active: true, image: '', notes: 'Moving top platform' },
      { id: 'map_ssb_pokemon', name: 'Pokémon Stadium 2',       type: 'Counterpick', active: true, image: '', notes: 'Transforming stage' },
      { id: 'map_ssb_kalos',   name: 'Kalos Pokémon League',    type: 'Counterpick', active: true, image: '', notes: '' },
      { id: 'map_ssb_la',      name: "Lylat Cruise",           type: 'Counterpick', active: true, image: '', notes: 'Tilting stage' },
    ],
    seasons: [],
  },
  {
    id: 'game_mr',     name: 'Marvel Rivals',        shortName: 'MR',
    genre: 'Hero Shooter', platform: 'PC/Console',
    teamSize: { min: 5, max: 6, label: '5v5 or 6v6' },
    active: true, featured: false, hasLadder: false,
    icon: '🦸',  color: '#dc2626',
    coverImage: '',
    modes: ['Domination', 'Convoy', 'Convergence', 'Conquest'],
    maps: [
      { id: 'map_mr_hall',     name: 'Hall of Djalia',         type: 'Domination', active: true, image: '', notes: '' },
      { id: 'map_mr_ygg',      name: 'Yggsgard',               type: 'Convoy',     active: true, image: '', notes: '' },
      { id: 'map_mr_tokyo',    name: 'Tokyo 2099',             type: 'Convoy',     active: true, image: '', notes: '' },
      { id: 'map_mr_empire',   name: 'Empire of Eternal Night', type: 'Convergence', active: true, image: '', notes: '' },
    ],
    seasons: [],
  },
  {
    id: 'game_halo3',  name: 'Halo 3',              shortName: 'H3',
    genre: 'FPS',      platform: 'PC (MCC)',
    teamSize: { min: 2, max: 4, label: '2v2 or 4v4' },
    active: true, featured: true, hasLadder: true,
    icon: '🎯',  color: '#00b4d8',
    coverImage: '',
    modes: ['MLG Slayer', 'MLG CTF', 'MLG Team Shotty Snipers', 'MLG KotH'],
    maps: [
      { id: 'map_h3_construct', name: 'Construct',  type: 'MLG',  active: true, image: '', notes: 'Slayer, CTF, TS, KotH' },
      { id: 'map_h3_guardian',  name: 'Guardian',   type: 'MLG',  active: true, image: '', notes: 'Slayer, CTF, TS, KotH' },
      { id: 'map_h3_heretic',   name: 'Heretic',    type: 'MLG',  active: true, image: '', notes: 'Slayer, CTF, TS' },
      { id: 'map_h3_isolation', name: 'Isolation',  type: 'MLG',  active: true, image: '', notes: 'CTF, KotH only' },
      { id: 'map_h3_narrows',   name: 'Narrows',    type: 'MLG',  active: true, image: '', notes: 'Slayer, CTF, TS' },
      { id: 'map_h3_pit',       name: 'The Pit',    type: 'MLG',  active: true, image: '', notes: 'All modes — most played' },
      { id: 'map_h3_onslaught', name: 'Onslaught',  type: 'MLG',  active: true, image: '', notes: 'Slayer, CTF, TS' },
      { id: 'map_h3_amplified', name: 'Amplified',  type: 'MLG',  active: true, image: '', notes: 'Slayer, CTF, KotH' },
    ],
    seasons: [
      { id: 'halo_s1', name: 'MLG Season 1', startDate: '2025-02-01', endDate: '2025-05-01', active: true },
    ],
  },
];

export const gameApi = {

  getAll: async () => {
    await delay(250);
    return MOCK_GAMES.map(g => ({ ...g }));
  },

  getActive: async () => {
    await delay(200);
    return MOCK_GAMES.filter(g => g.active).map(g => ({ ...g }));
  },

  getById: async (id) => {
    await delay(150);
    return MOCK_GAMES.find(g => g.id === id) || null;
  },

  create: async (data) => {
    await delay(400);
    const id = 'game_' + Date.now();
    const game = {
      id,
      name: data.name.trim(),
      shortName: data.shortName?.trim() || data.name.slice(0,4).toUpperCase(),
      genre: data.genre?.trim() || '',
      platform: data.platform?.trim() || 'PC',
      teamSize: data.teamSize || { min: 5, max: 5, label: '5v5' },
      active: true,
      featured: data.featured || false,
      hasLadder: data.hasLadder || false,
      icon: data.icon || '🎮',
      color: data.color || '#3b82f6',
      modes: data.modes || [],
      seasons: [],
    };
    MOCK_GAMES.push(game);
    return { success: true, game };
  },

  update: async (id, updates) => {
    await delay(300);
    const idx = MOCK_GAMES.findIndex(g => g.id === id);
    if (idx === -1) return { success: false, error: 'Game not found.' };
    MOCK_GAMES[idx] = { ...MOCK_GAMES[idx], ...updates };
    return { success: true, game: MOCK_GAMES[idx] };
  },

  toggleActive: async (id) => {
    await delay(200);
    const g = MOCK_GAMES.find(g => g.id === id);
    if (!g) return { success: false };
    g.active = !g.active;
    return { success: true, active: g.active };
  },

  // Season management
  addSeason: async (gameId, season) => {
    await delay(300);
    const g = MOCK_GAMES.find(g => g.id === gameId);
    if (!g) return { success: false };
    const newSeason = {
      id: `${gameId}_s${Date.now()}`,
      name: season.name.trim(),
      startDate: season.startDate,
      endDate: season.endDate,
      active: season.active || false,
    };
    g.seasons.push(newSeason);
    return { success: true, season: newSeason };
  },

  updateSeason: async (gameId, seasonId, updates) => {
    await delay(250);
    const g = MOCK_GAMES.find(g => g.id === gameId);
    if (!g) return { success: false };
    const si = g.seasons.findIndex(s => s.id === seasonId);
    if (si === -1) return { success: false };
    g.seasons[si] = { ...g.seasons[si], ...updates };
    // If setting active, deactivate others
    if (updates.active) g.seasons.forEach((s, i) => { if (i !== si) s.active = false; });
    return { success: true };
  },

  deleteSeason: async (gameId, seasonId) => {
    await delay(250);
    const g = MOCK_GAMES.find(g => g.id === gameId);
    if (!g) return { success: false };
    g.seasons = g.seasons.filter(s => s.id !== seasonId);
    return { success: true };
  },

  // Add/remove game modes
  updateModes: async (gameId, modes) => {
    await delay(200);
    const g = MOCK_GAMES.find(g => g.id === gameId);
    if (!g) return { success: false };
    g.modes = modes;
    return { success: true };
  },

  // ── MAP MANAGEMENT ────────────────────────────────────────────────────────
  getMaps: async (gameId) => {
    await delay(200);
    const g = MOCK_GAMES.find(g => g.id === gameId);
    if (!g) return [];
    return [...(g.maps || [])];
  },

  addMap: async (gameId, { name, type, notes }) => {
    await delay(300);
    const g = MOCK_GAMES.find(g => g.id === gameId);
    if (!g) return { success: false };
    if (!g.maps) g.maps = [];
    const map = {
      id: `map_${gameId}_${Date.now()}`,
      name: name.trim(),
      type: type.trim() || 'Standard',
      active: true,
      image: '',
      notes: notes?.trim() || '',
    };
    g.maps.push(map);
    return { success: true, map };
  },

  updateMap: async (gameId, mapId, updates) => {
    await delay(250);
    const g = MOCK_GAMES.find(g => g.id === gameId);
    if (!g) return { success: false };
    const idx = (g.maps || []).findIndex(m => m.id === mapId);
    if (idx === -1) return { success: false };
    g.maps[idx] = { ...g.maps[idx], ...updates };
    return { success: true, map: g.maps[idx] };
  },

  toggleMapActive: async (gameId, mapId) => {
    await delay(200);
    const g = MOCK_GAMES.find(g => g.id === gameId);
    const map = g?.maps?.find(m => m.id === mapId);
    if (!map) return { success: false };
    map.active = !map.active;
    return { success: true, active: map.active };
  },

  deleteMap: async (gameId, mapId) => {
    await delay(250);
    const g = MOCK_GAMES.find(g => g.id === gameId);
    if (!g) return { success: false };
    g.maps = (g.maps || []).filter(m => m.id !== mapId);
    return { success: true };
  },

  reorderMaps: async (gameId, orderedIds) => {
    await delay(200);
    const g = MOCK_GAMES.find(g => g.id === gameId);
    if (!g || !g.maps) return { success: false };
    const mapById = Object.fromEntries(g.maps.map(m => [m.id, m]));
    g.maps = orderedIds.map(id => mapById[id]).filter(Boolean);
    return { success: true };
  },

  updateCoverImage: async (gameId, base64DataUrl) => {
    await delay(200);
    const g = MOCK_GAMES.find(g => g.id === gameId);
    if (!g) return { success: false };
    g.coverImage = base64DataUrl;
    return { success: true };
  },

  removeCoverImage: async (gameId) => {
    await delay(150);
    const g = MOCK_GAMES.find(g => g.id === gameId);
    if (!g) return { success: false };
    g.coverImage = '';
    return { success: true };
  },
};

// Keep GAME_TEAM_SIZES in sync with gameApi for legacy compatibility
// Tournaments/leagues that still reference GAME_TEAM_SIZES will keep working
export function getGameNames() {
  return MOCK_GAMES.filter(g => g.active).map(g => g.name);
}

// ─────────────────────────────────────────────
//  TEAMS API
// ─────────────────────────────────────────────
// Mock in-memory store (replaced by DB in production)
let MOCK_TEAMS = [
  {
    id: 'team_001', name: 'Rapid City Reapers', game: 'League of Legends',
    captainId: 'user_001', captainName: 'Alex Rivera',
    members: [
      { id: 'user_001', name: 'Alex Rivera',   role: 'Top',    initials: 'AR', avatarColor: '#059669' },
      { id: 'user_002', name: 'Jordan Kim',    role: 'Jungle', initials: 'JK', avatarColor: '#1d4ed8' },
      { id: 'user_003', name: 'Sam Chen',      role: 'Mid',    initials: 'SC', avatarColor: '#7c3aed' },
      { id: 'user_004', name: 'Taylor Brooks', role: 'ADC',    initials: 'TB', avatarColor: '#dc2626' },
      { id: 'user_005', name: 'Morgan Lee',    role: 'Support',initials: 'ML', avatarColor: '#d97706' },
    ],
    maxSize: 5, wins: 3, losses: 1, createdAt: '2025-01-15',
    pendingInvites: [],
  },
  {
    id: 'team_002', name: 'Black Hills Blazers', game: 'Valorant',
    captainId: 'user_010', captainName: 'Casey Park',
    members: [
      { id: 'user_010', name: 'Casey Park',    role: 'Duelist',   initials: 'CP', avatarColor: '#1d4ed8' },
      { id: 'user_011', name: 'Devon Walsh',   role: 'Controller',initials: 'DW', avatarColor: '#059669' },
      { id: 'user_012', name: 'Riley Stone',   role: 'Sentinel',  initials: 'RS', avatarColor: '#dc2626' },
      { id: 'user_013', name: 'Quinn Adams',   role: 'Initiator', initials: 'QA', avatarColor: '#7c3aed' },
      { id: 'user_014', name: 'Avery Cruz',    role: 'Duelist',   initials: 'AC', avatarColor: '#d97706' },
    ],
    maxSize: 5, wins: 2, losses: 2, createdAt: '2025-01-20',
    pendingInvites: [],
  },
  {
    id: 'team_003', name: 'Sioux Falls Storm', game: 'Rocket League',
    captainId: 'user_020', captainName: 'Blake Torres',
    members: [
      { id: 'user_020', name: 'Blake Torres',  role: 'Striker',  initials: 'BT', avatarColor: '#059669' },
      { id: 'user_021', name: 'Drew Nguyen',   role: 'Defender', initials: 'DN', avatarColor: '#1d4ed8' },
      { id: 'user_022', name: 'Emery Hall',    role: 'Flex',     initials: 'EH', avatarColor: '#7c3aed' },
    ],
    maxSize: 3, wins: 4, losses: 0, createdAt: '2025-01-10',
    pendingInvites: [],
  },
];

export const teamsApi = {
  // GET /api/teams
  getAll: async () => { await delay(350); return [...MOCK_TEAMS]; },

  // GET /api/teams?game=xxx
  getByGame: async (game) => { await delay(300); return MOCK_TEAMS.filter(t => t.game === game); },

  // GET /api/teams/:id
  getById: async (id) => { await delay(200); return MOCK_TEAMS.find(t => t.id === id) || null; },

  // GET /api/teams?userId=xxx  (teams user belongs to)
  getMyTeams: async (userId) => {
    await delay(300);
    return MOCK_TEAMS.filter(t => t.members.some(m => m.id === userId));
  },

  // GET multiple teams by id array (for match roster display)
  getByIds: async (ids) => {
    await delay(200);
    return MOCK_TEAMS.filter(t => ids.includes(t.id));
  },

  // POST /api/teams
  create: async ({ name, game, captainId, captainName, captainInitials, captainColor }) => {
    await delay(500);
    const size = GAME_TEAM_SIZES[game]?.max || 5;
    const team = {
      id: `team_${Date.now()}`,
      name, game,
      captainId, captainName,
      members: [{ id: captainId, name: captainName, role: 'Captain', initials: captainInitials, avatarColor: captainColor }],
      maxSize: size, wins: 0, losses: 0,
      createdAt: new Date().toISOString().split('T')[0],
      pendingInvites: [],
    };
    MOCK_TEAMS.push(team);
    return { success: true, team };
  },

  // POST /api/teams/:id/invite
  invitePlayer: async (teamId, playerEmail) => {
    await delay(400);
    const team = MOCK_TEAMS.find(t => t.id === teamId);
    if (!team) return { success: false, error: 'Team not found' };
    if (team.members.length >= team.maxSize) return { success: false, error: 'Team is full' };
    team.pendingInvites = [...(team.pendingInvites || []), { email: playerEmail, sentAt: new Date().toISOString() }];
    return { success: true };
  },

  // POST /api/teams/:id/accept-invite
  acceptInvite: async (teamId, userId, userName, userInitials, userColor) => {
    await delay(400);
    const team = MOCK_TEAMS.find(t => t.id === teamId);
    if (!team) return { success: false, error: 'Team not found' };
    if (team.members.some(m => m.id === userId)) return { success: false, error: 'Already a member' };
    team.members.push({ id: userId, name: userName, role: 'Member', initials: userInitials, avatarColor: userColor });
    return { success: true };
  },

  // DELETE /api/teams/:id/members/:userId
  removeMember: async (teamId, userId) => {
    await delay(300);
    const team = MOCK_TEAMS.find(t => t.id === teamId);
    if (team) team.members = team.members.filter(m => m.id !== userId);
    return { success: true };
  },

  // DELETE /api/teams/:id
  delete: async (teamId) => {
    await delay(300);
    MOCK_TEAMS = MOCK_TEAMS.filter(t => t.id !== teamId);
    return { success: true };
  },
};

// ─────────────────────────────────────────────
//  TOURNAMENTS API
// ─────────────────────────────────────────────
let MOCK_TOURNAMENTS = [
  {
    id: 't1', name: 'Team Fight Tactics Open', game: 'Team Fight Tactics',
    format: 'single_elim', status: 'open', phase: 'registration',
    date: 'Mar 1, 2026', time: '5:00 PM CST', prize: '3,500 RP',
    description: 'Open to all skill levels. FFA style — top 4 advance each round.',
    memberOnly: false, maxTeams: 16, registeredTeams: ['team_solo_1','team_solo_2','team_solo_3'],
    minTeamSize: 1, maxTeamSize: 1,
    bracketData: null, matches: [],
    createdBy: 'user_admin',
  },
  {
    id: 't2', name: 'Spring Valorant Cup', game: 'Valorant',
    format: 'double_elim', status: 'open', phase: 'registration',
    date: 'Mar 15, 2026', time: '6:00 PM CST', prize: 'Cash + Merch',
    description: 'Double elimination Valorant tournament. Teams of 5.',
    memberOnly: false, maxTeams: 8, registeredTeams: ['team_001'],
    minTeamSize: 5, maxTeamSize: 5,
    bracketData: null, matches: [],
    createdBy: 'user_admin',
  },
  {
    id: 't3', name: 'Rocket League Doubles', game: 'Rocket League',
    format: 'round_robin', status: 'open', phase: 'registration',
    date: 'Mar 29, 2026', time: '4:00 PM CST', prize: 'Free Entry + Trophy',
    description: 'Round robin Rocket League. Teams of 2-3.',
    memberOnly: false, maxTeams: 8, registeredTeams: ['team_003'],
    minTeamSize: 2, maxTeamSize: 3,
    bracketData: null, matches: [],
    createdBy: 'user_admin',
  },
  {
    id: 't4', name: 'Summer LoL Championship', game: 'League of Legends',
    format: 'group_stage', status: 'active', phase: 'bracket',
    date: 'Feb 24, 2026', time: '5:00 PM CST', prize: '$500 + Trophy',
    description: 'Group stage feeding into single-elim playoffs. SD state qualifier.',
    memberOnly: true, maxTeams: 8, registeredTeams: ['team_001','team_rr1','team_rr2','team_rr3','team_rr4','team_rr5','team_rr6','team_rr7'],
    minTeamSize: 5, maxTeamSize: 5,
    bracketData: {
      rounds: [
        {
          round: 1, name: 'Quarterfinals',
          matches: [
            { id: 'm1', team1: { id:'team_001', name:'Rapid City Reapers'}, team2: { id:'team_rr1', name:'Pierre Phantoms'}, score1: 2, score2: 0, winner: 'team_001', status: 'complete', reportedBy: 'team_001', confirmedBy: 'team_rr1' },
            { id: 'm2', team1: { id:'team_rr2', name:'Sioux Falls Surge'}, team2: { id:'team_rr3', name:'Aberdeen Aces'}, score1: 1, score2: 2, winner: 'team_rr3', status: 'complete', reportedBy: 'team_rr2', confirmedBy: 'team_rr3' },
            { id: 'm3', team1: { id:'team_rr4', name:'Watertown Wolves'}, team2: { id:'team_rr5', name:'Huron Hawks'}, score1: 2, score2: 1, winner: 'team_rr4', status: 'complete', reportedBy: 'team_rr4', confirmedBy: 'team_rr5' },
            { id: 'm4', team1: { id:'team_rr6', name:'Mitchell Mavericks'}, team2: { id:'team_rr7', name:'Brookings Blitz'}, score1: null, score2: null, winner: null, status: 'pending', reportedBy: null, confirmedBy: null },
          ]
        },
        {
          round: 2, name: 'Semifinals',
          matches: [
            { id: 'm5', team1: { id:'team_001', name:'Rapid City Reapers'}, team2: { id:'team_rr3', name:'Aberdeen Aces'}, score1: null, score2: null, winner: null, status: 'pending', reportedBy: null, confirmedBy: null },
            { id: 'm6', team1: { id:'team_rr4', name:'Watertown Wolves'}, team2: null, score1: null, score2: null, winner: null, status: 'waiting', reportedBy: null, confirmedBy: null },
          ]
        },
        {
          round: 3, name: 'Grand Final',
          matches: [
            { id: 'm7', team1: null, team2: null, score1: null, score2: null, winner: null, status: 'waiting', reportedBy: null, confirmedBy: null },
          ]
        }
      ]
    },
    matches: [],
    createdBy: 'user_admin',
  },
];

// Score reporting pending confirmations
let PENDING_SCORE_REPORTS = [];

export const tournamentsApi = {
  getAll: async () => { await delay(400); return [...MOCK_TOURNAMENTS]; },
  getById: async (id) => { await delay(200); return MOCK_TOURNAMENTS.find(t => t.id === id) || null; },

  // POST /api/tournaments (admin only)
  create: async (data) => {
    await delay(500);
    const t = {
      id: `t_${Date.now()}`,
      ...data,
      status: 'open', phase: 'registration',
      registeredTeams: [],
      bracketData: null, matches: [],
      createdAt: new Date().toISOString(),
    };
    MOCK_TOURNAMENTS.push(t);
    return { success: true, tournament: t };
  },

  // PUT /api/tournaments/:id (admin only)
  update: async (id, updates) => {
    await delay(400);
    MOCK_TOURNAMENTS = MOCK_TOURNAMENTS.map(t => t.id === id ? { ...t, ...updates } : t);
    return { success: true };
  },

  // DELETE /api/tournaments/:id (admin only)
  delete: async (id) => {
    await delay(300);
    MOCK_TOURNAMENTS = MOCK_TOURNAMENTS.filter(t => t.id !== id);
    return { success: true };
  },

  // POST /api/tournaments/:id/register
  register: async (tournamentId, teamId) => {
    await delay(500);
    const t = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
    if (!t) return { success: false, error: 'Tournament not found' };
    if (t.registeredTeams.includes(teamId)) return { success: false, error: 'Already registered' };
    if (t.registeredTeams.length >= t.maxTeams) return { success: false, error: 'Tournament is full' };
    t.registeredTeams.push(teamId);
    return { success: true };
  },

  // POST /api/tournaments/:id/start  (admin only) — randomly seed bracket
  start: async (tournamentId) => {
    await delay(600);
    const t = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
    if (!t) return { success: false, error: 'Not found' };
    const teams = [...t.registeredTeams].sort(() => Math.random() - 0.5);
    t.phase = 'bracket';
    t.status = 'active';
    // Build first-round matches
    const matches = [];
    for (let i = 0; i < teams.length; i += 2) {
      if (teams[i + 1]) {
        matches.push({
          id: `m_${Date.now()}_${i}`,
          team1: { id: teams[i], name: teams[i] },
          team2: { id: teams[i+1], name: teams[i+1] },
          score1: null, score2: null, winner: null,
          status: 'pending', reportedBy: null, confirmedBy: null,
        });
      }
    }
    t.bracketData = { rounds: [{ round: 1, name: 'Round 1', matches }] };
    return { success: true, tournament: t };
  },

  // POST /api/tournaments/:id/matches/:matchId/report
  reportScore: async (tournamentId, matchId, reportingTeamId, score1, score2) => {
    await delay(400);
    PENDING_SCORE_REPORTS.push({
      id: `rep_${Date.now()}`,
      tournamentId, matchId, reportingTeamId,
      score1, score2,
      reportedAt: new Date().toISOString(),
      confirmed: false,
    });
    return { success: true, message: 'Score submitted. Waiting for opponent confirmation.' };
  },

  // POST /api/tournaments/:id/matches/:matchId/confirm
  confirmScore: async (tournamentId, matchId, confirmingTeamId) => {
    await delay(400);
    const t = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
    if (!t || !t.bracketData) return { success: false, error: 'Not found' };
    const report = PENDING_SCORE_REPORTS.find(r => r.matchId === matchId && !r.confirmed);
    if (!report) return { success: false, error: 'No pending report found' };
    report.confirmed = true;
    // Apply to match
    for (const round of t.bracketData.rounds) {
      const match = round.matches.find(m => m.id === matchId);
      if (match) {
        match.score1 = report.score1;
        match.score2 = report.score2;
        match.winner = report.score1 > report.score2 ? match.team1?.id : match.team2?.id;
        match.status = 'complete';
        match.reportedBy = report.reportingTeamId;
        match.confirmedBy = confirmingTeamId;
      }
    }
    return { success: true };
  },

  // GET /api/tournaments/:id/matches/:matchId/pending-report
  getPendingReport: async (tournamentId, matchId) => {
    await delay(200);
    return PENDING_SCORE_REPORTS.find(r => r.matchId === matchId && !r.confirmed) || null;
  },
};

// ─────────────────────────────────────────────
//  COACHES API
// ─────────────────────────────────────────────
// Live coach roster — starts with Zach, grows as head admin approves applications
let MOCK_COACHES = [
  {
    id: 'coach_zach', userId: null,
    name: 'Zach Walters', title: 'Head Coach & Founder',
    initials: 'ZW', accentColor: '#1d4ed8', experience: '20+ Years',
    location: 'Rapid City, SD',
    rating: 5.0, totalSessions: 200,
    bio: "Zach Walters is the founder of High Caliber Esports Academy and one of South Dakota's most experienced esports coaches. With over 20 years competing, coaching, and consulting in the esports industry, Zach brings unmatched strategic depth and a passion for developing the next generation of players.\n\nLast season, Zach coached the Sioux Falls Lincoln High School League of Legends team to a South Dakota State Championship. He continues to coach students across South Dakota through Fenworks and has consulted for multiple nonprofit youth organizations including the Pierre Area Boys & Girls Club and Sioux Falls Boys & Girls Clubs.\n\nZach's coaching philosophy centers on building not just game skills, but life skills — communication, resilience, and leadership that translate beyond the screen.",
    philosophy: "I believe every player has a ceiling they haven't reached yet. My job is to help you find it — through honest feedback, structured improvement, and a genuine investment in your growth.",
    games: [
      { id: 'lol',    label: 'League of Legends', icon: '⚔️', rank: 'Diamond II',    specialty: 'Mid Lane / Macro Play' },
      { id: 'val',    label: 'Valorant',           icon: '🎯', rank: 'Immortal',       specialty: 'IGL / Agent Composition' },
      { id: 'tft',    label: 'Team Fight Tactics', icon: '♟️', rank: 'Master',         specialty: 'Economy & Positioning' },
      { id: 'rl',     label: 'Rocket League',      icon: '🚀', rank: 'Diamond',        specialty: 'Rotations & Mechanics' },
      { id: 'smash',  label: 'Smash Bros.',        icon: '💥', rank: 'Tournament Vet', specialty: 'Neutral & Punish Game' },
      { id: 'fn',     label: 'Fortnite',           icon: '🏗️', rank: 'Competitive',   specialty: 'Zone Strategy & Building' },
      { id: 'rivals', label: 'Marvel Rivals',      icon: '🦸', rank: 'Top 500',        specialty: 'Team Comps & Ult Tracking' },
    ],
    accolades: [
      { icon: '🏆', text: 'SD State LoL Championship Coach — Sioux Falls Lincoln HS (2024)' },
      { icon: '🎓', text: 'Founder — High Caliber Esports Academy, LLC' },
      { icon: '🤝', text: 'Partner Coach — Pierre, Sioux Falls & Watertown Boys & Girls Clubs' },
      { icon: '📡', text: 'Active Coach — Fenworks Statewide Esports Network' },
      { icon: '⭐', text: '20+ years competing & coaching in professional esports' },
      { icon: '🎮', text: 'Consulted for 10+ K-12 and collegiate esports programs' },
    ],
    social: { twitter: 'https://twitter.com', twitch: 'https://twitch.tv' },
    availableDays: [1, 2, 3, 4, 5],
    availableHours: ['10:00 AM CST', '11:30 AM CST', '1:00 PM CST', '2:30 PM CST', '4:00 PM CST', '5:30 PM CST'],
    reviews: [
      { id: 'r1', author: 'Marcus T.', game: 'League of Legends', rating: 5, text: 'Zach completely changed how I think about macro play. Went from Silver II to Gold I in 3 weeks of sessions.', date: 'Jan 2025' },
      { id: 'r2', author: 'Jordan K.', game: 'Valorant', rating: 5, text: "Best coach I've ever had. He breaks down every decision and explains the why behind everything.", date: 'Feb 2025' },
      { id: 'r3', author: 'Sam R.',    game: 'TFT',      rating: 5, text: "Finally hit Masters after 2 months of sessions. Zach's economy knowledge is insane.", date: 'Jan 2025' },
    ],
    onRoster: true,
  },
];

export const coachesApi = {
  getAll: async () => {
    await delay(350);
    return MOCK_COACHES.filter(c => c.onRoster);
  },
  // Get ALL coaches including those not yet on roster (for admin use)
  getAllAdmin: async () => { await delay(200); return [...MOCK_COACHES]; },

  // Add approved coach application to the roster
  addToRoster: async (app) => {
    await delay(400);
    const existingIdx = MOCK_COACHES.findIndex(c => c.userId === app.userId);
    if (existingIdx > -1) {
      MOCK_COACHES[existingIdx].onRoster = true;
      return { success: true, coachId: MOCK_COACHES[existingIdx].id };
    }
    const GAME_ICONS_MAP = {
      'League of Legends':'⚔️', 'Valorant':'🎯', 'Team Fight Tactics':'♟️',
      'Rocket League':'🚀', 'Fortnite':'🏗️', 'Smash Bros.':'💥', 'Marvel Rivals':'🦸',
    };
    const GAME_ID_MAP = {
      'League of Legends':'lol','Valorant':'val','Team Fight Tactics':'tft',
      'Rocket League':'rl','Fortnite':'fn','Smash Bros.':'smash','Marvel Rivals':'rivals',
    };
    const newCoach = {
      id: `coach_${Date.now()}`,
      userId: app.userId,
      name: `${app.firstName} ${app.lastName}`,
      title: 'Coach',
      initials: `${(app.firstName||'?')[0]}${(app.lastName||'?')[0]}`.toUpperCase(),
      accentColor: '#059669',
      experience: `${app.yearsCoaching} years coaching`,
      location: app.location || 'South Dakota',
      rating: 5.0, totalSessions: 0,
      bio: app.experience || '',
      philosophy: app.philosophy || '',
      games: (app.primaryGames || []).map(g => ({
        id: GAME_ID_MAP[g] || g.toLowerCase().replace(/\s+/g,'-'),
        label: g, icon: GAME_ICONS_MAP[g] || '🎮',
        rank: (app.gameRanks || {})[g] || '',
        specialty: '',
      })),
      accolades: app.certifications ? [{ icon: '🎓', text: app.certifications }] : [],
      social: {},
      availableDays: app.availableDays || [1,2,3,4,5],
      availableHours: ['4:00 PM CST', '5:30 PM CST', '7:00 PM CST'],
      reviews: [],
      onRoster: true,
    };
    MOCK_COACHES.push(newCoach);
    return { success: true, coachId: newCoach.id };
  },

  // Remove coach from visible roster (doesn't delete them)
  removeFromRoster: async (coachId) => {
    await delay(300);
    const coach = MOCK_COACHES.find(c => c.id === coachId);
    if (coach) coach.onRoster = false;
    return { success: true };
  },

  getAvailability: async (coachId, year, month) => {
    await delay(300);
    const avail = {};
    const today = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const slots = ['10:00 AM CST', '11:30 AM CST', '1:00 PM CST', '2:30 PM CST', '4:00 PM CST', '5:30 PM CST'];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (!isPast && date.getDay() !== 0 && date.getDay() !== 6) {
        const available = slots.filter(() => Math.random() > 0.3);
        if (available.length > 0) avail[`${year}-${month}-${d}`] = available;
      }
    }
    return avail;
  },
  update: async (coachId, updates) => { await delay(400); return { success: true }; },
};

// ─────────────────────────────────────────────
//  SESSIONS API
// ─────────────────────────────────────────────
// Helper: build a date string like "Mar 5" from an ISO date
const fmtDate = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Shared mock session data — used by both player getAll and coach getAllCoach
// Pricing constants (single source of truth — must match BookingModal)
const HOURLY_NON_MEMBER = 60;
const HOURLY_MEMBER     = Math.round(60 * 0.85); // $51
const COACH_HOURLY      = 20; // fixed, not editable

const sessionPrice   = (hrs, isMember) => Math.round((isMember ? HOURLY_MEMBER : HOURLY_NON_MEMBER) * hrs);
const sessionEarning = (hrs) => Math.round(COACH_HOURLY * hrs);

const MOCK_SESSIONS_DATA = [
  // Completed sessions (members unless noted)
  { id:'s1', userId:'user_001', playerName:'Alex Rivera',  isMember:true,  game:'League of Legends', title:'Macro Play & Map Control',    coachId:'coach_zach', coach:'Zach Walters', duration:'1 hour',    hours:1,   isoDate:'2026-02-07', time:'4:00 PM CST', status:'completed' },
  { id:'s2', userId:'user_002', playerName:'Jordan Kim',   isMember:true,  game:'Valorant',          title:'Agent Comp & Utility',        coachId:'coach_zach', coach:'Zach Walters', duration:'1.5 hours', hours:1.5, isoDate:'2026-02-13', time:'3:00 PM CST', status:'completed' },
  { id:'s3', userId:'user_003', playerName:'Morgan Lee',   isMember:true,  game:'Rocket League',     title:'Aerial Mechanics Deep Dive',  coachId:'coach_zach', coach:'Zach Walters', duration:'1 hour',    hours:1,   isoDate:'2026-02-19', time:'5:00 PM CST', status:'completed' },
  // Upcoming sessions
  { id:'s4', userId:'user_001', playerName:'Alex Rivera',  isMember:true,  game:'League of Legends', title:'Mid Lane Fundamentals',       coachId:'coach_zach', coach:'Zach Walters', duration:'1 hour',    hours:1,   isoDate:'2026-03-05', time:'4:00 PM CST', status:'upcoming'  },
  { id:'s5', userId:'user_002', playerName:'Jordan Kim',   isMember:true,  game:'Valorant',          title:'Aim Training & Crosshair',    coachId:'coach_zach', coach:'Zach Walters', duration:'2 hours',   hours:2,   isoDate:'2026-03-12', time:'2:00 PM CST', status:'upcoming'  },
  { id:'s6', userId:'user_004', playerName:'Sam Torres',   isMember:false, game:'Fortnite',          title:'Box Fight Strategies',        coachId:'coach_zach', coach:'Zach Walters', duration:'1 hour',    hours:1,   isoDate:'2026-03-18', time:'6:00 PM CST', status:'upcoming'  },
  { id:'s7', userId:'user_003', playerName:'Morgan Lee',   isMember:true,  game:'Rocket League',     title:'Rotation & Positioning',      coachId:'coach_zach', coach:'Zach Walters', duration:'1.5 hours', hours:1.5, isoDate:'2026-03-25', time:'4:30 PM CST', status:'upcoming'  },
  { id:'s8', userId:'user_005', playerName:'Casey Park',   isMember:true,  game:'League of Legends', title:'Jungle Pathing & Objectives', coachId:'coach_zach', coach:'Zach Walters', duration:'1 hour',    hours:1,   isoDate:'2026-03-28', time:'5:00 PM CST', status:'upcoming'  },
].map(s => ({
  ...s,
  date:          fmtDate(s.isoDate),
  price:         sessionPrice(s.hours, s.isMember),
  coachEarning:  sessionEarning(s.hours),
}));

let MOCK_SESSIONS_LIVE = [...MOCK_SESSIONS_DATA];

export const sessionsApi = {
  // Player view: sessions booked by this user
  getAll: async (userId) => {
    await delay(400);
    return MOCK_SESSIONS_LIVE
      .filter(s => !userId || s.userId === userId || userId === 'user_001')
      .map(s => ({ ...s }));
  },

  // Coach view: all sessions this coach is running
  getAllCoach: async (coachId) => {
    await delay(400);
    return MOCK_SESSIONS_LIVE
      .filter(s => !coachId || s.coachId === coachId)
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  },

  getAvailability: async (year, month) => coachesApi.getAvailability('coach_zach', year, month),

  book: async (data) => {
    await delay(400);
    const iso = data.isoDate || new Date().toISOString().split('T')[0];
    const newSession = {
      id: `s_${Date.now()}`,
      ...data,
      isoDate: iso,
      date: fmtDate(iso),
      status: 'upcoming',
      coachId: 'coach_zach',
      coach: 'Zach Walters',
    };
    MOCK_SESSIONS_LIVE.push(newSession);
    return { success: true, session: newSession };
  },

  cancel: async (sessionId) => {
    await delay(300);
    MOCK_SESSIONS_LIVE = MOCK_SESSIONS_LIVE.filter(s => s.id !== sessionId);
    return { success: true };
  },

  // Admin: all sessions
  getAllAdmin: async () => {
    await delay(500);
    return [...MOCK_SESSIONS_LIVE];
  },
};

// ─────────────────────────────────────────────
//  SCHOLARSHIPS API
// ─────────────────────────────────────────────
let MOCK_APPLICATIONS = [
  { id: 'app_001', scholarshipId: 'sch2', userId: 'user_001', playerName: 'Alex Rivera', school: 'Rapid City Stevens HS', status: 'pending', submittedAt: '2025-02-15', essayExcerpt: 'I believe esports has shaped my leadership...' },
  { id: 'app_002', scholarshipId: 'sch1', userId: 'user_010', playerName: 'Casey Park',  school: 'Aberdeen Central HS',   status: 'approved', submittedAt: '2025-02-01', essayExcerpt: 'As a Native American student, I...' },
];

export const scholarshipsApi = {
  getAll: async () => {
    await delay(300);
    return [
      { id: 'sch1', tag: 'Native American Students', name: 'Terrance C. Walters Memorial Scholarship Fund', amount: '$1,000', amountNote: 'Growing to $5,000 · Awarded to 5 students', deadline: 'May 1, 2026', featured: false, description: "For Native American students who have excelled academically and in their school's esports program.", requirements: ['Active HCEA membership', 'Demonstrated academic excellence', 'Reference letter from school esports head coach'] },
      { id: 'sch2', tag: 'Leadership Excellence', name: 'Higher Caliber Scholarship Fund', amount: '$10,000', amountNote: 'Single award · Annual', deadline: 'May 1, 2026', featured: true, description: 'Awarded to one student demonstrating exceptional leadership in school and community.', requirements: ['Active HCEA membership', 'Exceptional school & community leadership', 'Reference from head coach or program manager', 'Reference from a community leader'] },
    ];
  },
  apply: async (scholarshipId, userId, formData) => {
    await delay(700);
    const app = { id: `app_${Date.now()}`, scholarshipId, userId, ...formData, status: 'pending', submittedAt: new Date().toISOString().split('T')[0] };
    MOCK_APPLICATIONS.push(app);
    return { success: true, applicationId: app.id };
  },
  getMyApplications: async (userId) => {
    await delay(300);
    return MOCK_APPLICATIONS.filter(a => a.userId === userId);
  },
  // Admin
  getAllApplications: async () => { await delay(400); return [...MOCK_APPLICATIONS]; },
  updateApplicationStatus: async (appId, status) => {
    await delay(300);
    MOCK_APPLICATIONS = MOCK_APPLICATIONS.map(a => a.id === appId ? { ...a, status } : a);
    return { success: true };
  },
};


// ═══════════════════════════════════════════════════════════════════
//  COACH APPLICATION API
// ═══════════════════════════════════════════════════════════════════

let MOCK_COACH_APPLICATIONS = [
  {
    id: 'ca_001',
    userId: 'user_002',
    status: 'pending', // pending | under_review | approved | rejected
    submittedAt: Date.now() - 172800000,
    updatedAt:   Date.now() - 172800000,
    reviewedBy:  null,
    reviewNote:  null,
    // Step 1 — Personal Info
    firstName: 'Jordan', lastName: 'Kim',
    email: 'jordan@email.com', phone: '605-555-0101',
    location: 'Sioux Falls, SD',
    // Step 2 — Coaching Background
    yearsPlaying: '5-7',
    yearsCoaching: '1-2',
    competitiveLevel: 'Semi-professional',
    primaryGames: ['League of Legends', 'Valorant'],
    gameRanks: { 'League of Legends': 'Platinum I', 'Valorant': 'Diamond 2' },
    // Step 3 — Coaching Philosophy
    philosophy: 'I believe in a structured, data-driven approach to improvement. Every player has unique strengths and I aim to build on those while addressing weaknesses methodically.',
    coachingStyle: 'Analytical — I focus on VOD review, data analysis, and building solid mental frameworks.',
    targetAgeGroups: ['13-15', '16-18'],
    // Step 4 — Experience & References
    experience: 'Coached my high school esports team for 2 seasons, helping them qualify for state. Also ran a local Valorant coaching program for 8 players.',
    references: [
      { name: 'Coach Mike Hanson', role: 'HS Esports Director', contact: 'mhanson@sfschools.com' },
    ],
    certifications: '',
    // Step 5 — Availability & Rate
    availableDays: [1,2,3,4,5],
    preferredHours: 'Afternoons and evenings (3PM–9PM CST)',
    proposedMemberRate: 35,
    proposedNonMemberRate: 50,
    // Step 6 — Statement & Agreement
    personalStatement: "I want to give back to the esports community that shaped me. HCEA's mission aligns perfectly with my goals to develop not just better players, but better people.",
    agreedToTerms: true,
    backgroundCheckConsent: true,
  },
  {
    id: 'ca_002',
    userId: 'user_003',
    status: 'under_review',
    submittedAt: Date.now() - 432000000,
    updatedAt:   Date.now() - 86400000,
    reviewedBy:  'user_head_admin',
    reviewNote:  'Strong candidate. Verifying game ranks and contacting references.',
    firstName: 'Taylor', lastName: 'Nguyen',
    email: 'taylor@email.com', phone: '605-555-0202',
    location: 'Aberdeen, SD',
    yearsPlaying: '7+',
    yearsCoaching: '3-5',
    competitiveLevel: 'Professional',
    primaryGames: ['Rocket League', 'Fortnite'],
    gameRanks: { 'Rocket League': 'Champion III', 'Fortnite': 'Top 500 PR' },
    philosophy: 'Mental resilience is the most undercoached skill in esports. I combine gameplay fundamentals with mindset coaching to create complete competitors.',
    coachingStyle: 'Holistic — gameplay mechanics + mental performance coaching.',
    targetAgeGroups: ['16-18', '18+'],
    experience: 'Coached collegiate Rocket League team for 3 seasons. Reached RLCS regional qualifiers twice.',
    references: [
      { name: 'Dr. Sarah Lee', role: 'University Esports Coordinator', contact: 'slee@univ.edu' },
      { name: 'Marcus Webb', role: 'Former Player / Now Pro', contact: '@mwebb_rl' },
    ],
    certifications: 'NACE Certified Esports Competitor & Coach (2023)',
    availableDays: [1,3,5,6],
    preferredHours: 'Evenings and weekends',
    proposedMemberRate: 40,
    // Rates are set by HCG platform: $60/hr non-member, $51/hr member, coach earns $20/hr
    personalStatement: "Esports gave me a path when I had none. I want to be that path for the next generation.",
    agreedToTerms: true,
    backgroundCheckConsent: true,
  },
];

export const coachAppApi = {

  // Player submits an application
  submit: async (userId, formData) => {
    await delay(600);
    // Check for existing pending/under_review application
    const existing = MOCK_COACH_APPLICATIONS.find(
      a => a.userId === userId && ['pending','under_review'].includes(a.status)
    );
    if (existing) return { success: false, error: 'You already have an active application in progress.' };
    const app = {
      id: `ca_${Date.now()}`,
      userId,
      status: 'pending',
      submittedAt: Date.now(),
      updatedAt: Date.now(),
      reviewedBy: null,
      reviewNote: null,
      ...formData,
    };
    MOCK_COACH_APPLICATIONS.push(app);
    return { success: true, applicationId: app.id };
  },

  // Get application for a specific user
  getMyApplication: async (userId) => {
    await delay(300);
    return MOCK_COACH_APPLICATIONS
      .filter(a => a.userId === userId)
      .sort((a, b) => b.submittedAt - a.submittedAt)[0] || null;
  },

  // Head admin: get all applications with optional status filter
  getAll: async (status) => {
    await delay(400);
    let apps = [...MOCK_COACH_APPLICATIONS];
    if (status) apps = apps.filter(a => a.status === status);
    return apps.sort((a, b) => b.submittedAt - a.submittedAt);
  },

  // Head admin: update application status + note
  updateStatus: async (appId, status, reviewNote, reviewerId) => {
    await delay(350);
    const app = MOCK_COACH_APPLICATIONS.find(a => a.id === appId);
    if (!app) return { success: false };
    app.status     = status;
    app.reviewNote = reviewNote || app.reviewNote;
    app.reviewedBy = reviewerId;
    app.updatedAt  = Date.now();
    return { success: true };
  },

  // Head admin: get summary counts
  getSummary: async () => {
    await delay(200);
    const counts = { pending:0, under_review:0, approved:0, rejected:0, total:0 };
    MOCK_COACH_APPLICATIONS.forEach(a => {
      counts[a.status] = (counts[a.status] || 0) + 1;
      counts.total++;
    });
    return counts;
  },
};

// ─────────────────────────────────────────────
//  ACTIVITY API
// ─────────────────────────────────────────────
export const activityApi = {
  getRecent: async (userId) => {
    await delay(300);
    return [
      { id: 'a1', type: 'tournament',  text: 'Registered for TFT Tournament',                    time: '2 hours ago',  dot: 'green' },
      { id: 'a2', type: 'session',     text: 'Completed Coaching Session — League of Legends',    time: 'Feb 20, 2025', dot: 'blue'  },
      { id: 'a3', type: 'scholarship', text: 'Submitted Higher Caliber Scholarship application',  time: 'Feb 15, 2025', dot: 'gold'  },
      { id: 'a4', type: 'team',        text: 'Created team: Rapid City Reapers',                  time: 'Jan 15, 2025', dot: 'green' },
    ];
  },
};

// ─────────────────────────────────────────────
//  CONTACT API
// ─────────────────────────────────────────────
export const contactApi = {
  send: async (formData) => { await delay(600); return { success: true }; },
};

// ─────────────────────────────────────────────
//  ADMIN: USERS API
// ─────────────────────────────────────────────
export const adminApi = {
  getPlayers: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { console.warn('getPlayers: no session'); return []; }
    const url = 'https://yelicgqkqerpmmifhewn.supabase.co/rest/v1/profiles?select=id,first_name,last_name,email,school,grade,role,created_at&order=created_at.desc';
    const res = await fetch(url, {
      headers: {
        'apikey': 'sb_publishable_8brgEBU1zPSCdl6oVXu6Bg_IHMHwShi',
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) { console.error('getPlayers error:', res.status, await res.text()); return []; }
    const data = await res.json();
    return (data || []).map(p => ({
      id:               p.id,
      name:             ((p.first_name || '') + ' ' + (p.last_name || '')).trim() || p.email,
      email:            p.email,
      school:           p.school || '',
      grade:            p.grade  || '',
      role:             p.role ? p.role.toLowerCase() : 'player',
      membershipActive: false,
      joinedAt:         p.created_at ? p.created_at.slice(0, 10) : '',
    }));
  },

  updatePlayer: async (userId, updates) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { success: false, error: 'Not authenticated' };
    const url = 'https://yelicgqkqerpmmifhewn.supabase.co/rest/v1/profiles?id=eq.' + userId;
    const res = await fetch(url, { method: 'PATCH', headers: { 'apikey': 'sb_publishable_8brgEBU1zPSCdl6oVXu6Bg_IHMHwShi', 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(updates) });
    return res.ok ? { success: true } : { success: false, error: await res.text() };
  },

  deletePlayer: async (userId) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { success: false, error: 'Not authenticated' };
    const url = 'https://yelicgqkqerpmmifhewn.supabase.co/rest/v1/profiles?id=eq.' + userId;
    const res = await fetch(url, { method: 'DELETE', headers: { 'apikey': 'sb_publishable_8brgEBU1zPSCdl6oVXu6Bg_IHMHwShi', 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } });
    return res.ok ? { success: true } : { success: false, error: await res.text() };
  },

  setPlayerRole: async (userId, role) => {
    const valid = ['player', 'coach', 'org_manager', 'league_admin', 'head_admin'];
    const dbRole = role.toLowerCase();
    if (!valid.includes(dbRole)) return { success: false, error: 'Invalid role.' };
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { success: false, error: 'Not authenticated' };
    const url = 'https://yelicgqkqerpmmifhewn.supabase.co/rest/v1/profiles?id=eq.' + userId;
    const res = await fetch(url, { method: 'PATCH', headers: { 'apikey': 'sb_publishable_8brgEBU1zPSCdl6oVXu6Bg_IHMHwShi', 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ role: dbRole }) });
    return res.ok ? { success: true } : { success: false, error: await res.text() };
  },
};


