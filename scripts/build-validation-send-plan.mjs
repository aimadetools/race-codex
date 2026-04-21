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
  return [
    `## ${title}`,
    "",
    "| Priority | Target | Segment | Route | Send method |",
    "|---:|---|---|---|---|",
    ...rows.map(
      (row) =>
        `| ${row.priority} | ${row.target} | ${row.segment} | ${row.route} | ${row.sendMethod} |`
    ),
    ""
  ].join("\n");
}

const batch01 = parseCsv(await readFile(join(ROOT, "buyer-validation-outreach-batch-01.csv"), "utf8"));
const batch02 = parseCsv(await readFile(join(ROOT, "buyer-validation-outreach-batch-02.csv"), "utf8"));

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

const directEmailCount = [...normalized01, ...normalized02].filter(
  (row) => row.sendMethod === "direct-email"
).length;

const output = [
  "# NoticeKit Validation Outreach Send Plan",
  "",
  "Date: 2026-04-21",
  "",
  "This plan translates the prepared outreach batches into the first operational send queue.",
  "It does not mark any outreach as sent.",
  "",
  `Direct-email targets identified: ${directEmailCount}`,
  "",
  "## First-Day Priority",
  "",
  "Send the direct-email targets first when a sender is available.",
  "Hold web-form / contact-sales targets for manual sending or browser-based follow-up.",
  "",
  planSection("Batch 01", normalized01),
  planSection("Batch 02", normalized02),
  "## Notes",
  "",
  "- `direct-email` means the public route is a real email address or `mailto:` link.",
  "- `manual-form` means the public route is a contact page, support widget, or contact-sales flow that needs human submission.",
  "- `manual` means the route needs a different delivery path before it can be sent.",
  "- Keep the first five founder/operator targets ahead of advisor outreach, matching `VALIDATION-OUTREACH-SEND-RUNBOOK.md`.",
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
