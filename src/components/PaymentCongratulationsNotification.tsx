import { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface PaymentCongratulationsNotificationProps {
  onClose: () => void;
  onAnimationComplete: () => void;
  paymentAmount: number;
  totalDue: number;
}

export function PaymentCongratulationsNotification({
  onClose,
  onAnimationComplete,
  paymentAmount,
  totalDue
}: PaymentCongratulationsNotificationProps) {
  const { isDark } = useTheme();
  const [stage, setStage] = useState<'congratulations' | 'zooming' | 'locked'>('congratulations');

  useEffect(() => {
    const congratsTimer = setTimeout(() => {
      setStage('zooming');
    }, 3000);

    return () => clearTimeout(congratsTimer);
  }, []);

  useEffect(() => {
    if (stage === 'zooming') {
      const zoomTimer = setTimeout(() => {
        setStage('locked');
        onAnimationComplete();
      }, 1500);

      return () => clearTimeout(zoomTimer);
    }
  }, [stage, onAnimationComplete]);

  if (stage === 'congratulations') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div
          className={`relative max-w-md w-full mx-4 p-8 rounded-3xl shadow-2xl transform transition-all duration-500 ${
            isDark
              ? 'bg-gradient-to-br from-green-900 via-green-800 to-emerald-900'
              : 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50'
          }`}
          style={{
            animation: 'slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
          }}
        >
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
              isDark
                ? 'hover:bg-white/10 text-white/70 hover:text-white'
                : 'hover:bg-black/5 text-gray-500 hover:text-gray-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div
                className={`absolute inset-0 rounded-full blur-xl ${
                  isDark ? 'bg-green-400' : 'bg-green-500'
                }`}
                style={{
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              />
              <CheckCircle
                className={`w-24 h-24 relative ${
                  isDark ? 'text-green-400' : 'text-green-600'
                }`}
                strokeWidth={2}
                style={{
                  animation: 'checkmarkDraw 0.8s ease-in-out forwards',
                  filter: 'drop-shadow(0 10px 20px rgba(34, 197, 94, 0.3))'
                }}
              />
            </div>

            <div className="space-y-2">
              <h2
                className={`text-3xl font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
                style={{
                  animation: 'fadeInUp 0.6s ease-out 0.3s both'
                }}
              >
                Congratulations!
              </h2>
              <p
                className={`text-lg ${
                  isDark ? 'text-green-200' : 'text-green-700'
                }`}
                style={{
                  animation: 'fadeInUp 0.6s ease-out 0.5s both'
                }}
              >
                Your payment has been settled
              </p>
            </div>

            <div
              className={`w-full p-6 rounded-2xl ${
                isDark
                  ? 'bg-white/10 border border-white/20'
                  : 'bg-white border border-green-200'
              }`}
              style={{
                animation: 'fadeInUp 0.6s ease-out 0.7s both'
              }}
            >
              <div className="text-sm font-medium mb-2 opacity-75">
                Payment Amount
              </div>
              <div
                className={`text-3xl font-bold ${
                  isDark ? 'text-green-400' : 'text-green-600'
                }`}
              >
                ₹{paymentAmount.toLocaleString('en-IN')}
              </div>
            </div>

            <p
              className={`text-sm ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}
              style={{
                animation: 'fadeInUp 0.6s ease-out 0.9s both'
              }}
            >
              You can check your updated dues below
            </p>
          </div>

          <style>{`
            @keyframes slideInBounce {
              0% {
                transform: scale(0.3) translateY(-100px);
                opacity: 0;
              }
              50% {
                transform: scale(1.05) translateY(0);
              }
              70% {
                transform: scale(0.95);
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }

            @keyframes checkmarkDraw {
              0% {
                transform: scale(0) rotate(-45deg);
                opacity: 0;
              }
              50% {
                transform: scale(1.2) rotate(0deg);
              }
              100% {
                transform: scale(1) rotate(0deg);
                opacity: 1;
              }
            }

            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (stage === 'zooming' || stage === 'locked') {
    return (
      <div
        className={`fixed z-50 transition-all duration-1000 ease-out ${
          stage === 'zooming'
            ? 'inset-0 flex items-center justify-center'
            : 'top-4 right-4'
        }`}
        style={{
          animation: stage === 'zooming' ? 'zoomToCorner 1.5s ease-out forwards' : undefined
        }}
      >
        <div
          className={`p-6 rounded-2xl shadow-2xl transform transition-all duration-1000 ${
            isDark
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700'
              : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
          } ${
            stage === 'zooming' ? 'scale-100' : 'scale-75'
          }`}
        >
          <div className="space-y-3">
            <h3
              className={`text-lg font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Net Dues Till Date
            </h3>
            <div
              className={`text-3xl font-bold ${
                totalDue > 0
                  ? isDark ? 'text-red-400' : 'text-red-600'
                  : isDark ? 'text-green-400' : 'text-green-600'
              }`}
            >
              ₹{totalDue.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes zoomToCorner {
            0% {
              transform: translate(0, 0) scale(1);
            }
            100% {
              transform: translate(calc(50vw - 150px), calc(-50vh + 100px)) scale(0.75);
            }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
