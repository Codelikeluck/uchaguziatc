export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">404</h1>
        <p className="text-slate-600 mb-6">Page not found</p>
        <a href="/" className="text-atc-primary hover:underline">Return home</a>
      </div>
    </div>
  );
}
