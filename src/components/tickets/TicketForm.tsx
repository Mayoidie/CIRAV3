import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Send } from 'lucide-react';
import { useToast } from '../ui/toast-container';
import { CLASSROOM_DATA, ISSUE_TYPES } from '../../lib/issueTypes'; // Updated import
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
  const [isImageProcessing, setIsImageProcessing] = useState(false); 
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const { showToast } = useToast();
  const [hoveredUpload, setHoveredUpload] = useState(false); 

  const processImage = async (imageFile: File): Promise<File> => {
    console.log('Processing image:', imageFile.name);
    await new Promise(resolve => setTimeout(resolve, 500));
    return imageFile; 
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImageProcessing(true); 
      try {
        const processedFile = await processImage(file);
        setImageFile(processedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(processedFile);
      } catch (error) {
        console.error('Error processing image:', error);
        showToast('Failed to process image.', 'error');
        setImageFile(null);
        setImagePreview('');
      } finally {
        setIsImageProcessing(false);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      const newData = { ...prevData, [name]: value };
      if (name === 'classroom') {
        newData.unitId = ''; 
      }
      return newData;
    });
    setErrors((prevErrors) => ({ ...prevErrors, [name]: false }));
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};

    if (!formData.classroom) newErrors.classroom = true;
    if (formData.issueType !== 'other' && !formData.unitId) newErrors.unitId = true; 
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
        console.log('Attempting to upload image...');
        const storage = getStorage();
        const storageRef = ref(storage, `tickets/${user.uid}/${Date.now()}_${imageFile.name}`);
        try {
          const snapshot = await uploadBytes(storageRef, imageFile);
          console.log('Image uploaded successfully:', snapshot);
          imageUrl = await getDownloadURL(snapshot.ref);
          console.log('Image download URL:', imageUrl);
        } catch (imageUploadError) {
          console.error('Error during image upload or getting download URL:', imageUploadError);
          showToast('Failed to upload image. Please try again.', 'error');
          setIsLoading(false);
          return; 
        }
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
      console.error('Error submitting ticket (Firestore part):', error);
      showToast('Failed to submit ticket', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedIssueType = formData.issueType ? ISSUE_TYPES[formData.issueType as keyof typeof ISSUE_TYPES] : null;
  const selectedClassroomData = formData.classroom ? CLASSROOM_DATA[formData.classroom as keyof typeof CLASSROOM_DATA] : null;
  const unitIdOptions = selectedClassroomData
    ? Array.from({ length: selectedClassroomData.unitRange[1] - selectedClassroomData.unitRange[0] + 1 }, (_, i) => {
        const unitNumber = selectedClassroomData.unitRange[0] + i;
        return `${selectedClassroomData.unitPrefix}${unitNumber < 10 ? `0${unitNumber}` : unitNumber}`;
      })
    : [];

  const isUnitIdRequired = formData.issueType !== 'other';

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
            onChange={handleChange}
            name="classroom"
            className={`w-full px-4 py-3 border ${errors.classroom ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
          >
            <option value="">Select Classroom</option>
            {Object.entries(CLASSROOM_DATA).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="unitId" className="block text-[#1E1E1E] mb-2">
            Unit ID {isUnitIdRequired && <span className="text-[#FF4D4F]">*</span>}
          </label>
          <select
            id="unitId"
            name="unitId"
            value={formData.unitId}
            onChange={handleChange}
            className={`w-full p-3 border rounded-lg ${
              errors.unitId ? 'border-[#FF4D4F]' : 'border-[#D1D5DB]'
            } focus:ring focus:ring-blue-200 focus:border-blue-500`}
            disabled={!formData.classroom && isUnitIdRequired} 
          >
            <option value="">{isUnitIdRequired ? 'Select Unit ID' : 'Select Unit ID (Optional)'}</option>
            {unitIdOptions.map((unitId) => (
              <option key={unitId} value={unitId}>
                {unitId}
              </option>
            ))}
          </select>
          {errors.unitId && isUnitIdRequired && <p className="text-[#FF4D4F] text-sm mt-1">Unit ID is required.</p>}
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
            setErrors((prevErrors) => ({ ...prevErrors, issueType: false }));
          }}
          name="issueType"
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
            onChange={handleChange}
            name="issueSubtype"
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
          onChange={handleChange}
          name="issueDescription"
          rows={4}
          className={`w-full px-4 py-3 border ${errors.issueDescription ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`}
          placeholder="Please describe the issue in detail..."
        />
      </div>

      <div>
        <label className="block text-[#1E1E1E] mb-2">Upload Image (Optional)</label>
        <div
          onMouseEnter={() => setHoveredUpload(true)}
          onMouseLeave={() => setHoveredUpload(false)}
          style={hoveredUpload
            ? { borderColor: '#cfcfcf', backgroundColor: '#cfcfcf', color: 'white' }
            : { borderColor: '#D1D5DB', backgroundColor: 'white', color: '#7A7A7A' }}
          className="border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer"
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="image-upload"
            disabled={isImageProcessing || isLoading} 
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            {isImageProcessing ? (
              <div className="flex items-center justify-center space-x-2 text-[#7A7A7A]">
                <svg className="animate-spin h-5 w-5 text-[#7A7A7A]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing Image...</span>
              </div>
            ) : imagePreview ? (
              <div className="space-y-2">
                <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                <p className="text-sm text-[#7A7A7A]">Click to change image</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-x-2">
                <Upload size={48} strokeWidth={1.5} />
                <p className="text-lg">Drag & drop an image here, or click to browse</p>
                <p className="text-sm text-[#7A7A7A]">Max file size: 5MB</p>
              </div>
            )}
          </label>
        </div>
      </div>

      <motion.button
        type="submit"
        disabled={isLoading || isImageProcessing}
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
