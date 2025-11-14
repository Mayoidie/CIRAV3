import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Send } from 'lucide-react';
import { useToast } from '../ui/toast-container';
import { db, auth } from '../../lib/firebase';
import { addDoc, collection, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface TicketFormProps {
  onSuccess: () => void;
}

interface OptionSet {
  options: string[];
  condition?: {
    field: string;
    value: string;
  };
}

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'textarea';
  name: string;
  options?: string[]; // Kept for backwards compatibility
  optionSets?: OptionSet[];
  conditional?: {
    field: string;
    value: string;
  };
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
        const newFields = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormField));
        setFormFields(newFields);

        // Preserve existing form data when the form structure changes
        setFormData(currentData => {
            const newFormData = newFields.reduce((acc, field) => ({ ...acc, [field.name]: currentData[field.name] || '' }), {});
            return newFormData;
        });
    });

    return () => unsubscribe();
}, []);

  const isFieldVisible = (field: FormField, data: Record<string, string>): boolean => {
    if (field.conditional && field.conditional.field && field.conditional.value) {
        const controllingField = formFields.find(f => f.id === field.conditional.field);
        if (!controllingField) return false;

        const controllingFieldValue = data[controllingField.name];

        if (field.conditional.value === 'any') {
            if (!controllingFieldValue) return false;
        } else {
            if (controllingFieldValue !== field.conditional.value) return false;
        }

        // Recursively check if the controlling field itself is visible
        return isFieldVisible(controllingField, data);
    }
    return true;
  };

  const getOptionsForField = (field: FormField, data: Record<string, string>): string[] => {
    if (field.type !== 'select') {
        return [];
    }

    if (field.optionSets && field.optionSets.length > 0) {
        const defaultSet = field.optionSets.find(set => !set.condition);
        let options = defaultSet ? [...defaultSet.options] : [];

        const conditionalSets = field.optionSets.filter(set => {
            if (!set.condition || !set.condition.field || !set.condition.value) return false;
            const controllingField = formFields.find(f => f.id === set.condition.field);
            if (!controllingField) return false;

            const controllingFieldValue = data[controllingField.name];
            if (set.condition.value === 'any') {
                return !!controllingFieldValue;
            } else {
                return controllingFieldValue === set.condition.value;
            }
        });

        if (conditionalSets.length > 0) {
            const conditionalOptions = conditionalSets.flatMap(set => set.options);
            options = [...options, ...conditionalOptions];
        }
        
        return [...new Set(options)]; // Return unique options
    }

    return field.options || [];
}

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
        showToast('Failed to process image', 'error');
        setImageFile(null);
        setImagePreview('');
      } finally {
        setIsImageProcessing(false);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData(currentData => {
        // Start with the user's direct change
        const newData = { ...currentData, [name]: value };

        // Recursively clean the data to handle cascading changes.
        // 1. If a field becomes hidden, its value is cleared.
        // 2. If a dropdown's selected value is no longer in its list of available options, it's cleared.
        const cleanData = (data: Record<string, string>): Record<string, string> => {
            let changed = false;
            const cleanedData = { ...data };

            formFields.forEach(field => {
                const isVisible = isFieldVisible(field, cleanedData);
                
                // If field is not visible and has a value, clear it.
                if (!isVisible && cleanedData[field.name]) {
                    cleanedData[field.name] = '';
                    changed = true;
                }

                // If field is a visible dropdown, check if its value is still valid.
                if (isVisible && field.type === 'select') {
                    const options = getOptionsForField(field, cleanedData);
                    if (cleanedData[field.name] && !options.includes(cleanedData[field.name])) {
                        cleanedData[field.name] = '';
                        changed = true;
                    }
                }
            });

            // If a value was cleared, run the cleaning process again
            // to ensure any fields that depended on the cleared value are also updated.
            if (changed) {
                return cleanData(cleanedData);
            }
            
            return cleanedData;
        };

        return cleanData(newData);
    });

    setErrors(prev => ({ ...prev, [name]: false }));
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    formFields.forEach(field => {
      if (isFieldVisible(field, formData) && !formData[field.name]) {
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

      const submissionData: Record<string, any> = {};
      formFields
        .filter(field => isFieldVisible(field, formData))
        .forEach(field => {
          submissionData[field.name] = formData[field.name];
        });

      await addDoc(collection(db, 'tickets'), {
        userId: user.uid,
        ...submissionData,
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
    const { id, label, type, name } = field;
    const commonProps = {
      name,
      value: formData[name] || '',
      onChange: handleChange,
      className: `w-full px-4 py-3 border ${errors[name] ? 'border-[#FF4D4F] bg-red-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all`,
    };

    const options = getOptionsForField(field, formData);

    return (
      <motion.div 
        key={id}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        <label className="block text-[#1E1E1E] mb-2">
          {label} <span className="text-[#FF4D4F]">*</span>
        </label>
        {type === 'text' && <input type="text" {...commonProps} />}
        {type === 'textarea' && <textarea rows={4} {...commonProps} />}
        {type === 'select' && (
          <select {...commonProps}>
            <option value="">Select {label}</option>
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )}
      </motion.div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl shadow-md p-6">
      <h3 className="text-[#1E1E1E]">Update Issue</h3>

      <AnimatePresence>
        <div className="grid grid-cols-1 gap-6">
          {formFields.filter(field => isFieldVisible(field, formData)).map(renderField)}
        </div>
      </AnimatePresence>

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
            <span>Update Ticket</span>
          </>
        )}
      </motion.button>
    </form>
  );
};
