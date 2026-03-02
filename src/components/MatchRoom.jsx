import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { matchRoomApi, teamsApi, matchFlagApi } from '../api';
import { Spinner } from './UI';
import styles from './MatchRoom.module.css';

const SERIES_FORMATS = [
  { id: 'bo1', label: 'Best of 1', winsNeeded: 1 },
  { id: 'bo3', label: 'Best of 3', winsNeeded: 2 },
  { id: 'bo5', label: 'Best of 5', winsNeeded: 3 },
  { id: 'bo7', label: 'Best of 7', winsNeeded: 4 },
];

const ROLE_COLORS = { admin: '#ef4444', coach: '#1d4ed8', org_manager: '#7c3aed', player: '#059669', system: '#4a5a72' };
const ROLE_LABELS = { admin: 'Admin', coach: 'Coach', org_manager: 'Org', player: '', system: '' };

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── SCORE DISPLAY (game wins pips) ─────────────────────────────────
function SeriesScore({ games, format, team1, team2 }) {
  const fmt = SERIES_FORMATS.find(f => f.id === format) || SERIES_FORMATS[1];
  const confirmedGames = games.filter(g => g.confirmed);

  const t1Wins = confirmedGames.filter(g => g.winnerTeamId === team1?.id).length;
  const t2Wins = confirmedGames.filter(g => g.winnerTeamId === team2?.id).length;

  const pips = (wins, needed) => Array.from({ length: needed }, (_, i) => (
    <div key={i} className={`${styles.pip} ${i < wins ? styles.pipFilled : ''}`} />
  ));

  return (
    <div className={styles.seriesScore}>
      <div className={styles.seriesTeam}>
        <div className={styles.seriesTeamName}>{team1?.name || 'TBD'}</div>
        <div className={styles.seriesPips}>{pips(t1Wins, fmt.winsNeeded)}</div>
        <div className={styles.seriesWinCount}>{t1Wins}</div>
      </div>
      <div className={styles.seriesVs}>
        <div className={styles.seriesFormatLabel}>{fmt.label}</div>
        <div className={styles.seriesVsText}>VS</div>
        <div className={styles.seriesGamesPlayed}>{confirmedGames.length} game{confirmedGames.length !== 1 ? 's' : ''} played</div>
      </div>
      <div className={styles.seriesTeam}>
        <div className={styles.seriesTeamName}>{team2?.name || 'TBD'}</div>
        <div className={styles.seriesPips}>{pips(t2Wins, fmt.winsNeeded)}</div>
        <div className={styles.seriesWinCount}>{t2Wins}</div>
      </div>
    </div>
  );
}

// ── GAME HISTORY ────────────────────────────────────────────────────
function GameHistory({ games, team1, team2 }) {
  if (games.length === 0) return (
    <div className={styles.noGames}>No games played yet. Report the first game when you're ready.</div>
  );
  return (
    <div className={styles.gameHistory}>
      {games.map(g => {
        const winner = g.winnerTeamId === team1?.id ? team1 : team2;
        const loser  = g.winnerTeamId === team1?.id ? team2 : team1;
        return (
          <div key={g.gameNum} className={`${styles.gameRow} ${g.disputed ? styles.gameDisputed : g.confirmed ? styles.gameConfirmed : styles.gamePending}`}>
            <div className={styles.gameNum}>G{g.gameNum}</div>
            <div className={styles.gameResult}>
              <span className={styles.gameWinner}>🏆 {winner?.name || g.winnerTeamId}</span>
              <span className={styles.gameLoser}>def. {loser?.name || g.losingTeamId}</span>
            </div>
            <div className={styles.gameStatus}>
              {g.disputed ? <span className={styles.disputedTag}>⚠️ Disputed</span>
                : g.confirmed ? <span className={styles.confirmedTag}>✓ Confirmed</span>
                : <span className={styles.pendingTag}>⏳ Pending</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ROSTER STRIP ───────────────────────────────────────────────────
function RosterStrip({ team, fullTeam, side }) {
  if (!team) return <div className={styles.rosterStripEmpty}>TBD</div>;
  const members = fullTeam?.members || [];
  return (
    <div className={`${styles.rosterStrip} ${side === 'right' ? styles.rosterStripRight : ''}`}>
      <div className={styles.rosterTeamName}>{team.name}</div>
      {members.length > 0 ? (
        <div className={styles.rosterMembers}>
          {members.map(m => (
            <div key={m.id} className={styles.rosterMember}>
              <div className={styles.rosterAvatar} style={{ background: m.avatarColor || '#1d4ed8' }}>
                {m.initials}
              </div>
              <div className={styles.rosterMemberInfo}>
                <div className={styles.rosterMemberName}>{m.name}</div>
                {m.role && <div className={styles.rosterMemberRole}>{m.role}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.rosterNoMembers}>Roster not available</div>
      )}
    </div>
  );
}

// ── REPORT GAME PANEL ───────────────────────────────────────────────
function ReportGamePanel({ room, match, myTeam, onReport, onConfirm, onDispute, isAdmin, teamRosters = {} }) {
  const [winner, setWinner]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [disputeMode, setDisputeMode] = useState(null); // gameNum
  const [disputeReason, setDisputeReason] = useState('');

  const fmt   = SERIES_FORMATS.find(f => f.id === room.seriesFormat) || SERIES_FORMATS[1];
  const games = room.games || [];
  const confirmedGames = games.filter(g => g.confirmed);

  const team1 = match.team1;
  const team2 = match.team2;

  const t1Wins = confirmedGames.filter(g => g.winnerTeamId === team1?.id).length;
  const t2Wins = confirmedGames.filter(g => g.winnerTeamId === team2?.id).length;
  const seriesOver = t1Wins >= fmt.winsNeeded || t2Wins >= fmt.winsNeeded || room.status === 'complete';

  // Find unconfirmed game that opponent needs to confirm
  const pendingGame   = games.find(g => !g.confirmed && !g.disputed);
  const iReported     = pendingGame && pendingGame.reportingTeamId === myTeam?.id;
  const isParticipant = isAdmin || !!myTeam;
  const canConfirm    = pendingGame && !iReported && (isAdmin || (myTeam && pendingGame.reportingTeamId !== myTeam.id));
  // Always render the panel — show full UI for participants, observer view for others

  const handleReport = async () => {
    if (!winner) return;
    setSubmitting(true);
    const loser = winner === team1?.id ? team2?.id : team1?.id;
    await onReport(winner, loser);
    setWinner('');
    setSubmitting(false);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm(pendingGame.gameNum);
    setSubmitting(false);
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) return;
    setSubmitting(true);
    await onDispute(disputeMode, disputeReason);
    setDisputeMode(null);
    setDisputeReason('');
    setSubmitting(false);
  };

  if (seriesOver) return (
    <div className={styles.seriesComplete}>
      <div className={styles.seriesCompleteIcon}>🏆</div>
      <div className={styles.seriesCompleteTitle}>Series Complete</div>
      <div className={styles.seriesCompleteScore}>{t1Wins}–{t2Wins}</div>
      {isAdmin && <div className={styles.adminNote}>Update the bracket in the tournament bracket tab.</div>}
    </div>
  );

  return (
    <div className={styles.reportPanel}>
      {/* Pending confirmation */}
      {pendingGame && (
        <div className={styles.pendingConfirm}>
          <div className={styles.pendingConfirmHead}>
            <span className={styles.pendingIcon}>⏳</span>
            <div>
              <div className={styles.pendingTitle}>Game {pendingGame.gameNum} — Awaiting Confirmation</div>
              <div className={styles.pendingDetail}>
                Reported winner: <strong>{pendingGame.winnerTeamId === team1?.id ? team1?.name : team2?.name}</strong>
              </div>
            </div>
          </div>
          {canConfirm && (
            <div className={styles.confirmActions}>
              <button className={styles.confirmBtn} onClick={handleConfirm} disabled={submitting}>
                {submitting ? 'Confirming...' : '✓ Confirm Result'}
              </button>
              <button className={styles.disputeOpenBtn} onClick={() => setDisputeMode(pendingGame.gameNum)}>
                ⚠️ Dispute
              </button>
            </div>
          )}
          {iReported && (
            <div className={styles.waitingNote}>Waiting for your opponent to confirm this result.</div>
          )}
        </div>
      )}

      {/* Dispute form */}
      {disputeMode !== null && (
        <div className={styles.disputeForm}>
          <div className={styles.disputeTitle}>⚠️ Dispute Game {disputeMode}</div>
          <textarea
            className={styles.disputeInput}
            rows={3}
            placeholder="Describe the issue (e.g. 'Opponent reported wrong winner', 'Connection issues', 'Screenshot available')"
            value={disputeReason}
            onChange={e => setDisputeReason(e.target.value)}
          />
          <div className={styles.disputeActions}>
            <button className={styles.disputeSubmitBtn} onClick={handleDispute} disabled={submitting || !disputeReason.trim()}>
              Submit Dispute
            </button>
            <button className={styles.cancelBtn} onClick={() => { setDisputeMode(null); setDisputeReason(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Report next game — always show, gate submission by role */}
      {!pendingGame && !seriesOver && (
        <div className={styles.reportGame}>
          <div className={styles.reportTitle}>
            Game {games.length + 1} — {isParticipant ? 'Report Winner' : 'Waiting for Teams'}
          </div>
          <div className={styles.reportDesc}>
            {isParticipant
              ? 'Select the team that won this game, then submit. Your opponent must confirm before it counts.'
              : 'Only the participating teams or an admin can report game results.'}
          </div>
          {isParticipant ? (
            <>
              <div className={styles.matchRosters}>
                <RosterStrip team={team1} fullTeam={teamRosters[team1?.id]} side="left" />
                <div className={styles.rosterVsDivider}>VS</div>
                <RosterStrip team={team2} fullTeam={teamRosters[team2?.id]} side="right" />
              </div>
              <div className={styles.winnerPicker}>
                {[team1, team2].map(team => team && (
                  <button
                    key={team.id}
                    className={`${styles.winnerBtn} ${winner === team.id ? styles.winnerSelected : ''}`}
                    onClick={() => setWinner(prev => prev === team.id ? '' : team.id)}
                  >
                    {team.name}
                    {winner === team.id && <span className={styles.winnerCheck}>✓</span>}
                  </button>
                ))}
              </div>
              <button
                className={styles.submitGameBtn}
                onClick={handleReport}
                disabled={!winner || submitting}
              >
                {submitting ? 'Reporting...' : `Report Game ${games.length + 1} →`}
              </button>
            </>
          ) : (
            <div className={styles.observerNote}>
              <div className={styles.matchRosters}>
                <RosterStrip team={team1} fullTeam={teamRosters[team1?.id]} side="left" />
                <div className={styles.rosterVsDivider}>VS</div>
                <RosterStrip team={team2} fullTeam={teamRosters[team2?.id]} side="right" />
              </div>
              <p className={styles.observerMsg}>You are viewing this match as an observer. Game results will appear here once reported.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN MATCH ROOM ─────────────────────────────────────────────────
export default function MatchRoom({ match, tournament, myTeam, onClose }) {
  const { user, isAdmin } = useAuth();
  const [room, setRoom]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [teamRosters, setTeamRosters] = useState({}); // { [teamId]: fullTeamObj }
  const [tab, setTab]           = useState('chat');
  const [message, setMessage]   = useState('');
  const [sending, setSending]   = useState(false);
  const [polling, setPolling]   = useState(true);
  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);
  const lastMsgTs  = useRef(0);

  const [activeFlag, setActiveFlag] = useState(null); // existing flag if any
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [flagCategory, setFlagCategory] = useState('score_dispute');
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);

  // Resolve participation — check roster membership in addition to passed myTeam prop
  const t1Roster       = teamRosters[match.team1?.id];
  const t2Roster       = teamRosters[match.team2?.id];
  const userInT1       = t1Roster?.members?.some(m => m.id === user?.id);
  const userInT2       = t2Roster?.members?.some(m => m.id === user?.id);
  const resolvedMyTeam = myTeam || (userInT1 ? t1Roster : userInT2 ? t2Roster : null);
  const isParticipant  = isAdmin || !!resolvedMyTeam;

  // Load room + team rosters
  const loadRoom = useCallback(async () => {
    const r = await matchRoomApi.getRoom(tournament.id, match.id);
    setRoom(r);
    if (r.chat.length > 0) lastMsgTs.current = Math.max(...r.chat.map(m => m.ts));
    // Fetch full roster for both teams
    const teamIds = [match.team1?.id, match.team2?.id].filter(Boolean);
    if (teamIds.length > 0) {
      const fullTeams = await teamsApi.getByIds(teamIds);
      const map = {};
      fullTeams.forEach(t => { map[t.id] = t; });
      setTeamRosters(map);
    }
    // Load existing flag
    const flag = await matchFlagApi.getForMatch(match.id);
    setActiveFlag(flag);
    setLoading(false);
  }, [tournament.id, match.id, match.team1?.id, match.team2?.id]);

  useEffect(() => { loadRoom(); }, [loadRoom]);

  // Poll for new messages every 3s
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const newMsgs = await matchRoomApi.getMessages(match.id, lastMsgTs.current);
      if (newMsgs.length > 0) {
        setRoom(prev => {
          if (!prev) return prev;
          const existingIds = new Set(prev.chat.map(m => m.id));
          const fresh = newMsgs.filter(m => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          lastMsgTs.current = Math.max(...fresh.map(m => m.ts));
          return { ...prev, chat: [...prev.chat, ...fresh] };
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [match.id, polling]);

  // Auto-scroll chat
  useEffect(() => {
    if (tab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.chat, tab]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    const text = message.trim();
    setMessage('');
    await matchRoomApi.sendMessage(match.id, user.id, `${user.firstName} ${user.lastName}`, user.role, text);
    // Reload to get the new message
    const r = await matchRoomApi.getRoom(tournament.id, match.id);
    setRoom(r);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFormatChange = async (fmt) => {
    await matchRoomApi.setSeriesFormat(match.id, fmt);
    const r = await matchRoomApi.getRoom(tournament.id, match.id);
    setRoom(r);
  };

  const handleReportGame = async (winnerId, loserId) => {
    const reportingTeamId = myTeam?.id || user.id;
    await matchRoomApi.reportGame(match.id, reportingTeamId, winnerId, loserId);
    const r = await matchRoomApi.getRoom(tournament.id, match.id);
    setRoom(r);
  };

  const handleConfirmGame = async (gameNum) => {
    const confirmingTeamId = myTeam?.id || user.id;
    await matchRoomApi.confirmGame(match.id, gameNum, confirmingTeamId);
    const r = await matchRoomApi.getRoom(tournament.id, match.id);
    setRoom(r);
  };

  const handleDisputeGame = async (gameNum, reason) => {
    const disputingTeamId = myTeam?.id || user.id;
    await matchRoomApi.disputeGame(match.id, gameNum, disputingTeamId, reason);
    const r = await matchRoomApi.getRoom(tournament.id, match.id);
    setRoom(r);
  };

  const handleSubmitFlag = async () => {
    if (!flagReason.trim()) return;
    setFlagging(true);
    const context = tournament.id.startsWith('league') ? 'league' : 'tournament';
    const eventEndTs = tournament.endDate ? new Date(tournament.endDate).getTime() : null;
    await matchFlagApi.flag(match.id, context, resolvedMyTeam?.id || 'admin', user.id, flagReason, flagCategory, tournament.id, eventEndTs);
    const flag = await matchFlagApi.getForMatch(match.id);
    setActiveFlag(flag);
    setShowFlagForm(false);
    setFlagReason('');
    setFlagging(false);
    // System message in chat
    await matchRoomApi.sendMessage(match.id, 'sys', 'System', 'system', `🚩 Match flagged for admin review: "${flagReason}"`);
    const r = await matchRoomApi.getRoom(tournament.id, match.id);
    setRoom(r);
  };

  const handleResolveFlag = async () => {
    if (!activeFlag) return;
    const eventEndTs = tournament.endDate ? new Date(tournament.endDate).getTime() : null;
    await matchFlagApi.resolve(activeFlag.id, user.id, resolutionNote.trim() || 'Resolved by admin', eventEndTs);
    setActiveFlag(null);
    setResolutionNote('');
    await matchRoomApi.sendMessage(match.id, 'sys', 'System', 'system', '✅ Flag cleared by admin. Issue resolved.');
    const r = await matchRoomApi.getRoom(tournament.id, match.id);
    setRoom(r);
  };

  // Group chat messages by date
  const groupedChat = () => {
    if (!room) return [];
    const groups = [];
    let lastDate = null;
    room.chat.forEach(msg => {
      const d = formatDate(msg.ts);
      if (d !== lastDate) { groups.push({ type: 'date', label: d }); lastDate = d; }
      groups.push({ type: 'msg', msg });
    });
    return groups;
  };

  const fmt = SERIES_FORMATS.find(f => f.id === room?.seriesFormat) || SERIES_FORMATS[1];
  const t1Wins = (room?.games || []).filter(g => g.confirmed && g.winnerTeamId === match.team1?.id).length;
  const t2Wins = (room?.games || []).filter(g => g.confirmed && g.winnerTeamId === match.team2?.id).length;

  const matchComplete = match.status === 'complete' || room?.status === 'complete';

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.room}>

        {/* ── HEADER ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.tournName}>{tournament.name}</div>
            <div className={styles.matchLabel}>
              {match.roundName || 'Match'} · {match.team1?.name || 'TBD'} vs {match.team2?.name || 'TBD'}
            </div>
          </div>
          <div className={styles.headerRight}>
            {matchComplete
              ? <div className={styles.completeBadge}>✓ Complete</div>
              : <div className={styles.liveBadge}>🔴 Live</div>
            }
            {activeFlag && (
              <div className={styles.flagActiveBadge} title={`Flagged: ${activeFlag.reason}`}>
                🚩 Flagged
              </div>
            )}
            {!activeFlag && (isParticipant || isAdmin) && !matchComplete && (
              <button className={styles.flagTriggerBtn} onClick={() => setShowFlagForm(p => !p)} title="Flag match for admin">
                ⚑ Flag
              </button>
            )}
            {activeFlag && isAdmin && (
              <span className={styles.clearFlagHint}>↓ See resolve panel</span>
            )}
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ── SERIES SCORE BAR ── */}
        {loading ? <Spinner /> : (
          <SeriesScore
            games={room.games}
            format={room.seriesFormat}
            team1={match.team1}
            team2={match.team2}
          />
        )}

        {/* ── FLAG FORM ── */}
        {showFlagForm && (
          <div className={styles.flagForm}>
            <div className={styles.flagFormTitle}>🚩 Flag Match for Admin Review</div>
            <select className={styles.flagSelect} value={flagCategory} onChange={e => setFlagCategory(e.target.value)}>
              <option value="score_dispute">Score Dispute</option>
              <option value="player_conduct">Player Conduct</option>
              <option value="technical">Technical Issues</option>
              <option value="other">Other</option>
            </select>
            <textarea className={styles.flagTextarea} rows={2} placeholder="Describe the issue..." value={flagReason} onChange={e => setFlagReason(e.target.value)} />
            <div className={styles.flagActions}>
              <button className={styles.flagSubmitBtn} onClick={handleSubmitFlag} disabled={flagging || !flagReason.trim()}>
                {flagging ? 'Submitting...' : 'Submit Flag →'}
              </button>
              <button className={styles.cancelBtn} onClick={() => setShowFlagForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── ADMIN FLAG RESOLVE PANEL ── */}
        {activeFlag && isAdmin && (
          <div className={styles.resolvePanel}>
            <div className={styles.resolvePanelHead}>
              <span className={styles.resolvePanelIcon}>🚩</span>
              <div>
                <div className={styles.resolvePanelTitle}>Match Flagged by Player</div>
                <div className={styles.resolvePanelMeta}>
                  Category: <strong>{activeFlag.category?.replace('_', ' ')}</strong>
                  {' · '}Reported {new Date(activeFlag.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div className={styles.resolvePanelReason}>"{activeFlag.reason}"</div>
            <div className={styles.resolvePanelActions}>
              <input
                className={styles.resolvePanelInput}
                placeholder="Resolution note (optional)..."
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
              />
              <button className={styles.resolvePanelBtn} onClick={handleResolveFlag}>
                ✓ Mark Resolved
              </button>
            </div>
          </div>
        )}

        {/* ── SERIES FORMAT PICKER (admin only, or pre-match) ── */}
        {!loading && (isAdmin || (!matchComplete && !room.games?.length)) && (
          <div className={styles.formatBar}>
            <span className={styles.formatBarLabel}>Series Format:</span>
            {SERIES_FORMATS.map(f => (
              <button
                key={f.id}
                className={`${styles.fmtBtn} ${room.seriesFormat === f.id ? styles.fmtBtnOn : ''}`}
                onClick={() => handleFormatChange(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        {!loading && !isAdmin && room.games?.length > 0 && (
          <div className={styles.formatBar}>
            <span className={styles.formatBarLabel}>Series Format:</span>
            <span className={styles.formatBarValue}>{fmt.label}</span>
          </div>
        )}

        {/* ── TABS ── */}
        <div className={styles.tabs}>
          {[
            { id: 'chat',    label: `💬 Match Chat${room?.chat?.filter(m => !m.system).length > 0 ? ` (${room.chat.filter(m => !m.system).length})` : ''}` },
            { id: 'score',   label: '📊 Score Reporting' },
            { id: 'history', label: `🎮 Game History${room?.games?.length > 0 ? ` (${room.games.length})` : ''}` },
          ].map(t => (
            <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabOn : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB BODY ── */}
        <div className={styles.body}>

          {/* CHAT TAB */}
          {tab === 'chat' && (
            <div className={styles.chatWrap}>
              <div className={styles.chatMessages}>
                {loading ? <Spinner /> : groupedChat().map((item, i) => {
                  if (item.type === 'date') return (
                    <div key={`d${i}`} className={styles.dateDivider}><span>{item.label}</span></div>
                  );
                  const { msg } = item;
                  if (msg.system) return (
                    <div key={msg.id} className={styles.systemMsg}>{msg.text}</div>
                  );
                  const isMe = msg.userId === user?.id;
                  return (
                    <div key={msg.id} className={`${styles.msgRow} ${isMe ? styles.msgMe : ''}`}>
                      {!isMe && (
                        <div className={styles.msgAvatar} style={{ background: ROLE_COLORS[msg.role] || '#1d4ed8' }}>
                          {msg.userName?.slice(0,2).toUpperCase()}
                        </div>
                      )}
                      <div className={styles.msgBubble}>
                        {!isMe && (
                          <div className={styles.msgMeta}>
                            <span className={styles.msgName}>{msg.userName}</span>
                            {ROLE_LABELS[msg.role] && (
                              <span className={styles.msgRole} style={{ color: ROLE_COLORS[msg.role] }}>
                                {ROLE_LABELS[msg.role]}
                              </span>
                            )}
                          </div>
                        )}
                        <div className={styles.msgText}>{msg.text}</div>
                        <div className={styles.msgTime}>{formatTime(msg.ts)}</div>
                      </div>
                      {isMe && (
                        <div className={styles.msgAvatar} style={{ background: ROLE_COLORS[user?.role] || '#1d4ed8' }}>
                          {msg.userName?.slice(0,2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <div className={styles.chatInput}>
                <textarea
                  ref={inputRef}
                  className={styles.chatTextarea}
                  rows={2}
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <button
                  className={styles.sendBtn}
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                >
                  {sending ? '...' : '→'}
                </button>
              </div>
            </div>
          )}

          {/* SCORE REPORTING TAB */}
          {tab === 'score' && !loading && (
            <div className={styles.scoreTab}>
              {match.status === 'waiting' || !match.team1 || !match.team2 ? (
                <div className={styles.noTeamsNote}>Both teams must be confirmed before score reporting is available.</div>
              ) : (
                <ReportGamePanel
                  room={room}
                  match={match}
                  myTeam={resolvedMyTeam}
                  isAdmin={isAdmin}
                  onReport={handleReportGame}
                  onConfirm={handleConfirmGame}
                  onDispute={handleDisputeGame}
                  teamRosters={teamRosters}
                />
              )}

              {/* Admin override section */}
              {isAdmin && !matchComplete && (
                <AdminOverride match={match} room={room} onOverride={async (wId, s1, s2) => {
                  await matchRoomApi.adminSetWinner(match.id, wId, s1, s2);
                  const r = await matchRoomApi.getRoom(tournament.id, match.id);
                  setRoom(r);
                }} />
              )}
            </div>
          )}

          {/* GAME HISTORY TAB */}
          {tab === 'history' && !loading && (
            <div className={styles.historyTab}>
              <div className={styles.historySummary}>
                <div className={styles.historyTeam}>
                  <div className={styles.historyTeamName}>{match.team1?.name || 'TBD'}</div>
                  <div className={styles.historyWins}>{t1Wins} wins</div>
                </div>
                <div className={styles.historyDivider}>–</div>
                <div className={styles.historyTeam}>
                  <div className={styles.historyTeamName}>{match.team2?.name || 'TBD'}</div>
                  <div className={styles.historyWins}>{t2Wins} wins</div>
                </div>
              </div>
              <GameHistory games={room.games} team1={match.team1} team2={match.team2} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── ADMIN OVERRIDE PANEL ───────────────────────────────────────────
function AdminOverride({ match, room, onOverride }) {
  const [open, setOpen]     = useState(false);
  const [winner, setWinner] = useState('');
  const [s1, setS1]         = useState('');
  const [s2, setS2]         = useState('');
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!winner || s1 === '' || s2 === '') return;
    setSaving(true);
    await onOverride(winner, parseInt(s1), parseInt(s2));
    setSaving(false);
    setOpen(false);
  };

  if (!open) return (
    <div className={styles.adminOverrideToggle}>
      <button className={styles.adminOverrideBtn} onClick={() => setOpen(true)}>
        ⚙️ Admin Override — Set Match Result
      </button>
    </div>
  );

  return (
    <div className={styles.adminOverrideForm}>
      <div className={styles.adminOverrideTitle}>⚙️ Admin Override</div>
      <div className={styles.adminOverrideDesc}>Manually set the final series result. Use only to resolve disputes or technical issues.</div>
      <div className={styles.overridePicker}>
        {[match.team1, match.team2].map(team => team && (
          <button key={team.id} className={`${styles.winnerBtn} ${winner === team.id ? styles.winnerSelected : ''}`} onClick={() => setWinner(team.id)}>
            {team.name}
          </button>
        ))}
      </div>
      <div className={styles.overrideScores}>
        <div className={styles.fg}>
          <label>{match.team1?.name} wins</label>
          <input type="number" min="0" max="4" value={s1} onChange={e => setS1(e.target.value)} placeholder="0" />
        </div>
        <span className={styles.scoreDash}>–</span>
        <div className={styles.fg}>
          <label>{match.team2?.name} wins</label>
          <input type="number" min="0" max="4" value={s2} onChange={e => setS2(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className={styles.overrideActions}>
        <button className={styles.adminConfirmBtn} onClick={handle} disabled={saving || !winner}>
          {saving ? 'Saving...' : 'Confirm Override'}
        </button>
        <button className={styles.cancelBtn} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
