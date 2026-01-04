import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'sfd-hasSeenIntro';

export function WelcomeModal() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // TODO: Restore localStorage check after testing
    // const hasSeenIntro = localStorage.getItem(STORAGE_KEY);
    // if (!hasSeenIntro) {
    //   setIsVisible(true);
    // }
    setIsVisible(true); // Always show for testing
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={handleDismiss}
          data-testid="welcome-modal-backdrop"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-[85%] max-w-[400px] rounded-[18px] p-5"
            style={{
              backgroundColor: '#0f0f0f',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              lineHeight: 1.5,
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="welcome-modal-card"
          >
            <h1 
              className="text-lg font-semibold mb-3"
              style={{ color: '#ffffff' }}
            >
              Welcome.
            </h1>
            
            <p className="mb-3.5 text-sm" style={{ color: '#e8e8e8' }}>
              This tool generates and visualizes emergent behavior in complex adaptive systems.
            </p>

            <p className="mb-4 text-sm" style={{ color: '#e8e8e8' }}>
              It shows how simple local rules can produce structured global patterns.
            </p>

            <p className="mb-3.5 text-sm" style={{ color: '#e8e8e8' }}>
              It is not a physics engine, not a neural model, and not a predictive system.
            </p>

            <p className="mb-4 text-sm" style={{ color: '#e8e8e8' }}>
              It is an interactive environment for observing how structure forms, changes, and dissolves.
            </p>

            <p className="mb-3.5 text-sm" style={{ color: '#e8e8e8' }}>
              There is no correct interpretation.
            </p>

            <p className="mb-5 text-sm" style={{ color: '#e8e8e8' }}>
              Just watch what the system does.
            </p>

            <div className="flex flex-col items-center">
              <button
                onClick={handleDismiss}
                className="px-6 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
                data-testid="button-begin"
              >
                Press Run.
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
