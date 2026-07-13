"use client";

import { useState, useRef, useEffect } from "react";
import { Lock, X } from "lucide-react";

interface PinModalProps {
  open: boolean;
  correctPin: string;
  onUnlock: () => void;
  onClose: () => void;
}

export function PinModal({ open, correctPin, onUnlock, onClose }: PinModalProps) {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setPin(["", "", "", "", "", ""]);
      setError(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(false);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value) {
      const entered = newPin.join("");
      if (entered === correctPin) {
        onUnlock();
      } else {
        setError(true);
        setPin(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 200);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-white">Conteúdo Restrito</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-zinc-400 text-sm mb-6 text-center">
          Digite o PIN para acessar este conteúdo
        </p>

        <div className="flex justify-center gap-3 mb-4">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="tel"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-11 h-14 text-center text-xl font-bold bg-zinc-800 border-2 rounded-xl text-white outline-none transition-colors ${
                error ? "border-red-500" : "border-zinc-700 focus:border-yellow-500"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center">PIN incorreto. Tente novamente.</p>
        )}
      </div>
    </div>
  );
}
