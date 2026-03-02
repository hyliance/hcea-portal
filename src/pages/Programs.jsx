import styles from './Programs.module.css';

const PROGRAMS = [
  { icon: '🏅', title: 'Summer Esports League', desc: '8-week summer league in HS and college divisions. Free for members. Fortnite, Marvel Rivals, Rocket League, Valorant, and Smash Bros.', cta: 'View Tournaments', ctaTab: 'tournaments' },
  { icon: '🏕️', title: 'Youth Summer Camp', desc: 'One-week camp for ages 10–16. Esports fundamentals mixed with physical team-building activities. Brackets for 10–13 and 14–16.', cta: 'Learn More', ctaAlert: 'Camp registration opens April 2025!' },
  { icon: '🎯', title: 'Coaching Sessions', desc: '1–2 hour weekly coaching sessions with Coach Zach. Members receive discounted rates. Available for LoL, Valorant, TFT, and more.', cta: 'Book a Session', ctaTab: 'sessions' },
  { icon: '🏆', title: 'Fundraising Tournaments', desc: 'Year-round competitive events with fee entry. Members get discounted rates. Non-members welcome at standard pricing.', cta: 'View Events', ctaTab: 'tournaments' },
  { icon: '📡', title: 'Esports Career Classes', desc: 'Tournament production, PC building, IT fundamentals, streaming, marketing, entrepreneurship, strategy analysis, and SEL classes.', cta: 'View Schedule', ctaAlert: 'Class schedule coming soon!' },
  { icon: '🏫', title: 'Program Consulting', desc: 'Full consulting services for K–12 schools, collegiate programs, and nonprofit organizations looking to launch or grow esports.', cta: 'Contact Zach', ctaHref: 'mailto:coachhylian@gmail.com' },
];

export default function Programs({ onNavigate }) {
  return (
    <div>
      <div className={styles.header}>
        <h2>Programs &amp; Services</h2>
        <p>Everything available to you as a High Caliber Esports Academy (HCEA) member.</p>
      </div>
      <div className={styles.grid}>
        {PROGRAMS.map((p, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.icon}>{p.icon}</div>
            <div className={styles.title}>{p.title}</div>
            <p className={styles.desc}>{p.desc}</p>
            {p.ctaTab && (
              <button className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.4rem 1.2rem', marginTop: 'auto' }} onClick={() => onNavigate(p.ctaTab)}>
                {p.cta} →
              </button>
            )}
            {p.ctaAlert && (
              <button className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.4rem 1.2rem', marginTop: 'auto' }} onClick={() => alert(p.ctaAlert)}>
                {p.cta} →
              </button>
            )}
            {p.ctaHref && (
              <a href={p.ctaHref} className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.4rem 1.2rem', marginTop: 'auto' }}>
                {p.cta} →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
