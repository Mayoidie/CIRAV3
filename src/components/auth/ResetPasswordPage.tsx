
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { KeyRound, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useToast } from '../ui/toast-container';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getAuth, confirmPasswordReset } from 'firebase/auth';
import MainLogoWhite from '../../assets/MainLogoWhite.png';

interface ResetPasswordPageProps {
  onNavigateToLogin: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigateToLogin }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('oobCode');
    if (code) {
      setOobCode(code);
    } else {
      showToast('Invalid password reset link.', 'error');
      onNavigateToLogin();
    }
  }, [onNavigateToLogin, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (!oobCode) {
      showToast('Invalid or expired password reset link.', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const auth = getAuth();
      await confirmPasswordReset(auth, oobCode, password);
      showToast('Password has been reset successfully. You can now log in with your new password.', 'success');
      setTimeout(() => {
        onNavigateToLogin();
      }, 3000);
    } catch (error) {
      let errorMessage = "Failed to reset password. The link may be expired or invalid.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast(errorMessage, 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050A30] via-[#1B1F50] to-[#3942A7] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#3942A7] to-[#1B1F50] p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ width: '100px', height: '100px' }}
            >
              <ImageWithFallback
                src={MainLogoWhite}
                alt="CIRA"
                className="w-full h-full object-cover rounded-full"
              />
            </motion.div>
            <p className="text-white/80">Reset Your Password</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[#1E1E1E] mb-2">New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all"
                    placeholder="Enter new password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]">
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#1E1E1E] mb-2">Confirm New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all"
                    placeholder="Confirm new password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]">
                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-[#3942A7] to-[#1B1F50] text-white py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Reset Password'
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={onNavigateToLogin}
                className="text-[#3942A7] hover:underline transition-all flex items-center justify-center gap-2 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
