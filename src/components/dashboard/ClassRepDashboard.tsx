import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, Clock, CheckCircle, AlertCircle, FileText, Settings as SettingsIcon, Search, ClipboardList, XCircle } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { TicketCard } from '../tickets/TicketCard';
import { TicketForm } from '../tickets/TicketForm';
import { SettingsPage } from '../settings/SettingsPage';
import { useToast } from '../ui/toast-container';

interface TicketType {
  id: string;
  classroom: string;
  issueDescription: string;
  issueType: string;
  status: 'pending' | 'approved' | 'in-progress' | 'resolved' | 'rejected';
  userId: string;
  rejectionNote?: string;
}

export const ClassRepDashboard: React.FC = () => {
  const [myTickets, setMyTickets] = useState<TicketType[]>([]);
  const [allTickets, setAllTickets] = useState<TicketType[]>([]);
  const [activeTab, setActiveTab] = useState<'my-tickets' | 'review' | 'report' | 'settings'>('my-tickets');
  const [myTicketsFilter, setMyTicketsFilter] = useState<'all' | 'approved' | 'in-progress' | 'resolved'>('all');
  const [reviewFilter, setReviewFilter] = useState<'pending' | 'approved' | 'in-progress' | 'resolved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionNote, setRejectionNote] = useState<{ [key: string]: string }>({});
  const { showToast } = useToast();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const myTicketsQuery = query(collection(db, 'tickets'), where('userId', '==', currentUser.uid));
      const unsubscribeMyTickets = onSnapshot(myTicketsQuery, (snapshot) => {
        const userTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketType));
        setMyTickets(userTickets);
      });

      const allTicketsQuery = query(collection(db, 'tickets'));
      const unsubscribeAllTickets = onSnapshot(allTicketsQuery, (snapshot) => {
        const allTicketsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketType));
        setAllTickets(allTicketsData);
      });

      return () => {
        unsubscribeMyTickets();
        unsubscribeAllTickets();
      };
    }
  }, [auth.currentUser]);

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

  const handleApprove = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), { status: 'approved' });
      showToast('Ticket approved successfully', 'success');
    } catch (error) {
      showToast('Failed to approve ticket', 'error');
    }
  };

  const handleReject = async (ticketId: string) => {
    const note = rejectionNote[ticketId];
    if (!note || note.trim() === '') {
      showToast('Please provide a reason for rejecting the ticket.', 'error');
      return;
    }

    try {
      await updateDoc(doc(db, 'tickets', ticketId), { status: 'rejected', rejectionNote: note });
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
  
  const currentUser = auth.currentUser;
  const reviewTickets = allTickets.filter(t => t.userId !== currentUser?.uid);

  const filteredMyTickets = myTickets
    .filter(ticket => myTicketsFilter === 'all' || ticket.status === myTicketsFilter)
    .filter(ticket => 
      ticket.issueDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.classroom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.issueType.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredReviewTickets = reviewTickets
    .filter(t => t.status === reviewFilter)
    .filter(ticket => 
      ticket.issueDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.classroom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.issueType.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const pendingReviewTickets = reviewTickets.filter(t => t.status === 'pending');
  const approvedReviewTickets = reviewTickets.filter(t => t.status === 'approved');
  const inProgressReviewTickets = reviewTickets.filter(t => t.status === 'in-progress');
  const resolvedReviewTickets = reviewTickets.filter(t => t.status === 'resolved');
  const rejectedReviewTickets = reviewTickets.filter(t => t.status === 'rejected');

  const stats = [
    { label: 'Pending Review', count: pendingReviewTickets.length, icon: Clock, color: 'bg-[#FFC107]' },
    { label: 'Approved', count: approvedReviewTickets.length, icon: CheckCircle, color: 'bg-[#1DB954]' },
    { label: 'In Progress', count: inProgressReviewTickets.length, icon: AlertCircle, color: 'bg-[#3942A7]' },
    { label: 'Resolved', count: resolvedReviewTickets.length, icon: CheckCircle, color: 'bg-[#1DB954]' },
    { label: 'Rejected', count: rejectedReviewTickets.length, icon: XCircle, color: 'bg-[#FF4D4F]' },
  ];

  const tabs = [
    { id: 'my-tickets', label: 'My Tickets', icon: Ticket },
    { id: 'review', label: 'Review Tickets', icon: ClipboardList },
    { id: 'report', label: 'Report Issue', icon: AlertCircle },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const approvedMyTickets = myTickets.filter(t => t.status === 'approved');
  const inProgressMyTickets = myTickets.filter(t => t.status === 'in-progress');
  const resolvedMyTickets = myTickets.filter(t => t.status === 'resolved');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-[#1E1E1E] mb-2">Class Representative Dashboard</h1>
        <p className="text-[#7A7A7A]">Manage tickets and review student submissions</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
          >
            <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-[#7A7A7A] mb-1">{stat.label}</p>
            <p className="text-[#1E1E1E]">{stat.count}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#3942A7] text-white'
                  : 'bg-white text-[#7A7A7A] hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'my-tickets' && (
          <motion.div
            key="my-tickets"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
               <button
                onClick={() => setMyTicketsFilter('all')}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  myTicketsFilter === 'all'
                    ? 'bg-[#1B1F50] text-white'
                    : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All ({myTickets.length})
              </button>
              <button
                onClick={() => setMyTicketsFilter('approved')}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  myTicketsFilter === 'approved'
                    ? 'bg-[#1DB954] text-white'
                    : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Approved ({approvedMyTickets.length})
              </button>
              <button
                onClick={() => setMyTicketsFilter('in-progress')}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  myTicketsFilter === 'in-progress'
                    ? 'bg-[#3942A7] text-white'
                    : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'
                }`}
              >
                In Progress ({inProgressMyTickets.length})
              </button>
              <button
                onClick={() => setMyTicketsFilter('resolved')}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  myTicketsFilter === 'resolved'
                    ? 'bg-[#1DB954] text-white'
                    : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Resolved ({resolvedMyTickets.length})
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search my tickets..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all"
                />
              </div>
            </div>

            {filteredMyTickets.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-[#7A7A7A] mb-4" />
                <h3 className="text-[#1E1E1E] mb-2">No tickets found</h3>
                <p className="text-[#7A7A7A]">
                  {searchQuery 
                    ? 'Try adjusting your search query' 
                    : "You haven't submitted any tickets yet"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMyTickets.map(ticket => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onDelete={handleDeleteTicket}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <button
                onClick={() => setReviewFilter('pending')}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  reviewFilter === 'pending'
                    ? 'bg-[#FFC107] text-[#1E1E1E]'
                    : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Pending ({pendingReviewTickets.length})
              </button>
              <button
                onClick={() => setReviewFilter('approved')}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  reviewFilter === 'approved'
                    ? 'bg-[#1DB954] text-white'
                    : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Approved ({approvedReviewTickets.length})
              </button>
              <button
                onClick={() => setReviewFilter('in-progress')}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  reviewFilter === 'in-progress'
                    ? 'bg-[#3942A7] text-white'
                    : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'
                }`}
              >
                In Progress ({inProgressReviewTickets.length})
              </button>
              <button
                onClick={() => setReviewFilter('resolved')}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  reviewFilter === 'resolved'
                    ? 'bg-[#1DB954] text-white'
                    : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Resolved ({resolvedReviewTickets.length})
              </button>
              <button
                onClick={() => setReviewFilter('rejected')}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  reviewFilter === 'rejected'
                    ? 'bg-[#FF4D4F] text-white'
                    : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Rejected ({rejectedReviewTickets.length})
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tickets to review..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all"
                />
              </div>
            </div>

            {filteredReviewTickets.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <ClipboardList className="w-16 h-16 mx-auto text-[#7A7A7A] mb-4" />
                <h3 className="text-[#1E1E1E] mb-2">No tickets to review</h3>
                <p className="text-[#7A7A7A]">
                  {searchQuery 
                    ? 'Try adjusting your search query' 
                    : `There are no ${reviewFilter} tickets to review`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReviewTickets.map(ticket => (
                   <div key={ticket.id} className="space-y-4">
                    <TicketCard
                      ticket={ticket}
                      onApprove={reviewFilter === 'pending' ? handleApprove : undefined}
                      onReject={reviewFilter === 'pending' ? () => handleReject(ticket.id) : undefined}
                      showActions={reviewFilter === 'pending'}
                    />
                    {reviewFilter === 'pending' && (
                      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
                        <textarea
                          value={rejectionNote[ticket.id] || ''}
                          onChange={(e) => setRejectionNote(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                          placeholder="Add rejection note..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'report' && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TicketForm onSuccess={() => setActiveTab('my-tickets')} />
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <SettingsPage />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
