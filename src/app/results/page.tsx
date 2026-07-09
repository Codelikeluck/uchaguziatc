export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import ResultsContent from '@/components/ResultsContent';
import { Loader2 } from 'lucide-react';

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-atc-primary mx-auto mb-4" />
          <p className="text-slate-600">Loading results...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
