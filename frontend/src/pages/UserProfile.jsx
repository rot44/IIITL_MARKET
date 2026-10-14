import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Star,
  ShoppingBag,
  Package,
  MapPin,
  ArrowLeft
} from 'lucide-react';
import { profileApi } from '../lib/api';

export default function UserProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    profileApi.getUserProfile(id)
      .then(res => setProfile(res.data))
      .catch(err => {
        console.error('Error fetching user profile:', err);
        setError('User not found.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '100px', paddingBottom: '80px' }}>
        <h2 style={{ color: 'var(--brand-navy)', marginBottom: '8px' }}>User Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          This student profile does not exist or has been removed.
        </p>
        <Link to="/home" className="ui-btn ui-btn-primary ui-btn-sm">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const activeListings = profile.active_listings || profile.listings?.filter(l => !l.is_sold) || [];
  const initials = (profile.full_name || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="container" style={{ paddingTop: '28px', paddingBottom: '80px', maxWidth: '1040px' }}>
      
      {/* Top Back Link */}
      <div style={{ marginBottom: '20px' }}>
        <Link to="/home" className="ui-btn ui-btn-ghost ui-btn-sm" style={{ gap: '6px' }}>
          <ArrowLeft size={16} />
          <span>Marketplace</span>
        </Link>
      </div>

      {/* Profile Card */}
      <div className="ui-card" style={{ padding: '28px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'var(--brand-navy)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          fontWeight: 800,
          flexShrink: 0
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.45rem', color: 'var(--brand-navy)' }}>
              {profile.full_name || 'IIITL Student'}
            </h1>
            <span className="ui-badge ui-badge-green">
              <ShieldCheck size={13} />
              <span>Verified @iiitl.ac.in</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {profile.branch && <span>{profile.branch}</span>}
            {profile.year && <span>• {profile.year}</span>}
            {profile.hostel && <span>• 🏠 {profile.hostel}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-amber)' }}>
              ★ {profile.rating ? Number(profile.rating).toFixed(1) : '5.0'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Rating</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-navy)' }}>
              {profile.total_sales || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Deals</div>
          </div>
        </div>
      </div>

      {/* Listings Header */}
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--brand-navy)' }}>
          Active Items by {profile.full_name?.split(' ')[0] || 'Seller'} ({activeListings.length})
        </h2>
      </div>

      {activeListings.length === 0 ? (
        <div className="ui-empty-state">
          <div className="ui-empty-icon">
            <Package size={24} />
          </div>
          <h3 className="ui-empty-title">No active items</h3>
          <p className="ui-empty-desc">This student does not have any active items listed right now.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {activeListings.map(item => {
            const coverImg = item.images?.[0];
            return (
              <div key={item.id} className="product-card">
                <Link to={`/listing/${item.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="product-card-media">
                    {coverImg ? (
                      <img src={coverImg} alt={item.title} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <ShoppingBag size={32} />
                      </div>
                    )}
                    <span className="product-card-tag">{item.categories?.name || 'Item'}</span>
                  </div>

                  <div className="product-card-body">
                    <h3 className="product-card-title">{item.title}</h3>
                    <div className="product-card-price-row">
                      <span className="product-card-price">₹{item.price}</span>
                    </div>
                    <div className="product-card-footer">
                      <span className="ui-badge ui-badge-neutral">{item.condition}</span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
