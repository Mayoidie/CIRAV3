
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Send } from 'lucide-react';
import { useToast } from '../ui/toast-container';
import { db, auth } from '../../lib/firebase';
import { addDoc, collection, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface TicketFormProps {
  onSuccess: () => void;
}

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'textarea';
  name: string;
  options?: string[];
}

export const TicketForm: React.FC<TicketFormProps> = ({ onSuccess }) => {
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const { showToast } = useToast();
  const [hoveredUpload, setHoveredUpload] = useState(false);

  useEffect(() => {
    const formFieldsCollection = collection(db, 'form-structure');
    const q = query(formFieldsCollection, orderBy('order'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fields = querySnapshot.docs.map(doc => {
        const data = doc.data();
        if (data.type === 'select' && data.options && data.options.length > 0 && typeof data.options[0] === 'object') {
          data.options = data.options.map((opt: any) => opt.label);
        }
        return { id: doc.id, ...data } as FormField;
      });
      setFormFields(fields);
      const initialFormData = fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {});
      setFormData(initialFormData);
    });

    return () => unsubscribe();
  }, []);

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
    setFormData((prevData) => ({ ...prevData, [name]: value }));
    setErrors((prevErrors) => ({ ...prevErrors, [name]: false }));
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    formFields.forEach(field => {
      if (!formData[field.name]) {
        newErrors[field.name] = true;
      }
    });

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
        ...formData,
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

      const initialFormData = formFields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {});
      setFormData(initialFormData);
      setImageFile(null);
      setImagePreview('');
      onSuccess();
    } catch (error) {
      console.error('Error submitting ticket:', error);
      showToast('Failed to submit ticket', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const { id, label, type, name, options } = field;
    const commonProps = {
      name,
      value: formData[name] || '',
      onChange: handleChange,
      className: `w-full px-4 py-3 border ${errors[name] ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`,
    };

    return (
      <div key={id}>
        <label className="block text-[#1E1E1E] mb-2">
          {label} <span className="text-[#FF4D4F]">*</span>
        </label>
        {type === 'text' && <input type="text" {...commonProps} />}
        {type === 'textarea' && <textarea rows={4} {...commonProps} />}
        {type === 'select' && (
          <select {...commonProps}>
            <option value="">Select {label}</option>
            {options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl shadow-md p-6">
      <h3 className="text-[#1E1E1E]">Report an Issue</h3>

      <div className="grid grid-cols-1 gap-6">
        {formFields.map(renderField)}
      </div>

      {/* Image Upload */}
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

      {/* Submit Button */}
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
