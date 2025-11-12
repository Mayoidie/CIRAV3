import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Clock, CheckCircle, AlertCircle, FileText, Settings as SettingsIcon } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { TicketForm } from '../tickets/TicketForm';
import { SettingsPage } from '../settings/SettingsPage';

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

interface StudentDashboardProps {
  logoClickTime: number;
  profileClickTime: number;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ logoClickTime, profileClickTime }) => {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [activeTab, setActiveTab] = useState<'tickets' | 'report' | 'settings'>('tickets');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'in-progress' | 'resolved' | 'rejected'>('all');

  useEffect(() => {
    if (logoClickTime > 0) {
      setActiveTab('tickets');
      setFilter('all');
    }
  }, [logoClickTime]);

  useEffect(() => {
    if (profileClickTime > 0) {
      setActiveTab('settings');
    }
  }, [profileClickTime]);


  useEffect(() => {
    if (auth.currentUser) {
      const q = query(collection(db, 'tickets'), where('userId', '==', auth.currentUser.uid));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const ticketsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as TicketType[];
        setTickets(ticketsData);
      });

      return () => unsubscribe();
    }
  }, [auth.currentUser]);

  const filteredTickets = tickets.filter(t => filter === 'all' || t.status === filter);
  
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
    { label: 'Rejected', count: rejectedTickets.length, icon: Clock, color: 'bg-[#FF4D4F]', status: 'rejected' as const },
  ];

  const tabs = [
    { id: 'tickets', label: 'My Tickets', icon: Ticket },
    { id: 'report', label: 'Report Issue', icon: AlertCircle },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[#1E1E1E] mb-2">Student Dashboard</h1>
        <p className="text-[#7A7A7A]">Here you can view your submitted tickets and report new issues.</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((stat, index) => (
          <motion.div 
            key={stat.label} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: index * 0.1 }} 
            onClick={() => { setActiveTab('tickets'); setFilter(stat.status); }}
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
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button onClick={() => setFilter('all')} style={{backgroundColor: filter === 'all' ? '#1B1F50' : 'white', color: filter === 'all' ? 'white' : '#7A7A7A'}} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>All ({tickets.length})</button>
                <button onClick={() => setFilter('pending')} style={{backgroundColor: filter === 'pending' ? '#FFC107' : 'white', color: filter === 'pending' ? 'white' : '#7A7A7A'}} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>Pending ({pendingTickets.length})</button>
                <button onClick={() => setFilter('approved')} style={{backgroundColor: filter === 'approved' ? '#1DB954' : 'white', color: filter === 'approved' ? 'white' : '#7A7A7A'}} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>Approved ({approvedTickets.length})</button>
                <button onClick={() => setFilter('in-progress')} style={{backgroundColor: filter === 'in-progress' ? '#3942A7' : 'white', color: filter === 'in-progress' ? 'white' : '#7A7A7A'}} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>In Progress ({inProgressTickets.length})</button>
                <button onClick={() => setFilter('resolved')} style={{backgroundColor: filter === 'resolved' ? '#1DB954' : 'white', color: filter === 'resolved' ? 'white' : '#7A7A7A'}} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>Resolved ({resolvedTickets.length})</button>
                <button onClick={() => setFilter('rejected')} style={{backgroundColor: filter === 'rejected' ? '#FF4D4F' : 'white', color: filter === 'rejected' ? 'white' : '#7A7A7A'}} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>Rejected ({rejectedTickets.length})</button>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center"><FileText className="w-16 h-16 mx-auto text-[#7A7A7A] mb-4" /><h3 className="text-[#1E1E1E] mb-2">No tickets found</h3><p className="text-[#7A7A7A]">You haven't submitted any tickets in this category yet.</p></div>
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
                      <th scope="col" className="px-6 py-3"><div className="flex items-center justify-center">Notes</div></th>
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
                          <div className="flex items-center justify-center">
                            {ticket.status === 'rejected' && ticket.rejectionNote && <p>Rejection: {ticket.rejectionNote}</p>}
                            {ticket.status === 'resolved' && ticket.resolutionNote && <p>Resolution: {ticket.resolutionNote}</p>}
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

        {activeTab === 'report' && (
          <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <TicketForm onSuccess={() => setActiveTab('tickets')} />
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