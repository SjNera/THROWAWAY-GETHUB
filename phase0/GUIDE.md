# Phase 0 Guide: the QC Knowledge Base

Built 2026-11-18 · version `0.1-phase0` · Quezon City only

## 1. What Phase 0 is

Phase 0 turns QC's citizen charters and service guides into one file, `graph.json`. Every later phase reads that file. Nothing else is needed at runtime: no server, no AI call to look up a fee or a step.

```
QC charters (PDF) + QC web guides
        │  extract text, pick quotes, check each quote against its page
        ▼
   graph.json  ──►  Phase 1–6: match intent, ask questions
                    Phase 7: walk the graph to build the roadmap
                    Phase 8: fill in office, address, fee, time per step
                    Phase 9–10: show roadmap, optional follow-up Q&A
```

Every fact in the graph points to a quote and a PDF page, so a person can check it.

## 2. What's in the folder

| File | What it is | Who opens it |
|---|---|---|
| `phase0/graph.json` | The knowledge base | The app |
| `phase0/reference.html` | Every journey as a table, with a link to the cited PDF page | Reviewers |
| `phase0/review_list.md` | The list of things a human must check | Reviewers |
| `phase0/sources.yaml` | Each source: URL, edition, file, hash, date accessed | Maintainers |
| `phase0/validation_report.txt` | Latest check: 0 errors, 9 of 9 tests pass | Anyone |
| `phase0/test_roadmaps.json` | Roadmap output for the 9 test cases | Phase 7 developers |
| `phase0/GUIDE.md` | This guide | Everyone |
| `tools/` | The scripts that build and check everything | Maintainers |
| `extract/` | Page-by-page text from the PDFs, plus web-page transcriptions | Maintainers |
| `qc-charters/` | The 16 PDFs you downloaded | Reference |

## 3. What the graph covers

**Size:** 6 intents, 8 services, 29 requirements, 15 questions, 9 offices, 13 sources, 76 evidence records.

**The 6 things a user can ask for:**

| Intent | Leads to | Office |
|---|---|---|
| PWD ID application | PWD ID (online or walk-in) | PDAO |
| Senior citizen ID | Senior Citizen QC ID | OSCA |
| Business permit renewal | Business permit renewal | BPLD |
| Building permit | Building / construction permit | DBO |
| Birth certificate copy | Certified true copy of birth certificate | CCRD |
| Birth registration | Registration of live birth (within 30 days) | CCRD |

Two helper services are pulled in only when something needs them: **e-Services account registration** and **business tax payment** (CTO).

**Not covered (the app says "not covered" and names the office):**
- Late birth registration (after 30 days). Its sheet is downloaded but not modelled.
- PSA copies of birth certificates. Only QC-registered births are included.
- Anything outside the 6 intents above.

**Not stated in any source** (the app shows "Not listed — confirm with the office"):
- Senior ID fee and time.
- e-Services registration fee and time.
- Business renewal total time.

**Outside QC charters** (kept as "external" items the person gets themselves): barangay clearance or certificate, certificate of disability, land title (TCT), building plans, government IDs.

## 4. How `graph.json` is organized

```
graph.json
├─ meta            version, build date, scope, disclaimer
├─ sources{13}     where each fact comes from (file, URL, edition, hash)
├─ offices{9}      name, address, phone, channel, map pin
├─ requirements{29}  things a person needs. Each is either:
│                    issuer_service → you get it from another service in the graph
│                    external       → you prepare it yourself
├─ services{8}     what the person actually does
│   └─ variants    one per channel (online / in_person), each with:
│                  office, fee, time, requires[], url, detail_steps[], note
├─ intents{6}      what the user says → which service. English and Tagalog aliases
├─ questions{15}   what the app can ask, with options (English and Tagalog)
└─ evidence[76]    quote + PDF page + status for every fee, time and requirement
```

**Reading one requirement line** (PWD ID, online):

```json
{"req": "r-cert-disability",
 "when": {"disability_type": "non_apparent"},
 "skip_if": {"has_med_cert": "yes"}}
```

In plain words: "Needs a certificate of disability, but only for a non-apparent disability, and not if the person already has one."

- `when` decides whether the item applies at all.
- `skip_if` drops it if the person already has it.
- An `or_options` item means "one of these": for example a government ID **or** a barangay certificate as proof of residence. It has a `default` pick for when the person doesn't say.

## 5. How a roadmap is built (Phase 7 and 8)

1. Start at the service the intent points to. Pick the variant for the person's channel.
2. For each requirement, drop it if `when` doesn't match or `skip_if` matches.
3. If a requirement comes from another service (`issuer_service`), add that service too, and repeat step 2 for it.
4. Group steps by depth: things you can do first go first. Steps in the same group can be done in any order.
5. Fill in each step with office, address, fee, time, what to bring, and the link. Anything missing shows "Not listed — confirm with the office".

**Worked example: senior ID, online, no QC ID, no valid ID, no birth certificate.** The roadmap comes out in 3 groups (this is test T3):

| Group | Steps | Order |
|---|---|---|
| 1 | Get a barangay certificate of residency · prepare a 2x2 photo and signature · register on QC E-Services | any order |
| 2 | Get a certified true copy of your birth certificate (CCRD) | after group 1 |
| 3 | Apply for the Senior Citizen QC ID (OSCA) | last |

The senior ID pulled in a whole second service (the birth certificate copy), which itself needed the E-Services account. The graph handled that without any special case.

The same input always gives the same roadmap. The tests also check this by reversing the answer order.

## 6. How far to trust it

**Evidence statuses** (each of the 76 records has one):

| Status | Count | Meaning |
|---|---|---|
| `auto_verified` | 59 | A script found the quote on the cited PDF page |
| `needs_review` | 17 | Fees and times. The quote was found, but a person should confirm the value |
| `quote_not_found` | 0 | Would mean a broken citation. None now |

**What is checked automatically** (`tools/validate.py`): every reference resolves, no loops, all question answers are valid, source file hashes match, every quote is on its page, and 9 test journeys give the expected roadmap. Current result: 0 errors, 0 warnings, 9 of 9 pass.

**What is not checked:**
- No record is human-verified yet.
- The web-page sources (senior ID, PWD, business renewal, building permit guides, office contacts) were transcribed by Claude from the browser. Reopen the URL and compare.
- Map pins have an address but no coordinates.
- One source conflict: the building permit payment window is Treasurer windows 13 or 14 in the DBO sheet, but Counter 12 in the QCitizen guide.
- The PWD ID fee quote ("None (2-3 days") is weak. Check it first.

**Page numbers:** `pdf_page` is the physical page in the PDF file, usually 1 more than the printed page number.

## 7. What to do next

1. Open `review_list.md` and work through it top to bottom (conflicts, then fees and times, then missing values, then web sources).
2. Open `reference.html` and click through a few journeys. Each row links to the PDF page.
3. For each record you confirm, mark it `verified`.
4. Optional: add map coordinates for the 6 offices.
5. Start Phase 1 on top of `graph.json`.

## 8. Rebuild and edit

All data lives in one place: `tools/build_phase0.py`. Never edit `graph.json` by hand. To change anything:

```
python3 -I tools/build_phase0.py     # rebuild graph.json and sources.yaml
python3 -I tools/validate.py         # check it, run the 9 tests
python3 -I tools/build_reference.py  # refresh reference.html and review_list.md
```

Run them in that order from the `AWS Hackathon` folder.

Quirks: files can't be deleted in the connected folder (a stray `.w` file stays), and each `qc-charters/` PDF must keep its filename, or its hash check fails.

## 9. Glossary

| Term | Meaning |
|---|---|
| Intent | What the user wants ("PWD ID", "renew my business permit") |
| Service | An actual government procedure that ends with something issued |
| Variant | One way to do a service: online or in person. Each has its own fee, time and needs |
| Requirement | A document or item a person needs. Either issued by another service or prepared by the person |
| Evidence | A quote from a source, tied to a PDF page, that backs a fact |
| `when` / `skip_if` | Conditions: apply this item only if... / drop it if the person already has it |
| Owned-skip | The `has_...` question (for example `has_birth_certificate`). Answering "yes" skips the service that issues it |
| `not_covered` | The roadmap result when the request is outside the graph. It names the office instead |
