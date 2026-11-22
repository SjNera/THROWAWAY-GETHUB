"""Write translations/tl.json: Filipino for graph content (notes, how-to steps, tips, process messages).
Each entry stores the English it was translated from, so the validator can flag a translation as stale when the
English changes. Official office and document names stay in English on purpose (they match forms and signs).
These are DRAFTS pending review by a Filipino speaker.

Run from the knowledge/ folder:  python -I tools/make_translations.py   (then build_phase0.py to merge)
To change a translation later, edit translations/tl.json directly (this script is for the first draft only:
it refuses to overwrite an existing file unless given --force)."""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'translations', 'tl.json')

TL = {
    # QC E-Services registration
    'service:qc.s-eservices-register:online:note': 'Hindi nakasaad sa mga nabasang source ang bayad at tagal.',
    'service:qc.s-eservices-register:online:step:1': 'Magparehistro sa QC E-Services gamit ang personal na email (isang email bawat nagpaparehistro)',
    'service:qc.s-eservices-register:online:step:2': 'Kumpirmahin at i-validate ang E-Services account',
    # QC PWD ID
    'service:qc.s-pwd-id:online:note': 'Ang validation para sa non-apparent disability ay inaabot ng 2–3 araw. Ang pag-renew ng puting PWD ID ay pinoproseso bilang bagong aplikasyon.',
    'service:qc.s-pwd-id:online:step:1': 'Mag-log in at piliin ang QCitizen ID eApplication icon',
    'service:qc.s-pwd-id:online:step:2': 'Kumpletuhin ang personal na impormasyon at i-tick ang “Yes” para sa Persons With Disability sector',
    'service:qc.s-pwd-id:online:step:3': 'I-upload ang mga requirement; may lalabas na virtual ID pagka-submit, saka pumayag at i-submit',
    'service:qc.s-pwd-id:online:step:4': 'Bantayan ang status ng aplikasyon sa iyong E-Services account',
    'service:qc.s-pwd-id:in_person:step:1': 'Dalhin ang mga kopya ng requirement sa PDAO para ma-evaluate',
    'service:qc.s-pwd-id:in_person:step:2': 'Ie-encode ng staff ang iyong impormasyon; ito ay aaprubahan at ive-verify',
    'service:qc.s-pwd-id:in_person:step:3': 'Ibibigay sa iyo ang naka-print na ID',
    'service:qc.s-pwd-id:in_person:step:4': 'Ang mga aplikanteng kulang ang requirement ay tutulungan at papayuhan',
    # QC birth certificate copy
    'service:qc.s-birth-ctc:in_person:note': 'Para sa mga ipinanganak sa Quezon City; counters 1 at 2.',
    'service:qc.s-birth-ctc:in_person:step:1': 'Isumite ang napunang request form at ID; tanggapin ang order of payment',
    'service:qc.s-birth-ctc:in_person:step:2': 'Magbayad sa cashier ng City Treasurer; tanggapin ang claim stub',
    'service:qc.s-birth-ctc:in_person:step:3': 'Kunin ang certified copy (Counter 5)',
    'service:qc.s-birth-ctc:online:step:1': 'Mag-log in, i-click ang “Civil Registry Online Services”, saka ang “Request for a Certificate”',
    'service:qc.s-birth-ctc:online:step:2': 'Hintayin ang email na nagsasabing handa nang kunin ang kopya',
    'service:qc.s-birth-ctc:online:step:3': 'Kunin sa CCRD at magbayad sa City Treasurer’s Office',
    # QC birth registration
    'service:qc.s-birth-registration:exit_message': 'Ang pagpaparehistro lampas sa 30 araw ay dumadaan sa delayed-registration na proseso. Makipag-ugnayan sa City Civil Registry Department.',
    'service:qc.s-birth-registration:in_person:step:1': 'Isumite ang Certificate of Live Birth at lahat ng requirement sa Counter 18',
    'service:qc.s-birth-registration:in_person:step:2': 'Tanggapin ang personal na kopya ng narehistrong certificate',
    'service:qc.s-birth-registration:online:step:1': 'Mag-log in, piliin ang “Civil Registry Online Services”, saka ang “Birth Registration”',
    'service:qc.s-birth-registration:online:step:2': 'I-upload ang digital na kopya ng mga requirement',
    'service:qc.s-birth-registration:online:step:3': 'Pagkatanggap ng email notice, isumite ang mga orihinal na dokumento sa CCRD',
    # QC business tax
    'service:qc.s-business-tax-payment:in_person:note': 'May online payment din sa QC E-Services (ayon sa BPLD charter); hindi nakuha rito ang mga detalye.',
    'service:qc.s-business-tax-payment:in_person:step:1': 'Ipakita ang aprubadong Computerized Business Tax Bill sa payment counter',
    'service:qc.s-business-tax-payment:in_person:step:2': 'Magbayad; tanggapin ang computerized business tax official receipt',
    # QC business permit renewal
    'service:qc.s-business-permit-renewal:online:note': 'Nakalista sa charter ang 30 minuto bawat yugto ng evaluation pero walang kabuuang oras; maaaring mag-auto-renew ang sistema kung compliant ka.',
    'service:qc.s-business-permit-renewal:online:step:1': 'Bayaran ang business tax',
    'service:qc.s-business-permit-renewal:online:step:2': 'Mag-file ng renewal sa QC E-Services portal o kiosk: Business One-Stop Shop → Apply for Mayor’s Permit (Business) → Renewal',
    'service:qc.s-business-permit-renewal:online:step:3': 'Ilagay ang Mayor’s Permit number at ang OR ng business tax ngayong taon; isumite ang mga requirement',
    'service:qc.s-business-permit-renewal:online:step:4': 'Kunin ang na-renew na permit o ipa-deliver ito',
    # QC senior ID
    'service:qc.s-senior-id:online:note': 'Hindi nakasaad sa guide ang bayad at tagal ng pagproseso.',
    'service:qc.s-senior-id:online:step:1': 'Gumawa ng profile at account sa QC E-Services',
    'service:qc.s-senior-id:online:step:2': 'Piliin ang QC ID e-Application (o Request for Sectoral Status Change kung may resident QC ID ka na)',
    'service:qc.s-senior-id:online:step:3': 'Hintayin ang approval email',
    'service:qc.s-senior-id:online:step:4': 'Hintaying maihatid ang pisikal na ID',
    'service:qc.s-senior-id:in_person:note': 'Hindi nakasaad sa guide ang bayad at tagal ng pagproseso.',
    'service:qc.s-senior-id:in_person:step:1': 'I-download o kunin sa OSCA ang Senior Citizen QC ID Application Form',
    'service:qc.s-senior-id:in_person:step:2': 'Isumite ang napunang form at lahat ng dokumento para sa verification ng OSCA',
    'service:qc.s-senior-id:in_person:step:3': 'Ipapadala ang ID sa iyong bahay o puwedeng kunin sa OSCA',
    # QC building permit
    'service:qc.s-building-permit:online:note': 'Magkaiba ang payment window sa mga source: windows 13 o 14 ng Treasurer ayon sa charter; Counter 12 ayon sa QCitizen guide. Kumpirmahin sa DBO.',
    'service:qc.s-building-permit:online:step:1': 'Mag-log in sa QC E-Services → Building Permit One-Stop Shop; gumawa ng application forms at checklist',
    'service:qc.s-building-permit:online:step:2': 'Magdagdag o pumili ng mga building professional; i-print ang checklist at forms',
    'service:qc.s-building-permit:online:step:3': 'I-submit online para sa pre-evaluation at magpa-schedule ng appointment',
    'service:qc.s-building-permit:online:step:4': 'Ihatid ang mga dokumento sa DBO kiosk sa araw ng iyong appointment',
    'service:qc.s-building-permit:online:step:5': 'Kunin ang Order of Payment (magdala ng valid ID) at magbayad sa cashier ng City Treasurer',
    'service:qc.s-building-permit:online:step:6': 'Ibalik ang OR; ire-release ang permit',
    # Marikina Online Services registration
    'service:mkn.s-portal-register:online:note': 'Hindi nakasaad sa mga nabasang source ang bayad at tagal.',
    'service:mkn.s-portal-register:online:step:1': 'Pumunta sa https://payment.marikina.gov.ph',
    'service:mkn.s-portal-register:online:step:2': 'I-click ang Sign Up at ilagay ang impormasyon ng account (ang password ay dapat may malaking titik, maliit na titik, numero at special character)',
    'service:mkn.s-portal-register:online:step:3': 'I-verify ang iyong email gamit ang mensaheng ipinadala sa iyo',
    # Marikina PWD ID
    'service:mkn.s-pwd-id:in_person:note': 'Walk-in lamang ayon sa mga nabasang source. Iba ang kabuuang oras sa 2022 omnibus charter (11 minuto at 10 segundo); ang 2024 charter ang ginamit.',
    'service:mkn.s-pwd-id:in_person:step:1': 'Punan ang PWD form at magpa-interview sa PDAO focal person',
    'service:mkn.s-pwd-id:in_person:step:2': 'Isumite ang mga requirement, kasama ang mga litrato; susuriin ito ng staff at itatala sa log book',
    'service:mkn.s-pwd-id:in_person:step:3': 'Ibibigay ang PWD card at ie-encode ang iyong impormasyon sa database',
    'service:mkn.s-pwd-id:in_person:step:4': 'Opsyonal: humingi ng ibang tulong (burial, medical, assistive device, kung mayroon)',
    # Marikina senior ID
    'service:mkn.s-senior-id:in_person:note': 'Para sa mga residente ng Marikina na 60 taong gulang pataas. Walk-in lamang ayon sa mga nabasang source.',
    'service:mkn.s-senior-id:in_person:step:1': 'Isumite ang napunang form kasama ang kumpletong requirement; susuriin ito ng OSCA staff, iinterbyuhin ka, at ie-encode ang iyong datos',
    'service:mkn.s-senior-id:in_person:step:2': 'Kunin ang Senior Citizen’s ID at booklet',
    # Marikina birth certificate copy
    'service:mkn.s-birth-ctc:in_person:note': 'Para lamang sa mga rekord na nakarehistro sa Marikina City Civil Registry. Pareho ang bayad para sa kopya ng birth, marriage at death. Walk-in lamang ayon sa mga nabasang source.',
    'service:mkn.s-birth-ctc:in_person:step:1': 'Punan ang request form sa LCRO Window 4 at isumite; titingnan ng verifier kung nasa database ito at magbibigay ng order of payment',
    'service:mkn.s-birth-ctc:in_person:step:2': 'Bayaran ang CTC fee sa City Treasurer’s office at kunin ang Official Receipt',
    'service:mkn.s-birth-ctc:in_person:step:3': 'Dalhin ang OR sa LCRO Window 4 para makuha ang certified copy',
    # Marikina birth registration
    'service:mkn.s-birth-registration:exit_message': 'Ang pagpaparehistro lampas sa 30 araw ay dumadaan sa late-registration na proseso. Makipag-ugnayan sa City Civil Registry Office (Window 5).',
    'service:mkn.s-birth-registration:in_person:note': 'Para sa mga ipinanganak sa Marikina City. Walk-in lamang ayon sa mga nabasang source.',
    'service:mkn.s-birth-registration:in_person:step:1': 'Isumite ang Certificate of Live Birth at mga requirement sa LCRO; titingnan ng staff kung kumpleto at magbibigay ng order of payment',
    'service:mkn.s-birth-registration:in_person:step:2': 'Bayaran ang registration fee sa City Treasurer’s office',
    'service:mkn.s-birth-registration:in_person:step:3': 'Dalhin ang Official Receipt sa LCRO Window 5 at kumuha ng claim stub na may petsa ng release',
    # Marikina business permit renewal
    'service:mkn.s-business-permit-renewal:online:note': 'Tingnan muna ang iyong eBOSS compliance status sa https://bplo.marikina.gov.ph/client.',
    'service:mkn.s-business-permit-renewal:online:step:1': 'Mag-sign in sa payment.marikina.gov.ph, piliin ang Business Permit & Licensing Office, ilagay ang iyong Business Account Number at i-click ang Renew',
    'service:mkn.s-business-permit-renewal:online:step:2': 'Ilagay ang aktwal/taunang idineklarang gross sales at i-attach ang financial statement at quarterly VAT, saka i-Submit',
    'service:mkn.s-business-permit-renewal:online:step:3': 'Piliin ang negosyo at quarter na babayaran, i-Compute ang Business Tax, Proceed to Checkout at magbayad (credit/debit card, GCash, Maya o Bayad App)',
    'service:mkn.s-business-permit-renewal:online:step:4': 'May ipapadalang email confirmation pagkatapos ng matagumpay na bayad',
    'service:mkn.s-business-permit-renewal:in_person:note': 'Nakalista sa charter ang 15 minuto bawat yugto (pag-file, pagbayad) pero walang kabuuang oras.',
    'service:mkn.s-business-permit-renewal:in_person:step:1': 'I-file ang napunang application form kasama ang kumpletong requirement sa BPLO (evaluation, assessment, billing at permit)',
    'service:mkn.s-business-permit-renewal:in_person:step:2': 'Magbayad sa cashier ng Treasury Office',
    'service:mkn.s-business-permit-renewal:in_person:step:3': 'Mga petsa ng bayad ngayong taon: Ene 20, Abr 20, Hul 20, Okt 20 (1st hanggang 4th quarter)',
    # Marikina building permit
    'service:mkn.s-building-permit:in_person:note': 'Nakaklasipika bilang Highly Technical sa 2024 charter. Walk-in lamang ayon sa mga nabasang source.',
    'service:mkn.s-building-permit:in_person:step:1': 'Isumite ang kumpletong requirement sa receiving section; susuriin ng clerk ang aplikasyon',
    'service:mkn.s-building-permit:in_person:step:2': 'Dalawang kopya ng plano ang ie-endorse sa BFP',
    'service:mkn.s-building-permit:in_person:step:3': 'Susuriin ng mga technical evaluator ang electrical, sanitary, structural at architectural na plano at mga dokumento ng ari-arian',
    'service:mkn.s-building-permit:in_person:step:4': 'Iinspeksyunin ang balak na konstruksyon',
    'service:mkn.s-building-permit:in_person:step:5': 'Kung compliant, ihahanda at aaprubahan ang order of payment; bayaran ang permit fees sa cashier',
    'service:mkn.s-building-permit:in_person:step:6': 'Aaprubahan ng Building Official at ire-release ng releasing clerk ang permit',
    # Requirement tips
    'requirement:qc.r-cert-disability:hint': 'Dapat pirmado ng specialist para sa uri ng iyong disability, hindi ng family doctor o general physician.',
    'requirement:qc.r-colb-4:hint': 'Mula sa ospital, maternity/lying-in clinic o birthing facility.',
    'requirement:mkn.r-med-cert:hint': 'Mula sa medical doctor, ophthalmologist, neurologist o orthopedic doctor.',
    'requirement:mkn.r-osca-form:hint': 'Makukuha sa OSCA.',
    'requirement:mkn.r-colb-form102:hint': 'Mula sa ospital, lying-in clinic o ibang birthing facility.',
    'requirement:mkn.r-eboss:hint': 'Tingnan ang iyong compliance status sa E-BOSS portal: https://bplo.marikina.gov.ph/client',
    'requirement:mkn.r-public-liability:hint': 'Mula sa kahit anong accredited na insurance company (City Ordinance No. 32, Series of 2013).',
    # Office notes
    'office:qc.barangay:note': 'Hindi sakop ng mga QC charter; kumpirmahin sa iyong barangay ang mga requirement at bayad.',
    'office:mkn.pdao:note': 'Hindi nakasaad sa mga nabasang source ang address at telepono; kumpirmahin sa CSWDO / City Hall.',
    'office:mkn.obo:note': 'Hindi nakasaad sa mga nabasang source ang address at telepono; kumpirmahin sa City Hall.',
    'office:mkn.cpdo:note': 'Nag-iisyu ng Locational Clearance; hindi kasama sa graph na ito.',
    'office:mkn.barangay:note': 'Hindi sakop ng mga nabasang Marikina charter; kumpirmahin sa iyong barangay.',
}


def english_strings(g):
    """Every translatable English string in the graph, by key (same keys as TL)."""
    out = {}
    for k, s in g['services'].items():
        if s.get('exit_message'): out[f'service:{k}:exit_message'] = s['exit_message']
        for v in s['variants']:
            if v.get('note'): out[f'service:{k}:{v["channel"]}:note'] = v['note']
            for i, x in enumerate(v['detail_steps']): out[f'service:{k}:{v["channel"]}:step:{i + 1}'] = x
    for k, r in g['requirements'].items():
        if r.get('hint'): out[f'requirement:{k}:hint'] = r['hint']
    for k, o in g['offices'].items():
        if o.get('note'): out[f'office:{k}:note'] = o['note']
    return out


if __name__ == '__main__':
    if os.path.exists(OUT) and '--force' not in sys.argv:
        sys.exit(f'{OUT} exists; edit it directly (or pass --force to regenerate the first draft)')
    g = json.load(open(os.path.join(ROOT, 'phase0', 'graph.json'), encoding='utf-8'))
    en = english_strings(g)
    missing = sorted(set(en) - set(TL)); extra = sorted(set(TL) - set(en))
    assert not missing and not extra, (missing, extra)
    data = {'_about': 'Filipino (Tagalog) for graph content. DRAFT pending review by a Filipino speaker. '
                      'Each entry keeps the English it was translated from ("en"); if the English changes, the validator '
                      'reports the entry as stale. Official office and document names stay in English on purpose.',
            'entries': {k: {'en': en[k], 'tl': TL[k], 'status': 'draft'} for k in sorted(en)}}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f'ok {len(en)} entries -> translations/tl.json')
