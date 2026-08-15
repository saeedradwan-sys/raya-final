import type { AgentRunInput, AgentRunResult, AgentSuggestion } from './types';

function item(
  id: string,
  titleEn: string,
  titleAr: string,
  bodyEn: string,
  bodyAr: string,
  priority: number,
  href: string,
  labelEn: string,
  labelAr: string,
): AgentSuggestion {
  return {
    id,
    agentId: 'ui_polish',
    titleEn,
    titleAr,
    bodyEn,
    bodyAr,
    confidence: 'high',
    priority,
    links: [{ href, labelEn, labelAr }],
  };
}

/** Reviews established UI foundations and returns safe, incremental polish work. */
export function runUiPolishAgent(_input: AgentRunInput): AgentRunResult {
  const suggestions: AgentSuggestion[] = [
    item(
      'ui-polish-hierarchy',
      'Establish a consistent page hierarchy',
      'توحيد التسلسل الهرمي للصفحات',
      'Standardize each page around a compact eyebrow, a single clear title, a short context line, primary action, and grouped secondary actions. This makes the public site, client portal, and staff workspace feel like one company product.',
      'وحّد كل صفحة حول عنوان تمهيدي صغير وعنوان واضح واحد وسطر سياق قصير وإجراء أساسي وإجراءات ثانوية مجمّعة. بذلك يبدو الموقع العام وبوابة العملاء ومساحة الموظفين كمنتج شركة واحد.',
      1,
      '/staff',
      'Open staff workspace',
      'فتح مساحة الموظفين',
    ),
    item(
      'ui-polish-task-states',
      'Make operational state easier to scan',
      'جعل الحالة التشغيلية أسهل في المسح',
      'Use the existing lane and status vocabulary consistently as compact badges, then reserve stronger colour and icon treatment for only urgent states: free-time risk, red-lane inspection, missing documents, and blocked handoffs.',
      'استخدم مفردات المسرب والحالة الحالية بصورة متسقة كشارات صغيرة، ثم خصص الألوان والأيقونات الأقوى للحالات العاجلة فقط: خطر المدة المجانية ومعاينة المسرب الأحمر والمستندات المفقودة والتسليمات المتوقفة.',
      0,
      '/staff/assist',
      'Open Assist',
      'فتح المساعدة',
    ),
    item(
      'ui-polish-responsive',
      'Finish the mobile task flow',
      'إكمال مسار المهام على الهاتف',
      'The project already switches data tables to cards on smaller screens. Extend that pattern to every dense workspace screen, keep primary actions sticky or immediately visible, and ensure forms remain one-column and thumb-friendly.',
      'يحوّل المشروع الجداول إلى بطاقات على الشاشات الصغيرة بالفعل. وسّع هذا النمط إلى كل شاشات مساحة العمل الكثيفة، واجعل الإجراءات الأساسية ثابتة أو ظاهرة فوراً، وتأكد من بقاء النماذج بعمود واحد وسهلة الاستخدام بالإبهام.',
      1,
      '/staff/accounting',
      'Open accounting',
      'فتح المحاسبة',
    ),
    item(
      'ui-polish-rtl',
      'Run a focused Arabic RTL polish pass',
      'إجراء مراجعة مركزة للواجهة العربية واتجاه RTL',
      'Keep Arabic text, icons, arrows, numbers, dates, and monetary values intentionally scoped. Verify that actions mirror where appropriate while identifiers such as declarations, HS codes, accounts, and container numbers remain left-to-right.',
      'حافظ على النص العربي والأيقونات والأسهم والأرقام والتواريخ والقيم المالية ضمن اتجاه مقصود. تحقق من انعكاس الإجراءات عند الحاجة مع بقاء المعرّفات مثل البيانات ورموز HS والحسابات وأرقام الحاويات من اليسار إلى اليمين.',
      1,
      '/laws',
      'Open bilingual laws page',
      'فتح صفحة القوانين الثنائية',
    ),
    item(
      'ui-polish-feedback',
      'Give every async action a clear outcome',
      'إظهار نتيجة واضحة لكل إجراء غير متزامن',
      'Reuse the loading and error foundations for saves, exports, imports, approvals, and API fallbacks. Add concise success confirmation, recovery guidance, and disabled duplicate-submit states at the action point.',
      'أعد استخدام أساس التحميل والخطأ الحالي للحفظ والتصدير والاستيراد والاعتمادات والبدائل عند تعطل API. أضف تأكيد نجاح مختصراً وإرشاداً للاسترداد وحالات تمنع الإرسال المكرر في موضع الإجراء.',
      2,
      '/staff/records',
      'Open records',
      'فتح السجلات',
    ),
    item(
      'ui-polish-accessibility',
      'Add an accessibility acceptance checklist',
      'إضافة قائمة قبول لإتاحة الاستخدام',
      'Before each UI release, check keyboard order, visible focus, form labels, validation messages, colour contrast, touch targets, and reduced-motion behaviour. Treat this as a release gate for public and private screens.',
      'قبل كل إصدار للواجهة، افحص ترتيب لوحة المفاتيح وتركيز العناصر الظاهر وتسميات النماذج ورسائل التحقق وتباين الألوان وأحجام أهداف اللمس وسلوك تقليل الحركة. تعامل مع ذلك كبوابة إصدار للشاشات العامة والخاصة.',
      2,
      '/',
      'Open public home',
      'فتح الصفحة الرئيسية',
    ),
  ];

  return {
    agentId: 'ui_polish',
    ranAt: new Date().toISOString(),
    suggestions,
    disclaimerEn: 'UI polish review based on the current project patterns. It proposes incremental product-quality improvements; validate visual changes on desktop, mobile, English, and Arabic before release.',
    disclaimerAr: 'مراجعة تحسين الواجهة مبنية على أنماط المشروع الحالية. تقترح تحسينات تدريجية لجودة المنتج؛ تحقق من التغييرات بصرياً على سطح المكتب والهاتف وباللغتين الإنجليزية والعربية قبل الإصدار.',
  };
}