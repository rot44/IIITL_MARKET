import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Send,
  MessageSquare,
  ShoppingBag,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin
} from 'lucide-react';
import { chatApi, ordersApi } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function Chat() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeOrderId, setActiveOrderId] = useState(orderId || null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoadingList(true);
      const res = await chatApi.getConversations();
      const list = res.data || [];
      setConversations(list);

      if (!orderId && list.length > 0 && !activeOrderId) {
        setActiveOrderId(list[0].id);
        navigate(`/chat/${list[0].id}`, { replace: true });
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (orderId && orderId !== activeOrderId) {
      setActiveOrderId(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    if (!activeOrderId) return;

    let isMounted = true;
    setLoadingMessages(true);

    Promise.all([
      chatApi.getMessages(activeOrderId).catch(() => ({ data: [] })),
      ordersApi.getById(activeOrderId).catch(() => ({ data: null }))
    ]).then(([msgRes, orderRes]) => {
      if (!isMounted) return;
      setMessages(msgRes.data || []);
      setActiveOrder(orderRes.data || null);
      setLoadingMessages(false);
    });

    const channelName = `realtime-chat-${activeOrderId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `order_id=eq.${activeOrderId}`
        },
        (payload) => {
          if (!isMounted) return;
          const newMsg = payload.new;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeOrderId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeOrderId || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await chatApi.sendMessage(activeOrderId, content);
      const sentMessage = res.data;
      if (sentMessage) {
        setMessages(prev => {
          if (prev.some(m => m.id === sentMessage.id)) return prev;
          return [...prev, sentMessage];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error(err.response?.data?.error || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const getCounterparty = (conv) => {
    if (!conv || !user) return { name: 'Student', hostel: '' };
    return conv.buyer_id === user.id ? conv.seller : conv.buyer;
  };

  return (
    <div className="container" style={{ paddingTop: '20px', paddingBottom: '40px', maxWidth: '1160px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-navy)' }}>Campus Chat</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '2px' }}>
          Coordinate meetups and inspect items safely on campus with verified classmates.
        </p>
      </div>

      {/* Split Chat Box */}
      <div className="chat-container">
        
        {/* Left Sidebar */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            <span>Conversations</span>
          </div>

          <div className="chat-conv-list">
            {loadingList ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                <div className="spinner" />
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                <MessageSquare size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.8125rem' }}>No active conversations.</p>
                <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                  Request an item from the marketplace to chat.
                </p>
              </div>
            ) : (
              conversations.map(conv => {
                const isSelected = conv.id === activeOrderId;
                const other = getCounterparty(conv);
                const item = conv.listings;
                const thumb = item?.images?.[0];

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveOrderId(conv.id);
                      navigate(`/chat/${conv.id}`);
                    }}
                    className={`chat-conv-item ${isSelected ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        background: 'var(--color-subtle)',
                        border: '1px solid var(--border-default)',
                        flexShrink: 0
                      }}>
                        {thumb ? (
                          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <ShoppingBag size={16} />
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {other?.full_name || other?.email?.split('@')[0] || 'Classmate'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                          {item?.title || 'Campus Item'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Chat Main */}
        <main className="chat-main">
          {activeOrderId ? (
            <>
              {/* Header */}
              <div className="chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--brand-navy)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.875rem'
                  }}>
                    {(activeOrder ? (
                      activeOrder.buyer_id === user?.id
                        ? activeOrder.seller?.full_name || 'S'
                        : activeOrder.buyer?.full_name || 'B'
                    ) : 'U').charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-title)' }}>
                      {activeOrder ? (
                        activeOrder.buyer_id === user?.id
                          ? activeOrder.seller?.full_name || 'Seller'
                          : activeOrder.buyer?.full_name || 'Buyer'
                      ) : 'Campus Peer'}
                    </h2>
                    {activeOrder?.listings && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Regarding: <strong>{activeOrder.listings.title}</strong> (₹{activeOrder.listings.price})
                      </div>
                    )}
                  </div>
                </div>

                {activeOrder?.listing_id && (
                  <Link
                    to={`/listing/${activeOrder.listing_id}`}
                    className="ui-btn ui-btn-secondary ui-btn-sm"
                  >
                    <span>View Item</span>
                    <ArrowUpRight size={13} />
                  </Link>
                )}
              </div>

              {/* Messages Thread */}
              <div className="chat-messages">
                {loadingMessages ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <div className="spinner" />
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', maxWidth: '340px' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-title)', marginBottom: '4px' }}>
                      Coordinate campus meeting
                    </p>
                    <p style={{ fontSize: '0.8125rem' }}>
                      Agree on a time and location (BH-1, BH-2, GH, or Canteen) to inspect the item.
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.sender_id === user?.id;
                    const timeStr = new Date(msg.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`chat-bubble ${isMine ? 'chat-bubble-mine' : 'chat-bubble-theirs'}`}
                      >
                        <div>{msg.content}</div>
                        <div className="chat-bubble-time">{timeStr}</div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <form onSubmit={handleSend} className="chat-input-row">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message (e.g. Can we meet near BH-1 at 6 PM?)..."
                  className="ui-input"
                  disabled={sending}
                />
                <button
                  type="submit"
                  className="ui-btn ui-btn-primary"
                  disabled={!inputText.trim() || sending}
                >
                  <Send size={15} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <MessageSquare size={36} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-title)' }}>Select an inquiry</h3>
              <p style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
                Choose a conversation from the left to start chatting.
              </p>
            </div>
          )}
        </main>

      </div>

    </div>
  );
}
