import sys, os, json, hashlib, subprocess
src, out = sys.argv[1], sys.argv[2]
for f in sorted(os.listdir(src)):
    if not f.lower().endswith('.pdf'): continue
    base = os.path.splitext(f)[0]; d = os.path.join(out, base)
    if os.path.exists(os.path.join(d,'meta.json')): continue
    p = os.path.join(src, f); os.makedirs(d, exist_ok=True)
    n = int([l for l in subprocess.run(['pdfinfo',p],capture_output=True,text=True).stdout.splitlines() if l.startswith('Pages')][0].split()[1])
    meta = {'file': f, 'sha256': hashlib.sha256(open(p,'rb').read()).hexdigest(), 'pages': []}
    for i in range(1, n+1):
        txt = subprocess.run(['pdftotext','-layout','-f',str(i),'-l',str(i),p,'-'],capture_output=True,text=True).stdout
        method = 'text'
        if len(txt.strip()) < 40:
            pre = f'/tmp/o_{abs(hash(f))}_{i}'
            subprocess.run(['pdftoppm','-r','200','-f',str(i),'-l',str(i),'-png',p,pre])
            for g in os.listdir('/tmp'):
                if g.startswith(os.path.basename(pre)) and g.endswith('.png'):
                    txt = subprocess.run(['tesseract',os.path.join('/tmp',g),'-','--psm','6'],capture_output=True,text=True).stdout; method='ocr'; break
        open(os.path.join(d,f'p{i:03d}.txt'),'w',encoding='utf-8').write(txt)
        meta['pages'].append({'n': i, 'chars': len(txt), 'method': method})
    json.dump(meta, open(os.path.join(d,'meta.json'),'w'), indent=1)
    print(f, n, 'pages', sum(1 for x in meta['pages'] if x['method']=='ocr'), 'ocr', flush=True)
