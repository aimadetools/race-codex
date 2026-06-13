export const AI_DEAL_BLOCKER_ENTRY_SOURCES = [
  "homepage-hero",
  "free-tools-ai-deal-blocker",
  "start-here-ai-deal-blocker",
  "pricing-ai-deal-blocker",
  "blog-index-ai-deal-blocker",
  "ai-procurement-hub-deal-blocker"
];

export const AI_DEAL_BLOCKER_BRANCHES = [
  { suffix: "builder", label: "answer builder" },
  { suffix: "answer-bank", label: "answer bank" },
  { suffix: "evidence-map", label: "evidence map" },
  { suffix: "agent-workspace", label: "AI agent workspace" },
  { suffix: "teardown", label: "free teardown" }
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
