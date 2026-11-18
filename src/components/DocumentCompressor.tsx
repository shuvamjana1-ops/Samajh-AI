import { Check, Download, FileText, Loader2, Minimize2, Sparkles, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  formatByteSize,
  inferDocumentMime,
  parseTargetSizeBytes,
  SIZE_PRESETS,
  type OutputFormatOption,
  type SizeUnit,
} from '../lib/docCompressor';
import { compressDocumentFile, type CompressionResult } from '../lib/docCompressorClient';
import { MAX_FILE_SIZE_BYTES } from '../lib/documentLogic';
import type { Language } from '../types/document';
import { HighlightedText } from './HighlightedText';
import { ScrambleText } from './ScrambleText';

interface DocumentCompressorProps {
  language: Language;
  initialFile?: File | null;
  onScanCompressedFile: (file: File) => void;
}

export function DocumentCompressor({
  language,
  initialFile = null,
  onScanCompressedFile,
}: DocumentCompressorProps) {
  const isHi = language === 'hi';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [sourceFile, setSourceFile] = useState<File | null>(initialFile);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [sizeAmount, setSizeAmount] = useState('8');
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('MB');
  const [outputFormat, setOutputFormat] = useState<OutputFormatOption>('original');
  const [exactSize, setExactSize] = useState(true);

  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);

  useEffect(() => {
    if (initialFile) {
      setSourceFile(initialFile);
      setResult(null);
      setErrorMsg(null);
    }
  }, [initialFile]);

  useEffect(() => {
    if (!sourceFile || inferDocumentMime(sourceFile.name, sourceFile.type) === 'application/pdf') {
      setSourcePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(sourceFile);
    setSourcePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceFile]);

  useEffect(() => {
    return () => {
      if (result?.previewUrl) {
        URL.revokeObjectURL(result.previewUrl);
      }
    };
  }, [result]);

  const parsedTargetBytes = parseTargetSizeBytes(sizeAmount, sizeUnit);
  const sourceMime = sourceFile ? inferDocumentMime(sourceFile.name, sourceFile.type) : null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!picked) return;

    const inferred = inferDocumentMime(picked.name, picked.type);
    if (!inferred) {
      setErrorMsg(
        isHi
          ? 'कृपया JPG, PNG या PDF दस्तावेज़ चुनें।'
          : 'Please choose a JPG, PNG, or PDF file.'
      );
      return;
    }
    if (result?.previewUrl) {
      URL.revokeObjectURL(result.previewUrl);
    }
    setSourceFile(picked);
    setResult(null);
    setErrorMsg(null);
  };

  const handleCompress = async (e: FormEvent) => {
    e.preventDefault();
    if (!sourceFile || isCompressing) return;

    const targetBytes = parseTargetSizeBytes(sizeAmount, sizeUnit);
    if (!targetBytes) {
      setErrorMsg(
        isHi
          ? 'कृपया 1 KB से 50 MB के बीच सही साइज लिखें।'
          : 'Please enter a valid target size between 1 KB and 50 MB.'
      );
      return;
    }

    setIsCompressing(true);
    setErrorMsg(null);
    if (result?.previewUrl) {
      URL.revokeObjectURL(result.previewUrl);
      setResult(null);
    }

    try {
      const compressed = await compressDocumentFile(sourceFile, {
        targetBytes,
        outputFormat: sourceMime === 'application/pdf' ? 'application/pdf' : outputFormat,
        exactSize,
      });
      setResult(compressed);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isHi
            ? 'दस्तावेज़ कंप्रेस नहीं हो सका। कृपया दूसरा लक्ष्य साइज चुनें।'
            : 'Could not compress this file to that target size.'
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.outputName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const headline = isHi
    ? 'दस्तावेज़ को सटीक साइज में कंप्रेस करें।'
    : 'Compress documents to the exact required size.';
  const headlineHighlights = isHi ? ['सटीक साइज'] : ['exact required size.'];
  const lead = isHi
    ? 'बड़ी JPG, PNG या स्कैन की गई PDF फ़ाइल को अपने ब्राउज़र में ही अपलोड के लिए ज़रूरी साइज (जैसे Samajh 8 MB, 500 KB या 200 KB) के बराबर लाएं।'
    : 'Shrink oversized JPG, PNG, or scanned PDFs locally in your browser to match the exact file size required by Samajh (8 MB) or any upload form.';

  return (
    <div className="info-page-stack">
      <section className="glass-card" aria-labelledby="compress-heading">
        <h1 id="compress-heading" className="hero-headline">
          <ScrambleText text={headline} highlightWords={headlineHighlights} durationMs={640} />
        </h1>
        <p className="body-lead">
          <HighlightedText
            text={lead}
            highlightWords={
              isHi ? ['ज़रूरी साइज', '8 MB'] : ['exact file size', '8 MB']
            }
          />
        </p>
      </section>

      <section className="glass-card" aria-label={isHi ? 'कंप्रेसर सेटिंग्स' : 'Compressor settings'}>
        <form className="compressor-form" onSubmit={handleCompress}>
          <div className="compressor-step">
            <div className="compressor-step-head">
              <span className="meta-text">01 · {isHi ? 'दस्तावेज़ चुनें' : 'Select document'}</span>
              {sourceFile && (
                <span className="meta-text tabular-nums" data-testid="compressor-source-meta">
                  {sourceFile.name} · {formatByteSize(sourceFile.size)} ({sourceFile.size.toLocaleString()} B)
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              id="compressor-file-input"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              hidden
              onChange={handleFileChange}
            />

            <div className="compressor-file-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} aria-hidden="true" />
                <span>
                  {sourceFile
                    ? isHi
                      ? 'दूसरा दस्तावेज़ चुनें'
                      : 'Choose another file'
                    : isHi
                      ? 'JPG, PNG या PDF चुनें'
                      : 'Choose JPG, PNG, or PDF'}
                </span>
              </button>

              {sourcePreviewUrl && (
                <img
                  src={sourcePreviewUrl}
                  alt={sourceFile ? sourceFile.name : 'Selected document preview'}
                  className="compressor-thumb"
                />
              )}

              {sourceFile && !sourcePreviewUrl && (
                <div className="compressor-pdf-chip">
                  <FileText size={18} aria-hidden="true" />
                  <span className="meta-text">PDF</span>
                </div>
              )}
            </div>
          </div>

          <div className="compressor-step">
            <span className="meta-text">
              02 · {isHi ? 'लक्ष्य साइज चुनें (इनपुट सीमा)' : 'Target required size'}
            </span>

            <div className="compressor-presets" role="group" aria-label={isHi ? 'त्वरित साइज विकल्प' : 'Quick size presets'}>
              {SIZE_PRESETS.map((preset) => {
                const active = sizeAmount === preset.amount && sizeUnit === preset.unit;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`swiss-text-toggle ${active ? 'swiss-text-toggle-active' : ''}`}
                    aria-pressed={active}
                    onClick={() => {
                      setSizeAmount(preset.amount);
                      setSizeUnit(preset.unit);
                    }}
                  >
                    {isHi ? preset.labelHi : preset.labelEn}
                  </button>
                );
              })}
            </div>

            <div className="compressor-inputs-grid">
              <div className="form-field">
                <label htmlFor="compress-target-amount" className="form-label">
                  {isHi ? 'आवश्यक साइज' : 'Required size'}
                </label>
                <input
                  id="compress-target-amount"
                  type="number"
                  min={1}
                  step="any"
                  className="ask-input tabular-nums"
                  value={sizeAmount}
                  onChange={(e) => setSizeAmount(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="compress-target-unit" className="form-label">
                  {isHi ? 'इकाई' : 'Unit'}
                </label>
                <select
                  id="compress-target-unit"
                  className="ask-input"
                  value={sizeUnit}
                  onChange={(e) => setSizeUnit(e.target.value as SizeUnit)}
                >
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                  <option value="B">Bytes</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="compress-output-format" className="form-label">
                  {isHi ? 'आउटपुट फ़ॉर्मेट' : 'Output format'}
                </label>
                <select
                  id="compress-output-format"
                  className="ask-input"
                  disabled={sourceMime === 'application/pdf'}
                  value={sourceMime === 'application/pdf' ? 'application/pdf' : outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as OutputFormatOption)}
                >
                  <option value="original">{isHi ? 'मूल फ़ॉर्मेट रखें' : 'Keep original'}</option>
                  <option value="image/jpeg">JPG</option>
                  <option value="image/png">PNG</option>
                  <option value="application/pdf">PDF</option>
                </select>
              </div>
            </div>

            <div className="compressor-options-row">
              <label className="compressor-checkbox-label">
                <input
                  type="checkbox"
                  checked={exactSize}
                  onChange={(e) => setExactSize(e.target.checked)}
                />
                <span className="body-text">
                  {isHi
                    ? 'आउटपुट को ठीक लक्ष्य बाइट्स के बराबर रखें (Exact size match)'
                    : 'Match exact target bytes'}
                </span>
              </label>

              {parsedTargetBytes !== null && (
                <span className="meta-text tabular-nums" data-testid="compressor-target-bytes">
                  {isHi ? 'लक्ष्य:' : 'Target:'} {formatByteSize(parsedTargetBytes)} (
                  {parsedTargetBytes.toLocaleString()} bytes)
                </span>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="error-card" role="alert">
              <p className="body-text">{errorMsg}</p>
            </div>
          )}

          <div className="info-cta-row">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!sourceFile || !parsedTargetBytes || isCompressing}
            >
              {isCompressing ? (
                <Loader2 size={16} aria-hidden="true" />
              ) : (
                <Minimize2 size={16} aria-hidden="true" />
              )}
              <span>
                {isCompressing
                  ? isHi
                    ? 'कंप्रेस हो रहा है…'
                    : 'Compressing…'
                  : isHi
                    ? 'सटीक साइज में कंप्रेस करें'
                    : 'Compress to target size'}
              </span>
            </button>
          </div>
        </form>
      </section>

      {result && (
        <section className="glass-card" aria-live="polite" aria-label={isHi ? 'कंप्रेस परिणाम' : 'Compression output'}>
          <div className="compressor-result-head">
            <h2 className="section-heading">
              {result.exactMatched
                ? isHi
                  ? 'सटीक साइज तैयार है'
                  : 'Exact target size ready'
                : result.withinTarget
                  ? isHi
                    ? 'लक्ष्य साइज के अंदर तैयार है'
                    : 'Compressed within target limit'
                  : isHi
                    ? 'न्यूनतम संभव साइज'
                    : 'Minimum achievable size'}
            </h2>
            <span className="meta-text tabular-nums" data-testid="compressor-output-match">
              <Check size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
              {result.exactMatched
                ? isHi
                  ? '100% सटीक बाइट मैच'
                  : 'Exact byte match'
                : formatByteSize(result.outputBytes)}
            </span>
          </div>

          <div className="compressor-metrics-grid">
            <div className="compressor-metric-box">
              <span className="meta-text">{isHi ? 'मूल साइज' : 'Original'}</span>
              <strong className="card-heading tabular-nums">{formatByteSize(result.originalBytes)}</strong>
              <span className="meta-text tabular-nums">
                {result.originalBytes.toLocaleString()} bytes
              </span>
            </div>

            <div className="compressor-metric-box">
              <span className="meta-text">{isHi ? 'आवश्यक लक्ष्य' : 'Required target'}</span>
              <strong className="card-heading tabular-nums">{formatByteSize(result.targetBytes)}</strong>
              <span className="meta-text tabular-nums">
                {result.targetBytes.toLocaleString()} bytes
              </span>
            </div>

            <div className="compressor-metric-box">
              <span className="meta-text">{isHi ? 'तैयार आउटपुट' : 'Compressed output'}</span>
              <strong className="card-heading tabular-nums" data-testid="compressor-output-size">
                {formatByteSize(result.outputBytes)}
              </strong>
              <span className="meta-text tabular-nums" data-testid="compressor-output-bytes">
                {result.outputBytes.toLocaleString()} bytes
              </span>
            </div>
          </div>

          {result.note && (
            <p className="body-text" style={{ marginTop: '1rem' }}>
              {result.note}
            </p>
          )}

          {result.previewUrl && (
            <div className="compressor-output-preview">
              <img
                src={result.previewUrl}
                alt={`${result.outputName} compressed preview`}
                className="compressor-output-img"
              />
            </div>
          )}

          <div className="info-cta-row">
            <button type="button" className="btn btn-primary" onClick={handleDownload}>
              <Download size={16} aria-hidden="true" />
              <span>{isHi ? 'कंप्रेस फ़ाइल डाउनलोड करें' : 'Download compressed file'}</span>
            </button>

            {result.outputBytes <= MAX_FILE_SIZE_BYTES && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onScanCompressedFile(result.file)}
              >
                <Sparkles size={16} aria-hidden="true" />
                <span>{isHi ? 'Samajh से स्कैन करें' : 'Scan with Samajh'}</span>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
