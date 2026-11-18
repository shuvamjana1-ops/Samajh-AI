import type { DocumentAnalysis, Language } from '../types/document';

export const DEMO_ANALYSES: Record<Language, DocumentAnalysis> = {
  en: {
    readable: true,
    type: 'Residential Rental Agreement (11 months)',
    summary:
      'This is an 11-month house rental agreement with monthly rent of Rs 30,000 and a refundable deposit of Rs 1,80,000. You must stay for at least 6 months, and if you leave early or without 2 months notice, you lose 2 months of rent. The landlord can ask you to leave with only 15 days notice, which is unfair to you. At the end of the stay, the landlord can cut money from your deposit for painting and repairs without showing bills or fixed limits.',
    deadlines: [
      {
        when: '5th of every month',
        what: 'Pay monthly rent of Rs 30,000',
        note: 'After the 7th, a late fee of Rs 500 per day starts.',
      },
      {
        when: 'First 6 months',
        what: 'Minimum lock-in stay period',
        note: 'If you move out before 6 months, you still owe rent for the remaining lock-in months.',
      },
      {
        when: '60 days before moving out',
        what: 'Written notice from tenant',
        note: 'Must be sent in writing, otherwise 2 months rent is cut from your deposit.',
      },
      {
        when: '15 days notice',
        what: 'Landlord can end the agreement',
        note: 'Clause 9 lets the landlord ask you to vacate in 15 days without giving a reason.',
      },
      {
        when: '31 October 2027',
        what: '11-month lease ends',
        note: 'Renewal requires a 10% rent hike unless you agree in writing to change it.',
      },
    ],
    money: [
      {
        label: 'Monthly rent',
        amount: 'Rs 30,000',
        note: 'Paid every month by bank transfer before the 5th.',
      },
      {
        label: 'Security deposit',
        amount: 'Rs 1,80,000',
        note: 'Equal to 6 months rent. Held interest-free until you move out.',
      },
      {
        label: 'Late payment fee',
        amount: 'Rs 500 / day',
        note: 'Charged from the 8th of the month with no upper limit written.',
      },
      {
        label: 'Renewal increase',
        amount: '+10% (Rs 33,000)',
        note: 'Automatic rent increase if you renew after 11 months.',
      },
    ],
    risks: [
      {
        sev: 'high',
        clause: 'Clause 9 · Termination Notice',
        text: 'One-sided exit rule: the landlord can end the lease with just 15 days notice, while you must stay 6 months and give 60 days notice.',
      },
      {
        sev: 'high',
        clause: 'Clause 12 · Deposit Deductions',
        text: 'Vague deduction rule: the landlord can deduct painting, cleaning, and repair costs from your Rs 1,80,000 deposit "at their sole discretion" without sharing receipts or a fixed rate.',
      },
      {
        sev: 'medium',
        clause: 'Clause 6 · Late Rent Penalty',
        text: 'Rs 500 per day late fee has no maximum cap. A 10-day delay adds Rs 5,000.',
      },
      {
        sev: 'low',
        clause: 'Clause 14 · Renewal Terms',
        text: 'Rent goes up by 10% after 11 months, which is slightly above the usual 5% to 8% increase.',
      },
    ],
    steps: [
      'Ask to make Clause 9 equal so both you and the landlord must give 60 days notice.',
      'Ask to rewrite Clause 12 so deposit deductions only happen against actual bills, and normal wear and tear is not charged.',
      'Take timestamped photos and a short video of every wall, tap, and appliance on move-in day.',
      'Check if the Rs 1,80,000 deposit can be reduced to 2 or 3 months rent before signing.',
      'Pay rent and deposit only by bank transfer or UPI so you have clear proof of every rupee.',
    ],
  },
  hi: {
    readable: true,
    type: 'मकान किराया समझौता (11 महीने)',
    summary:
      'यह 11 महीने का मकान किराया समझौता है जिसमें हर महीने 30,000 रुपये किराया और 1,80,000 रुपये जमा राशि (डिपॉजिट) तय है। आपको कम से कम 6 महीने रहना होगा, और 2 महीने पहले लिखित सूचना दिए बिना छोड़ने पर 2 महीने का किराया काटा जाएगा। मकान मालिक आपको सिर्फ 15 दिन के नोटिस पर घर खाली करने को कह सकता है, जो आपके पक्ष में नहीं है। घर छोड़ते समय मकान मालिक बिना पक्का बिल दिखाए पेंटिंग और मरम्मत के नाम पर डिपॉजिट से पैसे काट सकता है।',
    deadlines: [
      {
        when: 'हर महीने की 5 तारीख',
        what: '30,000 रुपये मासिक किराया देना',
        note: '7 तारीख के बाद हर दिन 500 रुपये लेट फीस लगेगी।',
      },
      {
        when: 'शुरुआती 6 महीने',
        what: 'न्यूनतम लॉक-इन अवधि',
        note: '6 महीने से पहले घर छोड़ने पर बचे हुए महीनों का किराया देना होगा।',
      },
      {
        when: 'घर छोड़ने से 60 दिन पहले',
        what: 'किरायेदार द्वारा लिखित नोटिस',
        note: 'लिखित सूचना न देने पर डिपॉजिट से 2 महीने का किराया कट जाएगा।',
      },
      {
        when: '15 दिन का नोटिस',
        what: 'मकान मालिक समझौता खत्म कर सकता है',
        note: 'क्लॉज 9 मकान मालिक को बिना कारण बताए 15 दिन में घर खाली कराने का हक देता है।',
      },
      {
        when: '31 अक्टूबर 2027',
        what: '11 महीने की अवधि समाप्त',
        note: 'आगे बढ़ाने पर किराया 10% बढ़ जाएगा, जब तक लिखित बदलाव न हो।',
      },
    ],
    money: [
      {
        label: 'मासिक किराया',
        amount: '30,000 रुपये',
        note: 'हर महीने की 5 तारीख से पहले बैंक ट्रांसफर से देना होगा।',
      },
      {
        label: 'सिक्योरिटी डिपॉजिट',
        amount: '1,80,000 रुपये',
        note: '6 महीने के किराए के बराबर। घर छोड़ने पर बिना ब्याज वापस होगा।',
      },
      {
        label: 'देरी से किराया जुर्माना',
        amount: '500 रुपये / दिन',
        note: 'महीने की 8 तारीख से लागू, इसकी कोई अधिकतम सीमा नहीं लिखी है।',
      },
      {
        label: 'नवीनीकरण पर बढ़ोतरी',
        amount: '+10% (33,000 रुपये)',
        note: '11 महीने बाद समझौता आगे बढ़ाने पर किराया अपने-आप 10% बढ़ेगा।',
      },
    ],
    risks: [
      {
        sev: 'high',
        clause: 'क्लॉज 9 · समझौता समाप्ति नोटिस',
        text: 'एकतरफा नियम: मकान मालिक सिर्फ 15 दिन का नोटिस देकर समझौता खत्म कर सकता है, जबकि आपके लिए 6 महीने का लॉक-इन और 60 दिन का नोटिस जरूरी है।',
      },
      {
        sev: 'high',
        clause: 'क्लॉज 12 · डिपॉजिट कटौती',
        text: 'अस्पष्ट कटौती नियम: मकान मालिक बिना रसीद दिखाए अपनी मर्जी से आपके 1,80,000 रुपये डिपॉजिट से पेंटिंग और मरम्मत के पैसे काट सकता है।',
      },
      {
        sev: 'medium',
        clause: 'क्लॉज 6 · लेट किराया जुर्माना',
        text: '500 रुपये प्रतिदिन की लेट फीस की कोई ऊपरी सीमा नहीं है। 10 दिन की देरी पर 5,000 रुपये जुड़ जाएंगे।',
      },
      {
        sev: 'low',
        clause: 'क्लॉज 14 · नवीनीकरण शर्तें',
        text: '11 महीने बाद 10% किराया बढ़ोतरी तय है, जो सामान्य 5% से 8% बढ़ोतरी से थोड़ी ज्यादा है।',
      },
    ],
    steps: [
      'क्लॉज 9 को बराबरी का बनाने की बात करें ताकि दोनों तरफ से 60 दिन का नोटिस जरूरी हो।',
      'क्लॉज 12 में बदलाव कराएं कि डिपॉजिट से कटौती सिर्फ असली बिल दिखाने पर ही हो और सामान्य घिसाई न जोड़ी जाए।',
      'शिफ्ट होने के दिन हर दीवार, नल और सामान की तारीख वाली फोटो और छोटा वीडियो बना लें।',
      'दस्तखत करने से पहले पूछें कि क्या 1,80,000 रुपये डिपॉजिट को 2 या 3 महीने के किराए जितना कम किया जा सकता है।',
      'किराया और डिपॉजिट हमेशा बैंक ट्रांसफर या UPI से दें ताकि हर रुपये का पक्का सबूत रहे।',
    ],
  },
};

export interface UiCopy {
  brand: string;
  heroTitle: string;
  heroTitleHighlights: string[];
  heroSubtitle: string;
  heroSubtitleHighlights: string[];
  scanButton: string;
  sampleButton: string;
  fileHint: string;
  fileHintHighlights: string[];
  whatChecksHeading: string;
  checksList: Array<{ title: string; detail: string }>;
  previewHeading: string;
  previewHeadingHighlights: string[];
  previewSubtitle: string;
  analyzeButton: string;
  retakeButton: string;
  addMorePages: string;
  analyzingTitle: string;
  analyzingSubtitle: string;
  translatingNotice: string;
  newScan: string;
  summaryHeading: string;
  summaryHeadingHighlights: string[];
  listenPlay: string;
  listenStop: string;
  listenUnsupported: string;
  tabs: {
    deadlines: string;
    money: string;
    risks: string;
    steps: string;
  };
  severityLabels: {
    high: string;
    medium: string;
    low: string;
  };
  copyChecklist: string;
  copiedChecklist: string;
  stepsProgress: string;
  askHeading: string;
  askPlaceholder: string;
  askSend: string;
  askListening: string;
  askMicLabel: string;
  askMicStop: string;
  askUnsupportedMic: string;
  askThinking: string;
  askSuggestions: string[];
  notInDocumentBadge: string;
  citedLabel: string;
  emptyItems: string;
  disclaimer: string;
  sessionNote: string;
  sampleBadge: string;
  themeDark: string;
  themeLight: string;
  errorTitle: string;
  errorRetry: string;
  documentPagesHeading: string;
  pageLabel: string;
  ofLabel: string;
  prevPage: string;
  nextPage: string;
  signIn: string;
  signOut: string;
  savedScans: string;
  saveToAccount: string;
  savingToAccount: string;
  savedToAccount: string;
  signInToSave: string;
  authTitle: string;
  authTitleHighlights: string[];
  authSubtitle: string;
  authPoints: string[];
  authGoogleButton: string;
  authSigningIn: string;
  authContinueGuest: string;
  authFreeTierNote: string;
  savedTitle: string;
  savedTitleHighlights: string[];
  savedSubtitle: string;
  savedEmpty: string;
  savedOpen: string;
  savedDelete: string;
  accountSignedInAs: string;
  scanAnother: string;
}

export const UI_COPY: Record<Language, UiCopy> = {
  en: {
    brand: 'Samajh',
    heroTitle: 'Paperwork, explained.',
    heroTitleHighlights: ['explained.'],
    heroSubtitle:
      'Plain English and Hindi explanations for rental agreements, loan papers, and official notices.',
    heroSubtitleHighlights: ['Plain English and Hindi'],
    scanButton: 'Scan a document',
    sampleButton: 'Open sample agreement',
    fileHint: 'Photograph or upload a JPG, PNG, or PDF up to 8 MB and 5 pages. Raw files are never stored.',
    fileHintHighlights: ['8 MB and 5 pages', 'never stored'],
    whatChecksHeading: 'Scan',
    checksList: [
      {
        title: 'Deadlines',
        detail: 'Exact due dates, lock-in periods, and what happens if you miss one.',
      },
      {
        title: 'Money',
        detail: 'Rent, deposits, penalties, interest, and hidden deductions.',
      },
      {
        title: 'Risks & next steps',
        detail: 'One-sided clauses marked clearly, with practical steps before you act.',
      },
    ],
    previewHeading: 'Check your document before reading',
    previewHeadingHighlights: ['reading'],
    previewSubtitle: 'Make sure the text looks sharp and well lit. You can add up to 5 pages.',
    analyzeButton: 'Explain this document',
    retakeButton: 'Choose another file',
    addMorePages: 'Add another page',
    analyzingTitle: 'Reading your document carefully…',
    analyzingSubtitle: 'Pulling out dates, amounts, and risky clauses in plain language.',
    translatingNotice: 'Translating explanation…',
    newScan: 'New scan',
    summaryHeading: 'Plain-language summary',
    summaryHeadingHighlights: ['Plain-language'],
    listenPlay: 'Listen',
    listenStop: 'Stop reading',
    listenUnsupported: 'Voice playback is not available in this browser, so please read the summary above.',
    tabs: {
      deadlines: 'Deadlines',
      money: 'Money',
      risks: 'Risks',
      steps: 'Next steps',
    },
    severityLabels: {
      high: 'High risk',
      medium: 'Medium risk',
      low: 'Low risk',
    },
    copyChecklist: 'Copy checklist',
    copiedChecklist: 'Checklist copied',
    stepsProgress: 'done',
    askHeading: 'Ask a question about this paper',
    askPlaceholder: 'Ask about a fee, deposit, date, or clause…',
    askSend: 'Ask',
    askListening: 'Listening… tap mic to stop',
    askMicLabel: 'Speak your question',
    askMicStop: 'Stop microphone',
    askUnsupportedMic: 'Voice input is not supported in this browser. Type your question instead.',
    askThinking: 'Checking the document…',
    askSuggestions: [
      'Can I get my full deposit back?',
      'What happens if I pay rent late?',
      'Does it mention parking or pets?',
    ],
    notInDocumentBadge: 'Not mentioned in document',
    citedLabel: 'Based on',
    emptyItems: 'None found in this document.',
    disclaimer: "Samajh explains documents. It isn't legal advice.",
    sessionNote: 'Images are processed in memory and never stored.',
    sampleBadge: 'Sample rental agreement',
    themeDark: 'Dark theme',
    themeLight: 'Light theme',
    errorTitle: 'Could not read that clearly',
    errorRetry: 'Retake or upload clearer file',
    documentPagesHeading: 'Uploaded pages',
    pageLabel: 'Page',
    ofLabel: 'of',
    prevPage: 'Previous',
    nextPage: 'Next',
    signIn: 'Sign in',
    signOut: 'Sign out',
    savedScans: 'Saved scans',
    saveToAccount: 'Save summary',
    savingToAccount: 'Saving…',
    savedToAccount: 'Saved to account',
    signInToSave: 'Sign in to save',
    authTitle: 'Sign in to save your plain-language summaries',
    authTitleHighlights: ['plain-language summaries'],
    authSubtitle:
      'Keep your document explanations, deadlines, and action checklists synced securely in your private cloud library.',
    authPoints: [
      'Google Sign-In only, with no extra passwords to remember.',
      'Photos and PDFs are never saved; only plain-language text summaries are stored.',
      'Syncs your English or Hindi preference and checklist progress.',
    ],
    authGoogleButton: 'Continue with Google',
    authSigningIn: 'Signing in with Google…',
    authContinueGuest: 'Continue without signing in',
    authFreeTierNote: 'Free-tier Firebase Auth & Cloud Firestore · Delete your data anytime',
    savedTitle: 'Saved document summaries',
    savedTitleHighlights: ['Saved'],
    savedSubtitle: 'Only you can view or delete these plain-text explanations.',
    savedEmpty: 'No saved summaries yet. Scan a paper or open a sample, then tap Save summary.',
    savedOpen: 'Open summary',
    savedDelete: 'Delete',
    accountSignedInAs: 'Signed in as',
    scanAnother: 'Scan a document',
  },
  hi: {
    brand: 'Samajh',
    heroTitle: 'कागज़ात, आसान भाषा में।',
    heroTitleHighlights: ['आसान भाषा में।'],
    heroSubtitle:
      'किराया समझौते, लोन के कागज़ और सरकारी नोटिस को सरल हिन्दी और अंग्रेज़ी में समझें।',
    heroSubtitleHighlights: ['सरल हिन्दी और अंग्रेज़ी'],
    scanButton: 'दस्तावेज़ स्कैन करें',
    sampleButton: 'नमूना समझौता खोलें',
    fileHint: 'JPG, PNG या PDF फोटो अपलोड करें (8 MB और 5 पेज तक)। मूल फ़ाइलें कभी सेव नहीं होतीं।',
    fileHintHighlights: ['8 MB और 5 पेज तक', 'कभी सेव नहीं होतीं'],
    whatChecksHeading: 'स्कैन करें',
    checksList: [
      {
        title: 'तारीखें और समय सीमा',
        detail: 'किस्त, किराया, लॉक-इन समय और देरी होने पर क्या होगा।',
      },
      {
        title: 'पैसे और फीस',
        detail: 'किराया, डिपॉजिट, जुर्माना, ब्याज और छिपी कटौती।',
      },
      {
        title: 'जोखिम और अगले कदम',
        detail: 'एकतरफा शर्तों की चेतावनी और आगे करने के आसान कदम।',
      },
    ],
    previewHeading: 'पढ़ने से पहले फोटो जांच लें',
    previewHeadingHighlights: ['फोटो जांच लें'],
    previewSubtitle: 'सुनिश्चित करें कि अक्षर साफ दिख रहे हैं। आप 5 पेज तक जोड़ सकते हैं।',
    analyzeButton: 'इस दस्तावेज़ को समझाएं',
    retakeButton: 'दूसरी फ़ाइल चुनें',
    addMorePages: 'एक और पेज जोड़ें',
    analyzingTitle: 'आपका दस्तावेज़ ध्यान से पढ़ा जा रहा है…',
    analyzingSubtitle: 'आसान शब्दों में तारीखें, रकम और जोखिम भरी शर्तें निकाली जा रही हैं।',
    translatingNotice: 'अनुवाद किया जा रहा है…',
    newScan: 'नया स्कैन',
    summaryHeading: 'आसान भाषा में सारांश',
    summaryHeadingHighlights: ['आसान भाषा'],
    listenPlay: 'सुनें',
    listenStop: 'पढ़ना रोकें',
    listenUnsupported: 'इस ब्राउज़र में आवाज़ की सुविधा उपलब्ध नहीं है, कृपया ऊपर लिखा सारांश पढ़ें।',
    tabs: {
      deadlines: 'तारीखें',
      money: 'पैसे',
      risks: 'जोखिम',
      steps: 'अगले कदम',
    },
    severityLabels: {
      high: 'बड़ा जोखिम',
      medium: 'मध्यम जोखिम',
      low: 'कम जोखिम',
    },
    copyChecklist: 'सूची कॉपी करें',
    copiedChecklist: 'सूची कॉपी हो गई',
    stepsProgress: 'पूरे हुए',
    askHeading: 'इस कागज़ के बारे में सवाल पूछें',
    askPlaceholder: 'फीस, डिपॉजिट, तारीख या शर्त के बारे में पूछें…',
    askSend: 'पूछें',
    askListening: 'सुन रहे हैं… रोकने के लिए माइक दबाएं',
    askMicLabel: 'बोलकर सवाल पूछें',
    askMicStop: 'माइक बंद करें',
    askUnsupportedMic: 'इस ब्राउज़र में बोलकर पूछने की सुविधा नहीं है। कृपया टाइप करके पूछें।',
    askThinking: 'दस्तावेज़ जांचा जा रहा है…',
    askSuggestions: [
      'क्या मुझे पूरा डिपॉजिट वापस मिलेगा?',
      'किराया देर से देने पर क्या होगा?',
      'क्या इसमें पार्किंग या पालतू जानवर का जिक्र है?',
    ],
    notInDocumentBadge: 'दस्तावेज़ में नहीं लिखा है',
    citedLabel: 'आधार',
    emptyItems: 'इस दस्तावेज़ में ऐसी कोई जानकारी नहीं मिली।',
    disclaimer: 'Samajh केवल दस्तावेज़ समझाता है। यह कानूनी सलाह नहीं है।',
    sessionNote: 'तस्वीरें केवल अस्थायी रूप से पढ़ी जाती हैं और कभी सेव नहीं होतीं।',
    sampleBadge: 'नमूना किराया समझौता',
    themeDark: 'डार्क थीम',
    themeLight: 'लाइट थीम',
    errorTitle: 'दस्तावेज़ साफ पढ़ा नहीं जा सका',
    errorRetry: 'दोबारा साफ फोटो या फ़ाइल चुनें',
    documentPagesHeading: 'अपलोड किए गए पेज',
    pageLabel: 'पेज',
    ofLabel: 'में से',
    prevPage: 'पिछला',
    nextPage: 'अगला',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    savedScans: 'सेव किए गए',
    saveToAccount: 'सारांश सेव करें',
    savingToAccount: 'सेव हो रहा है…',
    savedToAccount: 'अकाउंट में सेव है',
    signInToSave: 'सेव करने के लिए साइन इन करें',
    authTitle: 'आसान भाषा के सारांश सेव करने के लिए साइन इन करें',
    authTitleHighlights: ['आसान भाषा के सारांश'],
    authSubtitle:
      'अपने दस्तावेज़ के मुख्य बिंदु, तारीखें और अगले कदमों की सूची अपने निजी क्लाउड अकाउंट में सुरक्षित रखें।',
    authPoints: [
      'केवल Google से तेज़ साइन इन, कोई नया पासवर्ड बनाने की जरूरत नहीं।',
      'फोटो या PDF कभी सेव नहीं होते; केवल लिखा हुआ सारांश सुरक्षित रहता है।',
      'आपकी भाषा (हिन्दी/English) और चेकलिस्ट प्रगति हमेशा सिंक रहती है।',
    ],
    authGoogleButton: 'Google से जारी रखें',
    authSigningIn: 'Google से साइन इन हो रहा है…',
    authContinueGuest: 'बिना साइन इन किए जारी रखें',
    authFreeTierNote: 'निःशुल्क Firebase Auth और Cloud Firestore · कभी भी डेटा हटाएं',
    savedTitle: 'सेव किए गए सारांश',
    savedTitleHighlights: ['सेव किए गए'],
    savedSubtitle: 'केवल आप ही इन सेव किए गए सारांशों को देख या हटा सकते हैं।',
    savedEmpty: 'अभी कोई सारांश सेव नहीं है। कोई कागज़ स्कैन करें और सारांश सेव करें दबाएं।',
    savedOpen: 'सारांश खोलें',
    savedDelete: 'हटाएं',
    accountSignedInAs: 'लॉगिन अकाउंट',
    scanAnother: 'दस्तावेज़ स्कैन करें',
  },
};
