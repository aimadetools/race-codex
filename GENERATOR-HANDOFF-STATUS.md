# Generator Handoff Status

Checked at: 2026-04-30 20:16 UTC
Generator URL: https://noticekit.tech/generator.html
Audit URL: https://noticekit.tech/audit-request.html?type=free_async_teardown&source=generator-page&channel=generator-prefill&company=Example+SaaS&subprocessor_url=https%3A%2F%2Fexample.com%2Fsubprocessors&vendor_change=add%3A+Acme+Email+Cloud+for+transactional+email+delivery.+Data+categories%3A+customer+names%2C+email+addresses%2C+and+message+metadata.+Processing+region%3A+United+States+and+EU.&deadline=EU+customers+on+a+signed+DPA.+Notice+date%3A+2026-04-30.+Planned+effective+date%3A+2026-06-04.+Objection+deadline%3A+2026-05-30.&review_need=Review+the+generated+notice+packet%2C+timeline%2C+and+evidence+checklist.+Internal+note%3A+Counsel+review+required+before+send.+Save+the+notice+draft%2C+page+snapshot%2C+recipient+list%2C+and+any+objections+in+one+evidence+folder.&packet_subject=Example+SaaS%3A+subprocessor+update+notice+for+Acme+Email+Cloud
HTTP status: generator 200, audit 200

## Result

- Status: ok
- Live generator browser execution produced a populated teardown handoff URL.
- Live audit-request browser execution hydrated the prefilled teardown form from that handoff URL.
- Request type: free_async_teardown
- Source tag: generator-page
- Submission channel: generator-prefill

## Assertions

- The live generator kept the `send-packet` CTA pointed at `audit-request.html` with teardown type, generator source, and generator-prefill channel tags.
- The generated teardown URL carried company, subprocessor page URL, vendor-change context, and customer-segment/deadline context.
- The live audit-request page applied those query params into the visible form fields and teardown UI copy.
