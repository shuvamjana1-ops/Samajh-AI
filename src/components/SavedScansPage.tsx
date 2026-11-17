import { Camera, FileText, LogOut, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { UI_COPY } from '../data/demoAgreement';
import type { Language, SavedAnalysisRecord } from '../types/document';

interface SavedScansPageProps {
  language: Language;
  user: User;
  records: SavedAnalysisRecord[];
  isLoading: boolean;
  error: string | null;
  onOpenRecord: (record: SavedAnalysisRecord) => void;
  onDeleteRecord: (id: string) => void;
  onNewScan: () => void;
  onSignOut: () => void;
}

export function SavedScansPage({
  language,
  user,
  records,
  isLoading,
  error,
  onOpenRecord,
  onDeleteRecord,
  onNewScan,
  onSignOut,
}: SavedScansPageProps) {
  const copy = UI_COPY[language];
  const initial = (user.displayName || user.email || 'S').charAt(0).toUpperCase();
  const [confirmTarget, setConfirmTarget] = useState<SavedAnalysisRecord | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!confirmTarget) return;
    cancelBtnRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmTarget(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmTarget]);

  return (
    <div className="saved-layout">
      <section className="glass-card account-banner" aria-label="Account details">
        <div className="account-identity">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'User avatar'}
              className="account-avatar"
              width={48}
              height={48}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="account-avatar-fallback" aria-hidden="true">
              {initial}
            </div>
          )}
          <div className="account-meta">
            <span className="meta-text">{copy.accountSignedInAs}</span>
            <strong className="card-heading">{user.displayName || 'Samajh User'}</strong>
            {user.email && <span className="meta-text">{user.email}</span>}
          </div>
        </div>

        <div className="account-actions">
          <button type="button" className="btn btn-primary" onClick={onNewScan}>
            <Camera size={16} aria-hidden="true" />
            <span>{copy.scanAnother}</span>
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSignOut}>
            <LogOut size={16} aria-hidden="true" />
            <span>{copy.signOut}</span>
          </button>
        </div>
      </section>

      <section className="glass-card" aria-labelledby="saved-heading">
        <div className="saved-header">
          <div>
            <h1 id="saved-heading" className="section-heading">
              {copy.savedTitle}
            </h1>
            <p className="body-text">{copy.savedSubtitle}</p>
          </div>
        </div>

        {error && (
          <div className="error-card" role="alert">
            <p className="body-text">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="skeleton-stack" aria-hidden="true">
            <div className="skeleton-block" />
            <div className="skeleton-block" />
          </div>
        ) : records.length === 0 ? (
          <div className="saved-empty">
            <FileText size={28} aria-hidden="true" />
            <p className="body-text">{copy.savedEmpty}</p>
          </div>
        ) : (
          <div className="saved-list">
            {records.map((rec) => {
              const formattedDate = new Date(rec.updatedAtMs).toLocaleDateString(
                language === 'hi' ? 'hi-IN' : 'en-IN',
                { day: 'numeric', month: 'short', year: 'numeric' }
              );
              return (
                <article key={rec.id} className="saved-item">
                  <div className="saved-item-top">
                    <span className="doc-type-label">{rec.type}</span>
                    <span className="meta-text tabular-nums">{formattedDate}</span>
                  </div>
                  <p className="body-text">{rec.summary}</p>
                  <div className="saved-item-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => onOpenRecord(rec)}
                    >
                      <span>{copy.savedOpen}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label={`${copy.savedDelete} ${rec.type}`}
                      onClick={() => setConfirmTarget(rec)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      <span>{copy.savedDelete}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {confirmTarget && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmTarget(null);
          }}
        >
          <div className="glass-card modal-card">
            <h2 id="confirm-delete-title" className="card-heading">
              Delete saved summary?
            </h2>
            <p className="body-text">
              This permanently removes "{confirmTarget.type}" from your saved cloud library.
            </p>
            <div className="modal-actions">
              <button
                ref={cancelBtnRef}
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const targetId = confirmTarget.id;
                  setConfirmTarget(null);
                  onDeleteRecord(targetId);
                }}
              >
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
