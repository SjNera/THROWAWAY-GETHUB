"""Validate phase0/graph.json (all cities) and run the roadmap tests. Run: python -I tools/validate.py"""
import json, os, sys, hashlib, re, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import roadmap
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
g = json.load(open(os.path.join(ROOT, 'phase0', 'graph.json'), encoding='utf-8'))
errs, warns, lines = [], [], []
def E(m): errs.append(m)
def W(m): warns.append(m)
CITIES = list(g['cities'])
SHARED_Q = {k for k, q in g['questions'].items() if q.get('city') == 'all'}
def city_of(i): return i.split('.', 1)[0] if '.' in i else None
def req_ids(item): return [item['req']] if 'req' in item else [x for o in item['or_options'] for x in o]

# 1 references + city isolation
for iid, i in g['intents'].items():
    for c, sid in i['service_by_city'].items():
        if c not in CITIES: E(f'intent {iid}: unknown city {c}')
        elif sid not in g['services']: E(f'intent {iid}/{c}: unknown service {sid}')
        elif city_of(sid) != c: E(f'intent {iid}/{c}: service {sid} belongs to another city')
for c, cv in g['cities'].items():
    if cv.get('fallback_office') and cv['fallback_office'] not in g['offices']: E(f'city {c}: unknown fallback office')
for oid, o in g['offices'].items():
    if o.get('city') != city_of(oid) or city_of(oid) not in CITIES: E(f'office {oid}: bad city tag')
for rid, r in g['requirements'].items():
    c = city_of(rid)
    if r.get('city') != c: E(f'req {rid}: bad city tag')
    if 'issuer_service' in r:
        if r['issuer_service'] not in g['services']: E(f'req {rid}: unknown issuer service')
        elif city_of(r['issuer_service']) != c: E(f'req {rid}: issuer service from another city')
        if r.get('owned_key') not in g['questions']: E(f'req {rid}: owned_key {r.get("owned_key")} is not a question')
    if r.get('external'):
        if r['external'] not in g['offices']: E(f'req {rid}: unknown external office')
        elif city_of(r['external']) != c: E(f'req {rid}: external office from another city')
    if not any(e['ref'] == f'req:{rid}' for e in g['evidence']): W(f'req {rid}: no evidence entry')
deps = {}
for sid, s in g['services'].items():
    c = city_of(sid); deps[sid] = set()
    if s.get('city') != c: E(f'service {sid}: bad city tag')
    for v in s['variants']:
        if v['office'] not in g['offices']: E(f'{sid}: unknown office {v["office"]}')
        elif city_of(v['office']) != c: E(f'{sid}: office {v["office"]} belongs to another city')
        if v['fee'] != 'not_listed' and not v['evidence']['fee']: E(f'{sid}/{v["channel"]}: fee has no evidence')
        if v['time'] != 'not_listed' and not v['evidence']['time']: W(f'{sid}/{v["channel"]}: time has no evidence ({v["time"]})')
        for item in v['requires']:
            if 'or_options' in item and not (0 <= item['default'] < len(item['or_options'])): E(f'{sid}: bad OR default')
            for rid in req_ids(item):
                if rid not in g['requirements']: E(f'{sid}: unknown requirement {rid}')
                else:
                    if city_of(rid) != c: E(f'{sid}: requirement {rid} belongs to another city')
                    if 'issuer_service' in g['requirements'][rid]: deps[sid].add(g['requirements'][rid]['issuer_service'])
            for k, val in list(item['when'].items()) + list(item['skip_if'].items()):
                q = g['questions'].get(k)
                if not q: E(f'{sid}: condition uses unknown question {k}')
                else:
                    if k not in SHARED_Q and city_of(k) != c: E(f'{sid}: question {k} belongs to another city')
                    for x in (val if isinstance(val, list) else [val]):
                        if x not in q['options']: E(f'{sid}: value {x} not an option of {k}')
    for k in s.get('question_keys', []):
        if k not in g['questions']: E(f'{sid}: question_keys has unknown {k}')
    for k in s.get('exit_if', {}):
        if k not in g['questions']: E(f'{sid}: exit_if uses unknown question {k}')
for qk, q in g['questions'].items():
    if q.get('city') not in ('all', *CITIES): E(f'question {qk}: bad city tag')

# 1b sections: where each service's process is written (the search index is built from these pages only)
in_section = {}   # (source, page) -> services whose sections include it
for sid, s in g['services'].items():
    secs = s.get('sections') or []
    if not secs: E(f'{sid}: no sections')
    for x in secs:
        src = g['sources'].get(x['source'])
        if not src: E(f'{sid}: section uses unknown source {x["source"]}'); continue
        if src['city'] != s['city']: E(f'{sid}: section source {x["source"]} belongs to another city')
        if src.get('superseded'): E(f'{sid}: section uses superseded source {x["source"]}')
        last = src.get('pdf_pages', 1) if src['type'] == 'pdf' else 1
        if not (1 <= x['from_page'] <= x['to_page'] <= last): E(f'{sid}: section {x["source"]} pp. {x["from_page"]}-{x["to_page"]} outside 1-{last}')
        for p in range(x['from_page'], x['to_page'] + 1): in_section.setdefault((x['source'], p), set()).add(sid)
# Every page the graph cites (except office contact details and superseded cross-checks) must be inside a section.
for e in g['evidence']:
    src = g['sources'].get(e['source'])
    if e['ref'].startswith('office:') or not src or src.get('superseded') or e['pdf_page'] is None: continue
    if (e['source'], e['pdf_page']) not in in_section: E(f'evidence {e["ref"]}: {e["source"]} p. {e["pdf_page"]} is not inside any service section')
    elif e['ref'].startswith('svc:'):
        sid = e['ref'].split(':')[1]
        if sid not in in_section[(e['source'], e['pdf_page'])]: W(f'evidence {e["ref"]}: {e["source"]} p. {e["pdf_page"]} is in another service\'s section')
# 2 cycles
def cyc(n, path):
    if n in path: E('cycle: ' + ' > '.join(path + [n])); return
    for d in deps.get(n, []): cyc(d, path + [n])
for n in deps: cyc(n, [])
# 3 evidence (+ ref city must match source city)
for e in g['evidence']:
    if e['status'] == 'quote_not_found' or not e['pdf_page']: E(f'evidence {e["ref"]}: quote not found')
    if e['source'] not in g['sources']: E(f'evidence {e["ref"]}: unknown source'); continue
    rc = city_of(e['ref'].split(':')[1]) if e['ref'].count(':') >= 1 else None
    if rc and g['sources'][e['source']]['city'] != rc: E(f'evidence {e["ref"]}: cites a source from city {g["sources"][e["source"]]["city"]}')
# 4 sources/hashes
for sid, s in g['sources'].items():
    p = os.path.join(ROOT, s['local_file'])
    if not os.path.exists(p): E(f'source {sid}: file missing {s["local_file"]}'); continue
    if hashlib.sha256(open(p, 'rb').read()).hexdigest() != s['sha256']: E(f'source {sid}: hash changed')
# 5 roadmap tests
def ids(rm): return [s['id'] for gr in rm['groups'] for s in gr['steps']]
def order_ok(rm, before, after):
    x = ids(rm); return x.index(before) < x.index(after)
def qa(city, **kw):
    """Answers for a city: shared keys stay as-is, city-specific keys get the '<city>.' prefix."""
    d = {'city': city}
    for k, v in kw.items(): d[k if k in SHARED_Q else f'{city}.{k}'] = v
    return d
T = []; CASES = []
def test(name, intent, ans, check, graph=None, patch=None):
    gg = graph or g
    rm = roadmap(gg, intent, ans)
    CASES.append(dict(name=name, intent=intent, answers=ans, patch=patch, expected=rm))
    again = roadmap(gg, intent, dict(reversed(list(ans.items()))))
    ok = True; why = ''
    if json.dumps(rm, sort_keys=True) != json.dumps(again, sort_keys=True): ok = False; why = 'not deterministic'
    try:
        if rm['status'] == 'ok' and any(city_of(i) != ans['city'] for i in ids(rm)): ok = False; why = 'step from another city: ' + str([i for i in ids(rm) if city_of(i) != ans['city']])
        r = check(rm)
        if r is not True: ok = False; why = why or str(r)
    except Exception as ex: ok = False; why = f'{type(ex).__name__}: {ex}'
    T.append((name, ok, why, rm))

# ---- Quezon City (same 9 journeys as before the multi-city change) ----
test('T1 PWD ID online, non-apparent, nothing owned', 'pwd-id-application',
     qa('qc', channel='online', disability_type='non_apparent', has_med_cert='no', has_gov_id='no', has_eservices_account='no'),
     lambda r: set(['qc.r-cert-disability', 'qc.s-eservices-register', 'qc.r-barangay-cert', 'qc.r-id-photo-2x2', 'qc.s-pwd-id']) == set(ids(r)) and ids(r)[-1] == 'qc.s-pwd-id' or ids(r))
test('T2 PWD ID walk-in, apparent, has gov ID', 'pwd-id-application',
     qa('qc', channel='in_person', disability_type='apparent', has_gov_id='yes'),
     lambda r: set(ids(r)) == {'qc.r-whole-body-photo', 'qc.r-id-photo-2x2', 'qc.s-pwd-id'} or ids(r))
test('T3 Senior ID online, no QC ID, no valid ID, no birth cert (cross-journey)', 'senior-citizen-id',
     qa('qc', channel='online', has_qcitizen_id='no', has_birth_certificate='no', has_eservices_account='no', married_woman_diff_surname='no'),
     lambda r: {'qc.s-birth-ctc', 'qc.s-eservices-register', 'qc.r-barangay-residency', 'qc.s-senior-id'} <= set(ids(r)) and order_ok(r, 'qc.s-birth-ctc', 'qc.s-senior-id') or ids(r))
test('T4 Business renewal, tax unpaid -> tax payment before renewal', 'business-permit-renewal',
     qa('qc', has_business_tax_or='no', is_representative='no'),
     lambda r: order_ok(r, 'qc.s-business-tax-payment', 'qc.s-business-permit-renewal') and 'qc.r-tax-bill' in ids(r) or ids(r))
test('T5 Business renewal, tax paid -> no tax step', 'business-permit-renewal',
     qa('qc', has_business_tax_or='yes', is_representative='yes'),
     lambda r: 'qc.s-business-tax-payment' not in ids(r) and 'qc.r-authorization' in ids(r) or ids(r))
test('T6 Building permit, not owner, complex -> 7 working days', 'building-permit',
     qa('qc', is_owner='no', is_renovation_pre2022='no', permit_class='complex', has_eservices_account='no'),
     lambda r: 'qc.r-legal-right' in ids(r) and 'qc.r-tct' not in ids(r) and r['groups'][-1]['steps'][0]['time'] == '7 working days' or ids(r))
test('T7 Birth certificate copy, walk-in, representative', 'birth-certificate-copy',
     qa('qc', channel='in_person', is_representative='yes'),
     lambda r: 'qc.r-authorization-ctc' in ids(r) and r['groups'][-1]['steps'][0]['fee'] == 'PHP 65.00 per copy' or ids(r))
test('T8 Birth registration late -> not covered with office', 'birth-registration',
     qa('qc', within_30_days='no'), lambda r: r['status'] == 'not_covered' and 'Civil Registry' in r['office'] or r)
test('T9 Unknown intent -> not covered', 'unknown-thing', qa('qc'), lambda r: r['status'] == 'not_covered')
QC_TESTS = len(T)

# ---- Marikina City ----
def last(r): return r['groups'][-1]['steps'][0]
test('M1 PWD ID, nothing owned', 'pwd-id-application', qa('mkn', has_gov_id='no', has_med_cert='no'),
     lambda r: set(ids(r)) == {'mkn.r-gov-id', 'mkn.r-med-cert', 'mkn.r-photo-1x1', 'mkn.r-whole-body-photo', 'mkn.s-pwd-id'} and ids(r)[-1] == 'mkn.s-pwd-id' and last(r)['time'] == '16 minutes' and last(r)['fee'] == 'none' or ids(r))
test('M2 PWD ID, has gov ID and medical certificate', 'pwd-id-application', qa('mkn', has_gov_id='yes', has_med_cert='yes'),
     lambda r: set(ids(r)) == {'mkn.r-photo-1x1', 'mkn.r-whole-body-photo', 'mkn.s-pwd-id'} or ids(r))
test('M3 Senior ID, representative, no valid ID', 'senior-citizen-id', qa('mkn', is_representative='yes', has_valid_id='no'),
     lambda r: {'mkn.r-authorization-senior', 'mkn.r-valid-id-senior', 'mkn.r-osca-form', 'mkn.r-photo-1x1-senior'} <= set(ids(r)) and last(r)['time'] == '6 minutes' or ids(r))
test('M4 Senior ID, self, has valid ID -> no representative papers, no ID step', 'senior-citizen-id', qa('mkn', is_representative='no', has_valid_id='yes'),
     lambda r: 'mkn.r-authorization-senior' not in ids(r) and 'mkn.r-valid-id-senior' not in ids(r) or ids(r))
test('M5 Birth certificate copy, representative', 'birth-certificate-copy', qa('mkn', is_representative='yes'),
     lambda r: 'mkn.r-authorization-ctc' in ids(r) and last(r)['fee'] == 'PHP 150.00 per copy' and last(r)['time'] == '6 minutes' or ids(r))
test('M6 Birth registration, parents not married', 'birth-registration', qa('mkn', within_30_days='yes', parents_married='no'),
     lambda r: {'mkn.r-aop', 'mkn.r-aus', 'mkn.r-colb-form102'} <= set(ids(r)) and 'mkn.r-parents-marriage-cert' not in ids(r) and 'PHP 100.00' in last(r)['fee'] or ids(r))
test('M7 Birth registration, parents married', 'birth-registration', qa('mkn', within_30_days='yes', parents_married='yes'),
     lambda r: 'mkn.r-parents-marriage-cert' in ids(r) and 'mkn.r-aop' not in ids(r) or ids(r))
test('M8 Birth registration after 30 days -> not covered with CCRO', 'birth-registration', qa('mkn', within_30_days='no'),
     lambda r: r['status'] == 'not_covered' and 'Civil Registry' in r['office'] or r)
test('M9 Business renewal online, no portal account -> sign-up first', 'business-permit-renewal', qa('mkn', channel='online', has_portal_account='no'),
     lambda r: order_ok(r, 'mkn.s-portal-register', 'mkn.s-business-permit-renewal') and 'mkn.r-business-account-no' in ids(r) and 'mkn.r-public-liability' not in ids(r) or ids(r))
test('M10 Business renewal online, has portal account -> no sign-up step', 'business-permit-renewal', qa('mkn', channel='online', has_portal_account='yes'),
     lambda r: 'mkn.s-portal-register' not in ids(r) or ids(r))
test('M11 Business renewal walk-in, representative', 'business-permit-renewal', qa('mkn', channel='in_person', is_representative='yes'),
     lambda r: {'mkn.r-eboss', 'mkn.r-authorization-biz', 'mkn.r-public-liability', 'mkn.r-financial-statement'} <= set(ids(r)) and 'mkn.s-portal-register' not in ids(r) or ids(r))
test('M12 Building permit', 'building-permit', qa('mkn'),
     lambda r: {'mkn.r-property-docs', 'mkn.r-bom-specs', 'mkn.r-cshp', 'mkn.r-locational-clearance', 'mkn.r-signed-plans', 'mkn.r-other-clearances'} <= set(ids(r)) and last(r)['time'] == '1 day and 3 hours' or ids(r))
test('M13 Unknown intent in Marikina -> not covered, City Hall named', 'unknown-thing', qa('mkn'),
     lambda r: r['status'] == 'not_covered' and r['office'] == 'Marikina City Hall' or r)

# ---- cross-city behaviour ----
test('X1 Same intent resolves to each city\'s own service (QC)', 'pwd-id-application', qa('qc', channel='in_person', disability_type='apparent', has_gov_id='yes'),
     lambda r: r['goal'] == 'qc.s-pwd-id' or r['goal'])
test('X2 Same intent resolves to each city\'s own service (Marikina)', 'pwd-id-application', qa('mkn', has_gov_id='yes', has_med_cert='yes'),
     lambda r: r['goal'] == 'mkn.s-pwd-id' or r['goal'])
test('X3 Unknown city -> not covered', 'pwd-id-application', {'city': 'cebu'}, lambda r: r['status'] == 'not_covered' and r['message'] == 'City not covered')
test('X4 No city answered -> not covered', 'pwd-id-application', {}, lambda r: r['status'] == 'not_covered')
g2 = copy.deepcopy(g); del g2['intents']['senior-citizen-id']['service_by_city']['mkn']
test('X5 Intent exists but not in this city -> not covered, City Hall named', 'senior-citizen-id', qa('mkn', is_representative='no'),
     lambda r: r['status'] == 'not_covered' and 'Marikina' in r['message'] and r['office'] == 'Marikina City Hall' or r, graph=g2,
     patch={'remove_service_by_city': ['senior-citizen-id', 'mkn']})

# Filipino text: every question needs text_tl (the app falls back to English otherwise)
for k, q in g['questions'].items():
    if not q.get('text_tl'): W(f'question {k} has no Filipino text (text_tl)')
# Filipino for graph content (notes, how-to steps, tips, process messages): missing or stale translations
for k, s_ in g['services'].items():
    if s_.get('exit_message') and not s_.get('exit_message_tl'): W(f'{k}: exit_message has no Filipino (translations/tl.json)')
    for v in s_['variants']:
        if v.get('note') and not v.get('note_tl'): W(f'{k} ({v["channel"]}): note has no Filipino (translations/tl.json)')
        tl_steps = v.get('detail_steps_tl') or []
        for i, _ in enumerate(v['detail_steps']):
            if i >= len(tl_steps) or not tl_steps[i]: W(f'{k} ({v["channel"]}): step {i + 1} has no Filipino (translations/tl.json)')
for k, r in g['requirements'].items():
    if r.get('hint') and not r.get('hint_tl'): W(f'{k}: hint has no Filipino (translations/tl.json)')
for k, o in g['offices'].items():
    if o.get('note') and not o.get('note_tl'): W(f'{k}: note has no Filipino (translations/tl.json)')
# Every variant evidence ref must point at an existing evidence record
_refs = {e['ref'] for e in g['evidence']}
for k, s_ in g['services'].items():
    for v in s_['variants']:
        for f, r in (v.get('evidence') or {}).items():
            if r and r not in _refs: E(f'{k} ({v["channel"]}): evidence.{f} = {r} matches no evidence record')
lines.append('== ROADMAP TESTS ==')
for n, ok, why, rm in T: lines.append(('PASS ' if ok else 'FAIL ') + n + ('' if ok else '  -> ' + why))
for n, ok, why, rm in T:
    if not ok: E('test failed: ' + n)

# 6 regression: the QC journeys must give the same roadmaps as before the multi-city change (ignoring the 'qc.' prefix)
bpath = os.path.join(ROOT, 'phase0', 'baseline_qc_test_roadmaps.json')
if os.path.exists(bpath):
    base = json.load(open(bpath, encoding='utf-8'))
    strip = lambda o: json.loads(re.sub(r'\bqc\.(?=[sro]-)', '', json.dumps(o, sort_keys=True)))
    lines.append('== QC REGRESSION vs pre-multi-city baseline ==')
    for n, ok, why, rm in T[:QC_TESTS]:
        same = n in base and json.dumps(strip(rm), sort_keys=True) == json.dumps(base[n], sort_keys=True)
        lines.append(('SAME ' if same else 'DIFF ') + n)
        if not same: E('QC regression: ' + n)
else: W('no QC baseline file found; regression check skipped')

json.dump({n: rm for n, ok, why, rm in T}, open(os.path.join(ROOT, 'phase0', 'test_roadmaps.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
# Inputs + expected outputs for the TypeScript engine parity tests (test/engine.parity.test.ts)
json.dump(CASES, open(os.path.join(ROOT, 'phase0', 'test_cases.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
per = {c: sum(1 for s in g['services'] if city_of(s) == c) for c in CITIES}
lines.append(f'== SUMMARY == errors={len(errs)} warnings={len(warns)} evidence={len(g["evidence"])} services={len(g["services"])} {per} intents={len(g["intents"])} tests={len(T)} passed={sum(1 for t in T if t[1])}')
for m in errs: lines.append('ERROR ' + m)
for m in warns: lines.append('WARN  ' + m)
open(os.path.join(ROOT, 'phase0', 'validation_report.txt'), 'w', encoding='utf-8').write('\n'.join(lines))
sys.stdout.reconfigure(encoding='utf-8')
print('\n'.join(lines)); sys.exit(1 if errs else 0)
