import type { LawRegulation } from '@/lib/types';

/**
 * High-level guidance on Jordan import/export legal framework.
 * Not legal advice — always confirm current official text and amendments.
 */
export const LAWS_REGULATIONS: LawRegulation[] = [
  {
    id: 'customs-law',
    category: 'customs',
    titleEn: 'Customs Law & tariff schedule',
    titleAr: 'قانون الجمارك وجدول التعرفة',
    summaryEn:
      'Governs declaration, valuation, HS classification, duty assessment, prohibitions, and customs offences. The applied tariff rates and exemptions are published in the official schedule and subsequent decisions.',
    summaryAr:
      'ينظم البيان والتثمين وتصنيف HS وتقدير الرسوم والمحظورات والمخالفات الجمركية. نسب الرسوم والإعفاءات المطبقة تُنشر في الجدول الرسمي والقرارات اللاحقة.',
    keyPointsEn: [
      'All imported goods must be declared to Jordan Customs',
      'Customs value generally follows transaction value principles with adjustments',
      'HS classification determines duty rate and controls',
      'False declaration can lead to fines, seizure, or prosecution',
    ],
    keyPointsAr: [
      'يجب التصريح عن جميع البضائع المستوردة لدائرة الجمارك',
      'القيمة الجمركية تتبع عموماً مبادئ قيمة الصفقة مع تعديلات',
      'تصنيف HS يحدد نسبة الرسم والضوابط',
      'البيان الكاذب قد يؤدي إلى غرامات أو حجز أو ملاحقة',
    ],
    authorityEn: 'Jordan Customs Department',
    authorityAr: 'دائرة الجمارك الأردنية',
    relevanceEn: 'Core framework for every import and export clearance',
    relevanceAr: 'الإطار الأساسي لكل تخليص استيراد وتصدير',
  },
  {
    id: 'sales-tax',
    category: 'tax',
    titleEn: 'General Sales Tax (GST) on imports',
    titleAr: 'ضريبة المبيعات العامة على المستوردات',
    summaryEn:
      'Most imported goods are subject to general sales tax at the border in addition to customs duty. Rates and exemptions depend on product category and current tax law decisions.',
    summaryAr:
      'تخضع معظم البضائع المستوردة لضريبة المبيعات العامة عند الحدود إضافة إلى الرسم الجمركي. النسب والإعفاءات تعتمد على فئة المنتج وقرارات قانون الضريبة الحالية.',
    keyPointsEn: [
      'GST is usually collected with the customs assessment',
      'Some essentials or special regimes may be zero-rated or exempt',
      'Correct HS and tax code on the declaration are critical',
    ],
    keyPointsAr: [
      'تُحصَّل ضريبة المبيعات عادة مع التقدير الجمركي',
      'بعض الضروريات أو الأنظمة الخاصة قد تكون بنسبة صفر أو معفاة',
      'رمز HS والرمز الضريبي الصحيحان على البيان أمران حاسمان',
    ],
    authorityEn: 'Income & Sales Tax Department + Jordan Customs',
    authorityAr: 'دائرة ضريبة الدخل والمبيعات + دائرة الجمارك',
    relevanceEn: 'Affects landed cost and client invoicing',
    relevanceAr: 'يؤثر على التكلفة النهائية وفوترة العميل',
  },
  {
    id: 'service-fees',
    category: 'customs',
    titleEn: 'Customs service fees (incl. Art. 161-type charges)',
    titleAr: 'أجور الخدمة الجمركية (بما فيها أجور من نوع المادة 161)',
    summaryEn:
      'In addition to duty and GST, specific service fees may apply to declarations and related operations under customs instructions. Treat these as pass-through client costs unless your engagement letter says otherwise.',
    summaryAr:
      'إضافة إلى الرسم وضريبة المبيعات قد تُفرض أجور خدمة محددة على البيانات والعمليات ذات الصلة بموجب تعليمات الجمارك. عالجها كتكاليف ممرَّرة على العميل ما لم ينص عقدك على غير ذلك.',
    keyPointsEn: [
      'Fees appear on the assessment / payment advice',
      'Do not book them as agency revenue if they are client disbursements',
      'Confirm current fee table with Customs',
    ],
    keyPointsAr: [
      'تظهر الأجور على إشعار التقدير / الدفع',
      'لا تقيّدها كإيراد وكالة إن كانت مدفوعات عميل',
      'أكد جدول الأجور الحالي مع الجمارك',
    ],
    authorityEn: 'Jordan Customs Department',
    authorityAr: 'دائرة الجمارك الأردنية',
    relevanceEn: 'Part of every clearance cost estimate',
    relevanceAr: 'جزء من كل تقدير تكلفة تخليص',
  },
  {
    id: 'import-export-trade',
    category: 'import',
    titleEn: 'Import & export licensing / trade controls',
    titleAr: 'تراخيص الاستيراد والتصدير وضوابط التجارة',
    summaryEn:
      'Certain goods require prior import licence or are restricted/prohibited under Ministry of Industry, Trade and Supply decisions and related regulations. Exporters may need certificates of origin and compliance with destination rules.',
    summaryAr:
      'تتطلب سلع معينة رخصة استيراد مسبقة أو تكون مقيدة/محظورة بموجب قرارات وزارة الصناعة والتجارة والتموين والأنظمة ذات الصلة. قد يحتاج المصدرون شهادات منشأ والامتثال لقواعد بلد المقصد.',
    keyPointsEn: [
      'Check restricted lists before contracting the supplier',
      'Some goods need Ministry approval in addition to Customs',
      'Export of dual-use or strategic goods may need extra clearance',
    ],
    keyPointsAr: [
      'تحقق من قوائم القيود قبل التعاقد مع المورد',
      'بعض السلع تحتاج موافقة الوزارة إضافة إلى الجمارك',
      'تصدير السلع ازدواجية الاستخدام أو الاستراتيجية قد يحتاج إفراجاً إضافياً',
    ],
    authorityEn: 'Ministry of Industry, Trade and Supply',
    authorityAr: 'وزارة الصناعة والتجارة والتموين',
    relevanceEn: 'Pre-contract and pre-shipment compliance',
    relevanceAr: 'امتثال ما قبل العقد وما قبل الشحن',
  },
  {
    id: 'food-drug',
    category: 'import',
    titleEn: 'Food, drug, cosmetic & medical device controls',
    titleAr: 'ضوابط الغذاء والدواء ومستحضرات التجميل والأجهزة الطبية',
    summaryEn:
      'JFDA regulates registration, labelling, and import clearance for food, medicines, cosmetics, and medical devices. Shipments may be held until lab results or registration evidence is accepted.',
    summaryAr:
      'تنظم المؤسسة العامة للغذاء والدواء التسجيل والبطاقات والتخليص الاستيرادي للأغذية والأدوية ومستحضرات التجميل والأجهزة الطبية. قد تُحجز الشحنات حتى قبول نتائج المختبر أو إثبات التسجيل.',
    keyPointsEn: [
      'Register products before regular commercial import where required',
      'Labels must meet Arabic / content rules',
      'Samples may be drawn at the border',
    ],
    keyPointsAr: [
      'سجّل المنتجات قبل الاستيراد التجاري المنتظم حيث يُطلب',
      'يجب أن تستوفي البطاقات قواعد العربية / المحتوى',
      'قد تُسحب عينات عند الحدود',
    ],
    authorityEn: 'Jordan Food and Drug Administration (JFDA)',
    authorityAr: 'المؤسسة العامة للغذاء والدواء',
    relevanceEn: 'Critical for food, pharma, cosmetics, medical goods',
    relevanceAr: 'حاسم للأغذية والأدوية ومستحضرات التجميل والسلع الطبية',
  },
  {
    id: 'standards',
    category: 'import',
    titleEn: 'Standards & conformity (JSMO)',
    titleAr: 'المواصفات والمطابقة (مؤسسة المواصفات)',
    summaryEn:
      'JSMO enforces Jordanian standards and conformity assessment for many consumer and industrial products. A certificate of conformity or equivalent may be required before release.',
    summaryAr:
      'تفرض مؤسسة المواصفات والمقاييس المواصفات الأردنية وتقييم المطابقة لكثير من المنتجات الاستهلاكية والصناعية. قد تُطلب شهادة مطابقة أو ما يعادلها قبل الإفراج.',
    keyPointsEn: [
      'Identify regulated HS lines early',
      'Obtain CoC from accredited bodies when mandated',
      'Non-conforming goods may be rejected or re-exported',
    ],
    keyPointsAr: [
      'حدد بنود HS الخاضعة مبكراً',
      'احصل على شهادة مطابقة من جهات معتمدة عند الإلزام',
      'قد تُرفض البضائع غير المطابقة أو يُعاد تصديرها',
    ],
    authorityEn: 'Jordan Standards and Metrology Organization (JSMO)',
    authorityAr: 'مؤسسة المواصفات والمقاييس',
    relevanceEn: 'Applies to large share of consumer/industrial imports',
    relevanceAr: 'ينطبق على نسبة كبيرة من المستوردات الاستهلاكية والصناعية',
  },
  {
    id: 'agriculture',
    category: 'import',
    titleEn: 'Agriculture, plants & animal products',
    titleAr: 'الزراعة والنباتات والمنتجات الحيوانية',
    summaryEn:
      'Ministry of Agriculture and quarantine rules cover live animals, plants, seeds, fertilizers, pesticides, and many food-origin products. Import permits and health/phytosanitary certificates are often mandatory.',
    summaryAr:
      'تغطي قواعد وزارة الزراعة والحجر الحيوانات الحية والنباتات والبذور والأسمدة والمبيدات وكثيراً من المنتجات ذات الأصل الغذائي. تصاريح الاستيراد والشهادات الصحية/النباتية غالباً إلزامية.',
    keyPointsEn: [
      'Permit before shipment for many categories',
      'Phytosanitary / veterinary certificates from origin',
      'Inspection at arrival is common',
    ],
    keyPointsAr: [
      'تصريح قبل الشحن لفئات كثيرة',
      'شهادات صحية نباتية / بيطرية من المنشأ',
      'المعاينة عند الوصول شائعة',
    ],
    authorityEn: 'Ministry of Agriculture',
    authorityAr: 'وزارة الزراعة',
    relevanceEn: 'Agri-food and plant/animal inputs',
    relevanceAr: 'المدخلات الزراعية والغذائية والنباتية والحيوانية',
  },
  {
    id: 'aqaba-aseza',
    category: 'special',
    titleEn: 'Aqaba Special Economic Zone (ASEZA) regime',
    titleAr: 'نظام منطقة العقبة الاقتصادية الخاصة',
    summaryEn:
      'Goods entering or exiting the Aqaba Special Economic Zone may follow special customs and tax procedures under ASEZA law. Not all Aqaba port cargo is ASEZA cargo — clarify the regime of the consignee and destination.',
    summaryAr:
      'البضائع الداخلة أو الخارجة من منطقة العقبة الاقتصادية الخاصة قد تتبع إجراءات جمركية وضريبية خاصة بموجب قانون المنطقة. ليست كل بضائع ميناء العقبة بضائع المنطقة — وضّح نظام المرسل إليه والوجهة.',
    keyPointsEn: [
      'Confirm whether the importer is ASEZA-registered',
      'Different duty/tax treatment may apply',
      'Coordinate with ASEZA and Customs as required',
    ],
    keyPointsAr: [
      'أكد ما إذا كان المستورد مسجلاً في المنطقة',
      'قد تنطبق معالجة رسم/ضريبة مختلفة',
      'نسّق مع سلطة المنطقة والجمارك حسب الحاجة',
    ],
    authorityEn: 'ASEZA + Jordan Customs',
    authorityAr: 'سلطة منطقة العقبة + دائرة الجمارك',
    relevanceEn: 'Shipments destined to or from Aqaba SEZ entities',
    relevanceAr: 'الشحنات من أو إلى كيانات منطقة العقبة الخاصة',
  },
  {
    id: 'export-origin',
    category: 'export',
    titleEn: 'Export documentation & preferential origin',
    titleAr: 'وثائق التصدير والمنشأ التفضيلي',
    summaryEn:
      'Exports require accurate commercial documents and, where preference is claimed abroad, certificates of origin under the applicable trade agreement (e.g. regional or bilateral schemes). Rules of origin must be met.',
    summaryAr:
      'يتطلب التصدير وثائق تجارية دقيقة، وعند المطالبة بتفضيل في الخارج شهادات منشأ بموجب اتفاقية التجارة المعمول بها (مثل الأنظمة الإقليمية أو الثنائية). يجب استيفاء قواعد المنشأ.',
    keyPointsEn: [
      'Know the destination country’s preference scheme',
      'Maintain manufacturing cost sheets for origin claims',
      'Export declaration still goes through Customs/ASYCUDA',
    ],
    keyPointsAr: [
      'اعرف نظام التفضيل في بلد المقصد',
      'احتفظ بجداول تكلفة التصنيع لمطالبات المنشأ',
      'بيان التصدير يمر عبر الجمارك/الأسيكودا',
    ],
    authorityEn: 'Jordan Customs + Chamber of Commerce / designated bodies',
    authorityAr: 'دائرة الجمارك + غرفة التجارة / الجهات المعينة',
    relevanceEn: 'All export clearances and preference claims',
    relevanceAr: 'جميع تخليصات التصدير ومطالبات التفضيل',
  },
  {
    id: 'transport-containers',
    category: 'transport',
    titleEn: 'Port, terminal & container detention rules',
    titleAr: 'قواعد الميناء والمحطة واحتجاز الحاويات',
    summaryEn:
      'ACT (Aqaba Container Terminal) and shipping lines apply free time, demurrage, and detention schedules. These are commercial tariffs, not customs law, but they drive the operational deadline for clearance.',
    summaryAr:
      'تطبق ACT (محطة حاويات العقبة) والخطوط الملاحية جداول المدة المجانية وغرامات التأخير والاحتجاز. هذه تعرفات تجارية وليست قانون جمارك، لكنها تحدد الموعد التشغيلي للتخليص.',
    keyPointsEn: [
      'Free days start from discharge or availability per ACT rules',
      'Demurrage is terminal storage; detention is line equipment',
      'Always verify live tariff on ACT and carrier portals',
    ],
    keyPointsAr: [
      'تبدأ الأيام المجانية من التفريغ أو التوفر حسب قواعد ACT',
      'غرامات التأخير للمحطة؛ الاحتجاز لمعدات الخط',
      'تحقق دائماً من التعرفة الحية على بوابات ACT والناقل',
    ],
    authorityEn: 'ACT / APM Terminals Aqaba + shipping lines',
    authorityAr: 'ACT / محطة APM العقبة + الخطوط الملاحية',
    relevanceEn: 'Cost control for every containerized shipment',
    relevanceAr: 'ضبط التكلفة لكل شحنة حاويات',
  },
];

export const LAW_CATEGORIES = [
  { id: 'all', labelEn: 'All', labelAr: 'الكل' },
  { id: 'customs', labelEn: 'Customs', labelAr: 'جمارك' },
  { id: 'tax', labelEn: 'Tax', labelAr: 'ضريبة' },
  { id: 'import', labelEn: 'Import controls', labelAr: 'ضوابط الاستيراد' },
  { id: 'export', labelEn: 'Export', labelAr: 'تصدير' },
  { id: 'special', labelEn: 'Special zones', labelAr: 'مناطق خاصة' },
  { id: 'transport', labelEn: 'Port & transport', labelAr: 'ميناء ونقل' },
] as const;
