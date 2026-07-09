'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, FileText, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function CandidatePage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    admissionNumber: '',
    position: 'President',
    manifesto: '',
    gpa: '',
    yearOfStudy: '',
  });

  const positions = ['President', 'Vice President', 'Secretary General', 'Treasurer'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          studentId: 'stud_' + Date.now(),
          documents: [],
          status: 'pending',
          votes: 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to submit');
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
            <Users className="w-5 h-5 text-atc-primary" />
            <span className="font-bold text-slate-900">Candidate Registration</span>
          </div>
          <div className="w-20"></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {submitted ? (
          <div className="atc-card text-center py-12">
            <CheckCircle className="w-16 h-16 text-atc-secondary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
            <p className="text-slate-600 mb-6">
              Your candidacy application has been received and is pending review by SOATECO officials.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-bold text-atc-primary mb-2">What happens next?</h4>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>1. SOATECO admin will verify your eligibility (GPA ≥ 3.0, current student)</li>
                <li>2. Your documents will be reviewed for completeness</li>
                <li>3. Approved candidates will appear on the digital ballot</li>
                <li>4. You will be notified via email once approved</li>
              </ul>
            </div>
            <Link href="/" className="atc-btn-primary inline-flex">
              Return Home
            </Link>
          </div>
        ) : (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-atc-primary" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Candidate Application</h2>
              <p className="text-slate-600">Register to contest in the SOATECO General Elections</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="atc-card space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="atc-input"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Admission Number</label>
                  <input
                    required
                    type="text"
                    value={form.admissionNumber}
                    onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })}
                    className="atc-input"
                    placeholder="23050513012"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="atc-input"
                  >
                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Current GPA</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={form.gpa}
                    onChange={(e) => setForm({ ...form, gpa: e.target.value })}
                    className="atc-input"
                    placeholder="3.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Year of Study</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="5"
                  value={form.yearOfStudy}
                  onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })}
                  className="atc-input"
                  placeholder="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Manifesto</label>
                <textarea
                  required
                  rows={4}
                  value={form.manifesto}
                  onChange={(e) => setForm({ ...form, manifesto: e.target.value })}
                  className="atc-input"
                  placeholder="Describe your vision and plans for the student body..."
                />
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-atc-primary transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-medium">Upload Supporting Documents</p>
                <p className="text-xs text-slate-500 mt-1">Transcript, recommendation letter, nomination form (PDF)</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-sm text-slate-600">
                <strong className="text-atc-primary">Eligibility Requirements:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Minimum GPA of 3.0</li>
                  <li>Current registered student at ATC</li>
                  <li>No disciplinary sanctions</li>
                  <li>SOATECO membership in good standing</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="atc-btn-primary w-full justify-center inline-flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                Submit Application
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
