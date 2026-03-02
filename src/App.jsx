import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LandingNav from './components/LandingNav';
import AuthModal from './components/AuthModal';
import Landing from './pages/Landing';
import Portal from './pages/Portal';
import './styles/global.css';

export default function App() {
  const { user } = useAuth();
  const [modal, setModal] = useState(null); // null | 'login' | 'register'
  const [inPortal, setInPortal] = useState(false);

  const openLogin    = () => setModal('login');
  const openRegister = () => setModal('register');
  const closeModal   = () => {
    setModal(null);
    // If user just authenticated, go straight to portal
    if (user) setInPortal(true);
  };

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

  if (inPortal && user) {
    return <Portal onBackToSite={() => setInPortal(false)} />;
  }

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
