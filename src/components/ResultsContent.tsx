'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, BarChart3, Shield, Blocks, Search, CheckCircle, 
  AlertCircle, Loader2, TrendingUp, Users, Clock 
} from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';

interface Result {
  position: string;
  candidates: {
    id: string;
    name: string;
    votes: number;
    percentage: number;
    imageUrl?: string;
    runningMateId?: string;
    runningMateName?: string;
    runningMateImage?: string;
  }[];
}

export default function ResultsContent() {
  const searchParams = useSearchParams();
  const verifyHash = searchParams.get('verify');

  const [results, setResults] = useState<Result[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [verification, setVerification] = useState<any>(null);
  const [verifyInput, setVerifyInput] = useState(verifyHash || '');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'explorer'>('results');
  const [election, setElection] = useState<any>(null);

  useEffect(() => {
    fetchElection();
    fetchResults();
    fetchBlocks();
    if (verifyHash) handleVerify(verifyHash);
  }, []);

  const fetchElection = async () => {
    try {
      const res = await fetch('/api/elections');
      const data = await res.json();
      if (data.success) setElection(data.election);
    } catch (e) { console.error('Failed to fetch election:', e); }
  };

  const fetchResults = async () => {
    try {
      const res = await fetch('/api/candidates');
      const data = await res.json();
      if (data.success) {
        const allCandidates = data.candidates.filter((c: any) => c.status === 'approved');
        const positions = Array.from(new Set<string>(allCandidates.map((c: any) => c.position as string)));

        const formatted: Result[] = positions.map((pos: string) => {
          const posCandidates = allCandidates.filter((c: any) => c.position === pos);
          const totalVotes = posCandidates.reduce((sum: number, c: any) => sum + c.votes, 0);

          return {
            position: pos,
            candidates: posCandidates
              .map((c: any) => ({
                id: c.id,
                name: c.name,
                votes: c.votes,
                percentage: totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0,
                imageUrl: c.imageUrl,
                runningMateId: c.runningMateId,
              }))
              .sort((a: any, b: any) => b.votes - a.votes),
          };
        });

        // Show President tickets with running mates
        const presSlot = formatted.find(f => f.position === 'President');
        if (presSlot) {
          const vpCandidates = allCandidates.filter((c: any) => c.position === 'Vice President');
          presSlot.candidates = presSlot.candidates.map((c: any) => {
            const vp = vpCandidates.find((v: any) => v.id === c.runningMateId);
            return { ...c, runningMateName: vp?.name || '', runningMateImage: vp?.imageUrl || '' };
          });
        }

        // Remove VP as a separate position (shown as running mates under President)
        setResults(formatted.filter(f => f.position !== 'Vice President'));
      }
    } catch (e) { console.error('Fetch results error:', e); }
  };

  const fetchBlocks = async () => {
    try {
      const res = await fetch('/api/blocks');
      const data = await res.json();
      if (data.success) {
        setBlocks(data.chain);
      }
    } catch (e) {
      console.error('Failed to fetch blocks:', e);
    }
  };

  const handleVerify = async (hash: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vote/verify?hash=${hash}`);
      const data = await res.json();
      if (data.success) {
        setVerification(data);
      } else {
        setVerification({ error: data.error });
      }
    } catch (e) {
      setVerification({ error: 'Network error' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-atc-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-atc-primary" />
            <span className="font-bold text-slate-900">Public Results & Verification</span>
          </div>
          <div className="w-20"></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {election?.endDate && (
          <div className="atc-card bg-gradient-to-r from-atc-primary to-blue-700 text-white mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-200" />
                <div>
                  <p className="text-sm text-blue-200 font-medium">Voting ends in</p>
                  <CountdownTimer endDate={election.endDate} compact />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-200">{election.title}</p>
                <p className="text-xs text-blue-300">
                  Started {new Date(election.startDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Verification Hero */}
        <div className="atc-card mb-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-atc-primary" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Verify Your Vote on the Blockchain</h2>
            <p className="text-slate-600 text-sm mt-1">
              Enter your vote hash to cryptographically verify its inclusion in the ATC Voting Ledger
            </p>
          </div>
          <div className="flex gap-3 max-w-xl mx-auto">
            <input
              type="text"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder="Paste your vote hash here..."
              className="atc-input flex-1"
            />
            <button
              onClick={() => handleVerify(verifyInput)}
              disabled={loading || !verifyInput}
              className="atc-btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Verify
            </button>
          </div>

          {verification && !verification.error && (
            <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <h3 className="font-bold text-emerald-800">Vote Cryptographically Verified</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Block Number:</span>
                    <span className="font-mono font-bold">#{verification.blockchain?.blockNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Merkle Valid:</span>
                    <span className={`font-bold ${verification.blockchain?.merkleValid ? 'text-emerald-600' : 'text-red-600'}`}>
                      {verification.blockchain?.merkleValid ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Timestamp:</span>
                    <span className="font-mono">{new Date(verification.vote?.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Transaction:</span>
                    <span className="font-mono text-xs">{verification.blockchain?.blockHash?.slice(0, 20)}...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {verification?.error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              {verification.error}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'results' ? 'bg-atc-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Election Results
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'explorer' ? 'bg-atc-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Blocks className="w-4 h-4 inline mr-2" />
            Block Explorer
          </button>
        </div>

        {activeTab === 'results' && (
          <div className="space-y-8">
            {results.map((result) => (
              <div key={result.position} className="atc-card">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-atc-primary" />
                  {result.position}
                </h3>
                <div className="space-y-4">
                  {result.candidates.map((candidate, idx) => (
                    <div key={candidate.id} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <img 
                            src={candidate.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=1e40af&color=fff&size=200`}
                            alt={candidate.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{candidate.name}</span>
                              {idx === 0 && (
                                <span className="atc-badge bg-amber-100 text-amber-700 text-xs">
                                  Leading
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              {candidate.runningMateName && (
                                <span>Running with {candidate.runningMateName}</span>
                              )}
                              {!candidate.runningMateName && (
                                <span>{idx + 1}{idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} place</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">{candidate.votes} votes</div>
                          <div className="text-sm text-slate-500">{candidate.percentage}%</div>
                        </div>
                      </div>
                      {candidate.runningMateName && (
                        <div className="ml-12 mb-2 flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                          <img 
                            src={candidate.runningMateImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.runningMateName)}&background=8b5cf6&color=fff&size=200`}
                            alt={candidate.runningMateName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-300"
                          />
                          <span className="text-xs text-slate-600">
                            <span className="font-medium text-slate-700">{candidate.runningMateName}</span> — Vice President
                          </span>
                        </div>
                      )}
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            idx === 0 ? 'bg-atc-primary' :
                            idx === 1 ? 'bg-atc-secondary' :
                            'bg-slate-400'
                          }`}
                          style={{ width: `${candidate.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {results.length === 0 && (
              <div className="atc-card text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No results available yet. Voting is still in progress.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'explorer' && (
          <div className="atc-card">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Blocks className="w-5 h-5 text-atc-primary" />
              ATC Voting Ledger
            </h3>
            {blocks.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {[...blocks].reverse().map((block: any, i: number) => (
                  <div key={block.index} className={`rounded-lg border p-4 ${i === 0 ? 'bg-slate-900 text-white border-slate-700 blockchain-glow' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold ${i === 0 ? 'text-emerald-400' : 'text-slate-900'}`}>
                        Block #{block.index}
                        {block.index === 0 && <span className="ml-2 text-xs font-normal text-slate-400">(Genesis)</span>}
                      </span>
                      <span className={`text-xs ${i === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                        {new Date(block.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                      <div className={i === 0 ? 'text-slate-400' : 'text-slate-500'}>
                        Hash: <span className={i === 0 ? 'text-white' : 'text-slate-800'}>{block.blockHash?.slice(0, 24)}...</span>
                      </div>
                      <div className={i === 0 ? 'text-slate-400' : 'text-slate-500'}>
                        Nonce: <span className={i === 0 ? 'text-white' : 'text-slate-800'}>{block.nonce}</span>
                      </div>
                      <div className={i === 0 ? 'text-slate-400' : 'text-slate-500'}>
                        Merkle: <span className={i === 0 ? 'text-white' : 'text-slate-800'}>{block.merkleRoot?.slice(0, 16)}...</span>
                      </div>
                      <div className={i === 0 ? 'text-slate-400' : 'text-slate-500'}>
                        TXs: <span className={i === 0 ? 'text-white' : 'text-slate-800'}>{block.transactionCount || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900 text-white rounded-lg p-6 text-center">
                <Blocks className="w-8 h-8 mx-auto mb-3 text-slate-500" />
                <p className="text-slate-400 text-sm">No blocks mined yet. Blocks are created as votes are cast.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
