
import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, writeBatch, query, orderBy } from 'firebase/firestore';
import { Button } from '../ui/button';
import { Pencil, Trash2, Plus, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface Field {
  id: string;
  label: string;
  type: string;
  name: string;
  options?: string[];
  order: number;
}

const FormEditor = () => {
  const [originalFormFields, setOriginalFormFields] = useState<Field[]>([]);
  const [editedFormFields, setEditedFormFields] = useState<Field[]>([]);
  const [newField, setNewField] = useState<{label: string, type: string, options: string[]}>({ label: '', type: 'text', options: [] });
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddField, setShowAddField] = useState(false);

  const formFieldsCollection = collection(db, 'form-structure');

  const fetchFormFields = async () => {
    setLoading(true);
    const q = query(formFieldsCollection, orderBy('order'));
    const querySnapshot = await getDocs(q);
    const fields = querySnapshot.docs.map(doc => {
      const data = doc.data();
      if (data.type === 'select' && data.options && data.options.length > 0 && typeof data.options[0] === 'object') {
        data.options = data.options.map((opt: any) => opt.label);
      }
      return { id: doc.id, ...data } as Field;
    });
    setOriginalFormFields(fields);
    setEditedFormFields(fields);
    setLoading(false);
    setHasChanges(false);
  };

  useEffect(() => {
    fetchFormFields();
  }, []);

  useEffect(() => {
    const changed = JSON.stringify(originalFormFields.map(f => ({...f, id: ''}))) !== JSON.stringify(editedFormFields.map(f => ({...f, id: ''})));
    setHasChanges(changed);
  }, [editedFormFields, originalFormFields]);

  const handleAddField = () => {
    if (!newField.label) {
      alert('Please enter a label for the new field.');
      return;
    }
    const fieldToAdd: any = {
      label: newField.label,
      type: newField.type,
      name: newField.label.toLowerCase().replace(/\s/g, '-'),
      id: `new-${Date.now()}`,
      order: editedFormFields.length,
    };
    if (newField.type === 'select') {
      fieldToAdd.options = newField.options.filter(opt => opt.trim() !== '');
    }
    setEditedFormFields([...editedFormFields, fieldToAdd]);
    setNewField({ label: '', type: 'text', options: [] });
    setShowAddField(false);
  };

  const handleDeleteField = (id: string) => {
    const updatedFields = editedFormFields.filter(field => field.id !== id)
      .map((field, index) => ({ ...field, order: index }));
    setEditedFormFields(updatedFields);
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    const batch = writeBatch(db);

    editedFormFields.forEach((field, index) => {
      const { id, ...fieldData } = field;
      const data = { ...fieldData, order: index };
      if (id.startsWith('new-')) {
        const { id: newId, ...rest } = data;
        batch.set(doc(formFieldsCollection), rest);
      } else {
        batch.update(doc(db, 'form-structure', id), data);
      }
    });

    originalFormFields.forEach(field => {
      if (!editedFormFields.some(f => f.id === field.id)) {
        batch.delete(doc(db, 'form-structure', field.id));
      }
    });

    await batch.commit();
    fetchFormFields();
  };

  const handleDiscardChanges = () => {
    setEditedFormFields(originalFormFields);
  };

  const handleEditField = (field: Field) => {
    const fieldToEdit = { ...field };
    if (fieldToEdit.type === 'select' && !fieldToEdit.options) {
        fieldToEdit.options = [];
    }
    setEditingField(fieldToEdit);
  };

  const handleUpdateField = () => {
    if (!editingField) return;
    const updatedFields = editedFormFields.map(f =>
      f.id === editingField.id ? editingField : f
    );
    setEditedFormFields(updatedFields);
    setEditingField(null);
  };
  
  const handleOptionChange = (index: number, value: string) => {
    if (!editingField || !editingField.options) return;
    const newOptions = [...editingField.options];
    newOptions[index] = value;
    setEditingField({ ...editingField, options: newOptions });
  };

  const addOption = () => {
    if (!editingField) return;
    const newOptions = [...(editingField.options || []), ''];
    setEditingField({ ...editingField, options: newOptions });
  };

  const removeOption = (index: number) => {
    if (!editingField || !editingField.options) return;
    const newOptions = editingField.options.filter((_, i) => i !== index);
    setEditingField({ ...editingField, options: newOptions });
  };

  const handleNewOptionChange = (index: number, value: string) => {
    const updatedOptions = [...newField.options];
    updatedOptions[index] = value;
    setNewField(prev => ({ ...prev, options: updatedOptions }));
  };

  const addOptionForNewField = () => {
      setNewField(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOptionForNewField = (index: number) => {
      const updatedOptions = newField.options.filter((_, i) => i !== index);
      setNewField(prev => ({ ...prev, options: updatedOptions }));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(editedFormFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    const updatedItems = items.map((item, index) => ({ ...item, order: index }));
    setEditedFormFields(updatedItems);
  };

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4">Report Issue Form Editor</h3>
      <div className="flex flex-col md:flex-row md:gap-8">
        <div className="flex-1">
            <h4 className="font-semibold mb-2">Current Form Fields</h4>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="fields">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {editedFormFields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-3 border rounded-lg bg-gray-50 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            <div className="flex items-center">
                              <div {...provided.dragHandleProps} className="pr-2 pt-1 cursor-grab">
                                <GripVertical className="h-5 w-5 text-gray-400" />
                              </div>
                                {editingField && editingField.id === field.id ? (
                                    <div className="w-full space-y-4 flex-grow">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                                            <input
                                                type="text"
                                                value={editingField.label}
                                                onChange={e => setEditingField({ ...editingField, label: e.target.value, name: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                                                className="w-full p-2 border rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                            <select
                                                value={editingField.type}
                                                onChange={e => setEditingField({ ...editingField, type: e.target.value })}
                                                className="w-full p-2 border rounded"
                                            >
                                                <option value="text">Text</option>
                                                <option value="select">Dropdown</option>
                                                <option value="textarea">Text Area</option>
                                            </select>
                                        </div>

                                        {editingField.type === 'select' && (
                                            <div>
                                                <h5 className="font-semibold mt-4 mb-2">Options</h5>
                                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                                    {editingField.options?.map((option, index) => (
                                                        <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                                                            <input
                                                                type="text"
                                                                placeholder="Option Label"
                                                                value={option}
                                                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                                                className="w-full p-2 border rounded"
                                                            />
                                                            <Button variant="ghost" size="icon" onClick={() => removeOption(index)}>
                                                                <Trash2 className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <Button variant="outline" size="sm" className="mt-2" onClick={addOption}>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Add Option
                                                </Button>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <div>
                                            </div>
                                            <div className="mt-auto flex justify-end gap-4">
                                                <Button onClick={() => setEditingField(null)} variant="ghost">Cancel</Button>
                                                <Button onClick={handleUpdateField}>Update Field</Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                  <div className="flex-grow flex w-full items-center justify-between">
                                    <div>
                                      <span className="font-medium">{field.label}</span>
                                      <span className="text-sm text-gray-500 ml-2">({field.type})</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button onClick={() => handleEditField(field)} size="sm" variant="outline"><Pencil className="mr-2 h-4 w-4" />Edit</Button>
                                      <Button onClick={() => handleDeleteField(field.id)} size="sm" variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
        </div>

        <div className="flex-1 border-t pt-6 mt-6 md:border-t-0 md:pt-0 md:mt-0 md:border-l md:pl-8 flex flex-col">
          {!showAddField ? (
            <Button onClick={() => setShowAddField(true)} variant="default" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add New Field
            </Button>
          ) : (
          <div>
            <h4 className="font-semibold mb-2">Add New Field</h4>
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
            <input
                type="text"
                placeholder="Field Label (e.g., Building)"
                value={newField.label}
                onChange={e => setNewField({ ...newField, label: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
            <select value={newField.type} onChange={e => setNewField({ ...newField, type: e.target.value, options: [] })} className="w-full sm:w-auto px-4 py-3 border border-gray-300 rounded-lg">
                <option value="text">Text</option>
                <option value="select">Dropdown</option>
                <option value="textarea">Text Area</option>
            </select>
            </div>
            {newField.type === 'select' && (
                <div className="pl-2 mt-2">
                    <h5 className="font-semibold mt-4 mb-2">Options</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {newField.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Option Label"
                                value={option}
                                onChange={(e) => handleNewOptionChange(index, e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOptionForNewField(index)}
                            >
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    ))}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={addOptionForNewField}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Option
                    </Button>
                </div>
            )}
            
              <div className="flex items-center justify-between p-3">
              <div>
              </div>
              <div className="mt-auto flex justify-end gap-4 pt-6">
              <Button onClick={() => setShowAddField(false)} variant="outline" className="mt-4 ml-2">Cancel</Button>
              <Button onClick={handleAddField} variant="default" className="mt-4">Add Field</Button>
              </div>
              </div>
          </div>
          )}
            
            {hasChanges && (
              <div className="flex items-center justify-between p-3">
              <div>
              </div>
              <div className="mt-auto flex justify-end gap-4 pt-6">
              <Button onClick={handleDiscardChanges} variant="destructive">Discard Changes</Button>
              <Button onClick={handleSaveChanges} variant="secondary">Save Changes</Button>
              </div>
              </div>
            )}

                
        </div>
      </div>
    </div>
  );
};

export default FormEditor;
