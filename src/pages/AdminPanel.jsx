import { useState, useEffect } from 'react';
import { tournamentsApi, scholarshipsApi, adminApi, coachesApi, BRACKET_FORMATS, GAME_TEAM_SIZES } from '../../api';
import AdminOrgs from './AdminOrgs';
import AdminLeagues from './AdminLeagues';
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
function PlayersManagement() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getPlayers().then(d => { setPlayers(d); setLoading(false); });
  }, []);

  const toggleMembership = async (p) => {
    await adminApi.updatePlayer(p.id, { membershipActive: !p.membershipActive });
    setPlayers(prev => prev.map(pl => pl.id === p.id ? { ...pl, membershipActive: !pl.membershipActive } : pl));
  };

  if (loading) return <Spinner />;
  return (
    <div className={styles.playerTable}>
      <div className={styles.tableHead}>
        <span>Name</span><span>Email</span><span>School</span><span>Joined</span><span>Membership</span><span>Actions</span>
      </div>
      {players.map(p => (
        <div key={p.id} className={styles.tableRow}>
          <span className={styles.playerName}>{p.name}</span>
          <span className={styles.playerEmail}>{p.email}</span>
          <span>{p.school || '—'}</span>
          <span>{p.joinedAt}</span>
          <span>
            <Badge variant={p.membershipActive ? 'green' : 'red'}>{p.membershipActive ? 'Active' : 'Inactive'}</Badge>
          </span>
          <span className={styles.playerActions}>
            <button className={styles.actionBtn} onClick={() => toggleMembership(p)}>
              {p.membershipActive ? 'Deactivate' : 'Activate'}
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── COACHES MANAGEMENT ────────────────────────────────────────────
function CoachesManagement() {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    coachesApi.getAll().then(d => { setCoaches(d); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;
  return (
    <div className={styles.coachList}>
      {coaches.map(c => (
        <div key={c.id} className={styles.coachRow}>
          <div className={styles.coachAvatar} style={{ background: c.accentColor }}>{c.initials}</div>
          <div className={styles.coachInfo}>
            <div className={styles.coachName}>{c.name}</div>
            <div className={styles.coachTitle}>{c.title}</div>
            <div className={styles.coachGames}>{c.games.map(g => g.icon).join(' ')}</div>
          </div>
          <div className={styles.coachMeta}>
            <div>⭐ {c.rating.toFixed(1)}</div>
            <div>{c.totalSessions}+ sessions</div>
            <div>📍 {c.location}</div>
          </div>
          <button className={styles.actionBtn} onClick={() => setEditing(c)}>Edit Profile</button>
        </div>
      ))}
      {editing && (
        <div className={styles.editNote}>
          Coach profile editing UI — connect to coachesApi.update(coachId, updates) when your backend is ready.
          <button style={{ marginLeft:'1rem' }} onClick={() => setEditing(null)}>Close</button>
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
export default function AdminPanel() {
  const [tab, setTab]             = useState('tournaments');
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

  const TABS = [
    { id: 'leagues',     label: '🏅 Seasonal Leagues' },
    { id: 'tournaments', label: '🏆 Tournaments' },
    { id: 'create',      label: '+ Create Tournament' },
    { id: 'orgs',        label: '🏢 Organizations' },
    { id: 'scholarships',label: '🏅 Scholarship Apps' },
    { id: 'players',     label: '👥 Players' },
    { id: 'coaches',     label: '🎓 Coaches' },
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h2>Admin Panel</h2>
        <p>Manage tournaments, players, coaches, and scholarship applications.</p>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t.id} className={`${styles.tab} ${tab===t.id ? styles.tabOn : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
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
        {tab === 'players' && <div><div className={styles.sectionTitle}>Registered Players</div><PlayersManagement /></div>}
        {tab === 'coaches' && <div><div className={styles.sectionTitle}>Coach Roster</div><CoachesManagement /></div>}
      </div>
    </div>
  );
}
