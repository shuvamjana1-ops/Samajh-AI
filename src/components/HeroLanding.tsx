import { FileText, Upload } from 'lucide-react';
import { useId, useState, type ChangeEvent, type DragEvent, type RefObject } from 'react';
import { UI_COPY } from '../data/demoAgreement';
import type { Language } from '../types/document';
import { HighlightedText } from './HighlightedText';
import { ScrambleText } from './ScrambleText';

interface HeroLandingProps {
  language: Language;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFilesSelected: (files: FileList | null) => void;
  onLoadSample: () => void;
  onOpenCompressor: (seedFile?: File | null) => void;
  oversizedFile?: File | null;
  uploadError: string | null;
}

export function HeroLanding({
  language,
  fileInputRef,
  onFilesSelected,
  onLoadSample,
  onOpenCompressor,
  oversizedFile = null,
  uploadError,
}: HeroLandingProps) {
  const copy = UI_COPY[language];
  const [isDragging, setIsDragging] = useState(false);
  const uploadInputId = useId();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onFilesSelected(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const steps =
    language === 'hi'
      ? [
          {
            num: '01',
            title: 'कागज़ अपलोड करें',
            detail: 'अपने समझौते, अनुबंध या नोटिस की फोटो या PDF (8 MB, 5 पेज तक) डालें।',
          },
          {
            num: '02',
            title: 'सरल व्याख्या पाएं',
            detail: 'तारीखें, पैसे, जोखिम वाली शर्तें और मुख्य सारांश आसान भाषा में पढ़ें या सुनें।',
          },
          {
            num: '03',
            title: 'सीधे सवाल पूछें',
            detail: 'कागज़ से जुड़ा कोई भी सवाल लिखकर या बोलकर पूछें और क्लॉज़ के साथ जवाब पाएं।',
          },
        ]
      : [
          {
            num: '01',
            title: 'Upload contract or paper',
            detail: 'Drop a JPG, PNG, or PDF of any agreement, notice, or form (up to 8 MB, 5 pages).',
          },
          {
            num: '02',
            title: 'Plain-language breakdown',
            detail: 'Read or listen to a clear summary of due dates, payments, and risky clauses.',
          },
          {
            num: '03',
            title: 'Ask about your papers',
            detail: 'Type or speak questions answered strictly from your document with cited clauses.',
          },
        ];

  return (
    <div className="swiss-home">
      <section className="swiss-hero-section swiss-grid" aria-labelledby="hero-title">
        <div className="swiss-gold-circle" aria-hidden="true" />

        <div className="swiss-hero-headline-col">
          <h1 id="hero-title" className="hero-headline swiss-hero-h1">
            <ScrambleText
              text={copy.heroTitle}
              highlightWords={copy.heroTitleHighlights}
              durationMs={720}
            />
          </h1>
        </div>

        <div className="swiss-hero-meta-col">
          <p className="body-lead swiss-hero-copy">
            <HighlightedText
              text={copy.heroSubtitle}
              highlightWords={copy.heroSubtitleHighlights}
            />
          </p>

          <input
            id={uploadInputId}
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            multiple
            hidden
            onChange={handleInputChange}
          />

          <div
            className={`swiss-dropzone ${isDragging ? 'swiss-dropzone-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <span className="dropzone-corner dropzone-corner-tl" aria-hidden="true" />
            <span className="dropzone-corner dropzone-corner-tr" aria-hidden="true" />
            <span className="dropzone-corner dropzone-corner-bl" aria-hidden="true" />
            <span className="dropzone-corner dropzone-corner-br" aria-hidden="true" />

            <label htmlFor={uploadInputId} className="swiss-dropzone-stage">
              <span className="swiss-dropzone-icon" aria-hidden="true">
                {isDragging ? <FileText size={22} /> : <Upload size={22} />}
              </span>
              <span className="swiss-dropzone-stage-text">
                <span className="swiss-dropzone-title">
                  {isDragging
                    ? language === 'hi'
                      ? 'दस्तावेज़ पढ़ने के लिए छोड़ें'
                      : 'Release to read this document'
                    : language === 'hi'
                      ? 'अपना अनुबंध या कागज़ यहाँ डालें'
                      : 'Drop your contract or paper here'}
                </span>
                <span className="swiss-dropzone-subtitle">
                  {language === 'hi'
                    ? 'फ़ाइल खींचकर लाएं या डिवाइस से चुनने के लिए यहाँ क्लिक करें'
                    : 'Drag and drop files here, or click anywhere above to browse'}
                </span>
              </span>
              <span className="swiss-dropzone-formats tabular-nums" aria-hidden="true">
                PDF · JPG · PNG
              </span>
            </label>

            <div className="swiss-dropzone-footer">
              <div className="swiss-dropzone-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={17} aria-hidden="true" />
                  <span>{copy.scanButton}</span>
                </button>

                <button
                  type="button"
                  className="swiss-text-toggle swiss-text-toggle-link"
                  onClick={onLoadSample}
                >
                  {copy.sampleButton}
                </button>
              </div>

              <p className="meta-text swiss-dropzone-meta">
                <HighlightedText
                  text={copy.fileHint}
                  highlightWords={copy.fileHintHighlights}
                />
              </p>
            </div>
          </div>

          {uploadError && (
            <div className="error-card" role="alert">
              <p className="body-text">{uploadError}</p>
              {oversizedFile && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onOpenCompressor(oversizedFile)}
                  >
                    {language === 'hi'
                      ? 'इसे 8 MB में कंप्रेस करें'
                      : 'Compress to 8 MB & continue'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="swiss-band swiss-grid" aria-label={language === 'hi' ? 'कैसे काम करता है' : 'How Samajh works'}>
        <div className="swiss-how-grid">
          {steps.map((step) => (
            <div key={step.num} className="swiss-how-card">
              <span className="swiss-how-num tabular-nums" aria-hidden="true">
                {step.num}
              </span>
              <h2 className="swiss-band-title">{step.title}</h2>
              <p className="body-text">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
