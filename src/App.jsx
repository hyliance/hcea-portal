import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LandingNav from './components/LandingNav';
import AuthModal from './components/AuthModal';
import Landing from './pages/Landing';
import Portal from './pages/Portal';
import './styles/global.css';

export default function App() {
  const { user, loading } = useAuth();
  const [modal, setModal]     = useState(null); // null | 'login' | 'register'
  const [inPortal, setInPortal] = useState(false);

  // Auto-enter portal if user is already logged in (handles hard refresh + remember-me)
  // Only runs once loading is done so we don't flash the landing page
  const hasAutoEntered = useState(() => false);

  const openLogin    = () => setModal('login');
  const openRegister = () => setModal('register');

  // After login/register, auto-enter portal
  const handleAuthSuccess = () => {
    setModal(null);
    setInPortal(true);
  };

  // If user is logged in and clicked portal
  const goToPortal = () => {
    if (user) { setInPortal(true); }
    else { openRegister(); }
  };

  // Auto-enter portal when a persisted session is restored on page load
  if (!loading && user && !inPortal) {
    return <Portal onBackToSite={() => setInPortal(false)} />;
  }

  if (inPortal && user) {
    return <Portal onBackToSite={() => setInPortal(false)} />;
  }

  // Show nothing while checking session to avoid flash of landing page
  if (loading) return null;

  return (
    <>
      <LandingNav onLogin={openLogin} onJoin={openRegister} />
      <Landing onLoginClick={openLogin} onJoinClick={goToPortal} />

      {modal && (
        <AuthModal
          defaultTab={modal}
          onClose={handleAuthSuccess}
        />
      )}
    </>
  );
}
