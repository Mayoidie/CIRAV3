import React from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';

interface VerificationPageProps {
  email: string;
  onResendVerification: () => void;
  onReturnToLogin: () => void;
  isResending: boolean;
  cooldown: number;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({ email, onResendVerification, onReturnToLogin, isResending, cooldown }) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050A30] via-[#1B1F50] to-[#3942A7] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
      >
        <div className="text-center">
          <div className="w-20 h-20 bg-[#1DB954]/10 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Mail className="w-10 h-10 text-[#1DB954]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1E1E1E] mb-3">Verify Your Email</h2>
          <p className="text-[#7A7A7A] mb-2">
            A verification link has been sent to your email address:
          </p>
          <p className="font-semibold text-[#3942A7] mb-6">{email}</p>
          <p className="text-[#7A7A7A] mb-8">
            Please check your inbox and click the link to activate your account.
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={onResendVerification}
              disabled={isResending || cooldown > 0}
              className="w-full bg-[#3942A7] text-white py-3 rounded-lg font-semibold hover:bg-[#2d348a] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isResending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : cooldown > 0 ? (
                `Resend in ${formatTime(cooldown)}`
              ) : (
                'Resend Verification Link'
              )}
            </button>
            <button
              onClick={onReturnToLogin}
              className="w-full text-[#3942A7] font-semibold py-3 flex items-center justify-center gap-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Return to Login
            </button>
          </div>
          <p className="text-sm text-[#7A7A7A] mt-6">
            Already verified? Try logging in again.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
