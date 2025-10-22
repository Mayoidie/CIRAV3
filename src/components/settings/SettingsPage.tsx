import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, IdCard, Lock, Save } from 'lucide-react';
import { useToast } from '../ui/toast-container';
import { auth } from '../../lib/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const { showToast } = useToast();

  useEffect(() => {
    const currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    setUser(currentUserData);
  }, []);

  if (!user) return null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-[#FF4D4F] text-white';
      case 'class-representative':
        return 'bg-[#1DB954] text-white';
      default:
        return 'bg-[#3942A7] text-white';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'class-representative':
        return 'Class Representative';
      default:
        return 'Student';
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, boolean> = {};
    if (!passwords.current) newErrors.current = true;
    if (!passwords.new) newErrors.new = true;
    if (!passwords.confirm) newErrors.confirm = true;

    if (passwords.new !== passwords.confirm) {
      newErrors.new = true;
      newErrors.confirm = true;
      showToast('New passwords do not match', 'error');
      setErrors(newErrors);
      return;
    }

    if (passwords.new.length < 6) {
      newErrors.new = true;
      showToast('Password must be at least 6 characters', 'error');
      setErrors(newErrors);
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fill in all required fields correctly', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email) {
        const credential = EmailAuthProvider.credential(currentUser.email, passwords.current);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, passwords.new);
        showToast('Password changed successfully', 'success');
        setPasswords({ current: '', new: '', confirm: '' });
      }
    } catch (error) {
      showToast('Failed to change password. Please check your current password.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
      >
        <h3 className="text-[#1E1E1E] mb-6">Profile Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-[#7A7A7A] mb-2">
              <User className="w-4 h-4" />
              Full Name
            </label>
            <input
              type="text"
              value={`${user.firstName} ${user.lastName}`}
              disabled
              className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-[#7A7A7A] cursor-not-allowed"
            />
            <p className="text-[#7A7A7A] mt-1">This field cannot be changed</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-[#7A7A7A] mb-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-[#7A7A7A] cursor-not-allowed"
            />
            <p className="text-[#7A7A7A] mt-1">This field cannot be changed</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-[#7A7A7A] mb-2">
              <IdCard className="w-4 h-4" />
              Student ID
            </label>
            <input
              type="text"
              value={user.studentId}
              disabled
              className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-[#7A7A7A] cursor-not-allowed"
            />
            <p className="text-[#7A7A7A] mt-1">This field cannot be changed</p>
          </div>

          <div>
            <label className="block text-[#7A7A7A] mb-2">Role</label>
            <span className={`inline-block px-4 py-2 rounded-lg ${getRoleBadgeColor(user.role)}`}>
              {getRoleLabel(user.role)}
            </span>
            {user.requestedRole && (
              <p className="text-[#FFC107] mt-2">
                ⚠️ You have requested to be a Class Representative. Please contact the admin to confirm your role change.
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Change Password */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
      >
        <h3 className="text-[#1E1E1E] mb-6">Change Password</h3>
        
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-[#1E1E1E] mb-2">
              <Lock className="w-4 h-4" />
              Current Password <span className="text-[#FF4D4F]">*</span>
            </label>
            <input
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className={`w-full px-4 py-3 border ${errors.current ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-[#1E1E1E] mb-2">
              <Lock className="w-4 h-4" />
              New Password <span className="text-[#FF4D4F]">*</span>
            </label>
            <input
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              className={`w-full px-4 py-3 border ${errors.new ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-[#1E1E1E] mb-2">
              <Lock className="w-4 h-4" />
              Confirm New Password <span className="text-[#FF4D4F]">*</span>
            </label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className={`w-full px-4 py-3 border ${errors.confirm ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
              placeholder="Confirm new password"
            />
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
                <Save className="w-5 h-5" />
                <span>Save Password</span>
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};
