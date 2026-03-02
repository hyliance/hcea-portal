import { useState, useEffect } from 'react';
import { orgsApi } from '../../api';
import { Spinner, Badge } from '../../components/UI';
import styles from './AdminOrgs.module.css';

const ORG_TYPES = ['Boys & Girls Club', 'YMCA', 'School', 'Community Center', 'Library', 'Church', 'Recreation Center', 'Other'];

const EMPTY_FORM = {
  name: '', type: '', location: '', description: '',
  managerName: '', managerEmail: '', managerPhone: '',
};

function OrgFormModal({ org, onClose, onSaved }) {
  const isEdit = !!org;
  const [form, setForm]     = useState(org ? {
    name: org.name, type: org.type, location: org.location, description: org.description,
    managerName: org.managerName, managerEmail: org.managerEmail, managerPhone: org.managerPhone || '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.type || !form.managerEmail.trim()) {
      return setError('Organization name, type, and manager email are required.');
    }
    setSaving(true);
    const data = {
      ...form,
      managerId: `user_${Date.now()}`,
      createdBy: 'user_admin',
    };
    if (isEdit) {
      await orgsApi.update(org.id, data);
      onSaved({ ...org, ...data });
    } else {
      const res = await orgsApi.create(data);
      if (res.success) onSaved(res.org, true);
      else setError('Failed to create organization.');
    }
    setSaving(false);
  };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <div className={styles.modalTitle}>{isEdit ? 'Edit Organization' : 'Create Organization'}</div>
            <div className={styles.modalSub}>
              {isEdit ? 'Update org details and manager info' : 'Set up a new org and assign a manager who can create youth player profiles'}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.sectionLabel}>Organization Details</div>
          <div className={styles.formGrid}>
            <div className={`${styles.fg} ${styles.fgFull}`}>
              <label>Organization Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Pierre Area Boys & Girls Club" />
            </div>
            <div className={styles.fg}>
              <label>Type *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="">Select type...</option>
                {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className={styles.fg}>
              <label>Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Pierre, SD" />
            </div>
            <div className={`${styles.fg} ${styles.fgFull}`}>
              <label>Description</label>
              <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of the organization..." />
            </div>
          </div>

          <div className={styles.sectionLabel} style={{ marginTop:'0.5rem' }}>
            Org Manager
            {!isEdit && <span className={styles.sectionHint}> — this person will get the <code>org_manager</code> role and can log in at <code>org@hcea.gg</code> (demo)</span>}
          </div>
          <div className={styles.managerNote}>
            The org manager can create youth player profiles, manage teams, and register players for tournaments on behalf of the organization.
          </div>
          <div className={styles.formGrid}>
            <div className={styles.fg}>
              <label>Manager Full Name *</label>
              <input value={form.managerName} onChange={e => set('managerName', e.target.value)} placeholder="Jamie Hoffman" />
            </div>
            <div className={styles.fg}>
              <label>Manager Email *</label>
              <input type="email" value={form.managerEmail} onChange={e => set('managerEmail', e.target.value)} placeholder="jamie@bgcpierre.org" />
            </div>
            <div className={styles.fg}>
              <label>Manager Phone</label>
              <input type="tel" value={form.managerPhone} onChange={e => set('managerPhone', e.target.value)} placeholder="605-555-0200" />
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className="btn btn-ghost" style={{ clipPath:'none' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.7rem 2rem' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Organization →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrgs() {
  const [orgs, setOrgs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editOrg, setEditOrg] = useState(null);

  useEffect(() => {
    orgsApi.getAll().then(d => { setOrgs(d); setLoading(false); });
  }, []);

  const handleSaved = (org, isNew) => {
    if (isNew) setOrgs(prev => [org, ...prev]);
    else setOrgs(prev => prev.map(o => o.id === org.id ? org : o));
    setShowForm(false);
    setEditOrg(null);
  };

  const handleDelete = async (org) => {
    if (!window.confirm(`Delete "${org.name}"? All youth player profiles under this org will also be removed.`)) return;
    await orgsApi.delete(org.id);
    setOrgs(prev => prev.filter(o => o.id !== org.id));
  };

  if (loading) return <Spinner />;

  return (
    <div className={styles.wrap}>
      <div style={{display:'inline-flex',alignItems:'center',gap:'0.4rem',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.16em',textTransform:'uppercase',color:'#3b82f6',background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.25)',padding:'0.25rem 0.85rem',marginBottom:'1rem'}}>
        🎓 HCEA Academy · Organizations
      </div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Organizations</div>
          <div className={styles.sub}>Create orgs and assign managers to let nonprofits manage youth player profiles.</div>
        </div>
        <button className="btn btn-primary" style={{ clipPath:'none', padding:'0.65rem 1.5rem' }} onClick={() => { setEditOrg(null); setShowForm(true); }}>
          + Create Organization
        </button>
      </div>

      {orgs.length === 0 ? (
        <div className={styles.empty}>No organizations yet. Create one to get started.</div>
      ) : (
        <div className={styles.orgList}>
          {orgs.map(org => (
            <div key={org.id} className={styles.orgCard}>
              <div className={styles.orgHead}>
                <div>
                  <div className={styles.orgName}>{org.name}</div>
                  <div className={styles.orgMeta}>
                    <span className={styles.orgType}>{org.type}</span>
                    {org.location && <><span>·</span><span>📍 {org.location}</span></>}
                    <span>·</span>
                    <Badge variant={org.active ? 'green' : 'red'}>{org.active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  {org.description && <p className={styles.orgDesc}>{org.description}</p>}
                </div>
                <div className={styles.orgActions}>
                  <button className={styles.editBtn} onClick={() => { setEditOrg(org); setShowForm(true); }}>✏️ Edit</button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(org)}>Delete</button>
                </div>
              </div>
              <div className={styles.managerRow}>
                <div className={styles.managerIcon}>👤</div>
                <div>
                  <div className={styles.managerLabel}>Org Manager</div>
                  <div className={styles.managerName}>{org.managerName}</div>
                  <div className={styles.managerEmail}>{org.managerEmail}</div>
                </div>
                <div className={styles.loginHint}>
                  <span className={styles.loginHintIcon}>🔑</span>
                  <span>Login: <code>{org.managerEmail}</code></span>
                </div>
              </div>
              <div className={styles.orgFooter}>
                <span className={styles.createdAt}>Created {org.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <OrgFormModal org={editOrg} onClose={() => { setShowForm(false); setEditOrg(null); }} onSaved={handleSaved} />
      )}
    </div>
  );
}
