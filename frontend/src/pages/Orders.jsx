import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ShoppingBag,
  RefreshCw,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { ordersApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'buying' | 'selling'
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await ordersApi.getAll();
      setOrders(res.data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      toast.error('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await ordersApi.updateStatus(orderId, newStatus);
      toast.success(`Request marked as ${newStatus}!`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      console.error('Update order status error:', err);
      toast.error(err.response?.data?.error || 'Failed to update request.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'buying') return order.buyer_id === user?.id;
    if (filter === 'selling') return order.seller_id === user?.id;
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="ui-badge ui-badge-amber">
            <Clock size={12} />
            <span>Pending Response</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="ui-badge ui-badge-green">
            <CheckCircle2 size={12} />
            <span>Accepted • Chat Active</span>
          </span>
        );
      case 'completed':
        return (
          <span className="ui-badge ui-badge-blue">
            <CheckCircle2 size={12} />
            <span>Deal Completed</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="ui-badge ui-badge-neutral">
            <XCircle size={12} />
            <span>Declined</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="ui-badge ui-badge-neutral">
            <span>Cancelled</span>
          </span>
        );
      default:
        return <span className="ui-badge ui-badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="container" style={{ paddingTop: '28px', paddingBottom: '80px', maxWidth: '960px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-navy)' }}>Orders & Requests</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Keep track of campus purchase requests and incoming offers.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="ui-btn ui-btn-secondary ui-btn-sm"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Pills */}
      <div className="ui-filter-pills" style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setFilter('all')}
          className={`ui-filter-pill ${filter === 'all' ? 'active' : ''}`}
        >
          All Requests ({orders.length})
        </button>
        <button
          onClick={() => setFilter('buying')}
          className={`ui-filter-pill ${filter === 'buying' ? 'active' : ''}`}
        >
          Buying ({orders.filter(o => o.buyer_id === user?.id).length})
        </button>
        <button
          onClick={() => setFilter('selling')}
          className={`ui-filter-pill ${filter === 'selling' ? 'active' : ''}`}
        >
          Selling ({orders.filter(o => o.seller_id === user?.id).length})
        </button>
      </div>

      {/* Main List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="ui-empty-state">
          <div className="ui-empty-icon">
            <ShoppingBag size={24} />
          </div>
          <h3 className="ui-empty-title">No orders found</h3>
          <p className="ui-empty-desc">
            {filter === 'buying'
              ? 'You have not sent any purchase requests yet. Explore the marketplace to find campus essentials!'
              : filter === 'selling'
              ? 'No requests received yet for your active listings.'
              : 'You have no active or completed purchase requests.'}
          </p>
          <Link to="/home" className="ui-btn ui-btn-primary">
            Explore Marketplace
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredOrders.map(order => {
            const isBuyer = order.buyer_id === user?.id;
            const listing = order.listings;
            const counterparty = isBuyer ? order.seller_profile : order.buyer_profile;
            const coverImg = listing?.images?.[0];

            return (
              <div
                key={order.id}
                className="ui-card"
                style={{ padding: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: '90px',
                  height: '90px',
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
                      <ShoppingBag size={24} />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: isBuyer ? '#f0f9ff' : '#fef3c7',
                      color: isBuyer ? 'var(--brand-blue)' : 'var(--brand-amber)'
                    }}>
                      {isBuyer ? 'YOU ARE BUYER' : 'YOU ARE SELLER'}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>

                  <h3 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>
                    <Link to={listing ? `/listing/${listing.id}` : '#'} style={{ color: 'var(--text-title)' }}>
                      {listing?.title || 'Campus Item'}
                    </Link>
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <span style={{ fontWeight: 800, color: 'var(--brand-navy)', fontSize: '1rem' }}>
                      ₹{listing?.price || '—'}
                    </span>
                    <span>•</span>
                    <span>
                      {isBuyer ? 'Seller: ' : 'Buyer: '}
                      <strong>{counterparty?.full_name || counterparty?.email || 'Student'}</strong>
                    </span>
                    {listing?.location && (
                      <>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={13} /> {listing.location}
                        </span>
                      </>
                    )}
                  </div>

                  {order.message && (
                    <p style={{
                      marginTop: '8px',
                      fontSize: '0.8125rem',
                      color: 'var(--text-body)',
                      background: 'var(--color-subtle)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '2px solid var(--border-strong)'
                    }}>
                      "{order.message}"
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
                  {order.status === 'pending' && !isBuyer && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'accepted')}
                        disabled={updatingId === order.id}
                        className="ui-btn ui-btn-primary ui-btn-sm"
                      >
                        Accept Request
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'rejected')}
                        disabled={updatingId === order.id}
                        className="ui-btn ui-btn-ghost ui-btn-sm"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {order.status === 'accepted' && (
                    <>
                      <button
                        onClick={() => navigate(`/chat/${order.id}`)}
                        className="ui-btn ui-btn-primary ui-btn-sm"
                      >
                        <MessageSquare size={14} />
                        <span>Chat on Campus</span>
                      </button>

                      {!isBuyer && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'completed')}
                          disabled={updatingId === order.id}
                          className="ui-btn ui-btn-secondary ui-btn-sm"
                        >
                          Mark Completed
                        </button>
                      )}
                    </>
                  )}

                  {order.status === 'completed' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--brand-green)', fontWeight: 600, textAlign: 'center' }}>
                      ✓ Deal Closed
                    </div>
                  )}

                  <Link
                    to={listing ? `/listing/${listing.id}` : '#'}
                    className="ui-btn ui-btn-ghost ui-btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    View Listing
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
