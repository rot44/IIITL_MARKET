import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  User,
  ShieldCheck,
  Mail,
  GraduationCap,
  Building,
  Phone,
  Edit3,
  Plus,
  Star,
  CheckCircle2,
  Package,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { profileApi, listingsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const BRANCHES = [
  'Computer Science & Engineering (CSE)',
  'Information Technology (IT)',
  'Computer Science & Business (CSB)',
  'Artificial Intelligence & Data Science (AIDS)',
  'M.Tech Computer Science',
  'MBA (Digital Business)',
  'Other'
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG / PhD'];
const HOSTELS = ['Boys Hostel 1 (BH-1)', 'Boys Hostel 2 (BH-2)', 'Girls Hostel (GH)', 'Day Scholar'];

export default function Profile() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'edit'
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    roll_number: '',
    branch: '',
    year: '',
    hostel: '',
    phone: '',
    avatar_url: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [profRes, listRes] = await Promise.all([
        profileApi.getMyProfile().catch(() => ({ data: null })),
        listingsApi.getMine().catch(() => ({ data: [] }))
      ]);

      const prof = profRes.data;
      if (prof) {
        setProfile(prof);
        setFormData({
          full_name: prof.full_name || '',
          roll_number: prof.roll_number || '',
          branch: prof.branch || BRANCHES[0],
          year: prof.year || YEARS[1],
          hostel: prof.hostel || HOSTELS[0],
          phone: prof.phone || '',
          avatar_url: prof.avatar_url || ''
        });
      } else {
        setFormData(prev => ({
          ...prev,
          full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
        }));
      }

      setMyListings(listRes.data || prof?.listings || []);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await profileApi.updateProfile(formData);
      setProfile(res.data?.profile || formData);
      toast.success('Profile details saved!');
      setActiveTab('listings');
    } catch (err) {
      console.error('Update profile error:', err);
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSold = async (listing) => {
    try {
      const newSoldStatus = !listing.is_sold;
      await listingsApi.update(listing.id, { is_sold: newSoldStatus });
      setMyListings(prev => prev.map(l => l.id === listing.id ? { ...l, is_sold: newSoldStatus } : l));
      toast.success(newSoldStatus ? 'Marked as sold! 🎉' : 'Listing reactivated!');
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const activeCount = myListings.filter(l => !l.is_sold).length;
  const soldCount = myListings.filter(l => l.is_sold).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  const initials = (formData.full_name || user?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="container" style={{ paddingTop: '28px', paddingBottom: '80px', maxWidth: '960px' }}>
      
      {/* Profile Header Card */}
      <div className="ui-card" style={{ padding: '28px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Avatar */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'var(--brand-navy)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          fontWeight: 800,
          color: '#ffffff',
          flexShrink: 0
        }}>
          {initials}
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.45rem', color: 'var(--brand-navy)' }}>
              {formData.full_name || 'IIITL Student'}
            </h1>
            <span className="ui-badge ui-badge-green">
              <ShieldCheck size={13} />
              <span>Verified @iiitl.ac.in</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            <Mail size={14} />
            <span>{user?.email}</span>
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '10px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {formData.roll_number && (
              <span>Roll: <strong style={{ color: 'var(--text-title)' }}>{formData.roll_number}</strong></span>
            )}
            {formData.branch && <span>• {formData.branch}</span>}
            {formData.hostel && <span>• {formData.hostel}</span>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab(t => t === 'edit' ? 'listings' : 'edit')}
            className={`ui-btn ${activeTab === 'edit' ? 'ui-btn-primary' : 'ui-btn-secondary'} ui-btn-sm`}
          >
            <Edit3 size={14} />
            <span>{activeTab === 'edit' ? 'View Listings' : 'Edit Profile'}</span>
          </button>
          <Link to="/sell" className="ui-btn ui-btn-primary ui-btn-sm">
            <Plus size={14} />
            <span>Post Item</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <div className="ui-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--brand-navy)' }}>{activeCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
            Active Listings
          </div>
        </div>
        <div className="ui-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--brand-green)' }}>{soldCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
            Items Sold
          </div>
        </div>
        <div className="ui-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--brand-amber)' }}>
            ★ {profile?.rating ? Number(profile.rating).toFixed(1) : '5.0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
            Campus Rating
          </div>
        </div>
        <div className="ui-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--brand-blue)' }}>
            {myListings.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
            Total Posts
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ui-tabs" style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('listings')}
          className={`ui-tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
        >
          <span>My Listings ({myListings.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`ui-tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
        >
          <span>Account & College Info</span>
        </button>
      </div>

      {/* Tab Content: Listings */}
      {activeTab === 'listings' && (
        <div>
          {myListings.length === 0 ? (
            <div className="ui-empty-state">
              <div className="ui-empty-icon">
                <Package size={24} />
              </div>
              <h3 className="ui-empty-title">No listings posted yet</h3>
              <p className="ui-empty-desc">
                Got old textbooks, calculators, monitors, or cycles you don't need anymore? Post them for campus peers!
              </p>
              <Link to="/sell" className="ui-btn ui-btn-primary">
                Post an Item
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myListings.map(item => {
                const coverImg = item.images?.[0];
                return (
                  <div
                    key={item.id}
                    className="ui-card"
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap',
                      opacity: item.is_sold ? 0.75 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '240px' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        background: 'var(--color-subtle)',
                        border: '1px solid var(--border-default)',
                        flexShrink: 0
                      }}>
                        {coverImg ? (
                          <img src={coverImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <ShoppingBag size={20} />
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span className={`ui-badge ${item.is_sold ? 'ui-badge-sold' : 'ui-badge-green'}`}>
                            {item.is_sold ? 'Sold' : 'Active'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.categories?.name || 'Item'}
                          </span>
                        </div>
                        <Link to={`/listing/${item.id}`} style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-title)' }}>
                          {item.title}
                        </Link>
                        <div style={{ fontSize: '1rem', color: 'var(--brand-navy)', fontWeight: 800, marginTop: '2px' }}>
                          ₹{item.price}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleSold(item)}
                        className="ui-btn ui-btn-secondary ui-btn-sm"
                      >
                        {item.is_sold ? '↺ Reactivate' : '✓ Mark Sold'}
                      </button>
                      <Link to={`/listing/${item.id}/edit`} className="ui-btn ui-btn-secondary ui-btn-sm">
                        Edit
                      </Link>
                      <Link to={`/listing/${item.id}`} className="ui-btn ui-btn-ghost ui-btn-sm" title="View live page">
                        <ExternalLink size={15} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Edit Profile */}
      {activeTab === 'edit' && (
        <div className="ui-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--brand-navy)', marginBottom: '4px' }}>
            College Profile Information
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Helps verify and streamline meetup handoffs across campus hostels.
          </p>

          <form onSubmit={handleProfileSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              <div className="ui-form-group">
                <label className="ui-label">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="ui-input"
                  required
                />
              </div>

              <div className="ui-form-group">
                <label className="ui-label">Roll Number</label>
                <input
                  type="text"
                  name="roll_number"
                  value={formData.roll_number}
                  onChange={handleChange}
                  placeholder="e.g. LCS2025036"
                  className="ui-input"
                />
              </div>

              <div className="ui-form-group">
                <label className="ui-label">Branch / Degree</label>
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="ui-select"
                >
                  {BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="ui-form-group">
                <label className="ui-label">Year of Study</label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="ui-select"
                >
                  {YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="ui-form-group">
                <label className="ui-label">Hostel Residence</label>
                <select
                  name="hostel"
                  value={formData.hostel}
                  onChange={handleChange}
                  className="ui-select"
                >
                  {HOSTELS.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="ui-form-group">
                <label className="ui-label">Phone / WhatsApp (Optional)</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className="ui-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('listings')}
                className="ui-btn ui-btn-secondary ui-btn-sm"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ui-btn ui-btn-primary ui-btn-sm"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
