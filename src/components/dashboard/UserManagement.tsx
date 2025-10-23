import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '../ui/toast-container';
import { FileText } from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  role: string;
  requestedRole?: string;
}

export const UserManagement: React.FC = () => {
  const [pendingReps, setPendingReps] = useState<User[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (querySnapshot) => {
      const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setPendingReps(usersData.filter(user => user.requestedRole === 'class-representative' && user.role !== 'class-representative'));
    });
    return () => unsubscribeUsers();
  }, []);

  const handleApprove = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: 'class-representative', requestedRole: '' });
      showToast('User approved as Class Representative', 'success');
    } catch (error) {
      showToast('Failed to approve user', 'error');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { requestedRole: '' });
      showToast('User request rejected', 'info');
    } catch (error) {
      showToast('Failed to reject user request', 'error');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-[#1E1E1E] text-xl font-semibold mb-4">Pending Class Representative Requests</h2>
        {pendingReps.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">No pending requests</h3>
            <p className="text-gray-500 text-sm">There are no pending requests for the Class Representative role.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingReps.map(user => (
              <div key={user.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-6 border border-gray-200 flex flex-col">
                <div className="flex-1 mb-4">
                  <p className="text-[#1E1E1E] text-lg mb-1">{user.firstName} {user.lastName}</p>
                  <p className="text-[#7A7A7A]">{user.email}</p>
                  <p className="text-[#7A7A7A]">Student ID: {user.studentId}</p>
                </div>
                <div className="mb-4">
                  <span className="px-3 py-1 rounded-full bg-[#FFC107] text-[#1E1E1E] uppercase text-sm font-medium">
                    Requested: Class Representative
                  </span>
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => handleApprove(user.id)}
                    className="flex-1 px-4 py-2 bg-[#1DB954] text-white rounded-lg hover:bg-[#1DB954]/90 transition-all"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(user.id)}
                    className="flex-1 px-4 py-2 bg-[#FF4D4F] text-white rounded-lg hover:bg-[#FF4D4F]/90 transition-all"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
