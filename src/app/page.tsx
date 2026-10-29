import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect root to dashboard (proxy.ts handles auth checking)
  redirect('/dashboard');
}
