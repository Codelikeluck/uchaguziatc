'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Vote, BarChart3, Lock, Blocks, Users, ChevronRight, Clock } from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';

export default function HomePage() {
  const [election, setElection] = useState<any>(null);

  useEffect(() => {
    fetch('/api/elections').then(r => r.json()).then(d => { if (d.success) setElection(d.election); }).catch(() => {});
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-atc-primary rounded-lg flex items-center justify-center">
                <Blocks className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">ATC Voting</h1>
                <p className="text-xs text-slate-500">Blockchain Secured</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/voter" className="text-slate-600 hover:text-atc-primary font-medium transition-colors">
                Student Voter
              </Link>
              <Link href="/candidate" className="text-slate-600 hover:text-atc-primary font-medium transition-colors">
                Candidates
              </Link>
              <Link href="/results" className="text-slate-600 hover:text-atc-primary font-medium transition-colors">
                Public Results
              </Link>
              <Link href="/admin" className="atc-btn-primary text-sm py-2 px-4">
                Admin Portal
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {election?.endDate && (
        <div className="bg-gradient-to-r from-atc-primary to-blue-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-white">
              <Clock className="w-4 h-4 text-blue-200" />
              <span className="text-sm text-blue-100">{election.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-200 font-medium">Voting ends in</span>
              <CountdownTimer endDate={election.endDate} compact />
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-8">
              <Shield className="w-4 h-4 text-atc-primary" />
              <span className="text-sm font-medium text-atc-primary">Powered by Ethereum Smart Contracts</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
              Secure Digital Democracy for{" "}
              <span className="text-atc-primary">ATC Students</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Arusha Technical College's blockchain-based voting system ensures every vote is 
              immutable, verifiable, and counted with mathematical precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/voter" className="atc-btn-primary text-lg inline-flex items-center gap-2">
                <Vote className="w-5 h-5" />
                Cast Your Vote
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link href="/results" className="atc-btn-outline text-lg inline-flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                View Live Results
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-atc-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-1">SHA-256</div>
              <div className="text-blue-200 text-sm">Cryptographic Hashing</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-1">100%</div>
              <div className="text-blue-200 text-sm">Verifiable Results</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-1">AES-256</div>
              <div className="text-blue-200 text-sm">Vote Encryption</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-1">PoA</div>
              <div className="text-blue-200 text-sm">Clique Consensus</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">System Architecture</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Built on the five-layer architecture from the ATC research proposal, 
              ensuring separation of concerns and independent security.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Lock className="w-8 h-8 text-atc-primary" />}
              title="Voter Authentication"
              desc="Multi-factor authentication using ATC admission numbers and OTP verification with JWT session management."
            />
            <FeatureCard 
              icon={<Blocks className="w-8 h-8 text-atc-secondary" />}
              title="Smart Contracts"
              desc="Four interconnected Solidity contracts enforce electoral rules with mathematical precision on a private Ethereum network."
            />
            <FeatureCard 
              icon={<Shield className="w-8 h-8 text-atc-accent" />}
              title="Zero-Knowledge Proofs"
              desc="ZK-SNARK protocol ensures ballot validity is proven without revealing candidate selection to anyone."
            />
            <FeatureCard 
              icon={<Vote className="w-8 h-8 text-atc-primary" />}
              title="Encrypted Voting"
              desc="AES-256-GCM encryption with IPFS off-chain storage. Only the voter can verify their own ballot content."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-8 h-8 text-atc-secondary" />}
              title="Real-Time Tallying"
              desc="TallyContract maintains running vote counts updated atomically with each confirmed transaction."
            />
            <FeatureCard 
              icon={<Users className="w-8 h-8 text-atc-accent" />}
              title="Public Verification"
              desc="Any observer can independently inspect election transactions through the integrated block explorer."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Transform SOATECO Elections?</h2>
          <p className="text-slate-400 mb-10 text-lg">
            This system replaces trusted intermediaries with mathematical certainty. 
            Every vote is timestamped, immutable, and publicly verifiable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/voter" className="bg-white text-slate-900 hover:bg-slate-100 font-bold py-4 px-8 rounded-lg transition-colors inline-flex items-center gap-2 justify-center">
              <Vote className="w-5 h-5" />
              Start Voting
            </Link>
            <Link href="/candidate" className="border-2 border-white text-white hover:bg-white hover:text-slate-900 font-bold py-4 px-8 rounded-lg transition-colors inline-flex items-center gap-2 justify-center">
              <Users className="w-5 h-5" />
              Register as Candidate
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Blocks className="w-6 h-6 text-atc-primary" />
            <span className="font-bold text-slate-900">ATC Blockchain Voting System</span>
          </div>
          <p className="text-slate-500 text-sm">
            Arusha Technical College · SOATECO General Elections · Final Year Project 2026
          </p>
          <p className="text-slate-400 text-xs mt-2">
            Supervisor: M/S Jane Lissah · Student: Goodluck Francis (23050513012)
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="atc-card hover:shadow-xl transition-shadow duration-300">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}
