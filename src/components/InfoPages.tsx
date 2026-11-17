import { Check, Copy, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { FAQ_ENTRIES, SITE_PAGES, type AppRoute } from '../data/sitePages';
import { getStoredUtm } from '../lib/utm';

interface InfoPageProps {
  route: AppRoute | null;
  onNavigate: (path: AppRoute) => void;
}

export function InfoPage({ route, onNavigate }: InfoPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSent, setContactSent] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: AppRoute) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(path);
  };

  if (!route) {
    return (
      <section className="glass-card auth-card" aria-labelledby="not-found-title">
        <h1 id="not-found-title" className="section-heading">
          Page not found
        </h1>
        <p className="body-text">
          The page you requested does not exist. Return to Samajh home to scan a document or read our guides.
        </p>
        <div>
          <a
            href="/"
            className="btn btn-primary"
            onClick={(e) => handleLinkClick(e, '/')}
          >
            Go to Home
          </a>
        </div>
      </section>
    );
  }

  const page = SITE_PAGES[route];

  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    setContactError(null);
    setContactSent(false);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMsg = message.trim();

    if (trimmedName.length < 2) {
      setContactError('Please enter your name (at least 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setContactError('Please enter a valid email address.');
      return;
    }
    if (trimmedMsg.length < 10) {
      setContactError('Please enter a message of at least 10 characters.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMsg,
          website,
          utm: getStoredUtm(),
        }),
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || 'Could not send message right now.');
      }
      setContactSent(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setContactError(
        err instanceof Error ? err.message : 'Could not send message right now. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : 'https://samajh.app';
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      setCopiedUrl(false);
    }
  };

  return (
    <div className="info-page-stack">
      <section className="glass-card" aria-labelledby="page-h1">
        <h1 id="page-h1" className="hero-headline">
          {page.h1}
        </h1>
        <p className="body-lead">{page.lead}</p>
        {page.lastUpdated && (
          <p className="meta-text" style={{ marginTop: '2%' }}>
            Last updated: {page.lastUpdated}
          </p>
        )}
        <div className="info-cta-row">
          <a
            href="/"
            className="btn btn-primary"
            onClick={(e) => handleLinkClick(e, '/')}
          >
            Scan a document
          </a>
          <button type="button" className="btn btn-ghost" onClick={handleCopyLink}>
            {copiedUrl ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            <span>{copiedUrl ? 'Copied' : 'Copy page link'}</span>
          </button>
        </div>
      </section>

      {route === '/faq' ? (
        <section className="glass-card" aria-label="FAQ list">
          <h2 className="section-heading" style={{ marginBottom: '2.5%' }}>
            Common questions
          </h2>
          <div className="faq-list">
            {FAQ_ENTRIES.map((entry) => (
              <details key={entry.question} className="faq-item">
                <summary className="faq-summary">{entry.question}</summary>
                <p className="body-text faq-answer">{entry.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : (
        page.sections.map((section) => (
          <section key={section.heading} className="glass-card">
            <h2 className="card-heading">{section.heading}</h2>
            <p className="body-text" style={{ marginTop: '1.5%' }}>
              {section.body}
            </p>
          </section>
        ))
      )}

      {route === '/contact' && (
        <section className="glass-card" aria-labelledby="contact-form-heading">
          <h2 id="contact-form-heading" className="section-heading">
            Send a message
          </h2>

          <form className="contact-form" onSubmit={handleContactSubmit} noValidate>
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="contact-website">Leave this field blank</label>
              <input
                id="contact-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="contact-name" className="form-label">
                Your name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                className="ask-input"
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="contact-email" className="form-label">
                Email address
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                className="ask-input"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="contact-message" className="form-label">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={4}
                className="ask-input"
                required
                minLength={10}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {contactError && (
              <div className="error-card" role="alert">
                <p className="body-text">{contactError}</p>
              </div>
            )}

            {contactSent && (
              <div className="translating-banner" role="status">
                Message received. Thank you for contacting Samajh.
              </div>
            )}

            <div>
              <button type="submit" className="btn btn-primary" disabled={isSending}>
                <Send size={16} aria-hidden="true" />
                <span>{isSending ? 'Sending...' : 'Send message'}</span>
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
