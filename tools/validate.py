import json, os, sys, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import roadmap
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
g = json.load(open(os.path.join(ROOT, 'phase0', 'graph.json'), encoding='utf-8'))
errs, warns, lines = [], [], []
def E(m): errs.append(m)
def W(m): warns.append(m)

# 1 references
for iid, i in g['intents'].items():
    if i['service'] not in g['services']: E(f'intent {iid}: unknown service')
for rid, r in g['requirements'].items():
    if 'issuer_service' in r and r['issuer_service'] not in g['services']: E(f'req {rid}: unknown issuer service')
    if r.get('external') and r['external'] not in g['offices']: E(f'req {rid}: unknown external office')
    if not any(e['ref'] == f'req:{rid}' for e in g['evidence']): W(f'req {rid}: no evidence entry')
def req_ids(item): return [item['req']] if 'req' in item else [x for o in item['or_options'] for x in o]
deps = {}
for sid, s in g['services'].items():
    deps[sid] = set()
    for v in s['variants']:
        if v['office'] not in g['offices']: E(f'{sid}: unknown office {v["office"]}')
        if v['fee'] != 'not_listed' and not v['evidence']['fee']: E(f'{sid}/{v["channel"]}: fee has no evidence')
        if v['time'] != 'not_listed' and not v['evidence']['time']: W(f'{sid}/{v["channel"]}: time has no evidence ({v["time"]})')
        for item in v['requires']:
            if 'or_options' in item and not (0 <= item['default'] < len(item['or_options'])): E(f'{sid}: bad OR default')
            for rid in req_ids(item):
                if rid not in g['requirements']: E(f'{sid}: unknown requirement {rid}')
                elif 'issuer_service' in g['requirements'][rid]: deps[sid].add(g['requirements'][rid]['issuer_service'])
            for k, val in list(item['when'].items()) + list(item['skip_if'].items()):
                q = g['questions'].get(k)
                if not q: E(f'{sid}: condition uses unknown question {k}')
                else:
                    for x in (val if isinstance(val, list) else [val]):
                        if x not in q['options']: E(f'{sid}: value {x} not an option of {k}')
    for k in s.get('question_keys', []):
        if k not in g['questions']: E(f'{sid}: question_keys has unknown {k}')
# 2 cycles
def cyc(n, path):
    if n in path: E('cycle: ' + ' > '.join(path + [n])); return
    for d in deps.get(n, []): cyc(d, path + [n])
for n in deps: cyc(n, [])
# 3 evidence
for e in g['evidence']:
    if e['status'] == 'quote_not_found' or not e['pdf_page']: E(f'evidence {e["ref"]}: quote not found')
    if e['source'] not in g['sources']: E(f'evidence {e["ref"]}: unknown source')
# 4 sources/hashes
for sid, s in g['sources'].items():
    p = os.path.join(ROOT, s['local_file'])
    if not os.path.exists(p): E(f'source {sid}: file missing {s["local_file"]}'); continue
    if hashlib.sha256(open(p, 'rb').read()).hexdigest() != s['sha256']: E(f'source {sid}: hash changed')
# 5 roadmap tests
def ids(rm): return [s['id'] for gr in rm['groups'] for s in gr['steps']]
def order_ok(rm, before, after):
    x = ids(rm); return x.index(before) < x.index(after)
T = []
def test(name, intent, ans, check):
    rm = roadmap(g, intent, ans)
    again = roadmap(g, intent, dict(reversed(list(ans.items()))))
    ok = True; why = ''
    if json.dumps(rm, sort_keys=True) != json.dumps(again, sort_keys=True): ok = False; why = 'not deterministic'
    try:
        r = check(rm)
        if r is not True: ok = False; why = why or str(r)
    except Exception as ex: ok = False; why = f'{type(ex).__name__}: {ex}'
    T.append((name, ok, why, rm))
test('T1 PWD ID online, non-apparent, nothing owned', 'pwd-id-application',
     dict(channel='online', disability_type='non_apparent', has_med_cert='no', has_gov_id='no', has_eservices_account='no'),
     lambda r: set(['r-cert-disability', 's-eservices-register', 'r-barangay-cert', 'r-id-photo-2x2', 's-pwd-id']) == set(ids(r)) and ids(r)[-1] == 's-pwd-id' or ids(r))
test('T2 PWD ID walk-in, apparent, has gov ID', 'pwd-id-application',
     dict(channel='in_person', disability_type='apparent', has_gov_id='yes'),
     lambda r: set(ids(r)) == {'r-whole-body-photo', 'r-id-photo-2x2', 's-pwd-id'} or ids(r))
test('T3 Senior ID online, no QC ID, no valid ID, no birth cert (cross-journey)', 'senior-citizen-id',
     dict(channel='online', has_qcitizen_id='no', has_birth_certificate='no', has_eservices_account='no', married_woman_diff_surname='no'),
     lambda r: {'s-birth-ctc', 's-eservices-register', 'r-barangay-residency', 's-senior-id'} <= set(ids(r)) and order_ok(r, 's-birth-ctc', 's-senior-id') or ids(r))
test('T4 Business renewal, tax unpaid -> tax payment before renewal', 'business-permit-renewal',
     dict(has_business_tax_or='no', is_representative='no'),
     lambda r: order_ok(r, 's-business-tax-payment', 's-business-permit-renewal') and 'r-tax-bill' in ids(r) or ids(r))
test('T5 Business renewal, tax paid -> no tax step', 'business-permit-renewal',
     dict(has_business_tax_or='yes', is_representative='yes'),
     lambda r: 's-business-tax-payment' not in ids(r) and 'r-authorization' in ids(r) or ids(r))
test('T6 Building permit, not owner, complex -> 7 working days', 'building-permit',
     dict(is_owner='no', is_renovation_pre2022='no', permit_class='complex', has_eservices_account='no'),
     lambda r: 'r-legal-right' in ids(r) and 'r-tct' not in ids(r) and r['groups'][-1]['steps'][0]['time'] == '7 working days' or ids(r))
test('T7 Birth certificate copy, walk-in, representative', 'birth-certificate-copy',
     dict(channel='in_person', is_representative='yes'),
     lambda r: 'r-authorization-ctc' in ids(r) and r['groups'][-1]['steps'][0]['fee'] == 'PHP 65.00 per copy' or ids(r))
test('T8 Birth registration late -> not covered with office', 'birth-registration',
     dict(within_30_days='no'), lambda r: r['status'] == 'not_covered' and 'Civil Registry' in r['office'] or r)
test('T9 Unknown intent -> not covered', 'unknown-thing', {}, lambda r: r['status'] == 'not_covered')
lines.append('== ROADMAP TESTS ==')
for n, ok, why, rm in T: lines.append(('PASS ' if ok else 'FAIL ') + n + ('' if ok else '  -> ' + why))
    
    
for n, ok, why, rm in T:
    if not ok: E('test failed: ' + n)
json.dump({n: rm for n, ok, why, rm in T}, open(os.path.join(ROOT, 'phase0', 'test_roadmaps.json'), 'w'), indent=1, ensure_ascii=False)
lines.append(f'== SUMMARY == errors={len(errs)} warnings={len(warns)} evidence={len(g["evidence"])} services={len(g["services"])} intents={len(g["intents"])}')
for m in errs: lines.append('ERROR ' + m)
for m in warns: lines.append('WARN  ' + m)
open(os.path.join(ROOT, 'phase0', 'validation_report.txt'), 'w', encoding='utf-8').write('\n'.join(lines))
print('\n'.join(lines)); sys.exit(1 if errs else 0)
