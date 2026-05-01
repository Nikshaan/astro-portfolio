import { useState, useEffect, useRef } from 'react';

export type IntroPhase = 'init' | '0-appear' | '1-hold' | '2-scatter' | '3-fade' | 'done';

export function useIntroState() {
  const [phase, setPhase] = useState<IntroPhase>('init');
  const [shouldSkip, setShouldSkip] = useState(false);
  const isVisible = useRef(!document.hidden);
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  const addTimeout = (cb: () => void, delay: number) => {
    const id = setTimeout(cb, delay);
    timeouts.current.push(id);
  };

  const clearAllTimeouts = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('portfolio_intro_seen');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (hasSeen === '1' || prefersReducedMotion) {
      setShouldSkip(true);
      setPhase('done');
      return;
    }

    const handleVisibility = () => {
      isVisible.current = !document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibility);
    
    const tryStart = () => {
      if (!isVisible.current) {
        const onFirstVisible = () => {
          if (!document.hidden) {
            document.removeEventListener('visibilitychange', onFirstVisible);
            startSequence();
          }
        };
        document.addEventListener('visibilitychange', onFirstVisible);
      } else {
        startSequence();
      }
    };

    const startSequence = () => {
      setPhase('0-appear');
      
      addTimeout(() => {
        setPhase('1-hold');
        
        addTimeout(() => {
          setPhase('2-scatter');
        }, 500); 
      }, 180); 
    };

    tryStart();

    return () => {
      clearAllTimeouts();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (phase === 'done') {
      sessionStorage.setItem('portfolio_intro_seen', '1');
    }
  }, [phase]);

  return { phase, setPhase, shouldSkip, isVisible };
}
