import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SiteChromeExtras() {
  const [scrollPercent, setScrollPercent] = useState(0);
  const [showTopBtn, setShowTopBtn] = useState(false);

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
    </>
  );
}
