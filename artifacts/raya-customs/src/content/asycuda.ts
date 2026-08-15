import type { AsycudaStep } from '@/lib/types';

/**
 * Practical manual for connecting to and using Jordan Customs ASYCUDA World.
 * Official access is controlled by Customs — this is operational guidance only.
 */
export const ASYCUDA_OVERVIEW = {
  titleEn: 'ASYCUDA World — Jordan Customs',
  titleAr: 'الأسيكودا العالمي — دائرة الجمارك الأردنية',
  whatEn:
    'ASYCUDA (Automated System for Customs Data) is the electronic declaration system used by Jordan Customs for import, export, and transit. Licensed brokers lodge declarations, attach documents, receive selectivity results, and process payment and release through the system.',
  whatAr:
    'الأسيكودا (النظام الآلي للبيانات الجمركية) هو نظام البيان الإلكتروني الذي تستخدمه دائرة الجمارك الأردنية للاستيراد والتصدير والترانزيت. يقدّم المخلصون المرخصون البيانات ويرفقون الوثائق ويستلمون نتائج الانتقائية ويعالجون الدفع والإفراج عبر النظام.',
  accessEn:
    'Access is granted by Jordan Customs to licensed customs broker offices. Each office has credentials and user roles. Importers do not typically lodge declarations themselves unless specially authorized.',
  accessAr:
    'تمنح دائرة الجمارك الوصول لمكاتب المخلصين المرخصين. لكل مكتب بيانات دخول وأدوار مستخدمين. المستوردون عادة لا يقدّمون البيانات بأنفسهم ما لم يُصرَّح لهم بشكل خاص.',
  disclaimerEn:
    'Field names and screens change with Customs upgrades. Always follow the current official user manual and circulars. This guide does not replace Customs training.',
  disclaimerAr:
    'أسماء الحقول والشاشات تتغير مع ترقيات الجمارك. اتبع دائماً دليل المستخدم الرسمي والتعاميم الحالية. هذا الدليل لا يغني عن تدريب الجمارك.',
};

export const ASYCUDA_STEPS: AsycudaStep[] = [
  {
    number: '01',
    titleEn: 'Obtain office access',
    titleAr: 'الحصول على وصول المكتب',
    detailEn:
      'The brokerage must be licensed and registered with Jordan Customs. Request ASYCUDA user accounts for authorized staff. Keep passwords secure and revoke access when staff leave.',
    detailAr:
      'يجب أن يكون مكتب التخليص مرخصاً ومسجلاً لدى دائرة الجمارك. اطلب حسابات مستخدمي الأسيكودا للموظفين المخولين. احم كلمات المرور وألغِ الوصول عند مغادرة الموظفين.',
    notesEn: 'Customs IT / registration unit handles provisioning.',
    notesAr: 'وحدة تكنولوجيا المعلومات / التسجيل في الجمارك تتولى التفعيل.',
  },
  {
    number: '02',
    titleEn: 'Log in & select office context',
    titleAr: 'تسجيل الدخول واختيار سياق المكتب',
    detailEn:
      'Open the official ASYCUDA World URL provided by Customs (VPN or allowed network may be required). Authenticate with office credentials. Confirm you are working under the correct broker office code.',
    detailAr:
      'افتح رابط الأسيكودا الرسمي الذي توفره الجمارك (قد يُطلب VPN أو شبكة مسموحة). سجّل الدخول ببيانات المكتب. تأكد أنك تعمل تحت رمز مكتب المخلص الصحيح.',
  },
  {
    number: '03',
    titleEn: 'Create import declaration',
    titleAr: 'إنشاء بيان استيراد',
    detailEn:
      'Start a new import declaration. Enter: importer code, broker code, regime (e.g. home use), office of clearance, transport document (B/L number), vessel/flight, container numbers and seals, packages, and gross weight. Accuracy here prevents terminal and selectivity mismatches.',
    detailAr:
      'ابدأ بيان استيراد جديد. أدخل: رمز المستورد، رمز المخلص، النظام (مثل الاستهلاك المحلي)، مكتب التخليص، وثيقة النقل (رقم البوليصة)، الباخرة/الرحلة، أرقام الحاويات والأختام، الطرود، والوزن الإجمالي. الدقة هنا تمنع عدم التطابق مع المحطة والانتقائية.',
  },
  {
    number: '04',
    titleEn: 'Enter invoice lines & HS codes',
    titleAr: 'إدخال بنود الفاتورة ورموز HS',
    detailEn:
      'For each commercial line: HS code (11 digits as required), description, origin country, quantity and unit, invoice value and currency, statistical value rules as applicable. Attach or reference supporting documents. Preferential origin claims need the correct certificate type linked.',
    detailAr:
      'لكل بند تجاري: رمز HS (11 رقماً حسب المطلوب)، الوصف، بلد المنشأ، الكمية والوحدة، قيمة الفاتورة والعملة، قواعد القيمة الإحصائية حسب الحالة. أرفق أو أشر إلى الوثائق الداعمة. مطالبات المنشأ التفضيلي تحتاج ربط نوع الشهادة الصحيح.',
  },
  {
    number: '05',
    titleEn: 'Attach documents',
    titleAr: 'إرفاق الوثائق',
    detailEn:
      'Upload scanned invoice, packing list, B/L, authorization, permits, certificates of origin, CoC, etc. File size and format limits apply. Name files clearly so examination officers can find them quickly.',
    detailAr:
      'ارفع الفاتورة الممسوحة وقائمة التعبئة والبوليصة والتفويض والتصاريح وشهادات المنشأ وشهادات المطابقة وغيرها. تنطبق حدود الحجم والصيغة. سمِّ الملفات بوضوح ليجدها موظفو الفحص بسرعة.',
  },
  {
    number: '06',
    titleEn: 'Validate & register',
    titleAr: 'التحقق والتسجيل',
    detailEn:
      'Run system validation. Fix errors (missing mandatory fields, inconsistent totals, invalid codes). Register/submit the declaration. Note the declaration number. After registration, free edit is usually locked — amendments follow official amendment procedures.',
    detailAr:
      'شغّل تحقق النظام. أصلح الأخطاء (حقول إلزامية ناقصة، إجماليات غير متسقة، رموز غير صالحة). سجّل/أرسل البيان. سجّل رقم البيان. بعد التسجيل عادة يُقفل التعديل الحر — التعديلات تتم بإجراءات رسمية.',
  },
  {
    number: '07',
    titleEn: 'Selectivity result (lane)',
    titleAr: 'نتيجة الانتقائية (المسرب)',
    detailEn:
      'The risk engine assigns Green / Yellow / Red / Blue (where used). Green: facilitated path. Yellow: documentary check. Red: physical examination. Blue: release with post-clearance audit. Partner agencies may add their own control colour on top of Customs.',
    detailAr:
      'محرك المخاطر يعيّن أخضر / أصفر / أحمر / أزرق (حيث يُستخدم). أخضر: مسار ميسّر. أصفر: فحص وثائقي. أحمر: معاينة فعلية. أزرق: إفراج مع تدقيق لاحق. قد تضيف الجهات الشريكة لوناً رقابياً إضافياً فوق الجمارك.',
    notesEn: 'See Selectivity lanes and Inspection act sections below.',
    notesAr: 'انظر أقسام مسارب الانتقائية ومحضر المعاينة أدناه.',
  },
  {
    number: '08',
    titleEn: 'Inspection act (if red / ordered exam)',
    titleAr: 'محضر المعاينة (إن وُجد أحمر / أمر معاينة)',
    detailEn:
      'For physical examination, Customs records findings in an Inspection Act (verification account) linked to the declaration: what was seen, samples taken, discrepancies, and the decision (conform / non-conform / partial). Broker coordinates presence, exam area access, and any rework (HS, value, quantity).',
    detailAr:
      'للمعاينة الفعلية تسجّل الجمارك النتائج في محضر معاينة (حساب تحقق) مرتبط بالبيان: ما شوهد، العينات، الفروقات، والقرار (مطابق / غير مطابق / جزئي). المخلص ينسّق الحضور ودخول منطقة المعاينة وأي تصحيح (HS أو قيمة أو كمية).',
  },
  {
    number: '09',
    titleEn: 'Assessment, payment & release',
    titleAr: 'التقدير والدفع والإفراج',
    detailEn:
      'After controls clear, assessment calculates duties, GST, and fees. Pay through approved channels. Request/print release and present it with the delivery order at the terminal. Blue-lane files may release earlier but remain subject to post-clearance audit — keep the file complete.',
    detailAr:
      'بعد انتهاء الرقابة يحسب التقدير الرسوم وضريبة المبيعات والأجور. ادفع عبر القنوات المعتمدة. اطلب/اطبع الإفراج وقدّمه مع أمر التسليم في المحطة. بيانات المسرب الأزرق قد تُفرج أبكر لكنها تبقى خاضعة لتدقيق لاحق — أبقِ الملف مكتملاً.',
  },
];

/** Selectivity lanes — educational reference for brokers */
export const SELECTIVITY_LANES = [
  {
    id: 'green',
    colourEn: 'Green',
    colourAr: 'أخضر',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    meaningEn: 'Facilitated / low intervention',
    meaningAr: 'ميسّر / تدخل منخفض',
    actionEn:
      'Proceed toward assessment and release. No systematic physical exam. Random or intelligence hits can still override a “usual” green pattern.',
    actionAr:
      'تابع نحو التقدير والإفراج. لا معاينة فعلية منهجية. الضربات العشوائية أو الاستخبارية قد تتجاوز النمط الأخضر المعتاد.',
    brokerEn: 'Confirm payment path and terminal free time; do not assume zero documentary queries.',
    brokerAr: 'أكد مسار الدفع ومدة ACT المجانية؛ لا تفترض غياب أي استعلام وثائقي.',
  },
  {
    id: 'yellow',
    colourEn: 'Yellow',
    colourAr: 'أصفر',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    meaningEn: 'Documentary examination',
    meaningAr: 'فحص وثائقي',
    actionEn:
      'Officer reviews invoice, packing list, B/L, CoO, permits, HS and value consistency on the attached files before release progresses.',
    actionAr:
      'الموظف يراجع الفاتورة وقائمة التعبئة والبوليصة وشهادة المنشأ والتصاريح واتساق HS والقيمة على المرفقات قبل تقدم الإفراج.',
    brokerEn: 'Answer queries fast with clear scans; fix mismatches before free days expire.',
    brokerAr: 'أجب سريعاً بمسوحات واضحة؛ أصلح عدم التطابق قبل نفاد الأيام المجانية.',
  },
  {
    id: 'red',
    colourEn: 'Red',
    colourAr: 'أحمر',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    meaningEn: 'Physical examination',
    meaningAr: 'معاينة فعلية',
    actionEn:
      'Goods examined in the designated area against the declaration and attachments. Samples, photos, or lab referral possible. Inspection Act records the outcome.',
    actionAr:
      'تُعاين البضاعة في الموقع المخصص مقابل البيان والمرفقات. قد تُؤخذ عينات أو صور أو إحالة للمختبر. محضر المعاينة يسجّل النتيجة.',
    brokerEn: 'Book exam slot, attend with client/rep, align trucking, watch ACT demurrage.',
    brokerAr: 'احجز موعد المعاينة، احضر مع العميل/الممثل، نسّق النقل، راقب غرامات ACT.',
  },
  {
    id: 'blue',
    colourEn: 'Blue',
    colourAr: 'أزرق',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    meaningEn: 'Post-clearance audit (PCA)',
    meaningAr: 'تدقيق لاحق بعد الإفراج',
    actionEn:
      'Goods may be released; Customs retains the right to audit documents, value, origin, and classification after the fact. Non-compliance can trigger duty recovery and penalties.',
    actionAr:
      'قد تُفرج البضاعة مع احتفاظ الجمارك بحق تدقيق الوثائق والقيمة والمنشأ والتصنيف لاحقاً. عدم الامتثال قد يؤدي لاسترداد رسوم وغرامات.',
    brokerEn: 'Release is not the end of the file — archive must stay audit-ready for the statutory period.',
    brokerAr: 'الإفراج ليس نهاية الملف — يجب أن يبقى الأرشيف جاهزاً للتدقيق للمدة القانونية.',
  },
] as const;

/** Inspection Act — what examiners record and what brokers must do */
export const INSPECTION_ACT = {
  titleEn: 'Inspection Act (examination record)',
  titleAr: 'محضر المعاينة (سجل الفحص)',
  whatEn:
    'When a declaration is selected for physical control (typically red lane, or an ordered exam), the examining officer records findings in ASYCUDA as an Inspection Act / verification account linked to that declaration. It is the official narrative of what was checked and decided.',
  whatAr:
    'عند اختيار البيان للرقابة الفعلية (عادة المسرب الأحمر أو معاينة مأمور بها) يسجّل موظف المعاينة النتائج في الأسيكودا كمحضر معاينة / حساب تحقق مرتبط بذلك البيان. هذا هو السرد الرسمي لما فُحص وقُرر.',
  recordsEn: [
    'Declaration number and exam date/location',
    'Containers or packages opened; seals observed',
    'Comparison of goods to invoice description, quantity, marks',
    'HS / origin / value issues noted by the examiner',
    'Samples drawn (lab, JFDA, JSMO, other) and chain of custody notes',
    'Photos or references if the national procedure allows',
    'Result: conform, discrepancy, partial release conditions',
    'Instructions for amendment, re-assessment, or hold',
  ],
  recordsAr: [
    'رقم البيان وتاريخ/موقع المعاينة',
    'الحاويات أو الطرود المفتوحة؛ الأختام المشاهَدة',
    'مقارنة البضاعة بوصف الفاتورة والكمية والعلامات',
    'ملاحظات التصنيف / المنشأ / القيمة من المعاين',
    'العينات المسحوبة (مختبر، غذاء ودواء، مواصفات، غيرها) وملاحظات سلسلة الحفظ',
    'صور أو مراجع إن سمحت الإجراءات الوطنية',
    'النتيجة: مطابق، فرق، شروط إفراج جزئي',
    'تعليمات التعديل أو إعادة التقدير أو الحجز',
  ],
  brokerEn: [
    'Ensure client or authorized representative can attend when required',
    'Bring spare copies of invoice, packing list, and permits to the exam point',
    'If discrepancy: agree facts carefully before the act is closed — later challenges are harder',
    'Trigger formal amendment in ASYCUDA only through approved channels after examiner direction',
    'Update the shipment case: exam date, outcome, sample IDs, extra costs (handling, lab)',
    'Recalculate ACT free-time impact — exams burn calendar days',
  ],
  brokerAr: [
    'تأكد من حضور العميل أو الممثل المفوض عند الطلب',
    'أحضر نسخاً إضافية من الفاتورة وقائمة التعبئة والتصاريح إلى نقطة المعاينة',
    'عند وجود فرق: اتفق على الوقائع بعناية قبل إغلاق المحضر — الاعتراض لاحقاً أصعب',
    'ابدأ التعديل الرسمي في الأسيكودا فقط عبر القنوات المعتمدة بعد توجيه المعاين',
    'حدّث ملف الشحنة: تاريخ المعاينة، النتيجة، أرقام العينات، التكاليف الإضافية',
    'أعد حساب أثر مدة ACT المجانية — المعاينة تستهلك أياماً تقويمية',
  ],
  outcomes: [
    {
      code: 'conform',
      labelEn: 'Conform',
      labelAr: 'مطابق',
      detailEn: 'Proceed to assessment / payment / release as applicable.',
      detailAr: 'تابع التقدير / الدفع / الإفراج حسب الحالة.',
    },
    {
      code: 'discrepancy',
      labelEn: 'Discrepancy',
      labelAr: 'فروقات',
      detailEn: 'Amend declaration (HS, qty, value, description); may trigger re-assessment and possible penalties.',
      detailAr: 'عدّل البيان (HS، كمية، قيمة، وصف)؛ قد يُعاد التقدير مع غرامات محتملة.',
    },
    {
      code: 'sample',
      labelEn: 'Sample pending',
      labelAr: 'عينة معلّقة',
      detailEn: 'Release may wait on lab/agency result; track sample ID and authority.',
      detailAr: 'قد ينتظر الإفراج نتيجة المختبر/الجهة؛ تتبّع رقم العينة والجهة.',
    },
    {
      code: 'hold',
      labelEn: 'Hold / seize path',
      labelAr: 'حجز / مسار ضبط',
      detailEn: 'Escalate legally; do not gate-out without written clearance.',
      detailAr: 'صعّد قانونياً؛ لا تخرج من البوابة دون إفراج كتابي.',
    },
  ],
};

/** Blue lane — post-clearance audit & file discipline */
export const POST_CLEARANCE_AUDIT = {
  titleEn: 'Post-clearance audit (blue lane) & file discipline',
  titleAr: 'التدقيق اللاحق (المسرب الأزرق) وانضباط الملف',
  whatEn:
    'Blue-lane or post-clearance audit (PCA) means Customs may release goods while retaining the right to verify classification, origin, value, and permits after the fact. It facilitates trade for lower-risk flows without abandoning control. Jordan policy has increasingly emphasized post-clearance verification alongside selectivity at the border.',
  whatAr:
    'المسرب الأزرق أو التدقيق اللاحق يعني أن الجمارك قد تفرج عن البضاعة مع الاحتفاظ بحق التحقق من التصنيف والمنشأ والقيمة والتصاريح لاحقاً. ييسّر التجارة للتدفقات الأقل خطراً دون التخلي عن الرقابة. سياسة الأردن تؤكد بشكل متزايد على التحقق اللاحق إلى جانب الانتقائية على الحدود.',
  whyEn:
    'Border exam capacity is limited. Auditing after release lets inspectors focus red/yellow effort on high-risk cargo while compliant importers move faster — provided their records survive audit.',
  whyAr:
    'طاقة المعاينة على الحدود محدودة. التدقيق بعد الإفراج يوجّه جهد الأحمر/الأصفر للبضائع عالية الخطر بينما يتحرك المستورد الممتثل أسرع — بشرط أن تصمد سجلاته أمام التدقيق.',
  triggersEn: [
    'Blue selectivity at registration',
    'Random or intelligence-driven post-release pick',
    'Refund / drawback / preference claims under review',
    'Trader compliance programme or AEO-style monitoring',
    'Discrepancy found on a related declaration for the same importer',
  ],
  triggersAr: [
    'انتقائية زرقاء عند التسجيل',
    'اختيار لاحق عشوائي أو استخباري بعد الإفراج',
    'مراجعة مطالبات رد/استرداد أو تفضيل',
    'برنامج امتثال التاجر أو رقابة بأسلوب المشغّل الاقتصادي المعتمد',
    'فرق مكتشَف على بيان مرتبط لنفس المستورد',
  ],
  keepEn: [
    'Commercial invoice and packing list (as declared)',
    'Bill of lading / airway bill and delivery order references',
    'Certificate of origin and preference proofs',
    'Authority permits and lab results (JFDA, JSMO, agri, etc.)',
    'ASYCUDA declaration print / PDF and assessment notice',
    'Payment receipts for duties, GST, and fees (linked to declaration number)',
    'Broker authorization and any amendment approvals',
    'Inspection Act copy if an exam occurred',
    'Correspondence answering Customs queries',
  ],
  keepAr: [
    'الفاتورة التجارية وقائمة التعبئة (كما صُرّح)',
    'بوليصة الشحن / الجوي ومراجع أمر التسليم',
    'شهادة المنشأ وإثباتات التفضيل',
    'تصاريح الجهات ونتائج المختبر (غذاء ودواء، مواصفات، زراعة، إلخ)',
    'طباعة/PDF بيان الأسيكودا وإشعار التقدير',
    'إيصالات دفع الرسوم وضريبة المبيعات والأجور (مربوطة برقم البيان)',
    'تفويض المخلص وأي موافقات تعديل',
    'نسخة محضر المعاينة إن حدثت معاينة',
    'المراسلات التي تجيب على استعلامات الجمارك',
  ],
  disciplineEn: [
    'One case folder per declaration number (digital + backup)',
    'Name files with declaration number + document type',
    'Never discard working papers after green/blue release',
    'If audit notice arrives: freeze deletions, appoint a single response owner',
    'Reconcile clearing accounts 122100/222100 to each declaration’s paid amounts',
    'Brief the client that release ≠ closed compliance exposure',
  ],
  disciplineAr: [
    'مجلد واحد لكل رقم بيان (رقمي + نسخة احتياطية)',
    'سمِّ الملفات برقم البيان + نوع الوثيقة',
    'لا تتلف أوراق العمل بعد إفراج أخضر/أزرق',
    'عند وصول إشعار تدقيق: أوقف الحذف وعيّن مسؤولاً واحداً للرد',
    'طابق حسابات التسوية 122100/222100 مع المبالغ المدفوعة لكل بيان',
    'أبلغ العميل أن الإفراج ≠ إغلاق التعرض الامتثالي',
  ],
  risksEn: [
    'Duty underpayment recovery with possible fines',
    'Loss of preference if origin proof fails audit',
    'Repeated findings worsen importer/broker risk profile → more red/yellow later',
    'Incomplete archive slows response and looks non-cooperative',
  ],
  risksAr: [
    'استرداد نقص الرسوم مع غرامات محتملة',
    'فقدان التفضيل إن فشل إثبات المنشأ في التدقيق',
    'النتائج المتكررة تُسوء ملف المستورد/المخلص → مزيد من أحمر/أصفر لاحقاً',
    'أرشيف ناقص يبطئ الرد ويبدو غير متعاون',
  ],
};

export const ASYCUDA_CHECKLIST_EN = [
  'Broker office licensed and ASYCUDA users active',
  'Importer code and authorization letter ready',
  'B/L, invoice, packing list consistent',
  'HS codes reviewed for every line',
  'Authority permits attached when required',
  'Container/seal matches arrival data',
  'Declaration number saved in case file',
  'Payment reference linked to declaration',
  'Selectivity lane noted (G/Y/R/B) in case notes',
  'Inspection Act outcome filed if exam occurred',
  'Archive kept audit-ready after release (blue/PCA)',
];

export const ASYCUDA_CHECKLIST_AR = [
  'مكتب المخلص مرخص ومستخدمو الأسيكودا نشطون',
  'رمز المستورد وكتاب التفويض جاهزان',
  'البوليصة والفاتورة وقائمة التعبئة متسقة',
  'رموز HS مراجعة لكل بند',
  'تصاريح الجهات مرفقة عند الحاجة',
  'الحاوية/الختم يطابق بيانات الوصول',
  'رقم البيان محفوظ في ملف الشحنة',
  'مرجع الدفع مربوط بالبيان',
  'مسرب الانتقائية (أ/ص/ح/ز) مسجّل في ملاحظات الملف',
  'نتيجة محضر المعاينة مؤرشفة إن حدثت معاينة',
  'الأرشيف جاهز للتدقيق بعد الإفراج (أزرق/لاحق)',
];
