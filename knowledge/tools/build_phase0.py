"""Build phase0/graph.json (all cities) and phase0/sources.yaml.
Run from the project folder:  python -I tools/build_phase0.py
Each city lives in tools/data_<city>.py with local ids; this script prefixes them (qc.*, mkn.*) and merges."""
import json, os, sys, yaml
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import phase0_lib as L
from phase0_lib import SOURCES, EVID, ERR, OUT, TODAY, SHARED_Q
os.makedirs(OUT, exist_ok=True)

CITIES = {
 # aliases: other names people type for the city (matched case- and accent-insensitively by the app)
 'qc': dict(name='Quezon City', module='data_qc', fallback_office=None,
            aliases=['QC', 'Quezon', 'Q.C.', 'Kyusi', 'Lungsod Quezon', 'Lungsod ng Quezon', 'Quezon City, Metro Manila']),
 'mkn': dict(name='Marikina City', module='data_mkn', fallback_office='mkn.cityhall',
             aliases=['Marikina', 'City of Marikina', 'Lungsod ng Marikina', 'Marikina, Metro Manila']),
}
offices, reqs, svcs, questions, intents = {}, {}, {}, {}, {}
questions['city'] = dict(key='city', text='Which city is this for?', text_tl='Para saan na lungsod ito?', options=list(CITIES),
                         option_labels={c: v['name'] for c, v in CITIES.items()}, city='all')
for code, c in CITIES.items():
    n0 = len(EVID)
    m = __import__(c['module'])
    o, r, s, q, e = L.namespace(code, m.OFFICES, m.REQ, m.SERVICES, m.QUESTIONS, EVID[n0:])
    EVID[n0:] = e
    for dst, src in ((offices, o), (reqs, r), (svcs, s)):
        for k, v in src.items():
            assert k not in dst, 'id collision ' + k
            dst[k] = v
    for k, v in q.items():
        if k in questions:   # shared question: must be identical across cities
            a, b = questions[k], v
            assert (a['text'], a['options']) == (b['text'], b['options']), f'shared question {k} differs between cities'
        else: questions[k] = v
    for iid, i in m.INTENTS.items():
        t = intents.setdefault(iid, dict(service_by_city={}, aliases=[], aliases_tl=[]))
        t['service_by_city'][code] = f'{code}.{i["service"]}'
        for a in i['aliases']:
            if a not in t['aliases']: t['aliases'].append(a)
        for a in i.get('aliases_tl', []):
            if a not in t['aliases_tl']: t['aliases_tl'].append(a)
cities = {code: dict(name=c['name'], fallback_office=c['fallback_office'], aliases=c.get('aliases', [])) for code, c in CITIES.items()}

L.finalize_status(EVID)
L.finalize_sources()
graph = dict(meta=dict(version='0.2-phase0-multicity', built=TODAY, cities=list(CITIES),
                       scope='Quezon City and Marikina City; 6 intents; auto-verified only, human review pending',
                       page_note='pdf_page = physical page number in the PDF file (not the printed page number)',
                       disclaimer='Based on official city sources, last checked 2026-11-18 (Quezon City) and 2026-11-20 (Marikina). Please confirm with the office before you go.'),
             cities=cities, sources=SOURCES, offices=offices, requirements=reqs, services=svcs, intents=intents, questions=questions, evidence=EVID)
json.dump(graph, open(os.path.join(OUT, 'graph.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
yaml.safe_dump(SOURCES, open(os.path.join(OUT, 'sources.yaml'), 'w', encoding='utf-8'), allow_unicode=True, sort_keys=False)
print('cities', list(CITIES), '| evidence', len(EVID), '| not found', len(ERR))
for e in ERR: print('NOT FOUND:', e)
sys.exit(1 if ERR else 0)
