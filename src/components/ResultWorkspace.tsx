import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Mic,
  MicOff,
  Send,
  Square,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { UI_COPY } from '../data/demoAgreement';
import { buildSpeechScript, formatPreviewAltText, LANGUAGE_CONFIG } from '../lib/documentLogic';
import { HighlightedText } from './HighlightedText';
import { ScrambleText } from './ScrambleText';
import type {
  DocumentAnalysis,
  Language,
  QaMessage,
  ResultTab,
  UploadedPage,
} from '../types/document';

interface ResultWorkspaceProps {
  analysis: DocumentAnalysis;
  language: Language;
  pages?: UploadedPage[];
  isDemo: boolean;
  isTranslating: boolean;
  translateError: string | null;
  qaMessages: QaMessage[];
  isAsking: boolean;
  askError: string | null;
  onAskQuestion: (question: string) => void;
  initialCompletedSteps?: number[];
  onStepsChange: (completedSteps: number[]) => void;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function ResultWorkspace({
  analysis,
  language,
  pages = [],
  isDemo,
  isTranslating,
  translateError,
  qaMessages,
  isAsking,
  askError,
  onAskQuestion,
  initialCompletedSteps = [],
  onStepsChange,
}: ResultWorkspaceProps) {
  const copy = UI_COPY[language];
  const [activeTab, setActiveTab] = useState<ResultTab>('deadlines');
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [pageDirection, setPageDirection] = useState<'initial' | 'next' | 'prev'>('initial');
  const [isWorkspaceTransitioning, setIsWorkspaceTransitioning] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    for (const idx of initialCompletedSteps) initial[idx] = true;
    return initial;
  });
  const [copiedSteps, setCopiedSteps] = useState(false);

  // Listen (SpeechSynthesis) state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);

  // Ask & Mic (SpeechRecognition) state
  const [questionInput, setQuestionInput] = useState('');
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const triggerWorkspaceTransition = () => {
    setIsWorkspaceTransitioning(true);
    if (transitionTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(transitionTimerRef.current);
    }
    if (typeof window !== 'undefined') {
      transitionTimerRef.current = window.setTimeout(() => {
        setIsWorkspaceTransitioning(false);
      }, 260);
    }
  };

  const handleSelectTab = (tabId: ResultTab) => {
    if (tabId === activeTab) return;
    setActiveTab(tabId);
    triggerWorkspaceTransition();
  };

  const handlePaginate = (nextIndex: number, direction: 'next' | 'prev') => {
    if (nextIndex === activePageIndex) return;
    setPageDirection(direction);
    setActivePageIndex(nextIndex);
    triggerWorkspaceTransition();
  };

  useEffect(() => {
    const initial: Record<number, boolean> = {};
    for (const idx of initialCompletedSteps) initial[idx] = true;
    setCheckedSteps(initial);
    setCopiedSteps(false);
  }, [analysis.type, initialCompletedSteps]);

  useEffect(() => {
    setActivePageIndex(0);
    setPageDirection('initial');
  }, [pages.length]);

  useEffect(() => {
    setSpeechNotice(null);
    setMicNotice(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [language]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(transitionTimerRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  const handleToggleListen = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechNotice(copy.listenUnsupported);
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    setSpeechNotice(null);
    const synth = window.speechSynthesis;
    synth.cancel();

    const targetLang = LANGUAGE_CONFIG[language].speechLang;
    const voices = synth.getVoices();
    const prefix = targetLang.split('-')[0];
    const matchingVoice =
      voices.find((v) => v.lang.toLowerCase() === targetLang.toLowerCase()) ??
      voices.find((v) => v.lang.toLowerCase().startsWith(prefix));

    const utterance = new SpeechSynthesisUtterance(buildSpeechScript(analysis, language));
    utterance.lang = targetLang;
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeechNotice(copy.listenUnsupported);
    };

    try {
      synth.speak(utterance);
      setIsSpeaking(true);
    } catch {
      setIsSpeaking(false);
      setSpeechNotice(copy.listenUnsupported);
    }
  };

  const handleToggleMic = () => {
    if (isListeningMic && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningMic(false);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setMicNotice(copy.askUnsupportedMic);
      return;
    }

    setMicNotice(null);
    try {
      const recognition = new Ctor();
      recognition.lang = LANGUAGE_CONFIG[language].speechLang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? '';
        if (transcript) {
          setQuestionInput(transcript);
          onAskQuestion(transcript);
        }
      };
      recognition.onerror = () => {
        setIsListeningMic(false);
        setMicNotice(copy.askUnsupportedMic);
      };
      recognition.onend = () => {
        setIsListeningMic(false);
      };

      recognitionRef.current = recognition;
      setIsListeningMic(true);
      recognition.start();
    } catch {
      setIsListeningMic(false);
      setMicNotice(copy.askUnsupportedMic);
    }
  };

  const handleSubmitQuestion = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = questionInput.trim();
    if (!trimmed || isAsking) return;
    setQuestionInput('');
    onAskQuestion(trimmed);
  };

  const getCompletedIndices = (map: Record<number, boolean>) =>
    Object.entries(map)
      .filter(([, val]) => val)
      .map(([k]) => Number(k))
      .filter((n) => Number.isInteger(n));

  const handleToggleStep = (index: number) => {
    setCheckedSteps((prev) => {
      const next = { ...prev, [index]: !prev[index] };
      onStepsChange(getCompletedIndices(next));
      return next;
    });
  };

  const handleCopyChecklist = async () => {
    const text = analysis.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSteps(true);
      setTimeout(() => setCopiedSteps(false), 2500);
    } catch {
      setCopiedSteps(false);
    }
  };

  const completedCount = Object.values(checkedSteps).filter(Boolean).length;

  const tabs: Array<{ id: ResultTab; label: string; count: number }> = [
    { id: 'deadlines', label: copy.tabs.deadlines, count: analysis.deadlines.length },
    { id: 'money', label: copy.tabs.money, count: analysis.money.length },
    { id: 'risks', label: copy.tabs.risks, count: analysis.risks.length },
    { id: 'steps', label: copy.tabs.steps, count: analysis.steps.length },
  ];

  return (
    <div
      className="result-layout"
      data-transitioning={isWorkspaceTransitioning ? 'true' : 'false'}
    >
      <div className="result-left-col">
        {isTranslating && (
          <div className="translating-banner" role="status">
            {copy.translatingNotice}
          </div>
        )}

        {translateError && (
          <div className="error-card" role="alert">
            <p className="body-text">{translateError}</p>
          </div>
        )}

        <section className="glass-card" aria-labelledby="summary-title">
          <div className="summary-header">
            <div>
              <div className="doc-type-label">
                {analysis.type}
                {isDemo ? ` · ${copy.sampleBadge}` : ''}
              </div>
              <h1 id="summary-title" className="section-heading">
                <ScrambleText
                  text={copy.summaryHeading}
                  highlightWords={copy.summaryHeadingHighlights}
                  durationMs={560}
                />
              </h1>
            </div>

            <div className="summary-actions">
              <button
                type="button"
                className={isSpeaking ? 'btn-primary' : 'btn-secondary'}
                onClick={handleToggleListen}
                aria-label={
                  isSpeaking
                    ? `${copy.listenStop}: pause summary audio playback`
                    : `${copy.listenPlay} to document summary aloud`
                }
                aria-pressed={isSpeaking}
              >
                {isSpeaking ? (
                  <Square size={16} aria-hidden="true" />
                ) : (
                  <Volume2 size={18} aria-hidden="true" />
                )}
                <span>{isSpeaking ? copy.listenStop : copy.listenPlay}</span>
              </button>
            </div>
          </div>

          <p className="body-lead">
            <HighlightedText text={analysis.summary} autoDetectDocumentTerms />
          </p>

          {speechNotice && (
            <p className="listen-notice" role="status">
              {speechNotice}
            </p>
          )}
        </section>

        <section className="glass-card" aria-labelledby="ask-title">
          <h2 id="ask-title" className="card-heading">
            {copy.askHeading}
          </h2>

          <form className="ask-form" onSubmit={handleSubmitQuestion}>
            <label htmlFor="ask-question-input" className="form-label">
              {isListeningMic ? copy.askListening : copy.askPlaceholder}
            </label>
            <div className="ask-input-row">
              <input
                id="ask-question-input"
                type="text"
                className="ask-input"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                disabled={isAsking}
              />

              <button
                type="button"
                className={`${isListeningMic ? 'btn-primary' : 'btn-secondary'} btn-icon ask-mic-btn`}
                onClick={handleToggleMic}
                aria-label={
                  isListeningMic
                    ? `${copy.askMicStop} for document question`
                    : `${copy.askMicLabel} about this document`
                }
                aria-pressed={isListeningMic}
                title={isListeningMic ? copy.askMicStop : copy.askMicLabel}
              >
                {isListeningMic ? (
                  <MicOff size={18} aria-hidden="true" />
                ) : (
                  <Mic size={18} aria-hidden="true" />
                )}
              </button>

              <button
                type="submit"
                className="btn-primary ask-send-btn"
                aria-label={`${copy.askSend} question about this document`}
                disabled={isAsking || !questionInput.trim()}
              >
                <Send size={16} aria-hidden="true" />
                <span>{copy.askSend}</span>
              </button>
            </div>

            <div className="ask-suggestions">
              {copy.askSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="suggestion-btn"
                  disabled={isAsking}
                  onClick={() => onAskQuestion(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </form>

          {micNotice && (
            <p className="listen-notice" role="status">
              {micNotice}
            </p>
          )}

          {isAsking && (
            <p className="listen-notice" role="status">
              {copy.askThinking}
            </p>
          )}

          {askError && (
            <div className="error-card" role="alert" style={{ marginTop: '3%' }}>
              <p className="body-text">{askError}</p>
            </div>
          )}

          {qaMessages.length > 0 && (
            <div className="qa-thread" aria-live="polite">
              {qaMessages.map((msg) => (
                <div key={msg.id} className="qa-item">
                  <p className="qa-question">{msg.question}</p>
                  <p className="qa-answer">
                    <HighlightedText text={msg.answer} autoDetectDocumentTerms />
                  </p>
                  {msg.notInDocument ? (
                    <span className="qa-missing">{copy.notInDocumentBadge}</span>
                  ) : msg.citedClause ? (
                    <span className="qa-citation">
                      {copy.citedLabel}: {msg.citedClause}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="result-right-col">
        {pages.length > 1 && (() => {
          const safeIndex = Math.min(activePageIndex, pages.length - 1);
          const activePage = pages[safeIndex];
          return (
            <section className="glass-card result-workspace-panel" aria-labelledby="doc-pages-title">
              <div className="doc-pager-bar">
                <h2 id="doc-pages-title" className="card-heading">
                  {copy.documentPagesHeading}
                </h2>
                <div className="doc-pager-controls">
                  <button
                    type="button"
                    className="btn-ghost"
                    aria-label={`${copy.prevPage}: ${copy.pageLabel} ${Math.max(1, safeIndex)}`}
                    disabled={safeIndex === 0}
                    onClick={() => handlePaginate(Math.max(0, safeIndex - 1), 'prev')}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    <span>{copy.prevPage}</span>
                  </button>
                  <span className="meta-text tabular-nums doc-pager-status" aria-live="polite">
                    {copy.pageLabel} {safeIndex + 1} {copy.ofLabel} {pages.length}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost"
                    aria-label={`${copy.nextPage}: ${copy.pageLabel} ${Math.min(pages.length, safeIndex + 2)}`}
                    disabled={safeIndex >= pages.length - 1}
                    onClick={() => handlePaginate(Math.min(pages.length - 1, safeIndex + 1), 'next')}
                  >
                    <span>{copy.nextPage}</span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="doc-pager-frame">
                <div
                  key={safeIndex}
                  className={`doc-pager-slide doc-pager-slide-${pageDirection}`}
                >
                  {activePage.mimeType === 'application/pdf' ? (
                    <div className="doc-pager-pdf">
                      <FileText size={28} aria-hidden="true" />
                      <span className="meta-text">{activePage.name}</span>
                    </div>
                  ) : (
                    <img
                      src={activePage.previewUrl}
                      alt={formatPreviewAltText(activePage.name, safeIndex + 1, pages.length, language)}
                      className="doc-pager-img"
                    />
                  )}
                </div>
              </div>
            </section>
          );
        })()}

        <section className="glass-card result-workspace-panel" aria-label="Document breakdown">
          <div className="tabs-bar" role="tablist" aria-label="Document sections">
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  className={`tab-btn ${selected ? 'tab-btn-active' : ''}`}
                  onClick={() => handleSelectTab(tab.id)}
                >
                  <span>{tab.label}</span>
                  <span className="tab-count">{tab.count}</span>
                </button>
              );
            })}
          </div>

          <div
            key={activeTab}
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="tab-panel-animated"
          >
            {activeTab === 'deadlines' && (
              <div className="items-stack">
                {analysis.deadlines.length === 0 ? (
                  <p className="body-text">{copy.emptyItems}</p>
                ) : (
                  analysis.deadlines.map((item, idx) => (
                    <div key={`${item.when}-${idx}`} className="result-row">
                      <div className="result-row-top">
                        <span className="item-primary">{item.what}</span>
                        <span className="item-when tabular-nums">{item.when}</span>
                      </div>
                      {item.note && (
                        <p className="body-text">
                          <HighlightedText text={item.note} autoDetectDocumentTerms />
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'money' && (
              <div className="items-stack">
                {analysis.money.length === 0 ? (
                  <p className="body-text">{copy.emptyItems}</p>
                ) : (
                  analysis.money.map((item, idx) => (
                    <div key={`${item.label}-${idx}`} className="result-row">
                      <div className="result-row-top">
                        <span className="item-primary">{item.label}</span>
                        <span className="item-highlight tabular-nums">{item.amount}</span>
                      </div>
                      {item.note && (
                        <p className="body-text">
                          <HighlightedText text={item.note} autoDetectDocumentTerms />
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'risks' && (
              <div className="items-stack">
                {analysis.risks.length === 0 ? (
                  <p className="body-text">{copy.emptyItems}</p>
                ) : (
                  analysis.risks.map((risk, idx) => (
                    <div key={`${risk.clause}-${idx}`} className={`risk-card risk-card-${risk.sev}`}>
                      <div className="risk-meta-row">
                        <span className={`severity-tag severity-${risk.sev}`}>
                          {copy.severityLabels[risk.sev]}
                        </span>
                        <span aria-hidden="true" className="clause-ref">·</span>
                        <span className="clause-ref">{risk.clause}</span>
                      </div>
                      <p className="body-text">
                        <HighlightedText text={risk.text} autoDetectDocumentTerms />
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'steps' && (
              <div>
                <div className="steps-header-row">
                  <span className="meta-text tabular-nums">
                    {completedCount} / {analysis.steps.length} {copy.stepsProgress}
                  </span>
                  {analysis.steps.length > 0 && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={handleCopyChecklist}
                    >
                      {copiedSteps ? (
                        <Check size={16} aria-hidden="true" />
                      ) : (
                        <Copy size={16} aria-hidden="true" />
                      )}
                      <span>{copiedSteps ? copy.copiedChecklist : copy.copyChecklist}</span>
                    </button>
                  )}
                </div>

                <div className="items-stack">
                  {analysis.steps.length === 0 ? (
                    <p className="body-text">{copy.emptyItems}</p>
                  ) : (
                    analysis.steps.map((step, idx) => {
                      const done = Boolean(checkedSteps[idx]);
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`step-item ${done ? 'step-item-done' : ''}`}
                          aria-pressed={done}
                          onClick={() => handleToggleStep(idx)}
                        >
                          <CheckSquare
                            size={18}
                            aria-hidden="true"
                            style={{
                              flexShrink: 0,
                              color: done ? 'var(--accent-teal)' : 'var(--ink-muted)',
                            }}
                          />
                          <span className="step-num tabular-nums">{idx + 1}.</span>
                          <span className="step-text body-text">
                            <HighlightedText text={step} autoDetectDocumentTerms />
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
