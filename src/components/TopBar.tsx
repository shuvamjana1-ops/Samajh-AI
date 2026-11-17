import { Menu, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { UI_COPY } from '../data/demoAgreement';
import { HEADER_NAV_ROUTES, SITE_PAGES, type AppRoute } from '../data/sitePages';
import { LANGUAGE_CONFIG } from '../lib/documentLogic';
import type { Language, ThemeMode } from '../types/document';

interface TopBarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  currentPath: string;
  showHeaderLang: boolean;
  onNavigate: (path: AppRoute) => void;
  onOpenSearch: () => void;
  user: User | null;
  savedCount: number;
  onSignOut: () => void;
}

const LANGUAGES: Language[] = ['en', 'hi'];

export function TopBar({
  language,
  onLanguageChange,
  theme,
  onToggleTheme,
  currentPath,
  showHeaderLang,
  onNavigate,
  onOpenSearch,
  user,
  savedCount,
  onSignOut,
}: TopBarProps) {
  const copy = UI_COPY[language];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: AppRoute) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const drawer = drawerRef.current;
    const focusables = drawer?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    focusables?.[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        toggleBtnRef.current?.focus();
        return;
      }
      if (e.key === 'Tab' && focusables && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="topbar-section">
      <div className="topbar-inner swiss-grid">
        <div className="topbar-brand-col">
          <a
            href="/"
            className="brand-wordmark"
            aria-label={`${copy.brand} home`}
            onClick={(e) => handleLinkClick(e, '/')}
          >
            {copy.brand}
          </a>
        </div>

        <nav className="topbar-nav" aria-label="Primary">
          {HEADER_NAV_ROUTES.map((route) => {
            const meta = SITE_PAGES[route];
            const active = currentPath === route;
            return (
              <a
                key={route}
                href={route}
                className={`nav-link ${active ? 'nav-link-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => handleLinkClick(e, route)}
              >
                {meta.navLabel}
              </a>
            );
          })}
        </nav>

        <div className="topbar-controls">
          {showHeaderLang && (
            <div className="swiss-lang-switch swiss-lang-switch-compact" role="group" aria-label="Language">
              {LANGUAGES.map((code) => {
                const active = language === code;
                return (
                  <button
                    key={code}
                    type="button"
                    className={`swiss-text-toggle ${active ? 'swiss-text-toggle-active' : ''}`}
                    aria-pressed={active}
                    onClick={() => onLanguageChange(code)}
                  >
                    {LANGUAGE_CONFIG[code].nativeLabel}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            className="swiss-text-toggle topbar-desktop-action"
            onClick={onOpenSearch}
            aria-label="Search Samajh pages and FAQ topics"
          >
            <Search size={15} aria-hidden="true" />
            <span>Search</span>
          </button>

          <button
            type="button"
            className="swiss-text-toggle"
            onClick={onToggleTheme}
            aria-label={
              theme === 'dark'
                ? language === 'hi'
                  ? 'हल्की थीम पर जाएं'
                  : 'Switch to light color theme'
                : language === 'hi'
                  ? 'गहरी थीम पर जाएं'
                  : 'Switch to dark color theme'
            }
          >
            {theme === 'dark' ? copy.themeLight : copy.themeDark}
          </button>

          <button
            ref={toggleBtnRef}
            type="button"
            className="swiss-text-toggle mobile-menu-toggle"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={
              mobileMenuOpen
                ? 'Close primary navigation menu'
                : 'Open primary navigation menu'
            }
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          ref={drawerRef}
          className="mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div className="mobile-drawer-links">
            {HEADER_NAV_ROUTES.map((route) => {
              const meta = SITE_PAGES[route];
              const active = currentPath === route;
              return (
                <a
                  key={route}
                  href={route}
                  className={`nav-link mobile-nav-link ${active ? 'nav-link-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={(e) => handleLinkClick(e, route)}
                >
                  {meta.navLabel}
                </a>
              );
            })}
            <a
              href={user ? '/saved' : '/sign-in'}
              className="nav-link mobile-nav-link"
              onClick={(e) => handleLinkClick(e, user ? '/saved' : '/sign-in')}
            >
              {user
                ? `${copy.savedScans}${savedCount > 0 ? ` (${savedCount})` : ''}`
                : copy.signIn}
            </a>
            <div className="mobile-drawer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSearch();
                }}
              >
                Search site
              </button>
              {user && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut();
                  }}
                >
                  {copy.signOut}
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setMobileMenuOpen(false);
                  toggleBtnRef.current?.focus();
                }}
              >
                Close menu
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
