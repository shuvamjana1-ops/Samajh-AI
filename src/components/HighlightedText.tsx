import { useMemo } from 'react';
import { splitHighlightSegments, type HighlightKind } from '../lib/textHighlight';

interface HighlightedTextProps {
  text: string;
  highlightWords?: string[];
  autoDetectDocumentTerms?: boolean;
  className?: string;
}

function getMarkClass(kind: Exclude<HighlightKind, 'plain'>): string {
  switch (kind) {
    case 'risk':
      return 'notice-highlight notice-highlight--risk';
    case 'deadline':
      return 'notice-highlight notice-highlight--deadline';
    case 'amount':
      return 'notice-highlight notice-highlight--amount';
    case 'phrase':
    default:
      return 'notice-highlight';
  }
}

export function HighlightedText({
  text,
  highlightWords,
  autoDetectDocumentTerms = false,
  className,
}: HighlightedTextProps) {
  const segments = useMemo(
    () =>
      splitHighlightSegments(text, {
        words: highlightWords,
        autoDetectDocumentTerms,
      }),
    [text, highlightWords, autoDetectDocumentTerms]
  );

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.kind === 'plain' ? (
          <span key={`${index}-plain`}>{segment.text}</span>
        ) : (
          <mark key={`${index}-${segment.kind}`} className={getMarkClass(segment.kind)}>
            {segment.text}
          </mark>
        )
      )}
    </span>
  );
}
