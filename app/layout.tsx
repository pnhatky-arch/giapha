import type { Metadata } from 'next';
import { Lora, Manrope } from 'next/font/google';
import './globals.css';
import './hue-overview.css';

const sans = Manrope({ variable: '--font-sans', subsets: ['latin', 'vietnamese'] });
const serif = Lora({ variable: '--font-serif', subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'GIA PHẢ HỌ PHẠM VĂN',
  description: 'Không gian lưu giữ, kết nối và khám phá các thế hệ dòng họ Phạm Văn.',
  openGraph: {
    title: 'GIA PHẢ HỌ PHẠM VĂN',
    description: 'Gìn giữ cội nguồn – Kết nối các thế hệ.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body className={`${sans.variable} ${serif.variable}`}>{children}</body></html>;
}
