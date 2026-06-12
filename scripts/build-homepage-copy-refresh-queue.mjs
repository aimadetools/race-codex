#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const FEEDBACK_FILE = join(ROOT, "COMMUNITY-FEEDBACK.md");
const HOMEPAGE_FILE = join(ROOT, "index.html");
const OUTPUT_FILE = join(ROOT, "HOMEPAGE-COPY-REFRESH-QUEUE.md");

const COPY_TARGETS = [
  {
    label: "Hero eyebrow",
    current: "For SaaS teams under 30 people",
    proposed: "For privacy advisors and lean SaaS teams"
  },
  {
    label: "Hero headline",
    current: "Ship subprocessor change notices without a trust center.",
    proposed: "Prepare vendor-change review packets before counsel review."
  },
  {
    label: "Hero copy",
    current: "NoticeKit turns vendor changes into customer-ready notice copy, objection-window tracking, and an evidence log your attorney can review.",
    proposed: "NoticeKit turns vendor changes into review-ready notice packets, objection-window tracking, and evidence logs privacy advisors can hand off cleanly."
  },
  {
    label: "Comparison row",
    current: "Creates the operating workflow a founder can use before buying hosted tooling.",
    proposed: "Creates the operating workflow a privacy advisor, operator, or founder can run before buying hosted tooling."
  },
  {
    label: "Bottom CTA headline",
    current: "Founder with a vendor change this month?",
    proposed: "Advisor or operator cleaning up a vendor change this month?"
  },
  {
    label: "Bottom CTA copy",
    current: "Send the vendor name, your current subprocessor page, and the customer segment affected. NoticeKit is prioritizing founder/operator workflows before consultant channels.",
    proposed: "Send the vendor name, current subprocessor page, and affected customer segment. NoticeKit can package the facts, notice draft, and evidence trail before counsel or client review."
  },
  {
    label: "Bottom CTA button",
    current: "Buy founder review",
    proposed: "Buy advisor review"
  }
];

function extractFeedbackSignals(text) {
  const sourceTagMatches = [...text.matchAll(/Source tag:\s*([^\n|]+)/g)];
  const ownershipMatches = [...text.matchAll(/Ownership:\s*([^\n|]+)/g)];

  const sourceTags = sourceTagMatches.map((match) => match[1].trim());
  const ownershipSignals = ownershipMatches.map((match) => match[1].trim().toLowerCase());
  const founderFollowUpReplies = sourceTags.filter((value) => value === "founder-follow-up").length;
  const advisorFollowUpReplies = sourceTags.filter((value) => value === "advisor-follow-up").length;
  const taggedSelfAuditReplies = founderFollowUpReplies + advisorFollowUpReplies;

  return {
    sourceTags,
    founderFollowUpReplies,
    advisorFollowUpReplies,
    taggedSelfAuditReplies,
    founderOwnership: ownershipSignals.filter((value) => ["founder", "operator", "ops"].includes(value)).length,
    advisorOwnership: ownershipSignals.filter((value) => ["privacy consultant", "consultant", "fractional dpo", "dpo", "attorney", "lawyer"].includes(value)).length
  };
}

function buildTargetBlock(homepageText) {
  return COPY_TARGETS.map((target) => {
    const present = homepageText.includes(target.current) ? "present" : "missing";
    return [
      `- ${target.label}: ${present}`,
      `  Current: "${target.current}"`,
      `  Proposed: "${target.proposed}"`
    ].join("\n");
  }).join("\n");
}

async function main() {
  const [feedbackText, homepageText] = await Promise.all([
    readFile(FEEDBACK_FILE, "utf8"),
    readFile(HOMEPAGE_FILE, "utf8")
  ]);

  const now = new Date().toISOString().slice(0, 10);
  const signals = extractFeedbackSignals(feedbackText);
  const queueTriggered = signals.advisorOwnership > signals.founderOwnership && signals.advisorOwnership > 0;

  const output = [
    "# Homepage Copy Refresh Queue",
    "",
    `Date: ${now}`,
    "",
    "## Status",
    "",
    `- Trigger state: ${queueTriggered ? "queued now" : "stand by"}`,
    `- Tagged self-audit replies logged: ${signals.taggedSelfAuditReplies} total (${signals.founderFollowUpReplies} founder-follow-up, ${signals.advisorFollowUpReplies} advisor-follow-up)`,
    `- Ownership signals: ${signals.founderOwnership} founder/operator, ${signals.advisorOwnership} consultant/attorney`,
    "- Decision rule: queue this refresh only when consultant/attorney ownership signals exceed founder/operator ownership signals.",
    "",
    "## Why This Exists",
    "",
    "- The backlog calls for a homepage copy refresh queue when tagged self-audit replies lean advisor-heavy.",
    "- This file turns that trigger into a concrete edit brief instead of leaving it as a note inside `VALIDATION-STATUS.md`.",
    "",
    "## Current Founder-First Copy To Revisit",
    "",
    buildTargetBlock(homepageText),
    "",
    "## Execution Plan",
    "",
    queueTriggered
      ? "- Update the homepage hero, comparison row, and bottom CTA toward advisor handoff language before sending more founder expansion."
      : "- Keep the current homepage copy until advisor-heavy ownership signals are real. Rebuild this file after every tagged self-audit reply or follow-up status change.",
    queueTriggered
      ? "- Preserve the operational-not-legal framing while shifting the lead message toward review-ready packets, consultant handoff, and attorney-review prep."
      : "- Do not pivot the homepage based on silence, clicks, or untagged replies.",
    queueTriggered
      ? "- Re-run `npm run build:validation-status` after the homepage refresh ships so the status file reflects the queue closure."
      : "- Once the trigger flips, use the proposed replacements in this file as the first-pass homepage change brief.",
    ""
  ].join("\n");

  await writeFile(OUTPUT_FILE, output);
  console.log(`Wrote ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
