import { useState, useEffect } from 'react';
import { getSavedUser, clearAuth, User } from './services/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SessionDetails from './pages/SessionDetails';

type Page = 'login' | 'register' | 'dashboard' | 'session-details';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [initializing, setInitializing] = useState(true);

  // Authenticate user on startup
  useEffect(() => {
    const savedUser = getSavedUser();
    if (savedUser) {
      setUser(savedUser);
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('login');
    }
    setInitializing(false);
  }, []);

  const handleLoginSuccess = () => {
    const saved = getSavedUser();
    setUser(saved);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setCurrentPage('login');
  };

  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
    setCurrentPage('session-details');
  };

  const handleCreateNewSession = () => {
    setSelectedSessionId('new');
    setCurrentPage('session-details');
  };

  const handleBackToDashboard = () => {
    setSelectedSessionId('');
    setCurrentPage('dashboard');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-semibold">Initializing BA Copilot Workspace...</p>
      </div>
    );
  }

  // Render correct view based on active route
  switch (currentPage) {
    case 'login':
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onNavigateToRegister={() => setCurrentPage('register')}
        />
      );
    case 'register':
      return (
        <Register
          onRegisterSuccess={handleLoginSuccess}
          onNavigateToLogin={() => setCurrentPage('login')}
        />
      );
    case 'dashboard':
      return (
        <Dashboard
          user={user || { name: 'Business Analyst', email: '' }}
          onLogout={handleLogout}
          onSelectSession={handleSelectSession}
          onCreateNewSession={handleCreateNewSession}
        />
      );
    case 'session-details':
      return (
        <SessionDetails
          sessionId={selectedSessionId}
          onBackToDashboard={handleBackToDashboard}
        />
      );
    default:
      return (
        <div className="p-8">
          <p className="text-red-500 font-bold">Error: View not found</p>
          <button onClick={() => setCurrentPage('dashboard')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
            Back to Dashboard
          </button>
        </div>
      );
  }
}
