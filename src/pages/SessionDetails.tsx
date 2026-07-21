import React, { useState, useEffect } from 'react';
import { sessionsApi, AnalysisSession, AIAnalysis, UserStory, getFriendlyErrorMessage } from '../services/api';
import {
  ArrowLeft,
  Sparkles,
  Save,
  Download,
  Printer,
  Edit2,
  Trash2,
  Plus,
  HelpCircle,
  AlertTriangle,
  Bookmark,
  CheckCircle,
  FileText,
  FileCode,
  CheckSquare
} from 'lucide-react';

interface SessionDetailsProps {
  sessionId: string; // "new" or a Firestore document ID
  onBackToDashboard: () => void;
}

export default function SessionDetails({ sessionId, onBackToDashboard }: SessionDetailsProps) {
  const isNew = sessionId === 'new';

  // State for session details
  const [title, setTitle] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  
  // State for AI analysis
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  
  // loading and error states
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Toggle for Edit mode vs View mode on the analysis itself
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);

  // States to hold the editable analysis content
  const [editExecSummary, setEditExecSummary] = useState('');
  const [editFuncReqs, setEditFuncReqs] = useState<string[]>([]);
  const [editUserStories, setEditUserStories] = useState<UserStory[]>([]);
  const [editRisks, setEditRisks] = useState<string[]>([]);
  const [editAssumptions, setEditAssumptions] = useState<string[]>([]);
  const [editClarifyingQs, setEditClarifyingQs] = useState<string[]>([]);

  // Fetch session on load if not creating new
  useEffect(() => {
    if (!isNew) {
      loadSessionDetails();
    }
  }, [sessionId]);

  const loadSessionDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionsApi.get(sessionId);
      setTitle(data.session.title);
      setMeetingNotes(data.session.meetingNotes);
      setAnalysis(data.analysis);

      if (data.analysis) {
        initEditStates(data.analysis);
      }
    } catch (err: any) {
      console.error('Error loading session:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const initEditStates = (a: AIAnalysis) => {
    setEditExecSummary(a.executiveSummary || '');
    setEditFuncReqs(a.functionalRequirements ? [...a.functionalRequirements] : []);
    setEditUserStories(a.userStories ? JSON.parse(JSON.stringify(a.userStories)) : []);
    setEditRisks(a.risks ? [...a.risks] : []);
    setEditAssumptions(a.assumptions ? [...a.assumptions] : []);
    setEditClarifyingQs(a.clarifyingQuestions ? [...a.clarifyingQuestions] : []);
  };

  // Create a brand new session and auto-generate analysis
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !meetingNotes.trim()) {
      setError('Both title and meeting notes are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Create session first
      const newSession = await sessionsApi.create(title, meetingNotes);
      
      // Auto trigger AI analysis generation immediately
      setGenerating(true);
      const generatedAnalysis = await sessionsApi.generate(newSession.id);
      
      // Redirect or load details
      setAnalysis(generatedAnalysis);
      initEditStates(generatedAnalysis);
      
      // Success banner and exit create state
      setSuccessMessage('Session created and AI document generated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
      onBackToDashboard(); // Go back so it shows in the listing
    } catch (err: any) {
      console.error('Error in create session:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  // Re-generate analysis execution (database and AI API flow)
  const executeAnalysisGeneration = async () => {
    setGenerating(true);
    setError(null);
    try {
      const generated = await sessionsApi.generate(sessionId);
      setAnalysis(generated);
      initEditStates(generated);
      setIsEditingAnalysis(false);
      setSuccessMessage('AI document generated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error generating analysis:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  // Safe handler that bypasses standard window.confirm iframe blocks
  const handleGenerateAnalysis = () => {
    if (analysis) {
      setShowReanalyzeConfirm(true);
    } else {
      executeAnalysisGeneration();
    }
  };

  // Save manual edits of analysis back to backend
  const handleSaveAnalysisEdits = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        meetingNotes,
        analysis: {
          executiveSummary: editExecSummary,
          functionalRequirements: editFuncReqs,
          userStories: editUserStories,
          risks: editRisks,
          assumptions: editAssumptions,
          clarifyingQuestions: editClarifyingQs
        }
      };

      const result = await sessionsApi.update(sessionId, payload);
      setAnalysis(result.analysis);
      if (result.analysis) {
        initEditStates(result.analysis);
      }
      setIsEditingAnalysis(false);
      setSuccessMessage('All changes saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving edits:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // EXPORT 1: Download Markdown File
  const handleExportMarkdown = async () => {
    if (!analysis) return;
    try {
      const markdownString = await sessionsApi.exportMarkdown(sessionId, title, {
        executiveSummary: editExecSummary,
        functionalRequirements: editFuncReqs,
        userStories: editUserStories,
        risks: editRisks,
        assumptions: editAssumptions,
        clarifyingQuestions: editClarifyingQs
      });

      // Simple browser download trigger
      const blob = new Blob([markdownString], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_analysis.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMessage('Markdown file downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  // EXPORT 2: Print/Save to PDF via native browser printer
  const handleExportPDF = async () => {
    try {
      // Log export action in backend
      await sessionsApi.logExportPDF(sessionId);
      
      // Trigger native browser print dialog
      window.print();
    } catch (err: any) {
      console.error('Error logging PDF export:', err);
      window.print(); // Fallback anyway
    }
  };

  // UTILITY: Add item to a list state
  const handleAddListItem = (state: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, defaultValue = 'New item description...') => {
    setter([...state, defaultValue]);
  };

  // UTILITY: Edit item in a list state
  const handleEditListItem = (index: number, val: string, state: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const updated = [...state];
    updated[index] = val;
    setter(updated);
  };

  // UTILITY: Remove item from a list state
  const handleRemoveListItem = (index: number, state: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(state.filter((_, idx) => idx !== index));
  };

  // UTILITY: Add User Story
  const handleAddUserStory = () => {
    const newStory: UserStory = {
      title: 'New Story Title',
      story: 'As a [User], I want [Goal] so that [Value]',
      acceptanceCriteria: ['Given [Context], when [Action], then [Expected Result]']
    };
    setEditUserStories([...editUserStories, newStory]);
  };

  // UTILITY: Edit User Story string fields
  const handleEditUserStoryField = (index: number, field: 'title' | 'story', val: string) => {
    const updated = [...editUserStories];
    updated[index] = { ...updated[index], [field]: val };
    setEditUserStories(updated);
  };

  // UTILITY: Add Acceptance Criteria to Story
  const handleAddAC = (storyIdx: number) => {
    const updated = [...editUserStories];
    updated[storyIdx].acceptanceCriteria = [...updated[storyIdx].acceptanceCriteria, 'Given... when... then...'];
    setEditUserStories(updated);
  };

  // UTILITY: Edit Acceptance Criteria in Story
  const handleEditAC = (storyIdx: number, acIdx: number, val: string) => {
    const updated = [...editUserStories];
    const updatedACs = [...updated[storyIdx].acceptanceCriteria];
    updatedACs[acIdx] = val;
    updated[storyIdx].acceptanceCriteria = updatedACs;
    setEditUserStories(updated);
  };

  // UTILITY: Remove Acceptance Criteria from Story
  const handleRemoveAC = (storyIdx: number, acIdx: number) => {
    const updated = [...editUserStories];
    updated[storyIdx].acceptanceCriteria = updated[storyIdx].acceptanceCriteria.filter((_, idx) => idx !== acIdx);
    setEditUserStories(updated);
  };

  // UTILITY: Remove User Story
  const handleRemoveUserStory = (index: number) => {
    setEditUserStories(editUserStories.filter((_, idx) => idx !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 text-sm font-semibold">Loading session details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col print:bg-white print:p-0">
      {/* Dynamic Navigation Header (Hidden on Print) */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBackToDashboard}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="h-4 w-px bg-slate-200"></div>
              <span className="font-bold text-slate-800 text-sm sm:text-base max-w-[200px] sm:max-w-xs truncate">
                {isNew ? 'Create Session' : title}
              </span>
            </div>

            {/* Print/Save Action Bar (Only visible if analysis exists) */}
            {!isNew && analysis && (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {!isEditingAnalysis ? (
                  <>
                    <button
                      onClick={() => setIsEditingAnalysis(true)}
                      className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer"
                    >
                      <Edit2 size={13} />
                      <span className="hidden sm:inline">Manual Edit</span>
                    </button>
                    <button
                      onClick={handleExportMarkdown}
                      className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">Markdown</span>
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white shadow-sm transition cursor-pointer"
                    >
                      <Printer size={13} />
                      <span className="hidden sm:inline">Export PDF</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        initEditStates(analysis);
                        setIsEditingAnalysis(false);
                      }}
                      disabled={saving}
                      className="px-2.5 sm:px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAnalysisEdits}
                      disabled={saving}
                      className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-bold text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Save size={13} />
                      )}
                      <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Changes'}</span>
                      <span className="inline sm:hidden">{saving ? '...' : 'Save'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 print:block print:p-0">
        {/* Banner Messages */}
        {successMessage && (
          <div className="fixed top-20 right-6 z-50 bg-emerald-50 border border-emerald-200 rounded-lg p-4 shadow-lg flex items-center space-x-3 text-emerald-800 animate-bounce print:hidden">
            <CheckCircle size={20} className="text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="w-full bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6 flex items-start space-x-3 text-red-800 print:hidden shrink-0">
            <HelpCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* LEFT COLUMN: Meeting Notes / Input Panel (Hidden on Print if we're only printing the analysis) */}
        <div className={`w-full md:w-[35%] shrink-0 flex flex-col space-y-6 print:hidden ${!isNew && analysis ? 'md:sticky md:top-24 max-h-[calc(100vh-120px)] overflow-y-auto' : ''}`}>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <Bookmark size={18} className="text-blue-600" />
              <span>Session Metadata</span>
            </h2>

            {isNew ? (
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Session Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q3 Sales Dashboard Kickoff"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Meeting Notes / Transcription
                  </label>
                  <textarea
                    required
                    rows={12}
                    placeholder="Paste the raw meeting minutes, transcripts, user feedback, or scope definitions here..."
                    value={meetingNotes}
                    onChange={(e) => setMeetingNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || generating}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-sm font-bold shadow-sm cursor-pointer transition disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>AI Analyzing notes...</span>
                    </>
                  ) : loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating Session...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Analyze & Generate Docs</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Title</span>
                  <div className="font-bold text-slate-800 text-base">{title}</div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Raw Meeting Notes</span>
                  <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-lg text-xs font-sans text-slate-600 overflow-y-auto max-h-[350px] whitespace-pre-line leading-relaxed">
                    {meetingNotes}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AI Generated Documents Output Panel */}
        <div className="flex-1 print:p-0">
          {generating ? (
            <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-xs flex flex-col items-center justify-center space-y-4 print:hidden">
              <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <h3 className="text-lg font-bold text-slate-800">Gemini AI is processing notes</h3>
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                Applying advanced Business Analysis mapping to extract executive summaries, functional requirements, user stories, acceptance criteria, and project risks.
              </p>
            </div>
          ) : !isNew && !analysis ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-xl p-16 text-center shadow-xs flex flex-col items-center justify-center print:hidden">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-full mb-4">
                <Sparkles size={36} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Business Documents Generated</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto leading-relaxed">
                Click the button below to analyze these raw meeting notes and generate structured functional documents instantly.
              </p>
              <button
                onClick={handleGenerateAnalysis}
                className="mt-6 flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg text-sm font-bold shadow-sm transition cursor-pointer"
              >
                <Sparkles size={16} />
                <span>Analyze with Gemini</span>
              </button>
            </div>
          ) : analysis ? (
            /* PRINT CONTAINER AND VIEW */
            <div id="print-area" className="space-y-8 print:space-y-8 bg-white md:border md:border-slate-200 rounded-xl p-6 md:p-8 shadow-sm print:border-none print:p-0">
              
              {/* Document Header (Custom stylized for print & UI) */}
              <div className="border-b-2 border-slate-200 pb-5 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 tracking-wider uppercase font-mono">BA Copilot Output Document</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider print:hidden">Gemini AI</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">{title}</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Generated: {new Date(analysis.createdAt).toLocaleDateString()} • Ready for implementation review
                  </p>
                </div>
                
                {/* Overwrite Generation trigger */}
                <button
                  onClick={handleGenerateAnalysis}
                  className="mt-3 sm:mt-0 flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer print:hidden shrink-0"
                >
                  <Sparkles size={12} className="text-blue-600" />
                  <span>Re-Analyze Notes</span>
                </button>
              </div>

              {/* 1. EXECUTIVE SUMMARY */}
              <section className="space-y-3 break-inside-avoid">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-1.5">
                  <FileText className="text-blue-600 print:text-black shrink-0" size={18} />
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider text-[15px]">1. Executive Summary</h2>
                </div>
                {isEditingAnalysis ? (
                  <textarea
                    rows={4}
                    value={editExecSummary}
                    onChange={(e) => setEditExecSummary(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 leading-relaxed font-sans focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                ) : (
                  <p className="text-sm text-slate-600 leading-relaxed text-justify whitespace-pre-line">
                    {editExecSummary}
                  </p>
                )}
              </section>

              {/* 2. FUNCTIONAL REQUIREMENTS */}
              <section className="space-y-4 break-inside-avoid">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center space-x-2">
                    <FileCode className="text-blue-600 print:text-black shrink-0" size={18} />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider text-[15px]">2. Functional Requirements</h2>
                  </div>
                  {isEditingAnalysis && (
                    <button
                      onClick={() => handleAddListItem(editFuncReqs, setEditFuncReqs, 'User can [perform action] by [taking steps]...')}
                      className="flex items-center space-x-1 text-xs text-blue-600 font-bold hover:underline transition print:hidden"
                    >
                      <Plus size={14} />
                      <span>Add Requirement</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {editFuncReqs.map((req, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-lg relative group transition-colors hover:border-slate-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">FR-{idx+1}</span>
                        {isEditingAnalysis && (
                          <button
                            onClick={() => handleRemoveListItem(idx, editFuncReqs, setEditFuncReqs)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-200 transition print:hidden"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      {isEditingAnalysis ? (
                        <textarea
                          rows={2}
                          value={req}
                          onChange={(e) => handleEditListItem(idx, e.target.value, editFuncReqs, setEditFuncReqs)}
                          className="w-full p-2 text-sm bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      ) : (
                        <p className="text-sm font-medium text-slate-800 leading-relaxed">{req}</p>
                      )}
                    </div>
                  ))}
                  {editFuncReqs.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No functional requirements listed.</p>
                  )}
                </div>
              </section>

              {/* 3. USER STORIES & ACCEPTANCE CRITERIA */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="text-blue-600 print:text-black shrink-0" size={18} />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider text-[15px]">3. User Stories & Acceptance Criteria</h2>
                  </div>
                  {isEditingAnalysis && (
                    <button
                      onClick={handleAddUserStory}
                      className="flex items-center space-x-1 text-xs text-blue-600 font-bold hover:underline transition print:hidden"
                    >
                      <Plus size={14} />
                      <span>Add User Story</span>
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {editUserStories.map((story, storyIdx) => (
                    <div key={storyIdx} className="bg-slate-50/50 print:bg-white border border-slate-200/80 print:border-none p-4 sm:p-5 rounded-xl space-y-4 break-inside-avoid">
                      
                      {/* Story Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {isEditingAnalysis ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={story.title}
                                onChange={(e) => handleEditUserStoryField(storyIdx, 'title', e.target.value)}
                                className="w-full font-bold text-slate-800 text-sm px-2 py-1 border border-slate-300 rounded focus:outline-none"
                              />
                              <textarea
                                value={story.story}
                                rows={2}
                                onChange={(e) => handleEditUserStoryField(storyIdx, 'story', e.target.value)}
                                className="w-full text-slate-600 text-xs p-2 border border-slate-300 rounded focus:outline-none leading-relaxed"
                              />
                            </div>
                          ) : (
                            <>
                              <h3 className="font-bold text-slate-800 text-[15px] flex items-center space-x-1.5">
                                <span className="text-blue-600 font-mono text-xs">US-{storyIdx+1}</span>
                                <span>{story.title}</span>
                              </h3>
                              <p className="text-sm text-slate-600 bg-white border border-slate-200/50 p-3 rounded-lg mt-2 leading-relaxed italic">
                                "{story.story}"
                              </p>
                            </>
                          )}
                        </div>

                        {isEditingAnalysis && (
                          <button
                            onClick={() => handleRemoveUserStory(storyIdx)}
                            className="ml-3 text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 transition print:hidden"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Acceptance Criteria nested inside */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acceptance Criteria</span>
                          {isEditingAnalysis && (
                            <button
                              onClick={() => handleAddAC(storyIdx)}
                              className="text-[10px] text-blue-600 font-bold hover:underline flex items-center space-x-0.5 print:hidden"
                            >
                              <Plus size={12} />
                              <span>Add AC</span>
                            </button>
                          )}
                        </div>

                        <div className="space-y-2 pl-1">
                          {story.acceptanceCriteria.map((ac, acIdx) => (
                            <div key={acIdx} className="flex items-start space-x-2.5">
                              <span className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold mt-0.5 select-none font-mono shrink-0">
                                {acIdx+1}
                              </span>
                              {isEditingAnalysis ? (
                                <div className="flex-1 flex items-start space-x-2">
                                  <textarea
                                    rows={1}
                                    value={ac}
                                    onChange={(e) => handleEditAC(storyIdx, acIdx, e.target.value)}
                                    className="flex-1 p-1 text-xs border border-slate-300 rounded focus:outline-none"
                                  />
                                  <button
                                    onClick={() => handleRemoveAC(storyIdx, acIdx)}
                                    className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 transition print:hidden"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ) : (
                                <p className="flex-1 text-xs text-slate-600 mt-0.5 leading-relaxed">{ac}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Grid block for Risks & Assumptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:block print:space-y-8">
                
                {/* 4. RISKS */}
                <section className="space-y-4 break-inside-avoid">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="text-amber-600 print:text-black shrink-0" size={18} />
                      <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider text-[14px]">4. Identified Risks</h2>
                    </div>
                    {isEditingAnalysis && (
                      <button
                        onClick={() => handleAddListItem(editRisks, setEditRisks, 'Potential risk relating to integrations or data privacy...')}
                        className="flex items-center space-x-1 text-xs text-blue-600 font-bold hover:underline transition print:hidden"
                      >
                        <Plus size={14} />
                        <span>Add Risk</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {editRisks.map((risk, idx) => (
                      <div key={idx} className="p-4 bg-orange-50 border border-orange-100 rounded-lg relative group transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Risk Identified #{idx+1}</span>
                          {isEditingAnalysis && (
                            <button
                              onClick={() => handleRemoveListItem(idx, editRisks, setEditRisks)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-orange-100 transition print:hidden"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        {isEditingAnalysis ? (
                          <textarea
                            rows={2}
                            value={risk}
                            onChange={(e) => handleEditListItem(idx, e.target.value, editRisks, setEditRisks)}
                            className="w-full p-2 text-sm bg-white border border-slate-300 rounded focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800 leading-relaxed">{risk}</p>
                        )}
                      </div>
                    ))}
                    {editRisks.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No risks identified.</p>
                    )}
                  </div>
                </section>

                {/* 5. ASSUMPTIONS */}
                <section className="space-y-4 break-inside-avoid">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <div className="flex items-center space-x-2">
                      <Bookmark className="text-blue-600 print:text-black shrink-0" size={18} />
                      <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider text-[14px]">5. Assumptions</h2>
                    </div>
                    {isEditingAnalysis && (
                      <button
                        onClick={() => handleAddListItem(editAssumptions, setEditAssumptions, 'Assuming standard third-party API availability...')}
                        className="flex items-center space-x-1 text-xs text-blue-600 font-bold hover:underline transition print:hidden"
                      >
                        <Plus size={14} />
                        <span>Add Assumption</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {editAssumptions.map((ass, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-lg relative group transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">ASM-0{idx+1}</span>
                          {isEditingAnalysis && (
                            <button
                              onClick={() => handleRemoveListItem(idx, editAssumptions, setEditAssumptions)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-200 transition print:hidden"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        {isEditingAnalysis ? (
                          <textarea
                            rows={2}
                            value={ass}
                            onChange={(e) => handleEditListItem(idx, e.target.value, editAssumptions, setEditAssumptions)}
                            className="w-full p-2 text-sm bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800 leading-relaxed">{ass}</p>
                        )}
                      </div>
                    ))}
                    {editAssumptions.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No assumptions listed.</p>
                    )}
                  </div>
                </section>
              </div>

              {/* 6. CLARIFYING QUESTIONS */}
              <section className="space-y-4 break-inside-avoid">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="text-blue-600 print:text-black shrink-0" size={18} />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider text-[14px]">6. Recommended Clarifying Questions</h2>
                  </div>
                  {isEditingAnalysis && (
                    <button
                      onClick={() => handleAddListItem(editClarifyingQs, setEditClarifyingQs, 'What is the target response timeline for system failure notifications?')}
                      className="flex items-center space-x-1 text-xs text-blue-600 font-bold hover:underline transition print:hidden"
                    >
                      <Plus size={14} />
                      <span>Add Question</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editClarifyingQs.map((q, idx) => (
                    <div key={idx} className="p-4 bg-blue-50/70 border border-blue-100/70 rounded-lg relative group transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider font-mono">CLQ-0{idx+1}</span>
                        {isEditingAnalysis && (
                          <button
                            onClick={() => handleRemoveListItem(idx, editClarifyingQs, setEditClarifyingQs)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-blue-100 transition print:hidden"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      {isEditingAnalysis ? (
                        <textarea
                          rows={2}
                          value={q}
                          onChange={(e) => handleEditListItem(idx, e.target.value, editClarifyingQs, setEditClarifyingQs)}
                          className="w-full p-2 text-sm bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-800 leading-relaxed">{q}</p>
                      )}
                    </div>
                  ))}
                  {editClarifyingQs.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No clarifying questions identified.</p>
                  )}
                </div>
              </section>

              {/* Stylized Signature Block on Print Only */}
              <div className="hidden print:block pt-12 mt-12 border-t-2 border-slate-200">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <div>
                    <p className="font-bold">Generated via BA Copilot Engine</p>
                    <p>Powered by Google AI Studio & Gemini 3.5</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">Lead Analyst Signature</p>
                    <p className="mt-6 border-b border-slate-400 w-32 ml-auto"></p>
                  </div>
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom Status Bar (Hidden on Print) */}
      <footer className="h-auto md:h-10 py-3 md:py-0 bg-slate-100 border-t border-slate-200 px-6 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 text-[11px] text-slate-500 print:hidden shrink-0">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4">
          <span className="flex items-center gap-1.5 text-green-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> AI Core Ready
          </span>
          <span className="hidden md:inline h-3 w-px bg-slate-300"></span>
          <span>User Stories: {editUserStories.length}</span>
          <span className="hidden sm:inline h-3 w-px bg-slate-300"></span>
          <span>Acceptance Criteria: {editUserStories.reduce((acc, curr) => acc + (curr.acceptanceCriteria?.length || 0), 0)}</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <span>Mode: Requirement Modeling</span>
          <span className="font-mono bg-slate-200/60 px-1.5 py-0.5 rounded text-[10px]">v1.0.4-enterprise</span>
        </div>
      </footer>

      {/* Re-analyze Confirmation Modal */}
      {showReanalyzeConfirm && (
        <div id="reanalyze-confirmation-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900">Re-Analyze Notes</h3>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Are you sure you want to re-analyze these meeting notes? This will overwrite the current AI analysis with freshly generated content. Any unsaved manual edits will be lost.
            </p>
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                id="cancel-reanalyze-btn"
                onClick={() => setShowReanalyzeConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-reanalyze-btn"
                onClick={() => {
                  setShowReanalyzeConfirm(false);
                  executeAnalysisGeneration();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition cursor-pointer"
              >
                Re-Analyze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
