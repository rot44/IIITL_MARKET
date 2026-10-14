import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingBag, PlusCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  const { isLoggedIn } = useAuth();

  return (
    <div style={{ paddingBottom: '80px' }}>
      
      {/* ─── Hero Section (College Bazaar Style) ─────────────── */}
      <section style={{
        background: '#e2e8f0',
        padding: '64px 20px 72px',
        borderBottom: '1px solid var(--border-default)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 800,
            color: 'var(--brand-green)',
            marginBottom: '12px'
          }}>
            Your College Needs At One Place
          </h1>

          <p style={{
            fontSize: '1.15rem',
            color: 'var(--brand-navy)',
            fontWeight: 500,
            marginBottom: '28px'
          }}>
            Connect with your IIIT Lucknow peers to buy and sell campus essentials at student-friendly prices.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to={isLoggedIn ? "/home" : "/login"}
              className="ui-btn ui-btn-primary ui-btn-lg"
              style={{ padding: '12px 28px', fontSize: '1rem' }}
            >
              Get Started For Free
            </Link>

            <Link
              to="/home"
              className="ui-btn ui-btn-secondary ui-btn-lg"
              style={{ padding: '12px 28px', fontSize: '1rem' }}
            >
              Browse Items
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Roadmap Section (From College Bazaar) ────────────── */}
      <section className="container" style={{ marginTop: '56px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--brand-navy)', marginBottom: '8px' }}>
            How It Works
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            Four simple steps to buy and sell on the IIIT Lucknow campus.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          
          {/* Step 1 */}
          <div className="ui-card" style={{ padding: '24px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--brand-green)', letterSpacing: '0.05em' }}>
              STEP 01
            </span>
            <h3 style={{ fontSize: '1.1rem', marginTop: '6px', marginBottom: '10px' }}>
              Find Your Spare Items
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Passing out or clearing your hostel room? Gather items you no longer need — like calculators, books, stationary, induction cooktops, or cycles.
            </p>
          </div>

          {/* Step 2 */}
          <div className="ui-card" style={{ padding: '24px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--brand-blue)', letterSpacing: '0.05em' }}>
              STEP 02
            </span>
            <h3 style={{ fontSize: '1.1rem', marginTop: '6px', marginBottom: '10px' }}>
              Post On Site Hassle-Free
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Fill in basic details, condition, price, and add clear photos of the item. No listing charges or hidden cuts.
            </p>
          </div>

          {/* Step 3 */}
          <div className="ui-card" style={{ padding: '24px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--brand-green)', letterSpacing: '0.05em' }}>
              STEP 03
            </span>
            <h3 style={{ fontSize: '1.1rem', marginTop: '6px', marginBottom: '10px' }}>
              Connect With Campus Buyers
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Receive purchase requests from verified @iiitl.ac.in classmates and chat directly in real-time to discuss details.
            </p>
          </div>

          {/* Step 4 */}
          <div className="ui-card" style={{ padding: '24px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--brand-blue)', letterSpacing: '0.05em' }}>
              STEP 04
            </span>
            <h3 style={{ fontSize: '1.1rem', marginTop: '6px', marginBottom: '10px' }}>
              Meet Up & Close the Deal
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Pick a convenient spot on campus — BH-1, BH-2, the academic block, or canteen — inspect the item, and exchange via cash or UPI.
            </p>
          </div>

        </div>
      </section>

      {/* ─── Call to Action ──────────────────────────────────── */}
      <section className="container" style={{ marginTop: '56px' }}>
        <div style={{
          background: 'var(--brand-navy)',
          color: '#ffffff',
          borderRadius: 'var(--radius)',
          padding: '48px 32px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.75rem', color: '#ffffff', marginBottom: '10px' }}>
            Ready to trade on campus?
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9375rem', maxWidth: '500px', margin: '0 auto 24px' }}>
            Explore what fellow students have listed or list your own spare items in less than a minute.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/home" className="ui-btn ui-btn-primary ui-btn-lg">
              Explore Marketplace
            </Link>
            <Link to={isLoggedIn ? "/sell" : "/login"} className="ui-btn ui-btn-secondary ui-btn-lg">
              Post an Item
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
