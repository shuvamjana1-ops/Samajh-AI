import { FileText, Loader2, Plus, Sparkles, X } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import { UI_COPY } from '../data/demoAgreement';
import { formatPreviewAltText, MAX_PAGES } from '../lib/documentLogic';
import type { Language, UploadedPage } from '../types/document';

interface CapturePreviewProps {
  language: Language;
  pages: UploadedPage[];
  isAnalyzing: boolean;
  errorMessage: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAddMoreFiles: (files: FileList | null) => void;
  onRemovePage: (id: string) => void;
  onAnalyze: () => void;
  onReset: () => void;
}

export function CapturePreview({
  language,
  pages,
  isAnalyzing,
  errorMessage,
  fileInputRef,
  onAddMoreFiles,
  onRemovePage,
  onAnalyze,
  onReset,
}: CapturePreviewProps) {
  const copy = UI_COPY[language];

  const handleAddChange = (e: ChangeEvent<HTMLInputElement>) => {
    onAddMoreFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <section className="glass-card preview-wrap" aria-live="polite">
      <div>
        <h1 className="section-heading">
          {isAnalyzing ? copy.analyzingTitle : copy.previewHeading}
        </h1>
        <p className="body-text">
          {isAnalyzing ? copy.analyzingSubtitle : copy.previewSubtitle}
        </p>
      </div>

      {isAnalyzing && (
        <>
          <div className="translating-banner">
            <Loader2 size={18} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
            <span>{copy.analyzingSubtitle}</span>
          </div>
          <div className="skeleton-stack" aria-hidden="true">
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-line-short" />
            <div className="skeleton-block" />
          </div>
        </>
      )}

      {errorMessage && (
        <div className="error-card" role="alert">
          <strong className="card-heading">{copy.errorTitle}</strong>
          <p className="body-text">{errorMessage}</p>
        </div>
      )}

      <div className="preview-thumbs">
        {pages.map((page, index) => (
          <div key={page.id} className="preview-page-card">
            {page.mimeType === 'application/pdf' ? (
              <div className="preview-pdf-box">
                <FileText size={28} aria-hidden="true" />
                <span className="meta-text">{page.name}</span>
              </div>
            ) : (
              <img
                src={page.previewUrl}
                alt={formatPreviewAltText(page.name, index + 1, pages.length, language)}
                className="preview-img"
              />
            )}

            <div className="result-row-top">
              <span className="meta-text tabular-nums">
                Page {index + 1}
              </span>
              {!isAnalyzing && (
                <button
                  type="button"
                  className="btn-ghost btn-icon"
                  aria-label={`Remove page ${index + 1}: ${page.name}`}
                  onClick={() => onRemovePage(page.id)}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        multiple
        hidden
        onChange={handleAddChange}
      />

      <div className="preview-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={isAnalyzing || pages.length === 0}
          onClick={onAnalyze}
        >
          {isAnalyzing ? (
            <Loader2 size={18} aria-hidden="true" />
          ) : (
            <Sparkles size={18} aria-hidden="true" />
          )}
          <span>{isAnalyzing ? copy.analyzingTitle : copy.analyzeButton}</span>
        </button>

        {!isAnalyzing && pages.length < MAX_PAGES && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={18} aria-hidden="true" />
            <span>{copy.addMorePages}</span>
          </button>
        )}

        {!isAnalyzing && (
          <button
            type="button"
            className="btn-ghost"
            onClick={onReset}
          >
            <span>{copy.retakeButton}</span>
          </button>
        )}
      </div>
    </section>
  );
}
