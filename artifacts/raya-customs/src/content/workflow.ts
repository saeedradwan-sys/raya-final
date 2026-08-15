import type { WorkflowPhase } from '@/lib/types';

/**
 * Deep step-by-step Jordan import clearance workflow.
 * Guidance only — confirm current official requirements.
 */
export const WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    id: 'pre-arrival',
    number: '01',
    titleEn: 'Pre-arrival preparation',
    titleAr: 'التحضير قبل الوصول',
    summaryEn:
      'Everything that must be ready before the vessel or aircraft arrives: documents, HS classification, authority checks, and broker authorization.',
    summaryAr:
      'كل ما يجب أن يكون جاهزاً قبل وصول الباخرة أو الطائرة: الوثائق، تصنيف HS، فحص متطلبات الجهات، وتفويض المخلص.',
    steps: [
      {
        id: 'collect-docs',
        phaseId: 'pre-arrival',
        number: '1.1',
        titleEn: 'Collect commercial documents',
        titleAr: 'جمع الوثائق التجارية',
        actorEn: 'Importer / Supplier / Broker',
        actorAr: 'المستورد / المورد / المخلص',
        detailEn:
          'Obtain the commercial invoice, packing list, bill of lading (or airway bill), and certificate of origin if preferential duty is claimed. Verify that values, quantities, and consignee details match across all documents. Discrepancies cause delays at selectivity and inspection.',
        detailAr:
          'الحصول على الفاتورة التجارية وقائمة التعبئة وبوليصة الشحن (أو بوليصة الشحن الجوي) وشهادة المنشأ إن وُجدت للمطالبة برسم تفضيلي. التحقق من تطابق القيم والكميات وبيانات المرسل إليه عبر جميع الوثائق. التناقضات تسبب تأخيراً في الانتقائية والمعاينة.',
        documentsEn: [
          'Commercial invoice',
          'Packing list',
          'Bill of lading / Airway bill',
          'Certificate of origin (if claimed)',
          'Insurance certificate (if required)',
        ],
        documentsAr: [
          'الفاتورة التجارية',
          'قائمة التعبئة',
          'بوليصة الشحن / بوليصة الشحن الجوي',
          'شهادة المنشأ (إن وُجدت)',
          'شهادة التأمين (إن لزم)',
        ],
        risksEn: [
          'Invoice value does not match packing list totals',
          'Consignee name differs from importer registration',
          'Missing or unsigned commercial invoice',
        ],
        risksAr: [
          'قيمة الفاتورة لا تطابق إجماليات قائمة التعبئة',
          'اسم المرسل إليه يختلف عن تسجيل المستورد',
          'فاتورة تجارية ناقصة أو غير موقعة',
        ],
        tipsEn: [
          'Request documents in PDF as soon as the shipment is booked',
          'Keep a checklist per shipment type (food, industrial, apparel)',
        ],
        tipsAr: [
          'اطلب الوثائق بصيغة PDF فور حجز الشحنة',
          'احتفظ بقائمة تحقق حسب نوع الشحنة (غذاء، صناعي، ألبسة)',
        ],
        systemsEn: 'Email / supplier portal / freight forwarder system',
        systemsAr: 'البريد / بوابة المورد / نظام وكيل الشحن',
      },
      {
        id: 'hs-classify',
        phaseId: 'pre-arrival',
        number: '1.2',
        titleEn: 'Classify every invoice line (HS)',
        titleAr: 'تصنيف كل بند في الفاتورة (HS)',
        actorEn: 'Customs broker / Classifier',
        actorAr: 'المخلص الجمركي / المصنّف',
        detailEn:
          'Assign the correct Jordan 11-digit HS code to each product line. Classification drives duty rate, sales tax treatment, and which authorities may require approval. Ambiguous descriptions (e.g. “spare parts”, “chemicals”) need technical review or previous rulings. Use the HS search tool, previous declarations, and official tariff notes.',
        detailAr:
          'تعيين رمز النظام المنسق الأردني المكون من 11 رقماً لكل بند منتج. التصنيف يحدد نسبة الرسم ومعالجة ضريبة المبيعات والجهات التي قد تطلب موافقة. الأوصاف الغامضة (مثل «قطع غيار» أو «كيماويات») تحتاج مراجعة فنية أو قرارات سابقة. استخدم أداة بحث HS والبيانات السابقة وملاحظات التعرفة الرسمية.',
        documentsEn: [
          'Product technical datasheet',
          'Previous similar declarations',
          'Supplier product codes / catalogue',
        ],
        documentsAr: [
          'النشرة الفنية للمنتج',
          'بيانات مشابهة سابقة',
          'رموز منتجات المورد / الكتالوج',
        ],
        risksEn: [
          'Wrong chapter → wrong duty and possible fine',
          'Split shipment classified inconsistently',
          'Preferential origin claimed under wrong HS',
        ],
        risksAr: [
          'فصل خاطئ → رسم خاطئ وغرامات محتملة',
          'تصنيف غير متسق لشحنة مجزأة',
          'مطالبة بمنشأ تفضيلي تحت رمز HS خاطئ',
        ],
        tipsEn: [
          'Classify before the vessel sails when possible',
          'Flag lines that may need JFDA / JSMO / telecom approval early',
        ],
        tipsAr: [
          'صنّف قبل إبحار الباخرة إن أمكن',
          'ضع علامة مبكرة على البنود التي قد تحتاج موافقة الغذاء والدواء أو المواصفات أو الاتصالات',
        ],
        systemsEn: 'Jordan Raya HS Search / ASYCUDA tariff reference / previous cases',
        systemsAr: 'بحث HS في راية الأردن / مرجع تعرفة الأسيكودا / الملفات السابقة',
      },
      {
        id: 'authority-check',
        phaseId: 'pre-arrival',
        number: '1.3',
        titleEn: 'Check authority & permit requirements',
        titleAr: 'فحص متطلبات الجهات والتصاريح',
        actorEn: 'Broker + Importer compliance',
        actorAr: 'المخلص + امتثال المستورد',
        detailEn:
          'Map each HS line to competent authorities: JFDA (food, cosmetics, medicines, medical devices), JSMO (standards/conformity), Ministry of Agriculture (plants, animals, fertilizers), Telecom Regulatory Commission (radio/telecom equipment), Civil Defense / security (hazardous, explosives, dual-use), Ministry of Industry & Trade (some restricted goods). Start permit applications before arrival when possible.',
        detailAr:
          'ربط كل بند HS بالجهات المختصة: المؤسسة العامة للغذاء والدواء (أغذية، مستحضرات، أدوية، أجهزة طبية)، مؤسسة المواصفات والمقاييس (مطابقة)، وزارة الزراعة (نباتات، حيوانات، أسمدة)، هيئة تنظيم قطاع الاتصالات (أجهزة لاسلكية واتصالات)، الدفاع المدني / الأمن (مواد خطرة وازدواجية الاستخدام)، وزارة الصناعة والتجارة (بعض السلع المقيدة). ابدأ طلبات التصاريح قبل الوصول إن أمكن.',
        documentsEn: [
          'Product labels / ingredients list',
          'Conformity or type-approval certificates',
          'Import permits / prior approvals',
          'Safety data sheets (SDS) for chemicals',
        ],
        documentsAr: [
          'بطاقات المنتج / قائمة المكونات',
          'شهادات المطابقة أو اعتماد النوع',
          'تصاريح استيراد / موافقات مسبقة',
          'نشرات السلامة للمواد الكيميائية',
        ],
        risksEn: [
          'Cargo arrives without required permit → hold or re-export',
          'Expired certificate of conformity',
          'Wrong authority applied to (e.g. food treated as general cargo)',
        ],
        risksAr: [
          'وصول البضاعة دون التصريح المطلوب → حجز أو إعادة تصدير',
          'شهادة مطابقة منتهية',
          'التقديم لجهة خاطئة (مثل معاملة الغذاء كبضاعة عامة)',
        ],
        tipsEn: [
          'Maintain a product master list with authority flags',
          'Use the Government Departments guide on this site',
        ],
        tipsAr: [
          'احتفظ بقائمة منتجات أساسية مع علامات الجهات',
          'استخدم دليل الجهات الحكومية في هذا الموقع',
        ],
        systemsEn: 'JFDA / JSMO / MoA portals + internal product matrix',
        systemsAr: 'بوابات الغذاء والدواء والمواصفات والزراعة + مصفوفة المنتجات الداخلية',
      },
      {
        id: 'authorize-broker',
        phaseId: 'pre-arrival',
        number: '1.4',
        titleEn: 'Authorize the customs broker',
        titleAr: 'تفويض المخلص الجمركي',
        actorEn: 'Importer',
        actorAr: 'المستورد',
        detailEn:
          'The importer must issue a written authorization (power of attorney / clearance letter) allowing the licensed broker to lodge the declaration in ASYCUDA on their behalf. Authorization should reference the importer’s tax/customs registration and ideally the shipment (B/L or invoice reference). Without valid authorization the declaration cannot proceed.',
        detailAr:
          'يجب على المستورد إصدار تفويض كتابي (وكالة / كتاب تخليص) يسمح للمخلص المرخص بتقديم البيان في الأسيكودا نيابة عنه. يجب أن يشير التفويض إلى تسجيل المستورد الضريبي/الجمركي ويفضّل الإشارة إلى الشحنة (بوليصة أو فاتورة). دون تفويض صالح لا يمكن متابعة البيان.',
        documentsEn: ['Broker authorization letter', 'Importer registration / tax number'],
        documentsAr: ['كتاب تفويض المخلص', 'تسجيل المستورد / الرقم الضريبي'],
        risksEn: ['Expired or general authorization rejected for this file', 'Mismatch between authorization and B/L consignee'],
        risksAr: ['تفويض منتهٍ أو عام مرفوض لهذا الملف', 'عدم تطابق التفويض مع المرسل إليه في البوليصة'],
        tipsEn: ['Keep digital copies of all active authorizations', 'Renew annually if using standing letters'],
        tipsAr: ['احتفظ بنسخ رقمية لجميع التفويضات السارية', 'جدّد سنوياً إن استخدمت كتباً دائمة'],
        systemsEn: 'Paper / PDF authorization filed with broker case',
        systemsAr: 'تفويض ورقي / PDF محفوظ في ملف المخلص',
      },
    ],
  },
  {
    id: 'arrival-terminal',
    number: '02',
    titleEn: 'Arrival, terminal & free time',
    titleAr: 'الوصول والمحطة والمدة المجانية',
    summaryEn:
      'Vessel/aircraft arrival, container discharge, ACT (or airport) free storage days, delivery order, and planning clearance before demurrage starts.',
    summaryAr:
      'وصول الباخرة/الطائرة، تفريغ الحاوية، أيام التخزين المجانية في ACT (أو المطار)، أمر التسليم، والتخطيط للتخليص قبل بدء غرامات التأخير.',
    steps: [
      {
        id: 'track-arrival',
        phaseId: 'arrival-terminal',
        number: '2.1',
        titleEn: 'Track arrival & discharge',
        titleAr: 'تتبع الوصول والتفريغ',
        actorEn: 'Broker / Freight forwarder',
        actorAr: 'المخلص / وكيل الشحن',
        detailEn:
          'Monitor vessel ETA and actual arrival at Aqaba (or airport for air cargo). After discharge, the container is available at Aqaba Container Terminal (ACT) or the relevant terminal. Note the discharge date — it is the reference for free storage calculation.',
        detailAr:
          'مراقبة موعد وصول الباخرة والوصول الفعلي إلى العقبة (أو المطار للشحن الجوي). بعد التفريغ تصبح الحاوية متاحة في محطة حاويات العقبة (ACT) أو المحطة المعنية. سجّل تاريخ التفريغ — هو مرجع حساب المدة المجانية.',
        documentsEn: ['Arrival notice', 'Container number / seal', 'Discharge confirmation'],
        documentsAr: ['إشعار الوصول', 'رقم الحاوية / الختم', 'تأكيد التفريغ'],
        risksEn: ['Late notice → lost free days', 'Wrong terminal / depot assumed'],
        risksAr: ['إشعار متأخر → ضياع أيام مجانية', 'افتراض محطة / مستودع خاطئ'],
        tipsEn: ['Subscribe to shipping line / ACT notifications', 'Record discharge date immediately in the case file'],
        tipsAr: ['اشترك في إشعارات الخط الملاحي / ACT', 'سجّل تاريخ التفريغ فوراً في ملف الشحنة'],
        systemsEn: 'Shipping line track & trace / ACT portal',
        systemsAr: 'تتبع الخط الملاحي / بوابة ACT',
      },
      {
        id: 'act-free-days',
        phaseId: 'arrival-terminal',
        number: '2.2',
        titleEn: 'Calculate ACT last free day',
        titleAr: 'حساب آخر يوم مجاني في ACT',
        actorEn: 'Broker operations',
        actorAr: 'عمليات المخلص',
        detailEn:
          'Aqaba Container Terminal grants a limited number of free storage days from discharge (or from availability, depending on current ACT tariff). After the last free day, demurrage / storage charges apply per day per container. Use the ACT free-day tool on this site and always confirm the live tariff on the official ACT portal. Plan declaration, payment, and trucking so cargo leaves before free time expires.',
        detailAr:
          'تمنح محطة حاويات العقبة عدداً محدوداً من أيام التخزين المجانية من تاريخ التفريغ (أو التوفر حسب تعرفة ACT الحالية). بعد آخر يوم مجاني تُفرض غرامات تأخير/تخزين يومياً لكل حاوية. استخدم أداة الأيام المجانية في هذا الموقع وأكد التعرفة الحية على بوابة ACT الرسمية. خطط البيان والدفع والنقل البري ليخرج البضاعة قبل انتهاء المدة المجانية.',
        documentsEn: ['Discharge date', 'Container size/type', 'ACT tariff schedule'],
        documentsAr: ['تاريخ التفريغ', 'حجم/نوع الحاوية', 'جدول تعرفة ACT'],
        risksEn: [
          'Miscalculated free days → unexpected demurrage',
          'Public holidays not accounted for in some rules',
          'Multiple containers with different free-day clocks',
        ],
        risksAr: [
          'حساب خاطئ للأيام المجانية → غرامات غير متوقعة',
          'عدم احتساب العطل الرسمية في بعض القواعد',
          'حاويات متعددة بساعات مجانية مختلفة',
        ],
        tipsEn: [
          'Set internal deadline 1–2 days before last free day',
          'Coordinate with trucking early if inspection is likely',
        ],
        tipsAr: [
          'ضع موعداً داخلياً قبل آخر يوم مجاني بيوم أو يومين',
          'نسّق مع النقل البري مبكراً إذا كانت المعاينة محتملة',
        ],
        systemsEn: 'Jordan Raya ACT tool + official ACT customer portal',
        systemsAr: 'أداة ACT في راية الأردن + بوابة عملاء ACT الرسمية',
      },
      {
        id: 'delivery-order',
        phaseId: 'arrival-terminal',
        number: '2.3',
        titleEn: 'Obtain delivery order (D/O)',
        titleAr: 'الحصول على أمر التسليم',
        actorEn: 'Broker / Shipping line agent',
        actorAr: 'المخلص / وكيل الخط الملاحي',
        detailEn:
          'The shipping line (or its agent) issues a Delivery Order after freight is settled (if collect) and original B/L is surrendered or telex release is confirmed. The D/O is required for terminal release and inland movement. Parallel to this, prepare the customs declaration so both tracks finish before free time ends.',
        detailAr:
          'يصدر الخط الملاحي (أو وكيله) أمر التسليم بعد تسوية أجور الشحن (إن كانت مستحقة عند الوصول) وتسليم البوليصة الأصلية أو تأكيد الإفراج البرقي. أمر التسليم مطلوب لإفراج المحطة والنقل الداخلي. بالتوازي جهّز البيان الجمركي لينتهي المساران قبل انتهاء المدة المجانية.',
        documentsEn: ['Original B/L or telex release', 'Freight payment proof', 'Delivery order'],
        documentsAr: ['البوليصة الأصلية أو الإفراج البرقي', 'إثبات دفع أجور الشحن', 'أمر التسليم'],
        risksEn: ['Freight dispute delays D/O', 'Telex release not received in time'],
        risksAr: ['نزاع أجور الشحن يؤخر أمر التسليم', 'عدم وصول الإفراج البرقي في الوقت'],
        tipsEn: ['Request telex release early when originals are slow', 'Confirm agent cut-off times'],
        tipsAr: ['اطلب الإفراج البرقي مبكراً عند تأخر الأصول', 'أكد مواعيد قطع الوكيل'],
        systemsEn: 'Shipping line agency desk / electronic D/O where available',
        systemsAr: 'مكتب وكالة الخط الملاحي / أمر تسليم إلكتروني حيث يتوفر',
      },
    ],
  },
  {
    id: 'declaration',
    number: '03',
    titleEn: 'ASYCUDA declaration & selectivity',
    titleAr: 'بيان الأسيكودا والانتقائية',
    summaryEn:
      'Lodge the customs declaration in ASYCUDA World, attach documents, submit for selectivity (green / yellow / red), and respond to any inspection or query.',
    summaryAr:
      'تقديم البيان الجمركي في نظام الأسيكودا العالمي، إرفاق الوثائق، الإرسال للانتقائية (أخضر / أصفر / أحمر)، والرد على أي معاينة أو استعلام.',
    steps: [
      {
        id: 'asycuda-login',
        phaseId: 'declaration',
        number: '3.1',
        titleEn: 'Access ASYCUDA & create declaration',
        titleAr: 'الدخول إلى الأسيكودا وإنشاء البيان',
        actorEn: 'Licensed customs broker',
        actorAr: 'المخلص الجمركي المرخص',
        detailEn:
          'Log into Jordan Customs ASYCUDA World with the broker office credentials. Create a new import declaration, enter importer and broker codes, transport details (B/L, vessel, container), invoice lines with HS codes, values, origin, and packages. Link attached scanned documents. Follow the ASYCUDA manual connect guide on this site for field-level tips.',
        detailAr:
          'الدخول إلى نظام الأسيكودا العالمي لدائرة الجمارك الأردنية ببيانات مكتب المخلص. إنشاء بيان استيراد جديد، إدخال رموز المستورد والمخلص، بيانات النقل (البوليصة، الباخرة، الحاوية)، بنود الفاتورة برموز HS والقيم والمنشأ والطرود. ربط الوثائق الممسوحة. اتبع دليل ربط الأسيكودا في هذا الموقع لنصائح على مستوى الحقول.',
        documentsEn: [
          'All commercial documents (scanned)',
          'Authorization letter',
          'Any permits / certificates already obtained',
        ],
        documentsAr: [
          'جميع الوثائق التجارية (ممسوحة)',
          'كتاب التفويض',
          'أي تصاريح / شهادات تم الحصول عليها',
        ],
        risksEn: [
          'Wrong importer or broker code',
          'Value or currency mismatch with invoice',
          'Container/seal not matching arrival data',
        ],
        risksAr: [
          'رمز مستورد أو مخلص خاطئ',
          'عدم تطابق القيمة أو العملة مع الفاتورة',
          'الحاوية/الختم لا يطابق بيانات الوصول',
        ],
        tipsEn: [
          'Use previous similar declarations as templates carefully',
          'Double-check HS and origin before submit',
        ],
        tipsAr: [
          'استخدم بيانات مشابهة سابقة كقوالب بحذر',
          'راجع HS والمنشأ مرتين قبل الإرسال',
        ],
        systemsEn: 'ASYCUDA World (Jordan Customs)',
        systemsAr: 'الأسيكودا العالمي (دائرة الجمارك الأردنية)',
      },
      {
        id: 'selectivity',
        phaseId: 'declaration',
        number: '3.2',
        titleEn: 'Submit & receive selectivity result',
        titleAr: 'الإرسال واستلام نتيجة الانتقائية',
        actorEn: 'Broker + Customs selectivity',
        actorAr: 'المخلص + انتقائية الجمارك',
        detailEn:
          'After validation, submit the declaration. ASYCUDA applies risk rules and assigns a lane: Green (release path with minimal checks), Yellow (document examination), Red (physical inspection and/or sampling). The lane determines the next actions and how long free time remains usable.',
        detailAr:
          'بعد التحقق أرسل البيان. يطبق الأسيكودا قواعد المخاطر ويعين مساراً: أخضر (مسار إفراج بفحوصات محدودة)، أصفر (فحص وثائقي)، أحمر (معاينة فعلية و/أو سحب عينات). يحدد المسار الخطوات التالية ومدة الاستفادة من الأيام المجانية.',
        documentsEn: ['Submitted declaration number', 'Selectivity notification'],
        documentsAr: ['رقم البيان المُرسل', 'إشعار الانتقائية'],
        risksEn: [
          'Red channel near last free day → demurrage risk',
          'Missing attachment triggers query even on green path',
        ],
        risksAr: [
          'مسار أحمر قرب آخر يوم مجاني → خطر غرامات التأخير',
          'مرفق ناقص يسبب استعلاماً حتى في المسار الأخضر',
        ],
        tipsEn: [
          'If red is likely (new product, high value), clear early',
          'Respond to document queries same day',
        ],
        tipsAr: [
          'إذا كان الأحمر محتملاً (منتج جديد، قيمة عالية) خلّص مبكراً',
          'أجب على استعلامات الوثائق في نفس اليوم',
        ],
        systemsEn: 'ASYCUDA selectivity module',
        systemsAr: 'وحدة الانتقائية في الأسيكودا',
      },
      {
        id: 'inspection',
        phaseId: 'declaration',
        number: '3.3',
        titleEn: 'Inspection / document examination',
        titleAr: 'المعاينة / الفحص الوثائقي',
        actorEn: 'Customs officers + Broker + Importer',
        actorAr: 'موظفو الجمارك + المخلص + المستورد',
        detailEn:
          'Yellow: provide additional documents, clarify description/value/origin. Red: arrange physical examination at the terminal or designated area; samples may be sent to lab (JSMO, JFDA, etc.). Coordinate trucking and terminal appointments so the container can be opened and restuffed if needed without wasting free days.',
        detailAr:
          'أصفر: تقديم وثائق إضافية وتوضيح الوصف/القيمة/المنشأ. أحمر: ترتيب المعاينة الفعلية في المحطة أو المكان المحدد؛ قد تُرسل عينات للمختبر (المواصفات، الغذاء والدواء، إلخ). نسّق النقل ومواعيد المحطة لفتح الحاوية وإعادة التعبئة إن لزم دون إهدار الأيام المجانية.',
        documentsEn: [
          'Additional invoices / contracts',
          'Technical literature',
          'Sample sealing / lab request forms',
        ],
        documentsAr: [
          'فواتير / عقود إضافية',
          'نشرات فنية',
          'نماذج ختم العينات / طلب المختبر',
        ],
        risksEn: [
          'Lab delay extends free-time pressure',
          'Findings lead to value uplift or HS reclassification',
        ],
        risksAr: [
          'تأخير المختبر يزيد ضغط المدة المجانية',
          'النتائج تؤدي إلى رفع القيمة أو إعادة تصنيف HS',
        ],
        tipsEn: [
          'Have technical contact of supplier on standby',
          'Photograph seals and container condition before opening',
        ],
        tipsAr: [
          'اجعل جهة الاتصال الفنية لدى المورد جاهزة',
          'صوّر الأختام وحالة الحاوية قبل الفتح',
        ],
        systemsEn: 'ASYCUDA examination workflow + terminal appointment',
        systemsAr: 'سير عمل المعاينة في الأسيكودا + موعد المحطة',
      },
    ],
  },
  {
    id: 'payment-release',
    number: '04',
    titleEn: 'Payment, release & delivery',
    titleAr: 'الدفع والإفراج والتسليم',
    summaryEn:
      'Pay duties and fees, obtain customs release, complete terminal formalities, arrange inland transport, and close the file with final invoices.',
    summaryAr:
      'دفع الرسوم والأجور، الحصول على الإفراج الجمركي، إتمام إجراءات المحطة، ترتيب النقل الداخلي، وإغلاق الملف بالفواتير النهائية.',
    steps: [
      {
        id: 'pay-duties',
        phaseId: 'payment-release',
        number: '4.1',
        titleEn: 'Pay duties, taxes and service fees',
        titleAr: 'دفع الرسوم والضرائب وأجور الخدمة',
        actorEn: 'Importer / Broker (on behalf)',
        actorAr: 'المستورد / المخلص (نيابةً)',
        detailEn:
          'After assessment, pay customs duty, general sales tax (where applicable), and service fees (including Article 161-type service charges where due). Payment channels depend on current Jordan Customs instructions (e-payment, bank, etc.). Keep payment references linked to the declaration number. For accounting: pass-through amounts belong on clearing accounts (122100/222100), not as agency revenue.',
        detailAr:
          'بعد التقدير ادفع الرسم الجمركي وضريبة المبيعات العامة (حيث تنطبق) وأجور الخدمة (بما فيها أجور من نوع المادة 161 حيث تستحق). قنوات الدفع حسب تعليمات دائرة الجمارك الحالية (دفع إلكتروني، بنك، إلخ). اربط مراجع الدفع برقم البيان. للمحاسبة: المبالغ الممرَّرة تنتمي لحسابات التسوية (122100/222100) وليست إيراد وكالة.',
        documentsEn: ['Payment receipt / e-payment confirmation', 'Assessment notice'],
        documentsAr: ['إيصال الدفع / تأكيد الدفع الإلكتروني', 'إشعار التقدير'],
        risksEn: ['Underpayment blocks release', 'Wrong account coding in agency books'],
        risksAr: ['نقص الدفع يمنع الإفراج', 'ترميز حسابي خاطئ في دفاتر الوكالة'],
        tipsEn: [
          'Reconcile payment to declaration same day',
          'Separate client disbursements from service fee invoices',
        ],
        tipsAr: [
          'طابق الدفع مع البيان في نفس اليوم',
          'افصل مدفوعات العميل عن فواتير أجرة الخدمة',
        ],
        systemsEn: 'ASYCUDA payment + bank / e-payment gateway',
        systemsAr: 'دفع الأسيكودا + البنك / بوابة الدفع الإلكتروني',
      },
      {
        id: 'customs-release',
        phaseId: 'payment-release',
        number: '4.2',
        titleEn: 'Obtain customs release order',
        titleAr: 'الحصول على أمر الإفراج الجمركي',
        actorEn: 'Customs + Broker',
        actorAr: 'الجمارك + المخلص',
        detailEn:
          'Once duties are paid and any holds (inspection, authority permits) are cleared, customs issues the release. The release order is presented to the terminal together with the delivery order so the container can leave the port area.',
        detailAr:
          'بعد دفع الرسوم ورفع أي حجز (معاينة، تصاريح الجهات) تصدر الجمارك الإفراج. يُقدَّم أمر الإفراج إلى المحطة مع أمر التسليم لتخرج الحاوية من منطقة الميناء.',
        documentsEn: ['Customs release order', 'Delivery order', 'Gate pass documents'],
        documentsAr: ['أمر الإفراج الجمركي', 'أمر التسليم', 'وثائق تصريح البوابة'],
        risksEn: ['Release issued but terminal system not updated', 'Outstanding terminal charges block gate-out'],
        risksAr: ['صدور الإفراج دون تحديث نظام المحطة', 'أجور محطة معلقة تمنع الخروج'],
        tipsEn: ['Confirm ACT / terminal status before sending the truck', 'Keep digital copies of release'],
        tipsAr: ['أكد حالة ACT / المحطة قبل إرسال الشاحنة', 'احتفظ بنسخ رقمية من الإفراج'],
        systemsEn: 'ASYCUDA release + ACT / terminal gate system',
        systemsAr: 'إفراج الأسيكودا + نظام بوابة ACT / المحطة',
      },
      {
        id: 'inland-delivery',
        phaseId: 'payment-release',
        number: '4.3',
        titleEn: 'Inland transport & delivery to warehouse',
        titleAr: 'النقل الداخلي والتسليم للمستودع',
        actorEn: 'Trucking + Broker + Importer',
        actorAr: 'النقل البري + المخلص + المستورد',
        detailEn:
          'Schedule trucking from Aqaba (or airport) to the importer warehouse or nominated site. Track container return empty deadlines to avoid shipping-line detention. Deliver documents and proof of delivery to close the operational file.',
        detailAr:
          'جدولة النقل البري من العقبة (أو المطار) إلى مستودع المستورد أو الموقع المحدد. تتبع مواعيد إعادة الحاوية فارغة لتجنب غرامات احتجاز الخط الملاحي. تسليم الوثائق وإثبات التسليم لإغلاق الملف التشغيلي.',
        documentsEn: ['Transport waybill', 'Proof of delivery', 'Empty return confirmation'],
        documentsAr: ['بوليصة النقل البري', 'إثبات التسليم', 'تأكيد إعادة الفارغة'],
        risksEn: ['Detention after free container days with line', 'POD missing for client billing'],
        risksAr: ['غرامات احتجاز بعد أيام الحاوية المجانية مع الخط', 'غياب إثبات التسليم لفواتير العميل'],
        tipsEn: ['Align trucking with last free day and empty return clock', 'Send POD to client and accounting same day'],
        tipsAr: ['زامن النقل مع آخر يوم مجاني وساعة إعادة الفارغة', 'أرسل إثبات التسليم للعميل والمحاسبة في نفس اليوم'],
        systemsEn: 'Trucking partner + client portal status update',
        systemsAr: 'شريك النقل البري + تحديث حالة بوابة العميل',
      },
      {
        id: 'file-close',
        phaseId: 'payment-release',
        number: '4.4',
        titleEn: 'Close file & client billing',
        titleAr: 'إغلاق الملف وفوترة العميل',
        actorEn: 'Broker accounting / operations',
        actorAr: 'محاسبة / عمليات المخلص',
        detailEn:
          'Issue the final client invoice: service fee (revenue) separate from pass-through disbursements (duties, ACT, shipping line, trucking, permits). Archive declaration, payments, release, POD, and authority certificates. Update the shipment case status for the customer portal.',
        detailAr:
          'إصدار فاتورة العميل النهائية: أجرة الخدمة (إيراد) منفصلة عن المدفوعات الممرَّرة (رسوم، ACT، الخط الملاحي، النقل، التصاريح). أرشفة البيان والمدفوعات والإفراج وإثبات التسليم وشهادات الجهات. تحديث حالة ملف الشحنة لبوابة العميل.',
        documentsEn: [
          'Client invoice (service + disbursements schedule)',
          'Full document archive',
          'Reconciliation of clearing account',
        ],
        documentsAr: [
          'فاتورة العميل (خدمة + جدول المدفوعات)',
          'أرشيف الوثائق الكامل',
          'مطابقة حساب التسوية',
        ],
        risksEn: [
          'Mixing disbursements into revenue accounts',
          'Incomplete archive for audit or client dispute',
        ],
        risksAr: [
          'خلط المدفوعات الممرَّرة في حسابات الإيراد',
          'أرشيف ناقص للتدقيق أو نزاع العميل',
        ],
        tipsEn: [
          'Use clearing account 122100 or 222100 for pass-throughs',
          'Post service fee only to revenue (e.g. 411100)',
        ],
        tipsAr: [
          'استخدم حساب التسوية 122100 أو 222100 للممرَّر',
          'قيّد أجرة الخدمة فقط في الإيراد (مثل 411100)',
        ],
        systemsEn: 'Agency ERP / Odoo / Jordan Raya case archive',
        systemsAr: 'نظام الوكالة / أودو / أرشيف ملفات راية الأردن',
      },
    ],
  },
];
