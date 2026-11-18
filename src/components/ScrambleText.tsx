import { useEffect, useMemo, useRef, useState } from 'react';
import { computeGraphemeHighlightMask, groupHighlightedRuns } from '../lib/textHighlight';
import {
  computeScrambleFrame,
  segmentGraphemes,
  selectGlyphPool,
  type ScrambleFrame,
} from '../lib/textScramble';

interface ScrambleTextProps {
  text: string;
  highlightWords?: string[];
  durationMs?: number;
  delayMs?: number;
  className?: string;
}

const STEP_INTERVAL_MS = 38;

export function ScrambleText({
  text,
  highlightWords,
  durationMs = 680,
  delayMs = 0,
  className = '',
}: ScrambleTextProps) {
  const graphemes = useMemo(() => segmentGraphemes(text), [text]);
  const glyphPool = useMemo(() => selectGlyphPool(text), [text]);
  const highlightMask = useMemo(
    () => computeGraphemeHighlightMask(graphemes, highlightWords),
    [graphemes, highlightWords]
  );
  const settledRuns = useMemo(
    () => groupHighlightedRuns(graphemes, highlightMask),
    [graphemes, highlightMask]
  );

  const hostRef = useRef<HTMLSpanElement | null>(null);

  const [inView, setInView] = useState(false);
  const [frame, setFrame] = useState<ScrambleFrame>(() => ({
    resolvedCount: graphemes.length,
    resolvedText: text,
    scramblingText: '',
    trailingText: '',
    fullText: text,
    settled: true,
  }));

  useEffect(() => {
    const el = hostRef.current;
    if (typeof window === 'undefined' || !el) {
      setInView(true);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.98) {
      setInView(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || typeof window === 'undefined') return;

    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || graphemes.length === 0) {
      setFrame({
        resolvedCount: graphemes.length,
        resolvedText: text,
        scramblingText: '',
        trailingText: '',
        fullText: text,
        settled: true,
      });
      return;
    }

    let rafId = 0;
    let delayTimer: number | undefined;
    let startTime = 0;
    let lastStep = -1;

    setFrame(computeScrambleFrame(graphemes, 0, 0, glyphPool));

    const tick = (now: number) => {
      if (startTime === 0) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / Math.max(120, durationMs));
      const step = Math.floor(elapsed / STEP_INTERVAL_MS);

      if (progress >= 1) {
        setFrame(computeScrambleFrame(graphemes, 1, step, glyphPool));
        return;
      }

      if (step !== lastStep) {
        lastStep = step;
        setFrame(computeScrambleFrame(graphemes, progress, step, glyphPool));
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const startAnimation = () => {
      rafId = window.requestAnimationFrame(tick);
    };

    if (delayMs > 0) {
      delayTimer = window.setTimeout(startAnimation, delayMs);
    } else {
      startAnimation();
    }

    return () => {
      if (delayTimer !== undefined) window.clearTimeout(delayTimer);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [inView, text, graphemes, glyphPool, durationMs, delayMs]);

  const resolvedRuns = useMemo(() => {
    if (frame.settled || frame.resolvedCount <= 0) return [];
    return groupHighlightedRuns(
      graphemes.slice(0, frame.resolvedCount),
      highlightMask.slice(0, frame.resolvedCount)
    );
  }, [frame.settled, frame.resolvedCount, graphemes, highlightMask]);

  return (
    <span
      ref={hostRef}
      className={`scramble-text ${className}`.trim()}
      data-scrambled={frame.settled ? 'false' : 'true'}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {frame.settled ? (
          settledRuns.map((run, idx) =>
            run.highlighted ? (
              <mark key={`${idx}-hl`} className="headline-highlight">
                {run.text}
              </mark>
            ) : (
              <span key={`${idx}-tx`}>{run.text}</span>
            )
          )
        ) : (
          <>
            {resolvedRuns.map((run, idx) =>
              run.highlighted ? (
                <mark key={`${idx}-rhl`} className="headline-highlight">
                  {run.text}
                </mark>
              ) : (
                <span key={`${idx}-rtx`}>{run.text}</span>
              )
            )}
            {frame.scramblingText && (
              <span className="scramble-wave">{frame.scramblingText}</span>
            )}
            {frame.trailingText && (
              <span className="scramble-tail">{frame.trailingText}</span>
            )}
          </>
        )}
      </span>
    </span>
  );
}
