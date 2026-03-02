import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tournamentsApi, teamsApi, matchFlagApi, BRACKET_FORMATS } from '../api';
import { Spinner, Badge } from '../components/UI';
import RoleGate from '../components/RoleGate';
import MatchRoom from '../components/MatchRoom';
import styles from './Tournaments.module.css';

const FORMAT_LABELS = {
  single_elim: 'Single Elimination',
  double_elim: 'Double Elimination',
  round_robin: 'Round Robin',
  swiss: 'Swiss',
  group_stage: 'Group Stage + Playoffs',
};
const PHASE_COLORS = { registration: 'gold', bracket: 'green', complete: 'blue' };

// ─── BRACKET COMPONENT ───────────────────────────────────────────
function MatchBox({ match, myTeamIds, onReport, onConfirm, pendingReport, onOpenRoom, flag, isAdmin }) {
  const [showScore, setShowScore] = useState(false);
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');

  const isMyTeam = t => myTeamIds.includes(t?.id);
  const canReport = match.status === 'pending' && (isMyTeam(match.team1) || isMyTeam(match.team2)) && !pendingReport;
  const canConfirm = pendingReport && isMyTeam(match.team1 || match.team2) && !myTeamIds.includes(pendingReport?.reportingTeamId);

  if (!match.team1 || match.status === 'waiting') {
    return (
      <div className={styles.matchBox + ' ' + styles.matchWaiting}>
        <div className={styles.matchSlot}><span className={styles.tbd}>TBD</span></div>
        <div className={styles.matchVs}>VS</div>
        <div className={styles.matchSlot}><span className={styles.tbd}>TBD</span></div>
      </div>
    );
  }

  return (
    <div className={`${styles.matchBox} ${match.status === 'complete' ? styles.matchComplete : match.status === 'pending' ? styles.matchPending : ''} ${flag ? styles.matchFlagged : ''}`}>
      {flag && (
        <div className={styles.flagIndicator} title={`Flagged: ${flag.reason} (${flag.category?.replace('_',' ')})`}>
          🚩 {flag.category?.replace('_',' ')}
        </div>
      )}
      {flag && isAdmin && (
        <div className={styles.flagReasonBar}>
          <span className={styles.flagReasonText}>"{flag.reason}"</span>
        </div>
      )}
      <div className={`${styles.matchSlot} ${match.winner === match.team1?.id ? styles.slotWinner : match.winner ? styles.slotLoser : ''}`}>
        <span className={styles.teamName}>{match.team1?.name || 'TBD'}</span>
        {match.score1 !== null && <span className={styles.score}>{match.score1}</span>}
      </div>
      <div className={styles.matchVs}>{match.status === 'complete' ? '✓' : 'VS'}</div>
      <div className={`${styles.matchSlot} ${match.winner === match.team2?.id ? styles.slotWinner : match.winner ? styles.slotLoser : ''}`}>
        <span className={styles.teamName}>{match.team2?.name || 'TBD'}</span>
        {match.score2 !== null && <span className={styles.score}>{match.score2}</span>}
      </div>

      {pendingReport && !canConfirm && (
        <div className={styles.matchPendingNote}>⏳ Waiting for opponent confirmation ({pendingReport.score1} – {pendingReport.score2})</div>
      )}

      {canConfirm && (
        <button className={styles.confirmBtn} onClick={() => onConfirm(match.id)}>
          ✓ Confirm Score ({pendingReport.score1} – {pendingReport.score2})
        </button>
      )}

      {canReport && !showScore && (
        <button className={styles.reportBtn} onClick={() => setShowScore(true)}>Report Score</button>
      )}
      {showScore && canReport && (
        <div className={styles.scoreForm}>
          <input type="number" min="0" max="99" placeholder="0" value={s1} onChange={e => setS1(e.target.value)} />
          <span>–</span>
          <input type="number" min="0" max="99" placeholder="0" value={s2} onChange={e => setS2(e.target.value)} />
          <button onClick={() => { onReport(match.id, s1, s2); setShowScore(false); }}>Submit</button>
          <button onClick={() => setShowScore(false)}>✕</button>
        </div>
      )}
      {match.status !== 'waiting' && match.team1 && match.team2 && (
        <button className={styles.roomBtn} onClick={() => onOpenRoom(match)}>
          💬 Match Room
        </button>
      )}
    </div>
  );
}

function BracketView({ tournament, myTeamIds, onReport, onConfirm, pendingReports, onOpenRoom, activeFlags, isAdmin }) {
  if (!tournament.bracketData) {
    return <div className={styles.noBracket}>Bracket will appear here once the tournament starts.</div>;
  }
  return (
    <div className={styles.bracketScroll}>
      <div className={styles.bracket}>
        {tournament.bracketData.rounds.map(round => (
          <div key={round.round} className={styles.bracketRound}>
            <div className={styles.roundName}>{round.name}</div>
            <div className={styles.roundMatches}>
              {round.matches.map(match => (
                <MatchBox
                  key={match.id} match={{ ...match, roundName: round.name }}
                  myTeamIds={myTeamIds}
                  onReport={(matchId, s1, s2) => onReport(tournament.id, matchId, s1, s2)}
                  onConfirm={(matchId) => onConfirm(tournament.id, matchId)}
                  pendingReport={pendingReports[match.id] || null}
                  onOpenRoom={onOpenRoom}
                  flag={activeFlags?.[match.id] || null}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TOURNAMENT DETAIL MODAL ─────────────────────────────────────
function TournamentDetail({ tournament, myTeams, onClose, onRegister, onStart, onReport, onConfirm, pendingReports, loading, onOpenRoom, activeFlags }) {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState(tournament.phase === 'bracket' ? 'bracket' : 'info');
  const myTeamIds = myTeams.map(t => t.id);
  const registeredMyTeam = myTeams.find(t => tournament.registeredTeams.includes(t.id) && t.game === tournament.game);
  const eligibleTeams = myTeams.filter(t => t.game === tournament.game);

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.detailModal}>
        <div className={styles.detailHead}>
          <div>
            <div className={styles.detailTitle}>{tournament.name}</div>
            <div className={styles.detailMeta}>
              <Badge variant={PHASE_COLORS[tournament.phase] || 'blue'}>{tournament.phase === 'registration' ? 'Registration Open' : tournament.phase === 'bracket' ? 'In Progress' : 'Complete'}</Badge>
              <span>{tournament.game}</span>
              <span>·</span>
              <span>{FORMAT_LABELS[tournament.format]}</span>
              <span>·</span>
              <span>{tournament.date} {tournament.time}</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.detailTabs}>
          {['info','bracket','teams'].map(t => (
            <button key={t} className={`${styles.dtab} ${tab===t ? styles.dtabOn : ''}`} onClick={() => setTab(t)}>
              {t === 'info' ? 'Info' : t === 'bracket' ? '🏆 Bracket' : '👥 Teams'}
            </button>
          ))}
        </div>

        <div className={styles.detailBody}>
          {tab === 'info' && (
            <div className={styles.infoTab}>
              <div className={styles.infoGrid}>
                <div className={styles.infoBox}><span>Prize</span><strong>{tournament.prize}</strong></div>
                <div className={styles.infoBox}><span>Format</span><strong>{FORMAT_LABELS[tournament.format]}</strong></div>
                <div className={styles.infoBox}><span>Teams</span><strong>{tournament.registeredTeams.length}/{tournament.maxTeams}</strong></div>
                <div className={styles.infoBox}><span>Team Size</span><strong>{tournament.minTeamSize === tournament.maxTeamSize ? `${tournament.minTeamSize} players` : `${tournament.minTeamSize}–${tournament.maxTeamSize} players`}</strong></div>
              </div>
              <p className={styles.description}>{tournament.description}</p>

              {tournament.phase === 'registration' && (
                <RoleGate allow="player">
                  {registeredMyTeam ? (
                    <div className={styles.registeredNote}>✓ <strong>{registeredMyTeam.name}</strong> is registered for this tournament!</div>
                  ) : eligibleTeams.length > 0 ? (
                    <div className={styles.registerSection}>
                      <div className={styles.registerLabel}>Register with your team:</div>
                      {eligibleTeams.map(t => (
                        <button key={t.id} className="btn btn-primary" style={{ clipPath:'none', padding:'0.7rem 1.5rem', marginRight:'0.5rem' }} onClick={() => onRegister(tournament.id, t.id)} disabled={loading}>
                          Register {t.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.noTeamNote}>You need a {tournament.game} team to register. <br/>Go to the Teams page to create one.</div>
                  )}
                </RoleGate>
              )}

              <AdminOnly>
                {tournament.phase === 'registration' && tournament.registeredTeams.length >= 2 && (
                  <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.7rem 2rem', marginTop:'1rem' }} onClick={() => onStart(tournament.id)} disabled={loading}>
                    🚀 Start Tournament & Seed Bracket
                  </button>
                )}
              </AdminOnly>
            </div>
          )}

          {tab === 'bracket' && (
            <BracketView
              tournament={tournament}
              myTeamIds={myTeamIds}
              onReport={onReport}
              onConfirm={onConfirm}
              pendingReports={pendingReports}
              onOpenRoom={onOpenRoom}
            />
          )}

          {tab === 'teams' && (
            <div className={styles.teamsTab}>
              <div className={styles.teamsCount}>{tournament.registeredTeams.length} of {tournament.maxTeams} teams registered</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${(tournament.registeredTeams.length / tournament.maxTeams) * 100}%` }} />
              </div>
              <div className={styles.teamsList}>
                {tournament.registeredTeams.map((teamId, i) => (
                  <div key={teamId} className={styles.teamsListItem}>
                    <div className={styles.teamSeed}>#{i + 1}</div>
                    <div className={styles.teamListName}>{teamId}</div>
                    {myTeams.some(t => t.id === teamId) && <span className={styles.yourTeamTag}>Your Team</span>}
                  </div>
                ))}
                {tournament.registeredTeams.length === 0 && <div className={styles.noTeamsYet}>No teams registered yet. Be the first!</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Need AdminOnly helper here
function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : null;
}

// ─── MAIN PAGE ───────────────────────────────────────────────────
export default function Tournaments() {
  const { user, isAdmin } = useAuth();
  const [tournaments, setTournaments]   = useState([]);
  const [myTeams, setMyTeams]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selected, setSelected]         = useState(null);
  const [pendingReports, setPendingReports] = useState({});
  const [filterPhase, setFilterPhase]   = useState('all');
  const [matchRoom, setMatchRoom]       = useState(null); // { match, tournament }
  const [activeFlags, setActiveFlags]   = useState({}); // matchId -> flag

  const load = async () => {
    const [ts, teams] = await Promise.all([
      tournamentsApi.getAll(),
      user ? teamsApi.getMyTeams(user.id) : Promise.resolve([]),
    ]);
    setTournaments(ts);
    setMyTeams(teams);
    // Load active flags for admin visibility
    const flags = await matchFlagApi.getActive();
    const flagMap = {};
    flags.forEach(f => { flagMap[f.matchId] = f; });
    setActiveFlags(flagMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleRegister = async (tId, teamId) => {
    setActionLoading(true);
    const res = await tournamentsApi.register(tId, teamId);
    if (res.success) { await load(); setSelected(prev => prev ? { ...prev, registeredTeams: [...prev.registeredTeams, teamId] } : prev); }
    else alert(res.error);
    setActionLoading(false);
  };

  const handleStart = async (tId) => {
    setActionLoading(true);
    const res = await tournamentsApi.start(tId);
    if (res.success) { await load(); setSelected(res.tournament); }
    setActionLoading(false);
  };

  const handleReport = async (tId, matchId, s1, s2) => {
    const reportingTeamId = myTeams.find(t => t.game === selected?.game)?.id || 'unknown';
    await tournamentsApi.reportScore(tId, matchId, reportingTeamId, parseInt(s1), parseInt(s2));
    setPendingReports(prev => ({ ...prev, [matchId]: { reportingTeamId, score1: parseInt(s1), score2: parseInt(s2) } }));
  };

  const handleConfirm = async (tId, matchId) => {
    const confirmingTeamId = myTeams.find(t => t.game === selected?.game)?.id || 'unknown';
    await tournamentsApi.confirmScore(tId, matchId, confirmingTeamId);
    setPendingReports(prev => { const n = {...prev}; delete n[matchId]; return n; });
    await load();
    const updated = tournaments.find(t => t.id === tId);
    if (updated) {
      setSelected(updated);
      // If tournament just completed, stamp the eventEndDate on all its flags for 1-week retention
      if (updated.phase === 'complete') {
        await matchFlagApi.setEventEndDate(tId, Date.now());
      }
    }
  };

  const filtered = filterPhase === 'all' ? tournaments : tournaments.filter(t => t.phase === filterPhase);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2>Tournaments & Events</h2>
          <p>Register your team, track brackets, and report scores.</p>
        </div>
        <RoleGate allow="admin">
          <button className="btn btn-primary" onClick={() => alert('Create tournament — see Admin panel')}>+ Create Tournament</button>
        </RoleGate>
      </div>

      <div className={styles.filters}>
        {[['all','All'],['registration','Registration Open'],['bracket','In Progress'],['complete','Completed']].map(([val,label]) => (
          <button key={val} className={`${styles.filterBtn} ${filterPhase===val ? styles.filterOn : ''}`} onClick={() => setFilterPhase(val)}>{label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div className={styles.grid}>
          {filtered.map(t => {
            const myRegistered = myTeams.some(tm => t.registeredTeams.includes(tm.id));
            return (
              <div key={t.id} className={`${styles.card} ${t.phase === 'bracket' ? styles.cardActive : ''} ${myRegistered ? styles.cardMine : ''}`}>
                <div className={styles.cardTopRow}>
                  <Badge variant={PHASE_COLORS[t.phase] || 'blue'}>
                    {t.phase === 'registration' ? 'Open' : t.phase === 'bracket' ? '🔴 Live' : 'Complete'}
                  </Badge>
                  {myRegistered && <span className={styles.registeredTag}>✓ Registered</span>}
                  <span className={styles.formatTag}>{FORMAT_LABELS[t.format]}</span>
                </div>
                <div className={styles.cardName}>{t.name}</div>
                <div className={styles.cardGame}>{t.game}</div>
                <div className={styles.cardMeta}>
                  <div><span>Date</span><strong>{t.date}</strong></div>
                  <div><span>Prize</span><strong className={styles.prize}>{t.prize}</strong></div>
                  <div><span>Teams</span><strong>{t.registeredTeams.length}/{t.maxTeams}</strong></div>
                </div>
                <div className={styles.teamBar}>
                  <div className={styles.teamBarFill} style={{ width: `${(t.registeredTeams.length / t.maxTeams) * 100}%` }} />
                </div>
                <button
                  className={`btn ${t.phase === 'bracket' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize:'0.85rem', padding:'0.6rem 1.2rem', clipPath:'none', marginTop:'auto' }}
                  onClick={() => setSelected(t)}
                >
                  {t.phase === 'bracket' ? 'View Bracket →' : 'View & Register →'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <TournamentDetail
          tournament={selected}
          myTeams={myTeams}
          loading={actionLoading}
          onClose={() => setSelected(null)}
          onRegister={handleRegister}
          onStart={handleStart}
          onReport={handleReport}
          onConfirm={handleConfirm}
          pendingReports={pendingReports}
          onOpenRoom={(match) => setMatchRoom({ match, tournament: selected })}
        />
      )}

      {matchRoom && (
        <MatchRoom
          match={matchRoom.match}
          tournament={matchRoom.tournament}
          myTeam={myTeams.find(t => t.game === matchRoom.tournament.game)}
          onClose={() => setMatchRoom(null)}
        />
      )}
    </div>
  );
}
