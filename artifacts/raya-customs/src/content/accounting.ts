import type { AccountDefinition, DisbursementCase } from '@/lib/types';

export const ACCOUNTING_PRINCIPLE = {
  titleEn: 'Core rule — pass-through vs revenue',
  titleAr: 'القاعدة الأساسية — الممرَّر مقابل الإيراد',
  bodyEn:
    'Customs duties, port fees, and government charges paid on behalf of the client are not Raya revenue and not ordinary expense. They post through clearing accounts. Only the agency service fee is revenue (411100). Booking pass-through amounts as sales and cost inflates turnover, distorts margins, and can create incorrect sales-tax exposure.',
  bodyAr:
    'الرسوم الجمركية وأجور الميناء والرسوم الحكومية المدفوعة نيابة عن العميل ليست إيراداً لراية وليست مصروفاً عادياً. تُقيَّد عبر حسابات التسوية. فقط أجر خدمة التخليص إيراد (411100). تقييد المبالغ الممرَّرة كمبيعات وتكلفة يضخّم حجم الأعمال ويشوّه الهوامش وقد يخلق تعرضاً خاطئاً لضريبة المبيعات.',
};


export const DOUBLE_ENTRY = {
  titleEn: 'Double-entry mechanism',
  titleAr: 'آلية القيد المزدوج',
  ruleEn:
    'Every transaction is recorded twice — once as debit and once as credit — for the same amount. Total debits must equal total credits.',
  ruleAr:
    'كل عملية تُسجَّل مرتين — مرة مدين ومرة دائن — وبنفس المبلغ. مجموع المدين يجب أن يساوي مجموع الدائن.',
  equationEn: 'Assets = Liabilities + Equity',
  equationAr: 'الأصول = الالتزامات + حقوق الملكية',
  rules: [
    {
      en: 'Assets increase with debit, decrease with credit',
      ar: 'الأصول تزيد بالمدين وتنقص بالدائن',
    },
    {
      en: 'Liabilities increase with credit, decrease with debit',
      ar: 'الالتزامات تزيد بالدائن وتنقص بالمدين',
    },
    {
      en: 'Revenue increases with credit (e.g. 411100 agency fee)',
      ar: 'الإيراد يزيد بالدائن (مثل أتعاب 411100)',
    },
    {
      en: 'Expenses increase with debit — never post client duties as expense',
      ar: 'المصروف يزيد بالمدين — لا تقيّد رسوم العميل كمصروف تشغيلي',
    },
  ],
  examples: [
    {
      titleEn: 'Pay-first: pay duties from bank',
      titleAr: 'دفع أولاً: دفع الرسوم من البنك',
      lines: [
        { account: '122100', side: 'debit', en: 'Clearing receivable', ar: 'ذمم تسوية' },
        { account: '112000', side: 'credit', en: 'Bank', ar: 'البنك' },
      ],
    },
    {
      titleEn: 'Pay-first: client recovery + fee',
      titleAr: 'دفع أولاً: استرداد العميل + الأتعاب',
      lines: [
        { account: '112000', side: 'debit', en: 'Bank (total received)', ar: 'البنك (إجمالي المقبوض)' },
        { account: '122100', side: 'credit', en: 'Clear receivable', ar: 'إقفال الذمة' },
        { account: '411100', side: 'credit', en: 'Agency revenue', ar: 'إيراد الأتعاب' },
      ],
    },
    {
      titleEn: 'Prepay: receive client advance',
      titleAr: 'مقدم: استلام دفعة العميل',
      lines: [
        { account: '112000', side: 'debit', en: 'Bank', ar: 'البنك' },
        { account: '222100', side: 'credit', en: 'Client prepay liability', ar: 'التزام مقدمة العميل' },
      ],
    },
    {
      titleEn: 'Prepay: pay actual charges',
      titleAr: 'مقدم: دفع الرسوم الفعلية',
      lines: [
        { account: '222100', side: 'debit', en: 'Apply prepay', ar: 'تطبيق المقدمة' },
        { account: '112000', side: 'credit', en: 'Bank', ar: 'البنك' },
      ],
    },
  ],
  pnlEn:
    'P&L recognizes only the agency fee (credit 411100). Pass-through stays on the balance sheet in 122100/222100 until cleared.',
  pnlAr:
    'قائمة الدخل تعترف فقط بأتعاب التخليص (دائن 411100). الممرَّر يبقى في الميزانية على 122100/222100 حتى التصفية.',
};

export const CHART_INTRO = {
  titleEn: 'Unified chart of accounts (brokerage model)',
  titleAr: 'دليل الحسابات الموحد (نموذج التخليص)',
  bodyEn:
    'A compact, unified chart for a Jordan customs brokerage. Core clearing codes 122100 / 222100 keep pass-through duties off the P&L. Extend with your ERP sub-accounts as needed; do not post client duties to revenue.',
  bodyAr:
    'دليل موحّد مختصر لمكتب تخليص جمركي في الأردن. حسابا التسوية 122100 / 222100 يُبقيان الرسوم الممرَّرة خارج قائمة الدخل. يمكن تفريع الحسابات في نظامك المحاسبي دون ترحيل رسوم العميل إلى الإيراد.',
};

export const CHART_ACCOUNTS: AccountDefinition[] = [
  // —— Assets 1xxxxx ——
  {
    code: '111000',
    nameEn: 'Cash on hand',
    nameAr: 'الصندوق',
    type: 'asset',
    roleEn: 'Petty cash and till.',
    roleAr: 'النقدية في الصندوق.',
  },
  {
    code: '112000',
    nameEn: 'Bank — operating',
    nameAr: 'البنك — تشغيلي',
    type: 'asset',
    roleEn: 'Main operating bank account for duties, recovery, and fees.',
    roleAr: 'الحساب البنكي التشغيلي لدفع الرسوم والاسترداد والأتعاب.',
  },
  {
    code: '121000',
    nameEn: 'Trade receivables — clients',
    nameAr: 'ذمم مدينة — عملاء',
    type: 'asset',
    roleEn: 'Invoiced agency fees and other amounts due from clients (not pass-through clearing).',
    roleAr: 'أتعاب التخليص والمبالغ المستحقة على العملاء (غير ذمم التسوية الممرَّرة).',
  },
  {
    code: '122100',
    nameEn: 'Clearing receivable — pay-first disbursements',
    nameAr: 'ذمم تسوية — مدفوعات دفع أولاً',
    type: 'asset',
    roleEn: 'Debit when company pays duties/port/gov on behalf of client; credit on client recovery. Must return to zero per file.',
    roleAr: 'مدين عند دفع الشركة الرسوم/الميناء/الجهات نيابة عن العميل؛ دائن عند الاسترداد. يجب أن يعود صفراً لكل ملف.',
  },
  {
    code: '123000',
    nameEn: 'Other receivables',
    nameAr: 'ذمم مدينة أخرى',
    type: 'asset',
    roleEn: 'Deposits, staff advances, miscellaneous receivables.',
    roleAr: 'تأمينات وسلف موظفين وذمم متنوعة.',
  },
  {
    code: '131000',
    nameEn: 'Prepaid expenses',
    nameAr: 'مصروفات مدفوعة مقدماً',
    type: 'asset',
    roleEn: 'Rent, insurance, subscriptions paid in advance.',
    roleAr: 'إيجار وتأمين واشتراكات مدفوعة مقدماً.',
  },
  {
    code: '141000',
    nameEn: 'Fixed assets — net',
    nameAr: 'أصول ثابتة — بالصافي',
    type: 'asset',
    roleEn: 'Vehicles, equipment, furniture (net of depreciation).',
    roleAr: 'مركبات ومعدات وأثاث (بعد الاستهلاك).',
  },
  // —— Liabilities 2xxxxx ——
  {
    code: '211000',
    nameEn: 'Trade payables — suppliers',
    nameAr: 'ذمم دائنة — موردون',
    type: 'liability',
    roleEn: 'Amounts owed to vendors and service providers.',
    roleAr: 'مبالغ مستحقة للموردين ومقدّمي الخدمات.',
  },
  {
    code: '222100',
    nameEn: 'Clearing liability — client prepayments',
    nameAr: 'التزام تسوية — دفعات مقدمة من العملاء',
    type: 'liability',
    roleEn: 'Credit when client advances funds for expected duties/fees; debit as actual charges are paid. True-up then settle.',
    roleAr: 'دائن عند استلام مقدمة لتغطية الرسوم المتوقعة؛ مدين عند دفع الرسوم الفعلية. ثم التسوية والإقفال.',
  },
  {
    code: '231000',
    nameEn: 'VAT / sales tax payable',
    nameAr: 'ضريبة مبيعات مستحقة',
    type: 'liability',
    roleEn: 'Output tax on taxable agency fees (confirm current Jordan rules).',
    roleAr: 'ضريبة المخرجات على أتعاب التخليص الخاضعة (أكد القواعد الأردنية الحالية).',
  },
  {
    code: '232000',
    nameEn: 'Other tax payables',
    nameAr: 'ذمم ضريبية أخرى',
    type: 'liability',
    roleEn: 'Withholding and other statutory payables.',
    roleAr: 'اقتطاعات وذمم نظامية أخرى.',
  },
  {
    code: '241000',
    nameEn: 'Accrued expenses',
    nameAr: 'مصروفات مستحقة',
    type: 'liability',
    roleEn: 'Period-end accruals (utilities, salaries, etc.).',
    roleAr: 'استحقاقات نهاية الفترة (خدمات، رواتب، إلخ).',
  },
  // —— Equity 3xxxxx ——
  {
    code: '310000',
    nameEn: 'Capital',
    nameAr: 'رأس المال',
    type: 'equity',
    roleEn: 'Owner / partners capital.',
    roleAr: 'رأس مال المالك / الشركاء.',
  },
  {
    code: '320000',
    nameEn: 'Retained earnings',
    nameAr: 'أرباح مبقّاة',
    type: 'equity',
    roleEn: 'Accumulated results after drawings.',
    roleAr: 'النتائج المتراكمة بعد المسحوبات.',
  },
  // —— Revenue 4xxxxx ——
  {
    code: '411100',
    nameEn: 'Agency clearance revenue',
    nameAr: 'إيراد خدمة التخليص',
    type: 'revenue',
    roleEn: 'ONLY contracted brokerage/agency fees — never customs duties or port pass-through.',
    roleAr: 'فقط أتعاب التخليص المتفق عليها — وليس الرسوم الجمركية أو الممرَّر عبر الميناء.',
  },
  {
    code: '412000',
    nameEn: 'Transport / logistics revenue',
    nameAr: 'إيراد النقل / الخدمات اللوجستية',
    type: 'revenue',
    roleEn: 'If the firm invoices haulage or logistics separately.',
    roleAr: 'إذا كانت الشركة تفوتر النقل أو الخدمات اللوجستية بشكل منفصل.',
  },
  {
    code: '419000',
    nameEn: 'Other operating revenue',
    nameAr: 'إيرادات تشغيلية أخرى',
    type: 'revenue',
    roleEn: 'Miscellaneous operating income.',
    roleAr: 'إيرادات تشغيلية متنوعة.',
  },
  // —— Expenses 5xxxxx ——
  {
    code: '511100',
    nameEn: 'Direct cost of clearance service',
    nameAr: 'تكلفة مباشرة لخدمة التخليص',
    type: 'expense',
    roleEn: 'Optional internal direct cost of the service — NOT customs duties.',
    roleAr: 'تكلفة مباشرة داخلية اختيارية للخدمة — وليست الرسوم الجمركية.',
  },
  {
    code: '521000',
    nameEn: 'Salaries and wages',
    nameAr: 'رواتب وأجور',
    type: 'expense',
    roleEn: 'Staff payroll and related costs.',
    roleAr: 'رواتب الموظفين والتكاليف المرتبطة.',
  },
  {
    code: '522000',
    nameEn: 'Rent and utilities',
    nameAr: 'إيجار ومنافع',
    type: 'expense',
    roleEn: 'Office rent, electricity, communications.',
    roleAr: 'إيجار المكتب والكهرباء والاتصالات.',
  },
  {
    code: '523000',
    nameEn: 'Vehicle and transport expense',
    nameAr: 'مصروف مركبات ونقل',
    type: 'expense',
    roleEn: 'Fuel, maintenance, company transport.',
    roleAr: 'وقود وصيانة ونقل الشركة.',
  },
  {
    code: '524000',
    nameEn: 'Professional and government fees',
    nameAr: 'أتعاب مهنية ورسوم حكومية (على المكتب)',
    type: 'expense',
    roleEn: 'License renewals and professional fees of the firm itself — not client pass-through.',
    roleAr: 'تجديد الرخص وأتعاب المكتب نفسه — وليست الممرَّر عن العميل.',
  },
  {
    code: '529000',
    nameEn: 'Other operating expenses',
    nameAr: 'مصروفات تشغيلية أخرى',
    type: 'expense',
    roleEn: 'General administrative expenses.',
    roleAr: 'مصروفات إدارية عامة.',
  },
];

export const DEMO_DISBURSEMENTS: DisbursementCase[] = [
  {
    id: 'disb-39568',
    declarationNo: '39568/4/2026',
    clientNameEn: 'Safari Est.',
    clientNameAr: 'مؤسسة سفاري',
    mode: 'pay_first',
    currency: 'JOD',
    duties: 1850,
    portFees: 420,
    otherGovCharges: 95,
    agencyFee: 175,
    status: 'open',
    statusEn: 'Open — awaiting client recovery',
    statusAr: 'مفتوح — بانتظار استرداد العميل',
    createdAt: '2026-07-22',
    lastMovementAt: '2026-07-22',
    recoveredPassThrough: 0,
  },
  {
    id: 'disb-40220',
    declarationNo: '40220/6/2026',
    clientNameEn: 'Al-Nour Trading',
    clientNameAr: 'شركة النور',
    mode: 'client_prepay',
    currency: 'JOD',
    duties: 980,
    portFees: 310,
    otherGovCharges: 40,
    agencyFee: 120,
    status: 'recovered',
    statusEn: 'Settled against prepayment',
    statusAr: 'سُوّي من الدفعة المقدمة',
    createdAt: '2026-07-19',
    lastMovementAt: '2026-07-21',
    prepayReceived: 1330,
    appliedPassThrough: 1330,
  },
  {
    id: 'disb-39110',
    declarationNo: '39110/2/2026',
    clientNameEn: 'Safari Est.',
    clientNameAr: 'مؤسسة سفاري',
    mode: 'pay_first',
    currency: 'JOD',
    duties: 640,
    portFees: 180,
    otherGovCharges: 0,
    agencyFee: 90,
    status: 'closed',
    statusEn: 'Closed — recovered + fee invoiced',
    statusAr: 'مغلق — استُرد ودُوّنت الأتعاب',
    createdAt: '2026-07-12',
    lastMovementAt: '2026-07-18',
    recoveredPassThrough: 820,
  },
  {
    id: 'disb-38801',
    declarationNo: '38801/9/2026',
    clientNameEn: 'Dead Sea Foods',
    clientNameAr: 'أغذية البحر الميت',
    mode: 'pay_first',
    currency: 'JOD',
    duties: 2200,
    portFees: 500,
    otherGovCharges: 120,
    agencyFee: 200,
    status: 'open',
    statusEn: 'Open — partial recovery',
    statusAr: 'مفتوح — استرداد جزئي',
    createdAt: '2026-06-10',
    lastMovementAt: '2026-06-28',
    recoveredPassThrough: 1000,
  },
  {
    id: 'disb-40150',
    declarationNo: '40150/1/2026',
    clientNameEn: 'Zarqa Plastics',
    clientNameAr: 'بلاستيك الزرقاء',
    mode: 'client_prepay',
    currency: 'JOD',
    duties: 1500,
    portFees: 280,
    otherGovCharges: 50,
    agencyFee: 140,
    status: 'open',
    statusEn: 'Open — prepay received, charges not fully applied',
    statusAr: 'مفتوح — مقدمة مستلمة ولم تُطبَّق الرسوم بالكامل',
    createdAt: '2026-07-20',
    lastMovementAt: '2026-07-20',
    prepayReceived: 2000,
    appliedPassThrough: 0,
  },
  {
    id: 'disb-37500',
    declarationNo: '37500/3/2026',
    clientNameEn: 'Irbid Metals',
    clientNameAr: 'معادن إربد',
    mode: 'pay_first',
    currency: 'JOD',
    duties: 3100,
    portFees: 600,
    otherGovCharges: 0,
    agencyFee: 250,
    status: 'closed',
    statusEn: 'Closed with residual — needs review',
    statusAr: 'مغلق مع باقي — يحتاج مراجعة',
    createdAt: '2026-05-02',
    lastMovementAt: '2026-05-20',
    recoveredPassThrough: 3500,
    exceptionEn: 'Marked closed but 200 JOD residual on 122100 — recovery short or coding error',
    exceptionAr: 'معلَّم مغلقاً مع باقي 200 د.أ على 122100 — نقص استرداد أو خطأ ترميز',
  },
];


export const FLOW_STEPS = {
  pay_first: {
    titleEn: 'Pay-first (asset clearing 122100)',
    titleAr: 'دفع أولاً (أصل تسوية 122100)',
    stepsEn: [
      '1. Raya pays Customs / ACT / gov charges from bank → Dr 122100 / Cr 111000',
      '2. Invoice client for disbursements + agency fee',
      '3. Client pays → Dr 111000 / Cr 122100 (recovery) and Cr 411100 (fee)',
      '4. 122100 balance should return to zero for that file',
    ],
    stepsAr: [
      '1. راية تدفع للجمارك / ACT / الجهات من البنك → مدين 122100 / دائن 111000',
      '2. فاتورة للعميل بالمدفوعات + أتعاب الوكالة',
      '3. العميل يدفع → مدين 111000 / دائن 122100 (استرداد) ودائن 411100 (أتعاب)',
      '4. رصيد 122100 يجب أن يعود صفراً لهذا الملف',
    ],
  },
  client_prepay: {
    titleEn: 'Client prepay (liability clearing 222100)',
    titleAr: 'دفع مقدم من العميل (التزام تسوية 222100)',
    stepsEn: [
      '1. Client advances estimated duties/fees → Dr 111000 / Cr 222100',
      '2. Raya pays actual charges → Dr 222100 / Cr 111000',
      '3. Difference: extra charge to client or refund; agency fee → Cr 411100',
      '4. 222100 per file should clear after true-up',
    ],
    stepsAr: [
      '1. العميل يقدّم تقديراً للرسوم → مدين 111000 / دائن 222100',
      '2. راية تدفع الرسوم الفعلية → مدين 222100 / دائن 111000',
      '3. الفرق: تحميل إضافي أو رد؛ أتعاب الوكالة → دائن 411100',
      '4. 222100 لكل ملف يجب أن يُصفَّى بعد التسوية',
    ],
  },
};


export const GST_NOTE = {
  titleEn: 'Sales tax (GST) note — Jordan',
  titleAr: 'ملاحظة ضريبة المبيعات — الأردن',
  bodyEn:
    'Pass-through customs duties and many government charges are not treated as taxable supplies of the broker. The agency service fee (411100) is typically the line subject to sales tax rules applicable to clearance services. Confirm current GST treatment with your tax advisor and Jordan Tax Administration circulars — this tool does not compute tax.',
  bodyAr:
    'الرسوم الجمركية الممرَّرة وكثير من الرسوم الحكومية لا تُعامل كتوريد خاضع لضريبة المبيعات من المخلص. أتعاب خدمة التخليص (411100) هي عادة البند الخاضع لقواعد ضريبة المبيعات على خدمات التخليص. أكد المعاملة الحالية مع مستشارك الضريبي وتعاميم ضريبة الدخل والمبيعات — هذه الأداة لا تحسب الضريبة.',
};
