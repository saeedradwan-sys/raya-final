import { Link } from 'react-router-dom';
import { ArrowUpRight, Compass, Mail, ShieldCheck } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { ui } from '@/content/uiLabels';

export default function Footer() {
  const { locale } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="public-footer">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="public-footer__top">
          <div className="public-footer__brand">
            <Link to="/" className="public-brand">
              <span className="public-brand__mark">ر</span>
              <span className="public-brand__name"><strong>{ui.brandName(locale)}</strong><small>{t(locale, 'Customs / freight / Jordan', 'جمارك / شحن / الأردن')}</small></span>
            </Link>
            <p>{t(locale, 'A sharper way through Jordan customs—built for the people keeping goods, businesses, and promises moving.', 'طريقة أكثر وضوحاً عبر الجمارك الأردنية—صُممت لمن يبقون البضائع والأعمال والوعود متحركة.')}</p>
            <span className="public-footer__badge"><ShieldCheck size={14} />{t(locale, 'Human-led operations', 'عمليات بقيادة بشرية')}</span>
          </div>

          <div className="public-footer__column"><span className="footer-label">{t(locale, 'Explore', 'استكشف')}</span><Link to="/workflow">{t(locale, 'How it works', 'كيف نعمل')}<ArrowUpRight size={13} /></Link><Link to="/#services">{t(locale, 'The desk', 'المكتب')}<ArrowUpRight size={13} /></Link><Link to="/hs-search">{t(locale, 'HS desk', 'مكتب HS')}<ArrowUpRight size={13} /></Link><Link to="/laws">{t(locale, 'Field notes', 'ملاحظات ميدانية')}<ArrowUpRight size={13} /></Link></div>
          <div className="public-footer__column"><span className="footer-label">{t(locale, 'Go to work', 'اذهب إلى العمل')}</span><Link to="/portal">{t(locale, 'Client portal', 'بوابة العملاء')}<ArrowUpRight size={13} /></Link><Link to="/staff">{t(locale, 'Staff access', 'دخول الموظفين')}<ArrowUpRight size={13} /></Link><Link to="/track">{t(locale, 'Container tracking', 'تتبع الحاويات')}<ArrowUpRight size={13} /></Link></div>
          <div className="public-footer__column public-footer__contact"><span className="footer-label">{t(locale, 'The desk', 'المكتب')}</span><span><Compass size={14} />{t(locale, 'Amman ↔ Aqaba', 'عمّان ↔ العقبة')}</span><span><Mail size={14} />{t(locale, 'By appointment', 'بموعد')}</span></div>
        </div>
        <div className="public-footer__bottom"><span>© {year} {ui.brandName(locale)}. {t(locale, 'For the next move.', 'للخطوة التالية.')}</span><span>{t(locale, 'Guidance only — confirm current official requirements.', 'إرشاد فقط — تحقق من المتطلبات الرسمية الحالية.')}</span></div>
      </div>
    </footer>
  );
}
