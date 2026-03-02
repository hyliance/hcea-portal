import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { coachAppApi, GAME_TEAM_SIZES } from '../api';
import { Spinner } from '../components/UI';
import styles from './CoachApplication.module.css';

const GAMES = Object.keys(GAME_TEAM_SIZES);

const STEPS = [
  { id: 1, label: 'Personal Info',       icon: '👤' },
  { id: 2, label: 'Coaching Background', icon: '🎮' },
  { id: 3, label: 'Philosophy & Style',  icon: '🧠' },
  { id: 4, label: 'Experience',          icon: '📋' },
  { id: 5, label: 'Availability', icon: '📅' },
  { id: 6, label: 'Statement',           icon: '✍️' },
];

const YEARS_PLAYING    = ['Under 1 year','1-2','3-4','5-7','7+'];
const YEARS_COACHING   = ['None (first time)','Under 1 year','1-2','3-5','5+'];
const COMP_LEVELS      = ['Casual','Competitive Amateur','Semi-professional','Professional'];
const AGE_GROUPS       = ['Under 13','13-15','16-18','18+','All ages'];
const DAYS_OF_WEEK     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_META = {
  pending:      { label:'Application Submitted',  color:'#f59e0b', icon:'⏳', desc:'Your application has been received and is in the queue for review by our Head Admin team.' },
  under_review: { label:'Under Review',           color:'#3b82f6', icon:'🔍', desc:'A Head Admin is actively reviewing your application and may be verifying your references and game ranks.' },
  approved:     { label:'Application Approved!',  color:'#10b981', icon:'🎉', desc:'Congratulations! Your coach application has been approved. The HCEA team will reach out with onboarding details.' },
  rejected:     { label:'Not Selected',           color:'#ef4444', icon:'❌', desc:'Unfortunately your application was not selected at this time. You\'re welcome to reapply after 90 days.' },
};

// ── EXISTING APPLICATION STATUS VIEW ──────────────────────────────
function ApplicationStatus({ app, onReapply }) {
  const meta = STATUS_META[app.status] || STATUS_META.pending;
  const submittedDate = new Date(app.submittedAt).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  const updatedDate   = new Date(app.updatedAt).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });

  return (
    <div className={styles.statusPage}>
      <div className={styles.statusCard} style={{ '--status-color': meta.color }}>
        <div className={styles.statusIcon}>{meta.icon}</div>
        <div className={styles.statusTitle}>{meta.label}</div>
        <div className={styles.statusDesc}>{meta.desc}</div>
        {app.reviewNote && (
          <div className={styles.reviewNote}>
            <div className={styles.reviewNoteLabel}>📝 Admin Note</div>
            <div className={styles.reviewNoteText}>{app.reviewNote}</div>
          </div>
        )}
        <div className={styles.statusMeta}>
          <div><span>Submitted</span><span>{submittedDate}</span></div>
          <div><span>Last Updated</span><span>{updatedDate}</span></div>
          <div><span>Application ID</span><span className={styles.appId}>{app.id}</span></div>
        </div>
        {app.status === 'rejected' && (
          <button className={styles.reapplyBtn} onClick={onReapply}>Submit New Application →</button>
        )}
      </div>

      {/* Summary of what was submitted */}
      <div className={styles.submittedSummary}>
        <div className={styles.summaryTitle}>Your Submitted Application</div>
        <div className={styles.summaryGrid}>
          <SummarySection title="Personal Info">
            <SummaryRow label="Name"     value={`${app.firstName} ${app.lastName}`} />
            <SummaryRow label="Email"    value={app.email} />
            <SummaryRow label="Location" value={app.location} />
          </SummarySection>
          <SummarySection title="Background">
            <SummaryRow label="Playing Experience" value={`${app.yearsPlaying} years`} />
            <SummaryRow label="Coaching Experience" value={`${app.yearsCoaching} years`} />
            <SummaryRow label="Competitive Level"   value={app.competitiveLevel} />
          </SummarySection>
          <SummarySection title="Primary Games">
            {app.primaryGames?.map(g => (
              <SummaryRow key={g} label={g} value={app.gameRanks?.[g] || 'Rank not listed'} />
            ))}
          </SummarySection>
          <SummarySection title="Availability">
            <SummaryRow label="Days"  value={app.availableDays?.map(d => DAYS_OF_WEEK[d]).join(', ')} />
            <SummaryRow label="Hours" value={app.preferredHours} />
            <SummaryRow label="Member Rate"     value="$51/session (platform rate)" />
            <SummaryRow label="Non-Member Rate" value="$60/session (platform rate)" />
          </SummarySection>
        </div>
        {app.personalStatement && (
          <div className={styles.summaryStatement}>
            <div className={styles.summaryStatementLabel}>Personal Statement</div>
            <div className={styles.summaryStatementText}>"{app.personalStatement}"</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummarySection({ title, children }) {
  return (
    <div className={styles.summarySection}>
      <div className={styles.summarySectionTitle}>{title}</div>
      {children}
    </div>
  );
}
function SummaryRow({ label, value }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value || '—'}</span>
    </div>
  );
}

// ── STEP COMPONENTS ────────────────────────────────────────────────
function StepPersonal({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className={styles.stepBody}>
      <div className={styles.stepIntro}>Tell us who you are. This information will be used on your coach profile if approved.</div>
      <div className={styles.formGrid2}>
        <Field label="First Name *" required>
          <input value={data.firstName||''} onChange={e => set('firstName', e.target.value)} placeholder="First name" />
        </Field>
        <Field label="Last Name *" required>
          <input value={data.lastName||''} onChange={e => set('lastName', e.target.value)} placeholder="Last name" />
        </Field>
        <Field label="Email Address *" required>
          <input type="email" value={data.email||''} onChange={e => set('email', e.target.value)} placeholder="your@email.com" />
        </Field>
        <Field label="Phone Number">
          <input type="tel" value={data.phone||''} onChange={e => set('phone', e.target.value)} placeholder="605-000-0000" />
        </Field>
        <Field label="Location *" required className={styles.fullCol}>
          <input value={data.location||''} onChange={e => set('location', e.target.value)} placeholder="City, State" />
        </Field>
      </div>
    </div>
  );
}

function StepBackground({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });

  const toggleGame = (game) => {
    const cur = data.primaryGames || [];
    const next = cur.includes(game) ? cur.filter(g => g !== game) : [...cur, game];
    onChange({ ...data, primaryGames: next });
  };

  const setRank = (game, rank) => {
    onChange({ ...data, gameRanks: { ...(data.gameRanks||{}), [game]: rank } });
  };

  return (
    <div className={styles.stepBody}>
      <div className={styles.stepIntro}>Help us understand your competitive background and which games you'd like to coach.</div>
      <div className={styles.formGrid2}>
        <Field label="Years Playing Competitively *">
          <select value={data.yearsPlaying||''} onChange={e => set('yearsPlaying', e.target.value)}>
            <option value="">Select...</option>
            {YEARS_PLAYING.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Years Coaching Others">
          <select value={data.yearsCoaching||''} onChange={e => set('yearsCoaching', e.target.value)}>
            <option value="">Select...</option>
            {YEARS_COACHING.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Highest Competitive Level Reached *" className={styles.fullCol}>
          <select value={data.competitiveLevel||''} onChange={e => set('competitiveLevel', e.target.value)}>
            <option value="">Select...</option>
            {COMP_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.fieldLabel}>Primary Games You'd Coach * <span className={styles.fieldHint}>(select all that apply)</span></div>
        <div className={styles.gameChips}>
          {GAMES.map(g => (
            <button
              key={g}
              type="button"
              className={`${styles.gameChip} ${(data.primaryGames||[]).includes(g) ? styles.gameChipOn : ''}`}
              onClick={() => toggleGame(g)}
            >{g}</button>
          ))}
        </div>
      </div>

      {(data.primaryGames||[]).length > 0 && (
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>Your Rank in Selected Games</div>
          <div className={styles.rankGrid}>
            {(data.primaryGames||[]).map(g => (
              <Field key={g} label={g}>
                <input
                  value={(data.gameRanks||{})[g] || ''}
                  onChange={e => setRank(g, e.target.value)}
                  placeholder="e.g. Diamond II, Immortal, Champion..."
                />
              </Field>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepPhilosophy({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });

  const toggleAge = (age) => {
    const cur = data.targetAgeGroups || [];
    const next = cur.includes(age) ? cur.filter(a => a !== age) : [...cur, age];
    onChange({ ...data, targetAgeGroups: next });
  };

  return (
    <div className={styles.stepBody}>
      <div className={styles.stepIntro}>We want to know how you think about coaching. There are no wrong answers — we're looking for authenticity and self-awareness.</div>
      <Field label="Coaching Philosophy * " hint="What is your core belief about player development?" className={styles.fullCol}>
        <textarea
          rows={4}
          value={data.philosophy||''}
          onChange={e => set('philosophy', e.target.value)}
          placeholder="Describe your overall approach to helping players improve..."
        />
      </Field>
      <Field label="Coaching Style *" hint="How would you describe your coaching style in one sentence?" className={styles.fullCol}>
        <textarea
          rows={3}
          value={data.coachingStyle||''}
          onChange={e => set('coachingStyle', e.target.value)}
          placeholder="e.g. Analytical and data-driven, focusing on VOD review and habit building..."
        />
      </Field>
      <div className={styles.fieldGroup}>
        <div className={styles.fieldLabel}>Target Age Groups * <span className={styles.fieldHint}>(select all you're comfortable coaching)</span></div>
        <div className={styles.gameChips}>
          {AGE_GROUPS.map(a => (
            <button
              key={a} type="button"
              className={`${styles.gameChip} ${(data.targetAgeGroups||[]).includes(a) ? styles.gameChipOn : ''}`}
              onClick={() => toggleAge(a)}
            >{a}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepExperience({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });

  const addRef = () => {
    const refs = [...(data.references||[]), { name:'', role:'', contact:'' }];
    onChange({ ...data, references: refs });
  };
  const updateRef = (i, k, v) => {
    const refs = (data.references||[]).map((r, idx) => idx === i ? { ...r, [k]: v } : r);
    onChange({ ...data, references: refs });
  };
  const removeRef = (i) => {
    onChange({ ...data, references: (data.references||[]).filter((_, idx) => idx !== i) });
  };

  return (
    <div className={styles.stepBody}>
      <div className={styles.stepIntro}>Tell us about your coaching and competitive experience. Be specific — real experience sets strong applicants apart.</div>
      <Field label="Coaching & Competitive Experience *" hint="Describe teams coached, tournaments played, programs built, etc." className={styles.fullCol}>
        <textarea
          rows={5}
          value={data.experience||''}
          onChange={e => set('experience', e.target.value)}
          placeholder="e.g. Coached high school esports team for 2 seasons, helped build a 20-player community league, reached Diamond in ranked play..."
        />
      </Field>
      <Field label="Certifications or Training" hint="NACE, college programs, coaching courses, etc. (optional)" className={styles.fullCol}>
        <input
          value={data.certifications||''}
          onChange={e => set('certifications', e.target.value)}
          placeholder="e.g. NACE Certified Esports Competitor & Coach (2023)"
        />
      </Field>

      <div className={styles.fieldGroup}>
        <div className={styles.refsHeader}>
          <div>
            <div className={styles.fieldLabel}>References</div>
            <div className={styles.fieldHintBlock}>People who can vouch for your coaching ability. At least one recommended.</div>
          </div>
          <button type="button" className={styles.addRefBtn} onClick={addRef}>+ Add Reference</button>
        </div>
        {(data.references||[]).length === 0 && (
          <div className={styles.noRefs}>No references added yet. Add someone who can speak to your coaching or competitive experience.</div>
        )}
        {(data.references||[]).map((ref, i) => (
          <div key={i} className={styles.refCard}>
            <div className={styles.refCardNum}>#{i+1}</div>
            <div className={styles.refFields}>
              <Field label="Name"><input value={ref.name} onChange={e => updateRef(i,'name',e.target.value)} placeholder="Full name" /></Field>
              <Field label="Role / Relationship"><input value={ref.role} onChange={e => updateRef(i,'role',e.target.value)} placeholder="e.g. HS Esports Director, Former Player" /></Field>
              <Field label="Email or @handle" className={styles.fullCol}><input value={ref.contact} onChange={e => updateRef(i,'contact',e.target.value)} placeholder="email@address.com or @twitter" /></Field>
            </div>
            <button type="button" className={styles.removeRefBtn} onClick={() => removeRef(i)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepAvailability({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });

  const toggleDay = (d) => {
    const cur = data.availableDays || [];
    const next = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d];
    onChange({ ...data, availableDays: next });
  };

  return (
    <div className={styles.stepBody}>
      <div className={styles.stepIntro}>Help us understand when you're available to coach. Platform rates are set by HCEA — $51/hr for members and $60/hr for non-members.</div>

      <div className={styles.fieldGroup}>
        <div className={styles.fieldLabel}>Available Days *</div>
        <div className={styles.dayChips}>
          {DAYS_OF_WEEK.map((d, i) => (
            <button
              key={d} type="button"
              className={`${styles.dayChip} ${(data.availableDays||[]).includes(i) ? styles.dayChipOn : ''}`}
              onClick={() => toggleDay(i)}
            >{d}</button>
          ))}
        </div>
      </div>

      <Field label="Preferred Coaching Hours *" hint="Include timezone" className={styles.fullCol}>
        <input
          value={data.preferredHours||''}
          onChange={e => set('preferredHours', e.target.value)}
          placeholder="e.g. Weekday afternoons 3PM–8PM CST, Weekends flexible"
        />
      </Field>

    </div>
  );
}

function StepStatement({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const wordCount = (data.personalStatement||'').trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className={styles.stepBody}>
      <div className={styles.stepIntro}>This is your chance to stand out. Tell us why you want to coach for HCEA and what you'll bring to our students.</div>

      <Field label="Personal Statement *" hint={`${wordCount}/50 words minimum`} className={styles.fullCol}>
        <textarea
          rows={7}
          value={data.personalStatement||''}
          onChange={e => set('personalStatement', e.target.value)}
          placeholder="Why do you want to be an HCEA coach? What do you bring that's unique? How do esports and coaching fit into your life and values?"
        />
        <div className={styles.wordCount} style={{ color: wordCount >= 50 ? '#10b981' : '#f59e0b' }}>
          {wordCount} words {wordCount >= 50 ? '✓' : `(${50-wordCount} more to reach minimum)`}
        </div>
      </Field>

      <div className={styles.agreementSection}>
        <div className={styles.agreementTitle}>Agreements & Consent</div>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={!!data.agreedToTerms}
            onChange={e => set('agreedToTerms', e.target.checked)}
          />
          <div>
            <div className={styles.checkboxLabel}>I agree to HCEA's Coach Code of Conduct *</div>
            <div className={styles.checkboxHint}>I understand coaches are responsible for creating a safe, supportive, and professional environment for all students.</div>
          </div>
        </label>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={!!data.backgroundCheckConsent}
            onChange={e => set('backgroundCheckConsent', e.target.checked)}
          />
          <div>
            <div className={styles.checkboxLabel}>I consent to a background check *</div>
            <div className={styles.checkboxHint}>As HCEA works with youth under 18, all approved coaches are required to pass a background check before onboarding.</div>
          </div>
        </label>
      </div>
    </div>
  );
}

// ── FIELD HELPER ──────────────────────────────────────────────────
function Field({ label, hint, children, className, required }) {
  return (
    <div className={`${styles.field} ${className||''}`}>
      <label className={styles.fieldLabel}>
        {label}
        {hint && <span className={styles.fieldHint}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────
export default function CoachApplication() {
  const { user } = useAuth();
  const [step, setStep]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [existingApp, setExistingApp] = useState(null);
  const [forceNew, setForceNew]     = useState(false);
  const [errors, setErrors]         = useState([]);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    email:     user?.email     || '',
    phone:     user?.phone     || '',
    location:  '',
    yearsPlaying: '', yearsCoaching: '', competitiveLevel: '',
    primaryGames: [], gameRanks: {},
    philosophy: '', coachingStyle: '', targetAgeGroups: [],
    experience: '', certifications: '', references: [],
    availableDays: [], preferredHours: '',

    personalStatement: '',
    agreedToTerms: false, backgroundCheckConsent: false,
  });

  useEffect(() => {
    const load = async () => {
      if (user?.id) {
        const app = await coachAppApi.getMyApplication(user.id);
        setExistingApp(app);
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const validateStep = (s) => {
    const errs = [];
    const d = formData;
    if (s === 1) {
      if (!d.firstName?.trim()) errs.push('First name is required');
      if (!d.lastName?.trim())  errs.push('Last name is required');
      if (!d.email?.trim())     errs.push('Email is required');
      if (!d.location?.trim())  errs.push('Location is required');
    }
    if (s === 2) {
      if (!d.yearsPlaying)          errs.push('Years playing is required');
      if (!d.competitiveLevel)      errs.push('Competitive level is required');
      if (!d.primaryGames?.length)  errs.push('Select at least one game');
    }
    if (s === 3) {
      if (!d.philosophy?.trim())        errs.push('Coaching philosophy is required');
      if (!d.coachingStyle?.trim())     errs.push('Coaching style is required');
      if (!d.targetAgeGroups?.length)   errs.push('Select at least one age group');
    }
    if (s === 4) {
      if (!d.experience?.trim())  errs.push('Experience description is required');
    }
    if (s === 5) {
      if (!d.availableDays?.length)        errs.push('Select at least one available day');
      if (!d.preferredHours?.trim())       errs.push('Preferred hours is required');
    }
    if (s === 6) {
      const wc = (d.personalStatement||'').trim().split(/\s+/).filter(Boolean).length;
      if (wc < 50)           errs.push('Personal statement must be at least 50 words');
      if (!d.agreedToTerms)  errs.push('You must agree to the Coach Code of Conduct');
      if (!d.backgroundCheckConsent) errs.push('Background check consent is required');
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep(step);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setStep(s => Math.min(s + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrors([]);
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    const errs = validateStep(6);
    if (errs.length) { setErrors(errs); return; }
    setSubmitting(true);
    const res = await coachAppApi.submit(user.id, formData);
    setSubmitting(false);
    if (res.success) {
      setSubmitted(true);
      const app = await coachAppApi.getMyApplication(user.id);
      setExistingApp(app);
      setForceNew(false);
    } else {
      setErrors([res.error]);
    }
  };

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  if (loading) return <div className={styles.wrap}><Spinner /></div>;

  // Show existing application status (unless forcing a new one after rejection)
  if (existingApp && !forceNew) {
    return (
      <div className={styles.wrap}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Coach Application</h2>
          <p className={styles.pageSub}>Track the status of your HCEA coach application.</p>
        </div>
        <ApplicationStatus
          app={existingApp}
          onReapply={() => { setForceNew(true); setExistingApp(null); }}
        />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.wrap}>
        <div className={styles.successPage}>
          <div className={styles.successIcon}>🎯</div>
          <div className={styles.successTitle}>Application Submitted!</div>
          <p>Your coach application has been received. Our Head Admin team typically reviews applications within 5–7 business days. You'll receive an email notification when your status changes.</p>
          <div className={styles.successSteps}>
            <div className={styles.successStep}><span>1</span>Application review by Head Admin</div>
            <div className={styles.successStep}><span>2</span>Reference & rank verification</div>
            <div className={styles.successStep}><span>3</span>Interview / onboarding call</div>
            <div className={styles.successStep}><span>4</span>Background check & approval</div>
          </div>
        </div>
      </div>
    );
  }

  const stepContent = [
    <StepPersonal    key={1} data={formData} onChange={setFormData} />,
    <StepBackground  key={2} data={formData} onChange={setFormData} />,
    <StepPhilosophy  key={3} data={formData} onChange={setFormData} />,
    <StepExperience  key={4} data={formData} onChange={setFormData} />,
    <StepAvailability key={5} data={formData} onChange={setFormData} />,
    <StepStatement   key={6} data={formData} onChange={setFormData} />,
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Become an HCEA Coach</h2>
        <p className={styles.pageSub}>Join our roster of certified esports coaches. Help students grow — in game and in life.</p>
      </div>

      {/* Step progress bar */}
      <div className={styles.progressWrap}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <div className={styles.stepPills}>
          {STEPS.map(s => (
            <div
              key={s.id}
              className={`${styles.stepPill} ${step === s.id ? styles.stepPillActive : ''} ${step > s.id ? styles.stepPillDone : ''}`}
              onClick={() => step > s.id && setStep(s.id)}
            >
              <span className={styles.stepPillIcon}>{step > s.id ? '✓' : s.icon}</span>
              <span className={styles.stepPillLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step card */}
      <div className={styles.stepCard}>
        <div className={styles.stepCardHeader}>
          <div className={styles.stepNum}>Step {step} of {STEPS.length}</div>
          <div className={styles.stepTitle}>{STEPS[step-1].icon} {STEPS[step-1].label}</div>
        </div>

        {errors.length > 0 && (
          <div className={styles.errorBanner}>
            {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
          </div>
        )}

        {stepContent[step - 1]}

        <div className={styles.stepFooter}>
          {step > 1 && (
            <button className={styles.backBtn} onClick={handleBack}>← Back</button>
          )}
          <div className={styles.stepFooterRight}>
            <span className={styles.stepCounter}>{step} / {STEPS.length}</span>
            {step < STEPS.length ? (
              <button className={styles.nextBtn} onClick={handleNext}>Continue →</button>
            ) : (
              <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : '🚀 Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
