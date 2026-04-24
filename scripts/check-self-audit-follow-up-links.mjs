import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const ROOT = process.cwd();
const INPUT = join(ROOT, "self-audit.html");
const OUTPUT = join(ROOT, "SELF-AUDIT-FOLLOW-UP-QA.md");
const html = await readFile(INPUT, "utf8");

const CASES = [
  {
    name: "Founder follow-up desktop",
    url: "https://noticekit.tech/self-audit.html?source=founder-follow-up",
    viewport: { width: 1440, height: 900 },
    checks: ["page", "vendor", "data", "owner"],
    expectedScore: "4/10",
    expectedLabel: "High-risk gap",
    expectedShareCopy: "If you came here from the founder follow-up, email the score and top gaps. Async feedback is enough.",
    expectedSource: "Source: founder follow-up"
  },
  {
    name: "Advisor follow-up mobile",
    url: "https://noticekit.tech/self-audit.html?source=advisor-follow-up",
    viewport: { width: 390, height: 844 },
    checks: ["page", "vendor", "data", "segments", "window", "dates", "copy", "proof"],
    expectedScore: "8/10",
    expectedLabel: "Review-ready",
    expectedShareCopy: "If you came here from the advisor follow-up, email the score and top gaps. Async feedback is enough.",
    expectedSource: "Source: advisor follow-up"
  }
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function nextTick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function runCase(testCase) {
  let copiedSummary = "";
  const dom = new JSDOM(html, {
    url: testCase.url,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    beforeParse(window) {
      Object.defineProperty(window, "innerWidth", { value: testCase.viewport.width, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: testCase.viewport.height, configurable: true });
      Object.defineProperty(window.navigator, "userAgent", {
        value: testCase.viewport.width <= 480 ? "qa-mobile" : "qa-desktop",
        configurable: true
      });
      window.navigator.clipboard = {
        async writeText(text) {
          copiedSummary = text;
        }
      };
      window.document.execCommand = () => true;
    }
  });

  await new Promise((resolve) => {
    dom.window.addEventListener("load", resolve, { once: true });
  });
  await nextTick();

  const { document, Event } = dom.window;

  for (const value of testCase.checks) {
    const input = document.querySelector(`input[value="${value}"]`);
    assert(input, `${testCase.name}: missing checkbox ${value}.`);
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  await nextTick();

  const score = document.querySelector("#score-value")?.textContent?.trim() || "";
  const label = document.querySelector("#score-label")?.textContent?.trim() || "";
  const shareCopy = document.querySelector("#share-copy")?.textContent?.trim() || "";
  const emailHref = document.querySelector("#email-score-link")?.getAttribute("href") || "";
  const emailVisible = !document.querySelector("#email-score-link")?.hidden;
  const copyVisible = !document.querySelector("#copy-score-button")?.hidden;

  assert(score === testCase.expectedScore, `${testCase.name}: expected score ${testCase.expectedScore}, received ${score}.`);
  assert(label === testCase.expectedLabel, `${testCase.name}: expected label ${testCase.expectedLabel}, received ${label}.`);
  assert(shareCopy === testCase.expectedShareCopy, `${testCase.name}: unexpected share-copy text.`);
  assert(emailHref.startsWith("mailto:hello@noticekit.tech?subject="), `${testCase.name}: email link did not render a mailto with subject.`);
  assert(emailVisible, `${testCase.name}: email CTA is not visible.`);
  assert(copyVisible, `${testCase.name}: copy CTA is not visible.`);

  const href = new URL(emailHref.replace("mailto:", "mailto://"));
  const subject = decodeURIComponent(href.searchParams.get("subject") || "");
  const body = decodeURIComponent(href.searchParams.get("body") || "");

  assert(subject.includes(score), `${testCase.name}: mailto subject is missing the score.`);
  assert(subject.includes(label), `${testCase.name}: mailto subject is missing the label.`);
  assert(body.includes(`Self-audit score: ${score} (${label})`), `${testCase.name}: mailto body is missing the score line.`);
  assert(body.includes(testCase.expectedSource), `${testCase.name}: mailto body is missing the source tag.`);

  document.querySelector("#copy-score-button")?.click();
  await nextTick();

  const copyStatus = document.querySelector("#copy-status")?.textContent?.trim() || "";
  assert(copyStatus === "Summary copied.", `${testCase.name}: unexpected copy status ${copyStatus}.`);
  assert(copiedSummary === body.trimEnd(), `${testCase.name}: copied summary does not match the mailto body.`);

  dom.window.close();

  return {
    name: testCase.name,
    viewport: `${testCase.viewport.width}x${testCase.viewport.height}`,
    score,
    label,
    shareCopy,
    subject,
    copyStatus
  };
}

const results = [];
for (const testCase of CASES) {
  results.push(await runCase(testCase));
}

const output = [
  "# Self-Audit Follow-Up QA",
  "",
  "Date: 2026-04-24 UTC",
  "",
  "This check validates the tagged self-audit follow-up entry points before the 2026-04-27 non-responder send window.",
  "",
  "## Coverage",
  "",
  "- Founder follow-up tagged path on a desktop-sized viewport.",
  "- Advisor follow-up tagged path on a mobile-sized viewport.",
  "- Score recompute after clicks, source-specific helper copy, mailto subject/body generation, and copy-summary parity.",
  "",
  "## Results",
  "",
  ...results.flatMap((result) => [
    `### ${result.name}`,
    "",
    `- Viewport: ${result.viewport}`,
    `- Score after click test: ${result.score} (${result.label})`,
    `- Share prompt: ${result.shareCopy}`,
    `- Mailto subject: ${result.subject}`,
    `- Copy status: ${result.copyStatus}`,
    ""
  ]),
  "## Run Command",
  "",
  "```bash",
  "npm run check:self-audit-follow-up",
  "```",
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
