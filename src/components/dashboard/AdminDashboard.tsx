import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Clock, CheckCircle, AlertCircle, FileText, Search, ClipboardList, Trash2, XCircle, Settings as SettingsIcon, PlayCircle, Users } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { TicketCard } from '../tickets/TicketCard';
import { useToast } from '../ui/toast-container';
import { SettingsPage } from '../settings/SettingsPage';
import { UserManagement } from './UserManagement';

interface TicketType {
  id: string;
  classroom: string;
  issueDescription: string;
  issueType: string;
  status: 'pending' | 'approved' | 'in-progress' | 'resolved' | 'rejected';
  userId: string;
  rejectionNote?: string;
  resolutionNote?: string;
}

interface AdminDashboardProps {
  logoClickTime: number;
  profileClickTime: number;
}


export const AdminDashboard: React.FC<AdminDashboardProps> = ({ logoClickTime, profileClickTime }) => {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [activeTab, setActiveTab] = useState<'tickets' | 'settings' | 'user-management'>('tickets');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'approved' | 'in-progress' | 'resolved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionNote, setRejectionNote] = useState<{ [key: string]: string }>({});
  const [resolutionNote, setResolutionNote] = useState<{ [key: string]: string }>({});

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
      const updateData: { status: TicketType['status']; resolutionNote?: string } = { status };

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

  const filteredTickets = tickets
    .filter(t => reviewFilter === 'all' || t.status === reviewFilter)
    .filter(ticket => 
      ticket.issueDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.classroom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.issueType.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const groupedTickets = filteredTickets.reduce((acc, ticket) => {
    const { status } = ticket;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(ticket);
    return acc;
  }, {} as Record<TicketType['status'], TicketType[]>);

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
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const getTicketCardActions = (ticket: TicketType) => {
    switch (ticket.status) {
      case 'pending':
        return {
          onApprove: () => handleStatusUpdate(ticket.id, 'approved'),
          onReject: () => handleTicketReject(ticket.id),
          showActions: true,
        };
      case 'approved':
        return {
          onStartProgress: () => handleStatusUpdate(ticket.id, 'in-progress'),
          showActions: true,
        };
      case 'in-progress':
        return {
          onResolve: () => handleResolveWithNote(ticket.id),
          showActions: true,
        };
      case 'resolved':
      case 'rejected':
        return {
          onDelete: () => handleDeleteTicket(ticket.id),
          showActions: true,
        };
      default:
        return { showActions: false };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[#1E1E1E] mb-2">Admin Dashboard</h1>
        <p className="text-[#7A7A7A]">Manage tickets and users</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((stat, index) => (
          <motion.div 
            key={stat.label} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: index * 0.1 }} 
            onClick={() => { setActiveTab('tickets'); setReviewFilter(stat.status); }}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}><stat.icon className="w-6 h-6 text-white" /></div>
            <p className="text-[#7A7A7A] mb-1">{stat.label}</p>
            <p className="text-[#1E1E1E]">{stat.count}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.id ? 'bg-[#3942A7] text-white' : 'bg-white text-[#7A7A7A] hover:bg-[#5E69B1] hover:text-white'}`}>
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
                <button onClick={() => setReviewFilter('all')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${reviewFilter === 'all' ? 'bg-[#1B1F50] text-white' : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'}`}>All ({tickets.length})</button>
                <button onClick={() => setReviewFilter('pending')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${reviewFilter === 'pending' ? 'bg-[#FFC107] text-[#1E1E1E]' : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'}`}>Pending ({pendingTickets.length})</button>
                <button onClick={() => setReviewFilter('approved')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${reviewFilter === 'approved' ? 'bg-[#1DB954] text-white' : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'}`}>Approved ({approvedTickets.length})</button>
                <button onClick={() => setReviewFilter('in-progress')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${reviewFilter === 'in-progress' ? 'bg-[#3942A7] text-white' : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'}`}>In Progress ({inProgressTickets.length})</button>
                <button onClick={() => setReviewFilter('resolved')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${reviewFilter === 'resolved' ? 'bg-[#1DB954] text-white' : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'}`}>Resolved ({resolvedTickets.length})</button>
                <button onClick={() => setReviewFilter('rejected')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${reviewFilter === 'rejected' ? 'bg-[#FF4D4F] text-white' : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'}`}>Rejected ({rejectedTickets.length})</button>
              </div>
              {['resolved', 'rejected'].includes(reviewFilter) && (
                <button onClick={() => handleDeleteAllTickets(reviewFilter as 'resolved' | 'rejected')} className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-600 transition-colors"><Trash2 className="w-5 h-5" />Delete All {reviewFilter.charAt(0).toUpperCase() + reviewFilter.slice(1)}</button>
              )}
            </div>

            <div className="mb-6"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tickets..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all" /></div></div>

            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center"><FileText className="w-16 h-16 mx-auto text-[#7A7A7A] mb-4" /><h3 className="text-[#1E1E1E] mb-2">No tickets found</h3><p className="text-[#7A7A7A]">{searchQuery ? 'Try adjusting your search query' : `There are no ${reviewFilter} tickets`}</p></div>
            ) : reviewFilter === 'all' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.values(groupedTickets).flat().map(ticket => (
                  <div key={ticket.id} className="space-y-4">
                    <TicketCard 
                      ticket={ticket} 
                      {...getTicketCardActions(ticket)}
                    />
                    {ticket.status === 'pending' && (
                      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200"><textarea value={rejectionNote[ticket.id] || ''} onChange={(e) => setRejectionNote(prev => ({ ...prev, [ticket.id]: e.target.value }))} placeholder="Add rejection note..." rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all" /></div>
                    )}
                    {ticket.status === 'in-progress' && (
                      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200"><textarea value={resolutionNote[ticket.id] || ''} onChange={(e) => setResolutionNote(prev => ({ ...prev, [ticket.id]: e.target.value }))} placeholder="Add resolution note..." rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all" /></div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTickets.map(ticket => (
                   <div key={ticket.id} className="space-y-4">
                    <TicketCard 
                      ticket={ticket} 
                      {...getTicketCardActions(ticket)}
                    />
                    {ticket.status === 'pending' && (
                      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200"><textarea value={rejectionNote[ticket.id] || ''} onChange={(e) => setRejectionNote(prev => ({ ...prev, [ticket.id]: e.target.value }))} placeholder="Add rejection note..." rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all" /></div>
                    )}
                    {ticket.status === 'in-progress' && (
                      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200"><textarea value={resolutionNote[ticket.id] || ''} onChange={(e) => setResolutionNote(prev => ({ ...prev, [ticket.id]: e.target.value }))} placeholder="Add resolution note..." rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all" /></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'user-management' && (
          <motion.div key="user-management" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <UserManagement />
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
