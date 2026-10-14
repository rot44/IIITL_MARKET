import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Heart, Share2, MapPin, ArrowLeft, ShoppingBag, ShieldCheck } from 'lucide-react';
import { listingsApi, ordersApi, wishlistApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');
  const [sendingOrder, setSendingOrder] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        const res = await listingsApi.getById(id);
        setListing(res.data);
      } catch (err) {
        console.error('Failed to load listing:', err);
        toast.error('Listing not found.');
        navigate('/home');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchListing();
  }, [id, navigate]);

  useEffect(() => {
    if (isLoggedIn && id) {
      wishlistApi.check(id)
        .then(res => setIsSaved(res.data?.in_wishlist || false))
        .catch(() => {});
    }
  }, [isLoggedIn, id]);

  const handleToggleWishlist = async () => {
    if (!isLoggedIn) {
      toast.info('Sign in to save this item.');
      navigate('/login');
      return;
    }

    try {
      if (isSaved) {
        await wishlistApi.remove(id);
        setIsSaved(false);
      } else {
        await wishlistApi.add(id);
        setIsSaved(true);
        toast.success('Saved to wishlist!');
      }
    } catch (err) {
      toast.error('Failed to update wishlist.');
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const handleSendPurchaseRequest = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      toast.info('Please sign in with your @iiitl.ac.in email to request this item.');
      navigate('/login');
      return;
    }

    setSendingOrder(true);
    try {
      await ordersApi.create({
        listing_id: id,
        message: orderMessage.trim() || 'Hi! I would like to buy this item. When and where can we meet on campus?'
      });
      toast.success('Purchase request sent to seller!');
      setShowBuyModal(false);
      navigate('/orders');
    } catch (err) {
      console.error('Purchase request error:', err);
      toast.error(err.response?.data?.error || 'Failed to send request.');
    } finally {
      setSendingOrder(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!listing) return null;

  const isOwner = user?.id === listing.seller_id;
  const images = listing.images?.length > 0 ? listing.images : [];
  const currentImage = images[activeImageIndex];
  const seller = listing.profiles || {};

  return (
    <div className="container" style={{ paddingTop: '28px', paddingBottom: '80px', maxWidth: '1040px' }}>
      
      {/* Breadcrumb row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="ui-btn ui-btn-ghost ui-btn-sm"
          style={{ gap: '6px' }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={handleShare} className="ui-btn ui-btn-secondary ui-btn-sm" title="Share link">
            <Share2 size={15} />
            <span>Share</span>
          </button>
          <button
            type="button"
            onClick={handleToggleWishlist}
            className={`ui-btn ui-btn-secondary ui-btn-sm ${isSaved ? 'ui-btn-danger' : ''}`}
          >
            <Heart size={15} fill={isSaved ? "currentColor" : "none"} />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>

      {/* Main Product Showcase */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.1fr) 1fr', gap: '32px' }}>
        
        {/* Left Column: Photos */}
        <div>
          <div className="ui-card" style={{ overflow: 'hidden', marginBottom: '12px', background: '#f8fafc' }}>
            <div style={{ width: '100%', aspectRatio: '4/3' }}>
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={listing.title}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                  {listing.categories?.icon || '📦'}
                </div>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    border: `2px solid ${idx === activeImageIndex ? 'var(--brand-blue)' : 'var(--border-default)'}`,
                    background: '#ffffff',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Info & Buy */}
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <span className="ui-badge ui-badge-amber">
              {listing.categories?.name || 'General'}
            </span>
            <span className="ui-badge ui-badge-neutral">
              Condition: {listing.condition}
            </span>
            {listing.is_sold && (
              <span className="ui-badge ui-badge-sold">Sold</span>
            )}
          </div>

          <h1 style={{ fontSize: '1.65rem', color: 'var(--brand-navy)', marginBottom: '12px' }}>
            {listing.title}
          </h1>

          <div style={{
            background: 'var(--color-subtle)',
            padding: '16px',
            borderRadius: 'var(--radius)',
            marginBottom: '20px',
            border: '1px solid var(--border-default)'
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--brand-navy)' }}>
                ₹{listing.price}
              </span>
              {listing.is_negotiable && (
                <span className="ui-badge ui-badge-amber">
                  Price Negotiable
                </span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            {isOwner ? (
              <Link to={`/listing/${listing.id}/edit`} className="ui-btn ui-btn-secondary ui-btn-lg" style={{ width: '100%' }}>
                ✏️ Edit Your Listing
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowBuyModal(true)}
                className="ui-btn ui-btn-primary ui-btn-lg"
                style={{ width: '100%' }}
                disabled={listing.is_sold}
              >
                {listing.is_sold ? 'Item Sold Out' : 'Request to Buy / Contact Seller'}
              </button>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.9375rem', color: 'var(--brand-navy)', marginBottom: '8px' }}>
              Description
            </h3>
            <p style={{ whiteSpace: 'pre-line', fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
              {listing.description || 'No detailed description provided by the seller.'}
            </p>
          </div>

          {/* Location */}
          {listing.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#ffffff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', marginBottom: '24px' }}>
              <MapPin size={16} color="var(--brand-blue)" />
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pickup Location: </span>
                <strong style={{ color: 'var(--text-title)' }}>{listing.location}</strong>
              </div>
            </div>
          )}

          {/* Seller Card */}
          <div className="ui-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Seller
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--brand-navy)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}>
                {(seller.full_name || 'U').charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-title)' }}>
                  {seller.full_name || 'IIITL Student'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {seller.branch || 'IIIT Lucknow'} {seller.year ? `• ${seller.year}` : ''}
                </div>
              </div>

              {seller.id && (
                <Link to={`/user/${seller.id}`} className="ui-btn ui-btn-ghost ui-btn-sm">
                  Profile →
                </Link>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Buy Request Modal */}
      {showBuyModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="ui-card" style={{ maxWidth: '460px', width: '100%', padding: '24px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--brand-navy)' }}>Send Purchase Request</h3>
              <button
                type="button"
                onClick={() => setShowBuyModal(false)}
                className="ui-btn ui-btn-ghost ui-btn-sm"
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Send an inquiry to <strong>{seller.full_name || 'seller'}</strong> for ₹{listing.price}. When accepted, you can coordinate the exchange via chat!
            </p>

            <form onSubmit={handleSendPurchaseRequest}>
              <div className="ui-form-group">
                <label className="ui-label">Note for the Seller (Optional)</label>
                <textarea
                  value={orderMessage}
                  onChange={(e) => setOrderMessage(e.target.value)}
                  placeholder="e.g. Can we meet near BH-1 this evening? Is the price flexible?"
                  className="ui-input"
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowBuyModal(false)}
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  disabled={sendingOrder}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn-primary ui-btn-sm"
                  disabled={sendingOrder}
                >
                  {sendingOrder ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
