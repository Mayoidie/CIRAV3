import React from 'react';
import { motion } from 'motion/react';
import { Calendar, MapPin, AlertCircle, Trash2, CheckCircle, XCircle, PlayCircle } from 'lucide-react';

interface Ticket {
  id: string;
  classroom: string;
  issueDescription: string;
  issueType: string;
  issueSubtype?: string;
  status: 'pending' | 'approved' | 'in-progress' | 'resolved' | 'rejected';
  createdAt: any; // Can be string or Firestore Timestamp
  updatedAt?: any;
  userId?: string;
  unitId?: string;
  imageUrl?: string;
  resolutionNote?: string;
  rejectionNote?: string;
}

interface TicketCardProps {
  ticket: Ticket;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onStartProgress?: (id: string) => void;
  onResolve?: (id: string) => void;
  showActions?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onDelete,
  onApprove,
  onReject,
  onStartProgress,
  onResolve,
  showActions = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-[#FFC107] text-[#1E1E1E]';
      case 'approved':
        return 'bg-[#1DB954] text-white';
      case 'in-progress':
        return 'bg-[#3942A7] text-white';
      case 'resolved':
        return 'bg-[#1DB954] text-white';
      case 'rejected':
        return 'bg-[#FF4D4F] text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatDate = (date: any) => {
    if (date && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (typeof date === 'string') {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return 'No date provided';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-6 border border-gray-200"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
              {ticket.status.replace('-', ' ').toUpperCase()}
            </span>
            <span className="text-[#7A7A7A]">#{ticket.id.substring(0, 5)}...</span>
          </div>
          <h3 className="text-[#1E1E1E] mb-1">{ticket.issueType}</h3>
          {ticket.issueSubtype && (
            <p className="text-[#7A7A7A]">{ticket.issueSubtype}</p>
          )}
        </div>
        {onDelete && (
          <motion.button
            onClick={() => onDelete(ticket.id)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-[#FF4D4F] hover:bg-red-50 p-2 rounded-lg transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-[#7A7A7A]">
          <MapPin className="w-4 h-4" />
          <span>{ticket.classroom}</span>
          {ticket.unitId && <span>• Unit: {ticket.unitId}</span>}
        </div>
        <div className="flex items-center gap-2 text-[#7A7A7A]">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(ticket.createdAt)}</span>
        </div>
        <div className="flex items-start gap-2 text-[#7A7A7A]">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <p className="flex-1">{ticket.issueDescription}</p>
        </div>
      </div>

      {ticket.imageUrl && (
        <div className="mb-4">
          <img
            src={ticket.imageUrl}
            alt="Issue"
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>
      )}

      {ticket.resolutionNote && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-[#1DB954]">Resolution Note:</p>
          <p className="text-[#1E1E1E]">{ticket.resolutionNote}</p>
        </div>
      )}

      {ticket.rejectionNote && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-[#FF4D4F]">Rejection Note:</p>
          <p className="text-[#1E1E1E]">{ticket.rejectionNote}</p>
        </div>
      )}

      {showActions && (
        <div className="flex gap-2 pt-4 border-t">
          {ticket.status === 'pending' && onApprove && onReject && (
            <>
              <motion.button
                onClick={() => onApprove(ticket.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#1DB954] text-white rounded-lg hover:bg-[#1DB954]/90 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve</span>
              </motion.button>
              <motion.button
                onClick={() => onReject(ticket.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#FF4D4F] text-white rounded-lg hover:bg-[#FF4D4F]/90 transition-all"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </motion.button>
            </>
          )}

          {ticket.status === 'approved' && onStartProgress && (
            <motion.button
              onClick={() => onStartProgress(ticket.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#3942A7] text-white rounded-lg hover:bg-[#3942A7]/90 transition-all"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Start Working</span>
            </motion.button>
          )}

          {ticket.status === 'in-progress' && onResolve && (
            <motion.button
              onClick={() => onResolve(ticket.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#1DB954] text-white rounded-lg hover:bg-[#1DB954]/90 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Mark as Resolved</span>
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
};
