const nodemailer = require("nodemailer");

const MAX_FIELD_LENGTH = 2000;
const BLOB_PREFIX = "contact-submissions";

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function clean(value) {
  return String(value || "").trim().slice(0, MAX_FIELD_LENGTH);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function createReferenceId(date = new Date()) {
  const stamp = date.toISOString().replace(/[-:]/g, "").slice(0, 15);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NK-${stamp}-${suffix}`;
}

function createStoragePath(submission) {
  const day = submission.submittedAt.slice(0, 10);
  return `${BLOB_PREFIX}/${day}/${submission.referenceId}.json`;
}

function buildNotificationBody(submission) {
  const details = [
    `Reference: ${submission.referenceId}`,
    `Request type: ${submission.type}`,
    `Company: ${submission.company}`,
    `Reply email: ${submission.email}`,
    `Submitted at: ${submission.submittedAt}`
  ];

  if (submission.type === "self_audit_feedback") {
    return [
      "NoticeKit self-audit feedback",
      "",
      ...details,
      `Source tag: ${submission.sourceTag || "site"}`,
      `Ownership: ${submission.ownershipSignal || "unknown"}`,
      `Score: ${submission.scoreDisplay || "Not provided"}`,
      `Score band: ${submission.scoreBand || "Not provided"}`,
      `Selected checks: ${(submission.selectedChecks || []).join(", ") || "Not provided"}`,
      `Top gaps: ${(submission.topGaps || []).join(", ") || "None"}`,
      "",
      "Optional note:",
      submission.reviewNeed || "Not provided",
      "",
      "Summary:",
      submission.summary || "Not provided"
    ].join("\n");
  }

  return [
    "NoticeKit contact intake",
    "",
    ...details,
    `Subprocessor page: ${submission.subprocessorUrl || "Not provided"}`,
    "",
    "Vendor change:",
    submission.vendorChange || "Not provided",
    "",
    "Customer segment and deadline:",
    submission.deadline || "Not provided",
    "",
    "Review needed:",
    submission.reviewNeed || "Not provided"
  ].join("\n");
}

function buildNotificationHtml(submission) {
  const rows =
    submission.type === "self_audit_feedback"
      ? [
          ["Reference", submission.referenceId],
          ["Request type", submission.type],
          ["Company", submission.company],
          ["Reply email", submission.email],
          ["Submitted at", submission.submittedAt],
          ["Source tag", submission.sourceTag || "site"],
          ["Ownership", submission.ownershipSignal || "unknown"],
          ["Score", submission.scoreDisplay || "Not provided"],
          ["Score band", submission.scoreBand || "Not provided"],
          ["Selected checks", (submission.selectedChecks || []).join(", ") || "Not provided"],
          ["Top gaps", (submission.topGaps || []).join(", ") || "None"],
          ["Optional note", submission.reviewNeed || "Not provided"],
          ["Summary", submission.summary || "Not provided"]
        ]
      : [
          ["Reference", submission.referenceId],
          ["Request type", submission.type],
          ["Company", submission.company],
          ["Reply email", submission.email],
          ["Submitted at", submission.submittedAt],
          ["Subprocessor page", submission.subprocessorUrl || "Not provided"],
          ["Vendor change", submission.vendorChange || "Not provided"],
          ["Customer segment and deadline", submission.deadline || "Not provided"],
          ["Review needed", submission.reviewNeed || "Not provided"]
        ];

  return [
    `<p>${submission.type === "self_audit_feedback" ? "NoticeKit self-audit feedback" : "NoticeKit contact intake"}</p>`,
    "<table cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;\">",
    ...rows.map(
      ([label, value]) =>
        `<tr><td style=\"padding:4px 12px 4px 0;font-weight:700;vertical-align:top;\">${label}</td><td style=\"padding:4px 0;vertical-align:top;\">${String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>`
    ),
    "</table>"
  ].join("");
}

async function forwardToWebhook(submission) {
  const webhookResponse = await fetch(process.env.CONTACT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.CONTACT_WEBHOOK_SECRET
        ? { authorization: `Bearer ${process.env.CONTACT_WEBHOOK_SECRET}` }
        : {})
    },
    body: JSON.stringify(submission)
  });

  if (!webhookResponse.ok) {
    throw new Error(`Webhook responded with ${webhookResponse.status}`);
  }
}

async function forwardToResend(submission) {
  const apiKey = String(process.env.RESEND_API_KEY || process.env.CONTACT_RESEND_API_KEY || "").trim();
  const recipient = String(process.env.CONTACT_NOTIFICATION_EMAIL || "hello@noticekit.tech").trim();
  const sender = String(process.env.CONTACT_RESEND_FROM || "NoticeKit <hello@noticekit.tech>").trim();

  if (!apiKey || !recipient) {
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": submission.referenceId
    },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject: `NoticeKit contact intake: ${submission.company} (${submission.type})`,
      text: buildNotificationBody(submission),
      html: buildNotificationHtml(submission),
      headers: {
        "Reply-To": submission.email
      }
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend responded with ${response.status}: ${details.slice(0, 200)}`);
  }
}

function buildSmtpTransport() {
  const smtpUrl = String(process.env.CONTACT_SMTP_URL || "").trim();
  const smtpHost = String(process.env.CONTACT_SMTP_HOST || "").trim();

  if (smtpUrl) {
    return nodemailer.createTransport(smtpUrl);
  }

  if (!smtpHost) {
    return null;
  }

  const smtpPort = Number(process.env.CONTACT_SMTP_PORT || 587);
  const smtpSecure = String(process.env.CONTACT_SMTP_SECURE || "").trim().toLowerCase() === "true";
  const smtpUser = String(process.env.CONTACT_SMTP_USER || "").trim();
  const smtpPassword = String(process.env.CONTACT_SMTP_PASSWORD || "").trim();
  const transportOptions = {
    host: smtpHost,
    port: Number.isFinite(smtpPort) ? smtpPort : 587,
    secure: smtpSecure
  };

  if (smtpUser || smtpPassword) {
    transportOptions.auth = {
      user: smtpUser,
      pass: smtpPassword
    };
  }

  return nodemailer.createTransport(transportOptions);
}

async function forwardToSmtp(submission) {
  const transport = buildSmtpTransport();
  if (!transport) {
    return;
  }

  const recipient = String(process.env.CONTACT_NOTIFICATION_EMAIL || "hello@noticekit.tech").trim();
  const sender = String(process.env.CONTACT_SMTP_FROM || "NoticeKit <hello@noticekit.tech>").trim();

  await transport.sendMail({
    from: sender,
    to: recipient,
    subject: `NoticeKit contact intake: ${submission.company} (${submission.type})`,
    text: buildNotificationBody(submission),
    html: buildNotificationHtml(submission),
    replyTo: submission.email
  });
}

async function forwardSubmission(submission) {
  if (process.env.CONTACT_WEBHOOK_URL) {
    return forwardToWebhook(submission);
  }

  if (process.env.CONTACT_SMTP_URL || process.env.CONTACT_SMTP_HOST) {
    return forwardToSmtp(submission);
  }

  if (process.env.RESEND_API_KEY || process.env.CONTACT_RESEND_API_KEY) {
    return forwardToResend(submission);
  }
}

let blobSdkPromise;

function loadBlobSdk() {
  if (!blobSdkPromise) {
    blobSdkPromise = import("@vercel/blob");
  }

  return blobSdkPromise;
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store"
    });
    response.end();
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(request));
  } catch (error) {
    sendJson(response, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  if (clean(payload.website)) {
    sendJson(response, 202, { ok: true, message: "Received." });
    return;
  }

  const submission = {
    referenceId: createReferenceId(),
    type: clean(payload.type || "concierge_audit"),
    company: clean(payload.company),
    email: clean(payload.email),
    subprocessorUrl: clean(payload.subprocessorUrl),
    vendorChange: clean(payload.vendorChange),
    deadline: clean(payload.deadline),
    reviewNeed: clean(payload.reviewNeed),
    ownershipSignal: clean(payload.ownershipSignal),
    sourceTag: clean(payload.sourceTag),
    scoreLabel: clean(payload.scoreLabel),
    scoreBand: clean(payload.scoreBand),
    summary: clean(payload.summary),
    submittedAt: new Date().toISOString(),
    userAgent: clean(request.headers["user-agent"])
  };

  const parsedScore = Number.parseInt(String(payload.score || ""), 10);
  submission.score = Number.isFinite(parsedScore) ? Math.max(0, Math.min(parsedScore, 10)) : null;
  submission.scoreDisplay =
    submission.score !== null && submission.scoreLabel
      ? `${submission.score}/10 (${submission.scoreLabel})`
      : submission.score !== null
        ? `${submission.score}/10`
        : "";
  submission.topGaps = Array.isArray(payload.topGaps)
    ? payload.topGaps.map((value) => clean(value)).filter(Boolean).slice(0, 4)
    : [];
  submission.selectedChecks = Array.isArray(payload.selectedChecks)
    ? payload.selectedChecks.map((value) => clean(value)).filter(Boolean).slice(0, 10)
    : [];

  if (!submission.company || !isEmail(submission.email)) {
    sendJson(response, 422, {
      ok: false,
      error: "Company and a valid reply email are required."
    });
    return;
  }

  const storagePath = createStoragePath(submission);
  const storagePayload = {
    ...submission,
    storagePath,
    storedAt: new Date().toISOString()
  };

  try {
    const { put } = await loadBlobSdk();
    const blob = await put(storagePath, JSON.stringify(storagePayload, null, 2), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false
    });
    storagePayload.storageUrl = blob.url;
  } catch (error) {
    console.error("NoticeKit contact blob write failed", error);
    sendJson(response, 502, {
      ok: false,
      error: "The request could not be persisted. Please try again."
    });
    return;
  }

  try {
    await forwardSubmission(storagePayload);
  } catch (error) {
    console.error("NoticeKit contact delivery failed", error);
    sendJson(response, 502, {
      ok: false,
      error: "The intake endpoint could not forward your request. Please try again."
    });
    return;
  }

  sendJson(response, 200, {
    ok: true,
    message: submission.type === "self_audit_feedback" ? "Your self-audit feedback was received." : "Your audit intake was received.",
    referenceId: submission.referenceId
  });
};
