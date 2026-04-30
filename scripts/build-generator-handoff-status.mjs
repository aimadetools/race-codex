#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const ROOT = process.cwd();
const OUTPUT = join(ROOT, "GENERATOR-HANDOFF-STATUS.md");
const GENERATOR_URL = "https://noticekit.tech/generator.html";

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

const handoffUrl = new URL(sendPacketLink.href, GENERATOR_URL);

assert(handoffUrl.pathname.endsWith("/audit-request.html"), "Generator handoff does not point to audit-request.html.");
assert(handoffUrl.searchParams.get("type") === "free_async_teardown", "Generator handoff type prefill is missing.");
assert(handoffUrl.searchParams.get("source") === "generator-page", "Generator handoff source tag is incorrect.");
assert(handoffUrl.searchParams.get("channel") === "generator-prefill", "Generator handoff channel tag is incorrect.");
assert(handoffUrl.searchParams.get("company") === "Example SaaS", "Generator handoff company prefill is missing.");
assert(
  handoffUrl.searchParams.get("subprocessor_url") === "https://example.com/subprocessors",
  "Generator handoff subprocessor URL prefill is missing."
);
assert(
  handoffUrl.searchParams.get("vendor_change")?.includes("Acme Email Cloud"),
  "Generator handoff vendor-change prefill is missing the vendor name."
);
assert(
  handoffUrl.searchParams.get("deadline")?.includes("EU customers on a signed DPA"),
  "Generator handoff deadline prefill is missing the customer segment."
);

const auditResponse = await fetch(handoffUrl, {
  headers: {
    "user-agent": "noticekit-generator-handoff-check"
  }
});

assert(auditResponse.ok, `Audit-request page fetch failed with ${auditResponse.status}.`);

const auditHtml = await auditResponse.text();
const auditDom = await loadDom(auditHtml, handoffUrl.toString());
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
  `Audit URL: ${handoffUrl.toString()}`,
  `HTTP status: generator ${generatorResponse.status}, audit ${auditResponse.status}`,
  "",
  "## Result",
  "",
  "- Status: ok",
  "- Live generator browser execution produced a populated teardown handoff URL.",
  "- Live audit-request browser execution hydrated the prefilled teardown form from that handoff URL.",
  `- Request type: ${requestType}`,
  `- Source tag: ${sourceTag}`,
  `- Submission channel: ${submissionChannel}`,
  "",
  "## Assertions",
  "",
  "- The live generator kept the `send-packet` CTA pointed at `audit-request.html` with teardown type, generator source, and generator-prefill channel tags.",
  "- The generated teardown URL carried company, subprocessor page URL, vendor-change context, and customer-segment/deadline context.",
  "- The live audit-request page applied those query params into the visible form fields and teardown UI copy.",
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
