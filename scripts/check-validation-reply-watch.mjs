#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const FEEDBACK_FILE = join(ROOT, "COMMUNITY-FEEDBACK.md");
const OUTPUT_FILE = join(ROOT, "VALIDATION-REPLY-WATCH.md");
const FOLLOW_UP_FILES = [
  { label: "Founder follow-up pass", path: join(ROOT, "BUYER-VALIDATION-FOUNDER-FOLLOW-UP-PASS.md"), type: "founder" },
  { label: "Advisor follow-up pass", path: join(ROOT, "BUYER-VALIDATION-ADVISOR-FOLLOW-UP-PASS.md"), type: "advisor" },
  { label: "Benchmark outreach follow-up pass", path: join(ROOT, "BENCHMARK-OUTREACH-FOLLOW-UP-PASS.md"), type: "benchmark" },
  { label: "AI agent review follow-up pass", path: join(ROOT, "AI-AGENT-REVIEW-OUTREACH-FOLLOW-UP-PASS.md"), type: "agent-review" }
];
const BATCH_FILES = [
  { label: "Founder/operator batch 01", path: join(ROOT, "buyer-validation-outreach-batch-01.csv"), type: "founder" },
  { label: "Advisor batch 02", path: join(ROOT, "buyer-validation-outreach-batch-02.csv"), type: "advisor" },
  { label: "Contingency batch 03", path: join(ROOT, "buyer-validation-outreach-batch-03.csv"), type: "contingency-03" },
  { label: "Contingency batch 04", path: join(ROOT, "buyer-validation-outreach-batch-04.csv"), type: "contingency-04" },
  { label: "Benchmark outreach batch 01", path: join(ROOT, "ai-benchmark-outreach-batch-01.csv"), type: "benchmark" },
  { label: "AI agent review batch 01", path: join(ROOT, "ai-agent-review-outreach-batch-01.csv"), type: "agent-review" },
  { label: "AI audit outreach batch 01", path: join(ROOT, "ai-audit-outreach-batch-01.csv"), type: "audit" }
];
const INTERVIEW_LOG = join(ROOT, "buyer-validation-interview-log.csv");
const GATE_DATE = "2026-04-27";
const AUDIT_SECOND_TOUCH_EXHAUSTION_DATE = "2026-06-08";

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
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
        i += 1;
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

function extractFollowUpDate(text) {
  const match = text.match(/Follow-up date:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function countReplies(rows) {
  return rows.filter((row) => ["replied_positive", "replied_negative", "bounced", "interview_completed"].includes(String(row.status || "").trim())).length;
}

function countWaiting(rows) {
  return rows.filter((row) => ["sent", "followed_up"].includes(String(row.status || "").trim())).length;
}

function countPendingFollowUps(rows) {
  return rows.filter((row) => String(row.status || "").trim() === "sent").length;
}

function countByStatus(rows, statuses) {
  return rows.filter((row) => statuses.includes(String(row.status || "").trim())).length;
}

function parseDate(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function describeFollowUpStatus(label, due, pending, followedUp) {
  if (followedUp > 0 && pending === 0) {
    return `- ${label}: completed; due was ${due}`;
  }

  if (pending > 0) {
    return `- ${label}: due ${due}; ${pending} row(s) still pending follow-up`;
  }

  return `- ${label}: ${due === "unknown" ? "status unknown" : `due ${due}; no active follow-up rows remain`}`;
}

function extractAuditFollowUpDate(rows) {
  const dueDates = rows
    .filter((row) => String(row.status || "").trim() === "sent")
    .map((row) => parseDate(String(row.notes || "").match(/Follow-up due\s+([^\n.]+)/i)?.[1] || ""))
    .filter(Boolean)
    .sort();

  return dueDates[0] || "unknown";
}

function describeAuditFollowUpStatus(due, pending, followedUp, today) {
  if (followedUp > 0 && pending === 0) {
    if (today >= AUDIT_SECOND_TOUCH_EXHAUSTION_DATE) {
      return `- AI audit follow-up readiness: second touch already sent; if replies are still zero on ${AUDIT_SECOND_TOUCH_EXHAUSTION_DATE} UTC, park the batch until a new offer or segment decision exists.`;
    }
    return "- AI audit follow-up readiness: second touch already sent; monitor the followed-up audit rows for the first real reply, redirect, or intake.";
  }

  if (pending > 0) {
    return `- AI audit follow-up readiness: due ${due}; ${pending} row(s) still pending follow-up.`;
  }

  return `- AI audit follow-up readiness: ${due === "unknown" ? "status unknown" : `due ${due}; no active follow-up rows remain.`}`;
}

function hasFollowUpType(followUps, type) {
  return followUps.some((item) => item.type === type);
}

function findFollowUpDue(followUps, type) {
  return followUps.find((item) => item.type === type)?.due || "the due date";
}

function extractSignals(text) {
  const channelMatches = [...text.matchAll(/Channel:\s*([^\n|]+)/g)];
  const ownershipMatches = [...text.matchAll(/Ownership:\s*([^\n|]+)/g)];
  const ownershipSignals = ownershipMatches.map((match) => match[1].trim().toLowerCase());
  const channels = channelMatches.map((match) => match[1].trim().toLowerCase());

  return {
    channels,
    inPageFormChannels: channels.filter((value) => ["in-page-form", "inline-form", "self-audit-form", "form"].includes(value)).length,
    mailtoChannels: channels.filter((value) => ["mailto", "email", "mail-forward", "email-forward", "forwarded-email"].includes(value)).length,
    founderOwnership: ownershipSignals.filter((value) => ["founder", "operator", "ops"].includes(value)).length,
    advisorOwnership: ownershipSignals.filter((value) => ["privacy consultant", "consultant", "fractional dpo", "dpo", "attorney", "lawyer"].includes(value)).length
  };
}

function hasNoReplyNote(text, segment) {
  const pattern = segment === "founder"
    ? /no founder\/operator replies have been posted here yet(?: across the active outreach batches)?\./i
    : /no advisor replies have been posted here yet\./i;
  return pattern.test(text);
}

function buildActionQueue({
  totalReplyRows,
  parsedInterviews,
  followUps,
  dueFollowUps,
  today,
  founderReplies,
  founderPendingFollowUps,
  advisorPendingFollowUps,
  benchmarkPendingFollowUps,
  agentReviewPendingFollowUps,
  auditPendingFollowUps,
  benchmarkFollowedUp,
  agentReviewFollowedUp,
  auditFollowedUp,
  auditFollowUpDate,
  contingencyReady,
  contingencyTwoReady,
  signals
}) {
  const actions = [];

  if (totalReplyRows > 0 || parsedInterviews.length > 0) {
    actions.push("Review `COMMUNITY-FEEDBACK.md` and convert any real reply into an interview.");
    return actions;
  }

  if (followUps.some((item) => item.due === "unknown")) {
    actions.push("Rebuild the follow-up passes because at least one due date could not be parsed.");
    return actions;
  }

  if (dueFollowUps.length > 0) {
    const founderDue = hasFollowUpType(dueFollowUps, "founder") && founderPendingFollowUps > 0;
    const advisorDue = hasFollowUpType(dueFollowUps, "advisor") && advisorPendingFollowUps > 0;
    const benchmarkDue = hasFollowUpType(dueFollowUps, "benchmark") && benchmarkPendingFollowUps > 0;
    const agentReviewDue = hasFollowUpType(dueFollowUps, "agent-review") && agentReviewPendingFollowUps > 0;

    if (founderDue || advisorDue) {
      actions.push("Run `npm run check:self-audit-follow-up` and confirm `SELF-AUDIT-FOLLOW-UP-QA.md` is passing before any non-responder follow-up send.");
    }

    if (founderDue) {
      actions.push("Dry-run the founder follow-up queue with `node scripts/send-validation-batch.mjs --batch 01 --follow-up --limit 5 --transport resend`.");
      actions.push("Send the founder follow-up queue with `node scripts/send-validation-batch.mjs --batch 01 --follow-up --limit 5 --send --transport resend`.");
    }

    if (advisorDue) {
      actions.push("Dry-run the advisor follow-up queue with `node scripts/send-validation-batch.mjs --batch 02 --follow-up --limit 5 --transport resend`.");
      actions.push("Send the advisor follow-up queue with `node scripts/send-validation-batch.mjs --batch 02 --follow-up --limit 5 --send --transport resend`.");
    }

    if (benchmarkDue) {
      actions.push("Dry-run the combined AI outreach follow-up gate with `npm run run:ai-outreach-follow-up-gate -- --transport resend`.");
      actions.push("Send the combined AI outreach follow-up gate with `npm run run:ai-outreach-follow-up-gate -- --send --transport resend`.");
    }

    if (agentReviewDue && !benchmarkDue) {
      actions.push("Dry-run the AI agent review follow-up queue with `node scripts/send-ai-agent-review-outreach.mjs --follow-up --limit 5 --transport resend`.");
      actions.push("Send the AI agent review follow-up queue with `node scripts/send-ai-agent-review-outreach.mjs --follow-up --limit 5 --send --transport resend`.");
    }
  }

  if (auditPendingFollowUps > 0 && auditFollowUpDate !== "unknown" && today >= auditFollowUpDate) {
    actions.push("Dry-run the AI audit follow-up queue with `node scripts/send-ai-audit-outreach.mjs --follow-up --limit 5 --transport resend`.");
    actions.push("Send the AI audit follow-up queue with `node scripts/send-ai-audit-outreach.mjs --follow-up --limit 5 --send --transport resend`.");
  }

  if (today >= GATE_DATE && founderReplies === 0 && contingencyReady > 0) {
    actions.push(`Founder batch 03 is unlocked; ${contingencyReady} contingency targets are ready after the no-reply check.`);
    actions.push("Dry-run founder batch 03 with `node scripts/send-validation-batch.mjs --batch 03 --limit 5 --transport resend`.");
  } else if (today >= GATE_DATE && founderReplies === 0 && contingencyReady === 0 && contingencyTwoReady > 0) {
    actions.push(`Founder batch 04 is unlocked; ${contingencyTwoReady} contingency targets are ready because batch 03 is exhausted and founder replies are still zero.`);
    actions.push("Dry-run founder batch 04 with `node scripts/send-validation-batch.mjs --batch 04 --limit 5 --transport resend`.");
  }

  if (today >= GATE_DATE && signals.advisorOwnership > signals.founderOwnership && signals.advisorOwnership > 0) {
    actions.push("Advisor ownership signals are stronger than founder signals; queue the homepage advisor-handoff copy refresh.");
  }

  if (actions.length === 0) {
    actions.push("Keep monitoring `COMMUNITY-FEEDBACK.md` and the contact inbox for replies from the active outreach batches.");
    if (
      benchmarkPendingFollowUps === 0 &&
      agentReviewPendingFollowUps === 0 &&
      auditPendingFollowUps === 0 &&
      (benchmarkFollowedUp > 0 || agentReviewFollowedUp > 0 || auditFollowedUp > 0)
    ) {
      actions.push("Check `BENCHMARK-OUTREACH-STATUS.md`, `AI-AGENT-REVIEW-OUTREACH-STATUS.md`, `AI-AUDIT-OUTREACH-STATUS.md`, and the Blob inbox for the first reply, redirect, teardown, or intake from the followed-up lanes.");
    } else if (auditPendingFollowUps > 0) {
      actions.push("Check `AI-AUDIT-OUTREACH-STATUS.md` and the Blob inbox for the first reply, redirect, or intake from the June 3 audit send before the June 5 follow-up date.");
    }
  }

  return actions;
}

function buildUpcomingQueue({
  totalReplyRows,
  parsedInterviews,
  followUps,
  today,
  founderWaiting,
  advisorWaiting,
  founderReplies,
  founderPendingFollowUps,
  advisorPendingFollowUps,
  benchmarkPendingFollowUps,
  agentReviewPendingFollowUps,
  auditPendingFollowUps,
  auditFollowUpDate,
  contingencyReady,
  contingencyTwoReady,
  signals
}) {
  if (totalReplyRows > 0 || parsedInterviews.length > 0) {
    return [];
  }

  const upcoming = [];
  const futureFollowUps = followUps.filter((item) => {
    const dueDate = parseDate(item.due);
    return dueDate && today < dueDate;
  });

  if (futureFollowUps.length > 0) {
    upcoming.push("Before the next due follow-up window, keep `SELF-AUDIT-FOLLOW-UP-QA.md` current with `npm run check:self-audit-follow-up`.");

    const founderDue = hasFollowUpType(futureFollowUps, "founder");
    const advisorDue = hasFollowUpType(futureFollowUps, "advisor");
    const benchmarkDue = hasFollowUpType(futureFollowUps, "benchmark");
    const agentReviewDue = hasFollowUpType(futureFollowUps, "agent-review");

    if (founderDue && founderPendingFollowUps > 0) {
      const dueDate = findFollowUpDue(futureFollowUps, "founder");
      upcoming.push(`On ${dueDate}, dry-run founder follow-ups with \`node scripts/send-validation-batch.mjs --batch 01 --follow-up --limit 5 --transport resend\`.`);
      upcoming.push(`On ${dueDate}, send founder follow-ups with \`node scripts/send-validation-batch.mjs --batch 01 --follow-up --limit 5 --send --transport resend\` if replies are still zero.`);
    }

    if (advisorDue && advisorPendingFollowUps > 0) {
      const dueDate = findFollowUpDue(futureFollowUps, "advisor");
      upcoming.push(`On ${dueDate}, dry-run advisor follow-ups with \`node scripts/send-validation-batch.mjs --batch 02 --follow-up --limit 5 --transport resend\`.`);
      upcoming.push(`On ${dueDate}, send advisor follow-ups with \`node scripts/send-validation-batch.mjs --batch 02 --follow-up --limit 5 --send --transport resend\` if replies are still zero.`);
    }

    if (benchmarkDue && benchmarkPendingFollowUps > 0) {
      const dueDate = findFollowUpDue(futureFollowUps, "benchmark");
      upcoming.push(`On ${dueDate}, dry-run the combined AI outreach follow-up gate with \`npm run run:ai-outreach-follow-up-gate -- --transport resend\`.`);
      upcoming.push(`On ${dueDate}, send the combined AI outreach follow-up gate with \`npm run run:ai-outreach-follow-up-gate -- --send --transport resend\` if replies are still zero.`);
    }

    if (agentReviewDue && agentReviewPendingFollowUps > 0 && !benchmarkDue) {
      const dueDate = findFollowUpDue(futureFollowUps, "agent-review");
      upcoming.push(`On ${dueDate}, dry-run AI agent review follow-ups with \`node scripts/send-ai-agent-review-outreach.mjs --follow-up --limit 5 --transport resend\`.`);
      upcoming.push(`On ${dueDate}, send AI agent review follow-ups with \`node scripts/send-ai-agent-review-outreach.mjs --follow-up --limit 5 --send --transport resend\` if replies are still zero.`);
    }
  }

  if (auditPendingFollowUps > 0 && auditFollowUpDate !== "unknown" && today < auditFollowUpDate) {
    upcoming.push(`On ${auditFollowUpDate}, dry-run AI audit follow-ups with \`node scripts/send-ai-audit-outreach.mjs --follow-up --limit 5 --transport resend\`.`);
    upcoming.push(`On ${auditFollowUpDate}, send AI audit follow-ups with \`node scripts/send-ai-audit-outreach.mjs --follow-up --limit 5 --send --transport resend\` if replies are still zero.`);
  }

  if (today < GATE_DATE && founderReplies === 0 && contingencyReady > 0) {
    upcoming.push(`If founder replies are still zero on ${GATE_DATE} UTC, founder batch 03 unlocks with ${contingencyReady} ready target(s).`);
    upcoming.push("When that gate opens, dry-run founder batch 03 with `node scripts/send-validation-batch.mjs --batch 03 --limit 5 --transport resend`.");
  }

  if (today < GATE_DATE && founderReplies === 0 && contingencyTwoReady > 0) {
    upcoming.push(`Batch 04 remains a second contingency queue with ${contingencyTwoReady} ready target(s), but only after batch 03 is exhausted and founder replies are still zero.`);
  }

  if (today < GATE_DATE && signals.advisorOwnership > signals.founderOwnership && signals.advisorOwnership > 0) {
    upcoming.push(`If advisor ownership stays ahead through ${GATE_DATE} UTC, queue the homepage advisor-handoff copy refresh after the follow-up pass.`);
  }

  if (signals.inPageFormChannels > signals.mailtoChannels) {
    upcoming.push("The in-page self-audit form now outperforms mailto; prefer the on-page form in founder/advisor follow-up copy and keep email as fallback.");
  }

  return upcoming;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const [feedbackText, interviewRows, ...texts] = await Promise.all([
    readFile(FEEDBACK_FILE, "utf8"),
    readFile(INTERVIEW_LOG, "utf8"),
    ...BATCH_FILES.map((batch) => readFile(batch.path, "utf8")),
    ...FOLLOW_UP_FILES.map((file) => readFile(file.path, "utf8").catch(() => ""))
  ]);

  const batchTexts = texts.slice(0, BATCH_FILES.length);
  const followUpTexts = texts.slice(BATCH_FILES.length);
  const parsedBatches = batchTexts.map((text, index) => ({
    ...BATCH_FILES[index],
    rows: parseCsv(text)
  }));
  const parsedInterviews = parseCsv(interviewRows).filter((row) => Object.values(row).some((value) => String(value || "").trim() !== ""));
  const followUps = followUpTexts.map((text, index) => ({
    ...FOLLOW_UP_FILES[index],
    due: extractFollowUpDate(text)
  }));
  const totalReplyRows = parsedBatches.reduce((total, batch) => total + countReplies(batch.rows), 0);
  const founderReplies = countReplies(parsedBatches[0].rows);
  const advisorReplies = countReplies(parsedBatches[1].rows);
  const contingencyReady = parsedBatches[2].rows.filter((row) => String(row.status || "").trim() === "ready_for_send").length;
  const contingencyTwoReady = parsedBatches[3].rows.filter((row) => String(row.status || "").trim() === "ready_for_send").length;
  const noFounderRepliesPosted = hasNoReplyNote(feedbackText, "founder");
  const noAdvisorRepliesPosted = hasNoReplyNote(feedbackText, "advisor");
  const noRepliesPosted = noFounderRepliesPosted && noAdvisorRepliesPosted;
  const signals = extractSignals(feedbackText);
  const today = new Date().toISOString().slice(0, 10);
  const dueFollowUps = followUps.filter((item) => {
    const dueDate = parseDate(item.due);
    return dueDate && today >= dueDate;
  });
  const founderWaiting = countWaiting(parsedBatches[0].rows);
  const advisorWaiting = countWaiting(parsedBatches[1].rows);
  const founderPendingFollowUps = countPendingFollowUps(parsedBatches[0].rows);
  const advisorPendingFollowUps = countPendingFollowUps(parsedBatches[1].rows);
  const benchmarkPendingFollowUps = countPendingFollowUps(parsedBatches[4].rows);
  const agentReviewPendingFollowUps = countPendingFollowUps(parsedBatches[5].rows);
  const auditPendingFollowUps = countPendingFollowUps(parsedBatches[6].rows);
  const founderFollowedUp = countByStatus(parsedBatches[0].rows, ["followed_up"]);
  const advisorFollowedUp = countByStatus(parsedBatches[1].rows, ["followed_up"]);
  const benchmarkFollowedUp = countByStatus(parsedBatches[4].rows, ["followed_up"]);
  const agentReviewFollowedUp = countByStatus(parsedBatches[5].rows, ["followed_up"]);
  const auditFollowedUp = countByStatus(parsedBatches[6].rows, ["followed_up"]);
  const auditFollowUpDate = extractAuditFollowUpDate(parsedBatches[6].rows);

  const lines = [
    "# Validation Reply Watch",
    "",
    ...parsedBatches.map((batch) => `- ${batch.label} replies, bounces, or interview rows recorded in CSV: ${countReplies(batch.rows)}`),
    `- Interview log rows: ${parsedInterviews.length}`,
    ...parsedBatches.map((batch) => `- ${batch.label} sent or followed-up rows still waiting for replies: ${countWaiting(batch.rows)}`),
    `- Community feedback note: ${noRepliesPosted ? "no replies from the active outreach batches have been posted yet." : "replies are present and need review."}`,
    `- Self-audit channels logged: ${signals.channels.length} (${signals.inPageFormChannels} in-page-form, ${signals.mailtoChannels} mailto)`,
    describeFollowUpStatus(followUps[0].label, followUps[0].due, founderPendingFollowUps, founderFollowedUp),
    describeFollowUpStatus(followUps[1].label, followUps[1].due, advisorPendingFollowUps, advisorFollowedUp),
    describeFollowUpStatus(followUps[2].label, followUps[2].due, benchmarkPendingFollowUps, benchmarkFollowedUp),
    describeFollowUpStatus(followUps[3].label, followUps[3].due, agentReviewPendingFollowUps, agentReviewFollowedUp),
    describeAuditFollowUpStatus(auditFollowUpDate, auditPendingFollowUps, auditFollowedUp, today),
    "",
    "## Next Action",
    ""
  ];

  const actionQueue = buildActionQueue({
    totalReplyRows,
    parsedInterviews,
    followUps,
    dueFollowUps,
    today,
    founderReplies,
    founderPendingFollowUps,
    advisorPendingFollowUps,
    benchmarkPendingFollowUps,
    agentReviewPendingFollowUps,
    auditPendingFollowUps,
    benchmarkFollowedUp,
    agentReviewFollowedUp,
    auditFollowedUp,
    auditFollowUpDate,
    contingencyReady,
    contingencyTwoReady,
    signals
  });

  lines.push(...actionQueue.map((action) => action.startsWith("- ") ? action : `- ${action}`));

  const upcomingQueue = buildUpcomingQueue({
    totalReplyRows,
    parsedInterviews,
    followUps,
    today,
    founderWaiting,
    advisorWaiting,
    founderReplies,
    founderPendingFollowUps,
    advisorPendingFollowUps,
    benchmarkPendingFollowUps,
    agentReviewPendingFollowUps,
    auditPendingFollowUps,
    auditFollowUpDate,
    contingencyReady,
    contingencyTwoReady,
    signals
  });

  if (upcomingQueue.length > 0) {
    lines.push("", "## Upcoming Queue", "");
    lines.push(...upcomingQueue.map((action) => action.startsWith("- ") ? action : `- ${action}`));
  }

  const output = `${lines.join("\n")}\n`;

  if (args.has("--write")) {
    await writeFile(OUTPUT_FILE, output, "utf8");
  }

  process.stdout.write(output);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
