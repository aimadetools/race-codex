const BLOB_PREFIX = "contact-webhook-deliveries";
const { buildForwardedRecord } = require("./contact-forwarded-record.js");

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function getAuthorizationToken(request) {
  const headerValue = String(request.headers.authorization || "").trim();
  if (headerValue.toLowerCase().startsWith("bearer ")) {
    return headerValue.slice(7).trim();
  }

  return String(request.headers["x-noticekit-webhook-secret"] || "").trim();
}

function isAuthorized(request) {
  const expected = String(process.env.CONTACT_WEBHOOK_SECRET || "").trim();
  if (!expected) {
    return false;
  }

  return getAuthorizationToken(request) === expected;
}

async function loadBlobSdk() {
  return import("@vercel/blob");
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function createStoragePath(record) {
  const day = record.receivedAt.slice(0, 10);
  return `${BLOB_PREFIX}/${day}/${record.referenceId}.json`;
}

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization, x-noticekit-webhook-secret",
      "cache-control": "no-store"
    });
    response.end();
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { ok: false, error: "Unauthorized." });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(request));
  } catch (error) {
    sendJson(response, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const receivedAt = new Date().toISOString();
  const record = buildForwardedRecord(payload, receivedAt);

  try {
    const { put } = await loadBlobSdk();
    const storagePath = createStoragePath(record);
    const blob = await put(storagePath, JSON.stringify(record, null, 2), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false
    });
    record.storagePath = storagePath;
    record.storageUrl = blob.url;
  } catch (error) {
    console.error("NoticeKit contact webhook blob write failed", error);
    sendJson(response, 502, {
      ok: false,
      error: "The forwarded request could not be persisted."
    });
    return;
  }

  sendJson(response, 202, {
    ok: true,
    message: "Webhook received.",
    referenceId: record.referenceId
  });
};
