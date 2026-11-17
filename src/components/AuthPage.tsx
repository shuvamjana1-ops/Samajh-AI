import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { UI_COPY } from '../data/demoAgreement';
import type { Language } from '../types/document';

interface AuthPageProps {
  language: Language;
  isSigningIn: boolean;
  authError: string | null;
  onGoogleSignIn: () => void;
  onBackGuest: () => void;
}

export function AuthPage({
  language,
  isSigningIn,
  authError,
  onGoogleSignIn,
  onBackGuest,
}: AuthPageProps) {
  const copy = UI_COPY[language];

  return (
    <section className="glass-card auth-card" aria-labelledby="auth-heading">
      <div className="auth-header">
        <div className="auth-badge-row">
          <ShieldCheck size={20} aria-hidden="true" />
          <span className="meta-text">{copy.brand}</span>
        </div>
        <h1 id="auth-heading" className="section-heading">
          {copy.authTitle}
        </h1>
        <p className="body-lead">{copy.authSubtitle}</p>
      </div>

      <ul className="auth-points">
        {copy.authPoints.map((point) => (
          <li key={point} className="auth-point-item">
            <CheckCircle2 size={18} aria-hidden="true" className="auth-point-icon" />
            <span className="body-text">{point}</span>
          </li>
        ))}
      </ul>

      {authError && (
        <div className="error-card" role="alert">
          <p className="body-text">{authError}</p>
        </div>
      )}

      <div className="auth-actions">
        <button
          type="button"
          className="btn-google"
          disabled={isSigningIn}
          onClick={onGoogleSignIn}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="google-mark"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          <span>{isSigningIn ? copy.authSigningIn : copy.authGoogleButton}</span>
        </button>

        <button
          type="button"
          className="btn-ghost"
          disabled={isSigningIn}
          onClick={onBackGuest}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{copy.authContinueGuest}</span>
        </button>
      </div>

      <p className="meta-text">{copy.authFreeTierNote}</p>
    </section>
  );
}
