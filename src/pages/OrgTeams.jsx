import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { orgsApi } from '../api';
import { Spinner } from '../components/UI';
import styles from './OrgTeams.module.css';

const YOUTH_GAMES = ['Minecraft Bedwars','Pokemon Unite','Fortnite','Rocket League','Smash Bros.','Mario Kart','Splatoon','Valorant','League of Legends','Roblox'];
const TEAM_SIZES  = { 'Minecraft Bedwars':4, 'Pokemon Unite':5, 'Fortnite':4, 'Rocket League':3, 'Smash Bros.':1, 'Mario Kart':4, 'Splatoon':4, 'Valorant':5, 'League of Legends':5, 'Roblox':4 };

function CreateTeamModal({ orgId, players, onClose, onCreate }) {
  const [name, setName]   = useState('');
  const [game, setGame]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !game) return setError('Team name and game are required.');
    setLoading(true);
    const res = await orgsApi.createYouthTeam(orgId, { name: name.trim(), game, maxSize: TEAM_SIZES[game] || 5 });
    setLoading(false);
    if (res.success) onCreate(res.team);
    else setError('Failed to create team.');
  };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}>Create Team</div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {error && <div className={styles.errorBox}>{error}</div>}
          <div className={styles.fg}><label>Team Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Pierre Phantoms" /></div>
          <div className={styles.fg}>
            <label>Game</label>
            <select value={game} onChange={e => setGame(e.target.value)}>
              <option value="">Select game...</option>
              {YOUTH_GAMES.map(g => <option key={g} value={g}>{g} (max {TEAM_SIZES[g] || 5})</option>)}
            </select>
          </div>
          {game && <div className={styles.sizeNote}>Team size for {game}: up to {TEAM_SIZES[game] || 5} players</div>}
        </div>
        <div className={styles.modalFooter}>
          <button className="btn btn-ghost" style={{ clipPath:'none' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.7rem 2rem' }} onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Team →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageRosterModal({ team, allPlayers, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const eligible = allPlayers.filter(p => p.games.includes(team.game));
  const members  = allPlayers.filter(p => team.memberIds.includes(p.id));

  const handleAdd = async (playerId) => {
    if (team.memberIds.length >= team.maxSize) return alert('Team is full!');
    setLoading(true);
    await orgsApi.addPlayerToTeam(team.id, playerId);
    onUpdate({ ...team, memberIds: [...team.memberIds, playerId] });
    setLoading(false);
  };

  const handleRemove = async (playerId) => {
    setLoading(true);
    await orgsApi.removePlayerFromTeam(team.id, playerId);
    onUpdate({ ...team, memberIds: team.memberIds.filter(id => id !== playerId) });
    setLoading(false);
  };

  const available = eligible.filter(p => !team.memberIds.includes(p.id));

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} style={{ maxWidth:520 }}>
        <div className={styles.modalHead}>
          <div>
            <div className={styles.modalTitle}>{team.name}</div>
            <div className={styles.modalSub}>{team.game} · {team.memberIds.length}/{team.maxSize} players</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.rosterSectionLabel}>Current Roster</div>
          {members.length === 0 ? (
            <div className={styles.emptyRoster}>No players on this team yet.</div>
          ) : members.map(p => (
            <div key={p.id} className={styles.rosterRow}>
              <div className={styles.rosterAvatar}>{p.firstName[0]}{p.lastName[0]}</div>
              <div className={styles.rosterInfo}>
                <div className={styles.rosterName}>{p.firstName} {p.lastName}</div>
                <div className={styles.rosterGrade}>{p.grade}</div>
              </div>
              <button className={styles.removeBtn} onClick={() => handleRemove(p.id)} disabled={loading}>Remove</button>
            </div>
          ))}

          {available.length > 0 && team.memberIds.length < team.maxSize && (
            <>
              <div className={styles.rosterSectionLabel} style={{ marginTop:'1.2rem' }}>Add Players</div>
              <div className={styles.availableNote}>Showing players who play {team.game}</div>
              {available.map(p => (
                <div key={p.id} className={styles.rosterRow}>
                  <div className={styles.rosterAvatar}>{p.firstName[0]}{p.lastName[0]}</div>
                  <div className={styles.rosterInfo}>
                    <div className={styles.rosterName}>{p.firstName} {p.lastName}</div>
                    <div className={styles.rosterGrade}>{p.grade}</div>
                  </div>
                  <button className={styles.addBtn} onClick={() => handleAdd(p.id)} disabled={loading}>+ Add</button>
                </div>
              ))}
            </>
          )}

          {eligible.length === 0 && (
            <div className={styles.noEligible}>No players in your org play {team.game}. Add the game to a player's profile first.</div>
          )}
        </div>
        <div className={styles.modalFooter}>
          <div />
          <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.65rem 1.8rem' }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default function OrgTeams() {
  const { user } = useAuth();
  const [org, setOrg]         = useState(null);
  const [teams, setTeams]     = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [manageTeam, setManageTeam]   = useState(null);

  const load = async () => {
    const myOrg = await orgsApi.getMyOrg(user?.id);
    setOrg(myOrg);
    if (myOrg) {
      const [t, p] = await Promise.all([orgsApi.getYouthTeams(myOrg.id), orgsApi.getYouthPlayers(myOrg.id)]);
      setTeams(t);
      setPlayers(p);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleDelete = async (team) => {
    if (!window.confirm(`Delete "${team.name}"?`)) return;
    await orgsApi.deleteYouthTeam(team.id);
    setTeams(prev => prev.filter(t => t.id !== team.id));
  };

  const handleTeamUpdate = (updated) => {
    setTeams(prev => prev.map(t => t.id === updated.id ? updated : t));
    if (manageTeam?.id === updated.id) setManageTeam(updated);
  };

  if (loading) return <Spinner />;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2>Youth Teams</h2>
          <p>{org?.name} · {teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Team</button>
      </div>

      {teams.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🛡️</div>
          <div className={styles.emptyTitle}>No teams yet</div>
          <p className={styles.emptySub}>Create a team and assign your players to get ready for tournaments.</p>
          <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.7rem 2rem', marginTop:'1rem' }} onClick={() => setShowCreate(true)}>Create First Team →</button>
        </div>
      ) : (
        <div className={styles.teamGrid}>
          {teams.map(team => {
            const members = players.filter(p => team.memberIds.includes(p.id));
            const full    = team.memberIds.length >= team.maxSize;
            return (
              <div key={team.id} className={styles.teamCard}>
                <div className={styles.teamHead}>
                  <div className={styles.teamName}>{team.name}</div>
                  <div className={styles.teamGame}>{team.game}</div>
                </div>
                <div className={styles.rosterPreview}>
                  {members.length === 0 ? (
                    <div className={styles.noMembers}>No players assigned yet</div>
                  ) : members.map(m => (
                    <div key={m.id} className={styles.memberChip}>
                      <div className={styles.chipAvatar}>{m.firstName[0]}{m.lastName[0]}</div>
                      <span>{m.firstName} {m.lastName[0]}.</span>
                    </div>
                  ))}
                </div>
                <div className={styles.teamFooter}>
                  <span className={`${styles.sizeTag} ${full ? styles.sizeTagFull : styles.sizeTagOpen}`}>
                    {team.memberIds.length}/{team.maxSize} {full ? '· Full' : '· Open'}
                  </span>
                  <div className={styles.teamActions}>
                    <button className="btn btn-ghost" style={{ clipPath:'none', fontSize:'0.8rem', padding:'0.4rem 0.9rem' }} onClick={() => setManageTeam(team)}>
                      Manage Roster
                    </button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(team)}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateTeamModal orgId={org?.id} players={players} onClose={() => setShowCreate(false)}
          onCreate={team => { setTeams(prev => [team, ...prev]); setShowCreate(false); }}
        />
      )}
      {manageTeam && (
        <ManageRosterModal team={manageTeam} allPlayers={players} onClose={() => setManageTeam(null)} onUpdate={handleTeamUpdate} />
      )}
    </div>
  );
}
