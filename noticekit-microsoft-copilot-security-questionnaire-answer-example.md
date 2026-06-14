# Microsoft Copilot Security Questionnaire Answer Example

Use this as an operating example when a buyer names Microsoft Copilot, Copilot Studio, or Azure OpenAI directly and the team needs to see one filled answer shape before drafting its own response.

## Filled answer example

**Microsoft Copilot use in scope:** We use Microsoft Copilot for an internal support workflow that drafts customer-reply suggestions inside the agent workspace before any final message is sent. The current rollout under review covers enterprise support queues and selected account-management handoffs.

**Data categories involved:** Support ticket text, account identifiers, escalation notes, and agent prompts may be processed in this workflow. File attachments and payment records are outside the first rollout until the attachment-scope review closes.

**Approval boundary and action scope:** The workflow can read ticket context and draft suggested replies, but it cannot send messages, change account settings, or trigger customer-facing notices without human approval in the support tool.

**Supporting vendor chain:** Supporting vendors in the same workflow include Microsoft Azure for the named AI service, Vercel for application hosting, Supabase for database storage, PostHog for product analytics, and Zendesk for support operations.

**Retention and training stance:** Our current operating position is that customer content sent through this workflow is processed through the business offering covered by the vendor terms and is not used to train public models. The source of truth for this position is the vendor terms link plus the internal review notes saved with the packet draft.

**Customer scope and impact:** The initial rollout scope is enterprise and EU support queues, with additional review for signed DPA customers and customers with custom notice language. We are confirming whether this workflow changes the public subprocessor page or triggers a customer notice before activation.

**Proof and owner:** Supporting proof for this answer includes the public subprocessor page URL, draft internal review packet, vendor terms link, workflow screenshot, tracker row, and owner notes. The current reply owner is the privacy ops lead with counsel review, and the open questions are notice timing plus attachment scope.

## Replace before sending

- Swap the workflow for the exact Copilot-backed feature or internal process under review.
- Replace the data categories with the actual prompts, records, attachments, or identifiers in scope.
- Update the supporting vendor chain to the real hosting, database, analytics, support, and review tools tied to that workflow.
- Point the retention and training stance to the actual vendor terms and internal source of truth.
- Name the affected customer segment, contract class, or region and keep the open notice or counsel questions visible.
