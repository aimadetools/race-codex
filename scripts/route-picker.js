(function () {
  const routeMatrix = {
    oneAnswer: {
      title: "Start with the AI starter pack.",
      summary:
        "One live answer is blocking the deal, so the shortest route is the starter pack or builder before the review widens.",
      bullets: [
        "Best for one sendable reply now",
        "Keeps the answer block and handoff bundle together",
        "Leaves repeat-review cleanup for later",
      ],
      primaryHref: "ai-security-questionnaire-starter-pack.html",
      primaryLabel: "Open Starter pack",
      secondaryHref: "ai-security-questionnaire-answer-builder.html",
      secondaryLabel: "Build answer + bundle",
    },
    dueDiligence: {
      title: "Use the due diligence route.",
      summary:
        "The buyer is already speaking procurement language, so keep the thread in the due-diligence template, scorecard, or packet builder instead of forcing it back into a shorter answer path.",
      bullets: [
        "Best when the buyer wants vendor chain or framework coverage",
        "Keeps approval owner, review date, and escalation path together",
        "Use the evidence map if one claim still needs proof",
      ],
      primaryHref: "blog-ai-due-diligence-questionnaire-template.html",
      primaryLabel: "Open due diligence template",
      secondaryHref: "ai-due-diligence-packet-builder.html",
      secondaryLabel: "Build due diligence packet",
    },
    namedVendor: {
      title: "Use the named-vendor answer library.",
      summary:
        "The buyer already named a model family or vendor, so start with the answer library and matching vendor pages instead of a generic paragraph.",
      bullets: [
        "Best when the reviewer named OpenAI, Anthropic, Gemini, Claude, or Copilot",
        "Keeps the vendor-specific template, example, and answer bank one click away",
        "Use the SIG guide when the thread shifts into exact-match questionnaire wording",
      ],
      primaryHref: "ai-security-questionnaire-answer-library.html",
      primaryLabel: "Open answer library",
      secondaryHref: "blog-sig-caiq-vsaq-questionnaire-automation.html",
      secondaryLabel: "Open SIG / CAIQ / VSAQ guide",
    },
    sigGuide: {
      title: "Use the exact-match SIG guide.",
      summary:
        "The reviewer wants SIG, CAIQ, or VSAQ wording, so keep the thread on the commercial-search guide instead of a broader questionnaire path.",
      bullets: [
        "Best when the buyer uses exact questionnaire-family language",
        "Keeps the SIG / CAIQ / VSAQ path separate from the generic automation guide",
        "Use the due-diligence template if the thread also wants vendor chain or framework mapping",
      ],
      primaryHref: "blog-sig-caiq-vsaq-questionnaire-automation.html",
      primaryLabel: "Open SIG / CAIQ / VSAQ guide",
      secondaryHref: "ai-security-questionnaire-answer-library.html",
      secondaryLabel: "Open answer library",
    },
    agent: {
      title: "Use the AI agent control route.",
      summary:
        "The thread has shifted into tool access, approval gates, or audit trail questions, so the agent workspace is the cleanest next step.",
      bullets: [
        "Best when the blocker is control scope, not copy",
        "Keeps tool list, approvals, and blocked actions together",
        "Use the checklist or approval-gate template if you need a second pass",
      ],
      primaryHref: "ai-agent-review-workspace.html",
      primaryLabel: "Open AI agent workspace",
      secondaryHref: "blog-ai-agent-tool-access-review.html",
      secondaryLabel: "Open tool-access template",
    },
    notice: {
      title: "Use the notice workflow tools.",
      summary:
        "The blocker is a vendor-change notice path, so the generator and self-audit are the fastest pair to keep separate from the questionnaire flow.",
      bullets: [
        "Best for customer notice timing and objection windows",
        "Keeps evidence logging separate from buyer questionnaire work",
        "Use teardown only if the workflow still looks brittle",
      ],
      primaryHref: "generator.html",
      primaryLabel: "Open local generator",
      secondaryHref: "self-audit.html",
      secondaryLabel: "Run self-audit",
    },
    inventory: {
      title: "Start with the inventory workspace.",
      summary:
        "The vendor story is still messy, so clean the facts before writing the answer.",
      bullets: [
        "Best when vendors, regions, owners, or proof links are scattered",
        "Creates one local source of truth before drafting",
        "Keeps the risk checklist and worksheet one click away",
      ],
      primaryHref: "blog-ai-vendor-inventory-template.html",
      primaryLabel: "Open inventory workspace",
      secondaryHref: "blog-ai-vendor-risk-assessment.html",
      secondaryLabel: "Open risk checklist",
    },
    proof: {
      title: "Open the evidence map.",
      summary:
        "The paragraph exists, but the proof trail is thin, so package the claim, owner, review date, and recheck trigger first.",
      bullets: [
        "Best when the buyer wants proof links or named ownership",
        "Keeps review date and approval path explicit",
        "Use the builder or packet when the proof needs to rejoin a fuller thread",
      ],
      primaryHref: "ai-security-review-evidence-map.html",
      primaryLabel: "Open evidence map",
      secondaryHref: "ai-security-questionnaire-answer-builder.html",
      secondaryLabel: "Build answer + bundle",
    },
    spreadsheetRows: {
      title: "Use the builder for spreadsheet rows.",
      summary:
        "You already have the questionnaire rows or portal export, so the fastest move is to paste them into the builder and keep the imported row metadata intact.",
      bullets: [
        "Best when the buyer already sent a sheet or portal export",
        "Keeps the copy-ready answer and row-level response pack together",
        "Lets you preserve row metadata before the thread gets retyped elsewhere",
      ],
      primaryHref: "ai-security-questionnaire-answer-builder.html",
      primaryLabel: "Build answer + bundle",
      secondaryHref: "ai-security-questionnaire-starter-pack.html",
      secondaryLabel: "Open Starter pack",
    },
    repeatReview: {
      title: "Use the answer bank or Pro kit.",
      summary:
        "The same questions keep coming back, so reusable wording is the fastest fix.",
      bullets: [
        "Best when the review is recurring",
        "Keeps wording, proof links, and packet files reusable",
        "Use the starter pack only if you still need one answer now",
      ],
      primaryHref: "ai-security-questionnaire-answer-bank.html",
      primaryLabel: "Open answer bank",
      secondaryHref: "ai-security-questionnaire-pro-kit.html",
      secondaryLabel: "Open Pro kit",
    },
    judgment: {
      title: "Open the deal blocker path first.",
      summary:
        "You do not need another template yet; you need the triage page that keeps free teardown and paid audit in one place.",
      bullets: [
        "Best when the thread needs judgment",
        "Keeps the free teardown and paid audit together",
        "Prevents another loop through a generic template",
      ],
      primaryHref: "ai-deal-blocker.html",
      primaryLabel: "Open deal blocker path",
      secondaryHref: "ai-security-questionnaire-audit.html",
      secondaryLabel: "See audit details",
    },
    pack: {
      title: "Inspect the sample bundle first.",
      summary:
        "You need a fuller handoff package, so show the exact bundle shape before you ask for checkout.",
      bullets: [
        "Best when the buyer wants more than one paragraph",
        "Use the sample bundle to inspect the artifact shape",
        "Move into the packet builder if the thread is already procurement-sized",
      ],
      primaryHref: "ai-security-questionnaire-starter-bundle-sample.html",
      primaryLabel: "Open sample bundle",
      secondaryHref: "ai-due-diligence-packet-builder.html",
      secondaryLabel: "Build due diligence packet",
    },
    default: {
      title: "Start with the AI starter pack.",
      summary:
        "One live answer is blocking the deal, so the shortest route is the starter pack or builder before the review widens.",
      bullets: [
        "Best for one sendable reply now",
        "Keeps the answer block and handoff bundle together",
        "Leaves repeat-review cleanup for later",
      ],
      primaryHref: "ai-security-questionnaire-starter-pack.html",
      primaryLabel: "Open Starter pack",
      secondaryHref: "ai-security-questionnaire-answer-builder.html",
      secondaryLabel: "Build answer + bundle",
    },
  };

  const pageConfigs = [
    {
      root: "[data-route-picker='homepage']",
      sourceTag: "homepage-route-picker",
    },
    {
      root: "[data-route-picker='free-tools']",
      sourceTag: "free-tools-route-picker",
    },
    {
      root: "[data-route-picker='pricing']",
      sourceTag: "pricing-route-picker",
    },
    {
      root: "[data-route-picker='start-here']",
      sourceTag: "start-here-route-picker",
    },
    {
      root: "[data-route-picker='ai-procurement-hub']",
      sourceTag: "ai-procurement-hub-route-picker",
    },
  ];

  const withSource = (href, sourceTag) => {
    try {
      const url = new URL(href, window.location.href);
      url.searchParams.set("source", sourceTag);
      return url.pathname + url.search + url.hash;
    } catch (error) {
      return href;
    }
  };

  const setRecommendation = (root, recommendation, sourceTag, reason) => {
    const output = root.querySelector("[data-route-picker-output]");
    const primary = root.querySelector("[data-route-picker-primary]");
    const secondary = root.querySelector("[data-route-picker-secondary]");

    if (!output || !primary || !secondary) {
      return;
    }

    output.replaceChildren();

    const box = document.createElement("div");
    box.className = "route-recommendation";

    const context = document.createElement("p");
    context.className = "fine-print";
    context.textContent = `Recommendation for ${reason}:`;
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
  };

  const pickRecommendation = (blockerValue, languageValue, needValue) => {
    if (blockerValue === "spreadsheet-rows") {
      return { key: "spreadsheetRows", reason: "spreadsheet rows or portal export" };
    }

    if (languageValue === "exact-match") {
      return { key: "sigGuide", reason: "exact-match SIG / CAIQ / VSAQ wording" };
    }

    if (blockerValue === "named-vendor") {
      return { key: "namedVendor", reason: "named vendor or model family" };
    }

    if (languageValue === "due-diligence" || blockerValue === "due-diligence") {
      return { key: "dueDiligence", reason: "buyer-language due diligence" };
    }

    if (languageValue === "agent" || blockerValue === "agent") {
      return { key: "agent", reason: "AI agent controls" };
    }

    if (languageValue === "notice" || blockerValue === "notice") {
      return { key: "notice", reason: "notice workflow" };
    }

    if (blockerValue === "inventory") {
      return { key: "inventory", reason: "scattered vendor facts" };
    }

    if (blockerValue === "proof" || needValue === "proof") {
      return { key: "proof", reason: "proof-first cleanup" };
    }

    if (blockerValue === "repeat-review" || needValue === "repeat") {
      return { key: "repeatReview", reason: "repeat-review cleanup" };
    }

    if (blockerValue === "judgment" || needValue === "read") {
      return { key: "judgment", reason: "human judgment" };
    }

    if (needValue === "pack") {
      return { key: "pack", reason: "fuller handoff package" };
    }

    return { key: "oneAnswer", reason: "one-answer-now cleanup" };
  };

  const initPicker = (root, sourceTag) => {
    const blocker = root.querySelector("[data-route-picker-blocker]");
    const language = root.querySelector("[data-route-picker-language]");
    const need = root.querySelector("[data-route-picker-need]");

    if (!blocker || !language || !need) {
      return;
    }

    const update = () => {
      const blockerValue = blocker.value;
      const languageValue = language.value;
      const needValue = need.value;
      const recommendationKey = pickRecommendation(blockerValue, languageValue, needValue);
      setRecommendation(
        root,
        routeMatrix[recommendationKey.key] || routeMatrix.default,
        sourceTag,
        recommendationKey.reason,
      );
    };

    [blocker, language, need].forEach((control) => {
      control.addEventListener("change", update);
    });

    update();
  };

  pageConfigs.forEach(({ root, sourceTag }) => {
    document.querySelectorAll(root).forEach((picker) => initPicker(picker, sourceTag));
  });
})();
