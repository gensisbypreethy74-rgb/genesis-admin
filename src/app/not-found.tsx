import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <h1 className="text-9xl font-black text-slate-200">404</h1>
      <h2 className="text-3xl font-bold text-slate-900 mt-4 mb-2">Page Not Found</h2>
      <p className="text-slate-500 max-w-md mb-8">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
      </p>
      <Link 
        href="/dashboard" 
        className="px-6 py-3 bg-[#5b3db8] hover:bg-[#4a2f96] text-white rounded-lg font-medium transition-colors shadow-sm"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
