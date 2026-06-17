import { useState, useCallback, useRef } from 'react';
import { Anchor, Delete } from 'lucide-react';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;
const LOCKOUT_KEY = 'pin_lockout_until';
const ATTEMPTS_KEY = 'pin_attempts';
const PIN_LENGTH = 4;

/** Constant-time comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function getCorrectPin(): string {
  const envPin = import.meta.env.VITE_APP_PIN;
  if (envPin && /^\d{4,8}$/.test(envPin)) return envPin;
  console.warn('VITE_APP_PIN no configurado o inválido, usando fallback seguro. Define VITE_APP_PIN en .env');
  return '2026';
}

function isLockedOut(): { locked: boolean; remainingMs: number } {
  try {
    const until = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
    const now = Date.now();
    if (until > now) return { locked: true, remainingMs: until - now };
  } catch { /* ignore */ }
  return { locked: false, remainingMs: 0 };
}

function recordAttempt(success: boolean) {
  try {
    if (success) {
      localStorage.removeItem(LOCKOUT_KEY);
      localStorage.removeItem(ATTEMPTS_KEY);
      return;
    }
    const stored = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10);
    const attempts = stored + 1;
    localStorage.setItem(ATTEMPTS_KEY, String(attempts));
    if (attempts >= MAX_ATTEMPTS) {
      localStorage.setItem(LOCKOUT_KEY, String(Date.now() + LOCKOUT_MS));
    }
  } catch { /* ignore localStorage errors */ }
}

function getAttempts(): number {
  try {
    return parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10);
  } catch { return 0; }
}

export default function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [lockout, setLockout] = useState<{ locked: boolean; remainingMs: number }>(isLockedOut);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLockoutTimer = useCallback(() => {
    const update = () => setLockout(isLockedOut());
    update();
    timerRef.current = setInterval(update, 1000);
    setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setLockout({ locked: false, remainingMs: 0 });
      setPin('');
      setError(false);
    }, LOCKOUT_MS);
  }, []);

  const handleDigit = useCallback((digit: string) => {
    if (lockout.locked) return;
    setError(false);
    setPin(prev => {
      const next = prev + digit;
      if (next.length === PIN_LENGTH) {
        const correct = getCorrectPin();
        if (safeCompare(next, correct)) {
          recordAttempt(true);
          onUnlock();
        } else {
          recordAttempt(false);
          setError(true);
          setShake(true);
          setTimeout(() => { setShake(false); setPin(''); }, 500);
          const { locked } = isLockedOut();
          if (locked) startLockoutTimer();
        }
      }
      return next.length <= PIN_LENGTH ? next : prev;
    });
  }, [lockout.locked, onUnlock, startLockoutTimer]);

  const handleDelete = useCallback(() => {
    if (lockout.locked) return;
    setError(false);
    setPin(prev => prev.slice(0, -1));
  }, [lockout.locked]);

  const attemptsUsed = getAttempts();
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

      {/* Error + Lockout */}
      <div className="h-6 mb-4">
        {error && !lockout.locked && <p className="text-sm text-destructive">PIN incorrecto. Intenta de nuevo.</p>}
        {lockout.locked && (
          <p className="text-sm text-destructive">
            Demasiados intentos. Espera {Math.ceil(lockout.remainingMs / 1000)}s
          </p>
        )}
      </div>

      {/* Attempts remaining indicator */}
      {!lockout.locked && attemptsUsed > 0 && (
        <div className="mb-4 text-[10px] text-muted-foreground">
          Intentos restantes: {MAX_ATTEMPTS - attemptsUsed}
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-[260px]">
        {digits.map((d, i) => {
          if (d === '') return <div key={i} />;
          if (d === 'del') return (
            <button
              key={i}
              onClick={handleDelete}
              disabled={lockout.locked}
              className="h-16 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary/60 active:bg-secondary transition-colors disabled:opacity-30"
            >
              <Delete className="h-6 w-6" />
            </button>
          );
          return (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              disabled={lockout.locked}
              className="h-16 rounded-xl bg-card border border-border text-foreground text-2xl font-medium hover:bg-secondary active:bg-primary/20 transition-colors disabled:opacity-30"
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
