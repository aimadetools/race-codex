#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const ROOT = process.cwd();
const OUTPUT = join(ROOT, "GENERATOR-HANDOFF-STATUS.md");
const GENERATOR_URL = "https://noticekit.tech/generator.html";
const FREE_TEARDOWN_URL = "https://noticekit.tech/free-teardown.html";

function formatUtcTimestamp(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadDom(html, url) {
  return new Promise((resolve) => {
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      resources: "usable",
      url,
      beforeParse(window) {
        window.navigator.clipboard = {
          writeText: async () => {}
        };
        window.URL.createObjectURL = () => "blob:noticekit-generator";
        window.URL.revokeObjectURL = () => {};
        window.HTMLAnchorElement.prototype.click = function click() {};
      }
    });

    dom.window.addEventListener("load", () => resolve(dom), { once: true });
  });
}

const checkedAt = formatUtcTimestamp(new Date());
const generatorResponse = await fetch(GENERATOR_URL, {
  headers: {
    "user-agent": "noticekit-generator-handoff-check"
  }
});

assert(generatorResponse.ok, `Generator page fetch failed with ${generatorResponse.status}.`);

const generatorHtml = await generatorResponse.text();
const generatorDom = await loadDom(generatorHtml, GENERATOR_URL);
const generatorDocument = generatorDom.window.document;
const sendPacketLink = generatorDocument.querySelector("#send-packet");

assert(sendPacketLink, "Generator page is missing the send-packet handoff link.");

const teardownUrl = new URL(sendPacketLink.href, GENERATOR_URL);

assert(teardownUrl.pathname.endsWith("/free-teardown.html"), "Generator handoff does not point to free-teardown.html.");
assert(teardownUrl.searchParams.get("source") === "generator-page", "Generator handoff source tag is incorrect.");
assert(teardownUrl.searchParams.get("channel") === "generator-prefill", "Generator handoff channel tag is incorrect.");
assert(teardownUrl.searchParams.get("company") === "Example SaaS", "Generator handoff company prefill is missing.");
assert(
  teardownUrl.searchParams.get("subprocessor_url") === "https://example.com/subprocessors",
  "Generator handoff subprocessor URL prefill is missing."
);
assert(
  teardownUrl.searchParams.get("vendor_change")?.includes("Acme Email Cloud"),
  "Generator handoff vendor-change prefill is missing the vendor name."
);
assert(
  teardownUrl.searchParams.get("deadline")?.includes("EU customers on a signed DPA"),
  "Generator handoff deadline prefill is missing the customer segment."
);

const teardownResponse = await fetch(teardownUrl, {
  headers: {
    "user-agent": "noticekit-generator-handoff-check"
  }
});

assert(teardownResponse.ok, `Free-teardown page fetch failed with ${teardownResponse.status}.`);

const teardownHtml = await teardownResponse.text();
const teardownDom = await loadDom(teardownHtml, teardownUrl.toString());
const teardownDocument = teardownDom.window.document;
const teardownSourceTag = teardownDocument.querySelector("#source-tag")?.value || "";
const teardownChannelTag = teardownDocument.querySelector("#channel-tag")?.value || "";
const teardownCompany = teardownDocument.querySelector('input[name="company"]')?.value || "";
const teardownEmail = teardownDocument.querySelector('input[name="email"]')?.value || "";
const teardownSubprocessorUrl = teardownDocument.querySelector('input[name="subprocessor_url"]')?.value || "";
const teardownVendorChange = teardownDocument.querySelector('input[name="vendor_change"]')?.value || "";
const teardownDeadline = teardownDocument.querySelector('textarea[name="deadline"]')?.value || "";
const intakeLink = teardownDocument.querySelector("#skip-to-intake");

assert(intakeLink, "Free-teardown page is missing the skip-to-intake handoff link.");
assert(teardownSourceTag === "generator-page", "Free-teardown page did not preserve the generator source tag.");
assert(teardownChannelTag === "generator-prefill", "Free-teardown page did not preserve the generator channel tag.");
assert(teardownCompany === "Example SaaS", "Free-teardown page did not hydrate the company from the handoff URL.");
assert(teardownEmail === "privacy@example.com", "Free-teardown page did not hydrate the email from the handoff URL.");
assert(teardownSubprocessorUrl === "https://example.com/subprocessors", "Free-teardown page did not hydrate the subprocessor URL.");
assert(teardownVendorChange.includes("Acme Email Cloud"), "Free-teardown page did not hydrate the vendor change.");
assert(teardownDeadline.includes("EU customers on a signed DPA"), "Free-teardown page did not hydrate the deadline field.");

const auditUrl = new URL(intakeLink.href, FREE_TEARDOWN_URL);

assert(auditUrl.pathname.endsWith("/audit-request.html"), "Free-teardown handoff does not point to audit-request.html.");
assert(auditUrl.searchParams.get("type") === "free_async_teardown", "Free-teardown handoff type prefill is missing.");
assert(auditUrl.searchParams.get("source") === "generator-page", "Free-teardown handoff source tag is incorrect.");
assert(auditUrl.searchParams.get("channel") === "generator-prefill", "Free-teardown handoff channel tag is incorrect.");

const auditResponse = await fetch(auditUrl, {
  headers: {
    "user-agent": "noticekit-generator-handoff-check"
  }
});

assert(auditResponse.ok, `Audit-request page fetch failed with ${auditResponse.status}.`);

const auditHtml = await auditResponse.text();
const auditDom = await loadDom(auditHtml, auditUrl.toString());
const auditDocument = auditDom.window.document;

const requestType = auditDocument.querySelector("#request-type")?.value || "";
const company = auditDocument.querySelector("#company")?.value || "";
const subprocessorUrl = auditDocument.querySelector("#subprocessor-url")?.value || "";
const vendorChange = auditDocument.querySelector("#vendor-change")?.value || "";
const deadline = auditDocument.querySelector("#deadline")?.value || "";
const sourceTag = auditDocument.querySelector("#source-tag")?.value || "";
const submissionChannel = auditDocument.querySelector("#submission-channel")?.value || "";
const submitButton = auditDocument.querySelector("#audit-submit")?.textContent?.trim() || "";
const panelTitle = auditDocument.querySelector("#request-panel-title")?.textContent?.trim() || "";
const panelCopy = auditDocument.querySelector("#request-panel-copy")?.textContent?.trim() || "";

assert(requestType === "free_async_teardown", "Audit-request page did not prefill the teardown request type.");
assert(company === "Example SaaS", "Audit-request page did not hydrate the company from the handoff URL.");
assert(subprocessorUrl === "https://example.com/subprocessors", "Audit-request page did not hydrate the subprocessor URL.");
assert(vendorChange.includes("Acme Email Cloud"), "Audit-request page did not hydrate the vendor change.");
assert(deadline.includes("EU customers on a signed DPA"), "Audit-request page did not hydrate the deadline field.");
assert(sourceTag === "generator-page", "Audit-request page did not preserve the generator source tag.");
assert(submissionChannel === "generator-prefill", "Audit-request page did not preserve the generator submission channel.");
assert(submitButton === "Request free teardown", "Audit-request page did not sync the teardown submit button copy.");
assert(panelTitle === "Request a free async teardown", "Audit-request page did not sync the teardown panel title.");
assert(panelCopy.includes("specific async reply"), "Audit-request page did not sync the teardown panel copy.");

const output = [
  "# Generator Handoff Status",
  "",
  `Checked at: ${checkedAt}`,
  `Generator URL: ${GENERATOR_URL}`,
  `Teardown URL: ${teardownUrl.toString()}`,
  `Audit URL: ${auditUrl.toString()}`,
  `HTTP status: generator ${generatorResponse.status}, teardown ${teardownResponse.status}, audit ${auditResponse.status}`,
  "",
  "## Result",
  "",
  "- Status: ok",
  "- Live generator browser execution produced a populated free-teardown handoff URL.",
  "- Live free-teardown browser execution preserved the generator-prefilled fields and produced an audit-request intake URL.",
  "- Live audit-request browser execution hydrated the prefilled teardown form from that intake URL.",
  `- Request type: ${requestType}`,
  `- Source tag: ${sourceTag}`,
  `- Submission channel: ${submissionChannel}`,
  "",
  "## Assertions",
  "",
  "- The live generator kept the `send-packet` CTA pointed at `free-teardown.html` with generator source and generator-prefill channel tags.",
  "- The generated free-teardown URL carried company, reply email, subprocessor page URL, vendor-change context, and customer-segment/deadline context.",
  "- The live free-teardown page preserved those query params into its visible builder fields and the downstream audit-request handoff link.",
  "- The live audit-request page applied those query params into the visible form fields and teardown UI copy.",
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
