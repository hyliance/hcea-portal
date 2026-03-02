import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { cashMatchApi, teamsApi, GAME_TEAM_SIZES } from '../api';
import { Spinner, Badge } from '../components/UI';
import styles from './CashMatch.module.css';

const GAMES = Object.keys(GAME_TEAM_SIZES);
const SERIES_FORMATS = [
  { id: 'bo1', label: 'Best of 1' },
  { id: 'bo3', label: 'Best of 3' },
  { id: 'bo5', label: 'Best of 5' },
];
const WAGER_OPTIONS = [5, 10, 20, 25, 50, 100];
const STATUS_META = {
  open:        { label: 'Open',        color: 'green'  },
  accepted:    { label: 'Accepted',    color: 'blue'   },
  in_progress: { label: 'In Progress', color: 'gold'   },
  complete:    { label: 'Complete',    color: 'blue'   },
  cancelled:   { label: 'Cancelled',   color: 'blue'   },
  disputed:    { label: 'Disputed',    color: 'red'    },
};

function AgeGate({ onVerified }) {
  const [dob, setDob] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const check = async () => {
    if (!dob) return;
    setChecking(true);
    const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
    if (age >= 18) onVerified(dob, age);
    else setError('You must be 18 or older to access Cash Matches.');
    setChecking(false);
  };

  return (
    <div className={styles.ageGate}>
      <div className={styles.ageGateIcon}>🔞</div>
      <div className={styles.ageGateTitle}>Age Verification Required</div>
      <p>Cash Matches are only available to players 18 years of age or older. This feature involves real money wagering.</p>
      <div className={styles.ageGateForm}>
        <label>Enter your date of birth to continue:</label>
        <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={styles.dobInput} max={new Date().toISOString().split('T')[0]} />
        {error && <div className={styles.ageError}>{error}</div>}
        <button className={styles.verifyBtn} onClick={check} disabled={!dob || checking}>
          {checking ? 'Verifying...' : 'Verify Age →'}
        </button>
      </div>
      <p className={styles.disclaimer}>⚠️ By proceeding you confirm you are 18+ and understand this feature involves real money wagering. High Caliber Esports Academy collects a 5% platform fee on all matches.</p>
    </div>
  );
}

function CreateMatchForm({ myTeams, onCreated }) {
  const { user } = useAuth();
  const [game, setGame]           = useState('');
  const [teamId, setTeamId]       = useState('');
  const [wager, setWager]         = useState(10);
  const [format, setFormat]       = useState('bo3');
  const [custom, setCustom]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const eligibleTeams = game ? myTeams.filter(t => t.game === game) : myTeams;
  const wagerAmt = custom ? parseFloat(custom) || 0 : wager;
  const rake = +(wagerAmt * 2 * 0.05).toFixed(2);
  const payout = +((wagerAmt * 2) - rake).toFixed(2);

  const handleCreate = async () => {
    if (!game || !teamId) return setError('Select a game and team.');
    if (wagerAmt < 1) return setError('Minimum wager is $1.');
    const team = eligibleTeams.find(t => t.id === teamId);
    setSaving(true);
    const res = await cashMatchApi.create(user.id, team, game, wagerAmt, format);
    setSaving(false);
    if (res.success) onCreated(res.match);
    else setError(res.error || 'Failed to create match.');
  };

  return (
    <div className={styles.createForm}>
      <div className={styles.createTitle}>Create Cash Match</div>
      <div className={styles.createDesc}>Set your wager and challenge any opponent. Platform collects 5% of total pot.</div>
      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.formGrid}>
        <div className={styles.fg}>
          <label>Game</label>
          <select value={game} onChange={e => { setGame(e.target.value); setTeamId(''); }}>
            <option value="">Select game...</option>
            {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className={styles.fg}>
          <label>Your Team</label>
          <select value={teamId} onChange={e => setTeamId(e.target.value)} disabled={!game}>
            <option value="">Select team...</option>
            {eligibleTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className={styles.fg}>
          <label>Series Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)}>
            {SERIES_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <div className={styles.fg}>
          <label>Wager Per Team ($)</label>
          <div className={styles.wagerPicker}>
            {WAGER_OPTIONS.map(w => (
              <button key={w} className={`${styles.wagerChip} ${wager === w && !custom ? styles.wagerChipOn : ''}`}
                onClick={() => { setWager(w); setCustom(''); }}>
                ${w}
              </button>
            ))}
            <input
              type="number" min="1" placeholder="Custom"
              value={custom} onChange={e => setCustom(e.target.value)}
              className={`${styles.wagerCustom} ${custom ? styles.wagerCustomOn : ''}`}
            />
          </div>
        </div>
      </div>

      <div className={styles.potBreakdown}>
        <div className={styles.potRow}><span>Your wager</span><span>${wagerAmt.toFixed(2)}</span></div>
        <div className={styles.potRow}><span>Opponent wager</span><span>${wagerAmt.toFixed(2)}</span></div>
        <div className={styles.potRow}><span>Total pot</span><span>${(wagerAmt * 2).toFixed(2)}</span></div>
        <div className={styles.potRow + ' ' + styles.potFee}><span>Platform fee (5%)</span><span>-${rake}</span></div>
        <div className={styles.potRow + ' ' + styles.potWin}><span>Winner takes</span><span>${payout}</span></div>
      </div>

      <button className={styles.createBtn} onClick={handleCreate} disabled={saving}>
        {saving ? 'Creating...' : `Create Match · $${wagerAmt} wager →`}
      </button>
    </div>
  );
}

function MatchCard({ match, userId, myTeams, isAdmin, onAccept, onCancel, onReport, onConfirm, onDispute }) {
  const [showActions, setShowActions] = useState(false);
  const [winnerId, setWinnerId]       = useState('');
  const [disputing, setDisputing]     = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const isTeam1 = match.team1?.captainId === userId || myTeams?.some(t => t.id === match.team1?.id);
  const isTeam2 = match.team2?.captainId === userId || myTeams?.some(t => t.id === match.team2?.id);
  const isMine  = isTeam1 || isTeam2;
  const payout  = +(match.totalPot - match.platformFee).toFixed(2);
  const status  = STATUS_META[match.status] || STATUS_META.open;
  const canAccept = match.status === 'open' && !isTeam1 && match.team2 === null;
  const canReport = (match.status === 'accepted' || match.status === 'in_progress') && isMine && !match._pendingWinner;
  const canConfirm = match._pendingWinner && match._pendingWinner.reportingTeamId !== (isTeam1 ? match.team1?.id : match.team2?.id);

  const eligibleTeams = myTeams?.filter(t => t.game === match.game) || [];

  return (
    <div className={`${styles.matchCard} ${isMine ? styles.matchCardMine : ''} ${match.status === 'disputed' ? styles.matchCardDisputed : ''}`}>
      <div className={styles.mcHead}>
        <div className={styles.mcGame}>{match.game}</div>
        <Badge variant={status.color}>{status.label}</Badge>
        <div className={styles.mcFormat}>{SERIES_FORMATS.find(f => f.id === match.seriesFormat)?.label}</div>
      </div>

      <div className={styles.mcTeams}>
        <div className={`${styles.mcTeam} ${match.winner === match.team1?.id ? styles.mcWinner : match.winner ? styles.mcLoser : ''}`}>
          {match.team1?.name || 'TBD'}
        </div>
        <div className={styles.mcPot}>
          <div className={styles.mcPotAmount}>${match.wagerPerTeam}</div>
          <div className={styles.mcPotLabel}>per team</div>
          <div className={styles.mcVs}>VS</div>
        </div>
        <div className={`${styles.mcTeam} ${styles.mcTeamRight} ${match.winner === match.team2?.id ? styles.mcWinner : match.winner ? styles.mcLoser : ''}`}>
          {match.team2?.name || <span className={styles.openSlot}>Open · Challenge!</span>}
        </div>
      </div>

      {match.status === 'complete' && (
        <div className={styles.mcResult}>
          🏆 {match.winner === match.team1?.id ? match.team1.name : match.team2?.name} wins ${payout}
          {match.adminResolved && ' (Admin resolved)'}
        </div>
      )}

      {match.status === 'disputed' && (
        <div className={styles.mcDisputed}>⚠️ Disputed: {match.disputeReason}</div>
      )}

      {match._pendingWinner && (
        <div className={styles.mcPending}>⏳ Result reported — awaiting opponent confirmation</div>
      )}

      <div className={styles.mcFooter}>
        <span className={styles.mcPotInfo}>Pot: ${match.totalPot} · Winner gets ${payout} · Fee ${match.platformFee}</span>
        <div className={styles.mcActions}>
          {canAccept && eligibleTeams.length > 0 && (
            <button className={styles.acceptBtn} onClick={() => onAccept(match.id, eligibleTeams[0])}>
              Accept Challenge
            </button>
          )}
          {(match.status === 'open') && isTeam1 && (
            <button className={styles.cancelBtn} onClick={() => onCancel(match.id)}>Cancel</button>
          )}
          {canReport && !showActions && (
            <button className={styles.reportBtn} onClick={() => setShowActions(true)}>Report Result</button>
          )}
          {canConfirm && (
            <button className={styles.confirmBtn} onClick={() => onConfirm(match.id)}>✓ Confirm Result</button>
          )}
          {isMine && match.status !== 'complete' && match.status !== 'cancelled' && !disputing && (
            <button className={styles.disputeBtn} onClick={() => setDisputing(true)}>⚠️ Dispute</button>
          )}
        </div>
      </div>

      {showActions && (
        <div className={styles.mcReportForm}>
          <div className={styles.mcReportTitle}>Who won?</div>
          <div className={styles.mcReportPicker}>
            {[match.team1, match.team2].map(t => t && (
              <button key={t.id} className={`${styles.winPick} ${winnerId === t.id ? styles.winPickOn : ''}`}
                onClick={() => setWinnerId(t.id)}>
                {t.name}
              </button>
            ))}
          </div>
          <div className={styles.mcReportActions}>
            <button className={styles.reportSubmit} disabled={!winnerId} onClick={() => { onReport(match.id, winnerId); setShowActions(false); }}>
              Submit Result
            </button>
            <button className={styles.cancelSmall} onClick={() => setShowActions(false)}>Cancel</button>
          </div>
        </div>
      )}

      {disputing && (
        <div className={styles.mcDisputeForm}>
          <textarea rows={2} className={styles.disputeInput} placeholder="Describe the dispute..." value={disputeReason} onChange={e => setDisputeReason(e.target.value)} />
          <div className={styles.mcReportActions}>
            <button className={styles.disputeSubmit} disabled={!disputeReason.trim()} onClick={() => { onDispute(match.id, disputeReason); setDisputing(false); }}>Submit Dispute</button>
            <button className={styles.cancelSmall} onClick={() => setDisputing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CashMatch() {
  const { user, isAdmin } = useAuth();
  const [verified, setVerified]   = useState(false);
  const [userDob, setUserDob]     = useState('');
  const [matches, setMatches]     = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [myTeams, setMyTeams]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [tab, setTab]             = useState('browse');
  const [gameFilter, setGameFilter] = useState('');

  // Auto-verify if age is known from profile
  useEffect(() => {
    if (user?.age !== undefined && user.age >= 18) setVerified(true);
    else if (user?.age !== undefined && user.age < 18) setVerified(false);
  }, [user?.age]);

  const load = async () => {
    setLoading(true);
    const [open, mine, teams] = await Promise.all([
      cashMatchApi.getOpenMatches(gameFilter || undefined),
      cashMatchApi.getMyMatches(user.id),
      teamsApi.getMyTeams(user.id),
    ]);
    setMatches(open);
    setMyMatches(mine);
    setMyTeams(teams);
    setLoading(false);
  };

  useEffect(() => {
    if (verified) load();
  }, [verified, gameFilter]);

  // Block under-18
  if (user?.age !== undefined && user.age < 18 && !isAdmin) {
    return (
      <div className={styles.restricted}>
        <div className={styles.restrictedIcon}>🔞</div>
        <div className={styles.restrictedTitle}>18+ Only</div>
        <p>Cash Matches are only available to players 18 years of age or older.</p>
      </div>
    );
  }

  if (!verified) return <AgeGate onVerified={(dob, age) => { setUserDob(dob); setVerified(true); }} />;

  const handleAccept = async (matchId, team) => {
    await cashMatchApi.accept(matchId, team, user.id);
    load();
  };
  const handleCancel    = async (id) => { await cashMatchApi.cancel(id, user.id); load(); };
  const handleReport    = async (id, wId) => { await cashMatchApi.reportResult(id, user.id, wId); load(); };
  const handleConfirm   = async (id) => { await cashMatchApi.confirmResult(id, user.id); load(); };
  const handleDispute   = async (id, reason) => { await cashMatchApi.dispute(id, user.id, reason); load(); };
  const handleCreated   = () => { load(); setTab('my_matches'); };

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>💰 Cash Matches <span className={styles.ageBadge}>18+</span></h2>
          <p className={styles.sub}>Challenge opponents for real money. 5% platform fee. All payouts go to the winning team.</p>
        </div>
      </div>

      <div className={styles.warning}>
        ⚠️ Cash Matches involve real money. Only wager what you can afford to lose. Platform fee of 5% applies to all matches.
      </div>

      <div className={styles.tabs}>
        {[
          { id:'browse',     label:'🔍 Open Matches' },
          { id:'my_matches', label:`🎮 My Matches ${myMatches.length > 0 ? `(${myMatches.length})` : ''}` },
          { id:'create',     label:'+ Create Match' },
        ].map(t => (
          <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabOn : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <div className={styles.browseTab}>
          <div className={styles.gameFilter}>
            <button className={`${styles.gameFilterBtn} ${!gameFilter ? styles.gameFilterOn : ''}`} onClick={() => setGameFilter('')}>All Games</button>
            {GAMES.map(g => (
              <button key={g} className={`${styles.gameFilterBtn} ${gameFilter === g ? styles.gameFilterOn : ''}`} onClick={() => setGameFilter(g)}>{g}</button>
            ))}
          </div>
          {loading ? <Spinner /> : matches.length === 0 ? (
            <div className={styles.empty}>No open challenges right now. Create one above!</div>
          ) : matches.map(m => (
            <MatchCard key={m.id} match={m} userId={user.id} myTeams={myTeams} isAdmin={isAdmin}
              onAccept={handleAccept} onCancel={handleCancel} onReport={handleReport}
              onConfirm={handleConfirm} onDispute={handleDispute} />
          ))}
        </div>
      )}

      {tab === 'my_matches' && (
        <div>
          {loading ? <Spinner /> : myMatches.length === 0 ? (
            <div className={styles.empty}>You haven't created or joined any cash matches yet.</div>
          ) : myMatches.map(m => (
            <MatchCard key={m.id} match={m} userId={user.id} myTeams={myTeams} isAdmin={isAdmin}
              onAccept={handleAccept} onCancel={handleCancel} onReport={handleReport}
              onConfirm={handleConfirm} onDispute={handleDispute} />
          ))}
        </div>
      )}

      {tab === 'create' && (
        <CreateMatchForm myTeams={myTeams} onCreated={handleCreated} />
      )}
    </div>
  );
}
