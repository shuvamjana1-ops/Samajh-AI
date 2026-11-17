# PRD: Samajh – Voice-First Paperwork Assistant

*Hackathon edition · Version 1.0 · Draft*

## 1. Overview

**Samajh** is a mobile-first web app that helps people understand confusing official documents (rental agreements, loan papers, government notices, medical reports) in their own language. A user snaps a photo or asks a question by voice, and Samajh explains the document in plain words, flags deadlines, fees and risky clauses, and gives a clear checklist of what to do next.

**One-line pitch:** Snap it. Hear it in your language. Know what to do.

## 2. Problem Statement

Millions of people receive documents written in dense legal, financial or bureaucratic language, often in English or formal Hindi they do not fully read. As a result they:

- Sign agreements without understanding fees, penalties or lock-in terms.
- Miss deadlines on notices, which leads to fines or lost benefits.
- Depend on agents or middlemen who may charge for help or mislead them.
- Skip medical or tax paperwork out of confusion or fear.

Professional help (lawyers, CAs) is expensive and not always accessible. Generic chatbots need typed prompts in English and give no structured next steps.

## 3. Goals and Non-Goals

### Goals

1. Let a user get a plain-language explanation of a document in under 30 seconds.
2. Support voice input and voice output so low-literacy and low-typing users can use it.
3. Surface the three things that matter most: deadlines, money, and risks.
4. Provide a concrete, ordered action checklist.
5. Support at least three languages in the demo (English, Hindi, Bengali).

### Non-Goals (for the hackathon)

- Providing legal, medical or financial advice. Samajh explains; it does not advise.
- User accounts, payments or document storage.
- Supporting every document type. The MVP focuses on one (rental agreement), with others working in a best-effort mode.
- Offline mode and native apps.

## 4. Target Users and Personas

| Persona | Description | Key need |
| --- | --- | --- |
| **Riya, 24, first-time renter** | Moving cities for work, has to sign a rental agreement | Know deposit, lock-in and exit penalties before signing |
| **Mr. Das, 62, retiree** | Receives tax and bank notices, more comfortable in Bengali | Understand what a notice demands and by when |
| **Sunita, 35, small shop owner** | Reads little English, gets loan and supplier contracts | Voice explanation and hidden-fee warnings |

**Primary persona for the demo:** Riya (rental agreement), with a language switch to show Mr. Das's use case.

## 5. User Stories

| ID | As a... | I want to... | So that... | Priority |
| --- | --- | --- | --- | --- |
| U1 | User | photograph or upload a document | I don't have to type anything | P0 |
| U2 | User | choose my preferred language | the explanation makes sense to me | P0 |
| U3 | User | hear the explanation read aloud | I can understand without reading | P0 |
| U4 | User | see deadlines, amounts and risky clauses highlighted | I notice what matters most | P0 |
| U5 | User | get a step-by-step checklist | I know what to do next | P0 |
| U6 | User | ask follow-up questions by voice | I can clarify specific points | P1 |
| U7 | User | get a draft reply or message | I can respond without hiring help | P1 |
| U8 | User | share the summary via WhatsApp | family can review it with me | P2 |

## 6. Functional Requirements

### 6.1 Document Intake (P0)

- Capture via camera or upload (JPG, PNG, PDF).
- Support multi-page documents (up to 5 pages in the MVP).
- Show an image preview with a retake option.

### 6.2 Language Selection (P0)

- Language picker on first screen: English, Hindi, Bengali (extensible).
- Selected language drives both text and voice output.

### 6.3 Document Understanding (P0)

- Extract text from the image using a vision-capable LLM.
- Classify the document type (rental agreement, loan, government notice, medical report, other).
- Produce a structured result:
  - **Summary:** 3 to 5 plain sentences.
  - **Key facts:** parties, amounts, dates.
  - **Deadlines:** each with date and consequence.
  - **Money:** fees, deposits, penalties, interest.
  - **Risk flags:** clauses that are unusual, one-sided or costly, each with a short reason and a severity (low, medium, high).
  - **Next steps:** ordered checklist.

### 6.4 Voice Output (P0)

- Text-to-speech playback of the summary and each section.
- Play, pause and replay controls.

### 6.5 Voice Q&A (P1)

- Push-to-talk button for follow-up questions.
- Answers are grounded in the uploaded document and cite the relevant clause.
- If the answer is not in the document, the app says so rather than guessing.

### 6.6 Draft Generator (P1)

- One-tap draft of a reply, negotiation message or request for clarification, editable before copying.

### 6.7 Safety and Trust (P0)

- Persistent disclaimer: "This is an explanation, not legal or professional advice."
- Low-confidence handling: if the image is blurry or text is unreadable, prompt to retake.
- No document storage by default. Processing is in-session only.

## 7. User Flow

1. **Landing:** choose language, tap "Scan a document."
2. **Capture:** take a photo or upload, confirm the preview.
3. **Processing:** a short progress state (target under 20 seconds).
4. **Result screen:** summary card, then tabs for Deadlines, Money, Risks, Next Steps.
5. **Listen:** tap the speaker icon to hear the explanation.
6. **Ask:** hold the mic button for follow-up questions.
7. **Act:** copy the checklist or generate a draft message.

## 8. Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| **Performance** | Result within 20 seconds for a 1 to 2 page document |
| **Accuracy** | Key dates and amounts must match the source; verified on a test set of 10 documents |
| **Privacy** | No persistent storage; no logging of document content; HTTPS only |
| **Accessibility** | Large tap targets, high contrast, voice-first operation |
| **Compatibility** | Works on mid-range Android Chrome and desktop browsers |
| **Reliability** | Graceful errors for bad images, API timeouts and unsupported languages |

## 9. Technical Approach

**Architecture (high level):** Front end → backend API → vision LLM and speech services → structured response back to front end.

- **Front end:** React (or Flutter) as a mobile-first PWA with camera access.
- **Backend:** FastAPI or Node.js with a single `/analyze` endpoint and a `/ask` endpoint.
- **AI layer:** a vision-capable LLM prompted to return strict JSON (summary, facts, deadlines, money, risks, steps) in the selected language.
- **Speech:** speech-to-text for questions, text-to-speech for answers, using a service with Hindi and Bengali support.
- **Storage:** none by default; session state held in memory.

**Prompt design notes:**

- Force a JSON schema and validate it server-side.
- Instruct the model to quote the clause it relies on and never invent dates or amounts.
- Keep reading level at roughly grade 6 to 8.

## 10. Success Metrics

**Hackathon demo metrics**

- End-to-end demo completes in under 90 seconds without failure.
- At least 3 languages shown working.
- 100% of key dates and amounts correct on the demo document.

**Product metrics (post-hackathon)**

- Time to first explanation (target under 30 seconds).
- Percentage of users who play audio or ask a follow-up.
- Comprehension score from a short user survey (target above 4 out of 5).
- Weekly return rate.

## 11. Scope and Milestones (48-hour plan)

| Phase | Hours | Deliverables |
| --- | --- | --- |
| **Setup** | 0 to 4 | Repo, API keys, UI skeleton, choose demo document |
| **Core pipeline** | 4 to 16 | Image upload, LLM analysis, structured JSON output |
| **Result UI** | 16 to 26 | Summary, deadline, money, risk and checklist views |
| **Voice** | 26 to 34 | Text-to-speech playback, language switching, push-to-talk Q&A |
| **Polish and testing** | 34 to 42 | Test on 10 documents, fix errors, add disclaimers |
| **Demo prep** | 42 to 48 | Script, slides, backup video, rehearsal |

**Suggested team split (4 people):** front end, backend and API integration, AI prompting and testing, design and demo storytelling.

## 12. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| OCR or LLM misreads dates or amounts | Medium | High | Show source clause beside each fact; test on varied scans; add retake prompt |
| Poor regional-language voice quality | Medium | Medium | Test voices early; fall back to text if voice is weak |
| Live demo fails (network, API limits) | Medium | High | Record a backup video; cache one pre-analyzed demo document |
| Users treat output as legal advice | Medium | High | Clear disclaimers; "explains, does not advise" framing |
| Scope creep | High | Medium | Lock MVP to the rental agreement flow; P1 and P2 only if time remains |

## 14. Future Scope

- More document types: bank statements, insurance policies, tax notices, prescriptions.
- More Indian languages and dialect-aware voice.
- WhatsApp bot for users without smartphones' app access.
- Partnerships with legal-aid groups, banks and NGOs.
- Clause comparison across multiple agreements.
