#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { get, list } from "@vercel/blob";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_ENV_FILE = join(ROOT, ".env.production.local");
const REPORT_PATH = join(ROOT, "SELF-AUDIT-PRODUCTION-VERIFY.md");
const API_URL = "https://noticekit.tech/api/contact";

const CASES = [
  {
    name: "Founder tagged production submit",
    sourceTag: "founder-follow-up",
    company: "NoticeKit Founder Flow Test",
    email: "founder-test@example.com",
    ownershipSignal: "founder",
    score: 4,
    scoreLabel: "High-risk gap",
    scoreBand: "0-4",
    selectedChecks: ["page", "vendor", "data", "owner"],
    topGaps: ["segments", "window", "proof"],
    summary:
      "Self-audit score: 4/10 (High-risk gap). Source: founder follow-up. Missing segmentation, notice window, and proof logging.",
    reviewNeed: "Production verification test. No follow-up needed."
  },
  {
    name: "Advisor tagged production submit",
    sourceTag: "advisor-follow-up",
    company: "NoticeKit Advisor Flow Test",
    email: "advisor-test@example.com",
    ownershipSignal: "privacy consultant",
    score: 8,
    scoreLabel: "Review-ready",
    scoreBand: "8-10",
    selectedChecks: ["page", "vendor", "data", "segments", "window", "dates", "copy", "proof"],
    topGaps: ["owner", "review"],
    summary:
      "Self-audit score: 8/10 (Review-ready). Source: advisor follow-up. Only owner assignment and final review remain open.",
    reviewNeed: "Production verification test. No follow-up needed."
  }
];

function parseArgs(argv) {
  const args = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(value.slice(2), "true");
      continue;
    }

    args.set(value.slice(2), next);
    index += 1;
  }
  return args;
}

async function loadEnvFile(envPath) {
  const content = await readFile(envPath, "utf8");
  const entries = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }

  return entries;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function submitCase(testCase) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "noticekit-production-verifier"
    },
    body: JSON.stringify({
      type: "self_audit_feedback",
      company: testCase.company,
      email: testCase.email,
      sourceTag: testCase.sourceTag,
      ownershipSignal: testCase.ownershipSignal,
      score: testCase.score,
      scoreLabel: testCase.scoreLabel,
      scoreBand: testCase.scoreBand,
      selectedChecks: testCase.selectedChecks,
      topGaps: testCase.topGaps,
      summary: testCase.summary,
      reviewNeed: testCase.reviewNeed
    })
  });

  const data = await response.json().catch(() => ({}));

  assert(response.ok, `${testCase.name}: production submit failed with ${response.status}.`);
  assert(data.ok === true, `${testCase.name}: production submit did not return ok=true.`);
  assert(
    data.message === "Your self-audit feedback was received.",
    `${testCase.name}: unexpected success message.`
  );
  assert(data.referenceId, `${testCase.name}: missing referenceId in production response.`);

  return {
    ...testCase,
    referenceId: data.referenceId
  };
}

async function loadStoredRecord(token, submission) {
  const lookup = await list({
    prefix: `contact-submissions/`,
    limit: 100,
    token
  });

  const target = lookup.blobs.find((blob) => blob.pathname.endsWith(`/${submission.referenceId}.json`));
  assert(target, `${submission.name}: stored record was not found in Blob list.`);

  const result = await get(target.pathname, {
    access: "private",
    token
  });
  assert(result?.statusCode === 200 && result.stream, `${submission.name}: Blob fetch failed.`);

  const record = JSON.parse(await readStream(result.stream));
  return { pathname: target.pathname, record };
}

function verifyRecord(submission, stored) {
  const { record } = stored;
  assert(record.referenceId === submission.referenceId, `${submission.name}: referenceId mismatch in Blob.`);
  assert(record.type === "self_audit_feedback", `${submission.name}: Blob type mismatch.`);
  assert(record.company === submission.company, `${submission.name}: Blob company mismatch.`);
  assert(record.email === submission.email, `${submission.name}: Blob email mismatch.`);
  assert(record.sourceTag === submission.sourceTag, `${submission.name}: Blob sourceTag mismatch.`);
  assert(
    record.ownershipSignal === submission.ownershipSignal,
    `${submission.name}: Blob ownershipSignal mismatch.`
  );
  assert(record.score === submission.score, `${submission.name}: Blob score mismatch.`);
  assert(record.scoreLabel === submission.scoreLabel, `${submission.name}: Blob scoreLabel mismatch.`);
  assert(record.scoreBand === submission.scoreBand, `${submission.name}: Blob scoreBand mismatch.`);
  assert(
    JSON.stringify(record.selectedChecks) === JSON.stringify(submission.selectedChecks),
    `${submission.name}: Blob selectedChecks mismatch.`
  );
  assert(
    JSON.stringify(record.topGaps) === JSON.stringify(submission.topGaps),
    `${submission.name}: Blob topGaps mismatch.`
  );
  assert(record.summary === submission.summary, `${submission.name}: Blob summary mismatch.`);
  assert(record.reviewNeed === submission.reviewNeed, `${submission.name}: Blob reviewNeed mismatch.`);
  assert(record.storagePath === stored.pathname, `${submission.name}: Blob storagePath mismatch.`);
  assert(record.storageUrl, `${submission.name}: Blob storageUrl missing.`);
}

function buildReport(results) {
  const date = new Date().toISOString().slice(0, 10);
  return [
    "# Self-Audit Production Verification",
    "",
    `Date: ${date} UTC`,
    "",
    "This report records the live production verification of the tagged self-audit async submit path at `https://noticekit.tech/self-audit.html`.",
    "",
    "## Checks",
    "",
    "- Submitted one founder-tagged `self_audit_feedback` payload to `https://noticekit.tech/api/contact`.",
    "- Submitted one advisor-tagged `self_audit_feedback` payload to `https://noticekit.tech/api/contact`.",
    "- Verified the production API returned success and a unique `referenceId` for each submit.",
    "- Verified the private Blob inbox stored the exact `sourceTag`, `ownershipSignal`, `score`, `scoreBand`, `selectedChecks`, `topGaps`, and summary fields for each submit.",
    "",
    "## Results",
    "",
    ...results.flatMap((result) => [
      `### ${result.name}`,
      "",
      `- Reference ID: ${result.referenceId}`,
      `- Source tag: ${result.sourceTag}`,
      `- Ownership signal: ${result.ownershipSignal}`,
      `- Score: ${result.score}/10 (${result.scoreLabel})`,
      `- Score band: ${result.scoreBand}`,
      `- Blob path: ${result.pathname}`,
      ""
    ])
  ].join("\n");
}

const args = parseArgs(process.argv);
const envPath = args.get("env-file") || DEFAULT_ENV_FILE;
const env = await loadEnvFile(envPath);
const blobToken = String(process.env.BLOB_READ_WRITE_TOKEN || env.BLOB_READ_WRITE_TOKEN || "").trim();

if (!blobToken) {
  throw new Error(`Missing BLOB_READ_WRITE_TOKEN. Checked process env and ${envPath}.`);
}

const results = [];
for (const testCase of CASES) {
  const submitted = await submitCase(testCase);
  const stored = await loadStoredRecord(blobToken, submitted);
  verifyRecord(submitted, stored);
  results.push({
    ...submitted,
    pathname: stored.pathname
  });
}

await writeFile(REPORT_PATH, buildReport(results));
console.log(`Wrote ${REPORT_PATH}`);
