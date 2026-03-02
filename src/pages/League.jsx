import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { leagueApi, teamsApi, matchFlagApi } from '../api';
import { Spinner, Badge } from '../components/UI';
import MatchRoom from '../components/MatchRoom';
import styles from './League.module.css';

const STATUS_META = {
  draft:    { label: 'Draft',      color: 'blue',  desc: 'League setup in progress' },
  active:   { label: 'Active',     color: 'green', desc: 'Season in progress' },
  playoffs: { label: 'Playoffs',   color: 'gold',  desc: 'Divisional & Championship brackets live' },
  complete: { label: 'Complete',   color: 'blue',  desc: 'Season finished' },
};
const GROUP_COLORS = { grp_A: '#3b82f6', grp_B: '#10b981', grp_C: '#f59e0b', grp_D: '#ef4444' };
const getGroupColor = (groupId) => {
  const key = Object.keys(GROUP_COLORS).find(k => groupId?.endsWith(k.slice(-1)));
  return key ? GROUP_COLORS[key] : '#6366f1';
};

// ── STANDING ROW ────────────────────────────────────────────────────
function StandingRow({ standing, rank, isMyTeam, cutlines }) {
  const isDivisional   = rank <= 8;
  const isChampionship = rank <= 4;
  const showChampLine  = cutlines && rank === 4;
  const showDivLine    = cutlines && rank === 8;

  return (
    <>
      <div className={`${styles.standingRow} ${isMyTeam ? styles.standingMyTeam : ''} ${isChampionship ? styles.standingChamp : isDivisional ? styles.standingDiv : styles.standingOut}`}>
        <div className={styles.standingRank}>
          {isChampionship ? <span className={styles.champDot}>🏆</span> : isDivisional ? <span className={styles.divDot}>🥊</span> : null}
          {rank}
        </div>
        <div className={styles.standingTeam}>
          <span className={styles.standingTeamName}>{standing.teamName}</span>
          {isMyTeam && <span className={styles.myTeamBadge}>You</span>}
        </div>
        <div className={styles.standingW}>{standing.wins}</div>
        <div className={styles.standingL}>{standing.losses}</div>
        <div className={styles.standingPts}>{standing.points}</div>
        <div className={`${styles.standingStreak} ${standing.streak?.startsWith('W') ? styles.streakW : standing.streak?.startsWith('L') ? styles.streakL : ''}`}>
          {standing.streak}
        </div>
      </div>
      {showChampLine && <div className={styles.cutline}><span>── Top 4 advance to Championship ──</span></div>}
      {showDivLine   && <div className={styles.cutline} style={{ '--cut-color': '#f59e0b' }}><span>── Top 8 advance to Divisional Playoffs ──</span></div>}
    </>
  );
}

// ── GROUP STANDINGS TABLE ────────────────────────────────────────────
function GroupStandings({ group, myTeamIds, onViewMatches }) {
  return (
    <div className={styles.groupCard}>
      <div className={styles.groupHead} style={{ borderLeftColor: getGroupColor(group.id) }}>
        <div>
          <div className={styles.groupName}>{group.name}</div>
          <div className={styles.groupLabel}>{group.label}</div>
        </div>
        <div className={styles.groupTeamCount}>{group.teamIds.length} teams</div>
      </div>

      <div className={styles.standingsTable}>
        <div className={styles.standingsHeader}>
          <div className={styles.standingRank}>#</div>
          <div className={styles.standingTeam}>Team</div>
          <div className={styles.standingW}>W</div>
          <div className={styles.standingL}>L</div>
          <div className={styles.standingPts}>PTS</div>
          <div className={styles.standingStreak}>STK</div>
        </div>
        {[...group.standings]
          .sort((a, b) => b.points - a.points || b.wins - a.wins)
          .map((s, i) => (
            <StandingRow
              key={s.teamId}
              standing={s}
              rank={i + 1}
              isMyTeam={myTeamIds?.includes(s.teamId)}
              cutlines={group.standings.length >= 8}
            />
          ))}
        {group.standings.length === 0 && (
          <div className={styles.noTeamsYet}>No teams in this group yet.</div>
        )}
      </div>

      <button className={styles.viewMatchesBtn} onClick={() => onViewMatches(group)}>
        View {group.name} Schedule →
      </button>
    </div>
  );
}

// ── MATCH SCHEDULE LIST ─────────────────────────────────────────────
function MatchSchedule({ league, group, matches, myTeamIds, onOpenRoom, activeFlags, isAdmin }) {
  const weeks = [...new Set(matches.map(m => m.week))].sort((a, b) => b - a);

  if (matches.length === 0) return (
    <div className={styles.emptySchedule}>No matches scheduled for this group yet.</div>
  );

  return (
    <div className={styles.scheduleWrap}>
      {weeks.map(week => (
        <div key={week} className={styles.weekBlock}>
          <div className={styles.weekLabel}>
            Week {week}
            {week === league.currentWeek && <span className={styles.currentWeekTag}>Current</span>}
          </div>
          <div className={styles.weekMatches}>
            {matches.filter(m => m.week === week).map(match => {
              const isMyMatch = myTeamIds?.some(id => id === match.team1?.id || id === match.team2?.id);
              const flag = activeFlags?.[match.id] || null;
              return (
                <div key={match.id} className={`${styles.matchCard} ${isMyMatch ? styles.matchCardMine : ''} ${match.status === 'complete' ? styles.matchCardComplete : match.status === 'pending' ? styles.matchCardPending : ''} ${flag ? styles.matchCardFlagged : ''}`}>
                  {flag && (
                    <div className={styles.leagueFlagBar}>
                      <span className={styles.leagueFlagIcon}>🚩</span>
                      <span className={styles.leagueFlagCategory}>{flag.category?.replace('_', ' ')}</span>
                      {isAdmin && <span className={styles.leagueFlagReason}>"{flag.reason}"</span>}
                    </div>
                  )}
                  <div className={styles.matchTeams}>
                    <div className={`${styles.matchTeam} ${match.winner === match.team1?.id ? styles.matchWinner : match.winner ? styles.matchLoser : ''}`}>
                      {match.team1?.name || 'TBD'}
                    </div>
                    <div className={styles.matchScore}>
                      {match.status === 'complete'
                        ? <span className={styles.scoreDisplay}>{match.score1} – {match.score2}</span>
                        : <span className={styles.vsDisplay}>VS</span>
                      }
                    </div>
                    <div className={`${styles.matchTeam} ${styles.matchTeamRight} ${match.winner === match.team2?.id ? styles.matchWinner : match.winner ? styles.matchLoser : ''}`}>
                      {match.team2?.name || 'TBD'}
                    </div>
                  </div>
                  <div className={styles.matchMeta}>
                    <span>📅 {match.scheduledDate}</span>
                    {match.scheduledTime && <span>🕐 {match.scheduledTime}</span>}
                    {match.status === 'complete' && <span className={styles.completedTag}>✓ Complete</span>}
                    {match.status === 'pending' && match._pendingScore && <span className={styles.pendingConfirmTag}>⏳ Pending Confirm</span>}
                  </div>
                  {(match.status === 'pending' || isMyMatch) && (
                    <button className={styles.matchRoomBtn} onClick={() => onOpenRoom(match, group)}>
                      💬 Match Room
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PLAYOFF SEEDINGS VIEW ────────────────────────────────────────────
function PlayoffSeedings({ league, seedings }) {
  if (!seedings) return <Spinner />;

  return (
    <div className={styles.playoffWrap}>
      <div className={styles.playoffHeader}>
        <div className={styles.playoffTitle}>🏆 Championship Bracket</div>
        <div className={styles.playoffDesc}>Top 4 from each group · 16 teams total</div>
      </div>
      <div className={styles.champGrid}>
        {league.groups.map(group => {
          const top4 = seedings.divisional[group.id]?.slice(0, 4) || [];
          return (
            <div key={group.id} className={styles.champGroup}>
              <div className={styles.champGroupHead} style={{ borderLeftColor: getGroupColor(group.id) }}>
                {group.name} Seeds
              </div>
              {top4.map((t, i) => (
                <div key={t.teamId} className={styles.champSeed}>
                  <span className={styles.champSeedNum}>#{i + 1}</span>
                  <span className={styles.champSeedName}>{t.teamName}</span>
                  <span className={styles.champSeedPts}>{t.points}pts</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className={styles.playoffHeader} style={{ marginTop: '2rem' }}>
        <div className={styles.playoffTitle}>🥊 Divisional Playoffs</div>
        <div className={styles.playoffDesc}>Top 8 from each group — 4 separate brackets</div>
      </div>
      <div className={styles.divGrid}>
        {league.groups.map(group => {
          const top8 = seedings.divisional[group.id] || [];
          return (
            <div key={group.id} className={styles.divGroup}>
              <div className={styles.divGroupHead} style={{ background: `${getGroupColor(group.id)}18`, borderColor: `${getGroupColor(group.id)}40` }}>
                <span style={{ color: getGroupColor(group.id) }}>{group.name}</span> · {group.label} Divisional
              </div>
              {top8.map((t, i) => (
                <div key={t.teamId} className={`${styles.divSeed} ${i < 4 ? styles.divSeedChamp : ''}`}>
                  <span className={styles.divSeedNum}>#{i + 1}</span>
                  <span className={styles.divSeedName}>{t.teamName}</span>
                  {i < 4 && <span className={styles.alsoChampTag}>+Champ</span>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────
export default function League() {
  const { user, isAdmin } = useAuth();
  const [leagues, setLeagues]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [matches, setMatches]       = useState([]);
  const [myTeams, setMyTeams]       = useState([]);
  const [seedings, setSeedings]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);
  const [activeGroup, setActiveGroup]   = useState(null);
  const [tab, setTab]               = useState('standings');
  const [matchRoom, setMatchRoom]   = useState(null);
  const [activeFlags, setActiveFlags] = useState({}); // matchId -> flag

  useEffect(() => {
    const load = async () => {
      const [ls, teams] = await Promise.all([
        leagueApi.getAll(),
        user ? teamsApi.getMyTeams(user.id) : [],
      ]);
      setLeagues(ls);
      setMyTeams(teams);
      if (ls.length > 0) await selectLeague(ls[0]);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const selectLeague = async (league) => {
    setSelected(league);
    setActiveGroup(null);
    setTab('standings');
    setMatchLoading(true);
    const allMatches = await leagueApi.getMatches(league.id);
    setMatches(allMatches);
    const flags = await matchFlagApi.getActive();
    const flagMap = {};
    flags.forEach(f => { flagMap[f.matchId] = f; });
    setActiveFlags(flagMap);
    if (league.status === 'playoffs' || league.status === 'complete') {
      const s = await leagueApi.getPlayoffSeedings(league.id);
      setSeedings(s);
    }
    setMatchLoading(false);
  };

  const handleOpenRoom = (match, group) => {
    // Attach league as a pseudo-tournament for MatchRoom reuse
    const pseudoTournament = {
      id: selected.id,
      name: `${selected.name} · ${group?.label || 'League'}`,
    };
    setMatchRoom({ match: { ...match, roundName: match.round }, tournament: pseudoTournament });
  };

  const myTeamIds = myTeams.map(t => t.id);
  const groupMatches = (groupId) => matches.filter(m => m.groupId === groupId);

  if (loading) return <Spinner />;

  return (
    <div className={styles.wrap}>

      {/* League selector header */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h2 className={styles.pageTitle}>Seasonal Leagues</h2>
          <p className={styles.pageSub}>Group standings, weekly schedules, and playoff seedings</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.65rem 1.4rem', fontSize:'0.88rem' }}
            onClick={() => alert('Create leagues in Admin Panel → Seasonal Leagues tab')}>
            + Create League
          </button>
        )}
      </div>

      {leagues.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🏅</div>
          <div className={styles.emptyTitle}>No leagues yet</div>
          {isAdmin && <p>Create the first seasonal league to get started.</p>}
        </div>
      ) : (
        <>
          {/* League tabs */}
          <div className={styles.leagueTabs}>
            {leagues.map(l => {
              const meta = STATUS_META[l.status];
              return (
                <button
                  key={l.id}
                  className={`${styles.leagueTab} ${selected?.id === l.id ? styles.leagueTabOn : ''}`}
                  onClick={() => selectLeague(l)}
                >
                  <div className={styles.leagueTabName}>{l.name}</div>
                  <div className={styles.leagueTabMeta}>
                    <Badge variant={meta.color}>{meta.label}</Badge>
                    <span>{l.game}</span>
                    <span>·</span>
                    <span>{l.season}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className={styles.leagueBody}>

              {/* League info bar */}
              <div className={styles.leagueInfoBar}>
                <div className={styles.leagueInfoLeft}>
                  <div className={styles.leagueName}>{selected.name}</div>
                  <div className={styles.leagueMeta}>
                    <Badge variant={STATUS_META[selected.status].color}>{STATUS_META[selected.status].label}</Badge>
                    <span>{selected.game}</span>
                    <span>·</span>
                    <span>Week {selected.currentWeek} of {selected.weeksTotal}</span>
                    <span>·</span>
                    <span>📅 {selected.startDate} – {selected.endDate}</span>
                  </div>
                </div>
                <div className={styles.leagueProgress}>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${(selected.currentWeek / selected.weeksTotal) * 100}%` }} />
                  </div>
                  <div className={styles.progressLabel}>{Math.round((selected.currentWeek / selected.weeksTotal) * 100)}% complete</div>
                </div>
              </div>

              {/* Inner tabs */}
              <div className={styles.innerTabs}>
                {[
                  { id: 'standings', label: '📊 Standings' },
                  { id: 'schedule',  label: '📅 Schedule' },
                  { id: 'playoffs',  label: '🏆 Playoff Picture', hidden: selected.status === 'draft' },
                ].filter(t => !t.hidden).map(t => (
                  <button key={t.id} className={`${styles.innerTab} ${tab === t.id ? styles.innerTabOn : ''}`} onClick={() => setTab(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── STANDINGS TAB ── */}
              {tab === 'standings' && (
                <div className={styles.groupsGrid}>
                  {selected.groups.map(group => (
                    <GroupStandings
                      key={group.id}
                      group={group}
                      myTeamIds={myTeamIds}
                      onViewMatches={(g) => { setActiveGroup(g); setTab('schedule'); }}
                    />
                  ))}
                </div>
              )}

              {/* ── SCHEDULE TAB ── */}
              {tab === 'schedule' && (
                <div className={styles.scheduleTab}>
                  {/* Group filter pills */}
                  <div className={styles.groupFilterBar}>
                    <button
                      className={`${styles.groupFilterBtn} ${!activeGroup ? styles.groupFilterOn : ''}`}
                      onClick={() => setActiveGroup(null)}
                    >All Groups</button>
                    {selected.groups.map(g => (
                      <button
                        key={g.id}
                        className={`${styles.groupFilterBtn} ${activeGroup?.id === g.id ? styles.groupFilterOn : ''}`}
                        style={activeGroup?.id === g.id ? { borderColor: getGroupColor(g.id), color: getGroupColor(g.id) } : {}}
                        onClick={() => setActiveGroup(g)}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>

                  {matchLoading ? <Spinner /> : activeGroup ? (
                    <MatchSchedule
                      league={selected}
                      group={activeGroup}
                      matches={groupMatches(activeGroup.id)}
                      myTeamIds={myTeamIds}
                      onOpenRoom={handleOpenRoom}
                      activeFlags={activeFlags}
                      isAdmin={isAdmin}
                    />
                  ) : (
                    selected.groups.map(group => {
                      const gMatches = groupMatches(group.id);
                      if (gMatches.length === 0) return null;
                      return (
                        <div key={group.id} className={styles.allGroupSchedule}>
                          <div className={styles.allGroupLabel} style={{ color: getGroupColor(group.id) }}>
                            {group.name} — {group.label}
                          </div>
                          <MatchSchedule
                            league={selected}
                            group={group}
                            matches={gMatches.filter(m => m.week === selected.currentWeek)}
                            myTeamIds={myTeamIds}
                            onOpenRoom={handleOpenRoom}
                            activeFlags={activeFlags}
                            isAdmin={isAdmin}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── PLAYOFFS TAB ── */}
              {tab === 'playoffs' && (
                <PlayoffSeedings league={selected} seedings={seedings} />
              )}

            </div>
          )}
        </>
      )}

      {/* Match Room modal (reuses tournament MatchRoom) */}
      {matchRoom && (
        <MatchRoom
          match={matchRoom.match}
          tournament={matchRoom.tournament}
          myTeam={myTeams.find(t => matchRoom.match.team1?.id === t.id || matchRoom.match.team2?.id === t.id) || null}
          onClose={() => setMatchRoom(null)}
        />
      )}
    </div>
  );
}
