'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Shield, ArrowLeft, CheckCircle, Lock, Fingerprint, 
  Vote, Receipt, AlertCircle, Loader2, Clock 
} from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';

interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  department: string;
  hasVoted: boolean;
}

interface Candidate {
  id: string;
  name: string;
  position: string;
  manifesto: string;
  votes: number;
  imageUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  runningMateId?: string;
}

interface ReceiptData {
  voteHash: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
}

export default function VoterPage() {
  const [step, setStep] = useState<'auth' | 'otp' | 'ballot' | 'confirm' | 'receipt'>('auth');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'sms' | 'auto'>('auto');
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [demoOtp, setDemoOtp] = useState('');
  const [token, setToken] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string>('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [election, setElection] = useState<any>(null);

  useEffect(() => {
    fetchElection();
  }, []);

  const fetchElection = async () => {
    try {
      const res = await fetch('/api/elections');
      const data = await res.json();
      if (data.success) setElection(data.election);
    } catch (e) {
      console.error('Failed to fetch election:', e);
    }
  };

  const requestOTP = async () => {
    setLoading(true);
    setError('');
    setNotification(null);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionNumber, deliveryMethod }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('otp');
        setStudentInfo({
          name: data.studentName,
          contactMethods: data.emailSent ? ['email'] : [],
        });
        if (data.demoOtp) setDemoOtp(data.demoOtp);
        if (data.emailSent) {
          setNotification({ type: 'success', message: `OTP sent to ${data.studentEmail}` });
        } else if (data.emailError) {
          setNotification({ type: 'info', message: `Email delivery issue: ${data.emailError}. Using demo mode.` });
        }
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (e) {
      setError('Network error');
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionNumber, otp }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setStudent(data.student);
        setStep('ballot');
        fetchCandidates();
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (e) {
      setError('Network error');
    }
    setLoading(false);
  };

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/candidates');
      const data = await res.json();
      if (data.success) setCandidates(data.candidates.filter((c: Candidate) => c.status === 'approved'));
    } catch (e) {
      console.error('Failed to fetch candidates:', e);
    }
  };

  const submitVote = async () => {
    if (!selectedTicket) return;
    setLoading(true);
    setError('');
    const pres = candidates.find(c => c.id === selectedTicket);
    try {
      const res = await fetch('/api/vote/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          candidateId: selectedTicket,
          runningMateId: pres?.runningMateId || '',
          electionId: election?.id || 'election_2024' 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReceipt(data.receipt);
        setStep('receipt');
      } else {
        setError(data.error || 'Failed to submit vote');
      }
    } catch (e) {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-atc-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-atc-primary" />
            <span className="font-bold text-slate-900">Student Voter Portal</span>
          </div>
          <div className="w-20"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {['auth', 'otp', 'ballot', 'confirm', 'receipt'].map((s, i) => (
            <div key={s} className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                step === s ? 'bg-atc-primary text-white' :
                ['auth', 'otp', 'ballot', 'confirm', 'receipt'].indexOf(step) > i ? 'bg-atc-secondary text-white' :
                'bg-slate-200 text-slate-500'
              }`}>
                {['auth', 'otp', 'ballot', 'confirm', 'receipt'].indexOf(step) > i ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 4 && (
                <div className={`w-12 h-1 rounded ${
                  ['auth', 'otp', 'ballot', 'confirm', 'receipt'].indexOf(step) > i ? 'bg-atc-secondary' : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {notification && (
          <div className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            {notification.message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Auth Step */}
        {step === 'auth' && (
          <div className="atc-card max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fingerprint className="w-8 h-8 text-atc-primary" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Student Authentication</h2>
              <p className="text-slate-600">Enter your ATC admission number to begin</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Admission Number</label>
                <input
                  type="text"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  placeholder="e.g. 23050513012"
                  className="atc-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">OTP Delivery Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('auto')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                      deliveryMethod === 'auto' 
                        ? 'border-atc-primary bg-blue-50 text-atc-primary' 
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('email')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                      deliveryMethod === 'email' 
                        ? 'border-atc-primary bg-blue-50 text-atc-primary' 
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('sms')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                      deliveryMethod === 'sms' 
                        ? 'border-atc-primary bg-blue-50 text-atc-primary' 
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    SMS
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {deliveryMethod === 'auto' ? 'System will choose best available method' : 
                   deliveryMethod === 'email' ? 'OTP will be sent to your registered email' :
                   'OTP will be sent to your registered phone number'}
                </p>
              </div>
              <button
                onClick={requestOTP}
                disabled={loading || !admissionNumber}
                className="atc-btn-primary w-full justify-center inline-flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                Request OTP
              </button>
            </div>
            {process.env.NODE_ENV !== 'production' && (
              <p className="text-xs text-slate-500 text-center mt-4">
                Demo: Try admission number <strong>23050513012</strong>
              </p>
            )}
          </div>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <div className="atc-card max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-atc-secondary" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify OTP</h2>
              <p className="text-slate-600">
                {studentInfo?.name ? `Hello ${studentInfo.name}, ` : ''}
                Enter the 6-digit code
              </p>
              {demoOtp && (
                <div className="mt-3 inline-block bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                  <p className="text-xs text-amber-700 font-medium">
                    Demo OTP: <span className="font-mono text-lg font-bold tracking-widest">{demoOtp}</span>
                  </p>
                  <p className="text-xs text-amber-500 mt-0.5">
                    In production, this would be sent to your registered email/phone
                  </p>
                </div>
              )}
              {!demoOtp && studentInfo?.contactMethods && (
                <p className="text-xs text-slate-500 mt-1">
                  Sent to your registered {studentInfo.contactMethods.join(' and ')}
                </p>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">One-Time Password</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="atc-input text-center text-2xl tracking-widest"
                />
              </div>
              <button
                onClick={verifyOTP}
                disabled={loading || otp.length !== 6}
                className="atc-btn-secondary w-full justify-center inline-flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Verify & Continue
              </button>
              <button
                onClick={() => setStep('auth')}
                className="w-full text-slate-500 hover:text-slate-700 text-sm py-2"
              >
                Back to Admission Number
              </button>
            </div>
          </div>
        )}

        {/* Ballot Step */}
        {step === 'ballot' && student && (
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Welcome, {student.name}</h2>
                  <p className="text-slate-600">{student.department} · {student.admissionNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  {election?.endDate && (
                    <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                          <CountdownTimer endDate={election.endDate} compact className="text-white" />
                        </div>
                      )}
                      <div className="atc-badge bg-blue-100 text-atc-primary">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified Voter
                  </div>
                </div>
              </div>
            </div>

            {student.hasVoted ? (
              <div className="atc-card text-center py-12">
                <CheckCircle className="w-16 h-16 text-atc-secondary mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Already Voted</h3>
                <p className="text-slate-600">You have already cast your vote in this election.</p>
                <Link href="/results" className="atc-btn-outline mt-6 inline-flex">
                  View Results
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {election?.endDate && (
                  <div className="atc-card bg-gradient-to-r from-atc-primary to-blue-700 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-blue-200" />
                        <div>
                          <p className="text-sm text-blue-200 font-medium">Voting ends in</p>
                          <CountdownTimer endDate={election.endDate} compact />
                        </div>
                      </div>
                      <span className="text-xs text-blue-200">
                        {election.title}
                      </span>
                    </div>
                  </div>
                )}
                <div className="atc-card">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Vote className="w-5 h-5 text-atc-primary" />
                    Presidential Ticket
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Select a President and their running Vice President as a ticket
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {candidates.filter(c => c.position === 'President' && c.runningMateId).map(pres => {
                      const vp = candidates.find(c => c.id === pres.runningMateId);
                      const isSelected = selectedTicket === pres.id;
                      return (
                        <div
                          key={pres.id}
                          onClick={() => setSelectedTicket(pres.id)}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-atc-primary bg-blue-50' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <img 
                              src={pres.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pres.name)}&background=1e40af&color=fff&size=200`}
                              alt={pres.name}
                              className={`w-20 h-20 rounded-full object-cover border-2 flex-shrink-0 ${
                                isSelected ? 'border-atc-primary' : 'border-slate-200'
                              }`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900">{pres.name}</h4>
                                {isSelected && (
                                  <CheckCircle className="w-5 h-5 text-atc-primary" />
                                )}
                              </div>
                              <span className="text-xs text-atc-primary font-medium">President</span>
                              <p className="text-sm text-slate-600 mt-1">{pres.manifesto}</p>
                              {vp && (
                                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
                                  <img 
                                    src={vp.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(vp.name)}&background=8b5cf6&color=fff&size=200`}
                                    alt={vp.name}
                                    className="w-10 h-10 rounded-full object-cover border border-slate-300"
                                  />
                                  <div>
                                    <span className="text-sm font-medium text-slate-700">{vp.name}</span>
                                    <span className="text-xs text-slate-500 ml-1">(VP)</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep('confirm')}
                    disabled={!selectedTicket}
                    className="atc-btn-primary flex-1 justify-center inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Vote className="w-5 h-5" />
                    Review Selection
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirm Step */}
        {step === 'confirm' && selectedTicket && (
          <div className="atc-card max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-atc-accent" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirm Your Vote</h2>
              <p className="text-slate-600">This action is irreversible. Your vote will be encrypted and recorded on the blockchain.</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-6 mb-6 space-y-4">
              <div>
                <div className="text-sm text-slate-500 mb-1">President</div>
                <div className="text-xl font-bold text-slate-900">
                  {candidates.find(c => c.id === selectedTicket)?.name}
                </div>
              </div>
              {candidates.find(c => c.id === selectedTicket)?.runningMateId && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="text-sm text-slate-500 mb-1">Vice President</div>
                  <div className="text-xl font-bold text-slate-900">
                    {candidates.find(c => c.id === candidates.find(p => p.id === selectedTicket)?.runningMateId)?.name}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={submitVote}
                disabled={loading}
                className="atc-btn-primary w-full justify-center inline-flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                Submit Encrypted Vote
              </button>
              <button
                onClick={() => setStep('ballot')}
                disabled={loading}
                className="w-full py-3 text-slate-500 hover:text-slate-700 font-medium"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Receipt Step */}
        {step === 'receipt' && receipt && (
          <div className="atc-card max-w-lg mx-auto text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-atc-secondary" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Vote Recorded!</h2>
            <p className="text-slate-600 mb-8">Your vote has been encrypted and permanently stored on the blockchain.</p>

            <div className="bg-slate-900 text-white rounded-lg p-6 mb-6 text-left space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Vote Hash</span>
                <span className="font-mono text-sm">{receipt.voteHash.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Block Number</span>
                <span className="font-mono">#{receipt.blockNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction</span>
                <span className="font-mono text-sm">{receipt.transactionHash.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp</span>
                <span className="font-mono text-sm">{new Date(receipt.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link 
                href={`/results?verify=${receipt.voteHash}`}
                className="atc-btn-secondary w-full justify-center inline-flex items-center gap-2"
              >
                <Shield className="w-5 h-5" />
                Verify on Blockchain
              </Link>
              <Link href="/results" className="atc-btn-outline w-full justify-center inline-flex">
                View Election Results
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
