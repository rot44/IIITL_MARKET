import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { wishlistApi } from '../lib/api';

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await wishlistApi.getAll();
      setItems(res.data || []);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      toast.error('Failed to load saved items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (e, listingId) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await wishlistApi.remove(listingId);
      setItems(prev => prev.filter(w => w.listings?.id !== listingId && w.listing_id !== listingId));
      toast.info('Item removed from saved list.');
    } catch (err) {
      console.error('Error removing item from wishlist:', err);
      toast.error('Failed to remove item.');
    }
  };

  return (
    <div className="container" style={{ paddingTop: '28px', paddingBottom: '80px', maxWidth: '1040px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-navy)' }}>Saved Wishlist</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Items you bookmarked for later consideration.
          </p>
        </div>
        <Link to="/home" className="ui-btn ui-btn-secondary ui-btn-sm" style={{ gap: '6px' }}>
          <span>Browse Marketplace</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <div className="ui-empty-state">
          <div className="ui-empty-icon" style={{ color: 'var(--brand-red)' }}>
            <Heart size={24} fill="currentColor" />
          </div>
          <h3 className="ui-empty-title">Your wishlist is empty</h3>
          <p className="ui-empty-desc">
            Bookmark items you want to keep an eye on by clicking the heart icon on any product card.
          </p>
          <Link to="/home" className="ui-btn ui-btn-primary">
            Explore Campus Listings
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {items.map(w => {
            const item = w.listings;
            if (!item) return null;
            const coverImg = item.images?.[0];

            return (
              <div key={w.id || item.id} className="product-card">
                <Link to={`/listing/${item.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  
                  {/* Media */}
                  <div className="product-card-media">
                    {coverImg ? (
                      <img src={coverImg} alt="" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <ShoppingBag size={32} />
                      </div>
                    )}

                    <span className="product-card-tag">
                      {item.categories?.name || 'Item'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, item.id)}
                      className="product-card-wishlist active"
                      title="Remove from saved"
                    >
                      <Heart size={15} fill="currentColor" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="product-card-body">
                    <h3 className="product-card-title">{item.title}</h3>
                    
                    <div className="product-card-price-row">
                      <span className="product-card-price">₹{item.price}</span>
                      {item.is_negotiable && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--brand-green)', fontWeight: 600 }}>
                          Negotiable
                        </span>
                      )}
                    </div>

                    <div className="product-card-footer">
                      <span className="ui-badge ui-badge-neutral">{item.condition}</span>
                      {item.is_sold && (
                        <span className="ui-badge ui-badge-sold">Sold</span>
                      )}
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
