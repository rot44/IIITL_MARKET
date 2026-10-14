import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Home from './pages/Home';
import ListingDetail from './pages/ListingDetail';
import SellItem from './pages/SellItem';
import EditListing from './pages/EditListing';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Orders from './pages/Orders';
import Chat from './pages/Chat';
import Wishlist from './pages/Wishlist';

export default function App() {
  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="main-content">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/user/:id" element={<UserProfile />} />

          {/* Protected routes */}
          <Route
            path="/sell"
            element={
              <ProtectedRoute>
                <SellItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/listing/:id/edit"
            element={
              <ProtectedRoute>
                <EditListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:orderId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-default)',
        padding: '32px 0',
        background: '#ffffff',
        textAlign: 'center',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)'
      }}>
        <div className="container">
          <p style={{ margin: 0 }}>
            <strong style={{ color: 'var(--brand-navy)' }}>IIITL Market</strong> — Peer-to-Peer Campus Marketplace for Indian Institute of Information Technology, Lucknow.
          </p>
          <p style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-faint)' }}>
            Restricted exclusively to verified @iiitl.ac.in students • Zero platform commission • Direct campus handovers
          </p>
        </div>
      </footer>
    </div>
  );
}
