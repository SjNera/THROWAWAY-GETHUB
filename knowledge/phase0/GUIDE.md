# Phase 0 Guide: the Knowledge Base (Quezon City + Marikina)

Built 2026-11-20 · version `0.2-phase0-multicity` · cities: `qc` (Quezon City), `mkn` (Marikina City)

## 1. What Phase 0 is

Phase 0 turns each city's citizen charters and service guides into one file, `graph.json`. Every later phase reads that file. Nothing else is needed at runtime: no server, no AI call to look up a fee or a step.

```
QC charters + web guides ─┐
                          ├─ extract text, pick quotes, check each quote against its page
Marikina charters + web ──┘
        ▼
   graph.json  ──►  Phase 1–6: match intent, ask questions (the first question is the city)
                    Phase 7: walk the graph for that city to build the roadmap
                    Phase 8: fill in office, address, fee, time per step
                    Phase 9–10: show roadmap, optional follow-up Q&A
```

Every fact in the graph points to a quote and a PDF page, so a person can check it.

## 2. What's in the folder

| File | What it is | Who opens it |
|---|---|---|
| `phase0/graph.json` | The knowledge base, both cities | The app |
| `phase0/reference.html` | Every journey as a table per city, with a link to the cited PDF page | Reviewers |
| `phase0/review_list.md` | The list of things a human must check | Reviewers |
| `phase0/sources.yaml` | Each source: city, URL, edition, file, hash, date accessed | Maintainers |
| `phase0/validation_report.txt` | Latest check: errors, 27 tests, QC regression | Anyone |
| `phase0/test_roadmaps.json` | Roadmap output for every test case | Phase 7 developers |
| `phase0/baseline_qc_test_roadmaps.json` | QC roadmaps from before the multi-city change; the validator compares against it | Maintainers |
| `phase0/LOG.md` | What was actually done for the Marikina extension | Maintainers |
| `tools/` | Scripts that build and check everything (see section 8) | Maintainers |
| `extract/` | Page-by-page text from the PDFs, plus web-page transcriptions (`extract/html/`) | Maintainers |
| `qc-charters/`, `mkn-charters/` | The downloaded source files per city (`mkn-charters/web-raw/` has raw HTML) | Reference |
| `archive/` (was `_backup_pre_multicity/`) | Copy of the QC-only scripts and outputs from before the change | Safety net |

## 3. What the graph covers

| | Quezon City | Marikina City |
|---|---|---|
| Services | 8 | 7 |
| Offices | 9 | 11 |
| Requirements | 29 | 27 |
| Sources | 13 | 16 (9 cited) |
| Evidence records | 76 | 70 |
| Questions (city-specific) | 10 | 4 |

6 questions are shared by both cities (`city`, `channel`, `is_representative`, `parents_married`, `within_30_days`, `permit_class`).

**The 6 things a user can ask for** (same intent in both cities, each resolves to that city's own service):

| Intent | Quezon City | Marikina City |
|---|---|---|
| PWD ID application | PDAO, online or walk-in | PDAO (under CSWDO), walk-in |
| Senior citizen ID | OSCA, online or walk-in | OSCA, walk-in |
| Business permit renewal | BPLD, via QC e-Services | BPLO, online portal or walk-in |
| Building permit | DBO, online + kiosk | Office of the Building Official, walk-in |
| Birth certificate copy | CCRD, online or walk-in | City Civil Registry Office, walk-in |
| Birth registration | CCRD, within 30 days | City Civil Registry Office, within 30 days |

Helper services pulled in only when needed: QC e-Services registration and QC business tax payment; Marikina Online Services account registration.

**Not covered (the app says "not covered" and names the office):**
- Late birth registration (after 30 days), in both cities. Both sheets are downloaded but not modelled.
- PSA copies of birth certificates. Only city-registered births are included.
- Anything outside the 6 intents, any intent a city has no service for, and any other city. The message names the city's fallback office when one exists (Marikina City Hall; none for QC).

**Not stated in any source** (the app shows "Not listed — confirm with the office"): QC senior ID fee and time, QC e-Services registration fee and time, QC business renewal total time, Marikina Online Services registration fee and time. Marikina building permit and business renewal fees are given by rule (code), not amount.

**Outside the charters** (kept as "external" items the person gets themselves): barangay clearance or certificate, certificate of disability, medical certificate, land title (TCT), building plans, government IDs, locational clearance, insurance.

## 4. How `graph.json` is organized

```
graph.json
├─ meta            version, build date, cities, scope, disclaimer
├─ cities{2}       code → name, fallback_office
├─ sources{29}     where each fact comes from (city, file, URL, edition, hash)
├─ offices{20}     name, address, phone, channel, map pin       ids: qc.pdao, mkn.osca ...
├─ requirements{56} things a person needs. Each is either:
│                    issuer_service → you get it from another service in the graph (has owned_key)
│                    external       → you prepare it yourself
├─ services{15}    what the person actually does
│   └─ variants    one per channel (online / in_person), each with:
│                  office, fee, time, requires[], url, detail_steps[], note
├─ intents{6}      what the user says → service_by_city {qc: qc.s-..., mkn: mkn.s-...}. English and Tagalog aliases
├─ questions{20}   what the app can ask, with options. Shared ones have city "all"
└─ evidence[146]   quote + PDF page + status for every fee, time and requirement
```

**City rule.** Every city-specific id is prefixed with its city (`qc.`, `mkn.`). A service may only use offices, requirements, issuer services and questions of its own city (or shared questions). The validator checks this, and also that each evidence record cites a source from the same city.

**Reading one requirement line** (Marikina PWD ID):

```json
{"req": "mkn.r-med-cert", "when": {}, "skip_if": {"mkn.has_med_cert": "yes"}}
```

In plain words: "Needs the medical certificate, unless the person already has it."

- `when` decides whether the item applies at all.
- `skip_if` drops it if the person already has it.
- An `or_options` item means "one of these", with a `default` pick for when the person doesn't say.
- `owned_key` (on requirements issued by another service) is the answer key whose value `yes` skips the whole issuing service.

## 5. How a roadmap is built (Phase 7 and 8)

1. Read `answers.city`. Unknown or missing city → "not covered".
2. Look up the intent's `service_by_city[city]`. Missing → "not covered in <city>" with that city's fallback office.
3. Pick the service variant for the person's channel.
4. For each requirement, drop it if `when` doesn't match or `skip_if` matches.
5. If a requirement comes from another service (`issuer_service`), add that service too, and repeat step 4 for it (unless `owned_key` is `yes`).
6. Group steps by depth: things you can do first go first. Steps in the same group can be done in any order.
7. Fill in each step with office, address, fee, time, what to bring, and the link. Anything missing shows "Not listed — confirm with the office".

Worked examples are in `test_roadmaps.json`: QC T3 (senior ID pulls in a birth certificate copy and e-Services registration) and Marikina M9 (online business renewal pulls in the portal account first).

The same input always gives the same roadmap. The tests also check this by reversing the answer order, and that no step comes from another city.

## 6. How far to trust it

**Evidence statuses:** `auto_verified` 115 (a script found the quote on the cited page), `needs_review` 31 (fees and times; a person should confirm the value), `quote_not_found` 0.

**What is checked automatically** (`tools/validate.py`): every reference resolves, no loops, city isolation, all question answers are valid, source file hashes match, every quote is on its page, 27 test journeys (9 QC, 13 Marikina, 5 cross-city), and that the 9 QC journeys give exactly the same roadmaps as before the multi-city change (ignoring the `qc.` prefix). Current result: 0 errors, 0 warnings, 27 of 27 pass.

**What is not checked:**
- No record is human-verified yet.
- Web-page sources were transcribed by Claude from page reads. Reopen the URL and compare.
- Map pins have an address but no coordinates.
- The Marikina tests prove the graph matches the sources I read, not that the offices still work that way.
- Marikina's main source is the 2024 per-office charters (2026 for BPLO). Some are over two years old.
- Open source conflicts and ambiguities are in `review_list.md` (sections 1 and 6).

**Page numbers:** `pdf_page` is the physical page in the PDF file, usually different from the printed page number (the Marikina charters print their own numbering).

## 7. What to do next

1. Work through `review_list.md` top to bottom (conflicts, fees and times, missing values, Marikina checks, web sources).
2. Open `reference.html` and click through a few journeys per city. Each row links to the PDF page.
3. For each record you confirm, mark it `verified`.
4. Optional: add map coordinates for the offices; add late birth registration; add Marikina CTO / CPDO services.
5. To add another city: add `tools/data_<city>.py` and a line in `CITIES` in `tools/build_phase0.py`.
6. Start Phase 1 on top of `graph.json`. The first question the app asks is `city`.

## 8. Rebuild and edit

All data lives in `tools/data_qc.py` and `tools/data_mkn.py` (written with city-local ids). `tools/phase0_lib.py` has the shared helpers, and `tools/build_phase0.py` prefixes the ids and merges the cities. Never edit `graph.json` by hand. To change anything:

```
python -I tools/extract_mkn.py <pdf folder> extract   # only when adding PDFs (PyMuPDF; Tesseract OCR fallback)
python -I tools/build_phase0.py     # rebuild graph.json and sources.yaml (fails if any quote is not found)
python -I tools/validate.py         # check it, run the 27 tests
python -I tools/build_reference.py  # refresh reference.html and review_list.md
```

Run them in that order from the `knowledge/` folder (all Phase 0 files live there since 2026-11-22; paths in this guide are relative to it). `extract_fast.py` and `extract.py` are the older QC extractors (they need `pdfinfo` / `pdftoppm`, which are not installed on this machine).

Quirks: each PDF in `qc-charters/` and `mkn-charters/` must keep its filename, or its hash check fails. In the Marikina PDFs, the text extractor turns apostrophes into a replacement character; quotes are normalised for it, but keep quotes short and avoid apostrophes and bullet symbols.

## 9. Glossary

| Term | Meaning |
|---|---|
| City | `qc` or `mkn`. Every city-specific id starts with it |
| Intent | What the user wants ("PWD ID", "renew my business permit"), shared across cities |
| Service | An actual government procedure that ends with something issued |
| Variant | One way to do a service: online or in person. Each has its own fee, time and needs |
| Requirement | A document or item a person needs. Either issued by another service or prepared by the person |
| Evidence | A quote from a source, tied to a PDF page, that backs a fact |
| `when` / `skip_if` | Conditions: apply this item only if... / drop it if the person already has it |
| Owned-skip | A `has_...` question (the requirement's `owned_key`). Answering "yes" skips the service that issues it |
| `not_covered` | The roadmap result when the request is outside the graph. It names the office when it can |
