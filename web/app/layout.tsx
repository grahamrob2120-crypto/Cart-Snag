import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Cart Snag | G SOFTWARE DEVELOPMENTS', description: 'Created for the people. Founded by the people. Built to serve the people.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
