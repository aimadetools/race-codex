#!/usr/bin/env node

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildForwardedRecord } = require("../api/contact-forwarded-record.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const receivedAt = "2026-05-06T05:00:00.000Z";
const payload = {
  referenceId: "NK-20260506T050000-TEST01",
  storedAt: "2026-05-06T04:59:58.000Z",
  submittedAt: "2026-05-06T04:59:57.000Z",
  company: "Example SaaS",
  email: "founder@example.com",
  type: "partner_request",
  ownershipSignal: "fractional dpo",
  sourceTag: "partner-outreach-follow-up-01",
  submissionChannel: "partner-follow-up",
  subprocessorUrl: "https://example.com/subprocessors",
  vendorChange: "Adding a new email vendor",
  deadline: "EU customers, 30-day window",
  reviewNeed: "Check partner fit and teardown risk.",
  partnerRole: "fractional_dpo",
  clientProfile: "B2B SaaS clients",
  partnerGoal: "white_label",
  partnerVolume: "2-3 per quarter",
  scoreLabel: "Review-ready",
  scoreBand: "8-10",
  summary: "Partner request with teardown context.",
  score: 8,
  scoreDisplay: "8/10 (Review-ready)",
  topGaps: ["owner", "review"],
  selectedChecks: ["page", "vendor", "proof"],
  storagePath: "contact-submissions/2026-05-06/NK-20260506T050000-TEST01.json",
  storageUrl: "https://example.com/private.json",
  userAgent: "noticekit-test"
};

const record = buildForwardedRecord(payload, receivedAt);

assert(record.referenceId === payload.referenceId, "referenceId was not preserved.");
assert(record.receivedAt === receivedAt, "receivedAt was not set.");
assert(record.forwardedAt === payload.storedAt, "forwardedAt did not prefer storedAt.");
assert(record.submittedAt === payload.submittedAt, "submittedAt was not preserved.");
assert(record.sourceTag === payload.sourceTag, "sourceTag was not preserved.");
assert(record.submissionChannel === payload.submissionChannel, "submissionChannel was not preserved.");
assert(record.ownershipSignal === payload.ownershipSignal, "ownershipSignal was not preserved.");
assert(record.partnerRole === payload.partnerRole, "partnerRole was not preserved.");
assert(record.partnerGoal === payload.partnerGoal, "partnerGoal was not preserved.");
assert(record.partnerVolume === payload.partnerVolume, "partnerVolume was not preserved.");
assert(record.clientProfile === payload.clientProfile, "clientProfile was not preserved.");
assert(record.score === payload.score, "score was not preserved.");
assert(record.scoreDisplay === payload.scoreDisplay, "scoreDisplay was not preserved.");
assert(JSON.stringify(record.topGaps) === JSON.stringify(payload.topGaps), "topGaps were not preserved.");
assert(
  JSON.stringify(record.selectedChecks) === JSON.stringify(payload.selectedChecks),
  "selectedChecks were not preserved."
);
assert(record.storagePath === payload.storagePath, "storagePath was not preserved.");
assert(record.storageUrl === payload.storageUrl, "storageUrl was not preserved.");
assert(record.source === "contact-webhook", "source marker was not set.");

console.log("Contact webhook forwarded-record shape check passed.");
