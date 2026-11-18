import { useEffect, useRef, useState } from 'react';
import { AppPreloader } from './components/AppPreloader';
import { CapturePreview } from './components/CapturePreview';
import { DisclaimerFooter } from './components/DisclaimerFooter';
import { DocumentCompressor } from './components/DocumentCompressor';
import { HeroLanding } from './components/HeroLanding';
import { InfoPage } from './components/InfoPages';
import { ResultWorkspace } from './components/ResultWorkspace';
import { SiteChromeExtras } from './components/SiteChromeExtras';
import { TopBar } from './components/TopBar';
import { DEMO_ANALYSES } from './data/demoAgreement';
import {
  isKnownRoute,
  normalizePathname,
  SITE_PAGES,
  type AppRoute,
} from './data/sitePages';
import { captureUtmFromUrl } from './lib/utm';
import {
  answerDemoQuestion,
  MAX_FILE_SIZE_BYTES,
  validateDocumentFiles,
} from './lib/documentLogic';
import { inferDocumentMime } from './lib/docCompressor';
import type {
  AskResponse,
  DocumentAnalysis,
  Language,
  QaMessage,
  ThemeMode,
  UploadedPage,
} from './types/document';

type ScreenState = 'landing' | 'preview' | 'result';

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error('Could not read the selected file.'));
        return;
      }
      resolve(result.slice(commaIdx + 1));
    };
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem('samajh_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore storage errors
  }
  return 'dark';
}

function getInitialPath(): string {
  if (typeof window === 'undefined') return '/';
  return normalizePathname(window.location.pathname);
}

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [currentPath, setCurrentPath] = useState<string>(getInitialPath);
  const [screen, setScreen] = useState<ScreenState>('landing');
  const [showPreloader, setShowPreloader] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') !== '1';
  });
  const [searchOpen, setSearchOpen] = useState(false);

  const [pages, setPages] = useState<UploadedPage[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [oversizedUploadFile, setOversizedUploadFile] = useState<File | null>(null);
  const [compressorSeedFile, setCompressorSeedFile] = useState<File | null>(null);

  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [analysisCache, setAnalysisCache] = useState<Partial<Record<Language, DocumentAnalysis>>>({});
  const [isDemo, setIsDemo] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const [qaMessages, setQaMessages] = useState<QaMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const [initialCompletedSteps, setInitialCompletedSteps] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('samajh_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    captureUtmFromUrl();
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      handleLoadSample('en');
    }
    const onPopState = () => {
      const next = normalizePathname(window.location.pathname);
      setCurrentPath(next);
      setScreen('landing');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const meta = isKnownRoute(currentPath) ? SITE_PAGES[currentPath] : null;
    document.title = meta ? meta.title : 'Page Not Found | Samajh';
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) {
      descEl.setAttribute(
        'content',
        meta ? meta.description : 'The requested page could not be found on Samajh.'
      );
    }
    const canonEl = document.querySelector('link[rel="canonical"]');
    if (canonEl && typeof window !== 'undefined') {
      canonEl.setAttribute('href', `${window.location.origin}${currentPath}`);
    }
  }, [currentPath]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.checks-strip, .info-page-stack > .glass-card, .saved-layout > .glass-card, .result-layout .glass-card'
      )
    );
    if (targets.length === 0) return;

    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      for (const el of targets) {
        el.classList.add('is-visible');
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );

    for (const el of targets) {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.94) {
        el.classList.add('scroll-reveal', 'is-visible');
      } else {
        el.classList.add('scroll-reveal');
        observer.observe(el);
      }
    }

    return () => observer.disconnect();
  }, [currentPath, screen, analysis]);

  const revokePageUrls = (list: UploadedPage[]) => {
    for (const p of list) {
      if (p.previewUrl) {
        URL.revokeObjectURL(p.previewUrl);
      }
    }
  };

  const navigateTo = (path: AppRoute) => {
    if (typeof window !== 'undefined' && normalizePathname(window.location.pathname) !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    if (path === '/') {
      setScreen('landing');
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const handleOpenCompressor = (seedFile: File | null = null) => {
    setCompressorSeedFile(seedFile);
    setUploadError(null);
    setOversizedUploadFile(null);
    navigateTo('/compress');
  };

  const handleResetToLanding = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    revokePageUrls(pages);
    setPages([]);
    setAnalysis(null);
    setAnalysisCache({});
    setIsDemo(false);
    setInitialCompletedSteps([]);
    setUploadError(null);
    setAnalyzeError(null);
    setTranslateError(null);
    setQaMessages([]);
    setAskError(null);
    navigateTo('/');
  };

  const handleLoadSample = (langOverride?: Language) => {
    const activeLang = langOverride ?? language;
    revokePageUrls(pages);
    setPages([]);
    setUploadError(null);
    setAnalyzeError(null);
    setTranslateError(null);
    setQaMessages([]);
    setAskError(null);
    setInitialCompletedSteps([]);
    setIsDemo(true);
    setAnalysis(DEMO_ANALYSES[activeLang]);
    setAnalysisCache(DEMO_ANALYSES);
    if (typeof window !== 'undefined' && normalizePathname(window.location.pathname) !== '/') {
      window.history.pushState({}, '', '/');
    }
    setCurrentPath('/');
    setScreen('result');
  };

  const handleStepsChange = (completedSteps: number[]) => {
    setInitialCompletedSteps(completedSteps);
  };

  const processSelectedFiles = async (selected: File[], append = false) => {
    if (selected.length === 0) return;

    const existingCount = append ? pages.length : 0;
    const validation = validateDocumentFiles(
      selected.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      existingCount
    );

    if (!validation.valid) {
      const firstOversized = selected.find(
        (f) => f.size > MAX_FILE_SIZE_BYTES && inferDocumentMime(f.name, f.type) !== null
      );
      setOversizedUploadFile(firstOversized ?? null);
      if (append) {
        setAnalyzeError(validation.errorMessage ?? 'Invalid file selected.');
      } else {
        setUploadError(validation.errorMessage ?? 'Invalid file selected.');
      }
      return;
    }

    setOversizedUploadFile(null);
    setUploadError(null);
    setAnalyzeError(null);

    try {
      const converted: UploadedPage[] = await Promise.all(
        selected.map(async (file, idx) => {
          const base64 = await readFileAsBase64(file);
          const lowerName = file.name.toLowerCase();
          const mimeType =
            file.type === 'image/jpeg' ||
            file.type === 'image/png' ||
            file.type === 'application/pdf'
              ? file.type
              : lowerName.endsWith('.pdf')
                ? 'application/pdf'
                : lowerName.endsWith('.png')
                  ? 'image/png'
                  : 'image/jpeg';
          return {
            id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            mimeType,
            sizeBytes: file.size,
            base64,
            previewUrl: mimeType === 'application/pdf' ? '' : URL.createObjectURL(file),
          };
        })
      );

      if (!append) {
        revokePageUrls(pages);
        setPages(converted);
      } else {
        setPages((prev) => [...prev, ...converted]);
      }
      setIsDemo(false);
      setAnalysis(null);
      setAnalysisCache({});
      setQaMessages([]);
      if (typeof window !== 'undefined' && normalizePathname(window.location.pathname) !== '/') {
        window.history.pushState({}, '', '/');
      }
      setCurrentPath('/');
      setScreen('preview');
    } catch {
      setUploadError('Could not read the selected file. Please try another JPG, PNG, or PDF.');
    }
  };

  const handleFilesSelected = async (fileList: FileList | null, append = false) => {
    if (!fileList || fileList.length === 0) return;
    await processSelectedFiles(Array.from(fileList), append);
  };

  const handleRemovePage = (id: string) => {
    setPages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) {
        setScreen('landing');
      }
      return next;
    });
  };

  const handleAnalyze = async () => {
    if (pages.length === 0 || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setTranslateError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: pages.map((p) => ({ base64: p.base64, mimeType: p.mimeType })),
          language,
        }),
      });

      const payload = (await res.json()) as { analysis?: DocumentAnalysis; error?: string };
      if (!res.ok || !payload.analysis) {
        throw new Error(payload.error || 'Could not analyze this document. Please try again.');
      }

      if (payload.analysis.readable === false) {
        setAnalyzeError(
          payload.analysis.unreadableReason ||
            'The photo looks blurry or too dark to read reliably. Please retake it in clear light.'
        );
        return;
      }

      setAnalysis(payload.analysis);
      setAnalysisCache({ [language]: payload.analysis });
      setInitialCompletedSteps([]);
      setQaMessages([]);
      setScreen('result');
    } catch (err) {
      setAnalyzeError(
        err instanceof Error
          ? err.message
          : 'Could not reach the document reader. Please check your connection and retry.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLanguageChange = async (nextLang: Language) => {
    if (nextLang === language) return;
    setLanguage(nextLang);
    setTranslateError(null);

    if (screen !== 'result' || !analysis) {
      return;
    }

    if (isDemo) {
      setAnalysis(DEMO_ANALYSES[nextLang]);
      if (qaMessages.length > 0) {
        setQaMessages((prev) =>
          prev.map((msg) => {
            const refreshed = answerDemoQuestion(msg.question, nextLang);
            return {
              ...msg,
              answer: refreshed.answer,
              citedClause: refreshed.citedClause,
              notInDocument: refreshed.notInDocument,
            };
          })
        );
      }
      return;
    }

    const cached = analysisCache[nextLang];
    if (cached) {
      setAnalysis(cached);
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          targetLanguage: nextLang,
        }),
      });

      const payload = (await res.json()) as { analysis?: DocumentAnalysis; error?: string };
      if (!res.ok || !payload.analysis) {
        throw new Error(payload.error || 'Could not translate this summary right now.');
      }

      setAnalysis(payload.analysis);
      setAnalysisCache((prev) => ({ ...prev, [nextLang]: payload.analysis }));
    } catch (err) {
      setTranslateError(
        err instanceof Error
          ? err.message
          : 'Could not translate the existing summary. Showing previous text.'
      );
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAskQuestion = async (question: string) => {
    if (!analysis || isAsking) return;
    setAskError(null);

    if (isDemo) {
      const demoReply = answerDemoQuestion(question, language);
      setQaMessages((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          question,
          answer: demoReply.answer,
          citedClause: demoReply.citedClause,
          notInDocument: demoReply.notInDocument,
        },
        ...prev,
      ]);
      return;
    }

    setIsAsking(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          language,
          analysis,
          pages: pages.map((p) => ({ base64: p.base64, mimeType: p.mimeType })),
        }),
      });

      const payload = (await res.json()) as Partial<AskResponse> & { error?: string };
      if (!res.ok || !payload.answer) {
        throw new Error(payload.error || 'Could not answer that question right now.');
      }

      setQaMessages((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          question,
          answer: payload.answer!,
          citedClause: payload.citedClause,
          notInDocument: payload.notInDocument,
        },
        ...prev,
      ]);
    } catch (err) {
      setAskError(
        err instanceof Error ? err.message : 'Could not check the document right now. Please try again.'
      );
    } finally {
      setIsAsking(false);
    }
  };

  const isSubPage =
    currentPath === '/services' ||
    currentPath === '/compress' ||
    currentPath === '/about' ||
    currentPath === '/contact' ||
    currentPath === '/faq' ||
    currentPath === '/privacy-policy' ||
    currentPath === '/terms';
  const isNotFound = !isKnownRoute(currentPath);

  return (
    <div className="samajh-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <div className="samajh-backdrop" aria-hidden="true">
        <div className="glow-orb-teal" />
        <div className="glow-orb-gold" />
      </div>

      <div className="swiss-grid-overlay" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div key={idx} className="swiss-grid-col-guide" />
        ))}
      </div>

      {showPreloader && (
        <AppPreloader
          language={language}
          onComplete={() => setShowPreloader(false)}
        />
      )}

      <TopBar
        language={language}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        currentPath={currentPath}
        showHeaderLang={isNotFound || isSubPage || screen !== 'landing'}
        onNavigate={navigateTo}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <main id="main-content" className="main-section" tabIndex={-1}>
        {isNotFound && <InfoPage route={null} onNavigate={navigateTo} />}

        {!isNotFound && currentPath === '/compress' && (
          <DocumentCompressor
            language={language}
            initialFile={compressorSeedFile}
            onScanCompressedFile={(file) => void processSelectedFiles([file], false)}
          />
        )}

        {!isNotFound && isSubPage && currentPath !== '/compress' && (
          <InfoPage route={currentPath as AppRoute} onNavigate={navigateTo} />
        )}

        {!isNotFound && !isSubPage && screen === 'landing' && (
          <HeroLanding
            language={language}
            onLanguageChange={handleLanguageChange}
            fileInputRef={fileInputRef}
            onFilesSelected={(files) => handleFilesSelected(files, false)}
            onLoadSample={() => handleLoadSample()}
            onOpenCompressor={handleOpenCompressor}
            oversizedFile={oversizedUploadFile}
            uploadError={uploadError}
          />
        )}

        {!isNotFound && !isSubPage && screen === 'preview' && (
          <CapturePreview
            language={language}
            pages={pages}
            isAnalyzing={isAnalyzing}
            errorMessage={analyzeError}
            fileInputRef={fileInputRef}
            onAddMoreFiles={(files) => handleFilesSelected(files, true)}
            onRemovePage={handleRemovePage}
            onAnalyze={handleAnalyze}
            onReset={handleResetToLanding}
          />
        )}

        {!isNotFound && !isSubPage && screen === 'result' && analysis && (
          <ResultWorkspace
            analysis={analysis}
            language={language}
            pages={pages}
            isDemo={isDemo}
            isTranslating={isTranslating}
            translateError={translateError}
            qaMessages={qaMessages}
            isAsking={isAsking}
            askError={askError}
            onAskQuestion={handleAskQuestion}
            initialCompletedSteps={initialCompletedSteps}
            onStepsChange={handleStepsChange}
          />
        )}
      </main>

      <DisclaimerFooter language={language} onNavigate={navigateTo} />

      <SiteChromeExtras
        onNavigate={navigateTo}
        searchOpen={searchOpen}
        onCloseSearch={() => setSearchOpen(false)}
      />
    </div>
  );
}
