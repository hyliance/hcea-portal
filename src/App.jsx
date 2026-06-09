import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LandingNav from './components/LandingNav';
import AuthModal from './components/AuthModal';
import Landing from './pages/Landing';
import Portal from './pages/Portal';
import './styles/global.css';

export default function App() {
  const { user, loading } = useAuth();
  const [modal, setModal]       = useState(null); // null | 'login' | 'register'
  const [inPortal, setInPortal] = useState(false);
  const [showLanding, setShowLanding] = useState(false); // lets logged-in users visit homepage

  const openLogin    = () => setModal('login');
  const openRegister = () => setModal('register');

  const handleAuthSuccess = () => {
    setModal(null);
    setShowLanding(false);
    setInPortal(true);
  };

  const goToPortal = () => {
    if (user) { setShowLanding(false); setInPortal(true); }
    else { openRegister(); }
  };

  const goToHomepage = () => {
    setShowLanding(true);
    setInPortal(false);
  };

  // Show nothing while checking session to avoid flash of landing page
  if (loading) return null;

  // Logged-in user in portal (default after login or session restore)
  if (user && !showLanding) {
    return <Portal onBackToSite={goToHomepage} />;
  }

  // Landing page — shown to logged-out users or when logged-in user clicks Homepage
  return (
    <>
      <LandingNav onLogin={openLogin} onJoin={openRegister} user={user} onGoToPortal={goToPortal} />
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
