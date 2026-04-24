#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const OUTPUT = join(ROOT, "VALIDATION-POSITIONING-BRIEF.md");
const FEEDBACK_FILE = join(ROOT, "COMMUNITY-FEEDBACK.md");
const INTERVIEW_LOG = join(ROOT, "buyer-validation-interview-log.csv");
const GATE_DATE = "2026-04-27";
const BROADENING_KEYWORDS = ["attorney", "counsel", "procurement", "handoff", "review packet", "packet", "review"];

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
  }).filter((row) => Object.values(row).some((value) => String(value || "").trim() !== ""));
}

function classifySegment(value) {
  const text = String(value || "").trim().toLowerCase();

  if (["founder/operator", "founder", "operator", "ops", "operations"].includes(text)) {
    return "founder";
  }

  if (["fractional dpo", "privacy consultant", "consultant", "attorney", "startup attorney", "lawyer"].includes(text)) {
    return "advisor";
  }

  if (text.includes("founder") || text.includes("operator") || text.includes("ops")) {
    return "founder";
  }

  if (text.includes("consult") || text.includes("dpo") || text.includes("attorney") || text.includes("lawyer")) {
    return "advisor";
  }

  return "unknown";
}

function parseInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function averageTotal(rows) {
  if (rows.length === 0) {
    return "0.0";
  }

  const total = rows.reduce((sum, row) => sum + parseInteger(row.total_score), 0);
  return (total / rows.length).toFixed(1);
}

function extractFeedbackSignals(text) {
  const entries = [...text.matchAll(/^- (.+)$/gm)].map((match) => match[1]);

  const summary = {
    founderAsyncReplies: 0,
    advisorAsyncReplies: 0,
    founderOwnership: 0,
    advisorOwnership: 0,
    lowScores: 0,
    mediumScores: 0,
    highScores: 0
  };

  for (const entry of entries) {
    const sourceTag = (entry.match(/Source tag:\s*([^\n|]+)/i)?.[1] || "").trim().toLowerCase();
    const ownership = (entry.match(/Ownership:\s*([^\n|]+)/i)?.[1] || "").trim().toLowerCase();
    const scoreBand = (entry.match(/Score band:\s*([^\n|]+)/i)?.[1] || "").trim();

    if (sourceTag === "founder-follow-up") {
      summary.founderAsyncReplies += 1;
    }

    if (sourceTag === "advisor-follow-up") {
      summary.advisorAsyncReplies += 1;
    }

    if (["founder", "operator", "ops"].includes(ownership)) {
      summary.founderOwnership += 1;
    }

    if (["privacy consultant", "consultant", "fractional dpo", "dpo", "attorney", "lawyer"].includes(ownership)) {
      summary.advisorOwnership += 1;
    }

    if (scoreBand === "0-4") {
      summary.lowScores += 1;
    } else if (scoreBand === "5-7") {
      summary.mediumScores += 1;
    } else if (scoreBand === "8-10") {
      summary.highScores += 1;
    }
  }

  return summary;
}

function countKeywordHits(rows) {
  return rows.reduce((count, row) => {
    const haystack = [
      row.trigger,
      row.current_workflow,
      row.notes,
      row.pay_or_referral_signal,
      row.next_step
    ].join(" ").toLowerCase();

    return count + BROADENING_KEYWORDS.filter((keyword) => haystack.includes(keyword)).length;
  }, 0);
}

function buildSegmentSummary(rows) {
  return {
    interviews: rows.length,
    positive: rows.filter((row) => String(row.validation_positive || "").trim() === "true").length,
    paySignals: rows.filter((row) => String(row.pay_or_referral_signal || "").trim() !== "").length,
    averageTotal: averageTotal(rows)
  };
}

function evidenceWeight(summary, asyncOwnership, asyncReplies) {
  return (summary.positive * 4) + (summary.paySignals * 2) + summary.interviews + asyncOwnership + asyncReplies;
}

const today = new Date().toISOString().slice(0, 10);
const [feedbackText, interviewText] = await Promise.all([
  readFile(FEEDBACK_FILE, "utf8"),
  readFile(INTERVIEW_LOG, "utf8")
]);

const interviewRows = parseCsv(interviewText);
const founderRows = interviewRows.filter((row) => classifySegment(row.segment) === "founder");
const advisorRows = interviewRows.filter((row) => classifySegment(row.segment) === "advisor");
const unknownRows = interviewRows.filter((row) => classifySegment(row.segment) === "unknown");
const founderSummary = buildSegmentSummary(founderRows);
const advisorSummary = buildSegmentSummary(advisorRows);
const feedbackSummary = extractFeedbackSignals(feedbackText);
const founderEvidence = evidenceWeight(founderSummary, feedbackSummary.founderOwnership, feedbackSummary.founderAsyncReplies);
const advisorEvidence = evidenceWeight(advisorSummary, feedbackSummary.advisorOwnership, feedbackSummary.advisorAsyncReplies);
const broadeningSignals = countKeywordHits(interviewRows);
const gateOpen = today >= GATE_DATE;

let triggerState = "stand by";
let branch = "founder-first hold";
let headline = `Stand by until ${GATE_DATE} UTC; wait for scored replies or interviews before changing positioning.`;
let reasoning = "There is not enough direct evidence yet to move away from the current founder-first message.";

if (gateOpen && founderSummary.interviews === 0 && advisorSummary.interviews === 0 && feedbackSummary.founderAsyncReplies === 0 && feedbackSummary.advisorAsyncReplies === 0) {
  triggerState = "pause and reassess";
  branch = "pause expansion";
  headline = "Follow-up window opened with no scored replies or interviews; pause more expansion until new evidence lands.";
  reasoning = "Silence is not a positioning win for either segment, so more build or list expansion would be low-signal.";
} else if (advisorEvidence > founderEvidence && advisorSummary.positive >= founderSummary.positive) {
  triggerState = "advisor evidence leads";
  branch = "advisor-first handoff";
  headline = "Advisor evidence is stronger than founder evidence; prepare the advisor-first handoff branch before more founder expansion.";
  reasoning = "Consultant, DPO, or attorney signals currently outweigh founder signals across interviews and tagged async replies.";
} else if (broadeningSignals >= 2 && (founderSummary.interviews + advisorSummary.interviews) > 0) {
  triggerState = "broaden narrative";
  branch = "vendor-change review packet";
  headline = "Interview language points beyond single notices; broaden the pitch to a vendor-change review packet while keeping subprocessor notices as the SEO wedge.";
  reasoning = "Multiple interview fields reference counsel handoff, procurement review, or packet-style preparation rather than a one-change notice alone.";
} else if (founderEvidence > 0 || founderSummary.positive > 0 || feedbackSummary.founderOwnership > 0) {
  triggerState = "founder evidence leads";
  branch = "founder-first";
  headline = "Founder evidence remains the strongest signal; keep founder-first positioning until advisor evidence overtakes it.";
  reasoning = "The current evidence still points to founders or operators as the most credible first buyer and workflow owner.";
}

const output = [
  "# Validation Positioning Brief",
  "",
  `Date: ${today}`,
  `Decision window opens: ${GATE_DATE} UTC`,
  `Trigger state: ${triggerState}`,
  `Recommended branch: ${branch}`,
  `Recommended headline: ${headline}`,
  "",
  "## Segment Scorecard",
  "",
  `- Founder/operator interviews: ${founderSummary.interviews}`,
  `- Founder/operator validation-positive interviews: ${founderSummary.positive}`,
  `- Founder/operator interviews with pay or referral signals: ${founderSummary.paySignals}`,
  `- Founder/operator average interview total score: ${founderSummary.averageTotal}`,
  `- Founder/operator tagged async replies: ${feedbackSummary.founderAsyncReplies}`,
  `- Founder/operator ownership signals from async replies: ${feedbackSummary.founderOwnership}`,
  `- Founder/operator evidence weight: ${founderEvidence}`,
  `- Advisor interviews: ${advisorSummary.interviews}`,
  `- Advisor validation-positive interviews: ${advisorSummary.positive}`,
  `- Advisor interviews with pay or referral signals: ${advisorSummary.paySignals}`,
  `- Advisor average interview total score: ${advisorSummary.averageTotal}`,
  `- Advisor tagged async replies: ${feedbackSummary.advisorAsyncReplies}`,
  `- Advisor ownership signals from async replies: ${feedbackSummary.advisorOwnership}`,
  `- Advisor evidence weight: ${advisorEvidence}`,
  `- Unknown-segment interview rows: ${unknownRows.length}`,
  "",
  "## Async Readiness Signals",
  "",
  `- Low score bands logged: ${feedbackSummary.lowScores}`,
  `- Medium score bands logged: ${feedbackSummary.mediumScores}`,
  `- High score bands logged: ${feedbackSummary.highScores}`,
  `- Broader handoff/procurement keyword hits in interview notes: ${broadeningSignals}`,
  "",
  "## Recommendation",
  "",
  `- ${headline}`,
  `- ${reasoning}`,
  "- Rebuild this brief after every recorded reply or interview so the founder-vs-advisor call stays evidence-backed.",
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
