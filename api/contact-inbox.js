const MAX_SUBMISSIONS = 200;
const BLOB_PREFIX = "contact-submissions/";

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function getHeader(request, name) {
  return String(request.headers[name] || "").trim();
}

function isAuthorized(request) {
  const expected = String(process.env.OPS_DASHBOARD_PASSWORD || "");
  if (!expected) {
    return false;
  }

  const headerPassword = getHeader(request, "x-noticekit-dashboard-password");
  const queryPassword = new URL(request.url, "http://localhost").searchParams.get("password") || "";
  return headerPassword === expected || queryPassword === expected;
}

async function loadBlobSdk() {
  return import("@vercel/blob");
}

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseRecord(blob, content) {
  try {
    const record = JSON.parse(content);
    return {
      ...record,
      pathname: blob.pathname,
      uploadedAt: blob.uploadedAt,
      size: blob.size,
      contentType: blob.contentType,
      isSelfAuditFeedback: String(record.type || "").trim() === "self_audit_feedback",
      isAsyncTeardown: String(record.type || "").trim() === "free_async_teardown",
      isTaggedValidation: isTaggedValidation(record.sourceTag),
      isLikelyTestSubmission: isLikelyTestSubmission(record),
      segmentGuess: deriveSegmentGuess(record.ownershipSignal, record.sourceTag)
    };
  } catch (error) {
    return {
      pathname: blob.pathname,
      uploadedAt: blob.uploadedAt,
      size: blob.size,
      contentType: blob.contentType,
      parseError: "Unable to parse submission JSON."
    };
  }
}

function isTaggedValidation(sourceTag) {
  const raw = String(sourceTag || "").trim().toLowerCase();
  return ["founder-follow-up", "advisor-follow-up", "founder-batch-03", "founder-batch-04"].includes(raw);
}

function deriveSegmentGuess(ownershipSignal, sourceTag) {
  const role = String(ownershipSignal || "").trim().toLowerCase();
  const source = String(sourceTag || "").trim().toLowerCase();

  if (["founder", "operator", "ops", "operations"].includes(role)) {
    return "founder/operator";
  }

  if (["privacy consultant", "consultant", "fractional dpo", "dpo", "attorney", "lawyer"].includes(role)) {
    return "advisor";
  }

  if (source.startsWith("founder-")) {
    return "founder/operator";
  }

  if (source.startsWith("advisor-")) {
    return "advisor";
  }

  return "unknown";
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

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  if (!process.env.OPS_DASHBOARD_PASSWORD) {
    sendJson(response, 503, {
      ok: false,
      error: "Ops dashboard password is not configured."
    });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, {
      ok: false,
      error: "Unauthorized."
    });
    return;
  }

  try {
    const { list, get } = await loadBlobSdk();
    const { blobs } = await list({
      prefix: BLOB_PREFIX,
      limit: MAX_SUBMISSIONS
    });

    const records = [];
    for (const blob of blobs.sort((a, b) => String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")))) {
      const result = await get(blob.pathname, { access: "private" });
      if (!result || result.statusCode !== 200) {
        continue;
      }

      const content = await readStream(result.stream);
      records.push(parseRecord(blob, content));
    }

    sendJson(response, 200, {
      ok: true,
      count: records.length,
      records
    });
  } catch (error) {
    console.error("NoticeKit contact inbox failed", error);
    sendJson(response, 502, {
      ok: false,
      error: "Unable to load the contact inbox."
    });
  }
};
