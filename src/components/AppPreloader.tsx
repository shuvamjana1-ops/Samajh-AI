import { useEffect, useRef, useState } from 'react';
import { computePreloaderFrame, type PreloaderFrame } from '../lib/preloaderLogic';
import type { Language } from '../types/document';
import { ScrambleText } from './ScrambleText';

interface AppPreloaderProps {
  language: Language;
  onComplete: () => void;
}

const FILL_DURATION_MS = 1400;
const EXIT_DURATION_MS = 480;

export function AppPreloader({ language, onComplete }: AppPreloaderProps) {
  const [frame, setFrame] = useState<PreloaderFrame>(() =>
    computePreloaderFrame(0, language, FILL_DURATION_MS, EXIT_DURATION_MS)
  );
  const [skipped, setSkipped] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (typeof window === 'undefined') {
      onCompleteRef.current();
      return;
    }

    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const params = new URLSearchParams(window.location.search);
    if (prefersReduced || params.get('autostart') === '1') {
      onCompleteRef.current();
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const next = computePreloaderFrame(elapsed, language, FILL_DURATION_MS, EXIT_DURATION_MS);
      setFrame(next);
      if (next.isDone) {
        onCompleteRef.current();
        return;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [language]);

  const handleSkip = () => {
    if (skipped || frame.isExiting || frame.isDone) return;
    setSkipped(true);
    setFrame(computePreloaderFrame(FILL_DURATION_MS + 1, language, FILL_DURATION_MS, EXIT_DURATION_MS));
    window.setTimeout(() => onCompleteRef.current(), EXIT_DURATION_MS);
  };

  const exiting = skipped || frame.isExiting;
  const formattedPercent = String(frame.percent).padStart(3, '0');

  return (
    <div
      className={`app-preloader ${exiting ? 'app-preloader-exiting' : ''}`}
      data-testid="app-preloader"
      data-state={exiting ? 'exiting' : 'loading'}
      role="status"
      aria-live="polite"
      aria-label={frame.stageLabel}
    >
      <div className="preloader-curtain preloader-curtain-top" aria-hidden="true" />
      <div className="preloader-curtain preloader-curtain-bottom" aria-hidden="true" />

      <div className="preloader-grid-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="preloader-stage">
        <div className="preloader-corner preloader-corner-tl" aria-hidden="true" />
        <div className="preloader-corner preloader-corner-tr" aria-hidden="true" />
        <div className="preloader-corner preloader-corner-bl" aria-hidden="true" />
        <div className="preloader-corner preloader-corner-br" aria-hidden="true" />

        <div className="preloader-emblem" aria-hidden="true">
          <svg
            className="preloader-orbital-svg"
            viewBox="0 0 180 180"
            width="180"
            height="180"
          >
            <circle
              cx="90"
              cy="90"
              r="82"
              fill="none"
              stroke="var(--hairline)"
              strokeWidth="1"
            />
            <circle
              className="preloader-dial-ring"
              cx="90"
              cy="90"
              r="74"
              fill="none"
              stroke="var(--accent-gold)"
              strokeWidth="1.5"
              strokeDasharray="18 10 4 10"
            />
            <circle
              className="preloader-dial-ring-inner"
              cx="90"
              cy="90"
              r="62"
              fill="none"
              stroke="var(--accent-teal)"
              strokeWidth="1"
              strokeDasharray="6 14"
            />
            <line x1="90" y1="2" x2="90" y2="12" stroke="var(--accent-gold)" strokeWidth="1.5" />
            <line x1="90" y1="168" x2="90" y2="178" stroke="var(--accent-gold)" strokeWidth="1.5" />
            <line x1="2" y1="90" x2="12" y2="90" stroke="var(--accent-gold)" strokeWidth="1.5" />
            <line x1="168" y1="90" x2="178" y2="90" stroke="var(--accent-gold)" strokeWidth="1.5" />
          </svg>

          <div className="preloader-folio-stack">
            <div className="preloader-folio-back" />
            <div className="preloader-folio-front">
              <div className="preloader-folio-header">
                <span className="preloader-folio-square" />
                <span className="preloader-folio-line preloader-folio-line-title" />
              </div>
              <div className="preloader-folio-lines">
                <span
                  className={`preloader-folio-line ${frame.percent >= 22 ? 'is-lit-gold' : ''}`}
                />
                <span
                  className={`preloader-folio-line preloader-folio-line-med ${frame.percent >= 48 ? 'is-lit-teal' : ''}`}
                />
                <span
                  className={`preloader-folio-line ${frame.percent >= 72 ? 'is-lit-gold' : ''}`}
                />
                <span
                  className={`preloader-folio-line preloader-folio-line-short ${frame.percent >= 90 ? 'is-lit-teal' : ''}`}
                />
              </div>
              <div className="preloader-scan-beam" />
            </div>
          </div>
        </div>

        <div className="preloader-wordmark-row">
          <span className="preloader-wordmark">
            <ScrambleText text="Samajh" durationMs={640} />
          </span>
          <span className="preloader-percent tabular-nums">{formattedPercent}%</span>
        </div>

        <div className="preloader-track" aria-hidden="true">
          <div
            className="preloader-track-fill"
            style={{ transform: `scaleX(${frame.progress})` }}
          />
        </div>

        <div className="preloader-footer-row">
          <span className="meta-text preloader-stage-label">{frame.stageLabel}</span>
          <button
            type="button"
            className="swiss-text-toggle preloader-skip-btn"
            onClick={handleSkip}
            aria-label="Skip intro animation"
          >
            {language === 'hi' ? 'आगे बढ़ें' : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  );
}
