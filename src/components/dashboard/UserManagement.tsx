import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '../ui/toast-container';

interface User {
  id: string;
  name: string;
  email: string;
  studentId: string;
  role: 'student' | 'class-rep-pending' | 'class-rep' | 'admin';
}

export const UserManagement: React.FC = () => {
  const [pendingReps, setPendingReps] = useState<User[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'class-rep-pending'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setPendingReps(usersData);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: 'class-rep' });
      showToast('User approved as Class Representative', 'success');
    } catch (error) {
      showToast('Failed to approve user', 'error');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: 'student' });
      showToast('User request rejected', 'info');
    } catch (error) {
      showToast('Failed to reject user', 'error');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Pending Class Representative Requests</h2>
      {pendingReps.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingReps.map(user => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
            >
              <p className="font-bold text-lg">{user.name}</p>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-gray-600">Student ID: {user.studentId}</p>
              <div className="mt-4">
                <span className="inline-block bg-yellow-200 text-yellow-800 text-xs px-2 rounded-full uppercase font-semibold tracking-wide">
                  Requested: Class Representative
                </span>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => handleApprove(user.id)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(user.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
