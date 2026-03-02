import { useState, useEffect } from 'react';
import { leagueApi, teamsApi, GAME_TEAM_SIZES } from '../../api';
import { Spinner, Badge } from '../../components/UI';
import styles from './AdminLeagues.module.css';

const GAMES = Object.keys(GAME_TEAM_SIZES);
const STATUS_META = {
  draft:    { label: 'Draft',    color: 'blue'  },
  active:   { label: 'Active',   color: 'green' },
  playoffs: { label: 'Playoffs', color: 'gold'  },
  complete: { label: 'Complete', color: 'blue'  },
};
const NEXT_STATUS = { draft: 'active', active: 'playoffs', playoffs: 'complete' };
const NEXT_LABEL  = { draft: '🚀 Launch Season', active: '🥊 Start Playoffs', playoffs: '✓ Mark Complete' };
const GROUP_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444'];

// ── CREATE LEAGUE FORM ─────────────────────────────────────────────
function CreateLeagueForm({ onCreated }) {
  const [form, setForm] = useState({
    name: '', game: '', season: '', startDate: '', endDate: '', weeksTotal: 8, description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.game || !form.season.trim()) return setError('Name, game, and season are required.');
    setSaving(true);
    const res = await leagueApi.create({ ...form, weeksTotal: parseInt(form.weeksTotal) || 8 });
    setSaving(false);
    if (res.success) onCreated(res.league);
    else setError('Failed to create league.');
  };

  return (
    <div className={styles.createForm}>
      <div className={styles.createTitle}>Create Seasonal League</div>
      <div className={styles.createDesc}>
        Creates 4 groups (A–D / North, South, East, West). Add teams to each group after creation.
      </div>
      {error && <div className={styles.errorBox}>{error}</div>}
      <div className={styles.formGrid}>
        <div className={`${styles.fg} ${styles.fgFull}`}>
          <label>League Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="SD Esports Spring League 2026" />
        </div>
        <div className={styles.fg}>
          <label>Game *</label>
          <select value={form.game} onChange={e => set('game', e.target.value)}>
            <option value="">Select game...</option>
            {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className={styles.fg}>
          <label>Season Label *</label>
          <input value={form.season} onChange={e => set('season', e.target.value)} placeholder="Spring 2026" />
        </div>
        <div className={styles.fg}>
          <label>Start Date</label>
          <input value={form.startDate} onChange={e => set('startDate', e.target.value)} placeholder="Feb 1, 2026" />
        </div>
        <div className={styles.fg}>
          <label>End Date</label>
          <input value={form.endDate} onChange={e => set('endDate', e.target.value)} placeholder="Apr 30, 2026" />
        </div>
        <div className={styles.fg}>
          <label>Season Length (weeks)</label>
          <input type="number" min="1" max="52" value={form.weeksTotal} onChange={e => set('weeksTotal', e.target.value)} />
        </div>
        <div className={`${styles.fg} ${styles.fgFull}`}>
          <label>Description</label>
          <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the league format, eligibility, and playoff structure..." />
        </div>
      </div>
      <div className={styles.createActions}>
        <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.7rem 2.2rem' }} onClick={handleSave} disabled={saving}>
          {saving ? 'Creating...' : 'Create League →'}
        </button>
      </div>
    </div>
  );
}

// ── TEAM MANAGER FOR A GROUP ───────────────────────────────────────
function GroupTeamManager({ league, group, allTeams, onUpdate }) {
  const [adding, setAdding]   = useState(false);
  const [search, setSearch]   = useState('');
  const [saving, setSaving]   = useState('');

  const gameTeams = allTeams.filter(t => t.game === league.game);
  const inGroup   = group.standings.map(s => s.teamId);
  const available = gameTeams.filter(t => !inGroup.includes(t.id));
  const filtered  = search ? available.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : available;

  const handleAdd = async (team) => {
    setSaving(team.id);
    await leagueApi.addTeamToGroup(league.id, group.id, { id: team.id, name: team.name });
    setSaving('');
    onUpdate();
  };

  const handleRemove = async (teamId) => {
    if (!window.confirm('Remove this team from the group?')) return;
    setSaving(teamId);
    await leagueApi.removeTeamFromGroup(league.id, group.id, teamId);
    setSaving('');
    onUpdate();
  };

  return (
    <div className={styles.groupManager}>
      <div className={styles.gmHead}>
        <div className={styles.gmTitle}>{group.name} — {group.label}</div>
        <div className={styles.gmCount}>{inGroup.length} teams</div>
        <button className={styles.gmAddBtn} onClick={() => setAdding(p => !p)}>
          {adding ? '✕ Close' : '+ Add Teams'}
        </button>
      </div>

      {/* Current teams */}
      <div className={styles.gmTeams}>
        {group.standings.length === 0 ? (
          <div className={styles.gmEmpty}>No teams assigned yet.</div>
        ) : group.standings.map(s => (
          <div key={s.teamId} className={styles.gmTeamRow}>
            <span className={styles.gmTeamName}>{s.teamName}</span>
            <button className={styles.gmRemoveBtn} onClick={() => handleRemove(s.teamId)} disabled={saving === s.teamId}>
              {saving === s.teamId ? '...' : '✕'}
            </button>
          </div>
        ))}
      </div>

      {/* Add team panel */}
      {adding && (
        <div className={styles.gmAddPanel}>
          <input
            className={styles.gmSearch}
            placeholder={`Search ${league.game} teams...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {filtered.length === 0 ? (
            <div className={styles.gmNoResults}>
              {gameTeams.length === 0 ? `No ${league.game} teams exist yet.` : 'All matching teams already added.'}
            </div>
          ) : filtered.map(t => (
            <div key={t.id} className={styles.gmAddRow}>
              <div>
                <div className={styles.gmAddName}>{t.name}</div>
                <div className={styles.gmAddMeta}>{t.members?.length || 0} players</div>
              </div>
              <button className={styles.gmAddTeamBtn} onClick={() => handleAdd(t)} disabled={saving === t.id}>
                {saving === t.id ? '...' : '+ Add'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SCHEDULE MATCH FORM ────────────────────────────────────────────
function ScheduleMatchForm({ league, onScheduled }) {
  const [groupId, setGroupId] = useState(league.groups[0]?.id || '');
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [week, setWeek]       = useState(league.currentWeek || 1);
  const [date, setDate]       = useState('');
  const [time, setTime]       = useState('7:00 PM CST');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const group = league.groups.find(g => g.id === groupId);
  const teams = group?.standings || [];

  const handleSchedule = async () => {
    if (!groupId || !team1Id || !team2Id || team1Id === team2Id) return setError('Select two different teams.');
    setSaving(true);
    const t1 = teams.find(t => t.teamId === team1Id);
    const t2 = teams.find(t => t.teamId === team2Id);
    await leagueApi.scheduleMatch(league.id, {
      groupId,
      week: parseInt(week),
      round: `Week ${week}`,
      team1: { id: t1.teamId, name: t1.teamName },
      team2: { id: t2.teamId, name: t2.teamName },
      scheduledDate: date, scheduledTime: time,
    });
    setSaving(false);
    setTeam1Id(''); setTeam2Id(''); setDate(''); setError('');
    onScheduled();
  };

  return (
    <div className={styles.scheduleForm}>
      <div className={styles.sfTitle}>Schedule a Match</div>
      {error && <div className={styles.errorBox}>{error}</div>}
      <div className={styles.sfGrid}>
        <div className={styles.fg}>
          <label>Group</label>
          <select value={groupId} onChange={e => { setGroupId(e.target.value); setTeam1Id(''); setTeam2Id(''); }}>
            {league.groups.map(g => <option key={g.id} value={g.id}>{g.name} — {g.label}</option>)}
          </select>
        </div>
        <div className={styles.fg}>
          <label>Week</label>
          <input type="number" min="1" max={league.weeksTotal} value={week} onChange={e => setWeek(e.target.value)} />
        </div>
        <div className={styles.fg}>
          <label>Team 1</label>
          <select value={team1Id} onChange={e => setTeam1Id(e.target.value)}>
            <option value="">Select team...</option>
            {teams.filter(t => t.teamId !== team2Id).map(t => <option key={t.teamId} value={t.teamId}>{t.teamName}</option>)}
          </select>
        </div>
        <div className={styles.fg}>
          <label>Team 2</label>
          <select value={team2Id} onChange={e => setTeam2Id(e.target.value)}>
            <option value="">Select team...</option>
            {teams.filter(t => t.teamId !== team1Id).map(t => <option key={t.teamId} value={t.teamId}>{t.teamName}</option>)}
          </select>
        </div>
        <div className={styles.fg}>
          <label>Date</label>
          <input value={date} onChange={e => setDate(e.target.value)} placeholder="Mar 5, 2026" />
        </div>
        <div className={styles.fg}>
          <label>Time</label>
          <input value={time} onChange={e => setTime(e.target.value)} placeholder="7:00 PM CST" />
        </div>
      </div>
      <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.6rem 1.8rem', marginTop:'0.3rem' }} onClick={handleSchedule} disabled={saving}>
        {saving ? 'Scheduling...' : 'Schedule Match →'}
      </button>
    </div>
  );
}

// ── LEAGUE DETAIL PANEL ────────────────────────────────────────────
function LeagueDetail({ league, allTeams, onRefresh, onDelete }) {
  const [tab, setTab]     = useState('groups');
  const [saving, setSaving] = useState(false);

  const handleAdvance = async () => {
    if (!window.confirm(`Advance league to "${NEXT_LABEL[league.status]}"?`)) return;
    setSaving(true);
    await leagueApi.advanceStatus(league.id);
    setSaving(false);
    onRefresh();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${league.name}"? This cannot be undone.`)) return;
    await leagueApi.delete(league.id);
    onDelete(league.id);
  };

  const meta = STATUS_META[league.status];

  return (
    <div className={styles.leagueDetail}>
      <div className={styles.detailHead}>
        <div>
          <div className={styles.detailName}>{league.name}</div>
          <div className={styles.detailMeta}>
            <Badge variant={meta.color}>{meta.label}</Badge>
            <span>{league.game}</span>
            <span>·</span>
            <span>{league.season}</span>
            <span>·</span>
            <span>Week {league.currentWeek}/{league.weeksTotal}</span>
          </div>
        </div>
        <div className={styles.detailActions}>
          {NEXT_STATUS[league.status] && (
            <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.55rem 1.2rem', fontSize:'0.85rem' }} onClick={handleAdvance} disabled={saving}>
              {saving ? '...' : NEXT_LABEL[league.status]}
            </button>
          )}
          <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className={styles.detailTabs}>
        {[
          { id:'groups',   label:'👥 Groups & Teams' },
          { id:'schedule', label:'📅 Schedule Match' },
        ].map(t => (
          <button key={t.id} className={`${styles.dtab} ${tab === t.id ? styles.dtabOn : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'groups' && (
        <div className={styles.groupManagerGrid}>
          {league.groups.map((group, i) => (
            <GroupTeamManager
              key={group.id}
              league={league}
              group={group}
              allTeams={allTeams}
              onUpdate={onRefresh}
            />
          ))}
        </div>
      )}

      {tab === 'schedule' && (
        <ScheduleMatchForm league={league} onScheduled={onRefresh} />
      )}
    </div>
  );
}

// ── MAIN ADMIN LEAGUES PAGE ────────────────────────────────────────
export default function AdminLeagues() {
  const [leagues, setLeagues]       = useState([]);
  const [allTeams, setAllTeams]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    const [ls, teams] = await Promise.all([leagueApi.getAll(), teamsApi.getAll()]);
    setLeagues(ls);
    setAllTeams(teams);
    if (selected) setSelected(ls.find(l => l.id === selected.id) || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreated = (league) => {
    setLeagues(prev => [league, ...prev]);
    setSelected(league);
    setShowCreate(false);
  };

  const handleDelete = (id) => {
    setLeagues(prev => prev.filter(l => l.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  if (loading) return <Spinner />;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Seasonal Leagues</div>
          <div className={styles.sub}>Create and manage multi-group seasonal leagues with divisional and championship playoffs.</div>
        </div>
        <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.6rem 1.4rem', fontSize:'0.88rem' }} onClick={() => setShowCreate(p => !p)}>
          {showCreate ? '✕ Cancel' : '+ Create League'}
        </button>
      </div>

      {showCreate && <CreateLeagueForm onCreated={handleCreated} />}

      <div className={styles.leagueList}>
        {leagues.length === 0 && !showCreate && (
          <div className={styles.empty}>No leagues yet. Create the first one above.</div>
        )}
        {leagues.map(league => (
          <div key={league.id} className={styles.leagueRow} onClick={() => setSelected(selected?.id === league.id ? null : league)}>
            <div className={styles.leagueRowLeft}>
              <div className={styles.leagueRowName}>{league.name}</div>
              <div className={styles.leagueRowMeta}>
                <Badge variant={STATUS_META[league.status].color}>{STATUS_META[league.status].label}</Badge>
                <span>{league.game}</span>
                <span>·</span>
                <span>{league.season}</span>
                <span>·</span>
                <span>{league.groups.reduce((acc, g) => acc + g.teamIds.length, 0)} teams</span>
              </div>
            </div>
            <div className={styles.leagueRowGroups}>
              {league.groups.map((g, i) => (
                <div key={g.id} className={styles.groupPip} style={{ background: GROUP_COLORS[i] }} title={`${g.name}: ${g.teamIds.length} teams`}>
                  {g.name.replace('Group ','')}
                </div>
              ))}
            </div>
            <div className={styles.leagueRowChevron}>{selected?.id === league.id ? '▲' : '▼'}</div>
          </div>
        ))}
      </div>

      {selected && (
        <LeagueDetail
          league={selected}
          allTeams={allTeams}
          onRefresh={load}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
