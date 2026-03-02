import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { orgsApi } from '../api';
import { Spinner, Badge } from '../components/UI';
import styles from './OrgPlayers.module.css';

const ALL_YOUTH_GAMES = [
  'Minecraft Bedwars', 'Pokemon Unite', 'Fortnite', 'Rocket League',
  'Smash Bros.', 'Mario Kart', 'Splatoon', 'Valorant', 'League of Legends',
  'Roblox', 'Fall Guys', 'Among Us',
];

const GRADES = [
  'Kindergarten','1st Grade','2nd Grade','3rd Grade','4th Grade','5th Grade',
  '6th Grade','7th Grade','8th Grade','9th Grade','10th Grade','11th Grade','12th Grade',
];

const EMPTY_PLAYER = {
  firstName: '', lastName: '', displayName: '', age: '', grade: '',
  games: [], guardianName: '', guardianPhone: '', guardianEmail: '',
  notes: '', loginEnabled: false, username: '', pin: '',
};

// ── PLAYER FORM MODAL ─────────────────────────────────────────────
function PlayerFormModal({ orgId, player, onClose, onSaved }) {
  const isEdit = !!player;
  const [form, setForm]     = useState(player ? { ...player } : { ...EMPTY_PLAYER });
  const [tab, setTab]       = useState('info');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleGame = (game) => {
    set('games', form.games.includes(game)
      ? form.games.filter(g => g !== game)
      : [...form.games, game]
    );
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return setError('First and last name are required.');
    if (form.loginEnabled && (!form.username.trim() || !form.pin.trim())) return setError('Username and PIN are required when login is enabled.');
    if (form.pin && (form.pin.length < 4 || !/^\d+$/.test(form.pin))) return setError('PIN must be at least 4 digits.');
    setError('');
    setSaving(true);
    const data = { ...form, displayName: form.displayName || `${form.firstName}${form.lastName[0]}` };
    if (isEdit) {
      await orgsApi.updateYouthPlayer(player.id, data);
      onSaved({ ...player, ...data });
    } else {
      const res = await orgsApi.createYouthPlayer(orgId, data);
      onSaved(res.player, true);
    }
    setSaving(false);
  };

  const TABS = [
    { id: 'info',     label: '👤 Player Info' },
    { id: 'games',    label: '🎮 Games' },
    { id: 'guardian', label: '👨‍👩‍👦 Guardian' },
    { id: 'login',    label: '🔑 Login Access' },
  ];

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        <div className={styles.modalHead}>
          <div>
            <div className={styles.modalTitle}>{isEdit ? `Edit — ${player.firstName} ${player.lastName}` : 'Add Youth Player'}</div>
            <div className={styles.modalSub}>{isEdit ? 'Update player information' : 'Create a new player profile for your organization'}</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalTabs}>
          {TABS.map(t => (
            <button key={t.id} className={`${styles.mtab} ${tab === t.id ? styles.mtabOn : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.modalBody}>
          {error && <div className={styles.errorBox}>{error}</div>}

          {/* ── PLAYER INFO ── */}
          {tab === 'info' && (
            <div className={styles.formGrid}>
              <div className={styles.fg}>
                <label>First Name *</label>
                <input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Tyler" />
              </div>
              <div className={styles.fg}>
                <label>Last Name *</label>
                <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Barnes" />
              </div>
              <div className={styles.fg}>
                <label>Display / Gamertag <span className={styles.opt}>(optional)</span></label>
                <input value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="TylerB" />
              </div>
              <div className={styles.fg}>
                <label>Age</label>
                <input type="number" min="5" max="18" value={form.age} onChange={e => set('age', e.target.value)} placeholder="12" />
              </div>
              <div className={styles.fg}>
                <label>Grade</label>
                <select value={form.grade} onChange={e => set('grade', e.target.value)}>
                  <option value="">Select grade...</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className={`${styles.fg} ${styles.fgFull}`}>
                <label>Internal Notes <span className={styles.opt}>(only visible to you)</span></label>
                <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Coaching notes, behavioral context, goals..." />
              </div>
            </div>
          )}

          {/* ── GAMES ── */}
          {tab === 'games' && (
            <div className={styles.formSection}>
              <div className={styles.sectionNote}>Select all games this player participates in. These determine which tournaments they can be registered for.</div>
              <div className={styles.gamePickerGrid}>
                {ALL_YOUTH_GAMES.map(g => (
                  <button
                    key={g}
                    className={`${styles.gamePick} ${form.games.includes(g) ? styles.gamePickOn : ''}`}
                    onClick={() => toggleGame(g)}
                  >
                    {form.games.includes(g) ? '✓ ' : ''}{g}
                  </button>
                ))}
              </div>
              {form.games.length > 0 && (
                <div className={styles.selectedGames}>
                  Selected: {form.games.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* ── GUARDIAN ── */}
          {tab === 'guardian' && (
            <div className={styles.formGrid}>
              <div className={`${styles.fg} ${styles.fgFull}`}>
                <div className={styles.privacyNote}>🔒 Guardian info is private and never shown publicly. Used for event notifications and emergency contact only.</div>
              </div>
              <div className={styles.fg}>
                <label>Guardian Full Name</label>
                <input value={form.guardianName} onChange={e => set('guardianName', e.target.value)} placeholder="Karen Barnes" />
              </div>
              <div className={styles.fg}>
                <label>Guardian Phone</label>
                <input type="tel" value={form.guardianPhone} onChange={e => set('guardianPhone', e.target.value)} placeholder="605-555-0101" />
              </div>
              <div className={`${styles.fg} ${styles.fgFull}`}>
                <label>Guardian Email</label>
                <input type="email" value={form.guardianEmail} onChange={e => set('guardianEmail', e.target.value)} placeholder="parent@email.com" />
              </div>
            </div>
          )}

          {/* ── LOGIN ACCESS ── */}
          {tab === 'login' && (
            <div className={styles.formSection}>
              <div className={styles.loginToggleCard}>
                <div>
                  <div className={styles.loginToggleLabel}>Enable Login for this Player</div>
                  <div className={styles.loginToggleSub}>
                    Allow this youth player to log in with a username and PIN to view their own profile, teams, and tournament status. They cannot make purchases or edit org settings.
                  </div>
                </div>
                <button
                  className={`${styles.toggleSwitch} ${form.loginEnabled ? styles.toggleOn : ''}`}
                  onClick={() => set('loginEnabled', !form.loginEnabled)}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>

              {form.loginEnabled && (
                <div className={styles.loginFields}>
                  <div className={styles.fg}>
                    <label>Username</label>
                    <input value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g,''))} placeholder="tyler_b" />
                    <span className={styles.fieldHint}>Lowercase letters, numbers, and underscores only.</span>
                  </div>
                  <div className={styles.fg}>
                    <label>PIN <span className={styles.opt}>(4+ digits)</span></label>
                    <input type="password" inputMode="numeric" maxLength={8} value={form.pin} onChange={e => set('pin', e.target.value.replace(/\D/g,''))} placeholder="••••" />
                    <span className={styles.fieldHint}>Share this PIN privately with the player. They use username + PIN to log in.</span>
                  </div>
                  <div className={styles.loginPreview}>
                    <div className={styles.loginPreviewLabel}>Login preview:</div>
                    <code>Username: {form.username || 'not set'}</code>
                    <code>PIN: {form.pin ? '●'.repeat(form.pin.length) : 'not set'}</code>
                  </div>
                </div>
              )}

              {!form.loginEnabled && (
                <div className={styles.noLoginNote}>
                  This player will be managed entirely through your org manager account. They will not have their own login.
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className="btn btn-ghost" style={{ clipPath:'none', fontSize:'0.88rem' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.7rem 2rem' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Player →'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── PLAYER DETAIL CARD ────────────────────────────────────────────
function PlayerCard({ player, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${styles.playerCard} ${expanded ? styles.playerCardOpen : ''}`}>
      <div className={styles.cardMain} onClick={() => setExpanded(p => !p)}>
        <div className={styles.cardAvatar}>
          {player.firstName[0]}{player.lastName[0]}
        </div>
        <div className={styles.cardInfo}>
          <div className={styles.cardName}>{player.firstName} {player.lastName}</div>
          <div className={styles.cardTag}>@{player.displayName || player.firstName}</div>
          <div className={styles.cardMeta}>{player.grade} {player.age ? `· Age ${player.age}` : ''}</div>
        </div>
        <div className={styles.cardGames}>
          {player.games.slice(0, 3).map(g => (
            <span key={g} className={styles.gameTag}>{g}</span>
          ))}
          {player.games.length > 3 && <span className={styles.gameTagMore}>+{player.games.length - 3}</span>}
        </div>
        <div className={styles.cardBadges}>
          {player.loginEnabled && <Badge variant="gold">🔑 Login</Badge>}
          {player.teamIds?.length > 0 && <Badge variant="blue">🛡️ Team</Badge>}
          {player.tournamentIds?.length > 0 && <Badge variant="green">🏆 Registered</Badge>}
        </div>
        <div className={styles.expandArrow}>{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div className={styles.cardExpanded}>
          <div className={styles.expandGrid}>
            {player.guardianName && (
              <div className={styles.expandBlock}>
                <div className={styles.expandLabel}>Guardian</div>
                <div>{player.guardianName}</div>
                {player.guardianPhone && <div className={styles.expandSub}>{player.guardianPhone}</div>}
                {player.guardianEmail && <div className={styles.expandSub}>{player.guardianEmail}</div>}
              </div>
            )}
            {player.loginEnabled && (
              <div className={styles.expandBlock}>
                <div className={styles.expandLabel}>Login</div>
                <div>Username: <code>{player.username}</code></div>
                <div className={styles.expandSub}>PIN: ●●●●</div>
              </div>
            )}
            {player.notes && (
              <div className={`${styles.expandBlock} ${styles.expandFull}`}>
                <div className={styles.expandLabel}>Notes</div>
                <div className={styles.notesText}>{player.notes}</div>
              </div>
            )}
          </div>
          <div className={styles.expandActions}>
            <button className="btn btn-ghost" style={{ clipPath:'none', fontSize:'0.82rem', padding:'0.5rem 1.2rem' }} onClick={() => onEdit(player)}>
              ✏️ Edit
            </button>
            <button className={styles.deleteBtn} onClick={() => onDelete(player)}>
              🗑 Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────
export default function OrgPlayers() {
  const { user } = useAuth();
  const [org, setOrg]           = useState(null);
  const [players, setPlayers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [search, setSearch]     = useState('');
  const [filterGame, setFilterGame] = useState('all');

  const load = async () => {
    const myOrg = await orgsApi.getMyOrg(user?.id);
    setOrg(myOrg);
    if (myOrg) {
      const p = await orgsApi.getYouthPlayers(myOrg.id);
      setPlayers(p);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleSaved = (player, isNew) => {
    if (isNew) setPlayers(prev => [player, ...prev]);
    else setPlayers(prev => prev.map(p => p.id === player.id ? player : p));
    setShowForm(false);
    setEditPlayer(null);
  };

  const handleDelete = async (player) => {
    if (!window.confirm(`Delete ${player.firstName} ${player.lastName}'s profile? This cannot be undone.`)) return;
    await orgsApi.deleteYouthPlayer(player.id);
    setPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const handleEdit = (player) => { setEditPlayer(player); setShowForm(true); };

  const allGames = [...new Set(players.flatMap(p => p.games))];
  const filtered = players.filter(p => {
    const matchSearch = !search || `${p.firstName} ${p.lastName} ${p.displayName}`.toLowerCase().includes(search.toLowerCase());
    const matchGame   = filterGame === 'all' || p.games.includes(filterGame);
    return matchSearch && matchGame;
  });

  if (loading) return <Spinner />;

  return (
    <div className={styles.wrap}>

      <div className={styles.header}>
        <div>
          <h2>Youth Players</h2>
          <p>{org?.name} · {players.length} player{players.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditPlayer(null); setShowForm(true); }}>
          + Add Player
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <input
          className={styles.searchInput}
          placeholder="Search players..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className={styles.gameFilter} value={filterGame} onChange={e => setFilterGame(e.target.value)}>
          <option value="all">All Games</option>
          {allGames.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Player list */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>👦</div>
          <div className={styles.emptyTitle}>{players.length === 0 ? 'No players yet' : 'No players match your search'}</div>
          {players.length === 0 && (
            <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.7rem 2rem', marginTop:'1rem' }} onClick={() => setShowForm(true)}>
              Add Your First Player →
            </button>
          )}
        </div>
      ) : (
        <div className={styles.playerList}>
          {filtered.map(p => (
            <PlayerCard key={p.id} player={p} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showForm && (
        <PlayerFormModal
          orgId={org?.id}
          player={editPlayer}
          onClose={() => { setShowForm(false); setEditPlayer(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
