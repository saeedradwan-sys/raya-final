import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoadingBlock from '@/components/LoadingBlock';
import ScrollToTop from '@/components/ScrollToTop';
import CommandPalette from '@/components/CommandPalette';
import PlatformStatusBanner from '@/components/PlatformStatusBanner';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';

export default function RootLayout() {
  const { locale } = useLocale();

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent focus:text-white focus:text-sm"
      >
        {t(locale, 'Skip to content', 'تخطَّ إلى المحتوى')}
      </a>
      <Header />
      <PlatformStatusBanner />
      <CommandPalette />
      <main id="main-content" className="flex-1 pb-safe" tabIndex={-1}>
        <Suspense fallback={<LoadingBlock rows={3} className="mx-auto max-w-6xl px-4 py-12 lg:px-8" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
