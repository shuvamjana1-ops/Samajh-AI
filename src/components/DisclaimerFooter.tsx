import { UI_COPY } from '../data/demoAgreement';
import { LEGAL_LAST_UPDATED, SITE_PAGES, type AppRoute } from '../data/sitePages';
import type { Language } from '../types/document';

interface DisclaimerFooterProps {
  language: Language;
  onNavigate: (path: AppRoute) => void;
}

const FOOTER_ROUTES: AppRoute[] = [
  '/privacy-policy',
  '/terms',
  '/services',
  '/about',
  '/faq',
  '/contact',
  '/sign-in',
];

export function DisclaimerFooter({ language, onNavigate }: DisclaimerFooterProps) {
  const copy = UI_COPY[language];
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: AppRoute) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <footer className="footer-section">
      <div className="footer-inner swiss-grid">
        <div className="footer-meta-col">
          <p className="body-text">
            {copy.disclaimer}
          </p>
          <p className="caption-text">
            &copy; {currentYear} {copy.brand}. Last updated: {LEGAL_LAST_UPDATED}.
          </p>
        </div>

        <nav className="footer-links" aria-label="Footer">
          {FOOTER_ROUTES.map((route) => (
            <a
              key={route}
              href={route}
              className="footer-link"
              onClick={(e) => handleLinkClick(e, route)}
            >
              {route === '/privacy-policy'
                ? 'Privacy'
                : route === '/terms'
                  ? 'Terms'
                  : SITE_PAGES[route].navLabel}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
