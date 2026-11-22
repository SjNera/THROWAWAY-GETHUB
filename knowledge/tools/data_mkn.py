"""Marikina City data for the Phase 0 graph (local ids; build_phase0.py namespaces them as mkn.*).
Primary sources: 2024 per-office charters (FDPP portal) and the 2026 BPLO charter. The 2022 omnibus charter is used only to cross-check.
Marikina services are walk-in only except business permit renewal (online via the Marikina Online Services portal)."""
from phase0_lib import *

F = 'https://fdpp.marikina.gov.ph/file/citizens%20charter/'
register_sources('mkn', {
 'mkn-charter-2022': pdf('MARIKINA-2022-Citizens-Charter', 'Marikina City Citizen’s Charter 2022 (omnibus, all offices)', 'https://www.marikina.gov.ph/facts/MARIKINA%202022%20Citizens%20Charter.pdf', 'multi', '2022 (cross-check only; superseded by 2024 office charters)'),
 'mkn-osca-2024': pdf('FDPP-OSCA', 'OSCA Citizen’s Charter 2024', F + 'osca.pdf', 'osca', '2024'),
 'mkn-cswdo-2024': pdf('FDPP-CSWDO', 'CSWDO Citizen’s Charter 2024 (includes PDAO)', F + 'cswdo.pdf', 'pdao', '2024'),
 'mkn-ccro-2024': pdf('FDPP-CCRO-Civil-Registry', 'City Civil Registry Office Citizen’s Charter 2024', F + 'civil%20registry.pdf', 'ccro', '2024'),
 'mkn-obo-2024': pdf('FDPP-OBO-Building-Official', 'Office of the Building Official Citizen’s Charter 2024', F + 'building%20official.pdf', 'obo', '2024'),
 'mkn-bplo-2026': pdf('BPLO-CITIZENS-CHARTER-2026', 'BPLO Citizen’s Charter 2026 (1st Ed.)', 'https://bplo.marikina.gov.ph/charter/BPLO%20CITIZENS%20CHARTER%202026.pdf', 'bplo', '2026 1st Ed.'),
 'mkn-bplo-2021': pdf('BPLO-CITIZENS-CHARTER-2021-1st-Ed', 'BPLO Citizen’s Charter 2021 (1st Ed.; older file on BPLO site)', 'https://bplo.marikina.gov.ph/charter/BPLOX%201748569905.pdf', 'bplo', '2021 1st Ed. (superseded by 2026)'),
 'mkn-cto-2024': pdf('FDPP-CTO-Treasury', 'City Treasury Office Citizen’s Charter 2024', F + 'treasury.pdf', 'cto', '2024 (downloaded, not modelled)'),
 'mkn-cpdo-2024': pdf('FDPP-CPDO-Planning', 'CPDO Citizen’s Charter 2024', F + 'planning.pdf', 'cpdo', '2024 (downloaded, not modelled)'),
 'mkn-contacts': html('mkn-contacts.txt', 'Marikina City – Contact Us / City Hall directory', 'https://marikina.gov.ph/contact-us', 'multi', 'read 2026-11-20'),
 'mkn-bplo-contact': html('mkn-bplo-contact.txt', 'BPLO Marikina – Contact Us', 'https://bplo.marikina.gov.ph/contact', 'bplo', 'read 2026-11-20'),
 'mkn-bplo-faq': html('mkn-bplo-faq.txt', 'BPLO Marikina – FAQ (online assessment and payment)', 'https://bplo.marikina.gov.ph/faq', 'bplo', 'read 2026-11-20'),
 'mkn-bplo-home': html('mkn-bplo-home.txt', 'BPLO Marikina – home page', 'https://bplo.marikina.gov.ph/', 'bplo', 'read 2026-11-20'),
 'mkn-bplo-charter-page': html('mkn-bplo-charter-page.txt', 'BPLO Marikina – Citizen’s Charter page', 'https://bplo.marikina.gov.ph/citizen-charter', 'bplo', 'read 2026-11-20'),
 'mkn-payment-portal': html('mkn-payment-portal.txt', 'Marikina Online Services portal (sign-in page)', 'https://payment.marikina.gov.ph/Marikina/OnlineServices/', 'portal', 'read 2026-11-20'),
 'mkn-home': html('mkn-home.txt', 'Marikina City – home page', 'https://www.marikina.gov.ph/', 'multi', 'read 2026-11-20'),
})

CITYHALL = 'Marikina City Hall, Shoe Avenue, Sta. Elena, Marikina City 1800'
NOT_STATED = ' (floor/room inside the compound is not stated in the sources; confirm with the office)'
# ---------- offices ----------
OFFICES = {
 'cityhall': dict(name='Marikina City Hall', address=CITYHALL, phone='8646-0462', channel='in_person'),
 'osca': dict(name='Office for Senior Citizens Affairs (OSCA)', address='Marikina City Hall, Shoe Avenue, Sta. Elena, Marikina City 1800' + NOT_STATED, phone='8659-1956', channel='in_person'),
 'pdao': dict(name='Persons with Disability Affairs Office (PDAO), under CSWDO', address=None, phone=None, channel='in_person', note='Address and phone are not stated in the sources read; confirm with CSWDO / City Hall.'),
 'ccro': dict(name='City Civil Registry Office (LCRO)', address='Marikina City Hall, Shoe Avenue, Sta. Elena, Marikina City 1800' + NOT_STATED, phone='8646-0373', channel='in_person'),
 'obo': dict(name='Office of the Building Official (OBO)', address=None, phone=None, channel='in_person', note='Address and phone are not stated in the sources read; confirm with City Hall.'),
 'bplo': dict(name='Business Permits and Licensing Office (BPLO)', address='Ground Floor, Finance Bldg, Shoe Ave., Sta. Elena, Marikina City', phone='8244-1800 / 8646-2354', channel='in_person'),
 'cto': dict(name='City Treasury Office (cashier)', address='Marikina City Hall, Shoe Avenue, Sta. Elena, Marikina City 1800' + NOT_STATED, phone='8682-9571 / 8646-1623', channel='in_person'),
 'cpdo': dict(name='City Planning and Development Office (CPDO)', address=None, phone=None, channel='in_person', note='Issues the Locational Clearance; not modelled in this graph.'),
 'portal': dict(name='Marikina Online Services portal', address=None, url='https://payment.marikina.gov.ph/Marikina/OnlineServices/', channel='online'),
 'barangay': dict(name='Barangay hall (resident’s own barangay)', address=None, channel='in_person', external=True, note='Not covered by the Marikina charters read; confirm with your barangay.'),
 'external-agency': dict(name='Issuing agency or professional (outside the Marikina charters)', address=None, channel='varies', external=True),
}
for o in OFFICES.values(): o['map'] = dict(lat=None, lng=None, status='needs_review') if o.get('address') else None
ev('office:cityhall:address', 'mkn-contacts', 'Marikina City Hall, Shoe Avenue, Sta. Elena, Marikina City 1800')
ev('office:cityhall:phone', 'mkn-contacts', '8646-0462')
ev('office:osca:phone', 'mkn-contacts', 'OSCA (Office of Senior Citizen Affairs) 8659-1956')
ev('office:osca:address', 'mkn-contacts', 'City Hall Offices Treasury Office', note='Listed under “City Hall Offices”; exact location inside City Hall not stated.')
ev('office:ccro:phone', 'mkn-contacts', 'LCR (Local Civil Registry) 8646-0373')
ev('office:ccro:address', 'mkn-contacts', 'City Hall Offices Treasury Office', note='Listed under “City Hall Offices”; exact location inside City Hall not stated.')
ev('office:cto:phone', 'mkn-contacts', 'Treasury Office 8682-9571 - 8646-1623')
ev('office:cto:address', 'mkn-contacts', 'City Hall Offices Treasury Office', note='Listed under “City Hall Offices”; exact location inside City Hall not stated.')
ev('office:bplo:address', 'mkn-bplo-contact', 'Ground Floor, Finance Bldg, Shoe Ave.')
ev('office:bplo:phone', 'mkn-contacts', '8244-1800 - 8646-2354')
ev('office:portal:url', 'mkn-bplo-faq', 'Visit https://payment.marikina.gov.ph')

# ---------- requirements ----------
REQ = {
 'r-portal-account': dict(name='Marikina Online Services account (payment.marikina.gov.ph)', issuer_service='s-portal-register'),
 # PWD ID
 'r-gov-id': dict(name='Government-issued valid ID', external='external-agency'),
 'r-med-cert': dict(name='Medical certificate or Certificate of Non-Apparent Disability from the doctor', external='external-agency', hint='From a medical doctor, ophthalmologist, neurologist or orthopedic doctor.'),
 'r-photo-1x1': dict(name='1x1 ID picture', applicant=True),
 'r-whole-body-photo': dict(name='Whole-body picture', applicant=True),
 # Senior ID
 'r-osca-form': dict(name='Fully accomplished OSCA application form', external='external-agency', hint='Obtained from OSCA.'),
 'r-photo-1x1-senior': dict(name='3 pcs. latest 1x1 ID picture', applicant=True),
 'r-valid-id-senior': dict(name='One valid ID or document (e.g., PhilSys National ID, UMID, voter’s ID, PRC ID, driver’s license, passport, birth certificate, barangay clearance)', external='external-agency'),
 'r-authorization-senior': dict(name='Authorization letter signed by the senior citizen + valid ID of the senior citizen and of the representative', applicant=True),
 # Birth CTC
 'r-request-form-birth': dict(name='Request form for birth certificate (LCRO Window 4)', applicant=True),
 'r-id-ctc': dict(name='Government-issued / valid ID of requester', external='external-agency'),
 'r-authorization-ctc': dict(name='Authorization letter / Special Power of Attorney from the document owner', applicant=True),
 # Birth registration
 'r-colb-form102': dict(name='Properly accomplished Municipal Form 102 (Certificate of Live Birth), 1 set', external='external-agency', hint='From the hospital, lying-in clinic or other birthing facility.'),
 'r-parents-marriage-cert': dict(name='Certified true copy or PSA/NSO copy of the parents’ marriage certificate', external='external-agency'),
 'r-aop': dict(name='Affidavit of Admission of Paternity (back of Form 102, signed by the parents and notarized)', external='external-agency'),
 'r-aus': dict(name='Affidavit to Use the Surname of the Father (4 copies, signed by the mother and notarized)', external='external-agency'),
 # Business permit renewal
 'r-eboss': dict(name='eBOSS compliance (Engineering, BFP, CHO, CEMO)', external='external-agency', hint='Check your compliance status on the E-BOSS portal: https://bplo.marikina.gov.ph/client'),
 'r-financial-statement': dict(name='Financial Statement / Quarterly VAT Returns / Monthly Percentage Tax (photocopies)', external='external-agency'),
 'r-business-account-no': dict(name='Business Account Number (from your existing Marikina business permit)', applicant=True),
 'r-authorization-biz': dict(name='If through a representative: Authorization Letter/SPA (sole proprietorship) or Secretary’s Certificate (corporation, partnership, cooperative), plus valid IDs', applicant=True),
 'r-public-liability': dict(name='Public liability insurance', external='external-agency', hint='From any accredited insurance company (City Ordinance No. 32, Series of 2013).'),
 # Building permit
 'r-property-docs': dict(name='TCT, Tax Declaration, Tax Receipt', external='external-agency'),
 'r-bom-specs': dict(name='Bill of materials and specifications', applicant=True),
 'r-cshp': dict(name='CSHP Certificate from DOLE', external='external-agency'),
 'r-locational-clearance': dict(name='Locational Clearance', external='cpdo'),
 'r-signed-plans': dict(name='Signed and sealed construction plans (Architectural, Structural, Lot Plan, Electrical, Sanitary, Mechanical)', external='external-agency'),
 'r-other-clearances': dict(name='Other government agency clearances, as required', external='external-agency'),
}
ev('req:r-gov-id', 'mkn-cswdo-2024', 'Government-issued Valid ID Any Government offices')
ev('req:r-med-cert', 'mkn-cswdo-2024', 'Medical Certificate or Certificate of Non- Medical Doctor, Ophthalmologist, Neurologist or')
ev('req:r-photo-1x1', 'mkn-cswdo-2024', 'Pcs. 1x1 Picture')
ev('req:r-whole-body-photo', 'mkn-cswdo-2024', 'Whole Body Picture')
ev('req:r-osca-form', 'mkn-osca-2024', 'Fully Accomplished Form OSCA', pages_range=(3, 3))
ev('req:r-photo-1x1-senior', 'mkn-osca-2024', '3 pcs. Latest 1x1 ID, PHYLSIS National ID', pages_range=(3, 3))
ev('req:r-valid-id-senior', 'mkn-osca-2024', 'PHYLSIS National ID, UMID Card', pages_range=(3, 3))
ev('req:r-authorization-senior', 'mkn-osca-2024', 'Authorization Letter signed by the applicant', pages_range=(3, 3))
ev('req:r-request-form-birth', 'mkn-ccro-2024', 'Request of Birth / Marriage / Death Civil Registry Office Window 4')
ev('req:r-id-ctc', 'mkn-ccro-2024', 'Government-issued /Valid Identification')
ev('req:r-authorization-ctc', 'mkn-ccro-2024', 'Authorization Letter / Special Power of')
ev('req:r-colb-form102', 'mkn-ccro-2024', 'Properly accomplished Municipal Form 102', pages_range=(5, 5))
ev('req:r-parents-marriage-cert', 'mkn-ccro-2024', 'If Parents are Married at the time of birth', pages_range=(5, 5))
ev('req:r-aop', 'mkn-ccro-2024', 'Affidavit of Admission of Paternity', pages_range=(5, 5))
ev('req:r-aus', 'mkn-ccro-2024', 'Affidavit to Use the Surname of the Father', pages_range=(5, 5))
ev('req:r-eboss', 'mkn-bplo-2026', 'eBOSS Compliance Engineering, BFP, CHO, CEMO', pages_range=(7, 7))
ev('req:r-financial-statement', 'mkn-bplo-2026', 'Financial Statement / Quarterly Vat Returns /', pages_range=(7, 7))
ev('req:r-business-account-no', 'mkn-bplo-faq', 'Input Business Account Number')
ev('req:r-authorization-biz', 'mkn-bplo-2026', 'Authorization Letter or SPA from the owner', pages_range=(7, 7))
ev('req:r-authorization-biz:corp', 'mkn-bplo-2026', 'Secretary Certificate', pages_range=(7, 7))
ev('req:r-public-liability', 'mkn-bplo-2026', 'PUBLIC LIABILITY INSURANCE', pages_range=(7, 7), note='Listed under “Additional requirements” after the walk-in list; whether it also applies to online renewal is not stated.')
ev('req:r-property-docs', 'mkn-obo-2024', 'TCT, Tax Declaration, Tax Receipt, Bill of materials, Specification')
ev('req:r-bom-specs', 'mkn-obo-2024', 'TCT, Tax Declaration, Tax Receipt, Bill of materials, Specification')
ev('req:r-cshp', 'mkn-obo-2024', 'CSHP Certificate from DOLE, Locational Clearance')
ev('req:r-locational-clearance', 'mkn-obo-2024', 'CSHP Certificate from DOLE, Locational Clearance')
ev('req:r-signed-plans', 'mkn-obo-2024', 'Signed and Sealed Construction Plans (Architectural, Structural, Lot')
ev('req:r-other-clearances', 'mkn-obo-2024', 'Others government agency clearances as requirements')
ev('req:r-portal-account', 'mkn-bplo-faq', 'Click Sign Up to create an account')

SERVICES = {}
# ---------- Marikina Online Services account ----------
SERVICES['s-portal-register'] = dict(name='Marikina Online Services account registration', goal=False, variants=[
  V('online', 'portal', 'not_listed', 'not_listed', [], url='https://payment.marikina.gov.ph/Marikina/OnlineServices/',
    steps=['Visit https://payment.marikina.gov.ph', 'Click Sign Up and input account information (password needs an uppercase, lowercase, number and special character)', 'Verify your email using the message sent to you'],
    note='Fee and time are not stated in the sources read.')])
ev('svc:s-portal-register:steps', 'mkn-bplo-faq', 'An email will be sent to verify the registration.')

# ---------- PWD ID ----------
PWD_REQ = [R('r-gov-id', skip_if={'has_gov_id': 'yes'}), R('r-med-cert', skip_if={'has_med_cert': 'yes'}), R('r-photo-1x1'), R('r-whole-body-photo')]
SERVICES['s-pwd-id'] = dict(name='PWD ID (PDAO)', goal=True, variants=[
  V('in_person', 'pdao', 'none', '16 minutes', PWD_REQ,
    steps=['Fill in the PWD form and be interviewed by the PDAO focal person', 'Submit requirements, including pictures; staff review them and record them in the log book', 'PWD card is issued and your information is encoded in the database', 'Optional: request other assistance (burial, medical, assistive device, if available)'],
    ev_fee=ev('svc:s-pwd-id:walkin:fee', 'mkn-cswdo-2024', 'Interview and none 5 minutes', pages_range=(10, 10)),
    ev_time=ev('svc:s-pwd-id:walkin:time', 'mkn-cswdo-2024', 'TOTAL 16 minutes', pages_range=(10, 10)),
    note='Walk-in only in the sources read. The 2022 omnibus charter gives a different total (11 minutes and 10 seconds); the 2024 charter is used.')])
ev('svc:s-pwd-id:steps', 'mkn-cswdo-2024', '4. Issuance of PWD', pages_range=(10, 10))
ev('svc:s-pwd-id:xcheck2022', 'mkn-charter-2022', '11 minutes', pages_range=(180, 180), note='Older edition; shown only to document the difference.')

# ---------- Senior ID ----------
SEN_REQ = [R('r-osca-form'), R('r-photo-1x1-senior'), R('r-valid-id-senior', skip_if={'has_valid_id': 'yes'}), R('r-authorization-senior', when={'is_representative': 'yes'})]
SERVICES['s-senior-id'] = dict(name='Senior Citizen’s ID with booklet (OSCA)', goal=True, variants=[
  V('in_person', 'osca', 'none', '6 minutes', SEN_REQ,
    steps=['Submit the accomplished form with complete requirements; OSCA staff check them, interview you and encode your data', 'Claim the Senior Citizen’s ID and booklet'],
    ev_fee=ev('svc:s-senior-id:fee', 'mkn-osca-2024', 'none 3 minutes OSCA Staff (ID', pages_range=(3, 3)),
    ev_time=ev('svc:s-senior-id:time', 'mkn-osca-2024', 'TOTAL 6 minutes', pages_range=(3, 3)),
    note='For Marikina residents aged 60 or older. Walk-in only in the sources read.')])
ev('svc:s-senior-id:qualification', 'mkn-osca-2024', 'Marikina Residents who is sixty (60)years of age or older', pages_range=(3, 3))
ev('svc:s-senior-id:xcheck2022', 'mkn-charter-2022', 'Valid Id with Marikina Address', pages_range=(259, 259), note='Older edition; shown for cross-check.')

# ---------- Birth certificate copy ----------
SERVICES['s-birth-ctc'] = dict(name='Certified True Copy of Birth Certificate (Marikina-registered)', goal=True, variants=[
  V('in_person', 'ccro', 'PHP 150.00 per copy', '6 minutes', [
      R('r-request-form-birth'), R('r-id-ctc'), R('r-authorization-ctc', when={'is_representative': 'yes'})],
    steps=['Fill out the request form at LCRO Window 4 and submit it; the verifier checks availability in the database and issues the order of payment', 'Pay the CTC fee at the City Treasurer’s office and get the Official Receipt', 'Bring the OR to LCRO Window 4 to receive the certified copy'],
    ev_fee=ev('svc:s-birth-ctc:fee', 'mkn-ccro-2024', 'Php 150.00', pages_range=(16, 16)),
    ev_time=ev('svc:s-birth-ctc:time', 'mkn-ccro-2024', 'TOTAL 6 minutes', pages_range=(16, 16)),
    note='Records registered at the Marikina City Civil Registry only. The same fee is shown for birth, marriage and death copies. Walk-in only in the sources read.')])
ev('svc:s-birth-ctc:notice', 'mkn-ccro-2024', 'Only documents with official', pages_range=(16, 16))

# ---------- Birth registration (within 30 days) ----------
BR_REQ = [R('r-colb-form102'), R('r-parents-marriage-cert', when={'parents_married': 'yes'}), R('r-aop', when={'parents_married': 'no'}), R('r-aus', when={'parents_married': 'no'})]
SERVICES['s-birth-registration'] = dict(name='Registration of Certificate of Live Birth (on-time, within 30 days)', goal=True,
  exit_if={'within_30_days': 'no'}, exit_message='Registration after 30 days follows the late-registration process. Contact the City Civil Registry Office (Window 5).', exit_office='ccro',
  variants=[
  V('in_person', 'ccro', 'PHP 100.00 (on-time registration fee)', '9 minutes', BR_REQ,
    steps=['Submit the Certificate of Live Birth and requirements at LCRO; staff check completeness and give an order of payment', 'Pay the registration fee at the City Treasurer’s office', 'Bring the Official Receipt to LCRO Window 5 and get a claim stub with the release date'],
    ev_fee=ev('svc:s-birth-registration:fee', 'mkn-ccro-2024', 'PHP100.00', pages_range=(5, 5)),
    ev_time=ev('svc:s-birth-registration:time', 'mkn-ccro-2024', 'TOTAL 9 minutes', pages_range=(5, 5)),
    note='For births in Marikina City. Walk-in only in the sources read.')])
ev('svc:s-birth-registration:30days', 'mkn-ccro-2024', 'within thirty (30) days from the date of birth', pages_range=(5, 5))
ev('svc:s-birth-registration:claim', 'mkn-ccro-2024', 'then get a claim', pages_range=(5, 5))

# ---------- Business permit renewal ----------
BIZ_WALKIN = [R('r-eboss'), R('r-financial-statement'), R('r-authorization-biz', when={'is_representative': 'yes'}), R('r-public-liability')]
BIZ_ONLINE = [R('r-portal-account'), R('r-business-account-no'), R('r-financial-statement')]
SERVICES['s-business-permit-renewal'] = dict(name='Business permit renewal (BPLO)', goal=True, variants=[
  V('online', 'portal', 'Per the Revenue Code of Marikina City (computed by the portal)', '15 minutes (register and pay online)', BIZ_ONLINE, url='https://payment.marikina.gov.ph/Marikina/OnlineServices/',
    steps=['Sign in at payment.marikina.gov.ph, select Business Permit & Licensing Office, enter your Business Account Number and click Renew', 'Input the actual/annual declared gross sales and attach your financial statement and quarterly VAT, then Submit', 'Select the business and quarter to pay, Compute Business Tax, Proceed to Checkout and pay (credit/debit card, GCash, Maya or Bayad App)', 'An email confirmation is sent after a successful payment'],
    ev_fee=ev('svc:s-business-permit-renewal:online:fee', 'mkn-bplo-2026', 'Revenue Code', pages_range=(9, 9)),
    ev_time=ev('svc:s-business-permit-renewal:online:time', 'mkn-bplo-2026', '(Assessment, 15 minutes', pages_range=(9, 9)),
    note='Check your eBOSS compliance status first at https://bplo.marikina.gov.ph/client.'),
  V('in_person', 'bplo', 'Per the Revenue Code of Marikina City (assessed by BPLO)', 'File 15 minutes, then pay 15 minutes', BIZ_WALKIN,
    steps=['File the duly accomplished application form with complete requirements at BPLO (evaluation, assessment, billing and permit)', 'Pay at the Treasury Office cashier', 'Payment due dates for the current year: Jan 20, Apr 20, Jul 20, Oct 20 (1st to 4th quarter)'],
    ev_fee=ev('svc:s-business-permit-renewal:walkin:fee', 'mkn-bplo-2026', 'Revenue Code', pages_range=(8, 8)),
    ev_time=ev('svc:s-business-permit-renewal:walkin:time', 'mkn-bplo-2026', 'Assessment, 15 minutes', pages_range=(8, 8)),
    note='The charter lists 15 minutes per stage (file, pay) with no single total.')])
ev('svc:s-business-permit-renewal:due', 'mkn-bplo-2026', 'PAYMENT DUE DATE', pages_range=(8, 8))
ev('svc:s-business-permit-renewal:eboss', 'mkn-bplo-2026', 'E-BOSS Portal at https://bplo.marikina.gov.ph/client', pages_range=(8, 9))
ev('svc:s-business-permit-renewal:renew', 'mkn-bplo-faq', 'Click Renew button')
ev('svc:s-business-permit-renewal:gross', 'mkn-bplo-faq', 'Input the Actual / Annual Declared Gross Sales and attached')
ev('svc:s-business-permit-renewal:pay', 'mkn-bplo-faq', 'Credit card, Debit Card, E-wallet (Gcash')

# ---------- Building permit ----------
SERVICES['s-building-permit'] = dict(name='Building permit and other ancillary permits (OBO)', goal=True, variants=[
  V('in_person', 'obo', 'Based on the Philippine Electrical Code, Mechanical Code and National Building Code', '1 day and 3 hours',
    [R('r-property-docs'), R('r-bom-specs'), R('r-cshp'), R('r-locational-clearance'), R('r-signed-plans'), R('r-other-clearances')],
    steps=['Submit complete requirements at the receiving section; the clerk checks the application', 'Two copies of the plan are endorsed to BFP', 'Technical evaluators check the electrical, sanitary, structural and architectural plans and property documents', 'The proposed construction is inspected', 'If compliant, the order of payment is prepared and approved; pay the permit fees at the cashier', 'The Building Official approves and the releasing clerk releases the permit'],
    ev_fee=ev('svc:s-building-permit:fee', 'mkn-obo-2024', 'Based on 10 minutes', pages_range=(3, 3)),
    ev_time=ev('svc:s-building-permit:time', 'mkn-obo-2024', '1 day and 3', pages_range=(3, 3)),
    note='Classified Highly Technical in the 2024 charter. Walk-in only in the sources read.')])
ev('svc:s-building-permit:bfp', 'mkn-obo-2024', 'Endorses 2 copies of', pages_range=(3, 3))
ev('svc:s-building-permit:inspect', 'mkn-obo-2024', 'Proposed Construction 1 day Building Inspectors', pages_range=(3, 3))
ev('svc:s-building-permit:pay', 'mkn-obo-2024', 'Pays permit', pages_range=(3, 3))
ev('svc:s-building-permit:xcheck2022', 'mkn-charter-2022', '1 day and 3', pages_range=(139, 139), note='2022 omnibus agrees on the total time.')

# ---------- intents (shared ids; aliases are merged with QC) ----------
INTENTS = {
 'pwd-id-application': dict(service='s-pwd-id', aliases=['PWD ID', 'PWD card', 'disability ID', 'apply for PWD ID'], aliases_tl=['PWD ID', 'ID ng PWD']),
 'senior-citizen-id': dict(service='s-senior-id', aliases=['senior citizen ID', 'OSCA ID', 'senior ID', 'senior card'], aliases_tl=['ID ng senior', 'OSCA ID']),
 'business-permit-renewal': dict(service='s-business-permit-renewal', aliases=['renew business permit', 'mayor’s permit renewal', 'business permit'], aliases_tl=['i-renew ang business permit', 'permit ng negosyo']),
 'building-permit': dict(service='s-building-permit', aliases=['building permit', 'construction permit', 'build a house'], aliases_tl=['building permit']),
 'birth-certificate-copy': dict(service='s-birth-ctc', aliases=['birth certificate copy', 'certified true copy of birth certificate', 'get birth certificate'], aliases_tl=['kopya ng birth certificate']),
 'birth-registration': dict(service='s-birth-registration', aliases=['register a birth', 'register newborn', 'certificate of live birth'], aliases_tl=['iparehistro ang bagong silang na sanggol']),
}

QUESTIONS = {q['key']: q for q in [
 Q('channel', 'Do you want to apply online or in person?', ['online', 'in_person'], 'Gusto mo bang mag-apply online o personal?'),
 Q('is_representative', 'Will a representative (someone other than the applicant) file this for you?', ['yes', 'no'], 'May representative ba (ibang tao, hindi ang mismong aplikante) na magfa-file nito para sa iyo?'),
 Q('parents_married', 'Were the child’s parents married at the time of birth?', ['yes', 'no'], 'Kasal ba ang mga magulang ng bata noong ipinanganak siya?'),
 Q('within_30_days', 'Is the child less than 30 days old?', ['yes', 'no'], 'Wala pa bang 30 araw mula nang ipanganak ang bata?'),
 Q('has_gov_id', 'Do you have a valid government-issued ID?', ['yes', 'no'], 'May valid government ID ka ba?'),
 Q('has_med_cert', 'Do you already have the medical certificate (or certificate of non-apparent disability) from your doctor?', ['yes', 'no'], 'Mayroon ka na bang medical certificate (o certificate of non-apparent disability) mula sa iyong doktor?'),
 Q('has_valid_id', 'Do you have a valid ID or one of the accepted documents (e.g., birth certificate, barangay clearance)?', ['yes', 'no'], 'Mayroon ka bang valid ID o isa sa mga tinatanggap na dokumento (hal. birth certificate, barangay clearance)?'),
 Q('has_portal_account', 'Do you already have a Marikina Online Services account?', ['yes', 'no'], 'Mayroon ka na bang Marikina Online Services account?'),
]}
compute_question_keys(SERVICES, REQ, QUESTIONS)

# Older editions: cross-check only (never searched, never a section).
superseded('mkn-charter-2022', 'mkn-bplo-2021')

# Where each service's whole process is written (the search index uses these pages, nothing else).
set_sections(SERVICES, {
 's-portal-register': [S('mkn-bplo-faq')],
 's-pwd-id': [S('mkn-cswdo-2024', 10, 10)],
 's-senior-id': [S('mkn-osca-2024', 3, 3)],
 's-birth-ctc': [S('mkn-ccro-2024', 16, 16)],
 's-birth-registration': [S('mkn-ccro-2024', 5, 5)],
 's-business-permit-renewal': [S('mkn-bplo-2026', 7, 9), S('mkn-bplo-faq')],
 's-building-permit': [S('mkn-obo-2024', 3, 3)],
})
