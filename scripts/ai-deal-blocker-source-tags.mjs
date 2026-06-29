export const AI_DEAL_BLOCKER_ENTRY_SOURCES = [
  "homepage-hero",
  "homepage-job-one-answer",
  "free-tools-ai-deal-blocker",
  "start-here-ai-deal-blocker",
  "pricing-ai-route-one-answer",
  "pricing-ai-deal-blocker",
  "blog-index-ai-deal-blocker",
  "ai-procurement-hub-deal-blocker"
];

export const AI_DEAL_BLOCKER_BRANCHES = [
  { suffix: "builder", label: "answer builder" },
  { suffix: "triage-builder", label: "triage -> answer builder" },
  { suffix: "answer-bank", label: "answer bank" },
  { suffix: "triage-answer-bank", label: "triage -> answer bank" },
  { suffix: "evidence-map", label: "evidence map" },
  { suffix: "triage-evidence-map", label: "triage -> evidence map" },
  { suffix: "agent-workspace", label: "AI agent workspace" },
  { suffix: "triage-agent-workspace", label: "triage -> AI agent workspace" },
  { suffix: "teardown", label: "free teardown" },
  { suffix: "triage-teardown", label: "triage -> free teardown" },
  { suffix: "spreadsheet-rows", label: "spreadsheet rows" },
  { suffix: "triage-spreadsheet-rows", label: "triage -> spreadsheet rows" },
  { suffix: "openai-answer-template", label: "OpenAI answer template" },
  { suffix: "triage-openai-answer-template", label: "triage -> OpenAI answer template" },
  { suffix: "anthropic-answer-template", label: "Anthropic answer template" },
  { suffix: "triage-anthropic-answer-template", label: "triage -> Anthropic answer template" },
  { suffix: "claude-answer-template", label: "Claude answer template" },
  { suffix: "triage-claude-answer-template", label: "triage -> Claude answer template" },
  { suffix: "gemini-answer-template", label: "Gemini answer template" },
  { suffix: "triage-gemini-answer-template", label: "triage -> Gemini answer template" },
  { suffix: "microsoft-copilot-answer-template", label: "Microsoft Copilot answer template" },
  { suffix: "triage-microsoft-copilot-answer-template", label: "triage -> Microsoft Copilot answer template" },
  { suffix: "audit", label: "audit details" },
  { suffix: "triage-audit", label: "triage -> audit details" }
];

export const AI_DEAL_BLOCKER_REQUEST_TYPES = [
  { suffix: "teardown", label: "inline teardown" },
  { suffix: "audit", label: "inline audit" },
  { suffix: "triage-teardown", label: "triage inline teardown" },
  { suffix: "triage-audit", label: "triage inline audit" }
];

export function buildAiDealBlockerBranchSourceTags() {
  return AI_DEAL_BLOCKER_ENTRY_SOURCES.flatMap((entrySource) =>
    AI_DEAL_BLOCKER_BRANCHES.map(({ suffix, label }) => ({
      tag: `${entrySource}-${suffix}`,
      label: `${entrySource} -> ${label}`,
      entrySource,
      suffix
    }))
  );
}

export function buildAiDealBlockerRequestSourceTags() {
  return AI_DEAL_BLOCKER_ENTRY_SOURCES.flatMap((entrySource) =>
    AI_DEAL_BLOCKER_REQUEST_TYPES.map(({ suffix, label }) => ({
      tag: `${entrySource}-${suffix}`,
      label: `${entrySource} -> ${label}`,
      entrySource,
      suffix
    }))
  );
}
