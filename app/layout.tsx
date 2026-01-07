import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chat with Your Documents',
  description: 'RAG application for chatting with your PDF and TXT documents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

