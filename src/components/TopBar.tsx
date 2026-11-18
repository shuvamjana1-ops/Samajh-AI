import { UI_COPY } from '../data/demoAgreement';
import { type AppRoute } from '../data/sitePages';
import { LANGUAGE_CONFIG } from '../lib/documentLogic';
import type { Language, ThemeMode } from '../types/document';

interface TopBarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  showResetAction: boolean;
  onResetToLanding: () => void;
  onNavigate: (path: AppRoute) => void;
}

const LANGUAGES: Language[] = ['en', 'hi'];

export function TopBar({
  language,
  onLanguageChange,
  theme,
  onToggleTheme,
  showResetAction,
  onResetToLanding,
  onNavigate,
}: TopBarProps) {
  const copy = UI_COPY[language];

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate('/');
  };

  return (
    <header className="topbar-section">
      <div className="topbar-inner swiss-grid">
        <div className="topbar-brand-col">
          <a
            href="/"
            className="brand-wordmark"
            aria-label={`${copy.brand} home`}
            onClick={handleHomeClick}
          >
            {copy.brand}
          </a>
        </div>

        <div className="topbar-controls">
          {showResetAction && (
            <button
              type="button"
              className="swiss-text-toggle"
              onClick={onResetToLanding}
            >
              {copy.newScan}
            </button>
          )}

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
        </div>
      </div>
    </header>
  );
}
