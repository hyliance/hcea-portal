import styles from './UI.module.css';

// ── STAT CARD ──
export function StatCard({ label, value, sub, trend, trendUp }) {
  return (
    <div className={styles.dstat}>
      <div className={styles.dstatLabel}>{label}</div>
      <div className={styles.dstatNum}>{value}</div>
      {sub && <div className={styles.dstatSub}>{sub}</div>}
      {trend && <div className={`${styles.dstatTrend} ${trendUp ? styles.trendUp : styles.trendGold}`}>{trend}</div>}
    </div>
  );
}

// ── BADGE ──
export function Badge({ children, variant = 'blue' }) {
  return <span className={`${styles.badge} ${styles[`badge_${variant}`]}`}>{children}</span>;
}

// ── SECTION HEADER ──
export function SectionHeader({ eyebrow, title, titleAccent, lead }) {
  return (
    <div className={styles.sectionHeader}>
      <div className={styles.eyebrow}>{eyebrow}</div>
      <h2 className={styles.h2}>{title} <em>{titleAccent}</em></h2>
      {lead && <p className={styles.lead}>{lead}</p>}
    </div>
  );
}

// ── LOADING SPINNER ──
export function Spinner() {
  return (
    <div className={styles.spinnerWrap}>
      <div className={styles.spinner} />
    </div>
  );
}

// ── CARD ──
export function Card({ children, className = '', featured = false, gold = false }) {
  return (
    <div className={`${styles.card} ${featured ? styles.cardFeatured : ''} ${gold ? styles.cardGold : ''} ${className}`}>
      {children}
    </div>
  );
}

// ── CONTACT LINK ──
export function ContactLink({ icon, href, children }) {
  return (
    <a href={href} className={styles.clink} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
      <div className={styles.clinkIcon}>{icon}</div>
      <span>{children}</span>
    </a>
  );
}
