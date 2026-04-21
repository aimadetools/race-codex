const MAX_SUBMISSIONS = 20;
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
    return {
      ...JSON.parse(content),
      pathname: blob.pathname,
      uploadedAt: blob.uploadedAt,
      size: blob.size,
      contentType: blob.contentType
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
