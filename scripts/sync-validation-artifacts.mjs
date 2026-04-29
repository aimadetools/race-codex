#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
const TASKS = [
  { label: "Help request status", script: "build-help-request-status.mjs" },
  { label: "Contact inbox status", script: "build-contact-inbox-status.mjs" },
  { label: "Founder follow-up pass", script: "build-founder-follow-up-pass.mjs" },
  { label: "Advisor follow-up pass", script: "build-advisor-follow-up-pass.mjs" },
  { label: "Validation send plan", script: "build-validation-send-plan.mjs" },
  { label: "Homepage copy refresh queue", script: "build-homepage-copy-refresh-queue.mjs" },
  { label: "Validation positioning brief", script: "build-validation-positioning-brief.mjs" },
  { label: "Validation decision brief", script: "build-validation-decision-brief.mjs" },
  { label: "Validation status", script: "build-validation-status.mjs" },
  { label: "Validation watch", script: "check-validation-reply-watch.mjs", args: ["--write"] }
];

function runTask(task) {
  const result = spawnSync("node", [join(ROOT, "scripts", task.script), ...(task.args || [])], {
    cwd: ROOT,
    encoding: "utf8"
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`${task.label} failed.`);
  }
}

try {
  for (const task of TASKS) {
    runTask(task);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
