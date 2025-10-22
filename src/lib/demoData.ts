import { createTicket, getUsers } from './mockData';

// This function can be called to populate demo tickets
export const populateDemoTickets = () => {
  const users = getUsers();
  const adminUser = users.find(u => u.role === 'admin');
  
  if (!adminUser) return;

  // Create some sample tickets
  const sampleTickets = [
    {
      userId: adminUser.id,
      classroom: 'CEIT - Comlab A',
      unitId: 'PC-001',
      issueType: 'hardware',
      issueSubtype: 'Mouse',
      issueDescription: 'Mouse is not responding. Tried different USB ports but still not working.',
      status: 'approved' as const,
    },
    {
      userId: adminUser.id,
      classroom: 'CEIT - Comlab B',
      unitId: 'PC-015',
      issueType: 'software',
      issueSubtype: 'Operating System',
      issueDescription: 'Windows update is stuck at 0%. System is very slow.',
      status: 'in-progress' as const,
    },
    {
      userId: adminUser.id,
      classroom: 'CEIT - Comlab A',
      unitId: '',
      issueType: 'network',
      issueSubtype: 'No Internet',
      issueDescription: 'Unable to connect to internet. All computers in the lab affected.',
      status: 'pending' as const,
    },
    {
      userId: adminUser.id,
      classroom: 'CEIT - Comlab B',
      unitId: '',
      issueType: 'other',
      issueSubtype: 'Whiteboard',
      issueDescription: 'Whiteboard markers are all dried out. Need replacement.',
      status: 'resolved' as const,
      resolutionNote: 'New whiteboard markers have been provided.',
    },
  ];

  // Only create if there are no tickets yet
  const existingTickets = localStorage.getItem('cira_tickets');
  if (!existingTickets || JSON.parse(existingTickets).length === 0) {
    sampleTickets.forEach(ticket => createTicket(ticket));
  }
};
