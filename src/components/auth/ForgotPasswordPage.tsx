
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Send, ArrowLeft } from 'lucide-react';
import { useToast } from '../ui/toast-container';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import MainLogoWhite from '../../assets/MainLogoWhite.png';

interface ForgotPasswordPageProps {
  onNavigateToLogin: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigateToLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: false });
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrors({ email: false });

    if (!email) {
      setErrors({ email: true });
      showToast('Please enter your email address', 'error');
      return;
    }

    if (!email.endsWith('@plv.edu.ph')) {
      setErrors({ email: true });
      showToast('Please enter a valid @plv.edu.ph email address', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const auth = getAuth();
      const actionCodeSettings = {
        url: `https://${auth.config.authDomain}`,
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      showToast(`Password reset link sent to ${email}`, 'success');
      setTimeout(() => {
        onNavigateToLogin();
      }, 2000);
    } catch (error) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast(errorMessage, 'error');
    } finally {
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
          {/* Header */}
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
            <p className="text-white/80">Reset your password</p>
          </div>

          {/* Form */}
          <div className="p-8">
            <p className="text-[#7A7A7A] mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[#1E1E1E] mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border ${errors.email ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
                    placeholder="your.email@plv.edu.ph"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-[#3942A7] to-[#1B1F50] text-white py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send Verification Link</span>
                  </>
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

          {/* Footer */}
          <div className="bg-[#F9FAFB] px-8 py-4 text-center border-t">
            <p className="text-[#7A7A7A]">College of Engineering and Information Technology</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
