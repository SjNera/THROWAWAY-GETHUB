import sys, os, json, hashlib, subprocess
import pdfplumber
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for f in sorted(os.listdir(src)):
    if not f.lower().endswith('.pdf'): continue
    p = os.path.join(src, f)
    h = hashlib.sha256(open(p,'rb').read()).hexdigest()
    d = os.path.join(out, os.path.splitext(f)[0]); os.makedirs(d, exist_ok=True)
    meta = {'file': f, 'sha256': h, 'pages': []}
    with pdfplumber.open(p) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            txt = subprocess.run(['pdftotext','-layout','-f',str(i),'-l',str(i),p,'-'],capture_output=True,text=True).stdout
            if len(txt.strip()) < 40:
                png = f'/tmp/ocr_{i}'
                subprocess.run(['pdftoppm','-r','200','-f',str(i),'-l',str(i),'-png',p,png])
                for g in os.listdir('/tmp'):
                    if g.startswith(f'ocr_{i}') and g.endswith('.png'):
                        txt = subprocess.run(['tesseract',os.path.join('/tmp',g),'-','--psm','6'],capture_output=True,text=True).stdout
                        os.remove(os.path.join('/tmp',g)) if False else None
                        break
                method='ocr'
            else: method='text'
            try: tables = page.extract_tables()
            except Exception: tables = []
            open(os.path.join(d, f'p{i:03d}.txt'),'w',encoding='utf-8').write(txt)
            meta['pages'].append({'n': i, 'chars': len(txt), 'method': method, 'tables': len(tables)})
    json.dump(meta, open(os.path.join(d,'meta.json'),'w'), indent=1)
    print(f, len(meta['pages']), 'pages', sum(1 for x in meta['pages'] if x['method']=='ocr'), 'ocr')
