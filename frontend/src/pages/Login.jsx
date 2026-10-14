import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mail, KeyRound, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ALLOWED_DOMAIN = 'iiitl.ac.in';

export default function Login() {
  const { sendOTP, verifyOTP, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1); // 1 = Email, 2 = OTP
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [devOtp, setDevOtp] = useState('');

  const otpInputs = useRef([]);
  const from = location.state?.from?.pathname || '/home';

  useEffect(() => {
    if (isLoggedIn) navigate(from, { replace: true });
  }, [isLoggedIn, navigate, from]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErrorMsg('Please enter your institute email.');
      return;
    }

    const domain = trimmed.substring(trimmed.lastIndexOf('@') + 1);
    if (domain !== ALLOWED_DOMAIN) {
      setErrorMsg(`Access restricted. Only @${ALLOWED_DOMAIN} email addresses are allowed.`);
      return;
    }

    setLoading(true);
    try {
      const res = await sendOTP(trimmed);
      if (res?.otp) {
        setDevOtp(res.otp);
      }
      toast.success('Verification code generated and sent.');
      setStep(2);
      setResendTimer(45);
      setTimeout(() => otpInputs.current[0]?.focus(), 100);
    } catch (err) {
      console.error('Send OTP error:', err);
      setErrorMsg(err.message || 'Failed to send OTP code. Please verify the email and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      if (pasted) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < pasted.length; i++) {
          newDigits[i] = pasted[i];
        }
        setOtpDigits(newDigits);
        const nextIndex = Math.min(pasted.length, 5);
        otpInputs.current[nextIndex]?.focus();
      }
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = value.replace(/\D/g, '');
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const token = otpDigits.join('');
    if (token.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(email.trim().toLowerCase(), token);
      toast.success('Login successful!');
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Verify error:', err);
      setErrorMsg(err.message || 'Invalid or expired code. Please request a new code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        
        {/* Left Column: Form */}
        <div className="auth-form-column">
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.65rem', color: 'var(--brand-navy)', marginBottom: '6px' }}>
              {step === 1 ? 'Sign In' : 'Enter Verification Code'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {step === 1 
                ? 'Enter your @iiitl.ac.in email address to receive a one-time login code.'
                : <>Code sent to <strong>{email}</strong></>
              }
            </p>
            {step === 2 && (
              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 'var(--radius)',
                fontSize: '0.8125rem',
                color: '#0369a1'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <strong>🔑 Database OTP:</strong>{' '}
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '1rem',
                      fontWeight: 700,
                      background: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #7dd3fc',
                      color: 'var(--brand-navy)',
                      letterSpacing: '1.5px'
                    }}>
                      {devOtp || 'Check DB / 000000'}
                    </span>
                  </div>
                  {devOtp && (
                    <button
                      type="button"
                      onClick={() => {
                        const digits = devOtp.split('').slice(0, 6);
                        while (digits.length < 6) digits.push('');
                        setOtpDigits(digits);
                      }}
                      className="ui-btn ui-btn-primary ui-btn-sm"
                      style={{ padding: '3px 10px', fontSize: '0.75rem', height: 'auto' }}
                    >
                      Fill OTP
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '6px', lineHeight: 1.4 }}>
                  Saved in Supabase <code>profiles.last_otp</code> & <code>login_otps</code>. Enter manually or click Fill OTP.
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '10px 14px',
              background: 'var(--brand-red-light)',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius)',
              color: 'var(--brand-red)',
              fontSize: '0.8125rem',
              marginBottom: '18px',
              lineHeight: 1.4
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOTP}>
              <div className="ui-form-group">
                <label className="ui-label" htmlFor="college-email">
                  Institute Email Address
                </label>
                <div className="ui-input-wrapper">
                  <Mail size={16} className="ui-input-icon" />
                  <input
                    id="college-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. lcs2025036@iiitl.ac.in"
                    className="ui-input"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '6px' }}>
                  Restricted to verified @iiitl.ac.in accounts only
                </div>
              </div>

              <button
                type="submit"
                className="ui-btn ui-btn-navy ui-btn-lg"
                style={{ width: '100%', marginTop: '6px' }}
                disabled={loading}
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="ui-form-group">
                <label className="ui-label" style={{ textAlign: 'center', marginBottom: '12px' }}>
                  6-Digit OTP Code
                </label>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      style={{
                        width: '44px',
                        height: '50px',
                        textAlign: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        border: `1.5px solid ${digit ? 'var(--brand-blue)' : 'var(--border-strong)'}`,
                        borderRadius: 'var(--radius)',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="ui-btn ui-btn-navy ui-btn-lg"
                style={{ width: '100%', marginTop: '12px' }}
                disabled={loading || otpDigits.join('').length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify & Log In'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', fontSize: '0.8125rem' }}>
                <button
                  type="button"
                  onClick={() => { setStep(1); setOtpDigits(['', '', '', '', '', '']); setErrorMsg(''); }}
                  className="ui-btn ui-btn-ghost ui-btn-sm"
                  style={{ padding: '4px' }}
                >
                  ← Change email
                </button>

                {resendTimer > 0 ? (
                  <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>
                    Resend code in {resendTimer}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="ui-btn ui-btn-ghost ui-btn-sm"
                    style={{ color: 'var(--brand-blue)', fontWeight: 600, padding: '4px' }}
                    disabled={loading}
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </form>
          )}

        </div>

        {/* Right Column: College Bazaar Style Info Banner */}
        <div className="auth-banner-column">
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <ShieldCheck size={24} />
          </div>

          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
            IIITL Student Market
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6, marginBottom: '24px' }}>
            The official peer-to-peer portal for IIIT Lucknow students to trade textbooks, electronics, cycles, and hostel essentials directly.
          </p>

          <div style={{ textAlign: 'left', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem', color: '#ffffff', background: 'rgba(0, 0, 0, 0.15)', padding: '16px', borderRadius: 'var(--radius)' }}>
            <div>✓ Restricted strictly to @iiitl.ac.in</div>
            <div>✓ No shipping or courier delays</div>
            <div>✓ Direct cash or UPI hostel exchange</div>
          </div>
        </div>

      </div>
    </div>
  );
}
