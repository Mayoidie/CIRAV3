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
  logoClickTime: number;
  profileClickTime: number;
}

export const DashboardRouter: React.FC<DashboardRouterProps> = ({ user, logoClickTime, profileClickTime }) => {
  switch (user.role) {
    case 'admin':
      return <AdminDashboard logoClickTime={logoClickTime} profileClickTime={profileClickTime} />;
    case 'class-representative':
      return <ClassRepDashboard logoClickTime={logoClickTime} profileClickTime={profileClickTime} />;
    case 'student':
    default:
      return <StudentDashboard logoClickTime={logoClickTime} profileClickTime={profileClickTime} />;
  }
};
