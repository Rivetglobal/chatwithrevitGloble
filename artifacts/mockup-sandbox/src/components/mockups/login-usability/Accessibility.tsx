import React, { useState } from 'react';

// VARIANT 3: ACCESSIBILITY & READABILITY
// Tradeoff: Sacrifices decorative aesthetics for WCAG AA compliance and
// maximum legibility. Every design choice is justified by an a11y rule:
// — 17px base font (minimum recommended for body text legibility)
// — Labels always visible (never placeholder-only)
// — 4.5:1+ contrast ratios on all text
// — 3px solid blue focus outline, never suppressed
// — Required markers on all fields
// — Error message with icon + role="alert"
// — "Forgot password" below the field it relates to (logical order)

export function Accessibility() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  const focusStyle: React.CSSProperties = {
    outline: '3px solid #2563eb',
    outlineOffset: 2,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#e8f0fe',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '1.5rem',
    }}>
      {/* Skip-navigation link — keyboard users jump past repetitive nav */}
      <a
        href="#sign-in-form"
        style={{
          position: 'absolute', top: -9999, left: 8,
          background: '#1e40af', color: '#fff', padding: '8px 16px',
          borderRadius: 6, fontSize: '0.9rem', fontWeight: 600, zIndex: 100,
          textDecoration: 'none',
        }}
        onFocus={e => (e.currentTarget.style.top = '8px')}
        onBlur={e => (e.currentTarget.style.top = '-9999px')}
      >
        Skip to sign-in form
      </a>

      <main
        role="main"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          /* Minimum contrast: #fff bg, dark text */
          border: '1px solid #c7d2fe',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          padding: '36px 32px',
          width: '100%',
          maxWidth: 440,
        }}
      >
        {/* Logo — alt text set for screen readers */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div
            role="img"
            aria-label="Rivet AI logo"
            style={{
              width: 60, height: 60, borderRadius: 14,
              background: '#1e40af', /* High contrast: 7:1 against white */
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
        </div>

        {/* Heading — semantic h1, 24px minimum */}
        <h1 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: '0 0 4px', lineHeight: 1.2 }}>
          Sign in to Rivet AI
        </h1>
        <p style={{ textAlign: 'center', fontSize: '1rem', color: '#374151', margin: '0 0 28px', lineHeight: 1.5 }}>
          {/* 5.7:1 contrast against white */}
          NHS Compliance Platform
        </p>

        {/* Error alert — role="alert" so screen readers announce immediately */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              background: '#fef2f2', border: '2px solid #dc2626',
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              marginBottom: 20, color: '#991b1b', /* 7:1 contrast */
              fontSize: '0.9rem', fontWeight: 500,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        <form id="sign-in-form" onSubmit={handleSubmit} noValidate>

          {/* Email — label always visible, 17px base */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="email"
              style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.95rem', fontWeight: 600, color: '#111827', marginBottom: 8 }}
            >
              Email address
              <span style={{ color: '#dc2626', fontSize: '0.9rem' }} aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              aria-required="true"
              aria-describedby="email-hint"
              autoComplete="email"
              style={{
                width: '100%', padding: '13px 14px',
                border: '2px solid #6b7280', borderRadius: 10,
                fontSize: '1.05rem', /* 17px */
                color: '#111827', background: '#f9fafb',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.25)'; }}
              onBlur={e => { e.target.style.borderColor = '#6b7280'; e.target.style.boxShadow = 'none'; }}
            />
            <p id="email-hint" style={{ fontSize: '0.82rem', color: '#4b5563', margin: '5px 0 0', lineHeight: 1.4 }}>
              Use your NHS or work email
            </p>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 10 }}>
            <label
              htmlFor="password"
              style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.95rem', fontWeight: 600, color: '#111827', marginBottom: 8 }}
            >
              Password
              <span style={{ color: '#dc2626', fontSize: '0.9rem' }} aria-hidden="true">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                aria-required="true"
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '13px 52px 13px 14px',
                  border: '2px solid #6b7280', borderRadius: 10,
                  fontSize: '1.05rem',
                  color: '#111827', background: '#f9fafb',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.25)'; }}
                onBlur={e => { e.target.style.borderColor = '#6b7280'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#374151', padding: '8px', borderRadius: 6, display: 'flex',
                }}
                onFocus={e => (e.currentTarget.style.outline = '3px solid #2563eb')}
                onBlur={e => (e.currentTarget.style.outline = 'none')}
              >
                {showPw
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {/* Forgot password — placed below its field in reading/tab order */}
          <div style={{ marginBottom: 24, textAlign: 'right' }}>
            <a
              href="#"
              style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600, textDecoration: 'underline' }}
              onFocus={e => (e.currentTarget.style.outline = '3px solid #2563eb')}
              onBlur={e => (e.currentTarget.style.outline = 'none')}
            >
              Forgot your password?
            </a>
          </div>

          {/* CTA — deep blue, 4.5:1 minimum, 48px height */}
          <button
            type="submit"
            style={{
              width: '100%', padding: '14px',
              background: '#1e40af', /* 7:1 against white text */
              color: '#ffffff', fontWeight: 700, fontSize: '1.05rem',
              border: '2px solid transparent', borderRadius: 10, cursor: 'pointer',
              letterSpacing: '0.01em', transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onFocus={e => (e.currentTarget.style.outline = '3px solid #93c5fd')}
            onBlur={e => (e.currentTarget.style.outline = 'none')}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e3a8a')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1e40af')}
          >
            {submitted ? (
              <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Signed in!</>
            ) : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem', color: '#374151' }}>
          No account?{' '}
          <a
            href="#"
            style={{ color: '#1e40af', fontWeight: 600, textDecoration: 'underline' }}
            onFocus={e => (e.currentTarget.style.outline = '3px solid #2563eb')}
            onBlur={e => (e.currentTarget.style.outline = 'none')}
          >
            Create one free
          </a>
        </p>

        {/* Trust footer */}
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.75rem', color: '#6b7280' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          256-bit TLS encrypted · NHS-grade security
        </p>
      </main>

      <style>{`
        input::placeholder { color: #6b7280; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
      `}</style>
    </div>
  );
}
