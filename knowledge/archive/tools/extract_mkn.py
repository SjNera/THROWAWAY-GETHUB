"""Extract PDFs to extract/<name>/pNNN.txt + meta.json (PyMuPDF; Tesseract OCR fallback for image-only pages).
Usage: python -I tools/extract_mkn.py <src_dir> <out_dir>. Same output layout as extract_fast.py."""
import sys, os, json, hashlib, subprocess, tempfile
import fitz
TESS = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Programs', 'Tesseract-OCR', 'tesseract.exe')
src, out = sys.argv[1], sys.argv[2]
for f in sorted(os.listdir(src)):
    if not f.lower().endswith('.pdf'): continue
    base = os.path.splitext(f)[0]; d = os.path.join(out, base)
    if os.path.exists(os.path.join(d, 'meta.json')): continue
    p = os.path.join(src, f); os.makedirs(d, exist_ok=True)
    meta = {'file': f, 'sha256': hashlib.sha256(open(p, 'rb').read()).hexdigest(), 'pages': []}
    doc = fitz.open(p)
    for i, page in enumerate(doc, 1):
        txt = page.get_text(sort=True); method = 'text'
        if len(txt.strip()) < 40 and os.path.exists(TESS):
            with tempfile.TemporaryDirectory() as t:
                png = os.path.join(t, 'x.png'); page.get_pixmap(dpi=200).save(png)
                r = subprocess.run([TESS, png, '-', '--psm', '6'], capture_output=True, text=True, encoding='utf-8')
                if len(r.stdout.strip()) > len(txt.strip()): txt = r.stdout; method = 'ocr'
        open(os.path.join(d, f'p{i:03d}.txt'), 'w', encoding='utf-8').write(txt)
        meta['pages'].append({'n': i, 'chars': len(txt), 'method': method})
    json.dump(meta, open(os.path.join(d, 'meta.json'), 'w'), indent=1)
    print(f, len(meta['pages']), 'pages', sum(1 for x in meta['pages'] if x['method'] == 'ocr'), 'ocr', flush=True)
