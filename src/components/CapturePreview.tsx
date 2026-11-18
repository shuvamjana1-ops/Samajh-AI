import { FileText, Loader2, Maximize2, Plus, Sparkles, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { UI_COPY } from '../data/demoAgreement';
import {
  DEFAULT_PREVIEW_ZOOM,
  formatPreviewAltText,
  MAX_PAGES,
  PREVIEW_ZOOM_LEVELS,
  stepPreviewZoom,
  type PreviewZoomLevel,
} from '../lib/documentLogic';
import type { Language, UploadedPage } from '../types/document';
import { ScrambleText } from './ScrambleText';

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

const MIN_ZOOM = PREVIEW_ZOOM_LEVELS[0];
const MAX_ZOOM = PREVIEW_ZOOM_LEVELS[PREVIEW_ZOOM_LEVELS.length - 1];

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
  const [zoomByPage, setZoomByPage] = useState<Record<string, PreviewZoomLevel>>({});
  const [inspectedPageId, setInspectedPageId] = useState<string | null>(null);

  const inspectedIndex = inspectedPageId
    ? pages.findIndex((p) => p.id === inspectedPageId && p.mimeType !== 'application/pdf')
    : -1;
  const inspectedPage = inspectedIndex >= 0 ? pages[inspectedIndex] : null;

  useEffect(() => {
    if (!inspectedPage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInspectedPageId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectedPage]);

  const getZoom = (pageId: string): PreviewZoomLevel =>
    zoomByPage[pageId] ?? DEFAULT_PREVIEW_ZOOM;

  const updateZoom = (pageId: string, direction: 'in' | 'out') => {
    setZoomByPage((prev) => ({
      ...prev,
      [pageId]: stepPreviewZoom(prev[pageId] ?? DEFAULT_PREVIEW_ZOOM, direction),
    }));
  };

  const resetZoom = (pageId: string) => {
    setZoomByPage((prev) => ({
      ...prev,
      [pageId]: DEFAULT_PREVIEW_ZOOM,
    }));
  };

  const handleAddChange = (e: ChangeEvent<HTMLInputElement>) => {
    onAddMoreFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <section className="glass-card preview-wrap" aria-live="polite">
      <div>
        <h1 className="section-heading">
          <ScrambleText
            text={isAnalyzing ? copy.analyzingTitle : copy.previewHeading}
            highlightWords={isAnalyzing ? undefined : copy.previewHeadingHighlights}
            durationMs={540}
          />
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
        {pages.map((page, index) => {
          const isImage = page.mimeType !== 'application/pdf';
          const zoom = getZoom(page.id);
          return (
            <div key={page.id} className="preview-page-card">
              {!isImage ? (
                <div className="preview-pdf-box">
                  <FileText size={28} aria-hidden="true" />
                  <span className="meta-text">{page.name}</span>
                </div>
              ) : (
                <>
                  <div
                    className="preview-img-viewport"
                    data-zoom={zoom}
                    data-testid={`preview-viewport-${page.id}`}
                  >
                    <img
                      src={page.previewUrl}
                      alt={formatPreviewAltText(page.name, index + 1, pages.length, language)}
                      className={`preview-img preview-img-zoom-${zoom}`}
                    />
                  </div>

                  {!isAnalyzing && (
                    <div
                      className="preview-zoom-bar"
                      role="group"
                      aria-label={
                        language === 'hi'
                          ? `पेज ${index + 1} ज़ूम नियंत्रण`
                          : `Zoom controls for page ${index + 1}`
                      }
                    >
                      <button
                        type="button"
                        className="btn-ghost btn-icon preview-zoom-btn"
                        disabled={zoom <= MIN_ZOOM}
                        aria-label={
                          language === 'hi'
                            ? `पेज ${index + 1} छोटा करें: ${page.name}`
                            : `Zoom out page ${index + 1}: ${page.name}`
                        }
                        onClick={() => updateZoom(page.id, 'out')}
                      >
                        <ZoomOut size={15} aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        className="btn-ghost preview-zoom-readout tabular-nums"
                        disabled={zoom === DEFAULT_PREVIEW_ZOOM}
                        aria-label={
                          language === 'hi'
                            ? `पेज ${index + 1} ज़ूम रीसेट करें (अभी ${zoom}%)`
                            : `Reset zoom for page ${index + 1} (currently ${zoom}%)`
                        }
                        onClick={() => resetZoom(page.id)}
                      >
                        {zoom}%
                      </button>

                      <button
                        type="button"
                        className="btn-ghost btn-icon preview-zoom-btn"
                        disabled={zoom >= MAX_ZOOM}
                        aria-label={
                          language === 'hi'
                            ? `पेज ${index + 1} बड़ा करें: ${page.name}`
                            : `Zoom in page ${index + 1}: ${page.name}`
                        }
                        onClick={() => updateZoom(page.id, 'in')}
                      >
                        <ZoomIn size={15} aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        className="btn-ghost btn-icon preview-zoom-btn"
                        aria-label={
                          language === 'hi'
                            ? `पेज ${index + 1} बड़ा करके देखें: ${page.name}`
                            : `Inspect page ${index + 1} larger: ${page.name}`
                        }
                        onClick={() => setInspectedPageId(page.id)}
                      >
                        <Maximize2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </>
              )}

              <div className="result-row-top">
                <span className="meta-text tabular-nums">
                  {language === 'hi' ? `पेज ${index + 1}` : `Page ${index + 1}`}
                </span>
                {!isAnalyzing && (
                  <button
                    type="button"
                    className="btn-ghost btn-icon"
                    aria-label={
                      language === 'hi'
                        ? `पेज ${index + 1} हटाएं: ${page.name}`
                        : `Remove page ${index + 1}: ${page.name}`
                    }
                    onClick={() => {
                      if (inspectedPageId === page.id) setInspectedPageId(null);
                      onRemovePage(page.id);
                    }}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {inspectedPage && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={
            language === 'hi'
              ? `पेज ${inspectedIndex + 1} दस्तावेज़ प्रीव्यू`
              : `Expanded preview of page ${inspectedIndex + 1}`
          }
        >
          <div className="glass-card modal-card preview-inspector-card">
            <div className="modal-header">
              <div className="preview-inspector-meta">
                <strong className="card-heading tabular-nums">
                  {language === 'hi'
                    ? `पेज ${inspectedIndex + 1} / ${pages.length}`
                    : `Page ${inspectedIndex + 1} of ${pages.length}`}
                </strong>
                <span className="meta-text">{inspectedPage.name}</span>
              </div>
              <button
                type="button"
                className="btn-ghost btn-icon"
                aria-label={language === 'hi' ? 'बड़ा प्रीव्यू बंद करें' : 'Close zoomed preview'}
                onClick={() => setInspectedPageId(null)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="preview-inspector-toolbar" role="group" aria-label="Zoom controls">
              <button
                type="button"
                className="btn-secondary preview-zoom-btn"
                disabled={getZoom(inspectedPage.id) <= MIN_ZOOM}
                aria-label={
                  language === 'hi' ? 'दस्तावेज़ छोटा करें' : 'Zoom out document image'
                }
                onClick={() => updateZoom(inspectedPage.id, 'out')}
              >
                <ZoomOut size={16} aria-hidden="true" />
                <span>{language === 'hi' ? 'छोटा' : 'Zoom out'}</span>
              </button>

              <button
                type="button"
                className="btn-ghost preview-zoom-readout tabular-nums"
                disabled={getZoom(inspectedPage.id) === DEFAULT_PREVIEW_ZOOM}
                aria-label={
                  language === 'hi'
                    ? `ज़ूम रीसेट करें (${getZoom(inspectedPage.id)}%)`
                    : `Reset zoom (${getZoom(inspectedPage.id)}%)`
                }
                onClick={() => resetZoom(inspectedPage.id)}
              >
                {getZoom(inspectedPage.id)}%
              </button>

              <button
                type="button"
                className="btn-secondary preview-zoom-btn"
                disabled={getZoom(inspectedPage.id) >= MAX_ZOOM}
                aria-label={
                  language === 'hi' ? 'दस्तावेज़ बड़ा करें' : 'Zoom in document image'
                }
                onClick={() => updateZoom(inspectedPage.id, 'in')}
              >
                <ZoomIn size={16} aria-hidden="true" />
                <span>{language === 'hi' ? 'बड़ा' : 'Zoom in'}</span>
              </button>
            </div>

            <div
              className="preview-inspector-viewport"
              data-zoom={getZoom(inspectedPage.id)}
              data-testid="preview-inspector-viewport"
            >
              <img
                src={inspectedPage.previewUrl}
                alt={formatPreviewAltText(
                  inspectedPage.name,
                  inspectedIndex + 1,
                  pages.length,
                  language
                )}
                className={`preview-inspector-img preview-img-zoom-${getZoom(inspectedPage.id)}`}
              />
            </div>
          </div>
        </div>
      )}

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
