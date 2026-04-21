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
    submittedAt: new Date().toISOString(),
    userAgent: clean(request.headers["user-agent"])
  };

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

  if (process.env.CONTACT_WEBHOOK_URL) {
    try {
      const webhookResponse = await fetch(process.env.CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.CONTACT_WEBHOOK_SECRET
            ? { authorization: `Bearer ${process.env.CONTACT_WEBHOOK_SECRET}` }
            : {})
        },
        body: JSON.stringify(storagePayload)
      });

      if (!webhookResponse.ok) {
        console.error("NoticeKit contact webhook failed", webhookResponse.status);
        sendJson(response, 502, {
          ok: false,
          error: "The intake endpoint could not forward your request. Please try again."
        });
        return;
      }
    } catch (error) {
      console.error("NoticeKit contact webhook error", error);
      sendJson(response, 502, {
        ok: false,
        error: "The intake endpoint could not forward your request. Please try again."
      });
      return;
    }
  }

  sendJson(response, 200, {
    ok: true,
    message: "Your audit intake was received.",
    referenceId: submission.referenceId
  });
};
