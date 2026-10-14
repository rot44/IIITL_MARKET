import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShoppingBag,
  PlusCircle,
  Inbox,
  Bookmark,
  MessageSquare,
  User,
  LogOut,
  LogIn
} from 'lucide-react';

export default function Navbar() {
  const { isLoggedIn, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar-header">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/" className="navbar-brand">
          <span>IIITL</span>Market
          <span className="navbar-brand-tag">iiitl.ac.in</span>
        </Link>

        {/* Links */}
        <ul className="navbar-nav">
          <li>
            <Link to="/home" className={`navbar-link ${isActive('/home') ? 'active' : ''}`}>
              <ShoppingBag size={16} />
              <span className="nav-text">Browse</span>
            </Link>
          </li>

          {isLoggedIn ? (
            <>
              <li>
                <Link to="/sell" className={`navbar-link ${isActive('/sell') ? 'active' : ''}`}>
                  <PlusCircle size={16} />
                  <span className="nav-text">Sell</span>
                </Link>
              </li>

              <li>
                <Link to="/orders" className={`navbar-link ${isActive('/orders') ? 'active' : ''}`}>
                  <Inbox size={16} />
                  <span className="nav-text">Orders</span>
                </Link>
              </li>

              <li>
                <Link to="/wishlist" className={`navbar-link ${isActive('/wishlist') ? 'active' : ''}`}>
                  <Bookmark size={16} />
                  <span className="nav-text">Saved</span>
                </Link>
              </li>

              <li>
                <Link to="/chat" className={`navbar-link ${isActive('/chat') || location.pathname.startsWith('/chat/') ? 'active' : ''}`}>
                  <MessageSquare size={16} />
                  <span className="nav-text">Chat</span>
                </Link>
              </li>

              <li>
                <Link to="/profile" className={`navbar-link ${isActive('/profile') ? 'active' : ''}`}>
                  <User size={16} />
                  <span className="nav-text">Profile</span>
                </Link>
              </li>

              <li style={{ marginLeft: '6px', borderLeft: '1px solid var(--border-default)', paddingLeft: '6px' }}>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="ui-btn ui-btn-ghost ui-btn-sm"
                  title="Sign out of account"
                >
                  <LogOut size={15} />
                  <span className="nav-text">Sign Out</span>
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link to="/login" className="ui-btn ui-btn-primary ui-btn-sm" style={{ gap: '6px' }}>
                <LogIn size={15} />
                <span>Sign In</span>
              </Link>
            </li>
          )}
        </ul>
      </div>
    </header>
  );
}
