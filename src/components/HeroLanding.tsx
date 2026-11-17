import { useState, type ChangeEvent, type FormEvent, type RefObject } from 'react';
import { DEMO_ANALYSES, UI_COPY } from '../data/demoAgreement';
import { answerDemoQuestion, LANGUAGE_CONFIG } from '../lib/documentLogic';
import type { Language, QaMessage } from '../types/document';

interface HeroLandingProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFilesSelected: (files: FileList | null) => void;
  onLoadSample: () => void;
  uploadError: string | null;
}

const LANGUAGES: Language[] = ['en', 'hi'];

export function HeroLanding({
  language,
  onLanguageChange,
  fileInputRef,
  onFilesSelected,
  onLoadSample,
  uploadError,
}: HeroLandingProps) {
  const copy = UI_COPY[language];
  const sample = DEMO_ANALYSES[language];

  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [question, setQuestion] = useState('');
  const [qaMessages, setQaMessages] = useState<QaMessage[]>([]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onFilesSelected(e.target.files);
    e.target.value = '';
  };

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    );
  };

  const handleAskSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    const reply = answerDemoQuestion(trimmed, language);
    setQaMessages((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        question: trimmed,
        answer: reply.answer,
        citedClause: reply.citedClause,
        notInDocument: reply.notInDocument,
      },
      ...prev.slice(0, 2),
    ]);
    setQuestion('');
  };

  const understandRows = [
    ...sample.deadlines.slice(0, 2).map((d) => ({
      kind: 'status' as const,
      label: d.what,
      value: d.when,
      note: d.note,
    })),
    ...sample.money.slice(0, 2).map((m) => ({
      kind: 'plain' as const,
      label: m.label,
      value: m.amount,
      note: m.note,
    })),
    ...sample.risks.slice(0, 2).map((r) => ({
      kind: 'status' as const,
      label: r.clause,
      value: copy.severityLabels[r.sev],
      note: r.text,
    })),
  ];

  return (
    <div className="swiss-home">
      <section className="swiss-hero-section swiss-grid" aria-labelledby="hero-title">
        <div className="swiss-gold-circle" aria-hidden="true" />

        <div className="swiss-hero-headline-col">
          <h1 id="hero-title" className="hero-headline swiss-hero-h1">
            {copy.heroTitle}
          </h1>
        </div>

        <div className="swiss-hero-meta-col">
          <p className="body-lead swiss-hero-copy">{copy.heroSubtitle}</p>

          <div className="swiss-lang-switch" role="group" aria-label="Language">
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            multiple
            hidden
            onChange={handleInputChange}
          />

          <div className="swiss-hero-cta">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              {copy.scanButton}
            </button>
          </div>

          {uploadError && (
            <div className="error-card" role="alert">
              <p className="body-text">{uploadError}</p>
            </div>
          )}
        </div>
      </section>

      <section className="swiss-band swiss-grid" aria-labelledby="section-scan">
        <div className="swiss-num-col">
          <span className="swiss-index-num" aria-hidden="true">
            01
          </span>
          <h2 id="section-scan" className="swiss-band-title">
            {copy.whatChecksHeading}
          </h2>
        </div>

        <div className="swiss-content-col">
          <p className="body-lead">{copy.fileHint}</p>
          <div className="swiss-inline-action">
            <button
              type="button"
              className="swiss-text-toggle swiss-text-toggle-link"
              onClick={onLoadSample}
            >
              {copy.sampleButton}
            </button>
          </div>
        </div>
      </section>

      <section className="swiss-band swiss-grid" aria-labelledby="section-understand">
        <div className="swiss-num-col">
          <span className="swiss-index-num" aria-hidden="true">
            02
          </span>
          <h2 id="section-understand" className="swiss-band-title">
            {language === 'hi' ? 'समझें' : 'Understand'}
          </h2>
        </div>

        <div className="swiss-content-col">
          <p className="caption-text swiss-table-caption">
            {language === 'hi'
              ? 'नमूना किराया समझौता: समय सीमा, रकम और जोखिम'
              : 'Sample rental agreement: deadlines, money, and risky clauses'}
          </p>

          <table className="swiss-table">
            <thead>
              <tr>
                <th scope="col" className="caption-text">
                  {language === 'hi' ? 'विषय' : 'Label'}
                </th>
                <th scope="col" className="caption-text">
                  {language === 'hi' ? 'विवरण' : 'Value'}
                </th>
                <th scope="col" className="caption-text">
                  {language === 'hi' ? 'टिप्पणी' : 'Note'}
                </th>
              </tr>
            </thead>
            <tbody>
              {understandRows.map((row) => (
                <tr key={`${row.label}-${row.value}`}>
                  <td className="swiss-table-label" data-label={language === 'hi' ? 'विषय' : 'Label'}>
                    <span className="swiss-table-label-inner">
                      {row.kind === 'status' && <span className="swiss-status-mark" aria-hidden="true" />}
                      <span>{row.label}</span>
                    </span>
                  </td>
                  <td className="swiss-table-value tabular-nums" data-label={language === 'hi' ? 'विवरण' : 'Value'}>
                    {row.value}
                  </td>
                  <td className="swiss-table-note" data-label={language === 'hi' ? 'टिप्पणी' : 'Note'}>
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="swiss-band swiss-grid" aria-labelledby="section-act">
        <div className="swiss-num-col">
          <span className="swiss-index-num" aria-hidden="true">
            03
          </span>
          <h2 id="section-act" className="swiss-band-title">
            {language === 'hi' ? 'कदम उठाएं' : 'Act'}
          </h2>
        </div>

        <div className="swiss-content-col">
          <p className="caption-text swiss-table-caption">
            {language === 'hi' ? 'अगले कदमों की सूची' : 'Next-steps checklist'}
          </p>

          <ul className="swiss-checklist">
            {sample.steps.map((step, index) => {
              const done = checkedSteps.includes(index);
              return (
                <li key={step} className="swiss-checklist-row">
                  <button
                    type="button"
                    className={`swiss-check-btn ${done ? 'swiss-check-btn-done' : ''}`}
                    aria-pressed={done}
                    onClick={() => toggleStep(index)}
                  >
                    <span className={`swiss-checkbox-box ${done ? 'swiss-checkbox-box-done' : ''}`} aria-hidden="true">
                      {done ? 'x' : ''}
                    </span>
                    <span className="swiss-check-text">{step}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <form className="swiss-ask-box" onSubmit={handleAskSubmit}>
            <label htmlFor="home-ask-input" className="caption-text">
              {copy.askHeading}
            </label>
            <div className="swiss-ask-row">
              <input
                id="home-ask-input"
                type="text"
                className="ask-input swiss-ask-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={copy.askPlaceholder}
              />
              <button type="submit" className="btn btn-primary swiss-ask-submit">
                {copy.askSend}
              </button>
            </div>
          </form>

          {qaMessages.length > 0 && (
            <div className="swiss-qa-list" aria-live="polite">
              {qaMessages.map((msg) => (
                <div key={msg.id} className="swiss-qa-row">
                  <p className="swiss-qa-q">{msg.question}</p>
                  <p className="body-text">{msg.answer}</p>
                  {msg.citedClause && (
                    <p className="caption-text">
                      {copy.citedLabel}: {msg.citedClause}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
