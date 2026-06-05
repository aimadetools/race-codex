#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { get, list } from "@vercel/blob";
import { WATCHED_SOURCE_TAGS } from "./watched-source-tags.mjs";

const ROOT = process.cwd();
const OUTPUT = join(ROOT, "CONTACT-INBOX-STATUS.md");
const DEFAULT_ENV_FILE = join(ROOT, ".env.production.local");
const FALLBACK_ENV_FILE = join(ROOT, ".env.local");
const BLOB_PREFIX = "contact-submissions/";
const MAX_SUBMISSIONS = 200;
const TEARDOWN_SOURCE_FAMILY_ORDER = [
  "homepage",
  "pricing",
  "about",
  "generator",
  "hub",
  "checker",
  "ai-disclosure-packet",
  "ai-stack",
  "tracker",
  "review-brief-builder",
  "blog",
  "outreach",
  "other"
];
const OWNERSHIP_BUCKET_ORDER = [
  "founder",
  "operator",
  "privacy consultant",
  "fractional dpo",
  "attorney",
  "other",
  "unknown"
];
const PARTNER_GOAL_BUCKET_ORDER = [
  "referral_only",
  "client_delivery",
  "white_label",
  "other",
  "unknown"
];
const AI_AGENT_GAP_READ_SOURCE_TAGS = [
  "agent-review-outreach-batch-01",
  "ai-agent-review-teardown",
  "ai-agent-approval-gate-teardown",
  "agent-review-checklist-teardown",
  "ai-agent-workspace-teardown"
];
const AUDIT_ROUTE_SOURCE_TAGS = [
  "homepage-nav-audit",
  "pricing-nav-audit",
  "pricing-concierge-card",
  "start-here-nav-audit",
  "about-nav-audit",
  "free-tools-nav-audit",
  "ai-procurement-hub-nav-audit",
  "kit-preview-nav-audit",
  "purchase-next-steps-audit",
  "audit-request-nav-audit",
  "audit-request-hero-audit",
  "audit-request-side-panel",
  "blog-nav-audit",
  "ai-answer-builder-nav-audit",
  "ai-evidence-map-nav-audit",
  "ai-agent-workspace-nav-audit",
  "ai-answer-bank-nav-audit",
  "ai-pro-kit-nav-audit",
  "ai-starter-pack-nav-audit",
  "openai-answer-template-nav-audit",
  "openai-answer-bank-nav-audit",
  "blog-ai-agent-approval-gate-nav-audit",
  "blog-ai-agent-checklist-nav-audit",
  "blog-ai-agent-tool-access-nav-audit",
  "blog-ai-answer-bank-vs-builder-nav-audit",
  "blog-ai-answer-bank-vs-pro-kit-nav-audit",
  "blog-ai-answer-example-nav-audit",
  "blog-ai-answer-template-nav-audit",
  "blog-ai-disclosure-packet-nav-audit",
  "blog-ai-follow-up-questions-nav-audit",
  "blog-ai-path-guide-nav-audit",
  "blog-ai-saas-list-template-nav-audit",
  "blog-ai-saas-notice-template-nav-audit",
  "blog-ai-starter-pack-vs-builder-nav-audit",
  "blog-ai-questionnaire-nav-audit",
  "blog-ai-training-stance-nav-audit",
  "blog-ai-inventory-nav-audit",
  "blog-ai-risk-assessment-nav-audit",
  "blog-openai-bank-vs-builder-nav-audit",
  "blog-openai-answer-example-nav-audit",
  "blog-openai-answer-template-nav-audit",
  "blog-openai-path-guide-nav-audit"
];
const AUDIT_SAMPLE_SOURCE_TAGS = [
  "ai-audit-email-sample",
  "ai-audit-page-sample",
  "ai-audit-sample-page"
];

function formatUtcTimestamp(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

async function loadEnvFile(envPath) {
  try {
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
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      entries[key] = value;
    }

    return entries;
  } catch (error) {
    return {};
  }
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

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function isTaggedValidation(sourceTag) {
  const raw = String(sourceTag || "").trim().toLowerCase();
  return ["founder-follow-up", "advisor-follow-up", "founder-batch-03", "founder-batch-04"].includes(raw);
}

function isLikelyTestSubmission(record) {
  const company = String(record.company || "").trim().toLowerCase();
  const email = String(record.email || "").trim().toLowerCase();
  const sourceTag = String(record.sourceTag || "").trim().toLowerCase();
  const summary = String(record.summary || "").trim().toLowerCase();
  const reviewNeed = String(record.reviewNeed || "").trim().toLowerCase();
  const vendorChange = String(record.vendorChange || "").trim().toLowerCase();

  const text = [company, sourceTag, summary, reviewNeed, vendorChange].join(" ");
  const emailDomain = email.includes("@") ? email.split("@").pop() : "";
  const placeholderDomain = emailDomain === "example.com" ||
    emailDomain === "example.org" ||
    emailDomain === "example.net" ||
    emailDomain.endsWith(".test") ||
    emailDomain.includes(".example");

  if (placeholderDomain) {
    return true;
  }

  if (/(^|\b)(testco|acme saas|beta labs|codex validation test)(\b|$)/.test(company)) {
    return true;
  }

  if (text.includes("noticekit") && /(test|check|verification|post-deploy|restore)/.test(text)) {
    return true;
  }

  return false;
}

function describeSourceTag(sourceTag) {
  const raw = String(sourceTag || "").trim();
  return raw || "direct site visit";
}

function classifyTeardownSourceFamily(sourceTag) {
  const normalized = String(sourceTag || "").trim().toLowerCase();

  if (!normalized || normalized === "site") {
    return "other";
  }

  if (normalized.startsWith("homepage-")) {
    return "homepage";
  }

  if (normalized.startsWith("pricing-")) {
    return "pricing";
  }

  if (normalized.startsWith("about-")) {
    return "about";
  }

  if (normalized.startsWith("generator-")) {
    return "generator";
  }

  if (normalized.startsWith("free-tools-")) {
    return "hub";
  }

  if (normalized.startsWith("blog-subprocessor-page-checker-")) {
    return "checker";
  }

  if (normalized.startsWith("ai-disclosure-packet-")) {
    return "ai-disclosure-packet";
  }

  if (normalized.startsWith("ai-security-questionnaire-")) {
    return "ai-disclosure-packet";
  }

  if (normalized.startsWith("sample-ai-packet-")) {
    return "ai-disclosure-packet";
  }

  if (normalized.startsWith("ai-stack-template-")) {
    return "ai-stack";
  }

  if (
    normalized === "blog-dpa-objection-window-template" ||
    normalized === "blog-dpa-objection-window-cta"
  ) {
    return "tracker";
  }

  if (normalized.startsWith("review-brief-builder-")) {
    return "review-brief-builder";
  }

  if (
    normalized.startsWith("founder-follow-up") ||
    normalized.startsWith("advisor-follow-up") ||
    normalized.startsWith("partner-outreach-") ||
    normalized.startsWith("community-ai-procurement-") ||
    normalized.startsWith("community-ai-risk-assessment")
  ) {
    return "outreach";
  }

  if (normalized.startsWith("ai-vendor-risk-assessment-")) {
    return "blog";
  }

  if (
    normalized.startsWith("blog-") ||
    normalized === "blog-index"
  ) {
    return "blog";
  }

  return "other";
}

function normalizeOwnershipSignal(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (["founder", "operator", "privacy consultant", "fractional dpo", "attorney"].includes(normalized)) {
    return normalized;
  }

  if (!normalized) {
    return "unknown";
  }

  return "other";
}

function normalizePartnerGoal(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (["referral_only", "client_delivery", "white_label"].includes(normalized)) {
    return normalized;
  }

  if (!normalized) {
    return "unknown";
  }

  return "other";
}

function safeValue(value, fallback = "Not provided") {
  const text = String(value || "").trim();
  return text || fallback;
}

function countBy(rows, iteratee) {
  const counts = new Map();

  for (const row of rows) {
    const key = String(iteratee(row) || "").trim() || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0]);
  });
}

async function main() {
  const env = await loadEnvFile(DEFAULT_ENV_FILE);
  const fallbackEnv = await loadEnvFile(FALLBACK_ENV_FILE);
  const token = pickEnvValue("BLOB_READ_WRITE_TOKEN", process.env, env, fallbackEnv);
  const checkedAt = formatUtcTimestamp(new Date());

  if (!token) {
    const output = [
      "# Contact Inbox Status",
      "",
      `Checked at: ${checkedAt}`,
      "Source of truth: Vercel Blob `contact-submissions/`",
      "",
      "## Status",
      "",
      "- Inbox status: unavailable",
      "- Reason: `BLOB_READ_WRITE_TOKEN` is missing in the current environment.",
      ""
    ].join("\n");
    await writeFile(OUTPUT, output);
    console.log(`Wrote ${OUTPUT}`);
    return;
  }

  const lookup = await list({
    prefix: BLOB_PREFIX,
    limit: MAX_SUBMISSIONS,
    token
  });

  const blobs = [...lookup.blobs].sort((left, right) =>
    String(right.uploadedAt || "").localeCompare(String(left.uploadedAt || ""))
  );
  const records = [];

  for (const blob of blobs) {
    const result = await get(blob.pathname, {
      access: "private",
      token
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      continue;
    }

    try {
      const record = JSON.parse(await readStream(result.stream));
      records.push({
        ...record,
        uploadedAt: blob.uploadedAt,
        pathname: blob.pathname,
        isLikelyTestSubmission: isLikelyTestSubmission(record),
        isTaggedValidation: isTaggedValidation(record.sourceTag)
      });
    } catch (error) {
      continue;
    }
  }

  const realRecords = records.filter((record) => !record.isLikelyTestSubmission);
  const testRecords = records.filter((record) => record.isLikelyTestSubmission);
  const realTeardowns = realRecords.filter((record) => String(record.type || "").trim() === "free_async_teardown");
  const realPartnerRequests = realRecords.filter((record) => String(record.type || "").trim() === "partner_request");
  const realSelfAuditFeedback = realRecords.filter((record) => String(record.type || "").trim() === "self_audit_feedback");
  const realTaggedValidation = realRecords.filter((record) => record.isTaggedValidation);
  const latestReal = realRecords[0] || null;
  const latestRealSubmissions = realRecords.slice(0, 5);
  const typeBreakdown = countBy(realRecords, (record) => String(record.type || "").trim());
  const sourceBreakdown = countBy(realRecords, (record) => describeSourceTag(record.sourceTag));
  const ownershipBreakdown = OWNERSHIP_BUCKET_ORDER.map((bucket) => [
    bucket,
    realRecords.filter((record) => normalizeOwnershipSignal(record.ownershipSignal) === bucket).length
  ]);
  const teardownSourceFamilyCounts = TEARDOWN_SOURCE_FAMILY_ORDER.map((family) => [
    family,
    realTeardowns.filter((record) => classifyTeardownSourceFamily(record.sourceTag) === family).length
  ]);
  const teardownOwnershipCounts = OWNERSHIP_BUCKET_ORDER.map((bucket) => [
    bucket,
    realTeardowns.filter((record) => normalizeOwnershipSignal(record.ownershipSignal) === bucket).length
  ]);
  const partnerGoalCounts = PARTNER_GOAL_BUCKET_ORDER.map((bucket) => [
    bucket,
    realPartnerRequests.filter((record) => normalizePartnerGoal(record.partnerGoal) === bucket).length
  ]);
  const aiAgentGapReadCounts = AI_AGENT_GAP_READ_SOURCE_TAGS.map((sourceTag) => [
    sourceTag,
    realRecords.filter((record) => describeSourceTag(record.sourceTag) === sourceTag).length
  ]);
  const auditRouteCounts = AUDIT_ROUTE_SOURCE_TAGS.map((sourceTag) => [
    sourceTag,
    realRecords.filter((record) => describeSourceTag(record.sourceTag) === sourceTag).length
  ]);
  const auditSampleCounts = AUDIT_SAMPLE_SOURCE_TAGS.map((sourceTag) => [
    sourceTag,
    realRecords.filter((record) => describeSourceTag(record.sourceTag) === sourceTag).length
  ]);
  const watchedSourceCounts = WATCHED_SOURCE_TAGS.map((sourceTag) => [
    sourceTag,
    realRecords.filter((record) => describeSourceTag(record.sourceTag) === sourceTag).length
  ]);

  const output = [
    "# Contact Inbox Status",
    "",
    `Checked at: ${checkedAt}`,
    "Source of truth: Vercel Blob `contact-submissions/`",
    "",
    "## Totals",
    "",
    `- Total submissions stored: ${records.length}`,
    `- Real submissions: ${realRecords.length}`,
    `- Likely test submissions: ${testRecords.length}`,
    `- Real free async teardown submissions: ${realTeardowns.length}`,
    `- Real partner requests: ${realPartnerRequests.length}`,
    `- Real self-audit feedback submissions: ${realSelfAuditFeedback.length}`,
    `- Real tagged validation replies: ${realTaggedValidation.length}`,
    "",
    "## Real Submission Breakdown",
    "",
    "### By Type",
    "",
    ...(typeBreakdown.length === 0
      ? ["- No real submissions are stored in the inbox yet."]
      : typeBreakdown.map(([type, count]) => `- ${type}: ${count}`)),
    "",
    "### By Source Tag",
    "",
    ...(sourceBreakdown.length === 0
      ? ["- No real submissions are stored in the inbox yet."]
      : sourceBreakdown.map(([sourceTag, count]) => `- ${sourceTag}: ${count}`)),
    "",
    "### By Ownership Signal",
    "",
    ...ownershipBreakdown.map(([bucket, count]) => `- ${bucket}: ${count}`),
    "",
    "### Free Async Teardown Source Families",
    "",
    ...teardownSourceFamilyCounts.map(([family, count]) => `- ${family}: ${count}`),
    "",
    "### Free Async Teardown Ownership Signals",
    "",
    ...teardownOwnershipCounts.map(([bucket, count]) => `- ${bucket}: ${count}`),
    "",
    "### Partner Request Goals",
    "",
    ...partnerGoalCounts.map(([bucket, count]) => `- ${bucket}: ${count}`),
    "",
    "### AI Agent Gap-Read Source Tags",
    "",
    ...aiAgentGapReadCounts.map(([sourceTag, count]) => `- ${sourceTag}: ${count}`),
    "",
    "### Audit Route Source Tags",
    "",
    ...auditRouteCounts.map(([sourceTag, count]) => `- ${sourceTag}: ${count}`),
    "",
    "### Audit Sample Proof Source Tags",
    "",
    ...auditSampleCounts.map(([sourceTag, count]) => `- ${sourceTag}: ${count}`),
    "",
    "### Watched Source Tags",
    "",
    ...watchedSourceCounts.map(([sourceTag, count]) => `- ${sourceTag}: ${count}`),
    "",
    "## Latest Real Submission",
    ""
  ];

  if (!latestReal) {
    output.push("- No real submissions are stored in the inbox yet.");
  } else {
    output.push(`- Reference ID: ${safeValue(latestReal.referenceId)}`);
    output.push(`- Submitted at: ${safeValue(latestReal.submittedAt || latestReal.uploadedAt)}`);
    output.push(`- Type: ${safeValue(latestReal.type)}`);
    output.push(`- Company: ${safeValue(latestReal.company)}`);
    output.push(`- Source tag: ${describeSourceTag(latestReal.sourceTag)}`);
    output.push(`- Channel: ${safeValue(latestReal.submissionChannel, "unknown")}`);
    output.push(`- Ownership: ${safeValue(latestReal.ownershipSignal, "unknown")}`);
    if (String(latestReal.type || "").trim() === "partner_request") {
      output.push(`- Partner goal: ${safeValue(latestReal.partnerGoal, "unknown")}`);
    }
    output.push(`- Storage path: ${safeValue(latestReal.pathname)}`);
  }

  output.push("", "## Recent Real Submission Queue", "");

  if (latestRealSubmissions.length === 0) {
    output.push("- No real submissions are stored in the inbox yet.");
  } else {
    for (const record of latestRealSubmissions) {
      const queueSuffix = String(record.type || "").trim() === "partner_request"
        ? ` | goal ${safeValue(record.partnerGoal, "unknown")}`
        : "";
      output.push(`- ${safeValue(record.submittedAt || record.uploadedAt)} | ${safeValue(record.type)} | ${describeSourceTag(record.sourceTag)} | ${safeValue(record.company)} | role ${safeValue(record.ownershipSignal, "unknown")}${queueSuffix}`);
    }
  }

  output.push("");
  await writeFile(OUTPUT, output.join("\n"));
  console.log(`Wrote ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
