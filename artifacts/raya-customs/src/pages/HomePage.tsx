import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  Clock3,
  FileText,
  Globe2,
  MapPin,
  Network,
  Route,
  ShieldCheck,
  Ship,
  Sparkles,
  Waypoints,
} from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';

const SERVICES = [
  {
    number: '01',
    icon: Ship,
    titleEn: 'Clear the hard part',
    titleAr: 'ننجز الجزء الأصعب',
    bodyEn: 'Customs clearance that turns documents, duties, permits, and port steps into one accountable plan.',
    bodyAr: 'تخليص جمركي يحوّل المستندات والرسوم والتصاريح وخطوات الميناء إلى خطة واحدة واضحة المسؤولية.',
    href: '/workflow',
    labelEn: 'See the clearance desk',
    labelAr: 'استكشف مكتب التخليص',
    accent: 'acid',
  },
  {
    number: '02',
    icon: Boxes,
    titleEn: 'Keep cargo moving',
    titleAr: 'أبقِ الشحنة متحركة',
    bodyEn: 'Container visibility, free-time awareness, and practical next actions from port release to final handoff.',
    bodyAr: 'رؤية للحاويات والمدة المجانية والخطوة العملية التالية من الإفراج في الميناء حتى التسليم النهائي.',
    href: '/portal',
    labelEn: 'Open shipment tracking',
    labelAr: 'افتح تتبع الشحنات',
    accent: 'blue',
  },
  {
    number: '03',
    icon: FileText,
    titleEn: 'Make the next move obvious',
    titleAr: 'اجعل الخطوة التالية واضحة',
    bodyEn: 'Jordan-first guidance for HS classification, authorities, requirements, and the decisions that unblock work.',
    bodyAr: 'إرشاد أردني لتصنيف HS والجهات والمتطلبات والقرارات التي تزيل العوائق من طريق العمل.',
    href: '/hs-search',
    labelEn: 'Explore the toolkit',
    labelAr: 'استكشف الأدوات',
    accent: 'orange',
  },
];

const STEPS = [
  { icon: Waypoints, titleEn: 'Brief', titleAr: 'التعريف', bodyEn: 'We get the shipment story, not just a reference number.', bodyAr: 'نفهم قصة الشحنة، وليس رقمها فقط.' },
  { icon: Network, titleEn: 'Route', titleAr: 'تحديد المسار', bodyEn: 'We map the documents, authorities, timing, and handoffs.', bodyAr: 'نحدد المستندات والجهات والتوقيت ونقاط التسليم.' },
  { icon: Check, titleEn: 'Release', titleAr: 'الإفراج', bodyEn: 'You see what moved, what is next, and who owns it.', bodyAr: 'ترى ما تم وما هو التالي ومن يملك المسؤولية.' },
];

function CorridorCard({ locale }: { locale: 'en' | 'ar' }) {
  return (
    <div className="corridor-card" aria-label={t(locale, 'Raya corridor status', 'حالة مسار راية')}>
      <div className="corridor-card__top">
        <div>
          <span className="micro-label">{t(locale, 'RAYA / 01', 'راية / ٠١')}</span>
          <h2>{t(locale, 'The clearance corridor', 'مسار التخليص')}</h2>
        </div>
        <span className="live-chip"><span className="live-dot" />{t(locale, 'Live desk', 'مكتب مباشر')}</span>
      </div>

      <div className="corridor-map" aria-hidden="true">
        <span className="map-grid map-grid--one" />
        <span className="map-grid map-grid--two" />
        <span className="route-line route-line--one" />
        <span className="route-line route-line--two" />
        <span className="route-node route-node--aqaba"><MapPin size={14} /><b>01</b></span>
        <span className="route-node route-node--amman"><MapPin size={14} /><b>02</b></span>
        <span className="route-node route-node--world"><Globe2 size={14} /><b>03</b></span>
        <span className="map-label map-label--aqaba">AQABA</span>
        <span className="map-label map-label--amman">AMMAN</span>
        <span className="map-label map-label--world">WORLD</span>
        <span className="route-pulse" />
      </div>

      <div className="corridor-status">
        <div>
          <span className="status-kicker">{t(locale, 'CURRENT POSITION', 'الموقع الحالي')}</span>
          <strong>{t(locale, 'Documents under review', 'المستندات قيد المراجعة')}</strong>
        </div>
        <Clock3 size={18} />
      </div>

      <div className="corridor-footer">
        <span>{t(locale, 'One accountable desk', 'مكتب واحد واضح المسؤولية')}</span>
        <span>{t(locale, 'Human-approved', 'باعتماد بشري')}</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { locale } = useLocale();

  return (
    <div className="public-home">
      <section className="public-hero">
        <div className="hero-aurora hero-aurora--left" />
        <div className="hero-aurora hero-aurora--right" />
        <div className="hero-rule hero-rule--top" />
        <div className="hero-rule hero-rule--vertical" />
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="public-hero__grid">
            <div className="public-hero__copy">
              <div className="hero-kicker"><Sparkles size={14} />{t(locale, 'Jordan / customs / freight', 'الأردن / الجمارك / الشحن')}</div>
              <h1>{t(locale, 'The clearer way through customs.', 'طريق أوضح عبر الجمارك.')}</h1>
              <p className="public-hero__lead">{t(locale, 'Raya is the Jordan-native clearance desk for people who need cargo to move—and need to know exactly what happens next.', 'راية هي مكتب التخليص الأردني لمن يحتاج أن تتحرك شحنته وأن يعرف بالضبط ما هي الخطوة التالية.')}</p>
              <div className="public-hero__actions">
                <Link to="/portal" className="public-button public-button--acid"><span>{t(locale, 'Track a shipment', 'تتبّع شحنة')}</span><ArrowUpRight size={17} /></Link>
                <Link to="/#services" className="public-button public-button--quiet"><span>{t(locale, 'See what we do', 'اكتشف خدماتنا')}</span><ArrowRight size={17} /></Link>
              </div>
              <div className="hero-note"><span className="hero-note__line" />{t(locale, 'No black box. No orphaned paperwork. Just a next move.', 'لا صندوق أسود. لا أوراق بلا صاحب. فقط خطوة تالية واضحة.')}</div>
            </div>
            <CorridorCard locale={locale} />
          </div>
          <div className="hero-bottomline">
            <span>{t(locale, 'Built in Jordan for the way goods actually move.', 'صُمم في الأردن للطريقة التي تتحرك بها البضائع فعلاً.')}</span>
            <span className="hero-bottomline__marker">↓ 31°57′N / 35°56′E</span>
          </div>
        </div>
      </section>

      <section id="services" className="public-section public-section--paper">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="section-heading section-heading--split">
            <div>
              <span className="section-index">01 / {t(locale, 'The desk', 'المكتب')}</span>
              <h2>{t(locale, 'Three ways to get unstuck.', 'ثلاث طرق للخروج من التعطّل.')}</h2>
            </div>
            <p>{t(locale, 'A small, focused operating layer for the moments when a shipment, a document, or a decision is holding everything up.', 'طبقة تشغيل صغيرة ومركّزة للحظات التي تتعطل فيها الشحنة أو المستند أو القرار.')}</p>
          </div>
          <div className="service-grid">
            {SERVICES.map((service) => (
              <Link key={service.number} to={service.href} className={`service-tile service-tile--${service.accent}`}>
                <div className="service-tile__top"><span>{service.number}</span><service.icon size={22} /></div>
                <h3>{t(locale, service.titleEn, service.titleAr)}</h3>
                <p>{t(locale, service.bodyEn, service.bodyAr)}</p>
                <span className="service-tile__link">{t(locale, service.labelEn, service.labelAr)}<ArrowUpRight size={15} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="method" className="public-section public-section--ink">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="method-layout">
            <div className="method-intro">
              <span className="section-index section-index--light">02 / {t(locale, 'The method', 'المنهج')}</span>
              <h2>{t(locale, 'Less chasing. More certainty.', 'مطاردة أقل. يقين أكثر.')}</h2>
              <p>{t(locale, 'The best clearance experience is not louder software. It is a sharper handoff between people, documents, and time.', 'أفضل تجربة تخليص ليست برنامجاً أعلى صوتاً. إنها تسليم أكثر دقة بين الأشخاص والمستندات والوقت.')}</p>
              <div className="method-quote">“{t(locale, 'Every file deserves a next move.', 'كل ملف يستحق خطوة تالية.')}”</div>
            </div>
            <div className="step-list">
              {STEPS.map((step, index) => (
                <div key={step.titleEn} className="step-row">
                  <div className="step-row__number">0{index + 1}</div>
                  <div className="step-row__icon"><step.icon size={19} /></div>
                  <div className="step-row__copy"><h3>{t(locale, step.titleEn, step.titleAr)}</h3><p>{t(locale, step.bodyEn, step.bodyAr)}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="public-section public-section--signal">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="signal-panel">
            <div className="signal-panel__side"><Route size={22} /><span>RAYA / JORDAN</span></div>
            <div className="signal-panel__main">
              <span className="section-index">03 / {t(locale, 'Make it move', 'حرّكها')}</span>
              <h2>{t(locale, 'Bring us the complicated shipment.', 'أحضر لنا الشحنة المعقّدة.')}</h2>
              <p>{t(locale, 'Start with the facts you have. We will help make the next action clear.', 'ابدأ بالحقائق التي لديك. سنساعدك على جعل الخطوة التالية واضحة.')}</p>
              <div className="signal-panel__actions">
                <Link to="/portal" className="public-button public-button--acid">{t(locale, 'Open client portal', 'افتح بوابة العملاء')}<ArrowUpRight size={17} /></Link>
                <Link to="/workflow" className="text-link">{t(locale, 'Read the clearance workflow', 'اقرأ سير عمل التخليص')}<ArrowRight size={16} /></Link>
              </div>
            </div>
            <div className="signal-panel__stamp"><ShieldCheck size={24} /><span>{t(locale, 'Human-led\noperations', 'عمليات\nبقيادة بشرية')}</span></div>
          </div>
        </div>
      </section>

      <div className="public-marquee" aria-hidden="true"><span>TRACK / CLEAR / MOVE / تتبّع / خلّص / تحرّك / </span><span>TRACK / CLEAR / MOVE / تتبّع / خلّص / تحرّك / </span></div>
    </div>
  );
}
