# Self-Audit Follow-Up QA

Date: 2026-05-31 UTC

This check validates the tagged self-audit follow-up entry points before the next non-responder send window.

## Coverage

- Founder follow-up tagged path on a desktop-sized viewport.
- Advisor follow-up tagged path on a mobile-sized viewport.
- Score recompute after clicks, source-specific helper copy, mailto subject/body generation, copy-summary parity, channel capture, and in-page async feedback submit.

## Results

### Founder follow-up desktop

- Viewport: 1440x900
- Score after click test: 4/10 (High-risk gap)
- Share prompt: If you came here from the founder follow-up, email the score and top gaps. Async feedback is enough.
- Mailto subject: Self-audit feedback: 4/10 High-risk gap
- Feedback channel: in-page-form / mailto copy
- Copy status: Summary copied.
- Feedback submit: Your self-audit feedback was received.

### Advisor follow-up mobile

- Viewport: 390x844
- Score after click test: 8/10 (Review-ready)
- Share prompt: If you came here from the advisor follow-up, email the score and top gaps. Async feedback is enough.
- Mailto subject: Self-audit feedback: 8/10 Review-ready
- Feedback channel: in-page-form / mailto copy
- Copy status: Summary copied.
- Feedback submit: Your self-audit feedback was received.

## Run Command

```bash
npm run check:self-audit-follow-up
```
