import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import prisma from '@/lib/prisma';

const inter = Inter({ subsets: ['latin'] });

async function getAdsAndSettings() {
  try {
    const [ads, settings] = await Promise.all([
      prisma.adsSetting.findFirst(),
      prisma.siteSetting.findMany(),
    ]);
    const settingsMap: Record<string, string> = {};
    for (const s of settings) settingsMap[s.key] = s.value;
    return { ads, settings: settingsMap };
  } catch {
    return { ads: null, settings: {} as Record<string, string> };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { ads, settings } = await getAdsAndSettings();
  const siteName = settings.siteName || 'TimeWise';
  const siteUrl = settings.siteUrl || process.env.SITE_URL || 'https://timewise.online';
  const description = settings.siteDescription || 'Time Zone Converter & Meeting Planner';

  const other: Record<string, string> = {};
  if (ads?.provider === 'adsense' && ads.adsenseClientId) {
    other['google-adsense-account'] = ads.adsenseClientId;
  }
  if (ads?.verificationMeta) {
    // Support generic verification meta like "name=content" format
    const parts = ads.verificationMeta.split('=');
    if (parts.length === 2) {
      other[parts[0].trim()] = parts[1].trim();
    }
  }

  return {
    title: {
      default: `${siteName} — ${description}`,
      template: `%s | ${siteName}`,
    },
    description,
    metadataBase: new URL(siteUrl),
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '32x32' },
        { url: '/icon.svg', type: 'image/svg+xml' },
      ],
    },
    openGraph: {
      type: 'website',
      siteName,
      url: siteUrl,
    },
    twitter: {
      card: 'summary_large_image',
    },
    other: Object.keys(other).length > 0 ? other : undefined,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ads, settings } = await getAdsAndSettings();
  const ga4Id = settings.analyticsGa4;

  return (
    <html lang="en">
      <head>
        {/* AdSense script */}
        {ads?.provider === 'adsense' && ads.adsenseClientId && (
          <Script
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.adsenseClientId}`}
            crossOrigin="anonymous"
          />
        )}
        {/* Custom head HTML from ads settings */}
        {ads?.headHtml && (
          <Script
            id="custom-head-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: ads.headHtml }}
          />
        )}
        {/* GA4 */}
        {ga4Id && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            />
            <Script
              id="ga4-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');`,
              }}
            />
          </>
        )}
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
        {/* Custom body HTML from ads settings */}
        {ads?.bodyHtml && (
          <Script
            id="custom-body-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: ads.bodyHtml }}
          />
        )}
      </body>
    </html>
  );
}
