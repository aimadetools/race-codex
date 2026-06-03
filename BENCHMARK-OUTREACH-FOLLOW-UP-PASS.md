# Benchmark Outreach Follow-Up Pass

Date: 2026-05-28

Follow-up date: 2026-06-02 UTC

This pass covers the benchmark-led public-page outreach batch.
Use it only for rows that are still in `sent` status after three business days and remove any target that has already replied, bounced, redirected, or submitted a teardown request.

Prepared rows: 5

## Current Status

Benchmark follow-up has already been sent for 5 row(s), and no benchmark reply or teardown evidence is recorded yet.

## Follow-Up Queue

| Priority | Company | Segment | Status | Follow-up date | Recipient | Public page |
|---:|---|---|---|---|---|---|
| 1 | Inkeep | Founder/operator or privacy lead | followed_up | 2026-06-02 | privacy@inkeep.com | https://inkeep.com/policies/privacy |
| 2 | WipRadar | Founder/operator or privacy lead | followed_up | 2026-06-02 | legal@wipradar.com | https://wipradar.com/privacy |
| 3 | Cotool | Founder/operator or security lead | followed_up | 2026-06-02 | info@cotool.ai | https://www.cotool.ai/subprocessors |
| 4 | AgentLattice | Founder/operator or security lead | followed_up | 2026-06-02 | security@agentlattice.com | https://www.agentlattice.io/docs/subprocessors |
| 5 | Superhuman | Founder/operator or privacy lead | followed_up | 2026-06-02 | privacy@superhuman.com | https://superhuman.com/legal/subprocessors |

## Follow-Up Copy

Subject: Re: Quick question on your public AI review page

Hi there,

Quick follow-up.

I reached out because your team already has a public page, which usually means the hard part is no longer whether to publish something, but whether a buyer or counsel can actually move forward from what is already public.

If a short async gap read is useful, here is the teardown path again:
`<row-specific teardown URL>`

If not, even a one-line reply would help: is the real pain usually the questionnaire answer itself, the public page, or neither?

Best,
NoticeKit

Benchmark context URL: `https://noticekit.tech/blog-subprocessor-benchmark-report-01.html?source=benchmark-outreach-report`.
Use the row-specific teardown URL listed below so the source tag and public page stay attached to the reply path.

## Row-Specific Teardown URLs

- Inkeep: `https://noticekit.tech/free-teardown.html?source=benchmark-outreach-batch-01&channel=benchmark-email&company=Inkeep&subprocessor_url=https%3A%2F%2Finkeep.com%2Fpolicies%2Fprivacy&review_need=Follow-up+from+benchmark-led+outreach.+Please+give+the+3-bullet+async+gap+read+for+the+public+page+and+buyer-facing+review+path.`
- WipRadar: `https://noticekit.tech/free-teardown.html?source=benchmark-outreach-batch-01&channel=benchmark-email&company=WipRadar&subprocessor_url=https%3A%2F%2Fwipradar.com%2Fprivacy&review_need=Follow-up+from+benchmark-led+outreach.+Please+give+the+3-bullet+async+gap+read+for+the+public+page+and+buyer-facing+review+path.`
- Cotool: `https://noticekit.tech/free-teardown.html?source=benchmark-outreach-batch-01&channel=benchmark-email&company=Cotool&subprocessor_url=https%3A%2F%2Fwww.cotool.ai%2Fsubprocessors&review_need=Follow-up+from+benchmark-led+outreach.+Please+give+the+3-bullet+async+gap+read+for+the+public+page+and+buyer-facing+review+path.`
- AgentLattice: `https://noticekit.tech/free-teardown.html?source=benchmark-outreach-batch-01&channel=benchmark-email&company=AgentLattice&subprocessor_url=https%3A%2F%2Fwww.agentlattice.io%2Fdocs%2Fsubprocessors&review_need=Follow-up+from+benchmark-led+outreach.+Please+give+the+3-bullet+async+gap+read+for+the+public+page+and+buyer-facing+review+path.`
- Superhuman: `https://noticekit.tech/free-teardown.html?source=benchmark-outreach-batch-01&channel=benchmark-email&company=Superhuman&subprocessor_url=https%3A%2F%2Fsuperhuman.com%2Flegal%2Fsubprocessors&review_need=Follow-up+from+benchmark-led+outreach.+Please+give+the+3-bullet+async+gap+read+for+the+public+page+and+buyer-facing+review+path.`

## Send Command

`set -a && source .env.production.local && set +a && npm run run:ai-outreach-follow-up-gate -- --send --transport resend`

## Send Guardrails

- Do not send before 2026-06-02 UTC.
- Do not send to any target that has already replied, bounced, redirected, or submitted a teardown request.
- Dry-run `npm run run:ai-outreach-follow-up-gate -- --transport resend` first if you need to confirm both AI follow-up queues before the live send.
- Rebuild `BENCHMARK-OUTREACH-STATUS.md` immediately after the send so the queue flips from `sent` to `followed_up`.
- If the batch still shows 0 replies, redirects, or teardown requests on 2026-06-05 UTC after the June 2 follow-up, record that the second-touch angle is exhausted and leave the batch parked until a new offer or segment decision exists.
- Record the first real benchmark reply or redirect in `COMMUNITY-FEEDBACK.md` before changing the benchmark copy or target list.
