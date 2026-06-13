import { useState, useCallback } from 'react';
import { Anchor, Delete } from 'lucide-react';

const CORRECT_PIN = '2026';

export default function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    setError(false);
    setPin(prev => {
      const next = prev + digit;
      if (next.length === 4) {
        if (next === CORRECT_PIN) {
          onUnlock();
        } else {
          setError(true);
          setShake(true);
          setTimeout(() => { setShake(false); setPin(''); }, 500);
        }
      }
      return next.length <= 4 ? next : prev;
    });
  }, [onUnlock]);

  const handleDelete = useCallback(() => {
    setError(false);
    setPin(prev => prev.slice(0, -1));
  }, []);

  const digits = ['1','2','3','4','5','6','7','8','9','','0','del'];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      {/* Logo */}
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
        <Anchor className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Comando Central</h1>
      <p className="text-sm text-muted-foreground mb-8">Ingresa tu PIN para continuar</p>

      {/* Dots */}
      <div className={`flex gap-4 mb-3 ${shake ? 'animate-shake' : ''}`}>
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? error ? 'bg-destructive border-destructive' : 'bg-primary border-primary'
                : 'border-muted-foreground/40'
            }`}
          />
        ))}
      </div>

      {/* Error */}
      <div className="h-6 mb-4">
        {error && <p className="text-sm text-destructive">PIN incorrecto. Intenta de nuevo.</p>}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-[260px]">
        {digits.map((d, i) => {
          if (d === '') return <div key={i} />;
          if (d === 'del') return (
            <button
              key={i}
              onClick={handleDelete}
              className="h-16 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary/60 active:bg-secondary transition-colors"
            >
              <Delete className="h-6 w-6" />
            </button>
          );
          return (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              className="h-16 rounded-xl bg-card border border-border text-foreground text-2xl font-medium hover:bg-secondary active:bg-primary/20 transition-colors"
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
