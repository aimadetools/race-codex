(function () {
  const PASSTHROUGH_KEYS = [
    "type",
    "channel",
    "company",
    "email",
    "ownership_signal",
    "subprocessor_url",
    "vendor_change",
    "deadline",
    "review_need",
    "partner_role",
    "client_profile",
    "partner_goal",
    "partner_volume",
  ];

  const OFFER_MATRIX = {
    starter: {
      title: "Starter is the smallest fit.",
      summary:
        "The blocker still looks like one live answer, one cleaner handoff, or one spreadsheet-shaped response, so buy the smallest package that gets the reply out now.",
      bullets: [
        "Best when one buyer answer is blocked today",
        "Use it before the thread becomes repeat-review operations",
        "Switch to Audit only if the buyer has already pushed back on proof, controls, or judgment",
      ],
      primaryHref: "https://buy.stripe.com/5kQbJ16SIgtE7ge80feEo09",
      primaryLabel: "Buy Starter",
      secondaryHref: "ai-security-questionnaire-starter-pack-bundle-sample.html",
      secondaryLabel: "Inspect sample bundle",
    },
    pro: {
      title: "Pro is the better fit.",
      summary:
        "The same questionnaire pressure is returning, or the team needs reusable files instead of one answer block, so move into the repeat-review package.",
      bullets: [
        "Best when the next review is already predictable",
        "Keeps answer-bank, matrix, and packet-style files together",
        "Use Starter only if you still need one isolated answer now",
      ],
      primaryHref: "https://buy.stripe.com/cNieVd3Gw7X858680feEo08",
      primaryLabel: "Buy Pro",
      secondaryHref: "ai-security-questionnaire-pro-kit.html",
      secondaryLabel: "Inspect Pro fit",
    },
    audit: {
      title: "Concierge Audit is the right escalation.",
      summary:
        "The missing piece is judgment on a live thread, not another template. Buy the audit when proof, control scope, or buyer pushback needs a prioritized outside read.",
      bullets: [
        "Best when the buyer already pushed back or the deadline is real",
        "Keeps one live path narrow instead of broadening into another browse loop",
        "Use Pro only if the problem is repeatability, not judgment",
      ],
      primaryHref: "https://buy.stripe.com/14AbJ12Cs6T4cAy5S7eEo07",
      primaryLabel: "Buy 48-hour audit",
      secondaryHref: "audit-request.html?type=concierge_audit",
      secondaryLabel: "Send audit intake first",
    },
    default: {
      title: "Starter is the safest first buy.",
      summary:
        "If the blocker is still one answer now, start small and escalate only when the thread proves it needs repeat-review files or outside judgment.",
      bullets: [
        "Best when the blocker is still narrow",
        "Keeps the first paid step proportional to the live review",
        "Escalate only when the buyer asks for more than one answer block",
      ],
      primaryHref: "https://buy.stripe.com/5kQbJ16SIgtE7ge80feEo09",
      primaryLabel: "Buy Starter",
      secondaryHref: "pricing.html",
      secondaryLabel: "Review pricing again",
    },
  };

  const PAGE_CONFIGS = [
    {
      root: "[data-offer-picker='pricing']",
      sourceTags: {
        starter: "pricing-fit-starter",
        pro: "pricing-fit-pro",
        audit: "pricing-fit-audit",
      },
    },
    {
      root: "[data-offer-picker='ai-audit']",
      sourceTags: {
        starter: "ai-audit-fit-starter",
        pro: "ai-audit-fit-pro",
        audit: "ai-audit-fit-audit",
      },
    },
  ];

  function withSource(href, sourceTag) {
    try {
      const url = new URL(href, window.location.href);
      if (url.origin === window.location.origin) {
        url.searchParams.set("source", sourceTag);
        const query = new URLSearchParams(window.location.search);
        PASSTHROUGH_KEYS.forEach((key) => {
          const value = query.get(key);
          if (value && !url.searchParams.has(key)) {
            url.searchParams.set(key, value);
          }
        });
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return href;
    } catch (error) {
      return href;
    }
  }

  function pickRecommendation(blocker, state, need) {
    if (blocker === "spreadsheet-handoff") {
      if (state === "procurement-expanded" || need === "reusable-files") {
        return { key: "pro", reason: "spreadsheet handoff plus repeat-review pressure" };
      }

      return { key: "starter", reason: "spreadsheet-shaped first answer" };
    }

    if (
      need === "outside-read" ||
      state === "buyer-pushback" ||
      blocker === "proof-pushback" ||
      blocker === "agent-controls"
    ) {
      return { key: "audit", reason: "live-thread judgment" };
    }

    if (
      need === "reusable-files" ||
      blocker === "repeat-review" ||
      state === "repeatable"
    ) {
      return { key: "pro", reason: "repeat-review cleanup" };
    }

    if (state === "procurement-expanded" && need !== "send-one-answer") {
      return { key: "pro", reason: "broader handoff pressure" };
    }

    if (blocker === "unsure" && state === "procurement-expanded") {
      return { key: "audit", reason: "unclear thread plus real pressure" };
    }

    return { key: "starter", reason: "one-answer-now cleanup" };
  }

  function setRecommendation(root, recommendation, sourceTag, reason) {
    const output = root.querySelector("[data-offer-picker-output]");
    const primary = root.querySelector("[data-offer-picker-primary]");
    const secondary = root.querySelector("[data-offer-picker-secondary]");

    if (!output || !primary || !secondary) {
      return;
    }

    output.replaceChildren();

    const box = document.createElement("div");
    box.className = "route-recommendation";

    const context = document.createElement("p");
    context.className = "fine-print";
    context.textContent = `Best fit for ${reason}:`;
    box.append(context);

    const title = document.createElement("strong");
    title.textContent = recommendation.title;
    box.append(title);

    const summary = document.createElement("p");
    summary.className = "route-summary";
    summary.textContent = recommendation.summary;
    box.append(summary);

    const bullets = document.createElement("ul");
    recommendation.bullets.forEach((bullet) => {
      const item = document.createElement("li");
      item.textContent = bullet;
      bullets.append(item);
    });
    box.append(bullets);

    output.append(box);
    primary.textContent = recommendation.primaryLabel;
    primary.href = withSource(recommendation.primaryHref, sourceTag);
    secondary.textContent = recommendation.secondaryLabel;
    secondary.href = withSource(recommendation.secondaryHref, sourceTag);
  }

  function initPicker(root, sourceTags) {
    const blocker = root.querySelector("[data-offer-picker-blocker]");
    const state = root.querySelector("[data-offer-picker-state]");
    const need = root.querySelector("[data-offer-picker-need]");

    if (!blocker || !state || !need) {
      return;
    }

    const update = () => {
      const recommendationKey = pickRecommendation(
        blocker.value,
        state.value,
        need.value,
      );
      const recommendation =
        OFFER_MATRIX[recommendationKey.key] || OFFER_MATRIX.default;
      const sourceTag =
        sourceTags[recommendationKey.key] || sourceTags.starter;
      setRecommendation(root, recommendation, sourceTag, recommendationKey.reason);
    };

    [blocker, state, need].forEach((control) => {
      control.addEventListener("change", update);
    });

    update();
  }

  PAGE_CONFIGS.forEach(({ root, sourceTags }) => {
    document
      .querySelectorAll(root)
      .forEach((picker) => initPicker(picker, sourceTags));
  });
})();
