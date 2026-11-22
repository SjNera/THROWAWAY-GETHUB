"""Shared helpers for the Phase 0 build (all cities).
City data modules (data_qc.py, data_mkn.py) import * from here, register their sources,
then define OFFICES / REQ / SERVICES / INTENTS / QUESTIONS using local (unprefixed) ids.
build_phase0.py namespaces every city's ids (qc.s-pwd-id, mkn.s-pwd-id ...) and merges them."""
import json, os, re, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EX = os.path.join(ROOT, 'extract'); OUT = os.path.join(ROOT, 'phase0')
TODAY = '2026-11-20'
ACCESSED = {'qc': '2026-11-18', 'mkn': '2026-11-20'}

# Questions whose wording/options are identical in every city: not namespaced.
SHARED_Q = {'city', 'channel', 'is_representative', 'parents_married', 'within_30_days', 'permit_class'}

SOURCES = {}; EVID = []; ERR = []; _cache = {}

def pdf(file, title, url, office, edition):
    return dict(type='pdf', file=file, title=title, url=url, office=office, edition=edition)
def html(file, title, url, office, edition):
    return dict(type='html', file=file, title=title, url=url, office=office, edition=edition)
def register_sources(city, d):
    for k, v in d.items():
        assert k not in SOURCES, 'duplicate source ' + k
        v['city'] = city; SOURCES[k] = v

def norm(s):
    s = s.replace('�', "'").replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', s).strip().lower()

def pages(src):
    if src in _cache: return _cache[src]
    s = SOURCES[src]
    if s['type'] == 'pdf':
        d = os.path.join(EX, s['file']); n = len([f for f in os.listdir(d) if f.startswith('p') and f.endswith('.txt')])
        res = [(i, norm(open(os.path.join(d, 'p%03d.txt' % i), encoding='utf-8').read())) for i in range(1, n + 1)]
    else:
        res = [(1, norm(open(os.path.join(EX, 'html', s['file']), encoding='utf-8').read()))]
    _cache[src] = res; return res

def ev(ref, src, quote, status='auto_verified', note=None, pages_range=None):
    q = norm(quote); page = None
    for n, t in pages(src):
        if pages_range and not (pages_range[0] <= n <= pages_range[1]): continue
        if q in t: page = n; break
    if page is None:
        ERR.append((ref, src, quote)); status = 'quote_not_found'
    EVID.append(dict(ref=ref, source=src, pdf_page=page, quote=quote, status=status, note=note))
    return ref

def V(channel, office, fee, time, requires, url=None, steps=None, ev_fee=None, ev_time=None, note=None, time_by_class=None):
    return dict(channel=channel, office=office, fee=fee, time=time, time_by_class=time_by_class, requires=requires, url=url, detail_steps=steps or [], evidence=dict(fee=ev_fee, time=ev_time), note=note)
def R(rid, when=None, skip_if=None): return dict(req=rid, when=when or {}, skip_if=skip_if or {})
def OR(options, default, when=None, skip_if=None, label=None): return dict(or_options=options, default=default, when=when or {}, skip_if=skip_if or {}, label=label)
def Q(key, text, opts, tl=None): return dict(key=key, text=text, text_tl=tl, options=opts)

def req_ids(item): return [item['req']] if 'req' in item else [x for o in item['or_options'] for x in o]

def compute_question_keys(SERVICES, REQ, QUESTIONS):
    """Which questions can a service need? (local ids, before namespacing). Also sets owned_key on issuer requirements."""
    for rid, r in REQ.items():
        if 'issuer_service' in r: r['owned_key'] = 'has_' + rid[2:].replace('-', '_')
    for sid, s in SERVICES.items():
        keys = set(s.get('exit_if', {}).keys()) | ({'channel'} if len(s['variants']) > 1 else set())
        for v in s['variants']:
            for r in v['requires']:
                keys |= set(r['when'].keys()) | set(r['skip_if'].keys())
                for rid in req_ids(r):
                    if 'owned_key' in REQ[rid]: keys.add(REQ[rid]['owned_key'])
        if s.get('extra_question_keys'): keys |= set(s['extra_question_keys'])
        s['question_keys'] = sorted(k for k in keys if k in QUESTIONS)

def namespace(city, OFFICES, REQ, SERVICES, QUESTIONS, EVID_slice):
    """Return copies of the city's data with every id prefixed by '<city>.' (shared questions excepted)."""
    p = lambda x: x if x is None else f'{city}.{x}'
    qk = lambda k: k if k in SHARED_Q else f'{city}.{k}'
    def cond(d): return {qk(k): v for k, v in d.items()}
    offices = {p(k): dict(v, city=city) for k, v in OFFICES.items()}
    reqs = {}
    for k, v in REQ.items():
        v = dict(v, city=city)
        if 'issuer_service' in v: v['issuer_service'] = p(v['issuer_service']); v['owned_key'] = qk(v['owned_key'])
        if v.get('external'): v['external'] = p(v['external'])
        reqs[p(k)] = v
    svcs = {}
    for sid, s in SERVICES.items():
        s = json.loads(json.dumps(s)); s['city'] = city
        if 'exit_if' in s: s['exit_if'] = cond(s['exit_if']); s['exit_office'] = p(s['exit_office'])
        s['question_keys'] = [qk(k) for k in s['question_keys']]
        s.pop('extra_question_keys', None)
        for v in s['variants']:
            v['office'] = p(v['office'])
            # evidence refs point at evidence records, whose ids are prefixed below: prefix these the same way
            v['evidence'] = {f: (None if r is None else ':'.join([r.split(':')[0], p(r.split(':')[1]), *r.split(':')[2:]]))
                             for f, r in v.get('evidence', {}).items()}
            for it in v['requires']:
                it['when'] = cond(it['when']); it['skip_if'] = cond(it['skip_if'])
                if 'req' in it: it['req'] = p(it['req'])
                else: it['or_options'] = [[p(x) for x in o] for o in it['or_options']]
        svcs[p(sid)] = s
    qs = {}
    for k, q in QUESTIONS.items():
        nk = qk(k); qs[nk] = dict(q, key=nk, city=('all' if k in SHARED_Q else city))
    ev_out = []
    for e in EVID_slice:
        parts = e['ref'].split(':')
        if len(parts) > 1 and parts[0] in ('svc', 'req', 'office'): parts[1] = p(parts[1])
        ev_out.append(dict(e, ref=':'.join(parts), city=city))
    return offices, reqs, svcs, qs, ev_out

def finalize_status(evid):
    for e in evid:
        if e['status'] == 'auto_verified' and (':fee' in e['ref'] or ':time' in e['ref']):
            e['status'] = 'needs_review'; e['note'] = 'Fee/time flagged for human check.'
        if SOURCES[e['source']]['type'] == 'html':
            e['note'] = ((e.get('note') or '') + ' HTML page transcribed by Claude; reopen the URL to confirm.').strip()

def finalize_sources():
    for sid, s in SOURCES.items():
        if s['type'] == 'pdf':
            m = json.load(open(os.path.join(EX, s['file'], 'meta.json'))); s['sha256'] = m['sha256']; s['pdf_pages'] = len(m['pages'])
            s['local_file'] = ('qc-charters/' if s['city'] == 'qc' else 'mkn-charters/') + m['file']
        else:
            s['sha256'] = hashlib.sha256(open(os.path.join(EX, 'html', s['file']), 'rb').read()).hexdigest(); s['local_file'] = 'extract/html/' + s['file']
        s['accessed'] = ACCESSED[s['city']]
