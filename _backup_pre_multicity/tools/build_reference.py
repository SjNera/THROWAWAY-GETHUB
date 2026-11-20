import json, os, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
g = json.load(open(os.path.join(ROOT, 'phase0', 'graph.json'), encoding='utf-8'))
S = g['sources']; esc = html.escape
def link(e):
    s = S[e['source']]
    u = s['url'] + (f"#page={e['pdf_page']}" if s['type'] == 'pdf' and e['pdf_page'] else '')
    return u
def jour(ref):
    for sid in g['services']:
        if f':{sid}:' in ref + ':' or ref.endswith(':' + sid): return g['services'][sid]['name']
    if ref.startswith('office:'): return 'Offices'
    if ref.startswith('req:'): return 'Requirements'
    return 'Other'
rows = {}
for e in g['evidence']: rows.setdefault(jour(e['ref']), []).append(e)
used = {e['source'] for e in g['evidence']}
H = ['<!doctype html><meta charset="utf-8"><title>Phase 0 reference – QC services</title>',
     '<style>body{font:14px/1.45 system-ui;margin:24px;max-width:1200px}table{border-collapse:collapse;width:100%;margin:8px 0 24px}td,th{border:1px solid #ccc;padding:4px 8px;vertical-align:top}th{background:#f3f3f3;text-align:left}.nr{background:#fff4d6}.q{color:#444;font-style:italic}code{background:#eee;padding:0 3px}</style>',
     f'<h1>Phase 0 cross-reference</h1><p>Built {g["meta"]["built"]}. <b>pdf_page</b> is the physical page of the PDF (not the printed page number). Links open the source at that page. Status <code>auto_verified</code> = the quote was found on that page by script; <code>needs_review</code> = a human must confirm (fees, times, HTML transcriptions). No record is human-verified yet.</p>']
H.append('<h2>Coverage (all sources)</h2><table><tr><th>ID</th><th>Title</th><th>Edition</th><th>Type</th><th>Pages</th><th>Used by graph</th><th>Local file</th><th>sha256</th></tr>')
for sid, s in S.items():
    H.append(f'<tr><td>{sid}</td><td><a href="{s["url"]}">{esc(s["title"])}</a></td><td>{esc(s["edition"])}</td><td>{s["type"]}</td><td>{s.get("pdf_pages","–")}</td><td>{"yes" if sid in used else "no"}</td><td>{esc(s["local_file"])}</td><td>{s["sha256"][:12]}…</td></tr>')
H.append('</table><p>Extracted but not used yet (in <code>qc-charters/</code>): the full PDAO 2025 charter beyond cross-checks, DBO 2025 charter, CTO 2024 charter, CPDO zoning charter, locational clearance renewal, final certificates, renewal-of-business-permit service sheet, delayed birth registration, birth registration via BRO, CTC online. Candidates for the next pass.</p>')
for j in sorted(rows):
    H.append(f'<h2>{esc(j)}</h2><table><tr><th>Record</th><th>Source</th><th>PDF page</th><th>Quote found</th><th>Status</th><th>Note</th></tr>')
    for e in rows[j]:
        cls = ' class="nr"' if e['status'] != 'auto_verified' else ''
        H.append(f'<tr{cls}><td>{esc(e["ref"])}</td><td><a href="{link(e)}">{esc(S[e["source"]]["title"])}</a></td><td>{e["pdf_page"] or "–"}</td><td class="q">“{esc(e["quote"])}”</td><td>{e["status"]}</td><td>{esc(e.get("note") or "")}</td></tr>')
    H.append('</table>')
open(os.path.join(ROOT, 'phase0', 'reference.html'), 'w', encoding='utf-8').write('\n'.join(H))
# review list
R = ['# Review list (human checks needed before marking records `verified`)', '']
R.append('## 1. Conflicts between sources')
R.append('- Building permit payment window: DBO service sheet says Treasurer windows 13 or 14; QCitizen guide says Counter 12 (Ground Floor, DBO). Confirm with DBO.')
R.append('- PDAO: the 2025 charter and 2025 service sheet agree (online 3 days, walk-in 40 min). The 2023 edition differed (1 week / 45 min); older editions were not used.')
R.append('')
R.append('## 2. Fees and times (flagged needs_review)')
for e in g['evidence']:
    if e['status'] == 'needs_review': R.append(f'- `{e["ref"]}` — “{e["quote"]}” — {S[e["source"]]["title"]}, PDF p.{e["pdf_page"]}')
R.append('')
R.append('## 3. Not stated in sources (shown as "Not listed — confirm with the office")')
for sid, s in g['services'].items():
    for v in s['variants']:
        for f in ('fee', 'time'):
            if v[f] == 'not_listed': R.append(f'- {s["name"]} ({v["channel"]}): {f}')
R.append('- Business permit renewal: no single total time in the charter (30 minutes per evaluation stage).')
R.append('- Building permit: fee is a computed Order of Payment (Schedule of Fees); time depends on simple/complex/highly technical class.')
R.append('')
R.append('## 4. HTML-sourced records (transcribed by Claude from browser reads; reopen URL and compare)')
for sid, s in S.items():
    if s['type'] == 'html': R.append(f'- {s["title"]}: {s["url"]}')
R.append('')
R.append('## 5. Map pins')
for oid, o in g['offices'].items():
    if o.get('map'): R.append(f'- {o["name"]}: address captured, coordinates missing (`needs_review`)')
R.append('')
R.append('## 6. Scope limits and open items')
R.append('- Barangay clearance/certificate, Certificate of Disability, TCT, building plans, IDs are `external` nodes (no QC charter covers them).')
R.append('- Senior ID: no OSCA charter PDF found; source is the QCitizen guide (HTML). Fee/time unknown.')
R.append('- Birth registration after 30 days (delayed) is "not covered" and routes to CCRD; its service sheet is downloaded but not modelled.')
R.append('- Birth CTC: only QC-registered births; PSA copies are out of scope.')
R.append('- Disability types for PWD are simplified to apparent / non-apparent / cancer-rare; the specialist-by-type list is stored as a hint source only.')
R.append('- Taglish question text exists only for some questions.')
open(os.path.join(ROOT, 'phase0', 'review_list.md'), 'w', encoding='utf-8').write('\n'.join(R))
print('ok', sum(len(v) for v in rows.values()))
