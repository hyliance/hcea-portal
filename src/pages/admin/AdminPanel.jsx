import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { tournamentsApi, scholarshipsApi, adminApi, coachesApi, matchFlagApi, gameApi, BRACKET_FORMATS, GAME_TEAM_SIZES } from '../../api';
import AdminOrgs from './AdminOrgs';
import AdminLeagues from './AdminLeagues';
import AdminCoachApps from './AdminCoachApps';
import { Spinner, Badge } from '../../components/UI';
import styles from './AdminPanel.module.css';

const GAMES = Object.keys(GAME_TEAM_SIZES);
const STATUS_COLORS = { pending: 'gold', approved: 'green', rejected: 'red' };

// ── CREATE TOURNAMENT FORM ────────────────────────────────────────
function CreateTournamentForm({ onCreated }) {
  const empty = { name:'', game:'', format:'single_elim', date:'', time:'', prize:'', description:'', maxTeams:8, memberOnly:false, minTeamSize:1, maxTeamSize:5 };
  const [form, setForm]       = useState(empty);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleGameChange = (game) => {
    const sizes = GAME_TEAM_SIZES[game] || { min:1, max:5 };
    setForm(p => ({ ...p, game, minTeamSize: sizes.min, maxTeamSize: sizes.max }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.game || !form.date) return alert('Name, game, and date are required.');
    setLoading(true);
    const res = await tournamentsApi.create({ ...form, createdBy: 'user_admin' });
    setLoading(false);
    if (res.success) { setSuccess(true); setForm(empty); onCreated && onCreated(res.tournament); setTimeout(() => setSuccess(false), 3000); }
  };

  return (
    <div className={styles.formCard}>
      <div className={styles.formTitle}>Create New Tournament</div>
      {success && <div className={styles.successBox}>✓ Tournament created successfully!</div>}

      <div className={styles.formGrid}>
        <div className={styles.fg}>
          <label>Tournament Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Spring Valorant Cup" />
        </div>
        <div className={styles.fg}>
          <label>Game *</label>
          <select value={form.game} onChange={e => handleGameChange(e.target.value)}>
            <option value="">Select game...</option>
            {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className={styles.fg}>
          <label>Bracket Format *</label>
          <select value={form.format} onChange={e => set('format', e.target.value)}>
            {BRACKET_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          {form.format && <div className={styles.formatDesc}>{BRACKET_FORMATS.find(f => f.id === form.format)?.desc}</div>}
        </div>
        <div className={styles.fg}>
          <label>Max Teams</label>
          <select value={form.maxTeams} onChange={e => set('maxTeams', parseInt(e.target.value))}>
            {[4,8,16,32,64].map(n => <option key={n} value={n}>{n} teams</option>)}
          </select>
        </div>
        <div className={styles.fg}>
          <label>Date *</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div className={styles.fg}>
          <label>Time</label>
          <input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
        </div>
        <div className={styles.fg}>
          <label>Prize Pool</label>
          <input value={form.prize} onChange={e => set('prize', e.target.value)} placeholder="$500 + Trophy" />
        </div>
        <div className={styles.fg}>
          <label>Team Size</label>
          <div className={styles.sizeNote}>
            {form.game ? `${GAME_TEAM_SIZES[form.game]?.label} (auto-set from game)` : 'Select a game first'}
          </div>
        </div>
        <div className={`${styles.fg} ${styles.fgFull}`}>
          <label>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Tournament details, rules, format notes..." />
        </div>
        <div className={styles.checkRow}>
          <input type="checkbox" id="memberOnly" checked={form.memberOnly} onChange={e => set('memberOnly', e.target.checked)} />
          <label htmlFor="memberOnly">Members only tournament</label>
        </div>
      </div>

      <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.75rem 2.5rem' }} onClick={handleSubmit} disabled={loading}>
        {loading ? 'Creating...' : 'Create Tournament →'}
      </button>
    </div>
  );
}

// ── SCHOLARSHIP APPLICATIONS ──────────────────────────────────────
function ScholarshipApplications() {
  const [apps, setApps]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    scholarshipsApi.getAllApplications().then(d => { setApps(d); setLoading(false); });
  }, []);

  const updateStatus = async (id, status) => {
    await scholarshipsApi.updateApplicationStatus(id, status);
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  if (loading) return <Spinner />;
  return (
    <div className={styles.appList}>
      {apps.length === 0 && <div className={styles.empty}>No applications yet.</div>}
      {apps.map(app => (
        <div key={app.id} className={styles.appCard}>
          <div className={styles.appHead}>
            <div>
              <div className={styles.appName}>{app.playerName}</div>
              <div className={styles.appSchool}>{app.school}</div>
              <div className={styles.appScholarship}>{app.scholarshipId === 'sch1' ? 'Terrance C. Walters Memorial' : 'Higher Caliber Scholarship'}</div>
            </div>
            <div className={styles.appRight}>
              <Badge variant={STATUS_COLORS[app.status] || 'blue'}>{app.status}</Badge>
              <div className={styles.appDate}>Submitted {app.submittedAt}</div>
            </div>
          </div>
          <p className={styles.appExcerpt}>"{app.essayExcerpt}..."</p>
          {app.status === 'pending' && (
            <div className={styles.appActions}>
              <button className={styles.approveBtn} onClick={() => updateStatus(app.id, 'approved')}>✓ Approve</button>
              <button className={styles.rejectBtn} onClick={() => updateStatus(app.id, 'rejected')}>✕ Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── PLAYERS MANAGEMENT ────────────────────────────────────────────

const ROLE_CFG = {
  head_admin:   { label: 'Head Admin',   color: '#dc2626', bg: 'rgba(220,38,38,0.12)',  icon: '👑' },
  league_admin: { label: 'League Admin', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', icon: '🏆' },
  coach:        { label: 'Coach',        color: '#059669', bg: 'rgba(5,150,105,0.12)',  icon: '🎓' },
  org_manager:  { label: 'Org Manager',  color: '#d97706', bg: 'rgba(217,119,6,0.12)',  icon: '🏢' },
  player:       { label: 'Player',       color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: '🎮' },
};
const ROLE_RANK   = { head_admin: 5, league_admin: 4, coach: 3, org_manager: 2, player: 1 };
const ASSIGNABLE  = ['head_admin', 'league_admin', 'org_manager'];

function getPrimary(roles) {
  return [...roles].sort((a, b) => (ROLE_RANK[b] || 0) - (ROLE_RANK[a] || 0))[0] || 'player';
}

function RoleBadge({ role, onRemove, canRemove }) {
  const cfg = ROLE_CFG[role] || ROLE_CFG.player;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
      letterSpacing: '0.03em', color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}33`, whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {cfg.label}
      {canRemove && role !== 'player' && (
        <button onClick={onRemove} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: cfg.color, padding: '0 0 0 2px', fontSize: '0.72rem', lineHeight: 1, opacity: 0.7,
        }}>✕</button>
      )}
    </span>
  );
}

function AddRoleDropdown({ currentRoles, onAdd }) {
  const [open, setOpen] = useState(false);
  const available = ASSIGNABLE.filter(r => !currentRoles.includes(r));
  if (available.length === 0) return null;
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: 'rgba(59,130,246,0.08)', border: '1px dashed rgba(59,130,246,0.35)',
        color: '#3b82f6', borderRadius: 999, padding: '2px 8px',
        fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
      }}>+ Role</button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 200,
          background: '#0d1b2e', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: 4, minWidth: 150,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {available.map(role => {
            const cfg = ROLE_CFG[role];
            return (
              <button key={role} onClick={() => { onAdd(role); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  background: 'none', border: 'none', color: cfg.color,
                  padding: '6px 10px', borderRadius: 6, fontSize: '0.8rem',
                  fontWeight: 700, cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = cfg.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayersManagement() {
  const [players, setPlayers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selected, setSelected]   = useState(null);
  const [pendingId, setPendingId] = useState(null);

  const load = () => {
    adminApi.getPlayers().then(d => {
      const sorted = [...d].sort((a, b) => {
        const ra = ROLE_RANK[getPrimary(a.roles || [a.role])] || 0;
        const rb = ROLE_RANK[getPrimary(b.roles || [b.role])] || 0;
        if (rb !== ra) return rb - ra;
        return (a.name || '').localeCompare(b.name || '');
      });
      setPlayers(sorted);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  const toggleMembership = async (p) => {
    await adminApi.updatePlayer(p.id, { membershipActive: !p.membershipActive });
    setPlayers(prev => prev.map(pl => pl.id === p.id ? { ...pl, membershipActive: !pl.membershipActive } : pl));
    if (selected?.id === p.id) setSelected(prev => ({ ...prev, membershipActive: !prev.membershipActive }));
  };

  const handleAddRole = async (userId, role) => {
    const player = players.find(p => p.id === userId);
    if (!player) return;
    setPendingId(userId);

    // 1. Update the role in profiles
    const res = await adminApi.addRole(userId, role, player.roles || [player.role]);
    if (!res.success) {
      alert('Failed to add role: ' + res.error);
      setPendingId(null);
      return;
    }

    // 2. If the coach role was assigned, auto-create a coaches row
    if (role === 'coach') {
      const nameParts = (player.name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName  = nameParts.slice(1).join(' ') || '';
      const coachRes  = await coachesApi.addToRoster({
        userId:        userId,
        firstName:     firstName,
        lastName:      lastName,
        yearsCoaching: '',
        location:      player.school || '',
        experience:    '',
        philosophy:    '',
        availableDays: [1, 2, 3, 4, 5],
      });
      // Link profile.coach_id back to the new coaches row
      if (coachRes.success) {
        await adminApi.updatePlayer(userId, { coach_id: coachRes.coachId });
      }
    }

    setPlayers(prev => prev.map(p => p.id === userId ? { ...p, roles: res.roles, role: getPrimary(res.roles) } : p));
    if (selected?.id === userId) setSelected(prev => ({ ...prev, roles: res.roles, role: getPrimary(res.roles) }));
    setPendingId(null);
  };

  const handleRemoveRole = async (userId, role) => {
    const player = players.find(p => p.id === userId);
    if (!player) return;
    if (!window.confirm(`Remove ${ROLE_CFG[role]?.label} from ${player.name}?`)) return;
    setPendingId(userId);

    // 1. Update the role in profiles
    const res = await adminApi.removeRole(userId, role, player.roles || [player.role]);
    if (!res.success) {
      alert('Failed to remove role: ' + res.error);
      setPendingId(null);
      return;
    }

    // 2. If coach role was removed, take them off the roster (keeps their data, just hides them)
    if (role === 'coach') {
      const coachList = await coachesApi.getAllAdmin();
      const coachRow  = coachList.find(c => c.userId === userId);
      if (coachRow) await coachesApi.removeFromRoster(coachRow.id);
      await adminApi.updatePlayer(userId, { coach_id: null });
    }

    setPlayers(prev => prev.map(p => p.id === userId ? { ...p, roles: res.roles, role: getPrimary(res.roles) } : p));
    if (selected?.id === userId) setSelected(prev => ({ ...prev, roles: res.roles, role: getPrimary(res.roles) }));
    setPendingId(null);
  };

  const elevatedPlayers = players.filter(p => (p.roles || [p.role]).some(r => r !== 'player'));

  const filtered = players.filter(p => {
    const matchSearch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.school || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || (p.roles || [p.role]).includes(filterRole);
    return matchSearch && matchRole;
  });

  if (loading) return <Spinner />;

  return (
    <div className={styles.playersWrap}>

      {/* ── Elevated Roles Roster ── */}
      <div className={styles.leagueAdminRoster}>
        <div className={styles.leagueAdminRosterHead}>
          <span className={styles.leagueAdminRosterTitle}>⚙️ Elevated Role Roster</span>
          <span className={styles.leagueAdminCount}>{elevatedPlayers.length} users with elevated roles</span>
        </div>
        {elevatedPlayers.length === 0 ? (
          <div className={styles.leagueAdminEmpty}>No elevated roles assigned yet. Search for a player below to grant access.</div>
        ) : (
          <div className={styles.leagueAdminList}>
            {elevatedPlayers.map(p => {
              const userRoles = (p.roles || [p.role]).filter(r => r !== 'player');
              const primary = getPrimary(p.roles || [p.role]);
              return (
                <div key={p.id} className={styles.leagueAdminRow}>
                  <div className={styles.leagueAdminAvatar}
                    style={{ background: ROLE_CFG[primary]?.color + '22', color: ROLE_CFG[primary]?.color }}>
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className={styles.leagueAdminInfo}>
                    <div className={styles.leagueAdminName}>{p.name}</div>
                    <div className={styles.leagueAdminEmail}>{p.email}</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {userRoles.map(role => (
                        <RoleBadge
                          key={role} role={role} canRemove={pendingId !== p.id}
                          onRemove={() => handleRemoveRole(p.id, role)}
                        />
                      ))}
                      {pendingId !== p.id && (
                        <AddRoleDropdown
                          currentRoles={p.roles || [p.role]}
                          onAdd={role => handleAddRole(p.id, role)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Search + Role Filter ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div className={styles.playerSearchWrap} style={{ flex: 1 }}>
          <span className={styles.playerSearchIcon}>🔍</span>
          <input
            className={styles.playerSearch}
            placeholder="Search players by name, email, or school..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }}
          />
          {search && <button className={styles.playerSearchClear} onClick={() => { setSearch(''); setSelected(null); }}>✕</button>}
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{
            padding: '8px 12px', background: '#0d1b2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, color: '#e8f0ff', fontSize: '0.85rem',
          }}
        >
          <option value="all">All Roles</option>
          {Object.entries(ROLE_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {/* ── Player List + Detail Panel ── */}
      <div className={styles.playerLayout}>

        {/* Table */}
        <div className={styles.playerTable}>
          <div className={styles.tableHead}>
            <span>Player</span><span>School</span><span>Roles</span><span>Membership</span>
          </div>
          {filtered.length === 0 && (
            <div className={styles.playerEmpty}>No players match "{search}"</div>
          )}
          {filtered.map(p => {
            const userRoles = p.roles || [p.role];
            const primary = getPrimary(userRoles);
            const isPending = pendingId === p.id;
            return (
              <div
                key={p.id}
                className={`${styles.tableRow} ${selected?.id === p.id ? styles.tableRowSelected : ''}`}
                onClick={() => setSelected(p)}
                style={{ opacity: isPending ? 0.5 : 1 }}
              >
                <div className={styles.playerNameCell}>
                  <div className={styles.playerInitials}
                    style={{ background: ROLE_CFG[primary]?.color + '22', color: ROLE_CFG[primary]?.color }}>
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className={styles.playerName}>{p.name}</div>
                    <div className={styles.playerEmail}>{p.email}</div>
                  </div>
                </div>
                <span>{p.school || '—'}</span>
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {userRoles
                    .sort((a, b) => (ROLE_RANK[b] || 0) - (ROLE_RANK[a] || 0))
                    .map(role => <RoleBadge key={role} role={role} canRemove={false} />)
                  }
                </span>
                <span>
                  <Badge variant={p.membershipActive ? 'green' : 'red'}>{p.membershipActive ? 'Active' : 'Inactive'}</Badge>
                </span>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (() => {
          const userRoles = selected.roles || [selected.role];
          const isPending = pendingId === selected.id;
          const nonPlayerRoles = userRoles.filter(r => r !== 'player');
          const primary = getPrimary(userRoles);
          return (
            <div className={styles.playerDetail}>
              <div className={styles.playerDetailHeader}>
                <div className={styles.playerDetailAvatar}
                  style={{ background: ROLE_CFG[primary]?.color + '22', color: ROLE_CFG[primary]?.color }}>
                  {selected.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className={styles.playerDetailName}>{selected.name}</div>
                  <div className={styles.playerDetailEmail}>{selected.email}</div>
                </div>
                <button className={styles.playerDetailClose} onClick={() => setSelected(null)}>✕</button>
              </div>

              <div className={styles.playerDetailBody}>
                <div className={styles.playerDetailRow}><span>School</span><span>{selected.school || '—'}</span></div>
                <div className={styles.playerDetailRow}><span>Joined</span><span>{selected.joinedAt}</span></div>
                <div className={styles.playerDetailRow}>
                  <span>Membership</span>
                  <Badge variant={selected.membershipActive ? 'green' : 'red'}>
                    {selected.membershipActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className={styles.playerDetailRow}>
                  <span>Roles</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                    {userRoles
                      .sort((a, b) => (ROLE_RANK[b] || 0) - (ROLE_RANK[a] || 0))
                      .map(role => (
                        <RoleBadge
                          key={role} role={role}
                          canRemove={!isPending}
                          onRemove={() => handleRemoveRole(selected.id, role)}
                        />
                      ))
                    }
                    {!isPending && (
                      <AddRoleDropdown
                        currentRoles={userRoles}
                        onAdd={role => handleAddRole(selected.id, role)}
                      />
                    )}
                    {isPending && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>Saving...</span>}
                  </div>
                </div>
              </div>

              <div className={styles.playerDetailActions}>
                <button className={styles.actionBtn} onClick={() => toggleMembership(selected)}>
                  {selected.membershipActive ? 'Deactivate Membership' : 'Activate Membership'}
                </button>

                <div className={styles.roleSection}>
                  <div className={styles.roleSectionTitle}>Role Management</div>
                  {nonPlayerRoles.length === 0 ? (
                    <div className={styles.rolePromote}>
                      <p className={styles.rolePromoteDesc}>
                        This player has no elevated roles. Use the "+ Role" button above to grant access.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {nonPlayerRoles
                        .sort((a, b) => (ROLE_RANK[b] || 0) - (ROLE_RANK[a] || 0))
                        .map(role => {
                          const cfg = ROLE_CFG[role];
                          const desc = {
                            head_admin:   'Full platform access including all league admin permissions.',
                            league_admin: 'Can manage leagues, tournaments, ladders, and social moderation.',
                            coach:        'Can edit their coach profile and manage their schedule.',
                            org_manager:  'Can manage HCEA youth organization players and teams.',
                          }[role] || '';
                          return (
                            <div key={role} className={styles.roleGranted}>
                              <div className={styles.roleGrantedInfo}>
                                <RoleBadge role={role} canRemove={false} />
                                <span className={styles.roleGrantedDesc}>{desc}</span>
                              </div>
                              <button
                                className={styles.revokeBtn}
                                disabled={isPending}
                                onClick={() => handleRemoveRole(selected.id, role)}
                              >
                                {isPending ? '...' : `✕ Revoke ${cfg.label}`}
                              </button>
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function CoachesManagement() {
  const [coaches, setCoaches]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toggling, setToggling] = useState(null);

  const load = () => {
    coachesApi.getAllAdmin().then(d => { setCoaches(d); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (coach) => {
    setToggling(coach.id);
    if (coach.onRoster) {
      await coachesApi.removeFromRoster(coach.id);
    } else {
      await coachesApi.addToRoster(coach);
    }
    load();
    setToggling(null);
  };

  if (loading) return <Spinner />;

  const active  = coaches.filter(c => c.onRoster);
  const hidden  = coaches.filter(c => !c.onRoster);

  return (
    <div>
      <div className={styles.rosterMeta}>
        {active.length} active · {hidden.length} hidden
      </div>

      <div className={styles.coachList}>
        {coaches.map(c => (
          <div key={c.id} className={`${styles.coachRow} ${!c.onRoster ? styles.coachRowHidden : ''}`}>
            <div className={styles.coachAvatar} style={{ background: c.onRoster ? c.accentColor : '#374151' }}>
              {c.initials}
            </div>
            <div className={styles.coachInfo}>
              <div className={styles.coachName}>
                {c.name}
                {!c.onRoster && <span className={styles.hiddenBadge}>Hidden</span>}
              </div>
              <div className={styles.coachTitle}>{c.title}</div>
              <div className={styles.coachGames}>{c.games.map(g => g.icon).join(' ')}</div>
            </div>
            <div className={styles.coachMeta}>
              <div>⭐ {c.rating.toFixed(1)}</div>
              <div>{c.totalSessions}+ sessions</div>
              <div>📍 {c.location}</div>
            </div>
            <button
              className={`${styles.actionBtn} ${c.onRoster ? styles.hideBtn : styles.showBtn}`}
              onClick={() => handleToggle(c)}
              disabled={toggling === c.id}
            >
              {toggling === c.id ? '...' : c.onRoster ? '🚫 Hide from Platform' : '✓ Restore to Platform'}
            </button>
          </div>
        ))}
      </div>

      {coaches.length === 0 && (
        <div className={styles.editNote}>
          No coaches on the roster yet. Approve coach applications and click "Add to Roster" to add them here.
        </div>
      )}
    </div>
  );
}

// ── TOURNAMENT MANAGEMENT ─────────────────────────────────────────
function TournamentManagement({ tournaments, onStart, onDelete }) {
  return (
    <div className={styles.tourneyList}>
      {tournaments.map(t => (
        <div key={t.id} className={styles.tourneyRow}>
          <div>
            <div className={styles.tourneyName}>{t.name}</div>
            <div className={styles.tourneyMeta}>{t.game} · {t.format} · {t.date}</div>
          </div>
          <div className={styles.tourneyStatus}>
            <Badge variant={t.phase === 'bracket' ? 'green' : t.phase === 'complete' ? 'blue' : 'gold'}>
              {t.phase}
            </Badge>
            <span>{t.registeredTeams.length}/{t.maxTeams} teams</span>
          </div>
          <div className={styles.tourneyActions}>
            {t.phase === 'registration' && t.registeredTeams.length >= 2 && (
              <button className={styles.startBtn} onClick={() => onStart(t.id)}>🚀 Start</button>
            )}
            <button className={styles.deleteBtn} onClick={() => onDelete(t.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MAIN ADMIN PANEL ──────────────────────────────────────────────
// ─── FLAG HISTORY PANEL ───────────────────────────────────────────
function FlagHistoryPanel() {
  const [history, setHistory]       = useState([]);
  const [summary, setSummary]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [filterContext, setFilterContext] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [expanded, setExpanded]     = useState(null);

  const CATEGORY_LABELS = {
    score_dispute: 'Score Dispute',
    player_conduct: 'Player Conduct',
    technical: 'Technical Issue',
    other: 'Other',
  };

  const load = async () => {
    setLoading(true);
    const [hist, sum] = await Promise.all([
      matchFlagApi.getHistory({ context: filterContext || undefined, category: filterCategory || undefined }),
      matchFlagApi.getRetentionSummary(),
    ]);
    setHistory(hist);
    setSummary(sum);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterContext, filterCategory]);

  const formatDate = (ts) => ts ? new Date(ts).toLocaleString() : '—';
  const formatDays = (n) => n === 0 ? 'Expires today' : n === 1 ? '1 day left' : `${n} days left`;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem', marginTop:'0.5rem' }}>

      {/* Retention summary bar */}
      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.8rem' }}>
          {[
            { label: 'Active Flags',          value: summary.active,           color: '#ef4444' },
            { label: 'Resolved (Retained)',   value: summary.totalResolved,    color: '#3b82f6' },
            { label: 'Expiring This Week',    value: summary.expiringThisWeek, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background:'#0d1b2e', border:`1px solid ${s.color}30`, padding:'0.9rem 1.2rem' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.8rem', color: s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:'0.72rem', color:'#6b7fa3', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:'0.2rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Retention policy note */}
      <div style={{ background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.2)', padding:'0.7rem 1rem', fontSize:'0.82rem', color:'#8ba0c0', lineHeight:1.6 }}>
        📋 <strong style={{color:'#e8f0ff'}}>Retention Policy:</strong> Resolved flags are kept for <strong style={{color:'#3b82f6'}}>7 days after the associated event ends</strong> (tournament completion date or league end date). Flags without a linked event expire 7 days after resolution. Records are then automatically purged.
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:'0.72rem', color:'#6b7fa3', letterSpacing:'0.1em', textTransform:'uppercase' }}>Filter:</span>
        {[['','All Contexts'],['tournament','Tournament'],['league','League']].map(([val,label]) => (
          <button key={val}
            onClick={() => setFilterContext(val)}
            style={{ background: filterContext===val ? 'rgba(59,130,246,0.12)' : 'none', border:`1px solid ${filterContext===val ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, color: filterContext===val ? '#e8f0ff' : '#6b7fa3', fontSize:'0.78rem', fontWeight:700, padding:'0.3rem 0.8rem', cursor:'pointer', fontFamily:"'Barlow',sans-serif" }}
          >{label}</button>
        ))}
        <span style={{ width:'1px', height:'20px', background:'rgba(255,255,255,0.08)' }} />
        {[['','All Categories'],['score_dispute','Score Dispute'],['player_conduct','Player Conduct'],['technical','Technical'],['other','Other']].map(([val,label]) => (
          <button key={val}
            onClick={() => setFilterCategory(val)}
            style={{ background: filterCategory===val ? 'rgba(59,130,246,0.12)' : 'none', border:`1px solid ${filterCategory===val ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, color: filterCategory===val ? '#e8f0ff' : '#6b7fa3', fontSize:'0.78rem', fontWeight:700, padding:'0.3rem 0.8rem', cursor:'pointer', fontFamily:"'Barlow',sans-serif" }}
          >{label}</button>
        ))}
      </div>

      {/* History list */}
      {loading ? <Spinner /> : history.length === 0 ? (
        <div style={{ padding:'2rem', textAlign:'center', color:'#6b7fa3', background:'#0d1b2e', border:'1px dashed rgba(255,255,255,0.08)' }}>
          No resolved flag history found for the selected filters.
        </div>
      ) : history.map(f => (
        <div key={f.id} style={{
          background: '#0d1b2e',
          border: '1px solid rgba(255,255,255,0.08)',
          borderLeft: `3px solid ${f.daysLeft <= 2 ? '#ef4444' : f.daysLeft <= 5 ? '#f59e0b' : '#3b82f6'}`,
          overflow: 'hidden',
        }}>
          {/* Header row */}
          <div
            style={{ display:'flex', alignItems:'center', gap:'0.8rem', padding:'0.85rem 1rem', cursor:'pointer', flexWrap:'wrap' }}
            onClick={() => setExpanded(expanded === f.id ? null : f.id)}
          >
            <span style={{ fontSize:'1rem' }}>🚩</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'0.95rem', fontWeight:700, color:'#e8f0ff' }}>
                Match <code style={{ fontSize:'0.82rem', color:'#8ba0c0' }}>{f.matchId}</code>
                {' · '}
                <span style={{ color: '#3b82f6', textTransform:'capitalize' }}>{f.context}</span>
                {' · '}
                <span style={{ color:'#e8f0ff' }}>{CATEGORY_LABELS[f.category] || f.category}</span>
              </div>
              <div style={{ fontSize:'0.72rem', color:'#6b7fa3', marginTop:'0.15rem' }}>
                Flagged {formatDate(f.createdAt)} · Resolved {formatDate(f.resolvedAt)}
              </div>
            </div>
            <div style={{
              fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
              color: f.daysLeft <= 2 ? '#ef4444' : f.daysLeft <= 5 ? '#f59e0b' : '#10b981',
              background: f.daysLeft <= 2 ? 'rgba(239,68,68,0.1)' : f.daysLeft <= 5 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${f.daysLeft <= 2 ? 'rgba(239,68,68,0.3)' : f.daysLeft <= 5 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
              padding:'0.2rem 0.6rem', flexShrink:0,
            }}>
              ⏳ {formatDays(f.daysLeft)}
            </div>
            <span style={{ color:'#6b7fa3', fontSize:'0.8rem' }}>{expanded === f.id ? '▲' : '▼'}</span>
          </div>

          {/* Expanded detail */}
          {expanded === f.id && (
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'0.9rem 1rem', display:'flex', flexDirection:'column', gap:'0.7rem', background:'rgba(0,0,0,0.15)' }}>
              <div>
                <div style={{ fontSize:'0.65rem', letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7fa3', fontWeight:700, marginBottom:'0.3rem' }}>Player Report</div>
                <div style={{ fontSize:'0.9rem', color:'#e8f0ff', fontStyle:'italic', padding:'0.5rem 0.8rem', background:'rgba(239,68,68,0.06)', borderLeft:'3px solid rgba(239,68,68,0.4)' }}>
                  "{f.reason}"
                </div>
              </div>
              <div>
                <div style={{ fontSize:'0.65rem', letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7fa3', fontWeight:700, marginBottom:'0.3rem' }}>Admin Resolution</div>
                <div style={{ fontSize:'0.9rem', color:'#10b981', padding:'0.5rem 0.8rem', background:'rgba(16,185,129,0.05)', borderLeft:'3px solid rgba(16,185,129,0.4)' }}>
                  {f.resolution || 'No resolution note recorded.'}
                </div>
              </div>
              {f.notes?.length > 0 && (
                <div>
                  <div style={{ fontSize:'0.65rem', letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b7fa3', fontWeight:700, marginBottom:'0.3rem' }}>Additional Notes ({f.notes.length})</div>
                  {f.notes.map((n, i) => (
                    <div key={i} style={{ fontSize:'0.82rem', color:'#8ba0c0', padding:'0.35rem 0.7rem', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      {n.text} <span style={{ color:'#6b7fa3', fontSize:'0.7rem' }}>— {formatDate(n.ts)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', fontSize:'0.75rem', color:'#6b7fa3', marginTop:'0.2rem' }}>
                <div>Event ID: <span style={{color:'#8ba0c0'}}>{f.eventId || 'Not linked'}</span></div>
                <div>Context: <span style={{color:'#8ba0c0',textTransform:'capitalize'}}>{f.context}</span></div>
                <div>Resolved by: <span style={{color:'#8ba0c0'}}>{f.resolvedBy || '—'}</span></div>
                <div>Expires: <span style={{color: f.daysLeft <= 2 ? '#ef4444' : '#8ba0c0'}}>{formatDate(f.expiresAt)}</span></div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── FLAGGED MATCHES PANEL ────────────────────────────────────────
function FlaggedMatchesPanel() {
  const { user } = useAuth();
  const [flags, setFlags]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [resolving, setResolving] = useState('');
  const [resolution, setResolution] = useState({});

  const load = async () => {
    setLoading(true);
    const f = await matchFlagApi.getActive();
    setFlags(f);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleResolve = async (flagId) => {
    const note = resolution[flagId] || 'Resolved by admin';
    setResolving(flagId);
    await matchFlagApi.resolve(flagId, user?.id, note);
    await load();
    setResolving('');
  };

  const CATEGORY_LABELS = {
    score_dispute: 'Score Dispute',
    player_conduct: 'Player Conduct',
    technical: 'Technical Issue',
    other: 'Other',
  };

  if (loading) return <Spinner />;

  if (flags.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
        ✅ No flagged matches right now. All clear!
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.8rem' }}>
      {flags.map(f => (
        <div key={f.id} style={{
          background: 'var(--card)',
          border: '1px solid rgba(239,68,68,0.3)',
          padding: '1rem 1.2rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 700 }}>
                🚩 Match <code style={{ fontSize: '0.85rem', color: 'var(--silver)' }}>{f.matchId}</code>
                {' — '}
                <span style={{ color: 'var(--red)' }}>{CATEGORY_LABELS[f.category] || f.category}</span>
                <span style={{ marginLeft: '0.6rem', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {f.context}
                </span>
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--silver)', marginTop: '0.3rem' }}>
                "{f.reason}"
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                Flagged {new Date(f.createdAt).toLocaleString()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
              <input
                placeholder="Resolution note..."
                value={resolution[f.id] || ''}
                onChange={e => setResolution(p => ({ ...p, [f.id]: e.target.value }))}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  color: 'var(--white)',
                  padding: '0.4rem 0.7rem',
                  fontFamily: "'Barlow',sans-serif",
                  fontSize: '0.82rem',
                  outline: 'none',
                  width: '200px',
                }}
              />
              <button
                onClick={() => handleResolve(f.id)}
                disabled={resolving === f.id}
                style={{
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: 'var(--green)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  padding: '0.4rem 1rem',
                  cursor: 'pointer',
                  fontFamily: "'Barlow',sans-serif",
                }}
              >
                {resolving === f.id ? '...' : '✓ Resolve'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


// ── GAME MANAGEMENT ───────────────────────────────────────────────────────────
const GAME_ICONS = ['🎮','⚔️','🔫','🎯','🏆','🚀','🎲','💥','🏗️','🦸','🏀','⚽','🎸','🃏','🐉','🌟','🔥','💡','🛡️','🎪'];
const GAME_COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#f97316','#84cc16','#c89b3c','#ff4655','#00b4d8'];
const GAME_GENRES = ['MOBA','FPS','Battle Royale','Fighting','Sports','Auto Battler','Hero Shooter','Strategy','RPG','Puzzle','Racing','Card Game'];
const GAME_PLATFORMS = ['PC','Console','PC/Console','Nintendo Switch','PC/Mobile','PC/Console/Mobile','Mobile'];

// ── MAPS TAB ─────────────────────────────────────────────────────────────────
const MAP_TYPES = ['Standard','Competitive','MLG','Starter','Counterpick','ARAM','Special','Battle Royale','Convoy','Domination','Convergence','Reload'];

function MapsTab({ game, maps, setMaps, accentColor }) {
  const [showAdd, setShowAdd]   = useState(false);
  const [editing, setEditing]   = useState(null); // map id being edited inline
  const [editVals, setEditVals] = useState({});
  const [addForm, setAddForm]   = useState({ name: '', type: 'Standard', notes: '' });
  const [saving, setSaving]     = useState(false);
  const [dragOver, setDragOver] = useState(null);
  const dragItem                = useRef(null);

  const openEdit = (map) => {
    setEditing(map.id);
    setEditVals({ name: map.name, type: map.type, notes: map.notes || '' });
  };

  const saveEdit = async (mapId) => {
    if (!editVals.name?.trim()) return;
    const res = await gameApi.updateMap(game.id, mapId, editVals);
    if (res.success) {
      setMaps(prev => prev.map(m => m.id === mapId ? { ...m, ...editVals } : m));
    }
    setEditing(null);
  };

  const toggleActive = async (mapId) => {
    const res = await gameApi.toggleMapActive(game.id, mapId);
    if (res.success) {
      setMaps(prev => prev.map(m => m.id === mapId ? { ...m, active: res.active } : m));
    }
  };

  const deleteMap = async (mapId) => {
    if (!window.confirm('Delete this map?')) return;
    await gameApi.deleteMap(game.id, mapId);
    setMaps(prev => prev.filter(m => m.id !== mapId));
  };

  const addMap = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    const res = await gameApi.addMap(game.id, addForm);
    setSaving(false);
    if (res.success) {
      setMaps(prev => [...prev, res.map]);
      setAddForm({ name: '', type: 'Standard', notes: '' });
      setShowAdd(false);
    }
  };

  // Drag-to-reorder
  const handleDragStart = (e, idx) => { dragItem.current = idx; e.dataTransfer.effectAllowed = 'move'; };
  const handleDragEnter = (idx) => setDragOver(idx);
  const handleDrop = async (e, dropIdx) => {
    e.preventDefault();
    if (dragItem.current === null || dragItem.current === dropIdx) { setDragOver(null); return; }
    const reordered = [...maps];
    const [moved] = reordered.splice(dragItem.current, 1);
    reordered.splice(dropIdx, 0, moved);
    setMaps(reordered);
    dragItem.current = null;
    setDragOver(null);
    await gameApi.reorderMaps(game.id, reordered.map(m => m.id));
  };

  const activeMaps   = maps.filter(m => m.active);
  const inactiveMaps = maps.filter(m => !m.active);

  return (
    <div className={styles.gmEditBody}>
      <p className={styles.gmHelp}>
        Manage maps for {game.name}. Maps appear in tournament and league creation. Drag rows to reorder.
        <span className={styles.gmMapSummary}>{activeMaps.length} active · {inactiveMaps.length} inactive · {maps.length} total</span>
      </p>

      {/* Map list */}
      <div className={styles.gmMapList}>
        {maps.length === 0 && !showAdd && (
          <div className={styles.gmEmpty}>No maps added yet. Add maps to enable map selection in tournaments.</div>
        )}

        {maps.map((map, idx) => (
          <div
            key={map.id}
            className={`${styles.gmMapRow} ${!map.active ? styles.gmMapRowInactive : ''} ${dragOver === idx ? styles.gmMapRowDragOver : ''}`}
            draggable
            onDragStart={e => handleDragStart(e, idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, idx)}
            onDragEnd={() => setDragOver(null)}
          >
            {/* Drag handle */}
            <div className={styles.gmMapDrag} title="Drag to reorder">₿</div>

            {/* Active indicator */}
            <div className={`${styles.gmMapActive} ${map.active ? styles.gmMapActiveOn : ''}`}
              style={map.active ? { background: accentColor } : {}}
              title={map.active ? 'Active' : 'Inactive'} />

            {editing === map.id ? (
              /* ── INLINE EDIT MODE ── */
              <div className={styles.gmMapEditInline}>
                <input className={styles.gmInput} value={editVals.name}
                  onChange={e => setEditVals(p => ({...p, name: e.target.value}))}
                  placeholder="Map name" autoFocus />
                <select className={styles.gmSelect} value={editVals.type}
                  onChange={e => setEditVals(p => ({...p, type: e.target.value}))}>
                  {MAP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input className={styles.gmInput} value={editVals.notes}
                  onChange={e => setEditVals(p => ({...p, notes: e.target.value}))}
                  placeholder="Notes (optional)" />
                <div className={styles.gmMapEditBtns}>
                  <button className={styles.gmSeasonToggle} onClick={() => saveEdit(map.id)}>✓ Save</button>
                  <button className={styles.gmModeRemove} onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              /* ── DISPLAY MODE ── */
              <>
                <div className={styles.gmMapInfo}>
                  <div className={styles.gmMapName} style={!map.active ? { opacity: 0.5 } : {}}>{map.name}</div>
                  <div className={styles.gmMapMeta}>
                    <span className={styles.gmMapType} style={{ color: accentColor, borderColor: accentColor + '44' }}>{map.type}</span>
                    {map.notes && <span className={styles.gmMapNotes}>{map.notes}</span>}
                  </div>
                </div>

                <div className={styles.gmMapActions}>
                  <button className={styles.gmMapEditBtn} onClick={() => openEdit(map)}>✏️ Edit</button>
                  <button
                    className={`${styles.gmSeasonToggle} ${map.active ? styles.gmSeasonToggleOn : ''}`}
                    onClick={() => toggleActive(map.id)}>
                    {map.active ? 'Active' : 'Inactive'}
                  </button>
                  <button className={styles.gmSeasonDelete} onClick={() => deleteMap(map.id)}>🗑</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add map form */}
      {showAdd ? (
        <div className={styles.gmAddMapForm}>
          <div className={styles.gmAddMapTitle}>Add New Map</div>
          <div className={styles.gmFormGrid}>
            <div className={styles.gmField}>
              <label>Map Name *</label>
              <input className={styles.gmInput} value={addForm.name}
                onChange={e => setAddForm(p => ({...p, name: e.target.value}))}
                placeholder="e.g. Dust II" autoFocus />
            </div>
            <div className={styles.gmField}>
              <label>Map Type</label>
              <select className={styles.gmSelect} value={addForm.type}
                onChange={e => setAddForm(p => ({...p, type: e.target.value}))}>
                {MAP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className={styles.gmField} style={{ gridColumn: '1 / -1' }}>
              <label>Notes / Modes Available</label>
              <input className={styles.gmInput} value={addForm.notes}
                onChange={e => setAddForm(p => ({...p, notes: e.target.value}))}
                placeholder="e.g. Available in all modes · Competitive legal"
                onKeyDown={e => e.key === 'Enter' && addMap()} />
            </div>
          </div>
          <div className={styles.gmSeasonActions}>
            <button className={styles.gmAddBtn} onClick={addMap} disabled={saving || !addForm.name.trim()}>
              {saving ? 'Adding…' : '+ Add Map'}
            </button>
            <button className={styles.gmCancelSeason} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className={styles.gmAddBtn} style={{ marginTop: '0.6rem' }} onClick={() => setShowAdd(true)}>
          + Add Map
        </button>
      )}
    </div>
  );
}

function GameManagement() {
  const [games, setGames]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null); // game being edited
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView]           = useState('list'); // list | detail

  const load = async () => {
    const all = await gameApi.getAll();
    setGames(all);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openGame = (game) => { setSelected(game); setView('detail'); };
  const backToList = () => { setSelected(null); setView('list'); load(); };

  const toggleActive = async (id) => {
    await gameApi.toggleActive(id);
    setGames(prev => prev.map(g => g.id === id ? { ...g, active: !g.active } : g));
    if (selected?.id === id) setSelected(prev => ({ ...prev, active: !prev.active }));
  };

  if (loading) return <Spinner />;

  return (
    <div className={styles.gmWrap}>
      {view === 'list' && (
        <>
          {/* Summary stats */}
          <div className={styles.gmStats}>
            <div className={styles.gmStat}><span>{games.length}</span>Total Games</div>
            <div className={styles.gmStat}><span>{games.filter(g=>g.active).length}</span>Active</div>
            <div className={styles.gmStat}><span>{games.filter(g=>g.featured).length}</span>Featured</div>
            <div className={styles.gmStat}><span>{games.filter(g=>g.hasLadder).length}</span>Has Ladder</div>
            <div className={styles.gmStat}><span>{games.reduce((acc,g)=>acc+(g.seasons?.length??0),0)}</span>Total Seasons</div>
          </div>

          {/* Add game button */}
          <div className={styles.gmListHeader}>
            <div className={styles.gmListTitle}>All Games ({games.length})</div>
            <button className={styles.gmAddBtn} onClick={() => setShowCreate(true)}>+ Add New Game</button>
          </div>

          {/* Game cards grid */}
          <div className={styles.gmGrid}>
            {games.map(game => (
              <div key={game.id} className={`${styles.gmCard} ${!game.active ? styles.gmCardInactive : ''}`}
                onClick={() => openGame(game)}>
                <div className={styles.gmCardTop} style={{ background: game.coverImage ? 'transparent' : `linear-gradient(135deg, ${game.color}22, ${game.color}08)`, borderBottom: `1px solid ${game.color}33`, position:'relative', overflow:'hidden' }}>
                  {game.coverImage && (
                    <div className={styles.gmCardCover}>
                      <img src={game.coverImage} alt={game.name} className={styles.gmCardCoverImg} />
                      <div className={styles.gmCardCoverOverlay} style={{ background: `linear-gradient(to top, ${game.color}99, transparent)` }} />
                    </div>
                  )}
                  <div className={styles.gmCardIcon} style={{ background: game.color + '22', border: `2px solid ${game.color}55`, position:'relative', zIndex:1, flexShrink:0 }}>
                    {game.coverImage
                      ? <img src={game.coverImage} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
                      : game.icon}
                  </div>
                  <div className={styles.gmCardBadges}>
                    {game.featured && <span className={styles.gmBadgeFeatured}>⭐ Featured</span>}
                    {game.hasLadder && <span className={styles.gmBadgeLadder}>🎮 Ladder</span>}
                    {!game.active && <span className={styles.gmBadgeInactive}>Inactive</span>}
                  </div>
                </div>
                <div className={styles.gmCardBody}>
                  <div className={styles.gmCardName} style={{ color: game.color }}>{game.name}</div>
                  <div className={styles.gmCardMeta}>{game.genre} · {game.platform}</div>
                  <div className={styles.gmCardMeta}>{game.teamSize.label}</div>
                  <div className={styles.gmCardSeasons}>
                    {game.seasons.length > 0
                      ? `${game.seasons.length} Season${game.seasons.length !== 1 ? 's' : ''} · ${game.seasons.find(s=>s.active) ? '🟢 Active' : '⚪ No Active Season'}`
                      : 'No seasons'}
                  </div>
                </div>
                <div className={styles.gmCardFoot}>
                  <button className={styles.gmCardEdit} onClick={e => { e.stopPropagation(); openGame(game); }}>Edit ›</button>
                  <button
                    className={`${styles.gmCardToggle} ${game.active ? styles.gmCardToggleOn : styles.gmCardToggleOff}`}
                    onClick={e => { e.stopPropagation(); toggleActive(game.id); }}>
                    {game.active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'detail' && selected && (
        <GameDetailEditor
          game={selected}
          onBack={backToList}
          onSaved={(updated) => setSelected(updated)}
        />
      )}

      {showCreate && (
        <CreateGameModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { load(); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

// ── GAME DETAIL EDITOR ────────────────────────────────────────────────────────
function GameDetailEditor({ game, onBack, onSaved }) {
  const [form, setForm] = useState({
    name: game.name, shortName: game.shortName, genre: game.genre,
    platform: game.platform, icon: game.icon, color: game.color,
    featured: game.featured, hasLadder: game.hasLadder,
    teamSizeMin: game.teamSize.min, teamSizeMax: game.teamSize.max, teamSizeLabel: game.teamSize.label,
  });
  const [coverImage, setCoverImage]   = useState(game.coverImage || '');
  const [imgUploading, setImgUploading] = useState(false);
  const coverImageRef                 = useRef(null);
  const [modes, setModes]         = useState([...game.modes]);
  const [newMode, setNewMode]     = useState('');
  const [seasons, setSeasons]     = useState([...game.seasons]);
  const [maps, setMaps]           = useState([...(game.maps || [])]);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [editTab, setEditTab]     = useState('info'); // info | modes | seasons | maps

  // Season form state
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [seasonForm, setSeasonForm]       = useState({ name: '', startDate: '', endDate: '', active: false });

  const save = async () => {
    setSaving(true);
    const updates = {
      name: form.name, shortName: form.shortName, genre: form.genre,
      platform: form.platform, icon: form.icon, color: form.color,
      featured: form.featured, hasLadder: form.hasLadder,
      teamSize: { min: +form.teamSizeMin, max: +form.teamSizeMax, label: form.teamSizeLabel },
    };
    const res = await gameApi.update(game.id, updates);
    setSaving(false);
    if (res.success) { setSaved(true); onSaved(res.game); setTimeout(() => setSaved(false), 2000); }
  };

  const addMode = () => {
    if (!newMode.trim()) return;
    const updated = [...modes, newMode.trim()];
    setModes(updated);
    setNewMode('');
    gameApi.updateModes(game.id, updated);
  };

  const removeMode = (i) => {
    const updated = modes.filter((_,idx) => idx !== i);
    setModes(updated);
    gameApi.updateModes(game.id, updated);
  };

  const addSeason = async () => {
    if (!seasonForm.name || !seasonForm.startDate || !seasonForm.endDate) return;
    const res = await gameApi.addSeason(game.id, seasonForm);
    if (res.success) {
      setSeasons(prev => [...prev, res.season]);
      setSeasonForm({ name: '', startDate: '', endDate: '', active: false });
      setShowAddSeason(false);
    }
  };

  const toggleSeasonActive = async (seasonId, current) => {
    await gameApi.updateSeason(game.id, seasonId, { active: !current });
    setSeasons(prev => prev.map(s => ({
      ...s,
      active: s.id === seasonId ? !current : (!current ? false : s.active),
    })));
  };

  const deleteSeason = async (seasonId) => {
    if (!window.confirm('Delete this season?')) return;
    await gameApi.deleteSeason(game.id, seasonId);
    setSeasons(prev => prev.filter(s => s.id !== seasonId));
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className={styles.gmDetail}>
      {/* Header */}
      <div className={styles.gmDetailHeader}>
        <button className={styles.gmBackBtn} onClick={onBack}>← All Games</button>
        <div className={styles.gmDetailTitle}>
          <div className={styles.gmDetailIcon} style={{ background: form.color + '22', border: `2px solid ${form.color}`, overflow:'hidden' }}>
            {coverImage
              ? <img src={coverImage} alt={form.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : form.icon}
          </div>
          <div>
            <div className={styles.gmDetailName} style={{ color: form.color }}>{form.name}</div>
            <div className={styles.gmDetailSub}>{form.genre} · {form.platform}</div>
          </div>
        </div>
        <button className={`${styles.gmSaveBtn} ${saved ? styles.gmSaveBtnSaved : ''}`} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Edit tabs */}
      <div className={styles.gmEditTabs}>
        {[['info','📋 Info & Settings'],['modes','🎯 Game Modes'],['maps','🗺️ Maps'],['seasons','📅 Seasons']].map(([id,label]) => (
          <button key={id} className={`${styles.gmEditTab} ${editTab===id?styles.gmEditTabOn:''}`}
            onClick={() => setEditTab(id)}>{label}
            {id === 'seasons' && <span className={styles.gmTabBadge}>{seasons.length}</span>}
          {id === 'maps' && <span className={styles.gmTabBadge}>{maps.length}</span>}
          </button>
        ))}
      </div>

      {/* INFO TAB */}
      {editTab === 'info' && (
        <div className={styles.gmEditBody}>

          {/* ── COVER IMAGE UPLOADER ── */}
          <div className={styles.gmCoverSection}>
            <div className={styles.gmCoverLabel}>Game Cover / Title Art</div>
            <div className={styles.gmCoverRow}>
              {/* Preview */}
              <div className={styles.gmCoverPreview} style={{ borderColor: form.color + '66' }}>
                {coverImage ? (
                  <>
                    <img src={coverImage} alt="cover" className={styles.gmCoverImg} />
                    <div className={styles.gmCoverPreviewOverlay}>
                      <button className={styles.gmCoverChangeBtn} onClick={() => coverImageRef.current.click()}>Change</button>
                      <button className={styles.gmCoverRemoveBtn} onClick={async () => {
                        await gameApi.removeCoverImage(game.id);
                        setCoverImage('');
                        onSaved({ ...game, coverImage: '' });
                      }}>✕ Remove</button>
                    </div>
                  </>
                ) : (
                  <div className={styles.gmCoverEmpty}>
                    <div className={styles.gmCoverEmptyIcon} style={{ color: form.color }}>{form.icon}</div>
                    <div className={styles.gmCoverEmptyText}>No cover art</div>
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className={styles.gmCoverControls}>
                <p className={styles.gmHelp}>Upload a game logo, title art, or capsule image. Recommended: 16:9 or square, JPG/PNG, under 2MB.</p>
                <button
                  className={styles.gmCoverUploadBtn}
                  style={{ borderColor: form.color + '66', color: form.color }}
                  onClick={() => coverImageRef.current.click()}
                  disabled={imgUploading}
                >
                  {imgUploading ? '⏳ Uploading…' : coverImage ? '🖼️ Replace Image' : '📁 Upload Cover Art'}
                </button>
                <input
                  ref={coverImageRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 3 * 1024 * 1024) { alert('Image must be under 3MB.'); return; }
                    setImgUploading(true);
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const dataUrl = ev.target.result;
                      await gameApi.updateCoverImage(game.id, dataUrl);
                      setCoverImage(dataUrl);
                      onSaved({ ...game, coverImage: dataUrl });
                      setImgUploading(false);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                {coverImage && (
                  <p className={styles.gmCoverHint}>✓ Cover image set — shown on game cards and throughout the platform.</p>
                )}
              </div>
            </div>
          </div>

          <div className={styles.gmFormGrid}>
            <div className={styles.gmField}>
              <label>Game Name</label>
              <input className={styles.gmInput} value={form.name} onChange={e => set('name', e.target.value)}/>
            </div>
            <div className={styles.gmField}>
              <label>Short Name / Abbreviation</label>
              <input className={styles.gmInput} value={form.shortName} onChange={e => set('shortName', e.target.value)} maxLength={6}/>
            </div>
            <div className={styles.gmField}>
              <label>Genre</label>
              <select className={styles.gmSelect} value={form.genre} onChange={e => set('genre', e.target.value)}>
                {GAME_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className={styles.gmField}>
              <label>Platform</label>
              <select className={styles.gmSelect} value={form.platform} onChange={e => set('platform', e.target.value)}>
                {GAME_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className={styles.gmField}>
              <label>Team Size Min</label>
              <input className={styles.gmInput} type="number" min={1} max={12} value={form.teamSizeMin} onChange={e => set('teamSizeMin', e.target.value)}/>
            </div>
            <div className={styles.gmField}>
              <label>Team Size Max</label>
              <input className={styles.gmInput} type="number" min={1} max={12} value={form.teamSizeMax} onChange={e => set('teamSizeMax', e.target.value)}/>
            </div>
            <div className={styles.gmField}>
              <label>Team Size Label (e.g. "5v5")</label>
              <input className={styles.gmInput} value={form.teamSizeLabel} onChange={e => set('teamSizeLabel', e.target.value)}/>
            </div>
          </div>

          {/* Icon picker */}
          <div className={styles.gmField}>
            <label>Icon</label>
            <div className={styles.gmIconGrid}>
              {GAME_ICONS.map(ic => (
                <button key={ic} className={`${styles.gmIconOpt} ${form.icon === ic ? styles.gmIconOptOn : ''}`}
                  style={form.icon === ic ? { background: form.color + '33', borderColor: form.color } : {}}
                  onClick={() => set('icon', ic)}>{ic}</button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className={styles.gmField}>
            <label>Accent Color</label>
            <div className={styles.gmColorRow}>
              {GAME_COLORS.map(c => (
                <button key={c} className={`${styles.gmColorDot} ${form.color === c ? styles.gmColorDotOn : ''}`}
                  style={{ background: c, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 3 }}
                  onClick={() => set('color', c)}/>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className={styles.gmToggles}>
            <label className={styles.gmToggle}>
              <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)}/>
              <span className={styles.gmToggleSlider}/>
              <span>Featured Game (shown prominently in UI)</span>
            </label>
            <label className={styles.gmToggle}>
              <input type="checkbox" checked={form.hasLadder} onChange={e => set('hasLadder', e.target.checked)}/>
              <span className={styles.gmToggleSlider}/>
              <span>Has Ranked Ladder</span>
            </label>
          </div>
        </div>
      )}

      {/* MODES TAB */}
      {editTab === 'modes' && (
        <div className={styles.gmEditBody}>
          <p className={styles.gmHelp}>Game modes are available when creating tournaments and leagues for this game.</p>
          <div className={styles.gmModeList}>
            {modes.length === 0 && <div className={styles.gmEmpty}>No modes added yet.</div>}
            {modes.map((mode, i) => (
              <div key={i} className={styles.gmModeRow}>
                <div className={styles.gmModeIcon} style={{ background: form.color + '22' }}>🎯</div>
                <span className={styles.gmModeName}>{mode}</span>
                <button className={styles.gmModeRemove} onClick={() => removeMode(i)}>✕</button>
              </div>
            ))}
          </div>
          <div className={styles.gmModeAdd}>
            <input className={styles.gmInput} placeholder="Add new mode (e.g. Ranked 5v5)…"
              value={newMode} onChange={e => setNewMode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMode()}/>
            <button className={styles.gmAddModeBtn} onClick={addMode} disabled={!newMode.trim()}>+ Add</button>
          </div>
        </div>
      )}

      {/* MAPS TAB */}
      {editTab === 'maps' && (
        <MapsTab
          game={game}
          maps={maps}
          setMaps={setMaps}
          accentColor={form.color}
        />
      )}

      {/* SEASONS TAB */}
      {editTab === 'seasons' && (
        <div className={styles.gmEditBody}>
          <p className={styles.gmHelp}>Seasons define competitive periods. Only one season can be active at a time.</p>

          {seasons.length === 0 && !showAddSeason && (
            <div className={styles.gmEmpty}>No seasons configured. Add a season to enable league play for this game.</div>
          )}

          <div className={styles.gmSeasonList}>
            {seasons.map(season => (
              <div key={season.id} className={`${styles.gmSeasonRow} ${season.active ? styles.gmSeasonActive : ''}`}>
                <div className={styles.gmSeasonLeft}>
                  <div className={styles.gmSeasonName}>
                    {season.name}
                    {season.active && <span className={styles.gmSeasonActiveBadge}>● Active</span>}
                  </div>
                  <div className={styles.gmSeasonDates}>{season.startDate} — {season.endDate}</div>
                </div>
                <div className={styles.gmSeasonActions}>
                  <button className={`${styles.gmSeasonToggle} ${season.active ? styles.gmSeasonToggleOn : ''}`}
                    onClick={() => toggleSeasonActive(season.id, season.active)}>
                    {season.active ? 'Deactivate' : 'Set Active'}
                  </button>
                  <button className={styles.gmSeasonDelete} onClick={() => deleteSeason(season.id)}>🗑</button>
                </div>
              </div>
            ))}
          </div>

          {showAddSeason ? (
            <div className={styles.gmAddSeasonForm}>
              <div className={styles.gmFormGrid}>
                <div className={styles.gmField}>
                  <label>Season Name</label>
                  <input className={styles.gmInput} placeholder="e.g. Spring 2025"
                    value={seasonForm.name} onChange={e => setSeasonForm(p => ({ ...p, name: e.target.value }))}/>
                </div>
                <div className={styles.gmField}>
                  <label>Start Date</label>
                  <input className={styles.gmInput} type="date"
                    value={seasonForm.startDate} onChange={e => setSeasonForm(p => ({ ...p, startDate: e.target.value }))}/>
                </div>
                <div className={styles.gmField}>
                  <label>End Date</label>
                  <input className={styles.gmInput} type="date"
                    value={seasonForm.endDate} onChange={e => setSeasonForm(p => ({ ...p, endDate: e.target.value }))}/>
                </div>
              </div>
              <label className={styles.gmToggle} style={{ marginBottom: '1rem' }}>
                <input type="checkbox" checked={seasonForm.active} onChange={e => setSeasonForm(p => ({ ...p, active: e.target.checked }))}/>
                <span className={styles.gmToggleSlider}/>
                <span>Set as active season immediately</span>
              </label>
              <div className={styles.gmSeasonFormFoot}>
                <button className={styles.gmCancelBtn} onClick={() => setShowAddSeason(false)}>Cancel</button>
                <button className={styles.gmSaveBtn}
                  disabled={!seasonForm.name || !seasonForm.startDate || !seasonForm.endDate}
                  onClick={addSeason}>Add Season</button>
              </div>
            </div>
          ) : (
            <button className={styles.gmAddSeasonBtn} onClick={() => setShowAddSeason(true)}>+ Add Season</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── CREATE GAME MODAL ─────────────────────────────────────────────────────────
function CreateGameModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', shortName: '', genre: 'FPS', platform: 'PC',
    icon: '🎮', color: '#3b82f6',
    teamSizeMin: 5, teamSizeMax: 5, teamSizeLabel: '5v5',
    featured: false, hasLadder: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setError('Game name is required.'); return; }
    setSaving(true);
    const { teamSizeMin, teamSizeMax, teamSizeLabel, ...rest } = form;
    const res = await gameApi.create({
      ...rest,
      shortName: form.shortName || form.name.slice(0, 4).toUpperCase(),
      teamSize: { min: +teamSizeMin, max: +teamSizeMax, label: teamSizeLabel },
    });
    setSaving(false);
    if (res.success) onCreated(res.game);
    else setError(res.error || 'Failed to create game.');
  };

  return (
    <div className={styles.modalBackdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} style={{ maxWidth: 540 }}>
        <div className={styles.modalHeader}><span className={styles.modalTitle}>Add New Game</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button></div>
        <div className={styles.modalBody}>
          <div className={styles.gmFormGrid}>
            <div className={styles.gmField}>
              <label>Game Name *</label>
              <input className={styles.gmInput} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Apex Legends"/>
            </div>
            <div className={styles.gmField}>
              <label>Abbreviation</label>
              <input className={styles.gmInput} value={form.shortName} onChange={e => set('shortName', e.target.value)} placeholder="e.g. APEX" maxLength={6}/>
            </div>
            <div className={styles.gmField}>
              <label>Genre</label>
              <select className={styles.gmSelect} value={form.genre} onChange={e => set('genre', e.target.value)}>
                {GAME_GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className={styles.gmField}>
              <label>Platform</label>
              <select className={styles.gmSelect} value={form.platform} onChange={e => set('platform', e.target.value)}>
                {GAME_PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className={styles.gmField}>
              <label>Min Team Size</label>
              <input className={styles.gmInput} type="number" min={1} max={12} value={form.teamSizeMin} onChange={e => set('teamSizeMin', e.target.value)}/>
            </div>
            <div className={styles.gmField}>
              <label>Max Team Size</label>
              <input className={styles.gmInput} type="number" min={1} max={12} value={form.teamSizeMax} onChange={e => set('teamSizeMax', e.target.value)}/>
            </div>
            <div className={styles.gmField} style={{ gridColumn: '1 / -1' }}>
              <label>Team Size Label</label>
              <input className={styles.gmInput} value={form.teamSizeLabel} onChange={e => set('teamSizeLabel', e.target.value)} placeholder="e.g. 5v5"/>
            </div>
          </div>
          <div className={styles.gmField}>
            <label>Icon</label>
            <div className={styles.gmIconGrid}>
              {GAME_ICONS.map(ic => (
                <button key={ic} className={`${styles.gmIconOpt} ${form.icon===ic?styles.gmIconOptOn:''}`}
                  style={form.icon===ic?{background:form.color+'33',borderColor:form.color}:{}}
                  onClick={()=>set('icon',ic)}>{ic}</button>
              ))}
            </div>
          </div>
          <div className={styles.gmField}>
            <label>Accent Color</label>
            <div className={styles.gmColorRow}>
              {GAME_COLORS.map(c => (
                <button key={c} className={`${styles.gmColorDot} ${form.color===c?styles.gmColorDotOn:''}`}
                  style={{background:c, outline:form.color===c?`3px solid ${c}`:'none', outlineOffset:3}}
                  onClick={()=>set('color',c)}/>
              ))}
            </div>
          </div>
          <div className={styles.gmToggles}>
            <label className={styles.gmToggle}>
              <input type="checkbox" checked={form.featured} onChange={e=>set('featured',e.target.checked)}/>
              <span className={styles.gmToggleSlider}/>
              <span>Featured Game</span>
            </label>
            <label className={styles.gmToggle}>
              <input type="checkbox" checked={form.hasLadder} onChange={e=>set('hasLadder',e.target.checked)}/>
              <span className={styles.gmToggleSlider}/>
              <span>Has Ranked Ladder</span>
            </label>
          </div>
          {error && <div className={styles.formError}>{error}</div>}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.actionBtn} onClick={onClose}>Cancel</button>
          <button className={styles.promoteBtn} disabled={saving||!form.name.trim()} onClick={submit}>
            {saving?'Creating…':'Add Game'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { isHeadAdmin, isLeagueAdmin } = useAuth();

  // League admins start on leagues; head admins on tournaments
  const defaultTab = isLeagueAdmin && !isHeadAdmin ? 'leagues' : 'tournaments';
  const [tab, setTab]             = useState(defaultTab);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    tournamentsApi.getAll().then(d => { setTournaments(d); setLoading(false); });
  }, []);

  const handleStart = async (id) => {
    const res = await tournamentsApi.start(id);
    if (res.success) setTournaments(prev => prev.map(t => t.id === id ? res.tournament : t));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this tournament?')) return;
    await tournamentsApi.delete(id);
    setTournaments(prev => prev.filter(t => t.id !== id));
  };

  // ── Tab definitions ───────────────────────────────────────────
  // 'all'        → both head_admin and league_admin see this tab
  // 'head_admin' → only head_admin (and legacy admin) can see this tab
  // league_admin can access: leagues, tournaments, create, flags, flag_history, social_mod
  // league_admin cannot access: orgs (HCEA), coach_apps, scholarships, players, coaches
  const ALL_TABS = [
    { id: 'leagues',      label: '🏅 Seasonal Leagues',     access: 'all' },
    { id: 'tournaments',  label: '🏆 Tournaments',          access: 'all' },
    { id: 'create',       label: '+ Create Tournament',     access: 'all' },
    { id: 'flags',        label: '🚩 Flagged Matches',      access: 'all' },
    { id: 'flag_history', label: '📋 Flag History',         access: 'all' },
    { id: 'social_mod',   label: '💬 Social Moderation',    access: 'all' },
    // Head admin only — HCEA and people management
    { id: 'orgs',         label: '🏢 HCEA Organizations',   access: 'head_admin' },
    { id: 'coach_apps',   label: '🎓 Coach Applications',   access: 'head_admin' },
    { id: 'scholarships', label: '🏅 Scholarship Apps',     access: 'head_admin' },
    { id: 'players',      label: '👥 Players',              access: 'head_admin' },
    { id: 'coaches',      label: '🎓 Coach Roster',         access: 'head_admin' },
    { id: 'games',        label: '🎮 Game Management',       access: 'head_admin' },
  ];

  const TABS = ALL_TABS.filter(t =>
    t.access === 'all' || isHeadAdmin
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap'}}>
          <h2>{isLeagueAdmin && !isHeadAdmin ? 'League Admin Panel' : 'Admin Panel'}</h2>
          {isHeadAdmin && (
            <span style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',background:'rgba(124,58,237,0.12)',border:'1px solid rgba(124,58,237,0.3)',color:'#7c3aed',padding:'0.2rem 0.6rem'}}>
              HEAD ADMIN
            </span>
          )}
          {isLeagueAdmin && !isHeadAdmin && (
            <span style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',color:'#f59e0b',padding:'0.2rem 0.6rem'}}>
              LEAGUE ADMIN
            </span>
          )}
        </div>
        <p>
          {isHeadAdmin
            ? 'Full platform management — tournaments, leagues, HCEA organizations, coaching, players.'
            : 'Manage leagues, tournaments, flagged matches, and social feed moderation.'}
        </p>
      </div>

      {/* Desktop: scrollable tab bar */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t.id} className={`${styles.tab} ${tab===t.id ? styles.tabOn : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {/* Mobile: dropdown select for tabs */}
      <div className={styles.tabsMobile}>
        <select
          className={styles.tabSelect}
          value={tab}
          onChange={e => setTab(e.target.value)}
        >
          {TABS.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <span className={styles.tabSelectArrow}>▾</span>
      </div>

      <div className={styles.body}>
        {tab === 'leagues' && <AdminLeagues />}
        {tab === 'tournaments' && (
          <div>
            <div className={styles.sectionTitle}>All Tournaments</div>
            {loading ? <Spinner /> : <TournamentManagement tournaments={tournaments} onStart={handleStart} onDelete={handleDelete} />}
          </div>
        )}
        {tab === 'create' && <CreateTournamentForm onCreated={t => { setTournaments(prev => [t, ...prev]); setTab('tournaments'); }} />}
        {tab === 'orgs' && <AdminOrgs />}
        {tab === 'scholarships' && <div><div className={styles.sectionTitle}>Scholarship Applications</div><ScholarshipApplications /></div>}
        {tab === 'flags' && <div><div className={styles.sectionTitle}>Flagged Matches</div><FlaggedMatchesPanel /></div>}
        {tab === 'flag_history' && <div><div className={styles.sectionTitle}>Flag History · Retained 1 Week After Event Ends</div><FlagHistoryPanel /></div>}
        {tab === 'social_mod' && (
          <div>
            <div className={styles.sectionTitle}>Social Feed Moderation</div>
            <div style={{padding:'1.5rem',background:'rgba(59,130,246,0.04)',border:'1px solid rgba(59,130,246,0.15)',marginBottom:'1rem'}}>
              <div style={{fontSize:'0.8rem',color:'#8ba0c0',lineHeight:1.7}}>
                <strong style={{color:'#e8f0ff'}}>Social moderation tools live in the Community Feed.</strong><br/>
                Navigate to <strong style={{color:'#3b82f6'}}>Community Feed → Social Feed</strong> in the sidebar to view all posts, pin/unpin, flag, timeout users, and delete content.<br/>
                Flagged posts from the feed also appear in <strong style={{color:'#3b82f6'}}>Flagged Matches</strong> for cross-reference on match-related disputes.
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem'}}>
              {[
                {icon:'📌',label:'Pin/Unpin Posts',desc:'Pinned posts float to the top of all users\' feeds.'},
                {icon:'🚩',label:'Flag & Remove',desc:'Flag or delete posts violating community guidelines.'},
                {icon:'⏱',label:'User Timeouts',desc:'Temporarily restrict users from posting (15min–7 days).'},
              ].map(item => (
                <div key={item.label} style={{padding:'1rem',background:'rgba(0,0,0,0.2)',border:'1px solid rgba(255,255,255,0.07)'}}>
                  <div style={{fontSize:'1.4rem',marginBottom:'0.4rem'}}>{item.icon}</div>
                  <div style={{fontSize:'0.85rem',fontWeight:700,color:'#e8f0ff',marginBottom:'0.3rem'}}>{item.label}</div>
                  <div style={{fontSize:'0.78rem',color:'#6b7fa3'}}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'coach_apps' && <div><div className={styles.sectionTitle}>Coach Applications</div>{isHeadAdmin ? <AdminCoachApps /> : <div style={{padding:'2rem',color:'var(--muted)'}}>Only Head Admins can view coach applications.</div>}</div>}
        {tab === 'players' && <div><div className={styles.sectionTitle}>Registered Players</div><PlayersManagement /></div>}
        {tab === 'coaches' && <div><div className={styles.sectionTitle}>Coach Roster</div><CoachesManagement /></div>}
        {tab === 'games'   && <div><div className={styles.sectionTitle}>Game Management</div><GameManagement /></div>}
      </div>
    </div>
  );
}
