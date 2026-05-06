#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const ROOT = process.cwd();
const INPUT = join(ROOT, "free-teardown.html");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const html = await readFile(INPUT, "utf8");
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  url: "https://noticekit.tech/free-teardown.html?source=generator-page&channel=generator-prefill&company=Example%20SaaS&email=privacy%40example.com"
});

await new Promise((resolve) => {
  dom.window.addEventListener("load", resolve, { once: true });
});

const document = dom.window.document;
const skipToIntake = document.querySelector("#skip-to-intake");
const company = document.querySelector("#company");
const email = document.querySelector("#email");
const ownershipSignal = document.querySelector("#ownership-signal");
const subprocessorUrl = document.querySelector("#subprocessor-url");
const vendorChange = document.querySelector("#vendor-change");
const deadline = document.querySelector("#deadline");
const reviewNeed = document.querySelector("#review-need");

assert(skipToIntake, "Skip-to-intake link is missing.");
assert(company?.value === "Example SaaS", "Company prefill did not hydrate.");
assert(email?.value === "privacy@example.com", "Email prefill did not hydrate.");

company.value = "Acme Cloud";
email.value = "founder@acme.test";
ownershipSignal.value = "founder";
subprocessorUrl.value = "https://acme.test/subprocessors";
vendorChange.value = "Replacing Mailgun with Acme Mail";
deadline.value = "EU customers, 14-day window.";
reviewNeed.value = "Need the stronger audit path.";

company.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
email.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
ownershipSignal.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
subprocessorUrl.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
vendorChange.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
deadline.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
reviewNeed.dispatchEvent(new dom.window.Event("input", { bubbles: true }));

const handoffUrl = new URL(skipToIntake.href, "https://noticekit.tech/free-teardown.html");

assert(handoffUrl.searchParams.get("type") === "free_async_teardown", "Handoff request type is incorrect.");
assert(handoffUrl.searchParams.get("source") === "generator-page", "Handoff source tag was not preserved.");
assert(handoffUrl.searchParams.get("channel") === "generator-prefill", "Handoff channel tag was not preserved.");
assert(handoffUrl.searchParams.get("company") === "Acme Cloud", "Typed company was not carried into the full intake.");
assert(handoffUrl.searchParams.get("email") === "founder@acme.test", "Typed email was not carried into the full intake.");
assert(handoffUrl.searchParams.get("ownership_signal") === "founder", "Typed ownership signal was not carried into the full intake.");
assert(handoffUrl.searchParams.get("subprocessor_url") === "https://acme.test/subprocessors", "Typed subprocessor URL was not carried into the full intake.");
assert(handoffUrl.searchParams.get("vendor_change") === "Replacing Mailgun with Acme Mail", "Typed vendor change was not carried into the full intake.");
assert(handoffUrl.searchParams.get("deadline") === "EU customers, 14-day window.", "Typed deadline was not carried into the full intake.");
assert(handoffUrl.searchParams.get("review_need") === "Need the stronger audit path.", "Typed review need was not carried into the full intake.");

console.log("Free-teardown handoff check passed.");
