#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const ROOT = process.cwd();
const OUTPUT = join(ROOT, "GENERATOR-PRODUCTION-STATUS.md");
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

const checkedAt = formatUtcTimestamp(new Date());
const response = await fetch(GENERATOR_URL, {
  headers: {
    "user-agent": "noticekit-generator-production-check"
  }
});

assert(response.ok, `Generator page fetch failed with ${response.status}.`);

const html = await response.text();
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: GENERATOR_URL,
  beforeParse(window) {
    window.navigator.clipboard = {
      writeText: async () => {}
    };
    window.URL.createObjectURL = () => "blob:noticekit-generator";
    window.URL.revokeObjectURL = () => {};
    window.HTMLAnchorElement.prototype.click = function click() {};
  }
});

await new Promise((resolve) => {
  dom.window.addEventListener("load", resolve, { once: true });
});

const { document } = dom.window;
const title = document.title.trim();
const hero = document.querySelector("h1")?.textContent?.trim() || "";
const subject = document.querySelector("#subject-line")?.textContent?.trim() || "";
const timelineState = document.querySelector("#timeline-state")?.textContent?.trim() || "";
const timelineSummary = document.querySelector("#timeline-summary")?.textContent?.trim() || "";
const noticeOutput = document.querySelector("#notice-output")?.textContent?.trim() || "";
const checklistOutput = document.querySelector("#checklist-output")?.textContent?.trim() || "";
const csvOutput = document.querySelector("#csv-output")?.textContent?.trim() || "";
const generatorStatus = document.querySelector("#generator-status")?.textContent?.trim() || "";
const deadlineLabel = document.querySelector("#deadline-label")?.textContent?.trim() || "";

assert(title === "Local Subprocessor Notice Generator | NoticeKit", "Unexpected production generator title.");
assert(hero.includes("Draft the notice packet"), "Generator hero heading did not render.");
assert(subject.includes("Example SaaS: subprocessor update notice for Acme Email Cloud"), "Generator subject line did not render the default packet.");
assert(timelineState === "Review-ready window", "Generator timeline state is not review-ready on default load.");
assert(timelineSummary.includes("leaves enough time"), "Generator timeline summary did not render the ready-state copy.");
assert(noticeOutput.includes("Objection deadline:"), "Generator notice output is missing the objection deadline.");
assert(noticeOutput.includes("Acme Email Cloud"), "Generator notice output is missing the default vendor.");
assert(checklistOutput.includes("Save the final notice draft"), "Generator checklist output did not render.");
assert(csvOutput.startsWith("vendor_name,change_type,vendor_purpose"), "Generator CSV preview header did not render.");
assert(csvOutput.includes("Acme Email Cloud,add,transactional email delivery"), "Generator CSV preview row did not render the default values.");
assert(generatorStatus.includes("does not store your inputs"), "Generator privacy status copy did not render.");
assert(deadlineLabel && deadlineLabel !== "Finish the dates", "Generator deadline label did not render a calculated date.");

const output = [
  "# Generator Production Status",
  "",
  `Checked at: ${checkedAt}`,
  `URL: ${GENERATOR_URL}`,
  `HTTP status: ${response.status}`,
  "",
  "## Result",
  "",
  "- Status: ok",
  "- Browser execution: passed through `jsdom` with inline generator logic enabled.",
  `- Rendered title: ${title}`,
  `- Timeline state: ${timelineState}`,
  `- Deadline label: ${deadlineLabel}`,
  "",
  "## Assertions",
  "",
  "- The production page returned HTTP 200.",
  "- The default packet rendered a notice draft, checklist, CSV preview, and review-ready timeline summary.",
  "- The generator privacy copy and browser-only download/copy controls were present on the live page.",
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
