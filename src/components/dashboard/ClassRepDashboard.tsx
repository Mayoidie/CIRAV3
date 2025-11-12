import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Clock, CheckCircle, AlertCircle, FileText, Settings as SettingsIcon, Search, ClipboardList, XCircle, Check, X, Trash2 } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { TicketForm } from '../tickets/TicketForm';
import { SettingsPage } from '../settings/SettingsPage';
import { useToast } from '../ui/toast-container';
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

interface ClassRepDashboardProps {
  logoClickTime: number;
  profileClickTime: number;
}

export const ClassRepDashboard: React.FC<ClassRepDashboardProps> = ({ logoClickTime, profileClickTime }) => {
  const [allTickets, setAllTickets] = useState<TicketType[]>([]);
  const [activeTab, setActiveTab] = useState<'my-tickets' | 'review' | 'report' | 'settings'>('my-tickets');
  const [myTicketsFilter, setMyTicketsFilter] = useState<'all' | 'approved' | 'in-progress' | 'resolved' | 'rejected'>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'approved' | 'in-progress' | 'resolved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionNote, setRejectionNote] = useState<{ [key: string]: string }>({});
  const [showRejectionNote, setShowRejectionNote] = useState<{ [key: string]: boolean }>({});
  const { showToast } = useToast();

  useEffect(() => {
    if (logoClickTime > 0) {
      setActiveTab('my-tickets');
      setMyTicketsFilter('all');
      setReviewFilter('all');
    }
  }, [logoClickTime]);

  useEffect(() => {
    if (profileClickTime > 0) {
      setActiveTab('settings');
    }
  }, [profileClickTime]);

  useEffect(() => {
    const ticketsCollection = collection(db, 'tickets');
    const q = query(ticketsCollection);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ticketsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as TicketType[];
      setAllTickets(ticketsData);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (ticketId: string) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, { status: 'approved', approvedAt: new Date() });
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

  const currentUser = auth.currentUser;
  const myTickets = allTickets.filter(t => t.userId === currentUser?.uid);
  const reviewTickets = allTickets.filter(t => t.userId !== currentUser?.uid);

  const filteredMyTickets = myTickets
    .filter(ticket => myTicketsFilter === 'all' || ticket.status === myTicketsFilter)
    .filter(ticket => 
      ticket.issueDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.classroom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.issueType.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredReviewTickets = reviewTickets
    .filter(t => reviewFilter === 'all' || t.status === reviewFilter)
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
    { label: 'Pending Review', count: pendingReviewTickets.length, icon: Clock, color: 'bg-[#FFC107]', status: 'pending' as const },
    { label: 'Approved', count: approvedReviewTickets.length, icon: CheckCircle, color: 'bg-[#1DB954]', status: 'approved' as const },
    { label: 'In Progress', count: inProgressReviewTickets.length, icon: AlertCircle, color: 'bg-[#3942A7]', status: 'in-progress' as const },
    { label: 'Resolved', count: resolvedReviewTickets.length, icon: CheckCircle, color: 'bg-[#1DB954]', status: 'resolved' as const },
    { label: 'Rejected', count: rejectedReviewTickets.length, icon: XCircle, color: 'bg-[#FF4D4F]', status: 'rejected' as const },
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
  const rejectedMyTickets = myTickets.filter(t => t.status === 'rejected');

  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[#1E1E1E] mb-2">Class Representative Dashboard</h1>
        <p className="text-[#7A7A7A]">Manage tickets and review student submissions</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((stat, index) => (
          <motion.div 
            key={stat.label} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: index * 0.1 }} 
            onClick={() => { setActiveTab('review'); setReviewFilter(stat.status); }}
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
        {activeTab === 'my-tickets' && (
          <motion.div key="my-tickets" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button 
                  onClick={() => setMyTicketsFilter('all')} 
                  style={{backgroundColor: myTicketsFilter === 'all' ? '#1B1F50' : 'white', color: myTicketsFilter === 'all' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  All ({myTickets.length})
                </button>
                <button 
                  onClick={() => setMyTicketsFilter('approved')} 
                  style={{backgroundColor: myTicketsFilter === 'approved' ? '#1DB954' : 'white', color: myTicketsFilter === 'approved' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  Approved ({approvedMyTickets.length})
                </button>
                <button 
                  onClick={() => setMyTicketsFilter('in-progress')} 
                  style={{backgroundColor: myTicketsFilter === 'in-progress' ? '#3942A7' : 'white', color: myTicketsFilter === 'in-progress' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  In Progress ({inProgressMyTickets.length})
                </button>
                <button 
                  onClick={() => setMyTicketsFilter('resolved')} 
                  style={{backgroundColor: myTicketsFilter === 'resolved' ? '#1DB954' : 'white', color: myTicketsFilter === 'resolved' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  Resolved ({resolvedMyTickets.length})
                </button>
                <button 
                  onClick={() => setMyTicketsFilter('rejected')} 
                  style={{backgroundColor: myTicketsFilter === 'rejected' ? '#FF4D4F' : 'white', color: myTicketsFilter === 'rejected' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  Rejected ({rejectedMyTickets.length})
                </button>
            </div>

            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search my tickets..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all" />
            </div>

            {filteredMyTickets.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center"><FileText className="w-16 h-16 mx-auto text-[#7A7A7A] mb-4" /><h3 className="text-[#1E1E1E] mb-2">No tickets found</h3><p className="text-[#7A7A7A]">{searchQuery ? 'Try adjusting your search query' : `You haven\'t submitted any tickets in this category yet`}</p></div>
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
                    {filteredMyTickets.map((ticket, index) => (
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

        {activeTab === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button 
                  onClick={() => setReviewFilter('all')} 
                  style={{backgroundColor: reviewFilter === 'all' ? '#1B1F50' : 'white', color: reviewFilter === 'all' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  All ({reviewTickets.length})
                </button>
                <button 
                  onClick={() => setReviewFilter('pending')} 
                  style={{backgroundColor: reviewFilter === 'pending' ? '#FFC107' : 'white', color: reviewFilter === 'pending' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  Pending ({pendingReviewTickets.length})
                </button>
                <button 
                  onClick={() => setReviewFilter('approved')} 
                  style={{backgroundColor: reviewFilter === 'approved' ? '#1DB954' : 'white', color: reviewFilter === 'approved' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  Approved ({approvedReviewTickets.length})
                </button>
                <button 
                  onClick={() => setReviewFilter('in-progress')} 
                  style={{backgroundColor: reviewFilter === 'in-progress' ? '#3942A7' : 'white', color: reviewFilter === 'in-progress' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  In Progress ({inProgressReviewTickets.length})
                </button>
                <button 
                  onClick={() => setReviewFilter('resolved')} 
                  style={{backgroundColor: reviewFilter === 'resolved' ? '#1DB954' : 'white', color: reviewFilter === 'resolved' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  Resolved ({resolvedReviewTickets.length})
                </button>
                <button 
                  onClick={() => setReviewFilter('rejected')} 
                  style={{backgroundColor: reviewFilter === 'rejected' ? '#FF4D4F' : 'white', color: reviewFilter === 'rejected' ? 'white' : '#7A7A7A'}}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer border border-gray-300`}>
                  Rejected ({rejectedReviewTickets.length})
                </button>
            </div>

            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A7A7A]" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tickets to review..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3942A7] transition-all" />
            </div>

            {filteredReviewTickets.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center"><ClipboardList className="w-16 h-16 mx-auto text-[#7A7A7A] mb-4" /><h3 className="text-[#1E1E1E] mb-2">No tickets to review</h3><p className="text-[#7A7A7A]">{searchQuery ? 'Try adjusting your search query' : `There are no ${reviewFilter} tickets to review`}</p></div>
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
                    {filteredReviewTickets.map((ticket, index) => (
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
                                    <Button onClick={() => handleApprove(ticket.id)} variant="success"><Check className="w-4 h-4"/><span>Approve</span></Button>
                                    <Button onClick={() => setShowRejectionNote(prev => ({ ...prev, [ticket.id]: true }))} variant="destructive"><X className="w-4 h-4"/><span>Reject</span></Button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <textarea value={rejectionNote[ticket.id] || ''} onChange={(e) => setRejectionNote(prev => ({ ...prev, [ticket.id]: e.target.value }))} placeholder="Rejection Note..." className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#3942A7]" />
                                    <div className="flex gap-2">
                                      <Button onClick={() => handleReject(ticket.id)} variant="destructive" className="flex-1 justify-center">Confirm</Button>
                                      <Button onClick={() => setShowRejectionNote(prev => ({ ...prev, [ticket.id]: false }))} variant="ghost" className="flex-1 justify-center">Cancel</Button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            {(ticket.status === 'resolved' || ticket.status === 'rejected') && 
                              <Button onClick={() => handleDeleteTicket(ticket.id)} variant="destructive">
                                <Trash2 className="w-4 h-4"/><span>Delete</span>
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

        {activeTab === 'report' && (
          <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <TicketForm onSuccess={() => { setActiveTab('my-tickets'); setMyTicketsFilter('approved'); }} />
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