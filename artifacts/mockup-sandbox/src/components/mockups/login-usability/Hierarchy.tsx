import React, { useState } from 'react';

// VARIANT 1: CLARITY OF INFORMATION HIERARCHY
// Tradeoff: Sacrifices compactness for a very clear visual reading order.
// Every element has a deliberate typographic weight. The user's eye is guided
// top → brand → purpose → credentials → action → secondary links.
// Labels are bold and always visible; helper text is muted beneath each field.

export function Hierarchy() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 40%, #fce7f3 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '1.5rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.10)',
        width: '100%',
        maxWidth: 440,
        overflow: 'hidden',
      }}>

        {/* ── TOP BAND: Brand identity (H3-level) ── */}
        <div style={{
          padding: '20px 32px 16px',
          borderBottom: '1px solid #f0f4ff',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          {/* Level 3: App name — smallest brand element */}
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', letterSpacing: '-0.01em' }}>Rivet AI</span>
        </div>

        <div style={{ padding: '28px 32px 32px' }}>

          {/* ── LEVEL 1: Primary purpose — largest text ── */}
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: '0 0 6px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Welcome back
          </h1>

          {/* ── LEVEL 2: Supporting context — muted, smaller ── */}
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '0 0 28px', lineHeight: 1.5 }}>
            Sign in to access the NHS compliance platform.
          </p>

          <form onSubmit={e => e.preventDefault()}>

            {/* ── LEVEL 3: Field group — bold label, input, helper ── */}
            <div style={{ marginBottom: 20 }}>
              {/* Label: medium weight, dark, visible always */}
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#111827', marginBottom: 6, letterSpacing: '0.02em' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@nhsorg.co.uk"
                style={{
                  width: '100%', padding: '11px 14px',
                  border: '1.5px solid #d1d5db', borderRadius: 10,
                  fontSize: '0.95rem', color: '#111827',
                  background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                onBlur={e => (e.target.style.borderColor = '#d1d5db')}
              />
              {/* Helper: lightest weight — lowest hierarchy */}
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '5px 0 0', lineHeight: 1.4 }}>
                Use your NHS or work email address
              </p>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', letterSpacing: '0.02em' }}>
                  PASSWORD
                </label>
                {/* Secondary link: accent colour, clearly lower priority than button */}
                <a href="#" style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 500, textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                style={{
                  width: '100%', padding: '11px 14px',
                  border: '1.5px solid #d1d5db', borderRadius: 10,
                  fontSize: '0.95rem', color: '#111827',
                  background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                onBlur={e => (e.target.style.borderColor = '#d1d5db')}
              />
            </div>

            {/* ── LEVEL 1 CTA: Primary action — highest visual weight ── */}
            <button
              type="submit"
              style={{
                width: '100%', padding: '13px',
                background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                color: '#fff', fontWeight: 700, fontSize: '1rem',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                letterSpacing: '0.01em',
              }}
            >
              Sign In
            </button>

            {/* ── DIVIDER: separates primary from secondary actions ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>

            {/* ── SECONDARY action — outlined, clearly subordinate ── */}
            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Don't have an account?{' '}
              <a href="#" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                Create one free
              </a>
            </p>
          </form>
        </div>

        {/* ── FOOTER BAND: Lowest hierarchy — legal/trust text ── */}
        <div style={{ padding: '12px 32px', borderTop: '1px solid #f0f4ff', background: '#fafbff' }}>
          <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0, textAlign: 'center' }}>
            Protected by NHS-grade security · 256-bit encryption
          </p>
        </div>
      </div>

      <style>{`input::placeholder { color: #9ca3af; }`}</style>
    </div>
  );
}
