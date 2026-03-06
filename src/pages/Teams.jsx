import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamsApi, gameApi, fetchPlayers } from '../api';
import { Spinner, Badge } from '../components/UI';
import RoleGate from '../components/RoleGate';
import styles from './Teams.module.css';

function MemberAvatar({ member, size = 36 }) {
  return (
    <div className={styles.memberAvatar} style={{ width: size, height: size, background: member.avatarColor, fontSize: size * 0.38 }}>
      {member.initials}
    </div>
  );
}

function TeamCard({ team, myTeams, userId, onInvite, onLeave, onDelete, onViewRoster }) {
  const isCaptain = team.captainId === userId;
  const isMine    = isCaptain || team.members.some(m => m.id === userId);
  const full      = team.members.length >= team.maxSize;

  return (
    <div className={`${styles.teamCard} ${isMine ? styles.teamCardMine : ''}`}>
      {isMine && <div className={styles.myTeamBadge}>Your Team</div>}
      <div className={styles.teamHead}>
        <div>
          <div className={styles.teamName}>{team.name}</div>
          <div className={styles.teamGame}>{team.game}</div>
        </div>
        <div className={styles.teamRecord}>
          <span className={styles.wins}>{team.wins}W</span>
          <span className={styles.sep}>/</span>
          <span className={styles.losses}>{team.losses}L</span>
        </div>
      </div>

      <div className={styles.rosterRow}>
        <div className={styles.avatarStack}>
          {team.members.slice(0, 5).map(m => <MemberAvatar key={m.id} member={m} />)}
          {team.members.length > 5 && <div className={styles.moreMembers}>+{team.members.length - 5}</div>}
        </div>
        <div className={styles.rosterCount}>
          {team.members.length}/{team.maxSize} players
        </div>
      </div>

      <div className={styles.teamMeta}>
        <span className={`${styles.sizeTag} ${full ? styles.sizeTagFull : styles.sizeTagOpen}`}>
          {full ? '🔒 Full' : `${team.maxSize - team.members.length} spot${team.maxSize - team.members.length !== 1 ? 's' : ''} open`}
        </span>
        <span className={styles.captainTag}>Captain: {team.captainName}</span>
      </div>

      <div className={styles.teamActions}>
        <button className="btn btn-ghost" style={{ flex:1, fontSize:'0.8rem', clipPath:'none', padding:'0.5rem' }} onClick={() => onViewRoster(team)}>
          View Roster
        </button>
        <RoleGate allow="player">
          {isMine ? (
            isCaptain ? (
              <>
                <button className="btn btn-ghost" style={{ flex:1, fontSize:'0.8rem', clipPath:'none', padding:'0.5rem' }} onClick={() => onInvite(team)}>
                  + Invite
                </button>
                <button className={styles.dangerBtn} onClick={() => onDelete(team)}>Delete</button>
              </>
            ) : (
              <button className={styles.dangerBtn} onClick={() => onLeave(team)}>Leave</button>
            )
          ) : !full ? (
            <div className={styles.joinInfo}>Invite-only</div>
          ) : null}
        </RoleGate>
      </div>
    </div>
  );
}

function RosterModal({ team, userId, onClose, onKick }) {
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <div className={styles.modalTitle}>{team.name}</div>
            <div className={styles.modalSub}>{team.game} · {team.members.length}/{team.maxSize} players</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.rosterList}>
          {team.members.map(m => (
            <div key={m.id} className={styles.rosterMember}>
              <MemberAvatar member={m} size={42} />
              <div className={styles.rosterInfo}>
                <div className={styles.rosterName}>{m.name}</div>
                <div className={styles.rosterRole}>{m.role}</div>
              </div>
              {m.id === team.captainId && <span className={styles.captainBadge}>👑 Captain</span>}
              {team.captainId === userId && m.id !== userId && (
                <button className={styles.kickBtn} onClick={() => onKick(team.id, m.id)}>Remove</button>
              )}
            </div>
          ))}
        </div>

        {(team.pendingInvites || []).length > 0 && (
          <div className={styles.pendingSection}>
            <div className={styles.pendingTitle}>Pending Invites</div>
            {team.pendingInvites.map((inv, i) => (
              <div key={i} className={styles.pendingItem}>📧 {inv.email} <span>Sent {new Date(inv.sentAt).toLocaleDateString()}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateTeamModal({ user, onClose, onCreate, gameList = [] }) {
  const [name, setName]   = useState('');
  const [game, setGame]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return setError('Team name is required.');
    if (!game) return setError('Please select a game.');
    setLoading(true);
    const selectedGame = gameList.find(g => g.name === game);
    const res = await teamsApi.create({
      name: name.trim(), game,
      maxSize: selectedGame?.teamSize?.max || 5,
      captainId: user.id, captainName: `${user.firstName} ${user.lastName}`,
      captainInitials: user.initials, captainColor: user.avatarColor,
    });
    setLoading(false);
    if (res.success) onCreate(res.team);
    else setError(res.error || 'Failed to create team.');
  };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} style={{ maxWidth: 460 }}>
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}>Create a Team</div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.createBody}>
          <div className={styles.fg}>
            <label>Team Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rapid City Reapers" />
          </div>
          <div className={styles.fg}>
            <label>Game</label>
            <select value={game} onChange={e => setGame(e.target.value)}>
              <option value="">Select a game...</option>
              {gameList.map(g => (
                <option key={g.id} value={g.name}>{g.name} ({g.teamSize?.label})</option>
              ))}
            </select>
          </div>
          {game && (
            <div className={styles.sizeNote}>
              Team size for {game}: <strong>{gameList.find(g => g.name === game)?.teamSize?.label}</strong>
            </div>
          )}
          {error && <div className={styles.errorBox}>{error}</div>}
          <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.75rem', width:'100%' }} onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Team →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteModal({ team, onClose, onInvite }) {
  const [query, setQuery]       = useState('');
  const [players, setPlayers]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(false);
  const [sent, setSent]         = useState([]);
  const [error, setError]       = useState('');
  const searchTimeout           = useRef(null);
  const PAGE_SIZE               = 10;

  const load = async (q, p) => {
    setFetching(true);
    const res = await fetchPlayers({ query: q, page: p });
    setPlayers(res.players);
    setTotal(res.total);
    setFetching(false);
  };

  useEffect(() => { load('', 0); }, []);

  const handleSearch = (val) => {
    setQuery(val);
    setSelected(null);
    setPage(0);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => load(val, 0), 300);
  };

  const handlePage = (p) => { setPage(p); load(query, p); };

  const handleInvite = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    const res = await teamsApi.invitePlayer(team.id, selected.email, selected.id);
    setLoading(false);
    if (res.success) {
      setSent(prev => [...prev, selected.name]);
      setSelected(null);
      if (onInvite) onInvite();
    } else {
      setError(res.error || 'Failed to send invite.');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const isFull     = (team.members?.length ?? 0) >= team.maxSize;
  const alreadyIn  = new Set(team.members?.map(m => m.id) ?? []);

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} style={{ maxWidth: 480 }}>
        <div className={styles.modalHead}>
          <div>
            <div className={styles.modalTitle}>Invite a Player</div>
            <div className={styles.modalSub}>{team.name} · {team.members?.length ?? 0}/{team.maxSize} spots filled</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.createBody}>
          {sent.length > 0 && <div className={styles.successBox}>✓ Invite sent to: {sent.join(', ')}</div>}
          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.fg}>
            <label>Players ({total} registered)</label>
            <input value={query} onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name…" autoComplete="off" />
          </div>

          <div className={styles.playerList}>
            {fetching ? (
              <div className={styles.searchHint}>Loading…</div>
            ) : players.length === 0 ? (
              <div className={styles.searchHint}>No players found.</div>
            ) : players.map(p => {
              const onTeam    = alreadyIn.has(p.id);
              const isSelected = selected?.id === p.id;
              return (
                <div key={p.id}
                  className={`${styles.playerRow} ${isSelected ? styles.playerRowSelected : ''} ${onTeam ? styles.playerRowOnTeam : ''}`}
                  onClick={() => !onTeam && setSelected(isSelected ? null : p)}>
                  <div className={styles.playerRowInfo}>
                    <span className={styles.searchResultName}>{p.name}</span>
                    <span className={styles.searchResultEmail}>{p.email}</span>
                  </div>
                  {onTeam
                    ? <span className={styles.playerRowBadge}>On Team</span>
                    : isSelected
                      ? <span className={styles.playerRowBadge} style={{color:'var(--accent)'}}>Selected ✓</span>
                      : null}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} onClick={() => handlePage(page - 1)} disabled={page === 0}>‹</button>
              <span className={styles.pageInfo}>Page {page + 1} of {totalPages}</span>
              <button className={styles.pageBtn} onClick={() => handlePage(page + 1)} disabled={page >= totalPages - 1}>›</button>
            </div>
          )}

          <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.75rem', width:'100%', marginTop:'0.5rem' }}
            onClick={handleInvite} disabled={loading || isFull || !selected}>
            {isFull ? 'Team is Full' : loading ? 'Sending…' : selected ? `Invite ${selected.name} →` : 'Select a player to invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Teams() {
  const { user, isAdmin } = useAuth();
  const [teams, setTeams]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterGame, setFilterGame] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [inviteTeam, setInviteTeam] = useState(null);
  const [rosterTeam, setRosterTeam] = useState(null);

  const [gameList, setGameList]     = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteActing, setInviteActing]     = useState({});

  const load = () => teamsApi.getAll().then(d => { setTeams(d); setLoading(false); });
  const loadInvites = () => {
    if (user?.id) teamsApi.getPendingInvites(user.id).then(setPendingInvites);
  };
  useEffect(() => {
    load();
    loadInvites();
    gameApi.getActive().then(setGameList);
  }, []);

  const handleAcceptInvite = async (inv) => {
    setInviteActing(p => ({ ...p, [inv.id]: 'accepting' }));
    await teamsApi.acceptInvite(inv.id, inv.teamId, user.id,
      `${user.firstName} ${user.lastName}`, user.initials, user.avatarColor);
    setPendingInvites(prev => prev.filter(i => i.id !== inv.id));
    setInviteActing(p => ({ ...p, [inv.id]: null }));
    load();
  };

  const handleDeclineInvite = async (inv) => {
    setInviteActing(p => ({ ...p, [inv.id]: 'declining' }));
    await teamsApi.declineInvite(inv.id);
    setPendingInvites(prev => prev.filter(i => i.id !== inv.id));
    setInviteActing(p => ({ ...p, [inv.id]: null }));
  };

  const filtered = filterGame === 'all' ? teams : teams.filter(t => t.game === filterGame);

  const myTeams = teams.filter(t => t.captainId === user?.id || t.members?.some(m => m.id === user?.id));

  const handleDelete = async (team) => {
    if (!window.confirm(`Delete "${team.name}"? This cannot be undone.`)) return;
    await teamsApi.delete(team.id);
    setTeams(prev => prev.filter(t => t.id !== team.id));
  };

  const handleLeave = async (team) => {
    if (!window.confirm(`Leave "${team.name}"?`)) return;
    await teamsApi.removeMember(team.id, user.id);
    load();
  };

  const handleKick = async (teamId, memberId) => {
    if (!window.confirm('Remove this player from the team?')) return;
    await teamsApi.removeMember(teamId, memberId);
    load();
    setRosterTeam(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== memberId) } : null);
  };

  return (
    <div className={styles.wrap}>
      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h2>Teams</h2>
          <p>Create a team, invite your teammates, and register for tournaments together.</p>
        </div>
        <RoleGate allow={['player','admin']}>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Team</button>
        </RoleGate>
      </div>

      {/* PENDING INVITES */}
      {pendingInvites.length > 0 && (
        <div className={styles.myTeamsSection}>
          <div className={styles.sectionTitle}>Team Invites <span className={styles.count}>{pendingInvites.length}</span></div>
          <div className={styles.inviteCards}>
            {pendingInvites.map(inv => (
              <div key={inv.id} className={styles.pendingInviteCard}>
                <div className={styles.pendingInviteInfo}>
                  <div className={styles.pendingInviteName}>{inv.teamName}</div>
                  <div className={styles.pendingInviteMeta}>{inv.teamGame} · Captain: {inv.captainName}</div>
                </div>
                <div className={styles.pendingInviteActions}>
                  <button className={styles.acceptBtn}
                    onClick={() => handleAcceptInvite(inv)}
                    disabled={!!inviteActing[inv.id]}>
                    {inviteActing[inv.id] === 'accepting' ? '…' : 'Accept'}
                  </button>
                  <button className={styles.declineBtn}
                    onClick={() => handleDeclineInvite(inv)}
                    disabled={!!inviteActing[inv.id]}>
                    {inviteActing[inv.id] === 'declining' ? '…' : 'Decline'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MY TEAMS */}
      {myTeams.length > 0 && (
        <div className={styles.myTeamsSection}>
          <div className={styles.sectionTitle}>Your Teams</div>
          <div className={styles.grid}>
            {myTeams.map(t => (
              <TeamCard key={t.id} team={t} myTeams={myTeams} userId={user?.id}
                onInvite={setInviteTeam} onLeave={handleLeave} onDelete={handleDelete}
                onViewRoster={setRosterTeam}
              />
            ))}
          </div>
        </div>
      )}

      {/* GAME FILTER */}
      <div className={styles.filters}>
        <button className={`${styles.filterBtn} ${filterGame==='all' ? styles.filterOn : ''}`} onClick={() => setFilterGame('all')}>All Games</button>
        {gameList.map(g => (
          <button key={g.id} className={`${styles.filterBtn} ${filterGame===g.name ? styles.filterOn : ''}`} onClick={() => setFilterGame(g.name)}>{g.name}</button>
        ))}
      </div>

      {/* ALL TEAMS */}
      <div className={styles.sectionTitle}>
        All Teams {filterGame !== 'all' ? `— ${filterGame}` : ''}
        <span className={styles.count}>{filtered.length}</span>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎮</div>
          <div>No teams yet for {filterGame === 'all' ? 'any game' : filterGame}.</div>
          <div style={{ fontSize:'0.85rem', color:'var(--muted)', marginTop:'0.3rem' }}>Be the first — create a team!</div>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(t => (
            <TeamCard key={t.id} team={t} myTeams={myTeams} userId={user?.id}
              onInvite={setInviteTeam} onLeave={handleLeave} onDelete={handleDelete}
              onViewRoster={setRosterTeam}
            />
          ))}
        </div>
      )}

      {/* MODALS */}
      {showCreate && (
        <CreateTeamModal user={user} gameList={gameList} onClose={() => setShowCreate(false)} onCreate={() => { load(); setShowCreate(false); }} />
      )}
      {inviteTeam && (
        <InviteModal team={inviteTeam} onClose={() => setInviteTeam(null)} onInvite={load} />
      )}
      {rosterTeam && (
        <RosterModal team={rosterTeam} userId={user?.id} onClose={() => setRosterTeam(null)} onKick={handleKick} />
      )}
    </div>
  );
}
