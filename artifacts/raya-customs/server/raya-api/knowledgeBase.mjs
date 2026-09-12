/**
 * server/knowledgeBase.mjs
 *
 * Static RAG corpus for Raya Jordan customs assistant.
 * Built from src/content/ data at design time; update when content changes.
 *
 * Used by the Llama prompt builders for legal research and HS classification.
 */

// ---------------------------------------------------------------------------
// Jordan Customs Laws & Regulations
// ---------------------------------------------------------------------------
export const LAWS_CORPUS = `
## Jordan Customs Law & Tariff Schedule
Authority: Jordan Customs Department
Summary: Governs declaration, valuation, HS classification, duty assessment, prohibitions, and customs offences. The applied tariff rates and exemptions are published in the official schedule and subsequent decisions.
Key points:
- All imported goods must be declared to Jordan Customs
- Customs value generally follows transaction value (CIF) principles with adjustments
- HS classification determines duty rate and applicable controls
- False declaration can lead to fines, seizure, or criminal prosecution
Portal: https://www.customs.gov.jo

## General Sales Tax (GST) on Imports
Authority: Income & Sales Tax Department + Jordan Customs
Summary: Most imported goods are subject to general sales tax at the border in addition to customs duty. The standard rate is 16%. Rates and exemptions depend on product category and current tax law decisions.
Key points:
- GST is usually collected together with the customs duty assessment
- Some essential goods or special regimes may be zero-rated or exempt
- Correct HS code and tax code on the declaration are critical
- Get current rates from ISTD portal: https://istd.gov.jo

## Customs Service Fees (incl. Art. 161-type charges)
Authority: Jordan Customs Department
Summary: Specific service fees may apply to declarations and related operations. Treat these as pass-through client costs unless the engagement letter says otherwise.
Key points:
- Fees appear on the assessment / payment advice
- Do not book them as agency revenue if they are client disbursements
- Confirm the current fee table with Jordan Customs

## Import & Export Licensing / Trade Controls
Authority: Ministry of Industry, Trade and Supply
Summary: Certain goods require a prior import licence or are restricted/prohibited. Exporters may need certificates of origin.
Key points:
- Check restricted and prohibited goods lists before contracting the supplier
- Some goods need Ministry approval in addition to Customs clearance
- Export of dual-use or strategic goods may need extra clearance
Portal: https://www.mit.gov.jo

## Food, Drug, Cosmetic & Medical Device Controls
Authority: Jordan Food and Drug Administration (JFDA)
Summary: JFDA regulates registration, labelling, and import clearance for food, medicines, cosmetics, and medical devices. Shipments may be held until lab results or registration evidence is accepted.
Key points:
- Register products before regular commercial import where required
- Labels must meet Arabic content rules
- Samples may be drawn at the border for lab analysis
Portal: https://www.jfda.jo

## Standards & Conformity (JSMO)
Authority: Jordan Institution for Standards and Metrology (JSMO)
Summary: Enforces standards and conformity assessment. Many consumer and industrial goods need a certificate of conformity or equivalent evidence before Customs release.
Key points:
- Certificate of conformity required for regulated consumer goods
- Technical data sheets must be kept with the file
- Check JSMO portal for regulated product categories
Portal: https://www.jsmo.gov.jo

## Free Trade Agreements (FTAs)
Summary: Jordan has FTAs with several partners (US-Jordan FTA, EU-Jordan Association Agreement, Arab League FTA, and others). Qualifying goods may attract reduced or zero duty rates with proper certificate of origin.
Key points:
- Preferential treatment requires a valid, correctly issued certificate of origin
- Rules of origin must be satisfied (substantial transformation / value content)
- Confirm current FTA schedules with Jordan Customs
- Mismatch in origin on invoice vs certificate = yellow/red lane risk

## Temporary Admission
Summary: Goods can be imported temporarily (e.g. for exhibitions, processing, machinery rental) without paying full duties if re-exported within the permitted period under Customs bond or ATA Carnet.
Key points:
- Bond or ATA Carnet must be issued before shipment arrives
- Re-export must occur within the approved time limit
- Failure to re-export triggers full duty liability

## ACT (Aqaba Container Terminal) Free Days & Demurrage
Summary: At ACT (Aqaba), importers get a set number of free storage days depending on cargo type before demurrage charges begin. Broker must track last free day (LFD) and coordinate gate-out.
Key points:
- General cargo: typically 7 free days after vessel discharge
- Reefer / dangerous goods: shorter free periods, check ACT portal
- After LFD, daily demurrage accumulates rapidly
- Gate-out must happen within free period to avoid storage charges

## ASYCUDA World System
Summary: Jordan Customs uses ASYCUDA World for electronic declaration submission. Selectivity assigns shipments to green (auto-release), yellow (documentary check), red (physical inspection), or blue (post-clearance audit) lanes.
Key points:
- Green lane: documentary release, no physical exam expected
- Yellow lane: documentary check, Customs officer reviews documents
- Red lane: physical inspection required; coordinate attendance and seals
- Blue lane: goods may move but file stays open for post-clearance audit (PCA)
- SAD (Single Administrative Document) is the declaration form
- Declaration reference number assigned at registration

## Post-Clearance Audit (PCA)
Summary: Even after goods are released, Jordan Customs can audit declarations retrospectively, typically within 3-5 years. Blue lane assignments signal elevated PCA risk.
Key points:
- Maintain complete file: invoice, packing list, B/L, permits, payment receipts, inspection acts
- Valuation discrepancies are a common PCA trigger
- Cooperate promptly with PCA requests to avoid escalation
`;

// ---------------------------------------------------------------------------
// Regulatory Authorities
// ---------------------------------------------------------------------------
export const AUTHORITIES_CORPUS = `
## Jordan Customs Department
Role: Primary border agency
Responsibility: Classification, customs value, ASYCUDA declarations, duty and fee collection, selectivity, inspection, and release. All commercial imports and exports pass through Customs.
Required documents: Invoice, packing list, B/L, authorization letter, permits from other agencies as attached
Portal: https://www.customs.gov.jo
Timeline: Hours to several days depending on selectivity lane

## JFDA — Food & Drug Administration
Role: Food, medicines, cosmetics, medical devices
Responsibility: Registration, labelling compliance, and import control. May require product registration and lab analysis before release.
Required documents: Product label, registration / approval certificate, certificate of analysis, ingredients list
Portal: https://www.jfda.jo
Timeline: Days to weeks if registration or lab testing is needed

## JSMO — Standards & Metrology
Role: Conformity & Jordanian standards
Responsibility: Enforces standards and conformity assessment. Consumer and industrial goods need CoC or equivalent.
Required documents: Certificate of conformity, technical specification, test report
Portal: https://www.jsmo.gov.jo
Timeline: Depends on whether CoC is ready or testing is required

## Ministry of Industry, Trade and Supply (MITS)
Role: Trade licensing and import/export controls
Responsibility: Import licenses, restricted goods lists, export permits, and industrial approvals.
Portal: https://www.mit.gov.jo

## Ministry of Agriculture
Role: Phytosanitary and veterinary controls
Responsibility: Plant and animal health certificates for agricultural products, meat, poultry, and related goods. Requires phytosanitary or health certificates from the country of origin.
Required documents: Phytosanitary certificate, health certificate, origin certificate
Timeline: Depends on inspection result at border

## Greater Amman Municipality / ACT
Role: Terminal operator (Aqaba Container Terminal)
Responsibility: Container handling, storage, gate-out. Free days and demurrage start from vessel discharge date.
Portal: https://www.aqabaports.com.jo

## ASEZA — Aqaba Special Economic Zone Authority
Role: Aqaba SEZ regulatory authority
Responsibility: Administers the Aqaba Special Economic Zone with preferential customs and tax treatment. Goods entering ASEZA-designated free zone areas may benefit from duty suspension.
Portal: https://www.aseza.jo
`;

// ---------------------------------------------------------------------------
// HS Codes (Jordan sample tariff)
// ---------------------------------------------------------------------------
export const HS_CODES_CORPUS = `
## Jordan HS Code Tariff Schedule (Representative Sample)

HS Code | English Description | Arabic Description | Duty Rate
6109100010 | T-shirts, singlets and other vests, of cotton, knitted or crocheted | قمصان وتيشيرتات من القطن محبوكة | 20%
6109100090 | Other T-shirts, singlets and vests of cotton, knitted | تيشيرتات أخرى من القطن محبوكة | 20%
6109900010 | T-shirts of man-made fibres, knitted or crocheted | تيشيرتات من ألياف تركيبية محبوكة | 20%
6205200010 | Men's or boys' shirts of cotton, not knitted | قمصان رجالية من القطن غير محبوكة | 20%
6205300010 | Men's or boys' shirts of man-made fibres, not knitted | قمصان رجالية من ألياف تركيبية | 20%
6104620010 | Women's trousers of cotton, knitted | بنطلونات نسائية من القطن محبوكة | 20%
6204620010 | Women's trousers of cotton, not knitted | بنطلونات نسائية من القطن غير محبوكة | 20%
6403990010 | Footwear with outer soles of rubber or plastics, uppers of other materials | أحذية بنعال مطاط/بلاستيك وجلدة أخرى | 20%
4202210010 | Handbags with outer surface of leather | حقائب يد بسطح جلد خارجي | 20%
9403600010 | Other wooden furniture | أثاث خشبي آخر | 20%
1905320010 | Waffles and wafers | وافل وويفر | 20%
1806900010 | Chocolate and other food preparations containing cocoa | شوكولاتة ومستحضرات غذائية تحتوي كاكاو | 20%
1704900010 | Sugar confectionery not containing cocoa | حلوى سكرية لا تحتوي كاكاو | 20%
1901200010 | Mixes and doughs for bread, cake, biscuits | خلطات وعجائن للمخبوزات | 20%
0805100010 | Oranges, fresh or dried | برتقال طازج أو مجفف | 20%
0901210010 | Coffee, not roasted, not decaffeinated | قهوة غير محمصة وغير منزوعة الكافيين | 5%
2203000010 | Beer made from malt | بيرة مصنوعة من الشعير المحلى | Excise
2204210010 | Wine of fresh grapes | نبيذ عنب طازج | Excise
8471300010 | Portable automatic data processing machines weighing ≤10 kg (laptops) | حواسيب محمولة لا تزيد عن 10 كغ | 0%
8517120010 | Telephones for cellular networks (mobile phones) | هواتف للشبكات الخلوية | 0%
8528720010 | Colour television receivers | أجهزة تلفزيون ملوّن | 5%
8703230010 | Motor cars, spark-ignition engine, 1500-3000 cc | سيارات بمحرك بنزين 1500-3000 سم³ | Varies
3004900010 | Medicaments for therapeutic use, put up in measured doses | أدوية علاجية في جرعات محددة | 0%
3214109010 | Mastics; painters fillings; glaziers putty | مستحضرات لاصقة وملء الفجوات | 5%
3926909090 | Other articles of plastics | مصنوعات بلاستيكية أخرى | 20%
2710190010 | Other petroleum oils and preparations | زيوت البترول ومستحضراته الأخرى | Varies

### Classification Rules for Jordan
1. Use the 2022 HS nomenclature as implemented in the Jordan tariff schedule
2. Classification is based on the GRI (General Rules for Interpretation) – classify by most specific heading first
3. When a product could be classified in multiple chapters, use GRI 3 (most specific description wins)
4. Composite goods: classify by the component that gives the essential character
5. Sets of articles: classify by the component that gives the set its essential character
6. Always verify current rates on customs.gov.jo as rates change by decision
7. Some HS codes have split rates for members vs non-members of FTA agreements
`;

// ---------------------------------------------------------------------------
// Workflow & Clearance Procedures
// ---------------------------------------------------------------------------
export const WORKFLOW_CORPUS = `
## Jordan Import Clearance Workflow

### Phase 1: Pre-Arrival Preparation
Steps:
1. Receive shipping documents (invoice, packing list, B/L, certificate of origin)
2. Classify goods with HS code — critical, determines duty rate and required permits
3. Check if permits are required from authorities (JFDA, JSMO, Ministry of Agriculture, etc.)
4. Apply for import permits/licenses if needed (takes days to weeks — start early)
5. Prepare commercial invoice: CIF value, correct HS description, country of origin
6. Confirm ACT/terminal free day count from discharge date

### Phase 2: Arrival & Terminal Operations
Steps:
1. Receive vessel arrival notice from shipping line
2. Pay freight and obtain delivery order (D/O) from the agent
3. Submit vessel arrival documents to Jordan Customs through agent
4. Track container arrival and discharge at Aqaba Container Terminal (ACT)
5. Monitor free day countdown from discharge date

### Phase 3: ASYCUDA Declaration
Steps:
1. Open SAD (Single Administrative Document) in ASYCUDA World
2. Enter: HS code, goods description, origin, quantity, unit, CIF value, currency
3. Attach: invoice, packing list, B/L, permits, certificate of origin
4. Submit declaration for registration
5. Record declaration reference number
6. Await selectivity result: green / yellow / red / blue

### Phase 4: Selectivity & Examination
Green lane:
- No physical exam; proceed to duty payment
Yellow lane:
- Customs officer reviews documents
- Respond quickly to any queries with complete, consistent documents
- Fix any description/value mismatches immediately
Red lane:
- Physical inspection required
- Coordinate broker attendance, seals, and Inspection Act (محضر المعاينة)
- Do not assume release until exam outcome is officially recorded
Blue lane:
- Goods may move after duties paid
- File remains open for post-clearance audit
- Keep all valuation and permits documentation PCA-ready

### Phase 5: Duty Payment & Release
Steps:
1. Pay assessed duties, GST, and service fees (cashier at Customs or authorized bank)
2. Obtain duty payment receipt
3. Present payment proof to Customs for release order
4. Receive gate pass for terminal

### Phase 6: Gate-out & Delivery
Steps:
1. Present gate pass at ACT
2. Confirm container not in detention beyond free days
3. Arrange trucking for delivery to client warehouse
4. Issue client delivery advice

### Phase 7: File Closure
Steps:
1. Recover duties and fees paid from client (if pay-first mode)
2. Issue final clearance invoice to client
3. Archive complete file: invoice, packing list, B/L, declaration, permits, inspection act, payment receipts
4. File must be retained for PCA potential (typically 3-5 years)
`;

/**
 * Returns a combined RAG context string suitable for injecting into a Llama system prompt.
 * Pass topic flags to include only relevant sections.
 */
export function buildRagContext({ laws = true, authorities = true, hsCodes = false, workflow = false } = {}) {
  const parts = [];
  if (laws) parts.push(LAWS_CORPUS);
  if (authorities) parts.push(AUTHORITIES_CORPUS);
  if (hsCodes) parts.push(HS_CODES_CORPUS);
  if (workflow) parts.push(WORKFLOW_CORPUS);
  return parts.join('\n\n---\n\n');
}
