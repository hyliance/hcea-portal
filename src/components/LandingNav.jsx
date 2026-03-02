import { useState } from 'react';
import styles from './LandingNav.module.css';

export default function LandingNav({ onLogin, onJoin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [academyOpen, setAcademyOpen] = useState(false);

  const mainItems = [
    { label: 'Social Feed',     href: '#feed' },
    { label: 'Compete',         href: '#compete' },
    { label: 'Coaching',        href: '#coaching' },
    { label: 'Book a Session',  href: '#coaching', cta: true },
  ];

  const academyItems = [
    { label: 'About HCEA',              href: '#hcea' },
    { label: 'Youth Programs',          href: '#programs' },
    { label: 'Scholarships',            href: '#scholarships' },
    { label: 'Org / School Partners',   href: '#partnerships' },
    { label: 'Summer League',           href: '#summer-league' },
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        High <em>Caliber</em> <span className={styles.logoWord}>Gaming</span>
      </div>

      <ul className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
        {mainItems.map(item => (
          <li key={item.label}>
            {item.cta
              ? <a href={item.href} className={styles.navBookBtn} onClick={() => setMenuOpen(false)}>{item.label}</a>
              : <a href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
            }
          </li>
        ))}

        {/* HCEA dropdown */}
        <li className={styles.dropdownWrap}>
          <button
            className={`${styles.dropdownTrigger} ${academyOpen ? styles.dropdownTriggerOpen : ''}`}
            onClick={() => setAcademyOpen(p => !p)}
            onBlur={() => setTimeout(() => setAcademyOpen(false), 150)}
          >
            <span className={styles.hceaLabel}>🎓 HCEA</span>
            <span className={styles.dropdownCaret}>▾</span>
          </button>
          {academyOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownBrand}>High Caliber Esports Academy</div>
                <div className={styles.dropdownSub}>Youth esports development · South Dakota</div>
              </div>
              {academyItems.map(item => (
                <a key={item.label} href={item.href} className={styles.dropdownItem}
                  onClick={() => { setAcademyOpen(false); setMenuOpen(false); }}>
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </li>

        <li><button className="btn btn-ghost" onClick={onLogin}>Log In</button></li>
        <li><button className="btn btn-primary" onClick={onJoin}>Join HCG</button></li>
      </ul>

      <button className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
        <span /><span /><span />
      </button>
    </nav>
  );
}
