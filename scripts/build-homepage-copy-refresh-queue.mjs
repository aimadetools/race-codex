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
    current: "For SaaS teams answering buyer AI security questionnaires",
    proposed: "For advisors and lean SaaS teams cleaning up buyer AI reviews"
  },
  {
    label: "Hero headline",
    current: "Answer the buyer's AI questionnaire without turning one deal into a month-long cleanup project.",
    proposed: "Package the buyer's AI questionnaire into a review-ready handoff before the thread spreads."
  },
  {
    label: "Hero copy",
    current: "NoticeKit is for the SaaS team answering the buyer's AI questionnaire, not for the buyer sending it. Start with three jobs only: get one answer out now, organize the facts before drafting, or build reusable files for repeat review. If the blocker is still fuzzy, open the route chooser first. The free builder already handles up to 50 real buyer rows pasted from a spreadsheet or portal grid, plus CSV, TSV, and Excel uploads, then turns one fact pass into a copy-ready answer, reviewer note, response pack, downloadable response workbook, and portable JSON draft.",
    proposed: "NoticeKit helps founders, operators, consultants, and counsel package one live buyer AI review into the smallest credible handoff: one answer now, a fact inventory, or reusable review files. If the blocker is still fuzzy, open the route chooser first. The free builder still handles up to 50 buyer rows pasted from a spreadsheet or portal grid, plus CSV, TSV, and Excel uploads, then turns one fact pass into a copy-ready answer, reviewer note, response pack, downloadable response workbook, and portable JSON draft."
  },
  {
    label: "Comparison row",
    current: "Creates the operating workflow a founder can use before buying hosted tooling.",
    proposed: "Creates the operating workflow an advisor, operator, or founder can run before buying hosted tooling."
  },
  {
    label: "Primary blocker CTA headline",
    current: "Already know the blocker?",
    proposed: "Already know where the review is stuck?"
  },
  {
    label: "Primary blocker CTA copy",
    current: "Use Starter for one answer now, Pro for repeat review, and Audit when the thread needs judgment instead of another paragraph.",
    proposed: "Use Starter for one answer, Pro for repeat review, and Audit when the founder, advisor, or counsel thread needs judgment instead of another paragraph."
  },
  {
    label: "Primary blocker CTA button",
    current: "Open AI deal blocker path",
    proposed: "Open AI review blocker path"
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
    "## Current Homepage Copy To Revisit",
    "",
    buildTargetBlock(homepageText),
    "",
    "## Execution Plan",
    "",
    queueTriggered
      ? "- Update the homepage hero, comparison row, and primary blocker CTA toward advisor-handoff AI review language before more expansion."
      : "- Keep the current homepage copy until advisor-heavy ownership signals are real. Rebuild this file after every tagged self-audit reply or follow-up status change.",
    queueTriggered
      ? "- Preserve the receiver-side AI questionnaire framing while shifting the lead message toward review-ready handoff, consultant context, and counsel-facing prep."
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
