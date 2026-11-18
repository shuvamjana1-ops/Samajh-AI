import type { Language } from '../types/document';

export interface PreloaderFrame {
  progress: number;
  percent: number;
  stageIndex: 0 | 1 | 2;
  stageLabel: string;
  isExiting: boolean;
  isDone: boolean;
}

const STAGE_LABELS: Record<Language, readonly [string, string, string]> = {
  en: ['Preparing workspace', 'Calibrating document reader', 'Ready'],
  hi: ['कार्यक्षेत्र तैयार हो रहा है', 'दस्तावेज़ रीडर सेट हो रहा है', 'तैयार'],
};

/**
 * Smooth easeOutCubic curve for crisp Swiss mechanical deceleration.
 */
export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * Computes deterministic preloader progress, integer percent (0..100),
 * active phase label, and exit/done flags for a given elapsed ms.
 */
export function computePreloaderFrame(
  elapsedMs: number,
  language: Language = 'en',
  fillDurationMs = 1150,
  exitDurationMs = 380
): PreloaderFrame {
  const safeFill = Math.max(1, fillDurationMs);
  const safeExit = Math.max(1, exitDurationMs);
  const clampedElapsed = Math.max(0, elapsedMs);

  const rawRatio = Math.min(1, clampedElapsed / safeFill);
  const progress = easeOutCubic(rawRatio);
  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  const stageIndex: 0 | 1 | 2 = rawRatio < 0.42 ? 0 : rawRatio < 0.92 ? 1 : 2;
  const stageLabel = STAGE_LABELS[language][stageIndex];

  const isExiting = clampedElapsed >= safeFill && clampedElapsed < safeFill + safeExit;
  const isDone = clampedElapsed >= safeFill + safeExit;

  return {
    progress,
    percent,
    stageIndex,
    stageLabel,
    isExiting,
    isDone,
  };
}
