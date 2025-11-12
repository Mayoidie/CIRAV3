import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Lock, IdCard, UserPlus } from 'lucide-react';
import { useToast } from '../ui/toast-container';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { auth, db } from '../../lib/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import MainLogoWhite from '../../assets/MainLogoWhite.png';
import { PasswordChecklist } from './PasswordChecklist';

interface SignupPageProps {
  onNavigateToLogin: () => void;
  onSignupSuccess: (email: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigateToLogin, onSignupSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'student',
    studentId: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { showToast } = useToast();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (isSubmitted) {
      setIsSubmitted(false);
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
    const value = e.target.value;
    if (value === '@plv.edu.ph') {
      setFormData(prev => ({ ...prev, email: '' }));
    } else if (value && !value.endsWith('@plv.edu.ph')) {
      setFormData(prev => ({ ...prev, email: value + '@plv.edu.ph' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    let isValid = true;

    if (!formData.firstName) {
      newErrors.firstName = true;
      isValid = false;
    }
    if (!formData.lastName) {
      newErrors.lastName = true;
      isValid = false;
    }
    if (!formData.email || formData.email === '@plv.edu.ph') {
      newErrors.email = true;
      isValid = false;
    }
    if (!formData.studentId) {
      newErrors.studentId = true;
      isValid = false;
    }
    if (!formData.password) {
      newErrors.password = true;
      isValid = false;
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = true;
      isValid = false;
    }

    const studentIdRegex = /^\d{2}-\d{4}$/;
    if (formData.studentId && !studentIdRegex.test(formData.studentId)) {
      newErrors.studentId = true;
      showToast('Student ID must be in format: XX-XXXX (e.g., 23-3302)', 'error');
      isValid = false;
    }

    // Password policy validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (formData.password && !passwordRegex.test(formData.password)) {
      newErrors.password = true;
      isValid = false;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.password = true;
      newErrors.confirmPassword = true;
      showToast('Passwords do not match', 'error');
      isValid = false;
    }

    setErrors(newErrors);
    if (!isValid && !newErrors.password) {
      showToast('Please fill in all required fields correctly', 'error');
    }

    return isValid;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      const userData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        studentId: formData.studentId,
        role: 'student', 
      };

      if (formData.role === 'class-representative') {
        userData.requestedRole = 'class-representative';
      }

      await setDoc(doc(db, "users", user.uid), userData);

      await sendEmailVerification(user);
      onSignupSuccess(formData.email);

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        showToast('This email is already in use.', 'error');
      } else {
        console.error("Detailed Signup Error:", error);
        showToast('Failed to create account. Please try again.', 'error');
      }
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
        className="w-full max-w-2xl"
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#3942A7] to-[#1B1F50] p-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} className="w-20 h-20 mx-auto mb-4 flex items-center justify-center" style={{ width: '120px', height: '120px' }}>
              <ImageWithFallback src={MainLogoWhite} alt="CIRA" className="w-full h-full object-cover" />
            </motion.div>
            <p className="text-white/80">Create your account</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[#1E1E1E] mb-2">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border ${errors.firstName ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
                      placeholder="Juan"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[#1E1E1E] mb-2">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border ${errors.lastName ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
                      placeholder="Dela Cruz"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[#1E1E1E] mb-2">Email (@plv.edu.ph only)</label>
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
                    placeholder="student@plv.edu.ph"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[#1E1E1E] mb-2">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all"
                  >
                    <option value="student">Student</option>
                    <option value="class-representative">Class Representative</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#1E1E1E] mb-2">Student ID (XX-XXXX)</label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
                    <input
                      type="text"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border ${errors.studentId ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
                      placeholder="23-3302"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex justify-between items-center">
                    <label className="block text-[#1E1E1E] mb-2">Password</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border ${errors.password ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[#1E1E1E] mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border ${errors.confirmPassword ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
              <PasswordChecklist password={formData.password} isSubmitted={isSubmitted} />
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
                    <UserPlus className="w-5 h-5" />
                    <span>Create Account</span>
                  </>
                )}
              </motion.button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-[#7A7A7A]">
                Already have an account?{' '}
                <button
                  onClick={onNavigateToLogin}
                  className="text-[#3942A7] hover:underline transition-all"
                >
                  Login
                </button>
              </p>
            </div>
          </div>
          <div className="bg-[#F9FAFB] px-8 py-4 text-center border-t">
            <p className="text-[#7A7A7A]">College of Engineering and Information Technology</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
