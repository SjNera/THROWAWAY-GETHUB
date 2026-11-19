"""Phase 7/8 reference engine: builds a roadmap from graph.json + answers. Pure code, deterministic."""
def _in(v, allowed): return v in (allowed if isinstance(allowed, list) else [allowed])
def applies(item, a):
    if not all(_in(a.get(k), v) for k, v in item.get('when', {}).items()): return False
    if any(a.get(k) == v for k, v in item.get('skip_if', {}).items()): return False
    return True
def pick_variant(svc, a):
    ch = a.get('channel')
    for v in svc['variants']:
        if v['channel'] == ch: return v
    return svc['variants'][0]
def roadmap(g, intent_id, a):
    intent = g['intents'].get(intent_id)
    if not intent: return dict(status='not_covered', message='Not covered', office=None)
    goal = intent['service']; gs = g['services'][goal]
    for k, v in gs.get('exit_if', {}).items():
        if a.get(k) == v: return dict(status='not_covered', message=gs['exit_message'], office=g['offices'][gs['exit_office']]['name'])
    nodes = {}; edges = {}
    def add_service(sid):
        if sid in nodes: return
        svc = g['services'][sid]; var = pick_variant(svc, a)
        nodes[sid] = dict(id=sid, type='service', variant=var); edges[sid] = set()
        for item in var['requires']:
            if not applies(item, a): continue
            rids = [item['req']] if 'req' in item else item['or_options'][item['default']]
            for rid in rids: add_req(sid, rid)
    def add_req(parent, rid):
        r = g['requirements'][rid]
        if a.get('has_' + rid[2:].replace('-', '_')) == 'yes' and 'issuer_service' in r: return
        if 'issuer_service' in r:
            add_service(r['issuer_service']); edges[parent].add(r['issuer_service'])
        else:
            nid = rid
            if nid not in nodes: nodes[nid] = dict(id=nid, type='prepare', req=r); edges[nid] = set()
            edges[parent].add(nid)
    add_service(goal)
    level = {}
    def lv(n):
        if n in level: return level[n]
        level[n] = 0 if not edges[n] else 1 + max(lv(d) for d in edges[n]); return level[n]
    for n in nodes: lv(n)
    groups = {}
    for n, l in level.items(): groups.setdefault(l, []).append(n)
    out = []
    for l in sorted(groups):
        steps = []
        for n in sorted(groups[l]):
            nd = nodes[n]
            if nd['type'] == 'prepare':
                r = nd['req']; steps.append(dict(id=n, type='prepare', name=r['name'], office=g['offices'].get(r.get('external')) and g['offices'][r['external']]['name'], hint=r.get('hint')))
            else:
                v = nd['variant']; svc = g['services'][n]
                t = v['time_by_class'].get(a.get('permit_class')) if v.get('time_by_class') and a.get('permit_class') in v['time_by_class'] else v['time']
                docs = sorted(e for e in edges[n])
                steps.append(dict(id=n, type='service', name=svc['name'], channel=v['channel'], office=g['offices'][v['office']]['name'], address=g['offices'][v['office']].get('address'),
                                  fee=v['fee'], time=t if t != 'not_listed' else 'Not listed — confirm with the office', needs=docs, url=v.get('url'), note=v.get('note')))
        out.append(dict(group=l + 1, any_order=len(steps) > 1, steps=steps))
    return dict(status='ok', goal=goal, groups=out)
