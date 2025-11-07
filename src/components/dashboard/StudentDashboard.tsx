import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Clock, CheckCircle, AlertCircle, FileText, Settings as SettingsIcon, Search, XCircle, Star, Loader } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { TicketCard } from '../tickets/TicketCard';
import { TicketForm } from '../tickets/TicketForm';
import { SettingsPage } from '../settings/SettingsPage';

interface TicketType {
  id: string;
  classroom: string;
  issueDescription: string;
  issueType: string;``
  status: 'pending' | 'approved' | 'in-progress' | 'resolved' | 'rejected';
  rejectionNote?: string;
  userId: string;
}

interface StudentDashboardProps {
  logoClickTime: number;
  profileClickTime: number;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ logoClickTime, profileClickTime }) => {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-tickets' | 'report' | 'settings'>('my-tickets');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'in-progress' | 'resolved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (logoClickTime > 0) {
      setActiveTab('my-tickets');
    }
  }, [logoClickTime]);

  useEffect(() => {
    if (profileClickTime > 0) {
      setActiveTab('settings');
    }
  }, [profileClickTime]);


  const fetchTickets = useCallback(() => {
    if (auth.currentUser) {
      setIsLoading(true);
      const ticketsCollection = collection(db, 'tickets');
      const q = query(ticketsCollection, where("userId", "==", auth.currentUser.uid));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userTickets = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as TicketType[];
        setTickets(userTickets);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching user tickets: ", error);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      setTickets([]);
      setIsLoading(false);
    }
  }, [auth.currentUser]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleTicketSubmission = () => {
    setActiveTab('my-tickets');
    setStatusFilter('pending');
    fetchTickets(); // Force a re-fetch of tickets
  };

  const pendingTickets = tickets.filter(t => t.status === 'pending');
  const approvedTickets = tickets.filter(t => t.status === 'approved');
  const inProgressTickets = tickets.filter(t => t.status === 'in-progress');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved');
  const rejectedTickets = tickets.filter(t => t.status === 'rejected');

  const filteredTickets = tickets
    .filter(ticket => statusFilter === 'all' || ticket.status === statusFilter)
    .filter(ticket => 
      ticket.issueDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.classroom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.issueType.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const stats = [
    { label: 'Pending', count: pendingTickets.length, icon: Clock, color: 'bg-[#FFC107]', status: 'pending' as const },
    { label: 'Approved', count: approvedTickets.length, icon: CheckCircle, color: 'bg-[#1DB954]', status: 'approved' as const },
    { label: 'In Progress', count: inProgressTickets.length, icon: AlertCircle, color: 'bg-[#3942A7]', status: 'in-progress' as const },
    { label: 'Resolved', count: resolvedTickets.length, icon: Star, color: 'bg-[#1DB954]', status: 'resolved' as const },
    { label: 'Rejected', count: rejectedTickets.length, icon: XCircle, color: 'bg-[#FF4D4F]', status: 'rejected' as const },
  ];

  const tabs = [
    { id: 'my-tickets', label: 'My Tickets', icon: Ticket },
    { id: 'report', label: 'Report Issue', icon: AlertCircle },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[#1E1E1E] mb-2">Dashboard</h1>
        <p className="text-[#7A7A7A]">Manage your tickets and report issues</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((stat, index) => (
          <motion.div 
            key={stat.label} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: index * 0.1 }} 
            onClick={() => setStatusFilter(stat.status)}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}><stat.icon className="w-6 h-6 text-white" /></div>
            <p className="text-[#7A7A7A] mb-1">{stat.label}</p>
            <p className="text-[#1E1E1E]">{stat.count}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 transition-all ${activeTab === tab.id ? 'bg-[#3942A7] text-white' : 'bg-white text-[#7A7A7A] hover:bg-gray-50'}`}>
              <tab.icon className="w-5 h-5" /><span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'my-tickets' && (
          <motion.div key="my-tickets" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${statusFilter === 'all' ? 'bg-[#1B1F50] text-white' : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'}`}>All ({tickets.length})</button>
              <button onClick={() => setStatusFilter('pending')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${statusFilter === 'pending' ? 'bg-[#FFC107] text-[#1E1E1E]' : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'}`}>Pending ({pendingTickets.length})</button>
              <button onClick={() => setStatusFilter('approved')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${statusFilter === 'approved' ? 'bg-[#1DB954] text-white' : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'}`}>Approved ({approvedTickets.length})</button>
              <button onClick={() => setStatusFilter('in-progress')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${statusFilter === 'in-progress' ? 'bg-[#3942A7] text-white' : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'}`}>In Progress ({inProgressTickets.length})</button>
              <button onClick={() => setStatusFilter('resolved')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${statusFilter === 'resolved' ? 'bg-[#1DB954] text-white' : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'}`}>Resolved ({resolvedTickets.length})</button>
              <button onClick={() => setStatusFilter('rejected')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${statusFilter === 'rejected' ? 'bg-[#FF4D4F] text-white' : 'bg-white text-[#7A7A7A] border border-gray-300 hover:bg-gray-50'}`}>Rejected ({rejectedTickets.length})</button>
            </div>

            <div className="mb-6"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tickets..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all" /></div></div>

            {isLoading ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center"><Loader className="w-16 h-16 mx-auto text-[#3942A7] mb-4 animate-spin" /><h3 className="text-[#1E1E1E] mb-2">Loading Tickets...</h3><p className="text-[#7A7A7A]">Please wait a moment.</p></div>
            ) : filteredTickets.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center"><FileText className="w-16 h-16 mx-auto text-[#7A7A7A] mb-4" /><h3 className="text-[#1E1E1E] mb-2">No tickets found</h3><p className="text-[#7A7A7A]">{searchQuery ? 'Try adjusting your search query' : "You haven't submitted any tickets yet"}</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} showActions={false} />)}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'report' && (
          <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <TicketForm onSuccess={handleTicketSubmission} />
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
