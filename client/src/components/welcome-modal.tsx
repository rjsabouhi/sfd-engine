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
            className="w-[85%] max-w-[420px] max-h-[85vh] overflow-y-auto rounded-[18px] p-6"
            style={{
              backgroundColor: '#0f0f0f',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              lineHeight: 1.45,
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="welcome-modal-card"
          >
            <h1 
              className="text-xl font-semibold mb-4"
              style={{ color: '#ffffff' }}
            >
              Welcome to the SFD Engine.
            </h1>
            
            <p className="mb-4" style={{ color: '#e8e8e8' }}>
              A visualization tool for exploring emergent patterns in complex systems.
            </p>

            <p className="mb-4" style={{ color: '#e8e8e8' }}>
              What you're about to see is mathematics in motion — flows, tensions, and attractors that unfold and reorganize in real time.
            </p>

            <p className="mb-6" style={{ color: '#e8e8e8' }}>
              It is not alive, and it is not reacting to you. But many people find the patterns strangely familiar because our brains naturally recognize structure, symmetry, and change.
            </p>

            <h2 
              className="text-lg font-medium mb-3"
              style={{ color: '#ffffff' }}
            >
              How to Use It
            </h2>
            
            <ul className="mb-6 space-y-2" style={{ color: '#e8e8e8' }}>
              <li className="flex gap-2">
                <span className="shrink-0">•</span>
                <span>Press <span className="font-medium">▶</span> to start the simulation.</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0">•</span>
                <span>Touch & drag inside the field to add perturbations.</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0">•</span>
                <span>Tap the bottom panels to explore layers, parameters, and playback.</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0">•</span>
                <span>You can't break anything. Every change simply reshapes the dynamics.</span>
              </li>
            </ul>

            <h2 
              className="text-lg font-medium mb-3"
              style={{ color: '#ffffff' }}
            >
              If You Feel Disoriented
            </h2>
            
            <p className="mb-6" style={{ color: '#e8e8e8' }}>
              Some visuals can feel immersive or intense. If that happens, just pause the simulation and take a moment.
            </p>

            <h2 
              className="text-lg font-medium mb-3"
              style={{ color: '#ffffff' }}
            >
              What This Is
            </h2>
            
            <p className="mb-6" style={{ color: '#e8e8e8' }}>
              The SFD Engine is a real-time emergent dynamics simulator. It helps you see how structure forms, dissolves, and stabilizes inside a complex system. No background knowledge required.
            </p>

            <div className="flex flex-col items-center gap-3 pt-2">
              <p 
                className="text-sm opacity-70"
                style={{ color: '#e8e8e8' }}
              >
                Tap anywhere to begin.
              </p>
              
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
                Begin
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
