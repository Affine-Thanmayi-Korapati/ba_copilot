import React, { useState, useEffect } from 'react';
import { sessionsApi, AnalysisSession, getFriendlyErrorMessage } from '../services/api';
import {
  Plus,
  Search,
  Trash2,
  ChevronRight,
  Clock,
  LogOut,
  Sparkles,
  FileText,
  Layers,
  ArrowUpDown
} from 'lucide-react';

interface DashboardProps {
  user: { name: string; email: string };
  onLogout: () => void;
  onSelectSession: (id: string) => void;
  onCreateNewSession: () => void;
}

export default function Dashboard({ user, onLogout, onSelectSession, onCreateNewSession }: DashboardProps) {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionsApi.list();
      setSessions(data);
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click/select
    setSessionToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    setError(null);
    setDeleting(true);
    try {
      await sessionsApi.delete(sessionToDelete);
      setSessions(sessions.filter(s => s.id !== sessionToDelete));
      setSessionToDelete(null);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // Filter and Sort sessions
  const filteredSessions = sessions.filter(session => {
    const query = searchQuery.toLowerCase();
    return (
      session.title.toLowerCase().includes(query) ||
      session.meetingNotes.toLowerCase().includes(query)
    );
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === 'alphabetical') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div id="dashboard-view" className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Professional Header */}
      <header className="bg-white border-b border-slate-200 shrink-0 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2.5">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <FileText size={20} />
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">BA Copilot</span>
              <span className="hidden sm:inline bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-medium">
                Enterprise Core
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-800">{user.name}</span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>
              <button
                id="logout-button"
                onClick={onLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-600 hover:text-red-600 rounded-lg hover:bg-slate-50 border border-slate-200 transition text-sm cursor-pointer font-medium"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {/* Welcome Block and Hero CTA */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Business Analysis Console
            </h1>
            <p className="mt-1.5 text-slate-500 text-sm">
              Convert raw stakeholders' meeting notes and user logs into production-grade functional documentation instantly.
            </p>
          </div>
          <button
            id="create-new-session-cta"
            onClick={onCreateNewSession}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg text-sm font-semibold shadow-sm shadow-blue-100 transition cursor-pointer w-full md:w-auto"
          >
            <Plus size={18} />
            <span>New Analysis Session</span>
          </button>
        </div>

        {/* Dashboard Control Bar (Search + Sort) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4 shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search session title or notes contents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center justify-between md:justify-start space-x-3 shrink-0 w-full md:w-auto">
            <div className="flex items-center space-x-1 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <ArrowUpDown size={14} />
              <span>Sort:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition flex-1 md:flex-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alphabetical">A-Z Title</option>
            </select>
          </div>
        </div>

        {/* Error Handling */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-center space-x-3 text-red-700">
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Loading Indicator */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm font-medium">Loading session list...</p>
          </div>
        ) : sortedSessions.length > 0 ? (
          /* Cards Grid Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className="group bg-white border border-slate-200/90 rounded-xl p-5 hover:border-blue-400/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-[200px] cursor-pointer relative"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-slate-800 text-base line-clamp-1 group-hover:text-blue-600 transition">
                      {session.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5 font-medium">
                    <Clock size={12} />
                    <span>{formatDate(session.createdAt)}</span>
                  </p>
                  <p className="text-sm text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                    {session.meetingNotes}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-600 flex items-center space-x-1">
                    <Sparkles size={12} />
                    <span>Active Analysis Available</span>
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      title="Delete Session"
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-500 transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Custom Empty State */
          <div className="flex-1 bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center">
            <div className="bg-blue-50 text-blue-600 p-4 rounded-full mb-4">
              <Layers size={36} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Analysis Sessions Found</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? 'No sessions match your search filters. Try adjusting your query keywords.'
                : 'Get started by creating your very first analysis session and pasting raw meeting notes.'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateNewSession}
                className="mt-6 flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer"
              >
                <Plus size={16} />
                <span>Create First Session</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-auto md:h-10 py-3 md:py-0 bg-slate-100 border-t border-slate-200 px-6 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 text-[11px] text-slate-500 shrink-0">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4">
          <span className="flex items-center gap-1.5 text-green-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> System Active
          </span>
          <span className="hidden md:inline h-3 w-px bg-slate-300"></span>
          <span>Total Sessions Saved: {sessions.length}</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <span>Enterprise Console</span>
          <span className="font-mono bg-slate-200/60 px-1.5 py-0.5 rounded text-[10px]">v1.0.4-enterprise</span>
        </div>
      </footer>

      {/* Confirmation Modal */}
      {sessionToDelete && (
        <div id="delete-confirmation-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900">Delete Analysis Session</h3>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Are you sure you want to delete this analysis session? This will permanently delete all generated AI documents and export records associated with it. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                id="cancel-delete-btn"
                disabled={deleting}
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition cursor-pointer disabled:opacity-50 flex items-center space-x-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
