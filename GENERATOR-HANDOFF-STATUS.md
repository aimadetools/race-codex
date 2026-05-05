# Generator Handoff Status

Checked at: 2026-05-05 20:30 UTC
Generator URL: https://noticekit.tech/generator.html
Teardown URL: https://noticekit.tech/free-teardown.html?source=generator-page&channel=generator-prefill&company=Example+SaaS&email=privacy%40example.com&subprocessor_url=https%3A%2F%2Fexample.com%2Fsubprocessors&vendor_change=add%3A+Acme+Email+Cloud+for+transactional+email+delivery.+Data+categories%3A+customer+names%2C+email+addresses%2C+and+message+metadata.+Processing+region%3A+United+States+and+EU.&deadline=EU+customers+on+a+signed+DPA.+Notice+date%3A+2026-05-05.+Planned+effective+date%3A+2026-06-09.+Objection+deadline%3A+2026-06-04.&review_need=Review+the+generated+notice+packet%2C+timeline%2C+and+evidence+checklist.+Internal+note%3A+Counsel+review+required+before+send.+Save+the+notice+draft%2C+page+snapshot%2C+recipient+list%2C+and+any+objections+in+one+evidence+folder.
Audit URL: https://noticekit.tech/audit-request.html?source=generator-page&channel=generator-prefill&company=Example+SaaS&email=privacy%40example.com&subprocessor_url=https%3A%2F%2Fexample.com%2Fsubprocessors&vendor_change=add%3A+Acme+Email+Cloud+for+transactional+email+delivery.+Data+categories%3A+customer+names%2C+email+addresses%2C+and+message+metadata.+Processing+region%3A+United+States+and+EU.&deadline=EU+customers+on+a+signed+DPA.+Notice+date%3A+2026-05-05.+Planned+effective+date%3A+2026-06-09.+Objection+deadline%3A+2026-06-04.&review_need=Review+the+generated+notice+packet%2C+timeline%2C+and+evidence+checklist.+Internal+note%3A+Counsel+review+required+before+send.+Save+the+notice+draft%2C+page+snapshot%2C+recipient+list%2C+and+any+objections+in+one+evidence+folder.&type=free_async_teardown
HTTP status: generator 200, teardown 200, audit 200

## Result

- Status: ok
- Live generator browser execution produced a populated free-teardown handoff URL.
- Live free-teardown browser execution preserved the generator-prefilled fields and produced an audit-request intake URL.
- Live audit-request browser execution hydrated the prefilled teardown form from that intake URL.
- Request type: free_async_teardown
- Source tag: generator-page
- Submission channel: generator-prefill

## Assertions

- The live generator kept the `send-packet` CTA pointed at `free-teardown.html` with generator source and generator-prefill channel tags.
- The generated free-teardown URL carried company, reply email, subprocessor page URL, vendor-change context, and customer-segment/deadline context.
- The live free-teardown page preserved those query params into its visible builder fields and the downstream audit-request handoff link.
- The live audit-request page applied those query params into the visible form fields and teardown UI copy.
