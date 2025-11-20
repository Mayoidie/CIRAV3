import React from 'react';
import { motion } from 'motion/react';
import { Calendar, MapPin, AlertCircle, Trash2, CheckCircle, XCircle, PlayCircle } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

interface Ticket {
  id: string;
  classroom: string;
  issueDescription: string;
  issueType: string;
  issueSubtype?: string;
  status: 'submitted' | 'requested' | 'in-progress' | 'pending-resolution' | 'resolved' | 'rejected';
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
  onConfirmResolution?: (id: string) => void;
  showActions?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onDelete,
  onApprove,
  onReject,
  onStartProgress,
  onResolve,
  onConfirmResolution,
  showActions = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-[#FFC107] text-[#1E1E1E]';
      case 'requested':
        return 'bg-[#1DB954] text-white';
      case 'in-progress':
        return 'bg-[#3942A7] text-white';
      case 'pending-resolution':
        return 'bg-[#FFC107] text-[#1E1E1E]';
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

  const issueDescription = ticket.issueDescription;
  const isLongDescription = issueDescription.length > 50;
  const truncatedDescription = isLongDescription
    ? `${issueDescription.substring(0, 50)}...`
    : issueDescription;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-6 border-4 border-red-500"
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
            <Button onClick={() => onDelete(ticket.id)} variant="ghost" size="icon" className="text-destructive">
              <Trash2 className="w-5 h-5" />
            </Button>
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
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="break-words">{truncatedDescription}</p>
            {isLongDescription && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" className="p-0 h-auto text-blue-500 text-sm">
                    Show more
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Issue Description</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <p>{issueDescription}</p>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
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
          {ticket.status === 'submitted' && onApprove && onReject && (
            <>
              <Button onClick={() => onApprove(ticket.id)} variant="success">
                  <CheckCircle />
                  <span>Approve</span>
              </Button>
              <Button onClick={() => onReject(ticket.id)} variant="destructive">
                  <XCircle />
                  <span>Reject</span>
              </Button>
            </>
          )}

          {ticket.status === 'requested' && onStartProgress && (
            <Button onClick={() => onStartProgress(ticket.id)}>
                <PlayCircle />
                <span>Start Working</span>
            </Button>
          )}

          {ticket.status === 'in-progress' && onResolve && (
            <Button onClick={() => onResolve(ticket.id)} variant="success">
                <CheckCircle />
                <span>Mark as Resolved</span>
            </Button>
          )}

          {ticket.status === 'pending-resolution' && onConfirmResolution && (
            <Button onClick={() => onConfirmResolution(ticket.id)} variant="success">
                <CheckCircle />
                <span>Confirm Resolution</span>
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};
