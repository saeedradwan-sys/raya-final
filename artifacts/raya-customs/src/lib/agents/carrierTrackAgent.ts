/**
 * Carrier container tracking assistant.
 * Public track links only — never stores line passwords or automates login.
 */
import type { AgentRunInput, AgentRunResult, AgentSuggestion } from './types';

export interface CarrierInfo {
  id: string;
  nameEn: string;
  nameAr: string;
  prefixes: string[];
  blPrefixes: string[];
  trackUrl: (ref: string, kind: 'container' | 'bl') => string;
  portalHome: string;
}

export interface ReferenceIssuerInfo {
  id: string;
  nameEn: string;
  nameAr: string;
  blPrefixes: string[];
  portalHome: string;
  noteEn: string;
  noteAr: string;
}
const CARRIERS: CarrierInfo[] = [
  {
    id: 'msc',
    nameEn: 'MSC',
    nameAr: 'MSC',
    prefixes: ['MSCU', 'MSCB', 'MSCT', 'MEDU'],
    blPrefixes: ['MSCU', 'MEDU'],
    trackUrl: (ref) =>
      `https://www.msc.com/en/track-a-shipment?trackingNumber=${encodeURIComponent(ref)}`,
    portalHome: 'https://www.msc.com/en/track-a-shipment',
  },
  {
    id: 'maersk',
    nameEn: 'Maersk',
    nameAr: 'ميرسك',
    prefixes: ['MAEU', 'MRKU', 'MRSU', 'MSKU', 'MCHU', 'SAFU', 'SEAU', 'SUDU'],
    blPrefixes: ['MAEU', 'SAFM', 'SEAU', 'SUDU'],
    trackUrl: (ref) => `https://www.maersk.com/tracking/${encodeURIComponent(ref)}`,
    portalHome: 'https://www.maersk.com/tracking/',
  },
  {
    id: 'cma',
    nameEn: 'CMA CGM',
    nameAr: 'CMA CGM',
    prefixes: ['CMAU', 'CGMU', 'CMDU', 'APLU', 'ANNU', 'ECMU'],
    blPrefixes: ['CMDU', 'CMAU', 'APLU', 'ANNU'],
    trackUrl: (ref) =>
      `https://www.cma-cgm.com/ebusiness/tracking/search?SearchType=container&SearchNumber=${encodeURIComponent(ref)}`,
    portalHome: 'https://www.cma-cgm.com/ebusiness/tracking',
  },
  {
    id: 'hapag',
    nameEn: 'Hapag-Lloyd',
    nameAr: 'هاباغ لويد',
    prefixes: ['HLCU', 'HLXU', 'HLBU', 'UACU'],
    blPrefixes: ['HLCU', 'UACU'],
    trackUrl: (ref) =>
      `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${encodeURIComponent(ref)}`,
    portalHome:
      'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html',
  },
  {
    id: 'cosco',
    nameEn: 'COSCO',
    nameAr: 'كوسكو',
    prefixes: ['COSU', 'CBHU', 'CSNU', 'CCLU'],
    blPrefixes: ['COSU'],
    trackUrl: () => 'https://elines.coscoshipping.com/ebusiness/',
    portalHome: 'https://elines.coscoshipping.com/ebusiness/',
  },
  {
    id: 'evergreen',
    nameEn: 'Evergreen',
    nameAr: 'إيفرغرين',
    prefixes: ['EGHU', 'EMCU', 'EISU', 'EGSU'],
    blPrefixes: ['EGLV'],
    trackUrl: () => 'https://www.evergreen-line.com/',
    portalHome: 'https://www.evergreen-line.com/',
  },
  {
    id: 'one',
    nameEn: 'ONE',
    nameAr: 'ONE',
    prefixes: ['ONEY', 'ONEU', 'NYKU', 'MOLU', 'KKFU'],
    blPrefixes: ['ONEY'],
    trackUrl: () => 'https://ecomm.one-line.com/ecom/CUP_HOM_3301.do?sessLocale=en',
    portalHome: 'https://ecomm.one-line.com/',
  },
  {
    id: 'yangming',
    nameEn: 'Yang Ming',
    nameAr: 'يانغ مينغ',
    prefixes: ['YMLU', 'YMMU'],
    blPrefixes: ['YMLU'],
    trackUrl: () => 'https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx',
    portalHome: 'https://www.yangming.com/',
  },
  {
    id: 'zim',
    nameEn: 'ZIM',
    nameAr: 'زيم',
    prefixes: ['ZIMU', 'ZCSU'],
    blPrefixes: ['ZIMU'],
    trackUrl: (ref) =>
      `https://www.zim.com/tools/track-a-shipment?consnumber=${encodeURIComponent(ref)}`,
    portalHome: 'https://www.zim.com/tools/track-a-shipment',
  },
  {
    id: 'arkas',
    nameEn: 'Arkas',
    nameAr: 'أركاس',
    prefixes: ['ARKU', 'ARCU'],
    blPrefixes: ['ARKU'],
    trackUrl: () => 'https://www.arkasline.com.tr/en',
    portalHome: 'https://www.arkasline.com.tr/en',
  },
  {
    id: 'wanhai',
    nameEn: 'Wan Hai Lines',
    nameAr: 'وان هاي',
    prefixes: ['WHSU', 'WHLU', 'WHLC'],
    blPrefixes: ['WHLC'],
    trackUrl: () => 'https://www.wanhai.com/views/cargoTrack/CargoTrack.xhtml',
    portalHome: 'https://www.wanhai.com/views/cargoTrack/CargoTrack.xhtml',
  },
  {
    id: 'pil',
    nameEn: 'PIL',
    nameAr: 'PIL',
    prefixes: ['PILU', 'PONU', 'PCIU'],
    blPrefixes: ['PILU'],
    trackUrl: () => 'https://www.pilship.com/',
    portalHome: 'https://www.pilship.com/',
  },
  {
    id: 'hmm',
    nameEn: 'HMM',
    nameAr: 'HMM',
    prefixes: ['HDMU', 'HMMU'],
    blPrefixes: ['HDMU'],
    trackUrl: () => 'https://www.hmm21.com/e-service/search/index.do?query=cargo+tracking',
    portalHome: 'https://www.hmm21.com/e-service/search/index.do?query=cargo+tracking',
  },
  {
    id: 'oocl',
    nameEn: 'OOCL',
    nameAr: 'OOCL',
    prefixes: ['OOLU', 'OOCU'],
    blPrefixes: ['OOLU'],
    trackUrl: () => 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/pages/cargotracking.aspx',
    portalHome: 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/pages/cargotracking.aspx',
  },
  {
    id: 'goldstar',
    nameEn: 'Gold Star Line',
    nameAr: 'غولد ستار لاين',
    prefixes: ['GSLU'],
    blPrefixes: ['GSLU'],
    trackUrl: () => 'https://www.goldstarline.com/tools/track-a-shipment',
    portalHome: 'https://www.goldstarline.com/tools/track-a-shipment',
  },
  {
    id: 'matson',
    nameEn: 'Matson',
    nameAr: 'ماتسون',
    prefixes: ['MATU'],
    blPrefixes: ['MATS'],
    trackUrl: () => 'https://www.matson.com/shipment-tracking.html',
    portalHome: 'https://www.matson.com/shipment-tracking.html',
  },
  {
    id: 'acl',
    nameEn: 'Atlantic Container Line (ACL)',
    nameAr: 'أتلانتيك كونتينر لاين',
    prefixes: ['ACLU'],
    blPrefixes: ['ACLU'],
    trackUrl: () => 'https://www.aclcargo.com/track-cargo/',
    portalHome: 'https://www.aclcargo.com/track-cargo/',
  },
  {
    id: 'grimaldi',
    nameEn: 'Grimaldi Lines',
    nameAr: 'غريمالدي لاينز',
    prefixes: ['GRIU'],
    blPrefixes: ['GRIU'],
    trackUrl: () => 'https://www.grimaldi.napoli.it/en/track_trace.html',
    portalHome: 'https://www.grimaldi.napoli.it/en/track_trace.html',
  },
  {
    id: 'esl',
    nameEn: 'Emirates Shipping Line',
    nameAr: 'خط الإمارات للشحن',
    prefixes: ['ESLU'],
    blPrefixes: ['ESLU'],
    trackUrl: () => 'https://www.emiratesline.com/track/',
    portalHome: 'https://www.emiratesline.com/track/',
  },
  {
    id: 'sealead',
    nameEn: 'SeaLead',
    nameAr: 'سي ليد',
    prefixes: [],
    blPrefixes: [],
    trackUrl: () => 'https://www.sea-lead.com/',
    portalHome: 'https://www.sea-lead.com/',
  },
  {
    id: 'tslines',
    nameEn: 'T.S. Lines',
    nameAr: 'تي إس لاينز',
    prefixes: ['TSLU'],
    blPrefixes: ['TSLU'],
    trackUrl: () => 'https://www.tslines.com/en/E-service?golink=CARGO+TRACKING',
    portalHome: 'https://www.tslines.com/en/E-service?golink=CARGO+TRACKING',
  },
  {
    id: 'sitc',
    nameEn: 'SITC',
    nameAr: 'SITC',
    prefixes: ['SITU'],
    blPrefixes: ['SITC'],
    trackUrl: () => 'https://www.sitc.com/',
    portalHome: 'https://www.sitc.com/',
  },
  {
    id: 'kmtc',
    nameEn: 'KMTC',
    nameAr: 'KMTC',
    prefixes: ['KMTU'],
    blPrefixes: ['KMTC'],
    trackUrl: () => 'https://www.ekmtc.com/',
    portalHome: 'https://www.ekmtc.com/',
  },
  {
    id: 'sinokor',
    nameEn: 'Sinokor',
    nameAr: 'سينوكور',
    prefixes: ['SKLU'],
    blPrefixes: ['HASL'],
    trackUrl: () => 'https://www.sinokor.co.kr/en/index.html',
    portalHome: 'https://www.sinokor.co.kr/en/index.html',
  },
  {
    id: 'smline',
    nameEn: 'SM Line',
    nameAr: 'إس إم لاين',
    prefixes: ['SMCU'],
    blPrefixes: ['SMLM'],
    trackUrl: () => 'https://esvc.smlines.com/smline/CUP_HOM_3000.do?redir=Y&targetURL=CUP_HOM_1030.do',
    portalHome: 'https://esvc.smlines.com/smline/CUP_HOM_3000.do?redir=Y&targetURL=CUP_HOM_1030.do',
  },
  {
    id: 'rcl',
    nameEn: 'Regional Container Lines (RCL)',
    nameAr: 'ريجنال كونتينر لاينز',
    prefixes: ['RCLU'],
    blPrefixes: [],
    trackUrl: () => 'https://isecure.rclgroup.com/Home',
    portalHome: 'https://isecure.rclgroup.com/Home',
  },
  {
    id: 'culines',
    nameEn: 'China United Lines (CU Lines)',
    nameAr: 'تشاينا يونايتد لاينز',
    prefixes: ['CULU'],
    blPrefixes: ['CULU'],
    trackUrl: () => 'https://www.culines.com/',
    portalHome: 'https://www.culines.com/',
  },
  {
    id: 'samudera',
    nameEn: 'Samudera Shipping Line',
    nameAr: 'ساموديرا للشحن',
    prefixes: [],
    blPrefixes: [],
    trackUrl: () => 'https://www.samudera.id/sisb/en/',
    portalHome: 'https://www.samudera.id/sisb/en/',
  },
  {
    id: 'namsung',
    nameEn: 'Namsung Shipping',
    nameAr: 'نامسونغ للشحن',
    prefixes: [],
    blPrefixes: [],
    trackUrl: () => 'https://ebiz.namsung.co.kr/',
    portalHome: 'https://ebiz.namsung.co.kr/',
  },
  {
    id: 'spil',
    nameEn: 'SPIL',
    nameAr: 'SPIL',
    prefixes: ['SPNU'],
    blPrefixes: [],
    trackUrl: () => 'https://www.spil.co.id/',
    portalHome: 'https://www.spil.co.id/',
  },
  {
    id: 'turkon',
    nameEn: 'Turkon Line',
    nameAr: 'توركون لاين',
    prefixes: ['TRKU', 'TURU'],
    blPrefixes: ['TRKU'],
    trackUrl: () => 'https://turkon.com/en/online-services',
    portalHome: 'https://turkon.com/en/online-services',
  },
  {
    id: 'tarros',
    nameEn: 'Tarros',
    nameAr: 'تاروس',
    prefixes: ['TARU'],
    blPrefixes: ['TARU'],
    trackUrl: () => 'https://www.tarros.it/en/tracking/',
    portalHome: 'https://www.tarros.it/en/tracking/',
  },
  {
    id: 'xpress',
    nameEn: 'X-Press Feeders',
    nameAr: 'إكس برس فيدرز',
    prefixes: [],
    blPrefixes: [],
    trackUrl: () => 'https://www.x-pressfeeders.com/',
    portalHome: 'https://www.x-pressfeeders.com/',
  },
  {
    id: 'unifeeder',
    nameEn: 'Unifeeder',
    nameAr: 'يونيفيدر',
    prefixes: [],
    blPrefixes: [],
    trackUrl: () => 'https://www.unifeeder.com/track-and-trace',
    portalHome: 'https://www.unifeeder.com/track-and-trace',
  },
  {
    id: 'gfs',
    nameEn: 'Global Feeder Shipping (GFS)',
    nameAr: 'جلوبال فيدر للشحن',
    prefixes: ['GFSU'],
    blPrefixes: [],
    trackUrl: () => 'https://globalfeeders.com/en/',
    portalHome: 'https://globalfeeders.com/en/',
  },
];

const REFERENCE_ISSUERS: ReferenceIssuerInfo[] = [
  {
    id: 'winlu',
    nameEn: 'Winlu Group',
    nameAr: 'مجموعة وينلو',
    blPrefixes: ['WINLU'],
    portalHome: 'https://winlugroup.com/',
    noteEn:
      'This appears to be a house B/L issued by a freight forwarder. It does not identify the underlying ocean carrier; use the master B/L, container number, or carrier name printed on the document.',
    noteAr:
      'يبدو أن هذا الرقم بوليصة شحن داخلية صادرة عن وكيل شحن. ولا يحدد الناقل البحري الفعلي؛ استخدم البوليصة الرئيسية أو رقم الحاوية أو اسم الخط المطبوع على المستند.',
  },
];

const ISO_CONTAINER = /^[A-Z]{3}[UJZ][0-9]{7}$/;
const ISO_6346_LETTER_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19,
  J: 20, K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29,
  S: 30, T: 31, U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

export function normalizeContainer(raw: string): string {
  return raw.replace(/[\s\-./]/g, '').toUpperCase();
}

/** Extract the first standard container token from pasted labels or prose. */
export function extractContainerCandidate(raw: string): string {
  const normalized = normalizeContainer(raw);
  if (ISO_CONTAINER.test(normalized)) return normalized;
  return normalized.match(/[A-Z]{3}[UJZ][0-9]{7}/)?.[0] || normalized;
}

export function isIsoContainerFormat(raw: string): boolean {
  return ISO_CONTAINER.test(normalizeContainer(raw));
}

export function hasValidIsoContainerCheckDigit(raw: string): boolean {
  const normalized = normalizeContainer(raw);
  if (!ISO_CONTAINER.test(normalized)) return false;
  let sum = 0;
  for (let index = 0; index < 10; index += 1) {
    const character = normalized[index];
    const value = /[0-9]/.test(character)
      ? Number(character)
      : ISO_6346_LETTER_VALUES[character];
    sum += value * (2 ** index);
  }
  return (sum % 11) % 10 === Number(normalized[10]);
}

export function detectCarrier(containerNo?: string): CarrierInfo | null {
  if (!containerNo) return null;
  const c = extractContainerCandidate(containerNo);
  for (const car of CARRIERS) {
    if (car.prefixes.some((p) => c.startsWith(p))) return car;
  }
  return null;
}

export function detectCarrierFromBillOfLading(reference?: string): CarrierInfo | null {
  if (!reference) return null;
  const normalized = normalizeContainer(reference);
  return CARRIERS.find((carrier) => carrier.blPrefixes.some((prefix) => normalized.startsWith(prefix))) || null;
}

export function detectReferenceIssuer(reference?: string): ReferenceIssuerInfo | null {
  if (!reference) return null;
  const normalized = normalizeContainer(reference);
  return REFERENCE_ISSUERS.find((issuer) => issuer.blPrefixes.some((prefix) => normalized.startsWith(prefix))) || null;
}
export function listPublicCarriers(): CarrierInfo[] {
  return [...CARRIERS].sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}

export function buildPublicTrackingLink(
  reference: string,
  kind: 'container' | 'bl',
  carrierId?: string,
): {
  carrier: CarrierInfo | null;
  issuer: ReferenceIssuerInfo | null;
  url: string | null;
  normalizedReference: string;
} {
  const normalizedReference =
    kind === 'container' ? extractContainerCandidate(reference) : normalizeContainer(reference);
  if (!normalizedReference) return { carrier: null, issuer: null, url: null, normalizedReference };

  const selectedCarrier = carrierId
    ? CARRIERS.find((candidate) => candidate.id === carrierId) || null
    : null;
  const carrier = selectedCarrier || (
    kind === 'container'
      ? detectCarrier(normalizedReference)
      : detectCarrierFromBillOfLading(normalizedReference)
  );
  const issuer = kind === 'bl' && !carrier ? detectReferenceIssuer(normalizedReference) : null;

  return {
    carrier,
    issuer,
    url: carrier ? carrier.trackUrl(normalizedReference, kind) : null,
    normalizedReference,
  };
}

export function runCarrierTrackAgent(input: AgentRunInput): AgentRunResult {
  const suggestions: AgentSuggestion[] = [];
  const container = (input.containerNo || input.query || '').trim();
  const bl = (input.blNo || '').trim();
  const norm = container ? extractContainerCandidate(container) : '';
  const carrier = detectCarrier(norm);
  const isoOk = norm ? isIsoContainerFormat(norm) : false;

  suggestions.push({
    id: 'policy',
    agentId: 'carrier_track',
    titleEn: 'No automated shipping-line login',
    titleAr: 'لا تسجيل دخول آلي لخطوط الشحن',
    bodyEn:
      'Raya never stores line passwords or drives browser login. Use public track links or official carrier APIs under your own contract.',
    bodyAr:
      'راية لا تخزّن كلمات مرور الخط ولا تشغّل تسجيل دخول بالمتصفح. استخدم روابط التتبع العامة أو واجهات الخط الرسمية بموجب عقدك.',
    confidence: 'high',
    priority: 100,
  });

  if (norm && !isoOk) {
    suggestions.push({
      id: 'format-warning',
      agentId: 'carrier_track',
      titleEn: 'Container number format needs review',
      titleAr: 'صيغة رقم الحاوية تحتاج إلى مراجعة',
      bodyEn: `ISO container identifiers normally contain four owner/category letters followed by seven digits. Review “${norm}”; if it is a B/L or booking number, use the B/L field and select the carrier from the document.`,
      bodyAr: `يتكون رقم الحاوية القياسي عادةً من أربعة أحرف للمالك/الفئة ثم سبعة أرقام. راجع «${norm}»؛ وإذا كان رقم بوليصة أو حجز فاستخدم حقل البوليصة واختر الخط من المستند.`,
      confidence: 'high',
      priority: 95,
      meta: { reference: norm, length: String(norm.length) },
    });
  }
  if (carrier && norm) {
    const url = carrier.trackUrl(norm, 'container');
    suggestions.push({
      id: 'carrier-hit',
      agentId: 'carrier_track',
      titleEn: `Likely carrier: ${carrier.nameEn}`,
      titleAr: `الخط المحتمل: ${carrier.nameAr}`,
      bodyEn: `Container ${norm} prefix matches ${carrier.nameEn}. Open public tracking, then update discharge / free day on the case if needed.`,
      bodyAr: `بادئة الحاوية ${norm} تطابق ${carrier.nameAr}. افتح التتبع العام ثم حدّث التفريغ/اليوم المجاني في الملف إن لزم.`,
      confidence: 'medium',
      priority: 90,
      links: [
        {
          href: url,
          labelEn: `Track ${norm} on ${carrier.nameEn}`,
          labelAr: `تتبع ${norm} على ${carrier.nameAr}`,
        },
        {
          href: carrier.portalHome,
          labelEn: `${carrier.nameEn} home`,
          labelAr: `موقع ${carrier.nameAr}`,
        },
      ],
      meta: { carrier: carrier.id, carrierName: carrier.nameEn, container: norm },
    });
  } else if (norm) {
    suggestions.push({
      id: 'unknown-prefix',
      agentId: 'carrier_track',
      titleEn: 'Carrier not auto-detected',
      titleAr: 'لم يُكتشف الخط تلقائياً',
      bodyEn: `Prefix on ${norm} is not in the map. Use the line name on the B/L and their public track page.`,
      bodyAr: `بادئة ${norm} ليست في الخريطة. استخدم اسم الخط على البوليصة وصفحة التتبع العامة.`,
      confidence: 'low',
      priority: 80,
      links: [
        {
          href: `https://www.google.com/search?q=${encodeURIComponent(norm + ' container tracking')}`,
          labelEn: `Search tracking for ${norm}`,
          labelAr: `بحث تتبع ${norm}`,
        },
      ],
      meta: { container: norm },
    });
  } else {
    suggestions.push({
      id: 'need-container',
      agentId: 'carrier_track',
      titleEn: 'Enter container or select a case',
      titleAr: 'أدخل رقم الحاوية أو اختر ملفاً',
      bodyEn: 'Provide a container (e.g. MSCU1234567) or pick a shipment with containerNo.',
      bodyAr: 'قدّم حاوية (مثل MSCU1234567) أو اختر شحنة فيها containerNo.',
      confidence: 'low',
      priority: 70,
    });
  }

  if (bl) {
    const blUrl = carrier
      ? carrier.trackUrl(bl, 'bl')
      : `https://www.google.com/search?q=${encodeURIComponent(bl + ' bill of lading tracking')}`;
    suggestions.push({
      id: 'bl-track',
      agentId: 'carrier_track',
      titleEn: 'Track by B/L',
      titleAr: 'تتبع بالبوليصة',
      bodyEn: `B/L ${bl} — many lines accept this on the same public form.`,
      bodyAr: `البوليصة ${bl} — كثير من الخطوط تقبلها في نفس النموذج العام.`,
      confidence: 'medium',
      priority: 75,
      links: [
        { href: blUrl, labelEn: `Track B/L ${bl}`, labelAr: `تتبع البوليصة ${bl}` },
      ],
      meta: { bl },
    });
  }

  suggestions.push({
    id: 'act',
    agentId: 'carrier_track',
    titleEn: 'Aqaba terminal (ACT)',
    titleAr: 'محطة العقبة (ACT)',
    bodyEn:
      'After discharge, free time and gate status are on ACT — separate from ocean tracking. Use Raya /track for the agency timeline.',
    bodyAr:
      'بعد التفريغ، المدة المجانية والبوابة على ACT — منفصلة عن التتبع البحري. استخدم /track في راية للخط الزمني.',
    confidence: 'high',
    priority: 60,
    links: [
      { href: 'https://cap.act.com.jo/apex/cap.zul', labelEn: 'ACT portal', labelAr: 'بوابة ACT' },
      { href: '/track', labelEn: 'Raya container board', labelAr: 'لوحة حاويات راية' },
      { href: '/act', labelEn: 'Free-day planner', labelAr: 'مخطط الأيام المجانية' },
    ],
  });

  suggestions.push({
    id: 'manual-update',
    agentId: 'carrier_track',
    titleEn: 'Recommended workflow',
    titleAr: 'سير العمل الموصى به',
    bodyEn:
      '1) Open public carrier link 2) Note vessel/discharge events 3) Update dischargeDate / lastFreeDay / status on the case 4) Approve this card to log a tracking note on the file.',
    bodyAr:
      '1) افتح رابط الخط 2) سجّل أحداث الباخرة/التفريغ 3) حدّث التفريغ/اليوم المجاني/الحالة 4) اعتمد هذه البطاقة لتسجيل ملاحظة تتبع على الملف.',
    confidence: 'high',
    priority: 50,
  });

  if (!carrier) {
    suggestions.push({
      id: 'directory',
      agentId: 'carrier_track',
      titleEn: 'Major public trackers',
      titleAr: 'متتبعات عامة رئيسية',
      bodyEn: 'Pick the line printed on the B/L.',
      bodyAr: 'اختر الخط المطبوع على البوليصة.',
      confidence: 'medium',
      priority: 40,
      links: CARRIERS.filter((c) => c.id !== 'cic').slice(0, 6).map((c) => ({
        href: c.portalHome,
        labelEn: c.nameEn,
        labelAr: c.nameAr,
      })),
    });
  }

  return {
    agentId: 'carrier_track',
    ranAt: new Date().toISOString(),
    suggestions: suggestions.sort((a, b) => b.priority - a.priority),
    disclaimerEn:
      'Public links only. Automated carrier portal login is not supported.',
    disclaimerAr:
      'روابط عامة فقط. تسجيل الدخول الآلي لبوابات الخطوط غير مدعوم.',
  };
}
