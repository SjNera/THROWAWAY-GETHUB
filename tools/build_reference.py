"""Write phase0/reference.html and phase0/review_list.md from graph.json (all cities). Run: python -I tools/build_reference.py"""
import json, os, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
g = json.load(open(os.path.join(ROOT, 'phase0', 'graph.json'), encoding='utf-8'))
S = g['sources']; esc = html.escape; CN = {c: v['name'] for c, v in g['cities'].items()}
def link(e):
    s = S[e['source']]
    return s['url'] + (f"#page={e['pdf_page']}" if s['type'] == 'pdf' and e['pdf_page'] else '')
def jour(ref):
    for sid in g['services']:
        if f':{sid}:' in ref + ':' or ref.endswith(':' + sid): return g['services'][sid]['name']
    if ref.startswith('office:'): return 'Offices'
    if ref.startswith('req:'): return 'Requirements'
    return 'Other'
rows = {}
for e in g['evidence']: rows.setdefault((e['city'], jour(e['ref'])), []).append(e)
used = {e['source'] for e in g['evidence']}
H = ['<!doctype html><meta charset="utf-8"><title>Phase 0 reference – ' + ' and '.join(CN.values()) + '</title>',
     '<style>body{font:14px/1.45 system-ui;margin:24px;max-width:1200px}table{border-collapse:collapse;width:100%;margin:8px 0 24px}td,th{border:1px solid #ccc;padding:4px 8px;vertical-align:top}th{background:#f3f3f3;text-align:left}.nr{background:#fff4d6}.q{color:#444;font-style:italic}code{background:#eee;padding:0 3px}</style>',
     f'<h1>Phase 0 cross-reference</h1><p>Cities: {esc(", ".join(CN.values()))}. Built {g["meta"]["built"]}. <b>pdf_page</b> is the physical page of the PDF (not the printed page number). Links open the source at that page. Status <code>auto_verified</code> = the quote was found on that page by script; <code>needs_review</code> = a human must confirm (fees, times, HTML transcriptions). No record is human-verified yet.</p>']
H.append('<h2>Coverage (all sources)</h2><table><tr><th>City</th><th>ID</th><th>Title</th><th>Edition</th><th>Type</th><th>Pages</th><th>Used by graph</th><th>Local file</th><th>sha256</th></tr>')
for sid, s in S.items():
    H.append(f'<tr><td>{s["city"]}</td><td>{sid}</td><td><a href="{s["url"]}">{esc(s["title"])}</a></td><td>{esc(s["edition"])}</td><td>{s["type"]}</td><td>{s.get("pdf_pages","–")}</td><td>{"yes" if sid in used else "no"}</td><td>{esc(s["local_file"])}</td><td>{s["sha256"][:12]}…</td></tr>')
H.append('</table>')
listed = {os.path.basename(s['local_file']) for s in S.values()}
for folder in ('qc-charters', 'mkn-charters'):
    d = os.path.join(ROOT, folder)
    extra = sorted(f for f in os.listdir(d) if f.lower().endswith('.pdf') and f not in listed) if os.path.isdir(d) else []
    if extra: H.append(f'<p>Downloaded to <code>{folder}/</code> but not registered as a source (candidates for the next pass): {esc(", ".join(extra))}</p>')
for (c, j) in sorted(rows):
    H.append(f'<h2>{esc(CN[c])} – {esc(j)}</h2><table><tr><th>Record</th><th>Source</th><th>PDF page</th><th>Quote found</th><th>Status</th><th>Note</th></tr>')
    for e in rows[(c, j)]:
        cls = ' class="nr"' if e['status'] != 'auto_verified' else ''
        H.append(f'<tr{cls}><td>{esc(e["ref"])}</td><td><a href="{link(e)}">{esc(S[e["source"]]["title"])}</a></td><td>{e["pdf_page"] or "–"}</td><td class="q">“{esc(e["quote"])}”</td><td>{e["status"]}</td><td>{esc(e.get("note") or "")}</td></tr>')
    H.append('</table>')
open(os.path.join(ROOT, 'phase0', 'reference.html'), 'w', encoding='utf-8').write('\n'.join(H))

# ---- review list ----
R = ['# Review list (human checks needed before marking records `verified`)', '', f'Cities: {", ".join(CN.values())}. Built {g["meta"]["built"]}.', '']
R.append('## 1. Conflicts between sources')
R.append('- **QC** building permit payment window: DBO service sheet says Treasurer windows 13 or 14; QCitizen guide says Counter 12 (Ground Floor, DBO). Confirm with DBO.')
R.append('- **QC** PDAO: the 2025 charter and 2025 service sheet agree (online 3 days, walk-in 40 min). The 2023 edition differed (1 week / 45 min); older editions were not used.')
R.append('- **Marikina** PWD ID total time: 2024 CSWDO charter says 16 minutes; the 2022 omnibus charter says 11 minutes 10 seconds. The 2024 edition is used.')
R.append('- **Marikina** senior ID: the 2022 charter listed “Valid Id with Marikina Address” and gave a 40-minute total for its combined application/booklet/medicine service (OSCA ID needs a valid ID with Marikina address); the 2024 charter lists a longer ID list and 6 minutes for the ID with booklet. The 2024 edition is used.')
R.append('- **Marikina** BPLO: the file on the BPLO site named “BPLOX 1748569905.pdf” is the 2021 1st edition; “BPLO CITIZENS CHARTER 2026.pdf” is newer and differs on every page checked (layout, staff names, some amendment/retirement requirements). For renewal (pp.7-9) the visible differences are “Marikina Business Portal Compliance” became “eBOSS Compliance”, and the insurance line now names “Any Accredited Insurance Company”. The 2026 file is used; the 2021 file is registered but not cited.')
R.append('')
R.append('## 2. Fees and times (flagged needs_review)')
for e in g['evidence']:
    if e['status'] == 'needs_review' and (':fee' in e['ref'] or ':time' in e['ref']):
        R.append(f'- `{e["ref"]}` — “{e["quote"]}” — {S[e["source"]]["title"]}, PDF p.{e["pdf_page"]}')
R.append('')
R.append('## 3. Not stated in sources (shown as "Not listed — confirm with the office")')
for sid, s in g['services'].items():
    for v in s['variants']:
        for f in ('fee', 'time'):
            if v[f] == 'not_listed': R.append(f'- {CN[s["city"]]}: {s["name"]} ({v["channel"]}): {f}')
R.append('- QC business permit renewal: no single total time in the charter (30 minutes per evaluation stage).')
R.append('- QC building permit: fee is a computed Order of Payment (Schedule of Fees); time depends on simple/complex/highly technical class.')
R.append('- Marikina building permit: the fee column gives no amount, only “Based on Philippine Electrical Code, Mechanical Code and National Building Code”.')
R.append('- Marikina business permit renewal: the charter gives 15 minutes per stage (file, pay) and no total; the fee is “Revenue Code of Marikina City” with no amount.')
R.append('- Marikina offices with no address or phone in the sources read: PDAO (under CSWDO), Office of the Building Official.')
R.append('')
R.append('## 4. HTML-sourced records (transcribed by Claude from page reads; reopen URL and compare)')
for sid, s in S.items():
    if s['type'] == 'html': R.append(f'- {CN[s["city"]]}: {s["title"]}: {s["url"]}')
R.append('')
R.append('## 5. Map pins')
for oid, o in g['offices'].items():
    if o.get('map'): R.append(f'- {o["name"]}: address captured, coordinates missing (`needs_review`)')
R.append('')
R.append('## 6. Marikina-specific checks')
R.append('- **Office locations inside City Hall.** OSCA, the City Civil Registry Office and the Treasury Office are listed under “City Hall Offices” on the contact page. Floor and room are not stated. BPLO is at the Ground Floor, Finance Bldg, Shoe Ave.')
R.append('- **PWD ID photos.** The 2024 CSWDO charter prints “Pcs. 1x1 Picture” with the number missing; the 2022 charter says 3 pcs. The graph says “1x1 ID picture” with no count.')
R.append('- **Senior ID requirement list.** The PDF text order is jumbled (“3 pcs. Latest 1x1 ID, PHYLSIS National ID, UMID Card …”). It is modelled as 3 photos plus one valid ID or document from the list. Check against PDF page 3 of the OSCA charter.')
R.append('- **Business renewal, public liability insurance.** It is listed under “Additional requirements” after the walk-in list. The graph applies it to walk-in only. Confirm whether online renewal also needs it.')
R.append('- **Business renewal, online requirements.** Taken from the BPLO FAQ (business account number, gross sales, financial statement and quarterly VAT); the charter’s online section lists no requirements.')
R.append('- **Walk-in only.** Senior ID, PWD ID, birth certificate copy, birth registration and building permit show only an in-person variant because no online process appears in the Marikina sources read. Confirm that none exists.')
R.append('- **Late birth registration** (after 30 days, 15 working days per the 2024 CCRO charter) is not modelled; the app says “not covered” and names the Civil Registry Office, as for QC.')
R.append('- **Not modelled.** The City Treasury Office and CPDO (locational clearance) charters are downloaded and extracted but not used. Locational clearance is an external requirement pointing at CPDO.')
R.append('')
R.append('## 7. Scope limits and open items')
R.append('- Barangay clearance/certificate, certificate of disability, TCT, building plans and IDs are `external` nodes (no charter covers them).')
R.append('- QC senior ID: no OSCA charter PDF found; source is the QCitizen guide (HTML). Fee/time unknown.')
R.append('- QC birth registration after 30 days (delayed) is "not covered" and routes to CCRD; its service sheet is downloaded but not modelled.')
R.append('- Birth certificate copies: only records registered in the city itself (QC or Marikina); PSA copies are out of scope.')
R.append('- QC disability types are simplified to apparent / non-apparent / cancer-rare; Marikina has no such split (one requirement list).')
R.append('- Taglish question text exists only for some questions.')
open(os.path.join(ROOT, 'phase0', 'review_list.md'), 'w', encoding='utf-8').write('\n'.join(R))
print('ok', sum(len(v) for v in rows.values()))
