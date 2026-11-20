"""Quezon City data for the Phase 0 graph (local ids; build_phase0.py namespaces them as qc.*)."""
from phase0_lib import *

U = 'https://quezoncity.gov.ph/'
W = U + 'wp-content/uploads/'

register_sources('qc', {
 'pdao-charter-2025': pdf('PDAO-Citizens-Charter-2025-Updated-3.25.2025', 'PDAO Citizen’s Charter 2025 (4th Ed.)', W+'2020/09/PDAO-Citizens-Charter-2025-Updated-3.25.2025.pdf', 'pdao', '2025 4th Ed., updated 3.25.2025'),
 'pdao-pwd-service-2025': pdf('REGISTRATION-AND-ISSUANCE-OF-PWD-ID', 'PDAO – Registration and Issuance of PWD ID (service sheet)', W+'2025/03/REGISTRATION-AND-ISSUANCE-OF-PWD-ID.pdf', 'pdao', '2025/03 upload'),
 'bpld-charter-2025': pdf('BPLD-CITIZENS-CHARTER-2025', 'BPLD Citizen’s Charter (as of February 2025)', W+'2020/09/BPLD-CITIZENS-CHARTER-2025.pdf', 'bpld', 'Feb 2025'),
 'cto-business-tax-2024': pdf('COLLECTION-OF-BUSINESS-TAX-1', 'CTO – Collection of Business Tax (service sheet)', W+'2024/03/COLLECTION-OF-BUSINESS-TAX-1.pdf', 'cto', '2024/03 upload'),
 'dbo-construction-permits': pdf('Issuance-of-Construction-Permits', 'DBO – Issuance of Construction Permits (service sheet)', W+'2024/02/Issuance-of-Construction-Permits.pdf', 'dbo', '2024/02 upload'),
 'ccrd-charter-2025': pdf('CCRD-Citizens-Charter-2025-8th-Ed-', 'City Civil Registry Dept. Citizen’s Charter 2025 (8th Ed.)', W+'2020/09/CCRD-Citizens-Charter-2025-8th-Ed-.pdf', 'ccrd', '2025 8th Ed.'),
 'ccrd-ctc-birth': pdf('Request-and-Issuance-of-Certified-True-Copy-of-Birth-Certificate', 'CCRD – Request and Issuance of CTC of Birth Certificate (service sheet)', W+'2025/04/Request-and-Issuance-of-Certified-True-Copy-of-Birth-Certificate.pdf', 'ccrd', '2025/04 upload'),
 'ccrd-ctc-online': pdf('Request-for-Issuance-of-Certified-True-Copy-of-Birth-Marriage-and-Death-Cert.-via-Civil-Registry-Online-Services', 'CCRD – CTC of Birth/Marriage/Death via Civil Registry Online Services', W+'2025/04/Request-for-Issuance-of-Certified-True-Copy-of-Birth-Marriage-and-Death-Cert.-via-Civil-Registry-Online-Services.pdf', 'ccrd', '2025/04 upload'),
 'qc-guide-pwd-id': html('qc-guide-pwd-id.txt', 'QCitizen Guide – How to Apply for PWD ID', U+'qcitizen-guides/how-to-apply-for-pwd-id/', 'pdao', 'last updated 2026-05-13'),
 'qc-guide-senior-card': html('qc-guide-senior-card.txt', 'QCitizen Guide – How to Apply for Senior Citizen Card', U+'qcitizen-guides/how-to-apply-for-senior-citizen-card/', 'osca', 'last updated 2025-10-02'),
 'qc-guide-renew-business-permit': html('qc-guide-renew-business-permit.txt', 'QCitizen Guide – How to Renew Business Permit', U+'qcitizen-guides/how-to-renew-business-permit/', 'bpld', 'last updated 2026-01-06'),
 'qc-guide-building-permit': html('qc-guide-building-permit.txt', 'QCitizen Guide – How to Apply Online for a Building Permit', U+'qcitizen-guides/how-to-apply-for-a-building-permit/', 'dbo', 'last updated 2025-10-02'),
 'qc-contacts': html('qc-contacts.txt', 'QC department contact pages (OSCA, DBO, BPLD, CTO)', U+'departments/', 'multi', 'read 2026-11-18'),
})

# ---------- offices ----------
OFFICES = {
 'pdao': dict(name='Persons with Disability Affairs Office (PDAO)', address='Ground Floor, Community Center Building, Gate 3, Kalayaan Ave., QC Hall Compound', phone='8988-4242 loc 7809', channel='in_person'),
 'osca': dict(name='Office for the Senior Citizens’ Affairs (OSCA)', address='Ground Floor Community Center Building, Gate-3 Quezon City Hall Complex, Kalayaan Avenue, Quezon City', phone='8988-4242 locals 1104, 8703-2843', channel='in_person'),
 'bpld': dict(name='Business Permits and Licensing Department (BPLD)', address='Ground Floor, Civic Center Building A, Quezon City Hall, Mayaman St., Barangay Central, Quezon City', phone='8988-4242 local 8173', channel='in_person'),
 'cto': dict(name='City Treasurer’s Office (CTO)', address='Annex Building, Mayaman St. Brgy. Central, QC Hall Compound, Diliman, Quezon City', phone='8988-4242 locals 8317, 8145, 8156, 8157', channel='in_person'),
 'dbo': dict(name='Department of the Building Official (DBO)', address='Ground to 3rd Floors, Civic Center D (BRO Bldg.), Mayaman Street, Quezon City Hall Compound', phone='8988-4242 Local 8902, 8903, 8905, 8909, 8916, 1400, 1401', channel='in_person'),
 'ccrd': dict(name='City Civil Registry Department (CCRD)', address='Quezon City Hall Compound (1st Floor, Door 2, Civic Center)', phone='8988-4242 local 1516 (Birth Registration Division)', channel='in_person'),
 'eservices': dict(name='QC E-Services portal', address=None, url='https://qceservices.quezoncity.gov.ph/', channel='online'),
 'barangay': dict(name='Barangay hall (resident’s own barangay)', address=None, channel='in_person', external=True, note='Not covered by QC charters; confirm requirements and fees with your barangay.'),
 'external-agency': dict(name='Issuing agency or professional (outside QC charters)', address=None, channel='varies', external=True),
}
for o in OFFICES.values(): o['map'] = dict(lat=None, lng=None, status='needs_review') if o.get('address') else None
ev('office:pdao:address', 'pdao-charter-2025', 'Gate 3, Kalayaan Ave., QC Hall')
ev('office:pdao:phone', 'pdao-pwd-service-2025', '8988-4242 loc 7809')
ev('office:osca:address', 'qc-contacts', 'Gate-3 Quezon City Hall Complex, Kalayaan Avenue')
ev('office:bpld:address', 'qc-contacts', 'Civic Center Building A, Quezon City Hall, Mayaman St.')
ev('office:cto:address', 'qc-contacts', 'Annex Building, Mayaman St.')
ev('office:dbo:address', 'qc-contacts', 'Civic Center D (BRO Bldg.), Mayaman Street')
ev('office:ccrd:address', 'ccrd-charter-2025', 'Birth Registration Division 1st Floor, Door 2, Civic Center')
ev('office:eservices:url', 'dbo-construction-permits', 'https://qceservices.quezoncity.gov.ph/')

# ---------- requirements ----------
REQ = {
 'r-eservices-account': dict(name='QC E-Services account', issuer_service='s-eservices-register'),
 'r-cert-disability': dict(name='Certificate of Disability (from a specialist doctor)', external='external-agency', hint='Must be signed by the specialist for your disability type, not a family doctor or general physician.'),
 'r-med-cert-cancer-rare': dict(name='Medical certificate (cancer / rare disease)', external='external-agency'),
 'r-whole-body-photo': dict(name='Whole-body photo showing the disability', external=None, applicant=True),
 'r-gov-id': dict(name='Government-issued ID', external='external-agency'),
 'r-barangay-cert': dict(name='Barangay certificate / clearance', external='barangay'),
 'r-id-photo-2x2': dict(name='2x2 ID photo (and signature)', applicant=True),
 'r-valid-id-bd-address': dict(name='Valid ID showing birth date and address', external='external-agency'),
 'r-birth-certificate': dict(name='Birth certificate', issuer_service='s-birth-ctc'),
 'r-barangay-residency': dict(name='Barangay Certificate of Residency', external='barangay'),
 'r-marriage-cert': dict(name='Marriage Certificate', external='external-agency'),
 'r-prev-mayors-permit': dict(name='Previous Mayor’s Permit', applicant=True),
 'r-business-tax-or': dict(name='Official Receipt of business tax payment (current year)', issuer_service='s-business-tax-payment'),
 'r-owner-valid-id': dict(name='Valid ID of business owner', external='external-agency'),
 'r-authorization': dict(name='Authorization form + valid ID of representative', applicant=True),
 'r-tax-bill': dict(name='Computerized Business Tax Bill', external='cto'),
 'r-design-professional': dict(name='Registered private design/building professional (with QC E-Services account)', external='external-agency'),
 'r-tct': dict(name='Certified True Copy of Transfer Certificate of Title (TCT)', external='external-agency'),
 'r-legal-right': dict(name='Legal document showing right to build (e.g., Deed of Absolute Sale) when applicant is not the registered owner', applicant=True),
 'r-affidavits': dict(name='Notarized affidavits (forms printable from your QC E-Services account)', applicant=True),
 'r-building-plans': dict(name='Building plans with wet signature and seal of the design professional', external='external-agency'),
 'r-prev-building-permit': dict(name='Previous building permit / certificate of occupancy and approved plans (renovation; permit issued before Nov 17, 2022)', applicant=True),
 'r-request-form-birth': dict(name='Request form for birth certificate (Information Desk)', applicant=True),
 'r-id-ctc': dict(name='Government-issued / valid ID', external='external-agency'),
 'r-authorization-ctc': dict(name='Authorization letter/SPA + photocopies of owner’s and representative’s IDs', applicant=True),
 'r-colb-4': dict(name='Duly accomplished Certificate of Live Birth (4 copies)', external='external-agency', hint='From the hospital, maternity/lying-in clinic or birthing facility.'),
 'r-parents-marriage-cert': dict(name='Marriage Certificate of parents (PSA or local copy)', external='external-agency'),
 'r-parents-ids': dict(name='Copy of valid IDs of parents', external='external-agency'),
 'r-aop-ausf': dict(name='Notarized Affidavit of Admission of Paternity and/or Affidavit to Use the Surname of the Father', external='external-agency'),
}
ev('req:r-cert-disability', 'pdao-pwd-service-2025', 'Certificate of Disability Qualified Doctor /City Issuer')
ev('req:r-cert-disability:specialist', 'qc-guide-pwd-id', 'Certificate of disability from the specialist')
ev('req:r-cert-disability:not-gp', 'qc-guide-pwd-id', 'family doctors or general physicians are not encourage')
ev('req:r-med-cert-cancer-rare', 'qc-guide-pwd-id', 'medical certificate for Cancer and Rare diseases')
ev('req:r-whole-body-photo', 'qc-guide-pwd-id', 'Whole body photo that shows disability physically')
ev('req:r-gov-id', 'pdao-pwd-service-2025', 'Barangay clearance or any other government-issued')
ev('req:r-barangay-cert', 'pdao-pwd-service-2025', 'Barangay clearance or any other government-issued')
ev('req:r-id-photo-2x2', 'pdao-pwd-service-2025', '2 pcs. 2X2 I.D. picture / Signature')
ev('req:r-eservices-account', 'qc-guide-pwd-id', 'Register at QC E-Services using personal email')
ev('req:r-valid-id-bd-address', 'qc-guide-senior-card', 'valid ID with applicant’s birth date and address')
ev('req:r-birth-certificate', 'qc-guide-senior-card', 'Birth Certificate and Barangay Certificate of Residency')
ev('req:r-barangay-residency', 'qc-guide-senior-card', 'Barangay Certificate of Residency')
ev('req:r-marriage-cert', 'qc-guide-senior-card', 'Marriage Certificate (if the applicant is a married woman')
ev('req:r-prev-mayors-permit', 'bpld-charter-2025', 'Previous Mayor’s Permit', pages_range=(6, 7))
ev('req:r-business-tax-or', 'bpld-charter-2025', 'Official Receipt of Business Tax Payment for the current year', pages_range=(6, 7))
ev('req:r-owner-valid-id', 'bpld-charter-2025', 'Valid ID of Business Owner', pages_range=(6, 7))
ev('req:r-authorization', 'bpld-charter-2025', 'If filed by a duly authorized representative', pages_range=(6, 7))
ev('req:r-tax-bill', 'cto-business-tax-2024', 'Computerized Business Tax Bill')
ev('req:r-design-professional', 'dbo-construction-permits', 'A private design/building professional')
ev('req:r-tct', 'dbo-construction-permits', 'Land Registration Authority for the Certified')
ev('req:r-legal-right', 'dbo-construction-permits', 'Additional legal document showing right to')
ev('req:r-affidavits', 'dbo-construction-permits', 'Duly accomplished and notarized')
ev('req:r-building-plans', 'dbo-construction-permits', 'Building plans (with wet sign & seal of')
ev('req:r-prev-building-permit', 'dbo-construction-permits', 'Previous Building Permit or previous')
ev('req:r-prev-building-permit:date', 'dbo-construction-permits', 'November 17, 2022')
ev('req:r-request-form-birth', 'ccrd-ctc-birth', 'Request Form for Birth Certificate')
ev('req:r-id-ctc', 'ccrd-ctc-birth', 'Government-issued / Valid Identification Card')
ev('req:r-authorization-ctc', 'ccrd-ctc-birth', 'Authorization Letter/Special Power of Attorney')
ev('req:r-colb-4', 'ccrd-charter-2025', 'Duly accomplished Certificate of Live Birth (4')
ev('req:r-parents-marriage-cert', 'ccrd-charter-2025', 'Marriage Certificate of Parents')
ev('req:r-parents-ids', 'ccrd-charter-2025', 'Copy of valid IDs of parents')
ev('req:r-aop-ausf', 'ccrd-charter-2025', 'Notarized Affidavit to Use the Surname of the')


SERVICES = {}
SERVICES['s-eservices-register'] = dict(name='QC E-Services account registration', goal=False, variants=[
  V('online', 'eservices', 'not_listed', 'not_listed', [], url='https://qceservices.quezoncity.gov.ph/',
    steps=['Register at QC E-Services using a personal email (1 email per registrant)', 'Confirm and validate the E-Services account'],
    note='Fee and time not stated in the sources read.')])
ev('svc:s-eservices-register:steps', 'qc-guide-pwd-id', 'Confirm and validate E-Services account')

PWD_REQ = [
  R('r-whole-body-photo', when={'disability_type': 'apparent'}),
  R('r-cert-disability', when={'disability_type': 'non_apparent'}, skip_if={'has_med_cert': 'yes'}),
  R('r-med-cert-cancer-rare', when={'disability_type': 'cancer_rare'}, skip_if={'has_med_cert': 'yes'}),
  OR([['r-gov-id'], ['r-barangay-cert']], default=1, skip_if={'has_gov_id': 'yes'}, label='Proof of residence'),
  R('r-id-photo-2x2')]
SERVICES['s-pwd-id'] = dict(name='PWD ID application (QCitizen PWD ID)', goal=True, variants=[
  V('online', 'eservices', 'none', '3 days', [R('r-eservices-account')] + PWD_REQ, url='https://qceservices.quezoncity.gov.ph/',
    steps=['Log in and choose the QCitizen ID eApplication icon', 'Complete personal information and tick “Yes” for the Persons With Disability sector', 'Upload requirements; a virtual ID shows on submission, then agree and submit', 'Monitor application status in your E-Services account'],
    ev_fee=ev('svc:s-pwd-id:online:fee', 'pdao-pwd-service-2025', 'None (2-3 days'),
    ev_time=ev('svc:s-pwd-id:online:time', 'pdao-pwd-service-2025', 'ONLINE APPLICATION TOTAL : 3 Days'),
    note='Non-apparent disability validation takes 2–3 days. Renewal of a white PWD ID is processed as a new application.'),
  V('in_person', 'pdao', 'none', '40 minutes', PWD_REQ,
    steps=['Bring copies of requirements to PDAO for evaluation', 'Staff encode your information; it is approved and verified', 'Printed ID is given to you', 'Applicants with missing requirements are assisted and advised'],
    ev_fee=ev('svc:s-pwd-id:walkin:fee', 'pdao-pwd-service-2025', 'None (2-3 days'),
    ev_time=ev('svc:s-pwd-id:walkin:time', 'pdao-pwd-service-2025', 'WALK-IN APPLICATION TOTAL : 40 minutes'))])
ev('svc:s-pwd-id:walkin:steps', 'pdao-pwd-service-2025', 'Bring copies of')
ev('svc:s-pwd-id:renewal', 'pdao-pwd-service-2025', 'process will be considered as new applications')

SERVICES['s-birth-ctc'] = dict(name='Certified True Copy of Birth Certificate (QC-registered)', goal=True, variants=[
  V('in_person', 'ccrd', 'PHP 65.00 per copy', '15 minutes if on database (1945–2015); 3 days if manual search', [
      R('r-request-form-birth'), R('r-id-ctc'), R('r-authorization-ctc', when={'is_representative': 'yes'})],
    steps=['Submit filled-out request form and ID; receive order of payment', 'Pay at the City Treasurer’s cashier; receive claim stub', 'Receive the certified copy (Counter 5)'],
    ev_fee=ev('svc:s-birth-ctc:walkin:fee', 'ccrd-ctc-birth', 'PHP 65.00'),
    ev_time=ev('svc:s-birth-ctc:walkin:time', 'ccrd-ctc-birth', '15 Minutes -'),
    note='For persons born in Quezon City; counters 1 & 2.'),
  V('online', 'eservices', 'PHP 65.00 per copy', '1–3 days plus 5 minutes at pick-up', [
      R('r-eservices-account'), R('r-authorization-ctc', when={'is_representative': 'yes'})], url='https://qceservices.quezoncity.gov.ph/',
    steps=['Log in, click “Civil Registry Online Services”, then “Request for a Certificate”', 'Wait for the email saying the copy is ready for pick-up', 'Pick up at CCRD and pay at the City Treasurer’s Office'],
    ev_fee=ev('svc:s-birth-ctc:online:fee', 'ccrd-ctc-online', 'PHP 65.00'),
    ev_time=ev('svc:s-birth-ctc:online:time', 'ccrd-ctc-online', '1-3 Days and'))])
ev('svc:s-birth-ctc:manual', 'ccrd-ctc-birth', 'manual searching')

BR_REQ = [R('r-colb-4'), R('r-parents-marriage-cert', when={'parents_married': 'yes'}), R('r-parents-ids'), R('r-aop-ausf', when={'parents_married': 'no'})]
SERVICES['s-birth-registration'] = dict(name='Registration of Certificate of Live Birth (within 30 days)', goal=True,
  exit_if={'within_30_days': 'no'}, exit_message='Registration after 30 days follows the delayed-registration process. Contact the City Civil Registry Department.', exit_office='ccrd',
  variants=[
  V('in_person', 'ccrd', 'none', '5 minutes', BR_REQ,
    steps=['Submit the Certificate of Live Birth and all requirements at Counter 18', 'Receive the personal copy of the registered certificate'],
    ev_fee=ev('svc:s-birth-registration:walkin:fee', 'ccrd-charter-2025', 'TOTAL: None 5 Minutes'),
    ev_time=ev('svc:s-birth-registration:walkin:time', 'ccrd-charter-2025', 'TOTAL: None 5 Minutes')),
  V('online', 'eservices', 'none', '1–3 days after submission, then submit originals', [R('r-eservices-account')] + BR_REQ, url='https://qceservices.quezoncity.gov.ph/',
    steps=['Log in, “Civil Registry Online Services”, then “Birth Registration”', 'Upload digital copies of the requirements', 'After the email notice, submit the original documents at CCRD'],
    ev_fee=ev('svc:s-birth-registration:online:fee', 'ccrd-charter-2025', 'NONE'),
    ev_time=ev('svc:s-birth-registration:online:time', 'ccrd-charter-2025', '1 - 3 Days'))])
ev('svc:s-birth-registration:30days', 'ccrd-charter-2025', 'within thirty (30) days from the date of birth')

SERVICES['s-business-tax-payment'] = dict(name='Pay business tax (City Treasurer’s Office)', goal=False, variants=[
  V('in_person', 'cto', 'As stated in the Business Tax Bill', '10 minutes', [R('r-tax-bill')],
    steps=['Present the approved Computerized Business Tax Bill at the payment counter', 'Pay; receive the computerized business tax official receipt'],
    ev_fee=ev('svc:s-business-tax-payment:fee', 'cto-business-tax-2024', 'As stated'),
    ev_time=ev('svc:s-business-tax-payment:time', 'cto-business-tax-2024', 'Total 10 minutes'),
    note='Online payment is also offered via QC E-Services (per the BPLD charter); details not captured here.')])
ev('svc:s-business-tax-payment:online', 'bpld-charter-2025', 'Online Portal the choose Pay')

SERVICES['s-business-permit-renewal'] = dict(name='Business permit renewal', goal=True, variants=[
  V('online', 'eservices', 'none', 'not_listed', [
      R('r-prev-mayors-permit'), R('r-business-tax-or'), R('r-owner-valid-id'),
      R('r-authorization', when={'is_representative': 'yes'})], url='https://qceservices.quezoncity.gov.ph/',
    steps=['Pay business tax', 'File renewal via QC E-Services portal or kiosks: Business One-Stop Shop → Apply for Mayor’s Permit (Business) → Renewal', 'Input Mayor’s Permit number and current-year business tax OR; submit requirements', 'Claim the renewed permit or have it delivered'],
    ev_fee=ev('svc:s-business-permit-renewal:fee', 'bpld-charter-2025', 'None 30 mins.', pages_range=(6, 7)),
    ev_time=None,
    note='Charter lists 30 minutes per evaluation stage but no single total; the system can auto-renew if compliant.')])
ev('svc:s-business-permit-renewal:channels', 'bpld-charter-2025', 'QC e-Services Portal', pages_range=(6, 7))
ev('svc:s-business-permit-renewal:validity', 'bpld-charter-2025', 'one (1) year from the date of issue', pages_range=(6, 7))
ev('svc:s-business-permit-renewal:auto', 'qc-guide-renew-business-permit', 'capable of auto-renewing a business permit')

SEN_REQ = [
  OR([['r-valid-id-bd-address'], ['r-birth-certificate', 'r-barangay-residency']], default=1, skip_if={'has_qcitizen_id': 'yes'}, label='Proof of birth date and address'),
  R('r-marriage-cert', when={'married_woman_diff_surname': 'yes'}),
  R('r-id-photo-2x2')]
SERVICES['s-senior-id'] = dict(name='Senior Citizen QC ID (OSCA)', goal=True, variants=[
  V('online', 'eservices', 'not_listed', 'not_listed', [R('r-eservices-account')] + SEN_REQ, url='https://qceservices.quezoncity.gov.ph/',
    steps=['Create a profile and account with QC E-Services', 'Select QC ID e-Application (or Request for Sectoral Status Change if you already hold a resident QC ID)', 'Wait for the approval email', 'Wait for the physical ID to be delivered'],
    note='Fee and processing time are not stated in the guide.'),
  V('in_person', 'osca', 'not_listed', 'not_listed', SEN_REQ,
    steps=['Download or obtain the Senior Citizen QC ID Application Form from OSCA', 'Submit the accomplished form and all documents for OSCA verification', 'ID is sent to your home or can be picked up at OSCA'],
    note='Fee and processing time are not stated in the guide.')])
ev('svc:s-senior-id:qualification', 'qc-guide-senior-card', 'sixty (60) years of age or older')
ev('svc:s-senior-id:photo', 'qc-guide-senior-card', 'Latest digital or ID photo (2×2)')
ev('svc:s-senior-id:online', 'qc-guide-senior-card', 'Create a profile and account with QC E-Services')
ev('svc:s-senior-id:walkin', 'qc-guide-senior-card', 'Submit the Fully Accomplished Senior Citizen QC ID Application Form')
ev('svc:s-senior-id:pickup', 'qc-guide-senior-card', 'can be picked up at OSCA')

SERVICES['s-building-permit'] = dict(name='Building / construction permit (new construction)', goal=True, variants=[
  V('online', 'dbo', 'Refer to the Schedule of Fees (computed by DBO)', 'by class: 3 / 7 / 20 working days', [
      R('r-eservices-account'), R('r-design-professional'),
      R('r-tct', when={'is_owner': 'yes'}),
      R('r-legal-right', when={'is_owner': 'no'}),
      R('r-affidavits'), R('r-building-plans'),
      R('r-prev-building-permit', when={'is_renovation_pre2022': 'yes'})], url='https://qceservices.quezoncity.gov.ph/',
    time_by_class={'simple': '3 working days', 'complex': '7 working days', 'highly_technical': '20 working days'},
    steps=['Log in to QC E-Services → Building Permit One-Stop Shop; generate application forms and checklist', 'Add or select building professionals; print checklist and forms', 'Electronically submit for pre-evaluation and schedule an appointment', 'Drop off documents at the DBO kiosk on your appointment date', 'Claim the Order of Payment (bring valid ID) and pay at the City Treasurer’s cashier', 'Return the OR; permit released'],
    ev_fee=ev('svc:s-building-permit:fee', 'dbo-construction-permits', 'Schedule 5 at windows 13 or'),
    ev_time=ev('svc:s-building-permit:time', 'dbo-construction-permits', '3 (simple permit applications)-7 (complex permit applications)'),
    note='Payment window differs between sources: charter says Treasurer windows 13 or 14; the QCitizen guide says Counter 12. Confirm with DBO.')])
ev('svc:s-building-permit:appointment', 'dbo-construction-permits', 'Confirmed Online Appointment Visit')
ev('svc:s-building-permit:form', 'dbo-construction-permits', 'Unified Building')
ev('svc:s-building-permit:pay-charter', 'dbo-construction-permits', 'windows 13 or')
ev('svc:s-building-permit:pay-guide', 'qc-guide-building-permit', 'Counter 12 of the City Treasurer’s Office')
ev('svc:s-building-permit:kiosk', 'qc-guide-building-permit', 'Schedule an appointment to physically submit')

INTENTS = {
 'pwd-id-application': dict(service='s-pwd-id', aliases=['PWD ID', 'PWD card', 'disability ID', 'apply for PWD ID'], aliases_tl=['PWD ID', 'ID ng PWD', 'magparehistro bilang PWD']),
 'senior-citizen-id': dict(service='s-senior-id', aliases=['senior citizen ID', 'OSCA ID', 'senior ID', 'senior card'], aliases_tl=['ID ng senior', 'senior citizen card', 'OSCA ID']),
 'business-permit-renewal': dict(service='s-business-permit-renewal', aliases=['renew business permit', 'mayor’s permit renewal', 'business permit'], aliases_tl=['i-renew ang business permit', 'permit ng negosyo']),
 'building-permit': dict(service='s-building-permit', aliases=['building permit', 'construction permit', 'build a house'], aliases_tl=['building permit', 'permit para magpatayo ng bahay']),
 'birth-certificate-copy': dict(service='s-birth-ctc', aliases=['birth certificate copy', 'certified true copy of birth certificate', 'get birth certificate'], aliases_tl=['kopya ng birth certificate']),
 'birth-registration': dict(service='s-birth-registration', aliases=['register a birth', 'register newborn', 'certificate of live birth'], aliases_tl=['iparehistro ang bagong silang na sanggol']),
}
QUESTIONS = {q['key']: q for q in [
 Q('channel', 'Do you want to apply online or in person?', ['online', 'in_person'], 'Gusto mo bang mag-apply online o personal?'),
 Q('disability_type', 'What kind of disability do you have?', ['apparent', 'non_apparent', 'cancer_rare'], 'Anong uri ng disability?'),
 Q('has_med_cert', 'Do you already have the certificate from your specialist?', ['yes', 'no']),
 Q('has_gov_id', 'Do you have a government-issued ID with your Quezon City address?', ['yes', 'no'], 'May government ID ka ba na may QC address?'),
 Q('has_qcitizen_id', 'Do you already have a QCitizen ID?', ['yes', 'no']),
 Q('married_woman_diff_surname', 'Are you a married woman whose surname differs from your valid ID?', ['yes', 'no']),
 Q('is_representative', 'Is someone applying on behalf of the owner?', ['yes', 'no']),
 Q('is_owner', 'Are you the registered owner of the lot (named on the TCT)?', ['yes', 'no']),
 Q('is_renovation_pre2022', 'Is this a renovation of a building whose permit was issued before Nov 17, 2022?', ['yes', 'no']),
 Q('permit_class', 'Is the project simple, complex or highly technical?', ['simple', 'complex', 'highly_technical']),
 Q('parents_married', 'Were the child’s parents married at the time of birth?', ['yes', 'no']),
 Q('within_30_days', 'Is the child less than 30 days old?', ['yes', 'no']),
 Q('has_eservices_account', 'Do you already have a QC E-Services account?', ['yes', 'no']),
 Q('has_birth_certificate', 'Do you already have your birth certificate (PSA or CCRD copy)?', ['yes', 'no']),
 Q('has_business_tax_or', 'Have you already paid this year’s business tax (do you have the official receipt)?', ['yes', 'no']),
]}

SERVICES['s-building-permit']['extra_question_keys'] = ['permit_class']
compute_question_keys(SERVICES, REQ, QUESTIONS)
