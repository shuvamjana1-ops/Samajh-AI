export type AppRoute =
  | '/'
  | '/services'
  | '/about'
  | '/contact'
  | '/faq'
  | '/privacy-policy'
  | '/terms'
  | '/sign-in'
  | '/saved';

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface SitePageMeta {
  path: AppRoute;
  navLabel: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  lastUpdated?: string;
  indexable: boolean;
  sections: Array<{ heading: string; body: string }>;
}

export const SITE_BRAND = 'Samajh';
export const LEGAL_LAST_UPDATED = 'November 17, 2026';

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: 'What documents can Samajh explain?',
    answer:
      'Upload JPG, PNG, or PDF files such as rental agreements, loan notices, bank letters, or medical reports up to 8 MB and 5 pages.',
  },
  {
    question: 'Are my uploaded photos or PDFs stored on a server?',
    answer:
      'No. Images and PDFs are processed in memory only. If you sign in with Google and choose Save summary, only plain-text summaries are stored.',
  },
  {
    question: 'Which languages are supported?',
    answer:
      'Samajh explains documents in plain English and Hindi, and reads summaries aloud using your browser speech synthesis.',
  },
  {
    question: 'Is Samajh a substitute for a lawyer, accountant, or doctor?',
    answer:
      'No. Samajh translates dense wording into plain language so you can prepare informed questions for a qualified professional.',
  },
  {
    question: 'How do I delete my saved summaries?',
    answer:
      'Open Saved scans from the header while signed in and use the Delete action on any summary to remove it immediately.',
  },
];

export const SITE_PAGES: Record<AppRoute, SitePageMeta> = {
  '/': {
    path: '/',
    navLabel: 'Home',
    title: 'Samajh: Plain-Language Paperwork Assistant',
    description:
      'Understand rental agreements, loan papers, notices, and reports in plain English or Hindi with spoken audio and risk flags.',
    h1: 'Paperwork, explained.',
    lead: 'Plain English and Hindi explanations for rental agreements, loan papers, and official notices.',
    indexable: true,
    sections: [
      {
        heading: 'Deadlines',
        body: 'Exact due dates, lock-in periods, and what happens if you miss one.',
      },
      {
        heading: 'Money',
        body: 'Rent, deposits, penalties, interest, and hidden deductions.',
      },
      {
        heading: 'Risks and next steps',
        body: 'One-sided clauses marked clearly, with practical steps before you act.',
      },
    ],
  },
  '/services': {
    path: '/services',
    navLabel: 'Services',
    title: 'Document Services & Checks | Samajh',
    description:
      'Explore how Samajh extracts deadlines, fees, risky clauses, voice playback, and follow-up answers from official documents.',
    h1: 'Plain-language document checks in one place.',
    lead: 'Upload up to five pages in JPG, PNG, or PDF format to extract structured dates, fees, risks, and action checklists.',
    indexable: true,
    sections: [
      {
        heading: 'Clause and risk breakdown',
        body: 'Every flagged term cites the original clause reference and marks high, medium, or low severity.',
      },
      {
        heading: 'Bilingual translation and audio',
        body: 'Switch between English and Hindi explanations at any time and listen using built-in browser voice playback.',
      },
      {
        heading: 'Grounded follow-up questions',
        body: 'Type or speak questions answered strictly from your uploaded pages, with clear notice when details are missing.',
      },
    ],
  },
  '/about': {
    path: '/about',
    navLabel: 'About',
    title: 'About Samajh | Clear Paperwork Help',
    description:
      'Learn how Samajh helps readers review everyday agreements and notices clearly without storing raw document files.',
    h1: 'Built to make everyday paperwork readable.',
    lead: 'Official agreements use dense legal and financial wording. Samajh turns confusing pages into clear facts before you sign.',
    indexable: true,
    sections: [
      {
        heading: 'Privacy by default',
        body: 'Raw images and PDFs are processed transiently in memory and discarded after your session.',
      },
      {
        heading: 'Optional cloud library',
        body: 'Sign in with Google only if you want to keep plain-text summaries and checklist progress across devices.',
      },
      {
        heading: 'Honest boundaries',
        body: 'Samajh explains written terms plainly. It does not replace legal, financial, or medical counsel.',
      },
    ],
  },
  '/contact': {
    path: '/contact',
    navLabel: 'Contact',
    title: 'Contact Samajh | Support & Feedback',
    description:
      'Send questions, bug reports, or accessibility feedback to the Samajh team using our protected contact form.',
    h1: 'Contact Samajh.',
    lead: 'Send a question or accessibility report below. Direct phone, email, and office address will appear once published by the owner.',
    indexable: true,
    sections: [
      {
        heading: 'Response and privacy',
        body: 'Please do not include sensitive financial, legal, or medical files in support messages.',
      },
    ],
  },
  '/faq': {
    path: '/faq',
    navLabel: 'FAQ',
    title: 'Frequently Asked Questions | Samajh',
    description:
      'Answers on supported document formats, privacy, English and Hindi explanations, voice playback, and saved summaries.',
    h1: 'Frequently asked questions.',
    lead: 'Clear answers about how Samajh reads documents, protects uploaded files, and handles saved accounts.',
    indexable: true,
    sections: FAQ_ENTRIES.map((item) => ({
      heading: item.question,
      body: item.answer,
    })),
  },
  '/privacy-policy': {
    path: '/privacy-policy',
    navLabel: 'Privacy Policy',
    title: 'Privacy Policy | Samajh',
    description:
      'Read how Samajh handles uploaded files, Google Sign-In profiles, saved plain-text summaries, and cookie consent choices.',
    h1: 'Privacy Policy',
    lead: 'Review with a lawyer before launch. This summary explains what data Samajh processes and stores.',
    lastUpdated: LEGAL_LAST_UPDATED,
    indexable: true,
    sections: [
      {
        heading: 'Uploaded documents',
        body: 'Uploaded JPG, PNG, and PDF files are validated, stripped of image EXIF metadata, processed in memory, and never saved to disk or database.',
      },
      {
        heading: 'Google Sign-In and saved summaries',
        body: 'When you sign in with Google, your name, email, and saved plain-text summaries are stored in Cloud Firestore solely under your account UID.',
      },
      {
        heading: 'Cookies and local preferences',
        body: 'Samajh stores your theme and cookie consent choice in browser localStorage. No third-party advertising trackers are loaded.',
      },
    ],
  },
  '/terms': {
    path: '/terms',
    navLabel: 'Terms and Conditions',
    title: 'Terms and Conditions | Samajh',
    description:
      'Review Samajh terms of use, acceptable document upload rules, and plain-language informational disclaimers.',
    h1: 'Terms and Conditions',
    lead: 'Review with a lawyer before launch. By using Samajh, you agree to the informational terms below.',
    lastUpdated: LEGAL_LAST_UPDATED,
    indexable: true,
    sections: [
      {
        heading: 'Informational use only',
        body: 'Samajh summarizes documents for readability. It does not provide legal, financial, tax, or medical advice.',
      },
      {
        heading: 'Acceptable uploads',
        body: 'Only upload documents you are authorized to read, up to 8 MB per file and 5 pages per scan.',
      },
      {
        heading: 'Account control',
        body: 'You may delete saved summaries from your account at any time. Service availability is provided as is.',
      },
    ],
  },
  '/sign-in': {
    path: '/sign-in',
    navLabel: 'Sign In',
    title: 'Sign In | Samajh',
    description:
      'Sign in with Google to save plain-language document summaries and action checklists across sessions.',
    h1: 'Sign in to save your plain-language summaries',
    lead: 'Keep document explanations and action checklists synced in your private cloud library.',
    indexable: false,
    sections: [],
  },
  '/saved': {
    path: '/saved',
    navLabel: 'Saved Scans',
    title: 'Saved Summaries | Samajh',
    description:
      'View, reopen, or delete plain-text document summaries saved to your Google account.',
    h1: 'Saved document summaries',
    lead: 'Only you can view or delete these plain-text explanations.',
    indexable: false,
    sections: [],
  },
};

export const INDEXABLE_ROUTES: AppRoute[] = [
  '/',
  '/services',
  '/about',
  '/contact',
  '/faq',
  '/privacy-policy',
  '/terms',
];

export const HEADER_NAV_ROUTES: AppRoute[] = ['/services', '/about', '/faq', '/contact'];

export function isKnownRoute(pathname: string): pathname is AppRoute {
  return Object.prototype.hasOwnProperty.call(SITE_PAGES, pathname);
}

export function normalizePathname(rawPath: string): string {
  if (!rawPath || rawPath === '/') return '/';
  const cleaned = rawPath.replace(/\/+$/, '');
  return cleaned || '/';
}

export function buildStructuredData(route: AppRoute, origin: string) {
  const page = SITE_PAGES[route];
  const canonicalUrl = `${origin}${route === '/' ? '' : route}`;
  const schemas: Array<Record<string, unknown>> = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_BRAND,
      url: origin,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_BRAND,
      url: origin,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement:
        route === '/'
          ? [{ '@type': 'ListItem', position: 1, name: 'Home', item: origin }]
          : [
              { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
              { '@type': 'ListItem', position: 2, name: page.navLabel, item: canonicalUrl },
            ],
    },
  ];

  if (route === '/faq') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ENTRIES.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
  }

  return schemas;
}
