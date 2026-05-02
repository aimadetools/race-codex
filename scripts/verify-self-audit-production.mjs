#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { del, get, list } from "@vercel/blob";
import { JSDOM } from "jsdom";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_ENV_FILE = join(ROOT, ".env.production.local");
const FALLBACK_ENV_FILE = join(ROOT, ".env.local");
const REPORT_PATH = join(ROOT, "SELF-AUDIT-PRODUCTION-VERIFY.md");
const API_URL = "https://noticekit.tech/api/contact";
const INBOX_API_URL = "https://noticekit.tech/api/contact-inbox";
const INBOX_PAGE_PATH = join(ROOT, "ops-contact-inbox.html");

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
      "Self-audit score: 4/10 (High-risk gap). Source: founder follow-up. Channel: in-page-form. Missing segmentation, notice window, and proof logging.",
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
      "Self-audit score: 8/10 (Review-ready). Source: advisor follow-up. Channel: in-page-form. Only owner assignment and final review remain open.",
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
  if (!envPath) {
    return {};
  }

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

function pickEnvValue(key, ...sources) {
  for (const source of sources) {
    const value = String(source?.[key] || "").trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runLocalScript(label, script) {
  const result = spawnSync("node", [join(ROOT, "scripts", script)], {
    cwd: ROOT,
    encoding: "utf8"
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed.`);
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
      submissionChannel: "in-page-form",
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
    submissionChannel: "in-page-form",
    referenceId: data.referenceId
  };
}

async function waitFor(assertion, message, { timeoutMs = 20000, intervalMs = 1000 } = {}) {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < timeoutMs) {
    try {
      return await assertion();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`${message}${lastError ? ` Last error: ${lastError.message}` : ""}`);
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

async function deleteStoredRecord(token, pathname) {
  if (!pathname) {
    return;
  }

  await del(pathname, { token });
}

function verifyRecord(submission, stored) {
  const { record } = stored;
  assert(record.referenceId === submission.referenceId, `${submission.name}: referenceId mismatch in Blob.`);
  assert(record.type === "self_audit_feedback", `${submission.name}: Blob type mismatch.`);
  assert(record.company === submission.company, `${submission.name}: Blob company mismatch.`);
  assert(record.email === submission.email, `${submission.name}: Blob email mismatch.`);
  assert(record.sourceTag === submission.sourceTag, `${submission.name}: Blob sourceTag mismatch.`);
  assert(record.submissionChannel === "in-page-form", `${submission.name}: Blob submissionChannel mismatch.`);
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
}

async function fetchInbox(password) {
  const response = await fetch(INBOX_API_URL, {
    headers: {
      "x-noticekit-dashboard-password": password,
      "user-agent": "noticekit-production-verifier"
    }
  });
  const payload = await response.json().catch(() => ({}));

  assert(response.ok, `Inbox fetch failed with ${response.status}.`);
  assert(payload.ok === true, "Inbox fetch did not return ok=true.");
  assert(Array.isArray(payload.records), "Inbox payload is missing records.");

  return payload;
}

function findInboxRecord(payload, submission) {
  const record = payload.records.find((entry) => entry.referenceId === submission.referenceId);
  assert(record, `${submission.name}: record was not returned by production inbox.`);
  return record;
}

function verifyInboxRecord(submission, record) {
  assert(record.isSelfAuditFeedback === true, `${submission.name}: inbox did not classify self-audit feedback.`);
  assert(record.isTaggedValidation === true, `${submission.name}: inbox did not classify tagged validation.`);
  assert(record.isLikelyTestSubmission === true, `${submission.name}: inbox did not classify verifier traffic as a likely test submission.`);
  assert(record.referenceId === submission.referenceId, `${submission.name}: inbox referenceId mismatch.`);
  assert(record.sourceTag === submission.sourceTag, `${submission.name}: inbox sourceTag mismatch.`);
  assert(
    record.submissionChannel === submission.submissionChannel,
    `${submission.name}: inbox submissionChannel mismatch.`
  );
  assert(
    record.ownershipSignal === submission.ownershipSignal,
    `${submission.name}: inbox ownershipSignal mismatch.`
  );
  assert(record.score === submission.score, `${submission.name}: inbox score mismatch.`);
  assert(record.scoreBand === submission.scoreBand, `${submission.name}: inbox scoreBand mismatch.`);
  assert(
    JSON.stringify(record.topGaps) === JSON.stringify(submission.topGaps),
    `${submission.name}: inbox topGaps mismatch.`
  );
}

async function verifyInboxRendering(payload, submissions) {
  const html = await readFile(INBOX_PAGE_PATH, "utf8");
  const fetchCalls = [];
  const clipboardWrites = [];
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://noticekit.tech/ops-contact-inbox.html",
    beforeParse(window) {
      window.fetch = async (url, options = {}) => {
        fetchCalls.push({ url, options });
        return {
          ok: true,
          json: async () => payload
        };
      };

      window.navigator.clipboard = {
        writeText: async (text) => {
          clipboardWrites.push(text);
        }
      };
    }
  });

  const { window } = dom;
  const passwordInput = window.document.querySelector("#ops-password");
  const filterSelect = window.document.querySelector("#record-filter");
  const form = window.document.querySelector("#inbox-form");
  const results = window.document.querySelector("#results");

  passwordInput.value = "ops-password-present";
  filterSelect.value = "test_only";
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() => {
    if (results.hidden || results.children.length < submissions.length) {
      throw new Error("Inbox UI has not rendered the likely test records yet.");
    }
    return true;
  }, "Inbox UI did not render likely test results.");

  assert(fetchCalls.length === 1, `Expected one inbox fetch from UI, saw ${fetchCalls.length}.`);
  assert(fetchCalls[0].url === "/api/contact-inbox", `Unexpected inbox fetch URL ${fetchCalls[0].url}.`);

  const renderedText = results.textContent || "";
  for (const submission of submissions) {
    const sourceLabel = submission.sourceTag.replace(/[-_]+/g, " ");
    assert(renderedText.includes(submission.company), `${submission.name}: company not rendered in inbox UI.`);
    assert(renderedText.includes(sourceLabel), `${submission.name}: source tag label not rendered in inbox UI.`);
    assert(renderedText.includes("likely test"), `${submission.name}: likely-test label not rendered in inbox UI.`);
    assert(
      renderedText.includes(submission.submissionChannel),
      `${submission.name}: submission channel not rendered in inbox UI.`
    );
    assert(renderedText.includes(submission.scoreBand), `${submission.name}: score band not rendered in inbox UI.`);
    for (const gap of submission.topGaps) {
      assert(renderedText.includes(gap), `${submission.name}: top gap ${gap} not rendered in inbox UI.`);
    }
  }

  const copyButtons = [...results.querySelectorAll("button")].filter((button) =>
    button.textContent.includes("Copy feedback draft")
  );
  assert(copyButtons.length >= submissions.length, "Expected copy buttons for tagged self-audit records.");
  for (const button of copyButtons.slice(0, submissions.length)) {
    button.click();
  }
  await waitFor(() => {
    if (clipboardWrites.length < submissions.length) {
      throw new Error("Clipboard writes not observed for each copy action.");
    }
    return true;
  }, "Copy feedback draft action did not write to clipboard.");

  for (const submission of submissions) {
    const matchingDraft = clipboardWrites.find((text) => text.includes(submission.referenceId) || text.includes(submission.company));
    assert(matchingDraft, `${submission.name}: feedback draft was not copyable from inbox UI.`);
    assert(
      matchingDraft.includes(`Source tag: ${submission.sourceTag}`),
      `${submission.name}: feedback draft omitted source tag.`
    );
    assert(
      matchingDraft.includes(`Channel: ${submission.submissionChannel}`),
      `${submission.name}: feedback draft omitted channel.`
    );
    assert(
      matchingDraft.includes(`Score band: ${submission.scoreBand}`),
      `${submission.name}: feedback draft omitted score band.`
    );
  }
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
    "- Verified the private Blob inbox stored the exact `sourceTag`, `submissionChannel`, `ownershipSignal`, `score`, `scoreBand`, `selectedChecks`, `topGaps`, and summary fields for each submit.",
    "- Verified `https://noticekit.tech/api/contact-inbox` returned both stored records when queried with the ops password.",
    "- Verified `ops-contact-inbox.html` rendered the likely-test filter view with the source tag, channel, score band, top gaps, likely-test label, and copyable feedback draft for the live records.",
    "- Deleted the synthetic Blob records after verification so the routine production check does not keep inflating test-only inbox counts.",
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
const fallbackEnv = envPath === FALLBACK_ENV_FILE ? {} : await loadEnvFile(FALLBACK_ENV_FILE);
const blobToken = pickEnvValue("BLOB_READ_WRITE_TOKEN", process.env, env, fallbackEnv);
const opsPassword = pickEnvValue("OPS_DASHBOARD_PASSWORD", process.env, env, fallbackEnv);

if (!blobToken) {
  throw new Error(`Missing BLOB_READ_WRITE_TOKEN. Checked process env and ${envPath}.`);
}

if (!opsPassword) {
  throw new Error(`Missing OPS_DASHBOARD_PASSWORD. Checked process env and ${envPath}.`);
}

const results = [];
try {
  for (const testCase of CASES) {
    const submitted = await submitCase(testCase);
    const stored = await waitFor(
      () => loadStoredRecord(blobToken, submitted),
      `${submitted.name}: stored Blob record did not appear in time.`
    );
    verifyRecord(submitted, stored);
    results.push({
      ...submitted,
      pathname: stored.pathname
    });
  }

  const inboxPayload = await waitFor(
    async () => {
      const payload = await fetchInbox(opsPassword);
      for (const submission of results) {
        findInboxRecord(payload, submission);
      }
      return payload;
    },
    "Production inbox did not return the submitted records in time."
  );

  for (const submission of results) {
    verifyInboxRecord(submission, findInboxRecord(inboxPayload, submission));
  }

  await verifyInboxRendering(inboxPayload, results);
} finally {
  for (const submission of results) {
    try {
      await deleteStoredRecord(blobToken, submission.pathname);
    } catch (error) {
      console.error(`Failed to delete synthetic verification record ${submission.pathname}`, error);
    }
  }
}

await writeFile(REPORT_PATH, buildReport(results));
console.log(`Wrote ${REPORT_PATH}`);
runLocalScript("Contact inbox status refresh", "build-contact-inbox-status.mjs");
runLocalScript("Validation status refresh", "build-validation-status.mjs");
