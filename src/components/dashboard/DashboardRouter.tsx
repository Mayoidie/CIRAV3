import React from 'react';
import { StudentDashboard } from './StudentDashboard';
import { ClassRepDashboard } from './ClassRepDashboard';
import { AdminDashboard } from './AdminDashboard';

interface User {
  id: string;
  role: 'student' | 'class-representative' | 'admin';
  [key: string]: any;
}

interface DashboardRouterProps {
  user: User;
}

// This is a stateless component that receives the user object and renders the correct dashboard.
export const DashboardRouter: React.FC<DashboardRouterProps> = ({ user }) => {
  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'class-representative':
      return <ClassRepDashboard />;
    case 'student':
    default:
      return <StudentDashboard />;
  }
};
