import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const OUTPUT = join(ROOT, "VALIDATION-OUTREACH-SEND-PLAN.md");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        i += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char !== "\r") {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows;
  return body
    .filter((cells) => cells.some((cell) => String(cell || "").trim().length > 0))
    .map((cells) => {
      const record = {};
      header.forEach((key, index) => {
        record[key] = cells[index] ?? "";
      });
      return record;
    });
}

function classifyRoute(route) {
  const value = String(route || "").trim();
  if (!value) {
    return "manual";
  }

  if (value.includes("@")) {
    return "direct-email";
  }

  if (value.includes("mailto:")) {
    return "direct-email";
  }

  if (/contact sales/i.test(value) || /support widget/i.test(value)) {
    return "manual-form";
  }

  if (value.startsWith("http")) {
    return "manual-form";
  }

  return "manual";
}

function planSection(title, rows) {
  const lines = [
    "| Priority | Target | Segment | Route | Send method |",
    "|---:|---|---|---|---|",
    ...rows.map(
      (row) =>
        `| ${row.priority} | ${row.target} | ${row.segment} | ${row.route} | ${row.sendMethod} |`
    ),
    ""
  ];

  if (title) {
    lines.unshift("", `## ${title}`, "");
  }

  return lines.join("\n");
}

const batch01 = parseCsv(await readFile(join(ROOT, "buyer-validation-outreach-batch-01.csv"), "utf8"));
const batch02 = parseCsv(await readFile(join(ROOT, "buyer-validation-outreach-batch-02.csv"), "utf8"));
let batch03 = [];
let batch04 = [];

try {
  batch03 = parseCsv(await readFile(join(ROOT, "buyer-validation-outreach-batch-03.csv"), "utf8"));
} catch (error) {
  if (!error || error.code !== "ENOENT") {
    throw error;
  }
}

try {
  batch04 = parseCsv(await readFile(join(ROOT, "buyer-validation-outreach-batch-04.csv"), "utf8"));
} catch (error) {
  if (!error || error.code !== "ENOENT") {
    throw error;
  }
}

const normalized01 = batch01.map((row) => ({
  priority: row.priority,
  target: row.company,
  segment: row.segment,
  route: row.public_contact_route,
  sendMethod: classifyRoute(row.public_contact_route)
}));

const normalized02 = batch02.map((row) => ({
  priority: row.priority,
  target: row.organization,
  segment: row.segment,
  route: row.public_contact_route,
  sendMethod: classifyRoute(row.public_contact_route)
}));

const normalized03 = batch03.map((row) => ({
  priority: row.priority,
  target: row.company,
  segment: row.segment,
  route: row.public_contact_route,
  sendMethod: classifyRoute(row.public_contact_route)
}));

const normalized04 = batch04.map((row) => ({
  priority: row.priority,
  target: row.company,
  segment: row.segment,
  route: row.public_contact_route,
  sendMethod: classifyRoute(row.public_contact_route)
}));

const directEmailCount = [...normalized01, ...normalized02, ...normalized03, ...normalized04].filter(
  (row) => row.sendMethod === "direct-email"
).length;

const batch03Section = normalized03.length
  ? [
      "## Batch 03 contingency",
      "",
      "Status: prepared for the 2026-04-27 no-reply check; not part of the active send queue yet.",
      "",
      planSection("", normalized03)
    ].join("\n")
  : "";

const batch04Section = normalized04.length
  ? [
      "## Batch 04 contingency",
      "",
      "Status: prepared as a second founder/operator contingency expansion; keep it out of the active send queue until batch 03 is exhausted after the 2026-04-27 check.",
      "",
      planSection("", normalized04)
    ].join("\n")
  : "";

const output = [
  "# NoticeKit Validation Outreach Send Plan",
  "",
  "Date: 2026-04-22",
  "",
  "This plan translates the prepared outreach batches into the first operational send queue.",
  "Batch 01 and batch 02 are now sent; use this plan for reply handling, interview conversion, and the batch 03 and batch 04 contingency checks.",
  "",
  `Prepared direct-email targets identified: ${directEmailCount}`,
  "",
  "## Current Priority",
  "",
  "Monitor founder replies from batch 01, convert real replies into scored interviews, and keep batch 03 reserved for the 2026-04-27 no-reply check while batch 04 stays behind batch 03.",
  "",
  "## Batch 01",
  "",
  "Status: sent on 2026-04-22.",
  "",
  planSection("", normalized01),
  [
    "## Batch 02",
    "",
    "Status: sent on 2026-04-22 under an explicit operator override to the sequencing hold.",
    "",
    planSection("", normalized02)
  ].join("\n"),
  batch03Section,
  batch04Section,
  "## Notes",
  "",
  "- `direct-email` means the public route is a real email address or `mailto:` link.",
  "- `manual-form` means the public route is a contact page, support widget, or contact-sales flow that needs human submission.",
  "- `manual` means the route needs a different delivery path before it can be sent.",
  "- Keep the first five founder/operator targets ahead of advisor outreach, matching `VALIDATION-OUTREACH-SEND-RUNBOOK.md`.",
  "- Batch 03 is a contingency expansion and stays out of the active send queue until the 2026-04-27 no-reply check says more founder/operator targets are needed.",
  "- Batch 04 is a second contingency expansion and stays out of the active send queue until batch 03 is exhausted after the same check.",
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
