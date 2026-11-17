import { ArrowUp, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FAQ_ENTRIES, INDEXABLE_ROUTES, SITE_PAGES, type AppRoute } from '../data/sitePages';

const COOKIE_KEY = 'samajh_cookie_consent';

interface SiteChromeExtrasProps {
  onNavigate: (path: AppRoute) => void;
  searchOpen: boolean;
  onCloseSearch: () => void;
}

export function SiteChromeExtras({
  onNavigate,
  searchOpen,
  onCloseSearch,
}: SiteChromeExtrasProps) {
  const [scrollPercent, setScrollPercent] = useState(0);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [cookieChoice, setCookieChoice] = useState<'accepted' | 'rejected' | null>(() => {
    if (typeof window === 'undefined') return 'accepted';
    try {
      const val = window.localStorage.getItem(COOKIE_KEY);
      return val === 'accepted' || val === 'rejected' ? val : null;
    } catch {
      return null;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const docEl = document.documentElement;
      const total = Math.max(1, docEl.scrollHeight - window.innerHeight);
      const ratio = Math.min(100, Math.max(0, (window.scrollY / total) * 100));
      setScrollPercent(ratio);
      setShowTopBtn(window.scrollY > 320);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, onCloseSearch]);

  const handleCookieChoice = (choice: 'accepted' | 'rejected') => {
    setCookieChoice(choice);
    try {
      window.localStorage.setItem(COOKIE_KEY, choice);
    } catch {
      // ignore storage errors
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchableItems = [
    ...INDEXABLE_ROUTES.map((r) => ({
      path: r,
      title: SITE_PAGES[r].navLabel,
      snippet: SITE_PAGES[r].description,
    })),
    ...FAQ_ENTRIES.map((faq) => ({
      path: '/faq' as AppRoute,
      title: faq.question,
      snippet: faq.answer,
    })),
  ].filter((item) => {
    if (!normalizedQuery) return true;
    return (
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.snippet.toLowerCase().includes(normalizedQuery)
    );
  });

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: AppRoute) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <>
      <div
        className="scroll-progress-bar"
        aria-hidden="true"
        style={{ width: `${scrollPercent}%` }}
      />

      {showTopBtn && (
        <button
          type="button"
          className="btn btn-secondary btn-icon back-to-top-btn"
          aria-label="Scroll back to top of page"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      )}

      {cookieChoice === null && (
        <aside className="cookie-banner glass-card" aria-label="Cookie preferences">
          <p className="meta-text cookie-copy">
            Essential browser storage only for theme and session.{' '}
            <a
              href="/privacy-policy"
              className="inline-link"
              onClick={(e) => handleLinkClick(e, '/privacy-policy')}
            >
              Privacy Policy
            </a>
            .
          </p>
          <div className="cookie-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleCookieChoice('accepted')}
            >
              Accept
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleCookieChoice('rejected')}
            >
              Reject
            </button>
          </div>
        </aside>
      )}

      {searchOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-search-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseSearch();
          }}
        >
          <div className="glass-card modal-card">
            <div className="modal-header">
              <h2 id="site-search-title" className="card-heading">
                Search Samajh
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label="Close site search dialog"
                onClick={onCloseSearch}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="form-field">
              <label htmlFor="site-search-input" className="form-label">
                Search pages and FAQ topics
              </label>
              <div className="search-input-wrap">
                <Search size={16} aria-hidden="true" className="search-icon" />
                <input
                  ref={searchInputRef}
                  id="site-search-input"
                  type="search"
                  className="ask-input search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ul className="search-results">
              {searchableItems.slice(0, 7).map((item, idx) => (
                <li key={`${item.path}-${idx}`}>
                  <a
                    href={item.path}
                    className="search-result-link"
                    onClick={(e) => {
                      handleLinkClick(e, item.path);
                      onCloseSearch();
                    }}
                  >
                    <strong>{item.title}</strong>
                    <span className="meta-text">{item.snippet}</span>
                  </a>
                </li>
              ))}
              {searchableItems.length === 0 && (
                <li className="meta-text">No matching pages or FAQ entries found.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
