import type { ProcedurePhase } from '@/lib/types';

export const PROCEDURE_PHASES: ProcedurePhase[] = [
  {
    id: 'pre-arrival',
    number: '01',
    titleEn: 'Prepare before arrival',
    titleAr: 'التحضير قبل الوصول',
    steps: [
      {
        titleEn: 'Collect commercial documents',
        titleAr: 'جمع الوثائق التجارية',
        detailEn: 'Commercial invoice, packing list, bill of lading / airway bill, certificate of origin if claimed.',
        detailAr: 'الفاتورة التجارية، قائمة التعبئة، بوليصة الشحن، شهادة المنشأ إن وُجدت.',
      },
      {
        titleEn: 'Classify each line (HS)',
        titleAr: 'تصنيف كل بند (HS)',
        detailEn: 'Determine the correct 11-digit Jordan HS code and duty rate. Ambiguous descriptions need review.',
        detailAr: 'تحديد رمز النظام المنسق الأردني المكون من 11 رقماً ونسبة الرسم. الأوصاف الغامضة تحتاج مراجعة.',
      },
      {
        titleEn: 'Check authority requirements',
        titleAr: 'التحقق من متطلبات الجهات',
        detailEn: 'JFDA, JSMO, agriculture, telecom, or security approvals may be required before declaration.',
        detailAr: 'قد تكون موافقات الغذاء والدواء أو المواصفات أو الزراعة أو الاتصالات أو الأمن مطلوبة قبل البيان.',
      },
      {
        titleEn: 'Arrange authorization',
        titleAr: 'ترتيب التفويض',
        detailEn: 'Importer must authorize the customs broker in writing for the specific declaration.',
        detailAr: 'يجب على المستورد تفويض المخلص الجمركي كتابياً للبيان المحدد.',
      },
    ],
  },
  {
    id: 'declaration',
    number: '02',
    titleEn: 'Declaration & payment',
    titleAr: 'البيان والدفع',
    steps: [
      {
        titleEn: 'Lodge ASYCUDA declaration',
        titleAr: 'تقديم البيان في الأسيكودا',
        detailEn: 'Enter declaration data, attach documents, and submit for selectivity (green / yellow / red).',
        detailAr: 'إدخال بيانات البيان وإرفاق الوثائق وتقديمه للانتقائية (أخضر / أصفر / أحمر).',
      },
      {
        titleEn: 'Pay duties and fees',
        titleAr: 'دفع الرسوم والأجور',
        detailEn: 'Customs duty, sales tax, service fees (Art. 161), and any other applicable charges.',
        detailAr: 'الرسم الجمركي، ضريبة المبيعات، أجور الخدمة (المادة 161)، وأي رسوم أخرى مستحقة.',
      },
      {
        titleEn: 'Respond to inspection',
        titleAr: 'الرد على المعاينة',
        detailEn: 'If selected for physical or document examination, provide samples or additional evidence promptly.',
        detailAr: 'في حال اختيار المعاينة الفعلية أو الوثائقية، تقديم العينات أو الأدلة الإضافية بسرعة.',
      },
    ],
  },
  {
    id: 'release',
    number: '03',
    titleEn: 'Release & delivery',
    titleAr: 'الإفراج والتسليم',
    steps: [
      {
        titleEn: 'Obtain release order',
        titleAr: 'الحصول على أمر الإفراج',
        detailEn: 'Once duties are paid and any holds cleared, customs issues the release.',
        detailAr: 'بعد دفع الرسوم ورفع أي حجز، تصدر الجمارك أمر الإفراج.',
      },
      {
        titleEn: 'Port / terminal formalities',
        titleAr: 'إجراءات الميناء / المحطة',
        detailEn: 'Pay terminal handling, arrange delivery order with shipping line, and schedule trucking.',
        detailAr: 'دفع أجور المناولة، ترتيب أمر التسليم مع الخط الملاحي، وجدولة النقل البري.',
      },
      {
        titleEn: 'Inland transport & delivery',
        titleAr: 'النقل الداخلي والتسليم',
        detailEn: 'Move cargo to destination warehouse and close the file with final invoices and proof of delivery.',
        detailAr: 'نقل البضاعة إلى المستودع وإغلاق الملف بالفواتير النهائية وإثبات التسليم.',
      },
    ],
  },
];
