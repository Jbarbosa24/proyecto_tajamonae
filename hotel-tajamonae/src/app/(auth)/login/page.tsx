'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { login } from '../actions'

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()
  const [errorText, setErrorText] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorText(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) {
        setErrorText(result.error)
      }
    })
  }

  return (
    <>
      {/* Google Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');

        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
        }

        .login-root {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(135deg, #001f25 0%, #191c1e 100%);
          position: relative;
        }

        .login-root h1,
        .login-root h2,
        .login-root h3 {
          font-family: 'Space Grotesk', sans-serif;
        }

        /* Grid backdrop */
        .login-root::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.03;
          z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E");
          background-size: 40px 40px;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 900px;
          display: grid;
          grid-template-columns: 1fr;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
        }

        @media (min-width: 1024px) {
          .login-card {
            grid-template-columns: 1fr 1fr;
          }
        }

        /* ── Left visual panel ── */
        .login-visual {
          display: none;
          position: relative;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          overflow: hidden;
          text-align: center;
        }

        @media (min-width: 1024px) {
          .login-visual {
            display: flex;
          }
        }

        .login-visual-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .login-visual-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.4) saturate(0.8);
        }

        .login-visual-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0, 104, 119, 0.4), rgba(25, 28, 30, 0.9));
        }

        .login-visual-content {
          position: relative;
          z-index: 10;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
        }

        .login-logo-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-logo {
          height: 192px;
          width: auto;
          object-fit: contain;
          filter: brightness(0) invert(1);
        }

        .login-headline {
          font-size: 2.25rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
          margin: 0;
        }

        .login-subtext {
          color: #e0e3e5;
          font-size: 1.125rem;
          line-height: 1.6;
          margin: 0;
        }

        /* ── Right form panel ── */
        .login-form-panel {
          padding: 32px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #ffffff;
        }

        @media (min-width: 1024px) {
          .login-form-panel {
            padding: 64px;
          }
        }

        .login-mobile-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 48px;
        }

        @media (min-width: 1024px) {
          .login-mobile-logo {
            display: none;
          }
        }

        .login-mobile-logo img {
          height: 96px;
          width: auto;
          object-fit: contain;
        }

        .login-title-block {
          margin-bottom: 40px;
          text-align: center;
        }

        @media (min-width: 1024px) {
          .login-title-block {
            text-align: left;
          }
        }

        .login-title {
          font-size: 1.875rem;
          font-weight: 800;
          color: #191c1e;
          letter-spacing: -0.02em;
          margin: 0 0 8px;
        }

        .login-desc {
          color: #6e797b;
          font-size: 0.9375rem;
          margin: 0;
        }

        /* Form fields */
        .login-field {
          margin-bottom: 24px;
        }

        .login-label {
          display: block;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #3e484b;
          margin-bottom: 8px;
        }

        .login-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .login-forgot {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #005d6a;
          text-decoration: none;
        }

        .login-forgot:hover {
          text-decoration: underline;
        }

        .login-input-wrap {
          position: relative;
        }

        .login-input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #6e797b;
          font-size: 20px;
          pointer-events: none;
          transition: color 0.15s;
        }

        .login-input-wrap:focus-within .login-input-icon {
          color: #005d6a;
        }

        .login-input {
          width: 100%;
          padding: 16px 16px 16px 48px;
          background: #f2f4f6;
          border: none;
          border-radius: 12px;
          font-size: 0.9375rem;
          color: #191c1e;
          outline: none;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
          box-sizing: border-box;
        }

        .login-input::placeholder {
          color: #6e797b;
        }

        .login-input:focus {
          box-shadow: 0 0 0 2px rgba(0, 93, 106, 0.2);
          background: #ffffff;
        }

        .login-input-pr {
          padding-right: 48px;
        }

        .login-eye-btn {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #6e797b;
          padding: 0;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }

        .login-eye-btn:hover {
          color: #191c1e;
        }

        /* Error */
        .login-error {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #ffdad6;
          border: 1px solid #ba1a1a40;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }

        .login-error-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ba1a1a;
          flex-shrink: 0;
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }

        .login-error-text {
          font-size: 0.75rem;
          font-weight: 600;
          color: #93000a;
          margin: 0;
        }

        /* Submit button */
        .login-btn {
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(135deg, #005d6a 0%, #0e7787 100%);
          color: #ffffff;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 0.9375rem;
          letter-spacing: 0.03em;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(0, 93, 106, 0.25);
          transition: all 0.2s;
          margin-top: 8px;
        }

        .login-btn:hover {
          box-shadow: 0 6px 24px rgba(0, 93, 106, 0.35);
          transform: translateY(-1px);
        }

        .login-btn:active {
          transform: scale(0.98);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .login-btn .login-btn-icon {
          transition: transform 0.2s;
        }

        .login-btn:hover .login-btn-icon {
          transform: translateX(3px);
        }

        /* Footer */
        .login-footer {
          margin-top: 48px;
          text-align: center;
        }

        @media (min-width: 1024px) {
          .login-footer {
            text-align: left;
          }
        }

        .login-footer p {
          font-size: 0.75rem;
          color: #6e797b;
          margin: 0;
        }

        /* Register link */
        .login-register-row {
          margin-top: 20px;
          text-align: center;
        }

        .login-register-link {
          font-size: 0.75rem;
          color: #005d6a;
          font-weight: 600;
          text-decoration: none;
        }

        .login-register-link:hover {
          text-decoration: underline;
        }

        .login-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="login-root">
        <div className="login-card">

          {/* ── Left Visual Panel ── */}
          <div className="login-visual">
            <div className="login-visual-bg">
              <img
                src="https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=80&auto=format&fit=crop"
                alt="Modern architecture"
                className="login-visual-img"
              />
              <div className="login-visual-overlay" />
            </div>

            <div className="login-visual-content">
              <div className="login-logo-wrap">
                <img
                  src="/logo-nuevo.png"
                  alt="Tajamonae Logo"
                  className="login-logo"
                  onError={(e) => {
                    // Fallback: show text logo
                    const target = e.currentTarget as HTMLImageElement
                    target.style.display = 'none'
                    const next = target.nextSibling as HTMLElement | null
                    if (next) next.style.display = 'block'
                  }}
                />
                <div style={{ display: 'none', color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '3rem', letterSpacing: '-0.03em' }}>
                  Tajamonae
                </div>
              </div>

              <div style={{ maxWidth: '280px' }}>
                <h1 className="login-headline">Gestión y control de servicios</h1>
              </div>
            </div>
          </div>

          {/* ── Right Form Panel ── */}
          <div className="login-form-panel">
            {/* Mobile logo */}
            <div className="login-mobile-logo">
              <img src="/logo-nuevo.png" alt="Tajamonae Logo" />
            </div>

            <div className="login-title-block">
              <h2 className="login-title">Iniciar Sesión</h2>
              <p className="login-desc">Ingrese sus credenciales de acceso administrativo.</p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="login-field">
                <label htmlFor="email" className="login-label">Correo Corporativo</label>
                <div className="login-input-wrap">
                  <span className="material-symbols-outlined login-input-icon">mail</span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nombre@hoteltajamonae.com"
                    required
                    disabled={isPending}
                    className="login-input"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="login-field">
                <div className="login-label-row">
                  <label htmlFor="password" className="login-label" style={{ margin: 0 }}>Contraseña</label>
                  <a href="#" className="login-forgot">¿Olvidó su clave?</a>
                </div>
                <div className="login-input-wrap">
                  <span className="material-symbols-outlined login-input-icon">lock</span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    disabled={isPending}
                    className="login-input login-input-pr"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="login-eye-btn"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Error */}
              {errorText && (
                <div className="login-error">
                  <div className="login-error-dot" />
                  <p className="login-error-text">{errorText}</p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" className="login-btn" disabled={isPending}>
                {isPending ? (
                  <>
                    <div className="login-spinner" />
                    Validando...
                  </>
                ) : (
                  <>
                    <span>Acceder al Sistema</span>
                    <span className="material-symbols-outlined login-btn-icon" style={{ fontSize: '20px' }}>login</span>
                  </>
                )}
              </button>
            </form>

            {/* Register link removed for security, only admin can register users */}

            <footer className="login-footer">
              <p>© 2026 Hotel Tajamonae. Sistema de gestión industrial restringido.</p>
            </footer>
          </div>

        </div>
      </div>
    </>
  )
}
