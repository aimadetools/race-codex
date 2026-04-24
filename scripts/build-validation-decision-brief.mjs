#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const OUTPUT = join(ROOT, "VALIDATION-DECISION-BRIEF.md");
const GATE_DATE = "2026-04-27";
const FOLLOW_UP_FILES = {
  founder: join(ROOT, "BUYER-VALIDATION-FOUNDER-FOLLOW-UP-PASS.md"),
  advisor: join(ROOT, "BUYER-VALIDATION-ADVISOR-FOLLOW-UP-PASS.md")
};
const BATCH_FILES = {
  founder: join(ROOT, "buyer-validation-outreach-batch-01.csv"),
  advisor: join(ROOT, "buyer-validation-outreach-batch-02.csv"),
  batch03: join(ROOT, "buyer-validation-outreach-batch-03.csv")
};
const FEEDBACK_FILE = join(ROOT, "COMMUNITY-FEEDBACK.md");
const INTERVIEW_LOG = join(ROOT, "buyer-validation-interview-log.csv");

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(current);
      current = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      current = "";
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((value) => value !== "")) {
      rows.push(row);
    }
  }

  const [header, ...dataRows] = rows;
  if (!header) {
    return [];
  }

  return dataRows.map((cells) => {
    const record = {};
    header.forEach((key, index) => {
      record[key.trim()] = (cells[index] || "").trim();
    });
    return record;
  });
}

function countByStatus(rows, statuses) {
  return rows.filter((row) => statuses.includes(String(row.status || "").trim())).length;
}

function extractFollowUpDate(text) {
  const match = text.match(/Follow-up date:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function parseDate(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function normalizeRows(rows) {
  return rows.filter((row) => Object.values(row).some((value) => String(value || "").trim() !== ""));
}

function extractSignals(text) {
  const sourceTagMatches = [...text.matchAll(/Source tag:\s*([^\n|]+)/g)];
  const ownershipMatches = [...text.matchAll(/Ownership:\s*([^\n|]+)/g)];
  const scoreBandMatches = [...text.matchAll(/Score band:\s*([^\n|]+)/g)];

  const sourceTags = sourceTagMatches.map((match) => match[1].trim());
  const ownershipSignals = ownershipMatches.map((match) => match[1].trim().toLowerCase());
  const scoreBands = scoreBandMatches.map((match) => match[1].trim());

  return {
    founderFollowUpReplies: sourceTags.filter((value) => value === "founder-follow-up").length,
    advisorFollowUpReplies: sourceTags.filter((value) => value === "advisor-follow-up").length,
    founderOwnership: ownershipSignals.filter((value) => ["founder", "operator", "ops"].includes(value)).length,
    advisorOwnership: ownershipSignals.filter((value) => ["privacy consultant", "consultant", "fractional dpo", "dpo", "attorney", "lawyer"].includes(value)).length,
    lowScores: scoreBands.filter((value) => value === "0-4").length,
    mediumScores: scoreBands.filter((value) => value === "5-7").length,
    highScores: scoreBands.filter((value) => value === "8-10").length
  };
}

function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

const today = new Date().toISOString().slice(0, 10);
const [
  founderBatchText,
  advisorBatchText,
  batch03Text,
  founderFollowUpText,
  advisorFollowUpText,
  feedbackText,
  interviewText
] = await Promise.all([
  readFile(BATCH_FILES.founder, "utf8"),
  readFile(BATCH_FILES.advisor, "utf8"),
  readFile(BATCH_FILES.batch03, "utf8"),
  readFile(FOLLOW_UP_FILES.founder, "utf8"),
  readFile(FOLLOW_UP_FILES.advisor, "utf8"),
  readFile(FEEDBACK_FILE, "utf8"),
  readFile(INTERVIEW_LOG, "utf8")
]);

const founderRows = parseCsv(founderBatchText);
const advisorRows = parseCsv(advisorBatchText);
const batch03Rows = parseCsv(batch03Text);
const interviewRows = normalizeRows(parseCsv(interviewText));
const founderFollowUpDate = extractFollowUpDate(founderFollowUpText);
const advisorFollowUpDate = extractFollowUpDate(advisorFollowUpText);
const founderFollowUpDue = parseDate(founderFollowUpDate) !== "" && today >= parseDate(founderFollowUpDate);
const advisorFollowUpDue = parseDate(advisorFollowUpDate) !== "" && today >= parseDate(advisorFollowUpDate);
const founderWaiting = countByStatus(founderRows, ["sent"]);
const advisorWaiting = countByStatus(advisorRows, ["sent"]);
const founderReplies = countByStatus(founderRows, ["replied_positive", "replied_negative", "bounced", "interview_completed"]);
const advisorReplies = countByStatus(advisorRows, ["replied_positive", "replied_negative", "bounced", "interview_completed"]);
const founderFollowedUp = countByStatus(founderRows, ["followed_up"]);
const advisorFollowedUp = countByStatus(advisorRows, ["followed_up"]);
const batch03Ready = countByStatus(batch03Rows, ["ready_for_send"]);
const signals = extractSignals(feedbackText);
const gateOpen = today >= GATE_DATE;
const shouldQueueAdvisorPivot = signals.advisorOwnership > signals.founderOwnership && signals.advisorOwnership > 0;

const recommendedActions = [];
let triggerState = "stand by";
let positioningRead = "Founder-first remains the default until real replies or score-tagged async feedback say otherwise.";

if (!gateOpen) {
  recommendedActions.push(`Stand by until ${GATE_DATE} UTC; keep monitoring \`COMMUNITY-FEEDBACK.md\` and convert any real reply into an interview.`);
} else {
  triggerState = "decision window open";

  if (founderFollowUpDue && founderWaiting > 0) {
    recommendedActions.push(`Send the founder non-responder follow-up pass for ${pluralize(founderWaiting, "remaining batch 01 contact")}.`);
  }

  if (advisorFollowUpDue && advisorWaiting > 0) {
    recommendedActions.push(`Send the advisor non-responder follow-up pass for ${pluralize(advisorWaiting, "remaining batch 02 contact")}.`);
  }

  if (founderReplies === 0 && batch03Ready > 0) {
    recommendedActions.push(`Unlock founder batch 03 because founder/operator replies are still zero; ${pluralize(batch03Ready, "contingency target")} are ready.`);
  }

  if (shouldQueueAdvisorPivot) {
    recommendedActions.push("Queue the advisor-handoff homepage copy refresh because consultant/attorney ownership signals exceed founder/operator ownership signals.");
  }

  if (signals.founderFollowUpReplies === 0 && signals.advisorFollowUpReplies === 0 && founderReplies === 0 && advisorReplies === 0) {
    recommendedActions.push("If the follow-up pass also produces no replies, pause further expansion and reassess the buyer before more build work.");
    positioningRead = "No meaningful signal yet. Follow-up replies, not more product work, should decide the next branch.";
  } else if (shouldQueueAdvisorPivot) {
    positioningRead = "Advisor ownership is currently stronger than founder ownership. Prepare the advisor-first handoff branch before more founder expansion.";
  } else if (signals.lowScores > 0 || founderReplies > 0) {
    positioningRead = "Founder pain remains plausible. Keep the founder-first positioning unless later tagged replies flip ownership toward advisors.";
  }
}

if (recommendedActions.length === 0) {
  recommendedActions.push("No new action unlocked. Keep monitoring replies and keep the current positioning.");
}

const output = [
  "# Validation Decision Brief",
  "",
  `Date: ${today}`,
  `Decision window opens: ${GATE_DATE} UTC`,
  `Trigger state: ${triggerState}`,
  `Recommended action headline: ${recommendedActions[0]}`,
  "",
  "## Signal Snapshot",
  "",
  `- Founder batch 01 reply/bounce/interview rows: ${founderReplies}`,
  `- Advisor batch 02 reply/bounce/interview rows: ${advisorReplies}`,
  `- Founder contacts still awaiting follow-up or reply: ${founderWaiting}`,
  `- Advisor contacts still awaiting follow-up or reply: ${advisorWaiting}`,
  `- Founder follow-ups already sent: ${founderFollowedUp}`,
  `- Advisor follow-ups already sent: ${advisorFollowedUp}`,
  `- Tagged self-audit replies: ${signals.founderFollowUpReplies + signals.advisorFollowUpReplies} (${signals.founderFollowUpReplies} founder-follow-up, ${signals.advisorFollowUpReplies} advisor-follow-up)`,
  `- Score bands: ${signals.lowScores} low, ${signals.mediumScores} medium, ${signals.highScores} high`,
  `- Ownership signals: ${signals.founderOwnership} founder/operator, ${signals.advisorOwnership} consultant/attorney`,
  `- Interview log rows: ${interviewRows.length}`,
  "",
  "## Recommended Actions",
  "",
  ...recommendedActions.map((action) => `- ${action}`),
  "",
  "## Positioning Read",
  "",
  `- ${positioningRead}`,
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
