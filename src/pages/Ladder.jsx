import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ladderApi, HALO_MLG_SETTINGS } from '../api';
import { Spinner, Badge } from '../components/UI';
import styles from './Ladder.module.css';

// ── CONSTANTS ───────────────────────────────────────────────────────
const RANK_META = {
  Iron:     { color: '#9ca3af', icon: '🔩', gradient: 'linear-gradient(135deg,#374151,#6b7280)' },
  Bronze:   { color: '#b45309', icon: '🥉', gradient: 'linear-gradient(135deg,#78350f,#b45309)' },
  Silver:   { color: '#9ca3af', icon: '🥈', gradient: 'linear-gradient(135deg,#6b7280,#d1d5db)' },
  Gold:     { color: '#d97706', icon: '🥇', gradient: 'linear-gradient(135deg,#b45309,#fbbf24)' },
  Platinum: { color: '#06b6d4', icon: '💠', gradient: 'linear-gradient(135deg,#0e7490,#06b6d4)' },
  Diamond:  { color: '#6366f1', icon: '💎', gradient: 'linear-gradient(135deg,#4338ca,#818cf8)' },
  Onyx:     { color: '#a855f7', icon: '🔮', gradient: 'linear-gradient(135deg,#6d28d9,#c084fc)' },
};
const RANK_ORDER = ['Iron','Bronze','Silver','Gold','Platinum','Diamond','Onyx'];
const RANK_THRESHOLDS = { Iron:0,Bronze:200,Silver:500,Gold:900,Platinum:1400,Diamond:2000,Onyx:2800 };

function getRank(xp) {
  let rank = 'Iron';
  for (const tier of RANK_ORDER) if (xp >= RANK_THRESHOLDS[tier]) rank = tier;
  return rank;
}
function getNextRank(xp) {
  const rank = getRank(xp);
  const idx  = RANK_ORDER.indexOf(rank);
  if (idx === RANK_ORDER.length - 1) return null;
  return { name: RANK_ORDER[idx+1], xpNeeded: RANK_THRESHOLDS[RANK_ORDER[idx+1]] - xp };
}
function xpProgress(xp) {
  const rank = getRank(xp);
  const idx  = RANK_ORDER.indexOf(rank);
  const base = RANK_THRESHOLDS[rank];
  const next = idx < RANK_ORDER.length - 1 ? RANK_THRESHOLDS[RANK_ORDER[idx+1]] : base + 500;
  return Math.min(100, Math.round(((xp - base) / (next - base)) * 100));
}
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000)   return 'just now';
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}

// ── RANK BADGE ──────────────────────────────────────────────────────
function RankBadge({ xp, size = 'sm' }) {
  const rank = getRank(xp);
  const meta = RANK_META[rank];
  return (
    <div className={`${styles.rankBadge} ${styles[`rankBadge_${size}`]}`}
         style={{ background: meta.gradient }}>
      <span className={styles.rankIcon}>{meta.icon}</span>
      <span className={styles.rankName}>{rank}</span>
    </div>
  );
}

// ── XP BAR ──────────────────────────────────────────────────────────
function XpBar({ xp }) {
  const rank    = getRank(xp);
  const next    = getNextRank(xp);
  const pct     = xpProgress(xp);
  const meta    = RANK_META[rank];
  return (
    <div className={styles.xpBarWrap}>
      <div className={styles.xpBarTrack}>
        <div className={styles.xpBarFill} style={{ width:`${pct}%`, background: meta.color }} />
      </div>
      <div className={styles.xpBarLabels}>
        <span>{xp} XP</span>
        {next ? <span>{next.xpNeeded} XP to {next.name}</span> : <span>Max Rank</span>}
      </div>
    </div>
  );
}

// ── STANDINGS ROW ───────────────────────────────────────────────────
function StandingRow({ team, rank, isMyTeam }) {
  const rankMeta = RANK_META[getRank(team.xp)];
  return (
    <div className={`${styles.standRow} ${isMyTeam ? styles.standRowMine : ''}`}>
      <div className={styles.standPos}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
      </div>
      <div className={styles.standAvatar} style={{ background: team.color || '#1d4ed8' }}>
        {team.tag || team.name?.[0]}
      </div>
      <div className={styles.standInfo}>
        <div className={styles.standName}>{team.name} {isMyTeam && <span className={styles.youTag}>YOU</span>}</div>
        <XpBar xp={team.xp} />
      </div>
      <RankBadge xp={team.xp} />
      <div className={styles.standRecord}>
        <span className={styles.standW}>{team.wins}W</span>
        <span className={styles.standL}>{team.losses}L</span>
      </div>
      <div className={styles.standXp}>{team.xp.toLocaleString()} XP</div>
    </div>
  );
}

// ── REGISTER TEAM MODAL ─────────────────────────────────────────────
function RegisterModal({ seasonId, teamSize, onClose, onRegistered }) {
  const { user } = useAuth();
  const [name, setName]     = useState('');
  const [tag, setTag]       = useState('');
  const [color, setColor]   = useState('#1d4ed8');
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState('');

  const handle = async () => {
    if (!name.trim() || !tag.trim()) { setErr('Team name and tag are required.'); return; }
    setLoading(true);
    const res = await ladderApi.registerTeam(seasonId, teamSize, name.trim(), tag.trim(), user.id, color);
    if (res.success) { onRegistered(res.team); onClose(); }
    else { setErr(res.error || 'Failed to register.'); }
    setLoading(false);
  };

  const COLORS = ['#1d4ed8','#7c3aed','#059669','#ef4444','#f59e0b','#06b6d4','#ec4899'];

  return (
    <div className={styles.modalOverlay} onClick={e => e.target===e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Register {teamSize} Team</div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.fieldGroup}>
            <label>Team Name *</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Shadow Company" maxLength={30} />
          </div>
          <div className={styles.fieldGroup}>
            <label>Team Tag * (2–4 letters)</label>
            <input value={tag} onChange={e=>setTag(e.target.value.toUpperCase())} placeholder="SC" maxLength={4} />
          </div>
          <div className={styles.fieldGroup}>
            <label>Team Color</label>
            <div className={styles.colorPicker}>
              {COLORS.map(c => (
                <button key={c} className={`${styles.colorSwatch} ${color===c?styles.colorSwatchOn:''}`}
                  style={{ background:c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>
          {err && <div className={styles.err}>{err}</div>}
        </div>
        <div className={styles.modalFooter}>
          <button className="btn btn-ghost" style={{clipPath:'none'}} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{clipPath:'none'}} onClick={handle} disabled={loading}>
            {loading ? 'Registering...' : 'Register Team'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── QUEUE PANEL ─────────────────────────────────────────────────────
function QueuePanel({ myTeams, seasonId, onMatchFound }) {
  const [teamSize, setTeamSize]     = useState('4v4');
  const [format, setFormat]         = useState('bo3');
  const [queuing, setQueuing]       = useState(false);
  const [queuedTeamId, setQueuedTeamId] = useState(null);
  const [queueStatus, setQueueStatus]   = useState({});
  const [waitSecs, setWaitSecs]     = useState(0);
  const [err, setErr]               = useState('');
  const pollRef                     = useRef(null);
  const timerRef                    = useRef(null);

  const eligibleTeams = myTeams.filter(t => t.teamSize === teamSize);
  const myTeam = eligibleTeams[0];

  // Load queue counts
  useEffect(() => {
    const refresh = () => ladderApi.getQueueStatus().then(setQueueStatus);
    refresh();
    const iv = setInterval(refresh, 5000);
    return () => clearInterval(iv);
  }, []);

  // Poll while in queue
  useEffect(() => {
    if (!queuing || !queuedTeamId) return;
    pollRef.current = setInterval(async () => {
      const res = await ladderApi.pollQueue(queuedTeamId);
      if (res.match) {
        clearInterval(pollRef.current);
        clearInterval(timerRef.current);
        setQueuing(false);
        onMatchFound(res.match);
      }
    }, 2000);
    timerRef.current = setInterval(() => setWaitSecs(s => s+1), 1000);
    return () => { clearInterval(pollRef.current); clearInterval(timerRef.current); };
  }, [queuing, queuedTeamId, onMatchFound]);

  const handleQueue = async () => {
    if (!myTeam) { setErr(`You need a ${teamSize} team registered first.`); return; }
    setErr('');
    const res = await ladderApi.joinQueue(myTeam.id, format);
    if (!res.success) { setErr(res.error); return; }
    if (res.matched) {
      onMatchFound({ matchId: res.matchId });
    } else {
      setQueuing(true);
      setQueuedTeamId(myTeam.id);
      setWaitSecs(0);
    }
  };

  const handleLeave = async () => {
    if (queuedTeamId) await ladderApi.leaveQueue(queuedTeamId);
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
    setQueuing(false);
    setQueuedTeamId(null);
    setWaitSecs(0);
  };

  const fmtWait = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className={styles.queuePanel}>
      <div className={styles.queueTitle}>🎮 Find a Match</div>

      {queuing ? (
        <div className={styles.queueActive}>
          <div className={styles.queueSpinner}>
            <div className={styles.queuePulse} />
            <div className={styles.queuePulse2} />
          </div>
          <div className={styles.queueSearching}>Searching for opponent...</div>
          <div className={styles.queueWait}>{fmtWait(waitSecs)}</div>
          <div className={styles.queueMeta}>{teamSize} · {format.toUpperCase()} · MLG V8</div>
          <button className={styles.leaveQueueBtn} onClick={handleLeave}>Leave Queue</button>
        </div>
      ) : (
        <>
          <div className={styles.queueOptions}>
            <div className={styles.queueSection}>
              <div className={styles.queueLabel}>Team Size</div>
              <div className={styles.queueBtns}>
                {['2v2','4v4'].map(s => (
                  <button key={s} className={`${styles.queueOpt} ${teamSize===s?styles.queueOptOn:''}`}
                    onClick={() => setTeamSize(s)}>{s}</button>
                ))}
              </div>
            </div>
            <div className={styles.queueSection}>
              <div className={styles.queueLabel}>Series Format</div>
              <div className={styles.queueBtns}>
                {['bo3','bo5','bo7'].map(f => (
                  <button key={f} className={`${styles.queueOpt} ${format===f?styles.queueOptOn:''}`}
                    onClick={() => setFormat(f)}>{f.toUpperCase()}</button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.queueWaiting}>
            {['bo3','bo5','bo7'].map(f => {
              const count = queueStatus[`${teamSize}_${f}`] || 0;
              return count > 0 ? (
                <div key={f} className={styles.queueWaitingRow}>
                  <span className={styles.queueWaitingDot} />
                  <span>{count} team{count>1?'s':''} waiting · {teamSize} {f.toUpperCase()}</span>
                </div>
              ) : null;
            })}
          </div>

          {myTeam ? (
            <div className={styles.myQueueTeam}>
              <div className={styles.myQueueTeamAvatar} style={{ background: myTeam.color }}>{myTeam.tag}</div>
              <div>
                <div className={styles.myQueueTeamName}>{myTeam.name}</div>
                <RankBadge xp={myTeam.xp} />
              </div>
            </div>
          ) : (
            <div className={styles.noTeamNote}>Register a {teamSize} team to queue.</div>
          )}

          {err && <div className={styles.err}>{err}</div>}
          <button className={`${styles.findMatchBtn} ${!myTeam?styles.findMatchBtnDisabled:''}`}
            onClick={handleQueue} disabled={!myTeam}>
            🔍 Find Match
          </button>
        </>
      )}
    </div>
  );
}

// ── MAP POOL DISPLAY ────────────────────────────────────────────────
function MapPool({ format }) {
  const pool = HALO_MLG_SETTINGS.seriesPool[format] || [];
  const maps = HALO_MLG_SETTINGS.maps;
  return (
    <div className={styles.mapPool}>
      <div className={styles.mapPoolTitle}>Map Pool · {format.toUpperCase()}</div>
      <div className={styles.mapPoolList}>
        {pool.map((p, i) => {
          const map = maps.find(m => m.id === p.map);
          return (
            <div key={i} className={styles.mapPoolRow}>
              <div className={styles.mapGameNum}>G{i+1}</div>
              <div className={styles.mapName}>{map?.name}</div>
              <div className={styles.mapMode}>{p.mode}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── LADDER MATCH ROOM ───────────────────────────────────────────────
function LadderMatchRoom({ matchId, myTeams, onClose }) {
  const { user } = useAuth();
  const [room, setRoom]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState('');
  const [sending, setSending] = useState(false);
  const chatRef               = useRef(null);
  const pollRef               = useRef(null);

  const load = useCallback(async () => {
    const r = await ladderApi.getRoom(matchId);
    setRoom(r);
    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 3000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [room?.chat?.length]);

  if (loading) return <div className={styles.roomLoading}><Spinner /></div>;
  if (!room) return <div className={styles.roomLoading}>Match room not found.</div>;

  const myTeam   = myTeams.find(t => t.id === room.team1Id || t.id === room.team2Id);
  const myTeamId = myTeam?.id;
  const isTeam1  = myTeamId === room.team1Id;
  const oppName  = isTeam1 ? room.team2Name : room.team1Name;
  const myName   = isTeam1 ? room.team1Name : room.team2Name;

  const fmtMap   = { bo3:2, bo5:3, bo7:4 };
  const winsNeeded = fmtMap[room.seriesFormat] || 2;
  const confirmed  = room.games.filter(g => g.confirmed);
  const t1Wins     = confirmed.filter(g => g.winnerTeamId === room.team1Id).length;
  const t2Wins     = confirmed.filter(g => g.winnerTeamId === room.team2Id).length;
  const myWins     = isTeam1 ? t1Wins : t2Wins;
  const oppWins    = isTeam1 ? t2Wins : t1Wins;
  const isComplete = room.status === 'complete';
  const iWon       = isComplete && room.winnerId === myTeamId;
  const curGame    = room.games.length + 1;
  const curMap     = room.mapPool?.[room.games.length];
  const curMapName = curMap ? HALO_MLG_SETTINGS.maps.find(m=>m.id===curMap.map)?.name : null;

  const handleSend = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    await ladderApi.sendMessage(matchId, user.id, `${user.firstName} ${user.lastName}`, user.role, msg);
    setMsg('');
    await load();
    setSending(false);
  };

  const handleReport = async (winnerId, loserId) => {
    await ladderApi.reportGame(matchId, myTeamId, winnerId, loserId);
    await load();
  };

  const handleConfirm = async (gameNum) => {
    const res = await ladderApi.confirmGame(matchId, gameNum, myTeamId);
    await load();
    if (res.seriesComplete) setTimeout(load, 500);
  };

  const handleDispute = async (gameNum) => {
    const reason = window.prompt('Briefly describe the dispute:');
    if (!reason) return;
    await ladderApi.disputeGame(matchId, gameNum, myTeamId, reason);
    await load();
  };

  const lastUnconfirmed = [...room.games].reverse().find(g => !g.confirmed && !g.disputed);

  return (
    <div className={styles.roomOverlay}>
      <div className={styles.roomModal}>
        {/* Header */}
        <div className={styles.roomHeader}>
          <div className={styles.roomHeaderLeft}>
            <div className={styles.roomGameBadge}>Halo 3 · MLG {HALO_MLG_SETTINGS.version}</div>
            <div className={styles.roomMatchup}>{room.team1Name} vs {room.team2Name}</div>
            <div className={styles.roomMeta}>{room.seriesFormat.toUpperCase()} · {room.teamSize}</div>
          </div>
          <button className={styles.roomClose} onClick={onClose}>✕</button>
        </div>

        {/* Series score */}
        <div className={styles.roomScore}>
          <div className={`${styles.roomTeamScore} ${isTeam1?styles.roomTeamMine:''}`}>
            <div className={styles.roomTeamScoreName}>{room.team1Name}</div>
            <div className={styles.roomTeamScoreNum}>{t1Wins}</div>
            <div className={styles.roomScorePips}>
              {Array.from({length:winsNeeded},(_,i)=>(
                <div key={i} className={`${styles.pip} ${i<t1Wins?styles.pipOn:''}`} />
              ))}
            </div>
          </div>
          <div className={styles.roomScoreVs}>
            {isComplete ? (
              <div className={`${styles.seriesResult} ${iWon?styles.seriesWin:styles.seriesLoss}`}>
                {iWon ? '🏆 WIN' : '💀 LOSS'}
              </div>
            ) : (
              <div className={styles.roomVsText}>VS</div>
            )}
          </div>
          <div className={`${styles.roomTeamScore} ${!isTeam1?styles.roomTeamMine:''}`}>
            <div className={styles.roomTeamScoreName}>{room.team2Name}</div>
            <div className={styles.roomTeamScoreNum}>{t2Wins}</div>
            <div className={styles.roomScorePips}>
              {Array.from({length:winsNeeded},(_,i)=>(
                <div key={i} className={`${styles.pip} ${i<t2Wins?styles.pipOn:''}`} />
              ))}
            </div>
          </div>
        </div>

        {/* XP result banner */}
        {isComplete && room.xpAwarded && (
          <div className={`${styles.xpBanner} ${iWon?styles.xpBannerWin:styles.xpBannerLoss}`}>
            {iWon
              ? `+${room.xpAwarded.winner} XP — Victory!`
              : `-${room.xpAwarded.loser} XP — Defeat`}
          </div>
        )}

        {/* Current game / map */}
        {!isComplete && curMapName && (
          <div className={styles.curMapBar}>
            <span className={styles.curMapLabel}>Game {curGame}:</span>
            <span className={styles.curMapName}>{curMapName}</span>
            <span className={styles.curMapMode}>{curMap.mode}</span>
          </div>
        )}

        <div className={styles.roomBody}>
          {/* Left: game history + report */}
          <div className={styles.roomLeft}>
            <div className={styles.roomSectionTitle}>Game Log</div>
            <div className={styles.gameLog}>
              {room.games.length === 0 && (
                <div className={styles.noGames}>No games yet. Report Game 1 when ready.</div>
              )}
              {room.games.map(g => {
                const winName = g.winnerTeamId === room.team1Id ? room.team1Name : room.team2Name;
                const loseName = g.winnerTeamId === room.team1Id ? room.team2Name : room.team1Name;
                return (
                  <div key={g.gameNum} className={`${styles.gameLogRow} ${g.disputed?styles.gameDisputed:g.confirmed?styles.gameConfirmed:styles.gamePending}`}>
                    <div className={styles.gameLogNum}>G{g.gameNum}</div>
                    <div className={styles.gameLogInfo}>
                      {g.mapName && <div className={styles.gameLogMap}>{g.mapName} · {g.mode}</div>}
                      <div className={styles.gameLogResult}>
                        {g.disputed ? <span className={styles.disputedTag}>⚠️ Disputed</span>
                          : g.confirmed ? <span>🏆 {winName} def. {loseName}</span>
                          : <span className={styles.pendingTag}>⏳ Pending confirmation</span>}
                      </div>
                    </div>
                    {myTeamId && !g.confirmed && !g.disputed && g.reportingTeamId !== myTeamId && (
                      <div className={styles.gameLogActions}>
                        <button className={styles.confirmBtn} onClick={() => handleConfirm(g.gameNum)}>✓ Confirm</button>
                        <button className={styles.disputeBtn} onClick={() => handleDispute(g.gameNum)}>⚠ Dispute</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Report game */}
            {!isComplete && myTeamId && !lastUnconfirmed && (
              <div className={styles.reportSection}>
                <div className={styles.reportTitle}>Report Game {curGame} Result</div>
                <div className={styles.reportBtns}>
                  <button className={styles.reportWinBtn}
                    onClick={() => handleReport(myTeamId, isTeam1 ? room.team2Id : room.team1Id)}>
                    ✓ {myName} Won
                  </button>
                  <button className={styles.reportLossBtn}
                    onClick={() => handleReport(isTeam1 ? room.team2Id : room.team1Id, myTeamId)}>
                    ✕ {oppName} Won
                  </button>
                </div>
              </div>
            )}

            {/* Map pool reference */}
            <MapPool format={room.seriesFormat} />
          </div>

          {/* Right: chat */}
          <div className={styles.roomRight}>
            <div className={styles.roomSectionTitle}>Match Chat</div>
            <div className={styles.chat} ref={chatRef}>
              {room.chat.map(m => (
                <div key={m.id} className={`${styles.chatMsg} ${m.system?styles.chatSystem:''} ${m.userId===user.id?styles.chatMine:''}`}>
                  {!m.system && (
                    <div className={styles.chatMeta}>
                      <span className={styles.chatName}>{m.userName}</span>
                      <span className={styles.chatTime}>{new Date(m.ts).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</span>
                    </div>
                  )}
                  <div className={styles.chatBubble}>{m.text}</div>
                </div>
              ))}
            </div>
            <div className={styles.chatInput}>
              <input
                value={msg} onChange={e=>setMsg(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}}}
              />
              <button onClick={handleSend} disabled={!msg.trim()||sending}>{sending?'…':'→'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MODE SETTINGS MODAL ─────────────────────────────────────────────
function SettingsModal({ onClose }) {
  const [activeMode, setActiveMode] = useState('Slayer');
  const modes = HALO_MLG_SETTINGS.modes;
  const maps  = HALO_MLG_SETTINGS.maps;
  return (
    <div className={styles.modalOverlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={styles.modal} style={{maxWidth:640}}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Halo 3 MLG {HALO_MLG_SETTINGS.version} Settings</div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.settingsTabs}>
            {Object.keys(modes).map(m => (
              <button key={m} className={`${styles.settingsTab} ${activeMode===m?styles.settingsTabOn:''}`}
                onClick={()=>setActiveMode(m)}>{m}</button>
            ))}
            <button className={`${styles.settingsTab} ${activeMode==='maps'?styles.settingsTabOn:''}`}
              onClick={()=>setActiveMode('maps')}>Maps</button>
          </div>

          {activeMode === 'maps' ? (
            <div className={styles.settingsMaps}>
              {maps.map(map => (
                <div key={map.id} className={styles.settingsMapRow}>
                  <div className={styles.settingsMapName}>{map.name}</div>
                  <div className={styles.settingsMapModes}>{map.modes.join(' · ')}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.settingsMode}>
              <div className={styles.settingsModeHeader}>
                <div className={styles.settingsModeName}>{modes[activeMode].name}</div>
                <div className={styles.settingsModeMeta}>
                  <span>Score to Win: {modes[activeMode].scoreToWin}</span>
                  <span>Time Limit: {modes[activeMode].timeLimit}</span>
                </div>
              </div>
              <div className={styles.settingsList}>
                {modes[activeMode].settings.map((s,i) => (
                  <div key={i} className={styles.settingsItem}>
                    <span className={styles.settingsDot}>▸</span> {s}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ───────────────────────────────────────────────────────
export default function Ladder() {
  const { user } = useAuth();
  const [season, setSeason]       = useState(null);
  const [tab, setTab]             = useState('4v4');        // '2v2' | '4v4'
  const [innerTab, setInnerTab]   = useState('standings'); // 'standings' | 'recent' | 'settings'
  const [standings, setStandings] = useState([]);
  const [recent, setRecent]       = useState([]);
  const [myTeams, setMyTeams]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeRoom, setActiveRoom]     = useState(null); // matchId string

  const load = useCallback(async () => {
    try {
      const seasons = await ladderApi.getSeasons();
      const active  = seasons.find(s => s.active) || seasons[0];
      if (!active) { setLoading(false); return; }
      setSeason(active);
      const [stand, rec, mine] = await Promise.all([
        ladderApi.getStandings(active.id, tab),
        ladderApi.getRecentMatches(active.id, tab),
        ladderApi.getMyTeams(user?.id, active.id),
      ]);
      setStandings(stand);
      setRecent(rec);
      setMyTeams(mine);
    } catch (e) {
      console.error('Ladder load error:', e);
    } finally {
      setLoading(false);
    }
  }, [tab, user?.id]);

  useEffect(() => { load(); }, [load]);

  const myTeam = myTeams.find(t => t.teamSize === tab);

  if (loading) return <Spinner />;

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.pageTitle}>Seasonal Ladder</h2>
          <p className={styles.pageSub}>Halo 3 · MLG V8 · Ranked Matchmaking</p>
        </div>
        <div className={styles.topActions}>
          <button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>
            ⚙️ MLG Settings
          </button>
          {!myTeam ? (
            <button className="btn btn-primary" style={{clipPath:'none',fontSize:'0.88rem'}}
              onClick={() => setShowRegister(true)}>
              + Register {tab} Team
            </button>
          ) : (
            <div className={styles.myTeamChip} style={{ borderColor: myTeam.color }}>
              <div className={styles.myTeamChipAvatar} style={{ background: myTeam.color }}>{myTeam.tag}</div>
              <div>
                <div className={styles.myTeamChipName}>{myTeam.name}</div>
                <RankBadge xp={myTeam.xp} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Size tabs */}
      <div className={styles.sizeTabs}>
        {['4v4','2v2'].map(s => (
          <button key={s} className={`${styles.sizeTab} ${tab===s?styles.sizeTabOn:''}`}
            onClick={() => setTab(s)}>{s}</button>
        ))}
      </div>

      <div className={styles.layout}>
        {/* Left: standings + recent */}
        <div className={styles.main}>
          <div className={styles.innerTabs}>
            {[['standings','🏆 Standings'],['recent','🕐 Recent Matches'],['pool','🗺️ Map Pool']].map(([id,label]) => (
              <button key={id} className={`${styles.innerTab} ${innerTab===id?styles.innerTabOn:''}`}
                onClick={() => setInnerTab(id)}>{label}</button>
            ))}
          </div>

          {innerTab === 'standings' && (
            <div className={styles.standingsWrap}>
              <div className={styles.standHeader}>
                <div className={styles.standPos}>#</div>
                <div />
                <div>Team</div>
                <div>Rank</div>
                <div>Record</div>
                <div>XP</div>
              </div>
              {standings.length === 0 ? (
                <div className={styles.empty}>No teams registered for {tab} yet.</div>
              ) : standings.map((t,i) => (
                <StandingRow key={t.id} team={t} rank={i+1}
                  isMyTeam={myTeams.some(m => m.id === t.id)} />
              ))}
            </div>
          )}

          {innerTab === 'recent' && (
            <div className={styles.recentList}>
              {recent.length === 0 && <div className={styles.empty}>No matches played yet.</div>}
              {recent.map(m => (
                <div key={m.id} className={styles.recentRow}>
                  <div className={styles.recentTeams}>
                    <span className={m.winnerId===m.team1Id?styles.recentWinner:''}>{m.team1Name}</span>
                    <span className={styles.recentVs}>vs</span>
                    <span className={m.winnerId===m.team2Id?styles.recentWinner:''}>{m.team2Name}</span>
                  </div>
                  <div className={styles.recentMeta}>
                    <Badge variant="blue">{m.seriesFormat.toUpperCase()}</Badge>
                    <span>{m.games} games</span>
                    <span>+{m.xpAwarded?.winner} / -{m.xpAwarded?.loser} XP</span>
                    <span className={styles.recentTime}>{timeAgo(m.completedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {innerTab === 'pool' && (
            <div className={styles.poolTab}>
              {['bo3','bo5','bo7'].map(f => <MapPool key={f} format={f} />)}
            </div>
          )}
        </div>

        {/* Right: queue */}
        <div className={styles.sidebar}>
          <QueuePanel
            myTeams={myTeams}
            seasonId={season?.id}
            onMatchFound={(match) => setActiveRoom(match.matchId || match.id)}
          />

          {/* Rank info */}
          <div className={styles.rankInfo}>
            <div className={styles.rankInfoTitle}>Rank Tiers</div>
            {RANK_ORDER.slice().reverse().map(r => {
              const meta = RANK_META[r];
              return (
                <div key={r} className={styles.rankInfoRow}>
                  <span className={styles.rankInfoIcon}>{meta.icon}</span>
                  <span className={styles.rankInfoName}>{r}</span>
                  <span className={styles.rankInfoXp}>{RANK_THRESHOLDS[r].toLocaleString()} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showRegister && season && (
        <RegisterModal
          seasonId={season.id} teamSize={tab}
          onClose={() => setShowRegister(false)}
          onRegistered={() => { setShowRegister(false); load(); }}
        />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {activeRoom && (
        <LadderMatchRoom
          matchId={activeRoom}
          myTeams={myTeams}
          onClose={() => { setActiveRoom(null); load(); }}
        />
      )}
    </div>
  );
}
