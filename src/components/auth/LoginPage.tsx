import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, Send, AlertTriangle } from 'lucide-react';
import { useToast } from '../ui/toast-container';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { auth, db } from '../../lib/firebase';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import MainLogoWhite from '../../assets/MainLogoWhite.png';

interface LoginPageProps {
  onLogin: () => void;
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToSignup, onNavigateToForgotPassword }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUnverifiedEmailMessage, setShowUnverifiedEmailMessage] = useState(false);
  const { showToast } = useToast();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (!value || value === '@plv.edu.ph') return 'Email is required';
        if (!value.endsWith('@plv.edu.ph')) return 'Email must be a valid @plv.edu.ph address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }
      return newErrors;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      const error = validateField(name, value);
      if (!error) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  const handleEmailFocus = () => {
    if (!formData.email) {
      setFormData(prev => ({ ...prev, email: '@plv.edu.ph' }));
    }
  };

  const handleEmailClick = () => {
    if (emailInputRef.current && formData.email === '@plv.edu.ph') {
      setTimeout(() => {
        emailInputRef.current?.setSelectionRange(0, 0);
      }, 0);
    }
  };

  useEffect(() => {
    if (formData.email === '@plv.edu.ph' && emailInputRef.current) {
      setTimeout(() => {
        emailInputRef.current?.setSelectionRange(0, 0);
      }, 0);
    }
  }, [formData.email]);

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    handleBlur(e);
    const { value } = e.target;
    if (value === '@plv.edu.ph') {
      setFormData(prev => ({ ...prev, email: '' }));
    } else if (value && !value.endsWith('@plv.edu.ph')) {
      setFormData(prev => ({ ...prev, email: value + '@plv.edu.ph' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const fields: Array<keyof typeof formData> = ['email', 'password'];

    fields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
      showToast('Please check the form for errors.', 'error');
    }
    return isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setShowUnverifiedEmailMessage(true);
        setIsLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        localStorage.setItem('currentUser', JSON.stringify({ id: user.uid, ...userDoc.data() }));
        showToast(`Welcome back, ${userDoc.data().firstName}!`, 'success');
        onLogin();
      }
    } catch (error) {
      showToast('Invalid email or password', 'error');
      setErrors({ email: 'Invalid email or password', password: ' ' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        showToast('Verification link resent successfully!', 'success');
      } catch (error) {
        showToast('Failed to resend verification email.', 'error');
      }
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
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} className="w-20 h-20 mx-auto mb-4 flex items-center justify-center" style={{ width: '120px', height: '120px' }}>
              <ImageWithFallback src={MainLogoWhite} alt="CIRA" className="w-full h-full object-cover" />
            </motion.div>
            <p className="text-white/80">Computer Issue Reporting Application</p>
          </div>

          <div className="p-8">
            {showUnverifiedEmailMessage ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="w-20 h-20 bg-yellow-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-yellow-500" />
                </div>
                <h2 className="text-[#1E1E1E] mb-3">Email Not Verified</h2>
                <p className="text-[#7A7A7A] mb-6">
                  Please verify your email address to log in. Check your inbox for a verification link.
                </p>
                <div className="space-y-3">
                  <motion.button onClick={handleResendVerification} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full bg-yellow-500 text-white py-3 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" />
                    <span>Resend Verification Email</span>
                  </motion.button>
                  <motion.button onClick={() => setShowUnverifiedEmailMessage(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full bg-white text-[#3942A7] py-3 rounded-lg border-2 border-[#3942A7] hover:bg-[#3942A7]/5 transition-all flex items-center justify-center gap-2">
                    <LogIn className="w-5 h-5" />
                    <span>Back to Login</span>
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <>
                <h2 className="text-[#1E1E1E] mb-6">Login to your account</h2>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-[#1E1E1E] mb-2">
                      Email {errors.email && <span className="text-[#FF4D4F]">*</span>}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
                      <input
                        ref={emailInputRef}
                        type="text"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onFocus={handleEmailFocus}
                        onClick={handleEmailClick}
                        onBlur={handleEmailBlur}
                        className={`w-full pl-10 pr-4 py-3 border ${errors.email ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
                        placeholder="your.email@plv.edu.ph"
                      />
                    </div>
                    {errors.email && <p className="text-[#FF4D4F] text-sm mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-[#1E1E1E] mb-2">
                      Password {errors.password && <span className="text-[#FF4D4F]">*</span>}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`w-full pl-10 pr-4 py-3 border ${errors.password ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
                        placeholder="••••••••"
                      />
                    </div>
                    {errors.password && <p className="text-[#FF4D4F] text-sm mt-1">{errors.password}</p>}
                  </div>
                  <button type="button" onClick={onNavigateToForgotPassword} className="text-[#3942A7] hover:underline transition-all">
                    Forgot password?
                  </button>
                  <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full bg-gradient-to-r from-[#3942A7] to-[#1B1F50] text-white py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><LogIn className="w-5 h-5" /><span>Login</span></>}
                  </motion.button>
                </form>
                <div className="mt-6 text-center">
                  <p className="text-[#7A7A7A]">
                    Don't have an account?{' '}
                    <button onClick={onNavigateToSignup} className="text-[#3942A7] hover:underline transition-all">Sign up</button>
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="bg-[#F9FAFB] px-8 py-4 text-center border-t">
            <p className="text-[#7A7A7A]">College of Engineering and Information Technology</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
