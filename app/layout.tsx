import './globals.css';
import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';

const OpenSans = Open_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Renaissance Innovation labs sign-in register',
  description: 'Modern office attendance management with OTP authentication, real-time tracking, and comprehensive admin dashboard.',
  keywords: 'office, attendance, OTP, check-in, digital register, employee management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={OpenSans.className}>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}