# Review list (human checks needed before marking records `verified`)

## 1. Conflicts between sources
- Building permit payment window: DBO service sheet says Treasurer windows 13 or 14; QCitizen guide says Counter 12 (Ground Floor, DBO). Confirm with DBO.
- PDAO: the 2025 charter and 2025 service sheet agree (online 3 days, walk-in 40 min). The 2023 edition differed (1 week / 45 min); older editions were not used.

## 2. Fees and times (flagged needs_review)
- `svc:s-pwd-id:online:fee` — “None (2-3 days” — PDAO – Registration and Issuance of PWD ID (service sheet), PDF p.1
- `svc:s-pwd-id:online:time` — “ONLINE APPLICATION TOTAL : 3 Days” — PDAO – Registration and Issuance of PWD ID (service sheet), PDF p.5
- `svc:s-pwd-id:walkin:fee` — “None (2-3 days” — PDAO – Registration and Issuance of PWD ID (service sheet), PDF p.1
- `svc:s-pwd-id:walkin:time` — “WALK-IN APPLICATION TOTAL : 40 minutes” — PDAO – Registration and Issuance of PWD ID (service sheet), PDF p.5
- `svc:s-birth-ctc:walkin:fee` — “PHP 65.00” — CCRD – Request and Issuance of CTC of Birth Certificate (service sheet), PDF p.1
- `svc:s-birth-ctc:walkin:time` — “15 Minutes -” — CCRD – Request and Issuance of CTC of Birth Certificate (service sheet), PDF p.1
- `svc:s-birth-ctc:online:fee` — “PHP 65.00” — CCRD – CTC of Birth/Marriage/Death via Civil Registry Online Services, PDF p.1
- `svc:s-birth-ctc:online:time` — “1-3 Days and” — CCRD – CTC of Birth/Marriage/Death via Civil Registry Online Services, PDF p.1
- `svc:s-birth-registration:walkin:fee` — “TOTAL: None 5 Minutes” — City Civil Registry Dept. Citizen’s Charter 2025 (8th Ed.), PDF p.5
- `svc:s-birth-registration:walkin:time` — “TOTAL: None 5 Minutes” — City Civil Registry Dept. Citizen’s Charter 2025 (8th Ed.), PDF p.5
- `svc:s-birth-registration:online:fee` — “NONE” — City Civil Registry Dept. Citizen’s Charter 2025 (8th Ed.), PDF p.5
- `svc:s-birth-registration:online:time` — “1 - 3 Days” — City Civil Registry Dept. Citizen’s Charter 2025 (8th Ed.), PDF p.6
- `svc:s-business-tax-payment:fee` — “As stated” — CTO – Collection of Business Tax (service sheet), PDF p.1
- `svc:s-business-tax-payment:time` — “Total 10 minutes” — CTO – Collection of Business Tax (service sheet), PDF p.1
- `svc:s-business-permit-renewal:fee` — “None 30 mins.” — BPLD Citizen’s Charter (as of February 2025), PDF p.7
- `svc:s-building-permit:fee` — “Schedule 5 at windows 13 or” — DBO – Issuance of Construction Permits (service sheet), PDF p.12
- `svc:s-building-permit:time` — “3 (simple permit applications)-7 (complex permit applications)” — DBO – Issuance of Construction Permits (service sheet), PDF p.11

## 3. Not stated in sources (shown as "Not listed — confirm with the office")
- QC E-Services account registration (online): fee
- QC E-Services account registration (online): time
- Business permit renewal (online): time
- Senior Citizen QC ID (OSCA) (online): fee
- Senior Citizen QC ID (OSCA) (online): time
- Senior Citizen QC ID (OSCA) (in_person): fee
- Senior Citizen QC ID (OSCA) (in_person): time
- Business permit renewal: no single total time in the charter (30 minutes per evaluation stage).
- Building permit: fee is a computed Order of Payment (Schedule of Fees); time depends on simple/complex/highly technical class.

## 4. HTML-sourced records (transcribed by Claude from browser reads; reopen URL and compare)
- QCitizen Guide – How to Apply for PWD ID: https://quezoncity.gov.ph/qcitizen-guides/how-to-apply-for-pwd-id/
- QCitizen Guide – How to Apply for Senior Citizen Card: https://quezoncity.gov.ph/qcitizen-guides/how-to-apply-for-senior-citizen-card/
- QCitizen Guide – How to Renew Business Permit: https://quezoncity.gov.ph/qcitizen-guides/how-to-renew-business-permit/
- QCitizen Guide – How to Apply Online for a Building Permit: https://quezoncity.gov.ph/qcitizen-guides/how-to-apply-for-a-building-permit/
- QC department contact pages (OSCA, DBO, BPLD, CTO): https://quezoncity.gov.ph/departments/

## 5. Map pins
- Persons with Disability Affairs Office (PDAO): address captured, coordinates missing (`needs_review`)
- Office for the Senior Citizens’ Affairs (OSCA): address captured, coordinates missing (`needs_review`)
- Business Permits and Licensing Department (BPLD): address captured, coordinates missing (`needs_review`)
- City Treasurer’s Office (CTO): address captured, coordinates missing (`needs_review`)
- Department of the Building Official (DBO): address captured, coordinates missing (`needs_review`)
- City Civil Registry Department (CCRD): address captured, coordinates missing (`needs_review`)

## 6. Scope limits and open items
- Barangay clearance/certificate, Certificate of Disability, TCT, building plans, IDs are `external` nodes (no QC charter covers them).
- Senior ID: no OSCA charter PDF found; source is the QCitizen guide (HTML). Fee/time unknown.
- Birth registration after 30 days (delayed) is "not covered" and routes to CCRD; its service sheet is downloaded but not modelled.
- Birth CTC: only QC-registered births; PSA copies are out of scope.
- Disability types for PWD are simplified to apparent / non-apparent / cancer-rare; the specialist-by-type list is stored as a hint source only.
- Taglish question text exists only for some questions.