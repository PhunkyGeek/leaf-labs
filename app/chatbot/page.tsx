// app/chatbot/page.tsx
import NextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ClientPage = NextDynamic(() => import('./ClientPage'), { ssr: false });

export default function Page() {
  return <ClientPage />;
}
