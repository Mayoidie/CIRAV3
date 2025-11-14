import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Clock, CheckCircle, AlertCircle, FileText, Search, ClipboardList, Trash2, XCircle, Settings as SettingsIcon, PlayCircle, Users, Check, X, Pencil, Edit } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '../ui/toast-container';
import { SettingsPage } from '../settings/SettingsPage';
import { UserManagement } from './UserManagement';
import FormEditor from './FormEditor'; // Import the new component
import { Button } from '../ui/button';

interface TicketType {
  id: string;
  classroom: string;
  issueDescription: string;
  issueType: string;
  status: 'pending' | 'approved' | 'in-progress' | 'resolved' | 'rejected';
  userId: string;
  rejectionNote?: string;
  resolutionNote?: string;
  unitId?: string;
  approvedAt?: { toDate: () => Date };
}

interface AdminDashboardProps {
  logoClickTime: number;
  profileClickTime: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ logoClickTime, profileClickTime }) => {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [activeTab, setActiveTab] = useState<'tickets' | 'settings' | 'user-management' | 'form-editor'>('tickets'); // Add 'form-editor' to the type
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'approved' | 'in-progress' | 'resolved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [rejectionNote, setRejectionNote] = useState<{ [key: string]: string }>({});
  const [resolutionNote, setResolutionNote] = useState<{ [key: string]: string }>({});
  const [showRejectionNote, setShowRejectionNote] = useState<{ [key: string]: boolean }>({});
  const [showResolutionNote, setShowResolutionNote] = useState<{ [key: string]: boolean }>({});

  const { showToast } = useToast();
  
    useEffect(() => {
    if (logoClickTime > 0) {
      setActiveTab('tickets');
      setReviewFilter('all');
    }
  }, [logoClickTime]);

  useEffect(() => {
    if (profileClickTime > 0) {
      setActiveTab('settings');
    }
  }, [profileClickTime]);

  useEffect(() => {
    const q = query(collection(db, 'tickets'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ticketsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketType));
      setTickets(ticketsData);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteTicket = async (ticketId: string) => {
    if (confirm('Are you sure you want to delete this ticket?')) {
      try {
        await deleteDoc(doc(db, 'tickets', ticketId));
        showToast('Ticket deleted successfully', 'success');
      } catch (error) {
        showToast('Failed to delete ticket', 'error');
      }
    }
  };

  const handleDeleteAllTickets = async (status: 'resolved' | 'rejected') => {
    const ticketsToDelete = tickets.filter(t => t.status === status);
    if (ticketsToDelete.length === 0) {
      showToast(`No ${status} tickets to delete.`, 'info');
      return;
    }

    if (confirm(`Are you sure you want to delete all ${status} tickets?`)) {
      try {
        const batch = writeBatch(db);
        ticketsToDelete.forEach(ticket => {
          batch.delete(doc(db, 'tickets', ticket.id));
        });
        await batch.commit();
        showToast(`All ${status} tickets deleted successfully`, 'success');
      } catch (error) {
        showToast(`Failed to delete all ${status} tickets`, 'error');
      }
    }
  };

  const handleStatusUpdate = async (ticketId: string, status: TicketType['status'], note?: string) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      const updateData: { status: TicketType['status']; resolutionNote?: string; approvedAt?: any } = { status };

      if (status === 'approved') {
        updateData.approvedAt = new Date();
      }

      if (status === 'resolved' && note) {
        updateData.resolutionNote = note;
      }
      
      await updateDoc(ticketRef, updateData);
      showToast(`Ticket status updated to ${status}`, 'success');
      if (status === 'resolved') {
        setResolutionNote(prev => {
          const updated = { ...prev };
          delete updated[ticketId];
          return updated;
        });
        setShowResolutionNote(prev => ({ ...prev, [ticketId]: false }));
      }
    } catch (error) {
      showToast('Failed to update ticket status', 'error');
    }
  };

  const handleTicketReject = async (ticketId: string) => {
    const note = rejectionNote[ticketId];
    if (!note || note.trim() === '') {
      showToast('Please provide a reason for rejecting the ticket.', 'error');
      return;
    }

    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, { status: 'rejected', rejectionNote: note });
      showToast('Ticket rejected', 'info');
      setRejectionNote(prev => {
        const updated = { ...prev };
        delete updated[ticketId];
        return updated;
      });
      setShowRejectionNote(prev => ({ ...prev, [ticketId]: false }));
    } catch (error) {
      showToast('Failed to reject ticket', 'error');
    }
  };

  const handleResolveWithNote = async (ticketId: string) => {
    const note = resolutionNote[ticketId];
    if (!note || note.trim() === '') {
      showToast('Please provide a resolution note for the ticket.', 'error');
      return;
    }
    await handleStatusUpdate(ticketId, 'resolved', note);
  };

  const getUniqueValues = (field: keyof TicketType) => {
    if (field === 'approvedAt') {
        return [
            ...new Set(
                tickets
                    .map(ticket => ticket.approvedAt ? ticket.approvedAt.toDate().toLocaleDateString() : null)
                    .filter(date => date !== null) as string[]
            ),
        ];
    }
    return [...new Set(tickets.map(ticket => ticket[field]))];
  };

  const filteredTickets = tickets
    .filter(t => reviewFilter === 'all' || t.status === reviewFilter)
    .filter(ticket => {
        if (searchField === 'all' || !searchValue) return true;
        const fieldValue = ticket[searchField as keyof TicketType];
        if (searchField === 'approvedAt' && fieldValue instanceof Date) {
            return fieldValue.toLocaleDateString() === searchValue;
        }
        return String(fieldValue).toLowerCase() === searchValue.toLowerCase();
    });

  const pendingTickets = tickets.filter(t => t.status === 'pending');
  const approvedTickets = tickets.filter(t => t.status === 'approved');
  const inProgressTickets = tickets.filter(t => t.status === 'in-progress');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved');
  const rejectedTickets = tickets.filter(t => t.status === 'rejected');

  const stats = [
    { label: 'Pending', count: pendingTickets.length, icon: Clock, color: 'bg-[#FFC107]', status: 'pending' as const },
    { label: 'Approved', count: approvedTickets.length, icon: CheckCircle, color: 'bg-[#1DB954]', status: 'approved' as const },
    { label: 'In Progress', count: inProgressTickets.length, icon: AlertCircle, color: 'bg-[#3942A7]', status: 'in-progress' as const },
    { label: 'Resolved', count: resolvedTickets.length, icon: CheckCircle, color: 'bg-[#1DB954]', status: 'resolved' as const },
    { label: 'Rejected', count: rejectedTickets.length, icon: XCircle, color: 'bg-[#FF4D4F]', status: 'rejected' as const },
  ];

  const tabs = [
    { id: 'tickets', label: 'Tickets', icon: ClipboardList },
    { id: 'user-management', label: 'User Management', icon: Users },
    { id: 'form-editor', label: 'Form Editor', icon: Edit }, // Add the new tab
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[#1E1E1E] mb-2">Admin Dashboard</h1>
        <p className="text-[#7A7A7A]">Manage tickets, users, and forms</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((stat, index) => (
          <motion.div 
            key={stat.label} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: index * 0.1 }} 
            onClick={() => { setActiveTab('tickets'); setReviewFilter(stat.status); }}
            onMouseEnter={() => setHoveredStat(stat.status)}
            onMouseLeave={() => setHoveredStat(null)}
            style={{
              backgroundColor: hoveredStat === stat.status ? '#3942A7' : 'white',
              color: hoveredStat === stat.status ? 'white' : '#1E1E1E',
              border: '1px solid #D1D5DB'
            }}
            className="rounded-xl shadow-md p-6 cursor-pointer transition-colors">
            <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}><stat.icon className="w-6 h-6 text-white" /></div>
            <p className="text-[#7A7A7A] mb-1" style={{color: hoveredStat === stat.status ? 'white' : '#7A7A7A'}}>{stat.label}</p>
            <p className="text-2xl font-bold" style={{color: hoveredStat === stat.status ? 'white' : '#1E1E1E'}}>{stat.count}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                backgroundColor: activeTab === tab.id ? '#3942A7' : (hoveredTab === tab.id ? '#4d57c8' : 'white'),
                color: activeTab === tab.id || hoveredTab === tab.id ? 'white' : '#7A7A7A'
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 transition-all whitespace-nowrap cursor-pointer`}>
              <tab.icon className="w-5 h-5" /><span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'tickets' && (
          <motion.div key="tickets" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button 
                  onClick={() => setReviewFilter('all')} 
                  style={{backgroundColor: reviewFilter === 'all' ? '#1B1F50' : 'white', color: reviewFilter === 'all' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  All ({tickets.length})
                </button>
                <button 
                  onClick={() => setReviewFilter('pending')} 
                  style={{backgroundColor: reviewFilter === 'pending' ? '#FFC107' : 'white', color: reviewFilter === 'pending' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  Pending ({pendingTickets.length})
                </button>
                <button 
                  onClick={() => setReviewFilter('approved')} 
                  style={{backgroundColor: reviewFilter === 'approved' ? '#1DB954' : 'white', color: reviewFilter === 'approved' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  Approved ({approvedTickets.length})
                </button>
                <button 
                  onClick={() => setReviewFilter('in-progress')} 
                  style={{backgroundColor: reviewFilter === 'in-progress' ? '#3942A7' : 'white', color: reviewFilter === 'in-progress' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  In Progress ({inProgressTickets.length})
                </button>
                <button 
                  onClick={() => setReviewFilter('resolved')} 
                  style={{backgroundColor: reviewFilter === 'resolved' ? '#1DB954' : 'white', color: reviewFilter === 'resolved' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  Resolved ({resolvedTickets.length})
                </button>
                <button 
                  onClick={() => setReviewFilter('rejected')} 
                  style={{backgroundColor: reviewFilter === 'rejected' ? '#FF4D4F' : 'white', color: reviewFilter === 'rejected' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  Rejected ({rejectedTickets.length})
                </button>
              </div>
              {(reviewFilter === 'resolved' || reviewFilter === 'rejected') && 
                <button onClick={() => handleDeleteAllTickets(reviewFilter as 'resolved' | 'rejected')} className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-600 transition-colors"><Trash2 className="w-5 h-5" />Delete All {reviewFilter.charAt(0).toUpperCase() + reviewFilter.slice(1)}</button>
              }
            </div>

            <div className="mb-6 flex gap-4">
                <select value={searchField} onChange={(e) => {setSearchField(e.target.value); setSearchValue('');}} className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all">
                    <option value="all">All Fields</option>
                    <option value="id">Ticket ID</option>
                    <option value="issueType">Issue Type</option>
                    <option value="unitId">Unit ID</option>
                    <option value="classroom">Classroom</option>
                    <option value="approvedAt">Date Approved</option>
                    <option value="status">Status</option>
                </select>
                {searchField !== 'all' && (
                    <select value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all">
                        <option value="">Select a value</option>
                        {getUniqueValues(searchField as keyof TicketType).map(value => (
                            <option key={value} value={value}>{value}</option>
                        ))}
                    </select>
                )}
            </div>

            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center"><FileText className="w-16 h-16 mx-auto text-[#7A7A7A] mb-4" /><h3 className="text-[#1E1E1E] mb-2">No tickets found</h3><p className="text-[#7A7A7A]">{searchQuery ? 'Try adjusting your search query' : `There are no ${reviewFilter} tickets`}</p></div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-white uppercase" style={{backgroundColor: '#3942A7'}}>
                    <tr>
                      <th scope="col" className="px-6 py-3"><div className="flex items-center justify-center">Ticket ID</div></th>
                      <th scope="col" className="px-6 py-3"><div className="flex items-center justify-center">Issue Type</div></th>
                      <th scope="col" className="px-6 py-3"><div className="flex items-center justify-center">Unit ID</div></th>
                      <th scope="col" className="px-6 py-3"><div className="flex items-center justify-center">Classroom</div></th>
                      <th scope="col" className="px-6 py-3"><div className="flex items-center justify-center">Date Approved</div></th>
                      <th scope="col" className="px-6 py-3"><div className="flex items-center justify-center">Status</div></th>
                      <th scope="col" className="px-6 py-3"><div className="flex items-center justify-center">Actions</div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket, index) => (
                      <tr key={ticket.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap"><div className="flex items-center justify-center">{ticket.id.slice(0, 8)}...</div></td>
                        <td className="px-6 py-4"><div className="flex items-center justify-center">{ticket.issueType}</div></td>
                        <td className="px-6 py-4"><div className="flex items-center justify-center">{ticket.unitId || 'N/A'}</div></td>
                        <td className="px-6 py-4"><div className="flex items-center justify-center">{ticket.classroom}</div></td>
                        <td className="px-6 py-4"><div className="flex items-center justify-center">{ticket.approvedAt ? ticket.approvedAt.toDate().toLocaleDateString() : 'N/A'}</div></td>
                        <td className="px-6 py-4">
                            <div className="flex items-center justify-center">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${
                                    ticket.status === 'pending' ? 'bg-[#FFC107]' :
                                    ticket.status === 'approved' ? 'bg-[#1DB954]' :
                                    ticket.status === 'in-progress' ? 'bg-[#3942A7]' :
                                    ticket.status === 'resolved' ? 'bg-[#1DB954]' :
                                    'bg-[#FF4D4F]'
                                }`}>
                                    {ticket.status}
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-2">
                            {ticket.status === 'pending' && (
                              <>
                                {!showRejectionNote[ticket.id] ? (
                                  <div className="flex gap-2">
                                    <Button onClick={() => handleStatusUpdate(ticket.id, 'approved')} variant="success"><Check className="w-4 h-4 mr-2"/>Approve</Button>
                                    <Button onClick={() => setShowRejectionNote(prev => ({ ...prev, [ticket.id]: true }))} variant="destructive"><X className="w-4 h-4 mr-2"/>Reject</Button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <textarea value={rejectionNote[ticket.id] || ''} onChange={(e) => setRejectionNote(prev => ({ ...prev, [ticket.id]: e.target.value }))} placeholder="Rejection Note..." className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#3942A7]" />
                                    <div className="flex gap-2">
                                      <Button onClick={() => handleTicketReject(ticket.id)} variant="destructive" className="flex-1">Confirm</Button>
                                      <Button onClick={() => setShowRejectionNote(prev => ({ ...prev, [ticket.id]: false }))} variant="ghost" className="flex-1">Cancel</Button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            {ticket.status === 'approved' && <Button onClick={() => handleStatusUpdate(ticket.id, 'in-progress')} variant="default"><PlayCircle className="w-4 h-4 mr-2"/>Start Progress</Button>}
                            {ticket.status === 'in-progress' && (
                              <>
                                {!showResolutionNote[ticket.id] ? (
                                  <Button onClick={() => setShowResolutionNote(prev => ({ ...prev, [ticket.id]: true }))} variant="secondary"><Pencil className="w-4 h-4 mr-2"/>Resolve</Button>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <textarea value={resolutionNote[ticket.id] || ''} onChange={(e) => setResolutionNote(prev => ({ ...prev, [ticket.id]: e.target.value }))} placeholder="Resolution Note..." className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#3942A7]" />
                                    <div className="flex gap-2">
                                      <Button onClick={() => handleResolveWithNote(ticket.id)} variant="secondary" className="flex-1">Confirm</Button>
                                      <Button onClick={() => setShowResolutionNote(prev => ({ ...prev, [ticket.id]: false }))} variant="ghost" className="flex-1">Cancel</Button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            {(ticket.status === 'resolved' || ticket.status === 'rejected') && 
                              <Button onClick={() => handleDeleteTicket(ticket.id)} variant="destructive">
                                <Trash2 className="w-4 h-4 mr-2"/>Delete
                              </Button>
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'user-management' && (
          <motion.div key="user-management" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <UserManagement />
          </motion.div>
        )}

        {activeTab === 'form-editor' && (
          <motion.div key="form-editor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <FormEditor />
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <SettingsPage />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
