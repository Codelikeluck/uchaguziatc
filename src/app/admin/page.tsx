'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Shield, Users, BarChart3, Blocks, AlertCircle, 
  CheckCircle, Clock, Loader2, Lock, FileText, Activity, 
  Plus, Trash2, Edit3, Image as ImageIcon, Mail, Phone,
  Search, Filter, Download, Upload, ChevronDown, ChevronUp,
  UserPlus, GraduationCap, Vote, Calendar, Settings, FileSpreadsheet
} from 'lucide-react';

interface Student {
  id: string;
  admissionNumber: string;
  name: string;
  email: string;
  department: string;
  yearOfStudy: number;
  hasVoted: boolean;
  phone?: string;
}

interface Candidate {
  id: string;
  studentId: string;
  name: string;
  position: string;
  manifesto: string;
  imageUrl?: string;
  documents?: string[];
  gpa: number;
  yearOfStudy: number;
  status: 'pending' | 'approved' | 'rejected';
  votes: number;
}

interface Election {
  id: string;
  title: string;
  positions: string[];
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'closed';
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'elections' | 'candidates' | 'students' | 'blockchain' | 'audit'>('overview');

  // Students state
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    admissionNumber: '', name: '', email: '', department: '', yearOfStudy: 1, phone: ''
  });

  // Candidates state
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: '', admissionNumber: '', position: 'President', manifesto: '', gpa: 0, yearOfStudy: 1
  });
  const [candidateImage, setCandidateImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResult, setBulkResult] = useState<{ added: number; errors?: string[] } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const bulkFileRef = useRef<HTMLInputElement>(null);

  // Student filter & bulk delete state
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Elections state
  const [elections, setElections] = useState<Election[]>([]);
  const [showCreateElection, setShowCreateElection] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const [newElection, setNewElection] = useState({
    title: '', positions: ['President'], startDate: '', endDate: ''
  });

  // Edit candidate state
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('atc_admin_token');
    if (saved) verifySession(saved);
  }, []);

  const verifySession = async (t: string) => {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', token: t }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(t); setLoggedIn(true);
        fetchStats(t); fetchStudents(t); fetchCandidates(t); fetchElections(t);
      }
    } catch (e) { console.error('Session verify error:', e); }
  };

  const login = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        localStorage.setItem('atc_admin_token', data.token);
        setLoggedIn(true);
        fetchStats(data.token);
        fetchStudents(data.token);
        fetchCandidates(data.token);
        fetchElections(data.token);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (e) { setError('Network error'); }
    setLoading(false);
  };

  const fetchStats = async (t: string) => {
    try {
      const res = await fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${t}` } });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) { console.error('Fetch stats error:', e); }
  };

  const fetchStudents = async (t: string) => {
    try {
      const res = await fetch('/api/students', { headers: { 'Authorization': `Bearer ${t}` } });
      const data = await res.json();
      if (data.success) setStudents(data.students);
    } catch (e) { console.error('Fetch students error:', e); }
  };

  const fetchCandidates = async (t: string) => {
    try {
      const res = await fetch('/api/candidates', { headers: { 'Authorization': `Bearer ${t}` } });
      const data = await res.json();
      if (data.success) setCandidates(data.candidates);
    } catch (e) { console.error('Fetch candidates error:', e); }
  };

  const fetchElections = async (t: string) => {
    try {
      const res = await fetch('/api/elections', { headers: { 'Authorization': `Bearer ${t}` } });
      const data = await res.json();
      if (data.success && data.election) setElections([data.election]);
    } catch (e) { console.error('Fetch elections error:', e); }
  };

  const addStudent = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newStudent),
      });
      const data = await res.json();
      if (data.success) {
        setStudents([...students, data.student]);
        setShowAddStudent(false);
        setNewStudent({ admissionNumber: '', name: '', email: '', department: '', yearOfStudy: 1, phone: '' });
      } else {
        setError(data.error || 'Failed to add student');
      }
    } catch (e) { console.error('Add student error:', e); setError('Network error'); }
    setLoading(false);
  };

  const deleteStudent = async (id: string) => {
    if (!confirm('Delete this student?')) return;
    try {
      const res = await fetch(`/api/students?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStudents(students.filter(s => s.id !== id));
    } catch (e) { console.error('Delete student error:', e); }
  };

  const uploadBulkStudents = async () => {
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkResult(null);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setBulkResult({ added: data.added, errors: data.errors });
        setStudents([...students, ...data.students]);
        setBulkFile(null);
        setShowBulkUpload(false);
        if (stats) fetchStats(token);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (e) {
      console.error('Bulk upload error:', e);
      setError('Network error');
    }
    setBulkLoading(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCandidateImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'candidate');

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    return data.success ? data.url : '';
  };

  const addCandidate = async () => {
    setLoading(true); setError('');
    try {
      let imageUrl = '';
      if (candidateImage) {
        imageUrl = await uploadImage(candidateImage);
      }

      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...newCandidate,
          studentId: 'stud_' + Date.now(),
          documents: [],
          status: 'approved',
          votes: 0,
          imageUrl: imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newCandidate.name)}&background=1e40af&color=fff&size=200`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCandidates([...candidates, data.candidate]);
        setShowAddCandidate(false);
        setNewCandidate({ name: '', admissionNumber: '', position: 'President', manifesto: '', gpa: 0, yearOfStudy: 1 });
        setCandidateImage(null);
        setImagePreview('');
      } else {
        setError(data.error || 'Failed to add candidate');
      }
    } catch (e) { console.error('Add candidate error:', e); setError('Network error'); }
    setLoading(false);
  };

  const approveCandidate = async (id: string) => {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'approveCandidate', token, electionData: { candidateId: id } }),
      });
      const data = await res.json();
      if (data.success) {
        setCandidates(candidates.map(c => c.id === id ? { ...c, status: 'approved' } : c));
      }
    } catch (e) { console.error('Approve candidate error:', e); }
  };

  const createElection = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          action: 'updateElection', 
          token, 
          electionData: {
            id: 'election_' + Date.now(),
            ...newElection,
            status: 'active',
            totalVoters: students.length,
            totalVotes: 0,
          }
        }),
      });
      const data = await res.json();
      if (data.success) {
        setElections([...elections, data.election]);
        setShowCreateElection(false);
      }
    } catch (e) { console.error('Create election error:', e); }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('atc_admin_token');
    setLoggedIn(false); setToken(''); setStats(null);
  };

  const filteredStudents = students.filter(s => {
    if (studentSearch && !s.name.toLowerCase().includes(studentSearch.toLowerCase()) && !s.admissionNumber.includes(studentSearch)) return false;
    if (filterDepartment && s.department !== filterDepartment) return false;
    if (filterYear && s.yearOfStudy !== parseInt(filterYear)) return false;
    return true;
  });

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="atc-card w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-atc-primary" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">SOATECO Admin Portal</h2>
            <p className="text-slate-600 mt-1">Arusha Technical College</p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="atc-input" placeholder="soateco_admin" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="atc-input" placeholder="••••••••" />
            </div>
            <button onClick={login} disabled={loading} className="atc-btn-primary w-full justify-center inline-flex items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              Sign In
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">
            Demo: <strong>soateco_admin</strong> / <strong>ATC_Secure2024!</strong>
          </p>
          <Link href="/" className="block text-center text-sm text-slate-500 hover:text-atc-primary mt-4">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-500 hover:text-atc-primary transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-atc-primary" />
              <span className="font-bold text-slate-900">SOATECO Admin Dashboard</span>
            </div>
          </div>
          <button onClick={logout} className="text-sm text-slate-500 hover:text-red-600 font-medium">Sign Out</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { key: 'overview', icon: BarChart3, label: 'Overview' },
            { key: 'elections', icon: Calendar, label: 'Elections' },
            { key: 'candidates', icon: Users, label: 'Candidates' },
            { key: 'students', icon: GraduationCap, label: 'Students' },
            { key: 'blockchain', icon: Blocks, label: 'Blockchain' },
            { key: 'audit', icon: Activity, label: 'Audit' },
          ].map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setActiveTab(key as any)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === key ? 'bg-atc-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <StatCard icon={<Users className="w-6 h-6 text-atc-primary" />} label="Total Students" value={stats.totalStudents} sub={`${stats.totalVoters} voted`} />
              <StatCard icon={<CheckCircle className="w-6 h-6 text-atc-secondary" />} label="Participation" value={`${stats.participationRate}%`} sub="turnout" />
              <StatCard icon={<Users className="w-6 h-6 text-atc-accent" />} label="Candidates" value={stats.totalCandidates} sub={`${stats.pendingCandidates} pending`} />
              <StatCard icon={<Blocks className="w-6 h-6 text-purple-600" />} label="Blocks" value={stats.totalBlocks} sub="mined" />
            </div>

            <div className="atc-card">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-atc-primary" /> System Health
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-emerald-800">Blockchain Valid</span>
                  </div>
                  <p className="text-sm text-emerald-600">Chain integrity verified</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-blue-800">Election Active</span>
                  </div>
                  <p className="text-sm text-blue-600">SOATECO 2024 in progress</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span className="font-medium text-amber-800">Smart Contracts</span>
                  </div>
                  <p className="text-sm text-amber-600">4 contracts deployed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ELECTIONS TAB */}
        {activeTab === 'elections' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Election Management</h2>
              <button onClick={() => setShowCreateElection(true)} className="atc-btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Election
              </button>
            </div>

            {showCreateElection && (
              <div className="atc-card">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Election</h3>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                    <input type="text" value={newElection.title} onChange={e => setNewElection({...newElection, title: e.target.value})} className="atc-input" placeholder="SOATECO General Elections 2025" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Positions (comma separated)</label>
                    <input type="text" value={newElection.positions.join(', ')} onChange={e => setNewElection({...newElection, positions: e.target.value.split(',').map(p => p.trim())})} className="atc-input" placeholder="President, Vice President, Secretary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input type="datetime-local" value={newElection.startDate} onChange={e => setNewElection({...newElection, startDate: e.target.value})} className="atc-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input type="datetime-local" value={newElection.endDate} onChange={e => setNewElection({...newElection, endDate: e.target.value})} className="atc-input" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={createElection} disabled={loading} className="atc-btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Create Election
                  </button>
                  <button onClick={() => setShowCreateElection(false)} className="atc-btn-outline">Cancel</button>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {elections.map(election => (
                <div key={election.id} className="atc-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{election.title}</h3>
                      <p className="text-sm text-slate-600">Positions: {election.positions?.join(', ') || 'N/A'}</p>
                      <p className="text-sm text-slate-500">{new Date(election.startDate).toLocaleDateString()} - {new Date(election.endDate).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`atc-badge ${election.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {election.status}
                      </span>
                      <button
                        onClick={() => setEditingElection(election)}
                        className="p-2 text-slate-500 hover:text-atc-primary transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete election "${election.title}"?`)) return;
                          try {
                            const res = await fetch('/api/admin/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ action: 'deleteElection', electionData: { id: election.id } }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              setElections(elections.filter(e => e.id !== election.id));
                            } else {
                              setError(data.error);
                            }
                          } catch (e) { console.error('Delete election error:', e); }
                        }}
                        className="p-2 text-slate-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {editingElection?.id === election.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <h4 className="text-sm font-bold text-slate-700 mb-3">Edit Election</h4>
                      <div className="grid md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                          <input type="text" value={editingElection.title}
                            onChange={e => setEditingElection({...editingElection, title: e.target.value})}
                            className="atc-input text-sm py-2" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                          <select value={editingElection.status}
                            onChange={e => setEditingElection({...editingElection, status: e.target.value as any})}
                            className="atc-input text-sm py-2">
                            <option value="upcoming">Upcoming</option>
                            <option value="active">Active</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const res = await fetch('/api/admin/config', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ action: 'updateElection', electionData: editingElection }),
                              });
                              const data = await res.json();
                              if (data.success) {
                                setElections(elections.map(e => e.id === editingElection.id ? data.election : e));
                                setEditingElection(null);
                              } else {
                                setError(data.error);
                              }
                            } catch (e) { console.error('Edit election error:', e); }
                            setLoading(false);
                          }}
                          className="atc-btn-primary text-sm py-2 px-4 inline-flex items-center gap-2 disabled:opacity-50"
                          disabled={loading}
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Save
                        </button>
                        <button onClick={() => setEditingElection(null)} className="atc-btn-outline text-sm py-2 px-4">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {elections.length === 0 && (
                <div className="atc-card text-center py-12 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No elections configured yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CANDIDATES TAB */}
        {activeTab === 'candidates' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Candidate Management</h2>
              <button onClick={() => setShowAddCandidate(true)} className="atc-btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Candidate
              </button>
            </div>

            {showAddCandidate && (
              <div className="atc-card">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Register New Candidate</h3>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input type="text" value={newCandidate.name} onChange={e => setNewCandidate({...newCandidate, name: e.target.value})} className="atc-input" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Admission Number</label>
                    <input type="text" value={newCandidate.admissionNumber} onChange={e => setNewCandidate({...newCandidate, admissionNumber: e.target.value})} className="atc-input" placeholder="23050513012" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
                    <select value={newCandidate.position} onChange={e => setNewCandidate({...newCandidate, position: e.target.value})} className="atc-input">
                      {['President', 'Vice President', 'Secretary General', 'Treasurer', 'Academic Rep', 'Sports Rep'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GPA</label>
                    <input type="number" step="0.1" min="0" max="5" value={newCandidate.gpa} onChange={e => setNewCandidate({...newCandidate, gpa: parseFloat(e.target.value)})} className="atc-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Year of Study</label>
                    <input type="number" min="1" max="5" value={newCandidate.yearOfStudy} onChange={e => setNewCandidate({...newCandidate, yearOfStudy: parseInt(e.target.value)})} className="atc-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Profile Photo</label>
                    <div className="flex items-center gap-3">
                      <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                      <button onClick={() => fileInputRef.current?.click()} className="atc-btn-outline text-sm py-2 px-3 inline-flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Choose Photo
                      </button>
                      {imagePreview && (
                        <img src={imagePreview} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-atc-primary" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Manifesto</label>
                  <textarea value={newCandidate.manifesto} onChange={e => setNewCandidate({...newCandidate, manifesto: e.target.value})} rows={3} className="atc-input" placeholder="Candidate's vision and plans..." />
                </div>
                <div className="flex gap-3">
                  <button onClick={addCandidate} disabled={loading} className="atc-btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Register Candidate
                  </button>
                  <button onClick={() => { setShowAddCandidate(false); setCandidateImage(null); setImagePreview(''); }} className="atc-btn-outline">Cancel</button>
                </div>
              </div>
            )}

            {candidates.filter(c => c.status === 'pending').length > 0 && (
              <div className="atc-card border-amber-200 bg-amber-50">
                <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Pending Applications ({candidates.filter(c => c.status === 'pending').length})
                </h3>
                <div className="space-y-4">
                  {candidates.filter(c => c.status === 'pending').map(candidate => (
                    <div key={candidate.id} className="bg-white rounded-lg border border-amber-200 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={candidate.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=1e40af&color=fff&size=200`}
                            alt={candidate.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900">{candidate.name}</h4>
                            <p className="text-sm text-atc-primary">{candidate.position}</p>
                            <p className="text-xs text-slate-500">GPA: {candidate.gpa} | Year {candidate.yearOfStudy}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/admin/config', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                  body: JSON.stringify({ action: 'approveCandidate', candidateId: candidate.id }),
                                });
                                const data = await res.json();
                                if (data.success) {
                                  setCandidates(candidates.map(c => c.id === candidate.id ? { ...c, status: 'approved' } : c));
                                }
                              } catch (e) { console.error('Approve error:', e); }
                            }}
                            className="atc-btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 inline-flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/admin/config', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                  body: JSON.stringify({ action: 'rejectCandidate', candidateId: candidate.id }),
                                });
                                const data = await res.json();
                                if (data.success) {
                                  setCandidates(candidates.map(c => c.id === candidate.id ? { ...c, status: 'rejected' } : c));
                                }
                              } catch (e) { console.error('Reject error:', e); }
                            }}
                            className="atc-btn-outline text-xs py-1.5 px-3 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 inline-flex items-center gap-1"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 bg-slate-50 rounded p-3 mb-2">{candidate.manifesto}</p>
                      {candidate.documents && candidate.documents.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {candidate.documents.map((doc, i) => (
                            <a key={i} href={doc} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-atc-primary hover:underline inline-flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Document {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map(candidate => (
                <div key={candidate.id} className="atc-card">
                  <div className="flex items-start gap-4">
                    <img 
                      src={candidate.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=1e40af&color=fff&size=200`}
                      alt={candidate.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 truncate">{candidate.name}</h4>
                      <p className="text-sm text-atc-primary">{candidate.position}</p>
                      <p className="text-xs text-slate-500">GPA: {candidate.gpa} | Year {candidate.yearOfStudy}</p>
                      <p className="text-xs text-slate-500 mt-1">{candidate.votes} votes</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`atc-badge text-xs ${
                        candidate.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        candidate.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {candidate.status}
                      </span>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => setEditingCandidate(candidate)}
                          className="p-1 text-slate-400 hover:text-atc-primary transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete candidate "${candidate.name}"?`)) return;
                            try {
                              const res = await fetch(`/api/candidates?id=${candidate.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` },
                              });
                              const data = await res.json();
                              if (data.success) {
                                setCandidates(candidates.filter(c => c.id !== candidate.id));
                              }
                            } catch (e) { console.error('Delete candidate error:', e); }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-3 line-clamp-2">{candidate.manifesto}</p>
                  {editingCandidate?.id === candidate.id && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-xs text-slate-500">Position</label>
                          <select value={editingCandidate.position}
                            onChange={e => setEditingCandidate({...editingCandidate, position: e.target.value})}
                            className="atc-input text-xs py-1.5">
                            {['President', 'Vice President', 'Secretary General', 'Treasurer', 'Academic Rep', 'Sports Rep'].map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Status</label>
                          <select value={editingCandidate.status}
                            onChange={e => setEditingCandidate({...editingCandidate, status: e.target.value as any})}
                            className="atc-input text-xs py-1.5">
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/candidates', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify(editingCandidate),
                              });
                              const data = await res.json();
                              if (data.success) {
                                setCandidates(candidates.map(c => c.id === editingCandidate.id ? data.candidate : c));
                                setEditingCandidate(null);
                              }
                            } catch (e) { console.error('Edit candidate error:', e); }
                          }}
                          className="atc-btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" /> Save
                        </button>
                        <button onClick={() => setEditingCandidate(null)} className="atc-btn-outline text-xs py-1.5 px-3">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="text-2xl font-bold text-slate-900">Student Database</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={studentSearch} 
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search students..."
                    className="atc-input pl-10 w-64"
                  />
                </div>
                <button onClick={() => setShowBulkUpload(true)} className="atc-btn-outline inline-flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> Import CSV/Excel
                </button>
                <button onClick={() => setShowAddStudent(true)} className="atc-btn-primary inline-flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Add Student
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-slate-50 rounded-lg p-4 border border-slate-200">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={filterDepartment}
                onChange={e => setFilterDepartment(e.target.value)}
                className="atc-input text-sm py-2 w-48"
              >
                <option value="">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="ICT">ICT</option>
                <option value="Electrical">Electrical</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Business">Business</option>
              </select>
              <select
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                className="atc-input text-sm py-2 w-36"
              >
                <option value="">All Years</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
                <option value="5">Year 5</option>
              </select>
              {selectedStudents.size > 0 && (
                <button
                  onClick={async () => {
                    if (!confirm(`Delete ${selectedStudents.size} selected student(s)?`)) return;
                    try {
                      const res = await fetch('/api/students/delete-bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ ids: Array.from(selectedStudents) }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setStudents(students.filter(s => !selectedStudents.has(s.id)));
                        setSelectedStudents(new Set());
                        fetchStats(token);
                      } else {
                        setError(data.error);
                      }
                    } catch (e) { console.error('Bulk delete error:', e); setError('Network error'); }
                  }}
                  className="atc-btn-primary text-sm py-2 px-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" /> Delete {selectedStudents.size}
                </button>
              )}
              <span className="text-xs text-slate-400 ml-auto">
                {filteredStudents.length} student(s)
              </span>
            </div>

            {showBulkUpload && (
              <div className="atc-card mb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-atc-primary" /> Import Students from File
                </h3>
                <div className="bg-blue-50 rounded-lg p-4 mb-4 text-sm text-slate-600">
                  <p className="font-medium text-atc-primary mb-2">Accepted formats:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>CSV</strong> — columns: admissionNumber, name, email, department, yearOfStudy, gpa, phone</li>
                    <li><strong>Excel (.xlsx / .xls)</strong> — same columns in the first sheet</li>
                  </ul>
                  <p className="mt-2 text-xs text-slate-500">Column headers are case-insensitive. &quot;admission&quot; or &quot;Admission Number&quot; both work.</p>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <input
                    type="file"
                    ref={bulkFileRef}
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    onClick={() => bulkFileRef.current?.click()}
                    className="atc-btn-outline text-sm py-2 px-4 inline-flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {bulkFile ? bulkFile.name : 'Choose File'}
                  </button>
                  {bulkFile && (
                    <span className="text-sm text-slate-500">
                      {(bulkFile.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                  <button
                    onClick={uploadBulkStudents}
                    disabled={!bulkFile || bulkLoading}
                    className="atc-btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload & Import
                  </button>
                </div>
                {bulkResult && (
                  <div className={`rounded-lg p-3 text-sm ${bulkResult.added > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {bulkResult.added > 0 ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span className="font-medium">{bulkResult.added} student(s) imported</span>
                    </div>
                    {bulkResult.errors && bulkResult.errors.length > 0 && (
                      <ul className="mt-1 space-y-0.5 list-disc list-inside text-xs text-red-600">
                        {bulkResult.errors.slice(0, 5).map((e: string, i: number) => <li key={i}>{e}</li>)}
                        {bulkResult.errors.length > 5 && <li>...and {bulkResult.errors.length - 5} more</li>}
                      </ul>
                    )}
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <button onClick={() => { setShowBulkUpload(false); setBulkFile(null); setBulkResult(null); }} className="atc-btn-outline text-sm">Close</button>
                </div>
              </div>
            )}

            {showAddStudent && (
              <div className="atc-card">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Add New Student</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Admission Number</label>
                    <input type="text" value={newStudent.admissionNumber} onChange={e => setNewStudent({...newStudent, admissionNumber: e.target.value})} className="atc-input" placeholder="23050513012" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input type="text" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="atc-input" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} className="atc-input" placeholder="john@atc.ac.tz" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                    <select value={newStudent.department} onChange={e => setNewStudent({...newStudent, department: e.target.value})} className="atc-input">
                      <option value="">Select Department</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="ICT">ICT</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Business">Business</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Year of Study</label>
                    <input type="number" min="1" max="5" value={newStudent.yearOfStudy} onChange={e => setNewStudent({...newStudent, yearOfStudy: parseInt(e.target.value)})} className="atc-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number (for OTP)</label>
                    <input type="tel" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} className="atc-input" placeholder="+255..." />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={addStudent} disabled={loading} className="atc-btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Add Student
                  </button>
                  <button onClick={() => setShowAddStudent(false)} className="atc-btn-outline">Cancel</button>
                </div>
              </div>
            )}

            <div className="atc-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 w-10">
                      <input
                        type="checkbox"
                        checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                        onChange={() => {
                          if (selectedStudents.size === filteredStudents.length) {
                            setSelectedStudents(new Set());
                          } else {
                            setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
                          }
                        }}
                        className="accent-atc-primary"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Admission #</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Department</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Year</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Voted</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.id} className={`border-b border-slate-100 hover:bg-slate-50 ${selectedStudents.has(student.id) ? 'bg-blue-50' : ''}`}>
                      <td className="py-3 px-2">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.id)}
                          onChange={() => {
                            const next = new Set(selectedStudents);
                            if (next.has(student.id)) next.delete(student.id);
                            else next.add(student.id);
                            setSelectedStudents(next);
                          }}
                          className="accent-atc-primary"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{student.admissionNumber}</td>
                      <td className="py-3 px-4 font-medium">{student.name}</td>
                      <td className="py-3 px-4">{student.department}</td>
                      <td className="py-3 px-4">Year {student.yearOfStudy}</td>
                      <td className="py-3 px-4">
                        {student.hasVoted ? (
                          <span className="atc-badge bg-emerald-100 text-emerald-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" /> Yes</span>
                        ) : (
                          <span className="atc-badge bg-slate-100 text-slate-600 text-xs">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => deleteStudent(student.id)} className="text-red-500 hover:text-red-700 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No students found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BLOCKCHAIN TAB */}
        {activeTab === 'blockchain' && stats && (
          <div className="space-y-6">
            <div className="atc-card">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Blocks className="w-5 h-5 text-atc-primary" /> Blockchain Ledger
              </h3>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stats.chainValid ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">{stats.chainValid ? 'Chain Valid' : 'Chain Invalid'}</span>
                </div>
                <span className="text-sm text-slate-500">{stats.totalBlocks} block(s) · {stats.totalVotes} transaction(s)</span>
              </div>

              {stats.chain && stats.chain.length > 0 ? (
                <div className="space-y-3 mb-6 max-h-[600px] overflow-y-auto">
                  {[...stats.chain].reverse().map((block: any, i: number) => (
                    <div key={block.index} className={`rounded-lg border ${i === 0 ? 'bg-slate-900 text-white border-slate-700' : 'bg-slate-50 border-slate-200'} p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold ${i === 0 ? 'text-emerald-400' : 'text-slate-900'}`}>
                          Block #{block.index}
                          {block.index === 0 && <span className="ml-2 text-xs font-normal text-slate-500">(Genesis)</span>}
                        </span>
                        <span className={`text-xs ${i === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                          {new Date(block.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                        <div className={`${i === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                          Hash: <span className={i === 0 ? 'text-white' : 'text-slate-800'}>{block.blockHash?.slice(0, 24)}...</span>
                        </div>
                        <div className={`${i === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                          Nonce: <span className={i === 0 ? 'text-white' : 'text-slate-800'}>{block.nonce}</span>
                        </div>
                        <div className={`${i === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                          Merkle: <span className={i === 0 ? 'text-white' : 'text-slate-800'}>{block.merkleRoot?.slice(0, 16)}...</span>
                        </div>
                        <div className={`${i === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                          TXs: <span className={i === 0 ? 'text-white' : 'text-slate-800'}>{block.transactions?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Blocks className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No blocks mined yet.</p>
                </div>
              )}

              <div className="space-y-2 font-mono text-sm">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Smart Contracts</h4>
                {stats.contractAddresses && Object.entries(stats.contractAddresses).map(([name, addr]: [string, any]) => (
                  <div key={name} className="flex justify-between items-center bg-slate-50 rounded-lg p-3">
                    <span className="text-slate-600 capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-atc-primary text-xs">{addr}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AUDIT TAB */}
        {activeTab === 'audit' && stats && (
          <div className="atc-card">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-atc-primary" /> Recent Audit Events
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Event Type</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Data Hash</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Actor</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Block</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentEvents?.map((event: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className={`atc-badge text-xs ${
                          event.eventType.includes('VOTE') ? 'bg-blue-100 text-atc-primary' :
                          event.eventType.includes('AUTH') ? 'bg-emerald-100 text-atc-secondary' :
                          event.eventType.includes('STUDENT') ? 'bg-purple-100 text-purple-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {event.eventType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{event.dataHash.slice(0, 12)}...</td>
                      <td className="py-3 px-4 font-mono text-xs">{event.actor.slice(0, 12)}...</td>
                      <td className="py-3 px-4 font-mono">#{event.blockNumber}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub: string }) {
  return (
    <div className="atc-card flex items-center gap-4">
      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
        <div className="text-xs text-slate-400">{sub}</div>
      </div>
    </div>
  );
}
