# Marikina sources downloaded into this folder (mkn-charters/)
Accessed 2026-11-20. Every PDF opened and was a text PDF (no OCR needed). sha256 of each file is in `phase0/sources.yaml`.

## PDFs
| File | URL | Edition | Used in graph |
|---|---|---|---|
| MARIKINA-2022-Citizens-Charter.pdf (364 pp.) | https://www.marikina.gov.ph/facts/MARIKINA%202022%20Citizens%20Charter.pdf | 2022 omnibus, all offices | cross-checks only |
| FDPP-OSCA.pdf | https://fdpp.marikina.gov.ph/file/citizens%20charter/osca.pdf | 2024 | senior ID |
| FDPP-CSWDO.pdf | https://fdpp.marikina.gov.ph/file/citizens%20charter/cswdo.pdf | 2024 | PWD ID (PDAO is service 3 in this charter) |
| FDPP-CCRO-Civil-Registry.pdf | https://fdpp.marikina.gov.ph/file/citizens%20charter/civil%20registry.pdf | 2024 | birth registration, birth certificate copy |
| FDPP-OBO-Building-Official.pdf | https://fdpp.marikina.gov.ph/file/citizens%20charter/building%20official.pdf | 2024 | building permit |
| BPLO-CITIZENS-CHARTER-2026.pdf | https://bplo.marikina.gov.ph/charter/BPLO%20CITIZENS%20CHARTER%202026.pdf | 2026 1st Ed. | business permit renewal |
| BPLO-CITIZENS-CHARTER-2021-1st-Ed.pdf | https://bplo.marikina.gov.ph/charter/BPLOX%201748569905.pdf | 2021 1st Ed. (older) | registered, not cited |
| FDPP-CTO-Treasury.pdf | https://fdpp.marikina.gov.ph/file/citizens%20charter/treasury.pdf | 2024 | registered, not modelled |
| FDPP-CPDO-Planning.pdf | https://fdpp.marikina.gov.ph/file/citizens%20charter/planning.pdf | 2024 | registered, not modelled |

The per-office list comes from https://fdpp.marikina.gov.ph/citizen-charter (it links 40+ office charters; only the ones above were downloaded).

## Web pages (raw HTML in `web-raw/`, text transcriptions in `extract/html/mkn-*.txt`)
- https://marikina.gov.ph/contact-us  — City Hall address, phones (`mkn-contacts.txt`)
- https://bplo.marikina.gov.ph/contact — BPLO address and phone (`mkn-bplo-contact.txt`)
- https://bplo.marikina.gov.ph/faq — online renewal steps (`mkn-bplo-faq.txt`)
- https://bplo.marikina.gov.ph/ and /citizen-charter — BPLO home and charter page
- https://payment.marikina.gov.ph/Marikina/OnlineServices/ — online services sign-in page (needs an account; nothing behind it was read)
- https://www.marikina.gov.ph/ — city home page
- `web-raw/` also holds a few pages that returned 404 (`bplo_marikina_gov_ph_bplo_html.html`, `www_marikina_gov_ph_contact.html`, `www_marikina_gov_ph_contactus.html`); kept only as a record.

## Not found / not downloaded
- A PDAO-specific charter, a senior-ID or PWD-ID web guide, and an online process for any service other than business permit renewal. The Marikina sources read describe those as walk-in.
- Office addresses for PDAO and the Building Official, and exact room/floor for OSCA, the Civil Registry and Treasury.
- Barangay clearance / residency (barangay-level, as for QC).
