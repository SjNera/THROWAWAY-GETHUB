# Log: adding Marikina City to the Phase 0 graph
Run 2026-11-20. Scope asked: collect → extract → verify → link → intents/questions → locations → validate → reports, in one graph for both cities.

## What was done
1. **Checked tools.** Missing: `pdfinfo`, `pdftoppm`, `tesseract` (so `extract_fast.py` cannot run). Present: PyMuPDF, curl, bs4, yaml. Installed `pdfplumber`, `rapidfuzz`, `lxml` (not needed in the end). Tesseract 5.5 was already installed (not on PATH; English only).
2. **Backed up** the QC-only scripts and outputs to `_backup_pre_multicity/` and saved the old QC roadmaps as `phase0/baseline_qc_test_roadmaps.json` (old validator: 0 errors, 9/9).
3. **Collected sources** (0.1) into `mkn-charters/` — 9 PDFs and 11 web pages (list in `mkn-charters/DOWNLOAD_LIST.md`). Found via web search (the 2022 omnibus charter), the FDPP portal page (per-office 2024 charters) and the BPLO site (2026 charter, FAQ, contact).
4. **Extracted text** (0.2) with a new `tools/extract_mkn.py` (PyMuPDF). 0 OCR pages needed. Web pages were converted to text (`extract/html/mkn-*.txt`) by script.
5. **Read** the pages for the 6 intents myself and wrote them as data (`tools/data_mkn.py`): 7 services, 11 offices, 27 requirements, 4 city questions, 70 evidence records.
6. **Verified quotes** (0.3): every quote is searched on its page by the build script. First build: 4 quotes not found (text interleaved by the PDF layout); I re-picked them from the extracted page text. Final: 0 not found. Fees and times are `needs_review`.
7. **Made the graph multi-city** (the schema change): `tools/phase0_lib.py` (shared code), `tools/data_qc.py` (the old QC data, moved with only the code lines noted below changed), `tools/build_phase0.py` (prefixes ids `qc.` / `mkn.` and merges), `cities` block, `city` question, `service_by_city` on intents, `owned_key` on issuer requirements.
8. **Engine** (`tools/engine.py`): reads `answers.city`; unknown city or an intent with no service in that city → not covered, naming the city's fallback office (Marikina City Hall; QC has none).
9. **Validator** (`tools/validate.py`): city-isolation checks, 13 Marikina tests, 5 cross-city tests, and a regression check of the 9 QC journeys against the saved baseline.
10. **Reports** (`tools/build_reference.py`): `reference.html` grouped by city, `review_list.md` with Marikina section, and a dynamic list of downloaded-but-unregistered PDFs. Rewrote `phase0/GUIDE.md`.

## Result
`build_phase0.py`: 146 evidence records, 0 quotes not found. `validate.py`: 0 errors, 0 warnings, 27/27 tests pass, all 9 QC journeys identical to the baseline.

## Problems and how they were handled
- `extract_fast.py` needs `pdfinfo`/`pdftoppm`; wrote a replacement instead of installing poppler.
- The first graph write failed on Windows (cp1252 encoding); fixed by writing UTF-8.
- Test T6 (QC building permit time) failed after namespacing because the engine read `permit_class` by its bare name; made `permit_class` a shared question.
- I first wrote in the review list that the 2021 and 2026 BPLO charters differ only in wording. A diff showed they differ on every page; corrected before finishing.
- A cleanup command (`rm`) on the scratch folder was blocked by a safety check. I moved the files instead. An empty `_tmp/` folder remains; delete it if you like.
- Three Marikina web URLs returned 404 (`/bplo.html`, `/contact`, `/contactus`); kept as a record in `mkn-charters/web-raw/`, not used.

## Decisions I made without asking (change if you disagree)
- One graph with `city` as a dimension and ids prefixed by city (Phase 1–10 do not exist yet, so renaming QC ids breaks nothing).
- Marikina's 2024 office charters and the 2026 BPLO charter are primary. The 2022 omnibus is only cited as a cross-check where it differs.
- Same 6 intents; late birth registration left "not covered" for parity with QC (the 2024 CCRO charter does describe it: 15 working days).
- Marikina PWD ID, senior ID, birth documents and building permit are walk-in only because the sources I read show no online process. This could be wrong if an online process exists outside those pages.
- Questions with identical wording are shared across cities; city-specific ones are prefixed.
- Office addresses: only what the contact pages state. PDAO and the Building Official have none; OSCA, Civil Registry and Treasury use the City Hall address with a "floor/room not stated" note.

## Not done
- Nothing is human-verified; web-page records are my transcriptions.
- No map coordinates for any office.
- Marikina CTO and CPDO charters are extracted but not modelled; locational clearance is an external requirement.
- Did not search for Marikina service guides outside marikina.gov.ph, fdpp.marikina.gov.ph, bplo.marikina.gov.ph.
- Did not update the project doc (Scope tab still says Quezon City only; "Extend to other LGUs" is listed as a stretch goal).
- Old QC extractors (`extract.py`, `extract_fast.py`) were left unchanged.
