import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, Heart, MapPin, Plus, PackageX } from 'lucide-react';
import { listingsApi, wishlistApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const CONDITIONS = ['All', 'New', 'Like New', 'Good', 'Fair', 'Poor'];

const SORT_OPTIONS = [
  { label: 'Newest First', sort: 'created_at', order: 'desc' },
  { label: 'Price: Low to High', sort: 'price', order: 'asc' },
  { label: 'Price: High to Low', sort: 'price', order: 'desc' },
];

export default function Home() {
  const { isLoggedIn } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const activeCategory = searchParams.get('category') || 'All';
  const searchQuery = searchParams.get('q') || '';
  const selectedCondition = searchParams.get('condition') || 'All';
  const sortIndex = parseInt(searchParams.get('sort') || '0', 10);

  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    listingsApi.getCategories()
      .then(res => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      wishlistApi.getAll()
        .then(res => {
          const ids = new Set((res.data || []).map(w => w.listing_id || w.listings?.id));
          setWishlistIds(ids);
        })
        .catch(() => {});
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const params = {
          sort: SORT_OPTIONS[sortIndex].sort,
          order: SORT_OPTIONS[sortIndex].order,
        };

        if (searchQuery) params.search = searchQuery;
        if (selectedCondition !== 'All') params.condition = selectedCondition;

        if (activeCategory !== 'All') {
          const match = categories.find(c => c.name.toLowerCase() === activeCategory.toLowerCase());
          if (match) params.category = match.id;
        }

        const res = await listingsApi.getAll(params);
        setListings(res.data?.listings || []);
      } catch (err) {
        console.error('Error fetching listings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [activeCategory, searchQuery, selectedCondition, sortIndex, categories]);

  const updateQuery = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'All') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateQuery('q', searchInput.trim());
  };

  const handleToggleWishlist = async (e, listingId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      toast.info('Sign in to save items to your wishlist.');
      return;
    }

    const isSaved = wishlistIds.has(listingId);
    try {
      if (isSaved) {
        await wishlistApi.remove(listingId);
        setWishlistIds(prev => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
      } else {
        await wishlistApi.add(listingId);
        setWishlistIds(prev => new Set([...prev, listingId]));
        toast.success('Saved to wishlist');
      }
    } catch (err) {
      toast.error('Failed to update wishlist.');
    }
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      
      {/* ─── Search Banner (From College Bazaar) ─────────────── */}
      <section style={{
        background: '#e2e8f0',
        padding: '36px 20px',
        borderBottom: '1px solid var(--border-default)'
      }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search for books, calculators, induction, mattresses..."
                className="ui-input"
                style={{ padding: '12px 16px', fontSize: '0.9375rem', background: '#ffffff' }}
              />
            </div>
            <button
              type="submit"
              className="ui-btn ui-btn-primary"
              style={{ padding: '0 24px', fontSize: '0.9375rem' }}
            >
              <Search size={18} />
              <span>Search</span>
            </button>
          </form>
        </div>
      </section>

      {/* ─── Main Marketplace Body ──────────────────────────── */}
      <div className="container" style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>
          
          {/* Left Column: Filter Sidebar (College Bazaar style) */}
          <aside className="ui-card" style={{ width: '240px', padding: '20px', flexShrink: 0 }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--brand-navy)', marginBottom: '14px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px' }}>
              Categories
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => updateQuery('category', 'All')}
                style={{
                  textAlign: 'left',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.85rem',
                  fontWeight: activeCategory === 'All' ? 700 : 500,
                  color: activeCategory === 'All' ? 'var(--brand-blue)' : 'var(--text-body)',
                  background: activeCategory === 'All' ? '#f0f9ff' : 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                All Categories
              </button>

              {categories.map(c => {
                const isSelected = activeCategory.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => updateQuery('category', c.name)}
                    style={{
                      textAlign: 'left',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--brand-blue)' : 'var(--text-body)',
                      background: isSelected ? '#f0f9ff' : 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {c.icon || '📦'} {c.name}
                  </button>
                );
              })}
            </div>

            {/* Condition Filter */}
            <h3 style={{ fontSize: '1rem', color: 'var(--brand-navy)', marginBottom: '12px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px' }}>
              Condition
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
              {CONDITIONS.map(cond => {
                const isSelected = selectedCondition === cond;
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => updateQuery('condition', cond)}
                    style={{
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.8125rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--brand-blue)' : 'var(--text-muted)',
                      background: isSelected ? '#f0f9ff' : 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {cond === 'All' ? 'Any Condition' : cond}
                  </button>
                );
              })}
            </div>

            {/* Sort Selector */}
            <h3 style={{ fontSize: '1rem', color: 'var(--brand-navy)', marginBottom: '10px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px' }}>
              Sort
            </h3>
            <select
              value={sortIndex}
              onChange={(e) => updateQuery('sort', e.target.value)}
              className="ui-input"
              style={{ fontSize: '0.8125rem', padding: '6px 8px' }}
            >
              {SORT_OPTIONS.map((opt, idx) => (
                <option key={idx} value={idx}>{opt.label}</option>
              ))}
            </select>
          </aside>

          {/* Right Column: Listings Grid */}
          <main style={{ flex: 1, minWidth: 0 }}>
            
            {/* Header info bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {loading ? 'Loading listings...' : `${listings.length} item${listings.length === 1 ? '' : 's'} available`}
              </div>

              <Link to="/sell" className="ui-btn ui-btn-navy ui-btn-sm" style={{ gap: '6px' }}>
                <Plus size={15} />
                <span>Post an Item</span>
              </Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <div className="spinner" />
              </div>
            ) : listings.length === 0 ? (
              <div className="ui-card" style={{ padding: '56px 20px', textAlign: 'center' }}>
                <PackageX size={40} style={{ margin: '0 auto 12px', color: 'var(--text-faint)' }} />
                <h3 style={{ fontSize: '1.15rem', color: 'var(--text-title)', marginBottom: '6px' }}>
                  No listings found
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
                  There are no items matching this criteria on campus right now.
                </p>
                <Link to="/sell" className="ui-btn ui-btn-primary ui-btn-sm">
                  Be the first to list an item
                </Link>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '16px'
              }}>
                {listings.map(item => {
                  const coverImg = item.images?.[0];
                  const isSaved = wishlistIds.has(item.id);
                  const sellerName = item.profiles?.full_name || 'Student';
                  const location = item.location || item.profiles?.hostel || 'IIITL Campus';

                  return (
                    <Link
                      key={item.id}
                      to={`/listing/${item.id}`}
                      className="product-card"
                    >
                      {/* Media */}
                      <div className="product-card-media">
                        {coverImg ? (
                          <img src={coverImg} alt={item.title} loading="lazy" />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: '2rem' }}>
                            {item.categories?.icon || '📦'}
                          </div>
                        )}

                        <span className="product-card-tag">
                          {item.categories?.name || 'Item'}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleToggleWishlist(e, item.id)}
                          className={`product-card-wishlist ${isSaved ? 'active' : ''}`}
                          title="Save to wishlist"
                        >
                          <Heart size={14} fill={isSaved ? "currentColor" : "none"} />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="product-card-body">
                        <h4 className="product-card-title">
                          {item.title}
                        </h4>

                        <div className="product-card-price-row">
                          <span className="product-card-price">
                            ₹{item.price}
                          </span>
                          {item.is_negotiable && (
                            <span className="ui-badge ui-badge-amber" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                              Negotiable
                            </span>
                          )}
                        </div>

                        <div className="product-card-footer">
                          <span>{item.condition} condition</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={11} />
                            <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {location}
                            </span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

          </main>

        </div>
      </div>

    </div>
  );
}
