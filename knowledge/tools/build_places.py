"""Build places/ph_places.json: every Philippine city and municipality (PSA PSGC), for the app's city matching.
The app uses it to tell "a real place we don't cover yet" ("Pasig City will be covered soon.") from "not a place".
Covered cities still come from graph.json; this list only names places.

Run from the knowledge/ folder:  python -I tools/build_places.py
Source: PSGC static API (psgc.gitlab.io), a JSON mirror of the PSA Philippine Standard Geographic Code.
"""
import datetime, json, os, re, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'https://psgc.gitlab.io/api/cities-municipalities.json'
OUT = os.path.join(ROOT, 'places', 'ph_places.json')


def display_name(name, is_city):
    """'City of Pasig' -> 'Pasig City'. Names like 'Quezon City' or 'Science City of Muñoz' stay as they are."""
    m = re.fullmatch(r'City of (.+)', name)
    return f'{m.group(1)} City' if (is_city and m) else name


def main():
    req = urllib.request.Request(URL, headers={'User-Agent': 'phase0-places-build'})
    with urllib.request.urlopen(req, timeout=60) as r:
        rows = json.load(r)
    places = []
    for x in rows:
        name = str(x['name']).strip()
        if not name:
            continue
        places.append(dict(code=str(x['code']), name=name, display=display_name(name, bool(x.get('isCity'))),
                           kind='city' if x.get('isCity') else 'municipality', province_code=x.get('provinceCode') or None))
    places.sort(key=lambda p: (p['display'].lower(), p['code']))
    assert len(places) > 1500, f'expected ~1,600 places, got {len(places)}'
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    data = dict(source=URL, source_note='Mirror of the PSA Philippine Standard Geographic Code (PSGC)',
                retrieved=datetime.date.today().isoformat(), count=len(places), places=places)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=0)
    print(f'ok {len(places)} places ({sum(p["kind"] == "city" for p in places)} cities) -> places/ph_places.json')


if __name__ == '__main__':
    main()
