import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, Send } from 'lucide-react';
import { useToast } from '../ui/toast-container';
import { CLASSROOMS, ISSUE_TYPES } from '../../lib/issueTypes';
import { db, auth } from '../../lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface TicketFormProps {
  onSuccess: () => void;
}

export const TicketForm: React.FC<TicketFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    classroom: '',
    unitId: '',
    issueType: '',
    issueSubtype: '',
    issueDescription: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const { showToast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};

    if (!formData.classroom) newErrors.classroom = true;
    if (!formData.issueType) newErrors.issueType = true;
    if (!formData.issueDescription) newErrors.issueDescription = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fill in all required fields', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    setIsLoading(true);

    const user = auth.currentUser;
    if (!user) {
      showToast('You must be logged in to submit a ticket', 'error');
      setIsLoading(false);
      return;
    }

    try {
      let imageUrl = '';
      if (imageFile) {
        const storage = getStorage();
        const storageRef = ref(storage, `tickets/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const status = currentUserData.role === 'class-representative' ? 'approved' : 'pending';

      await addDoc(collection(db, 'tickets'), {
        userId: user.uid,
        classroom: formData.classroom,
        unitId: formData.unitId,
        issueType: formData.issueType,
        issueSubtype: formData.issueSubtype,
        issueDescription: formData.issueDescription,
        imageUrl,
        status,
        createdAt: serverTimestamp(),
      });

      showToast(
        status === 'approved'
          ? 'Ticket created and automatically approved!'
          : 'Ticket submitted successfully! Sent to Class Representative for approval.',
        'success'
      );

      setFormData({
        classroom: '',
        unitId: '',
        issueType: '',
        issueSubtype: '',
        issueDescription: '',
      });
      setImageFile(null);
      setImagePreview('');
      onSuccess();
    } catch (error) {
      showToast('Failed to submit ticket', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedIssueType = formData.issueType ? ISSUE_TYPES[formData.issueType as keyof typeof ISSUE_TYPES] : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl shadow-md p-6">
      <h3 className="text-[#1E1E1E]">Report an Issue</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[#1E1E1E] mb-2">
            Classroom <span className="text-[#FF4D4F]">*</span>
          </label>
          <select
            value={formData.classroom}
            onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
            className={`w-full px-4 py-3 border ${errors.classroom ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
          >
            <option value="">Select Classroom</option>
            {CLASSROOMS.map(classroom => (
              <option key={classroom} value={classroom}>{classroom}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[#1E1E1E] mb-2">Unit ID (Optional)</label>
          <input
            type="text"
            value={formData.unitId}
            onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all"
            placeholder="e.g., PC-001"
          />
        </div>
      </div>

      <div>
        <label className="block text-[#1E1E1E] mb-2">
          Issue Type <span className="text-[#FF4D4F]">*</span>
        </label>
        <select
          value={formData.issueType}
          onChange={(e) => {
            setFormData({ ...formData, issueType: e.target.value, issueSubtype: '' });
          }}
          className={`w-full px-4 py-3 border ${errors.issueType ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
        >
          <option value="">Select Issue Type</option>
          {Object.entries(ISSUE_TYPES).map(([key, value]) => (
            <option key={key} value={key}>{value.label}</option>
          ))}
        </select>
      </div>

      {selectedIssueType && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <label className="block text-[#1E1E1E] mb-2">Issue Subtype</label>
          <select
            value={formData.issueSubtype}
            onChange={(e) => setFormData({ ...formData, issueSubtype: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all"
          >
            <option value="">Select Subtype (Optional)</option>
            {selectedIssueType.subtypes.map(subtype => (
              <option key={subtype} value={subtype}>{subtype}</option>
            ))}
          </select>
        </motion.div>
      )}

      <div>
        <label className="block text-[#1E1E1E] mb-2">
          Issue Description <span className="text-[#FF4D4F]">*</span>
        </label>
        <textarea
          value={formData.issueDescription}
          onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
          rows={4}
          className={`w-full px-4 py-3 border ${errors.issueDescription ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
          placeholder="Please describe the issue in detail..."
        />
      </div>

      <div>
        <label className="block text-[#1E1E1E] mb-2">Upload Image (Optional)</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#3942A7] transition-all cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            {imagePreview ? (
              <div className="space-y-2">
                <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                <p className="text-[#7A7A7A]">Click to change image</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 mx-auto text-[#7A7A7A]" />
                <p className="text-[#7A7A7A]">Click to upload an image</p>
              </div>
            )}
          </label>
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
            <span>Submit Ticket</span>
          </>
        )}
      </motion.button>
    </form>
  );
};
