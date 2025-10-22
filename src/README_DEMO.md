# CIRA - Computer Issue Reporting & Analytics

A comprehensive ticket management system for Pamantasan ng Lungsod ng Valenzuela's College of Engineering and Information Technology.

## Demo Credentials

### Admin Account
- **Email:** admin
- **Password:** admin

### Testing the System

1. **Login as Admin** to:
   - View and manage all tickets
   - Approve Class Representative requests
   - Mark tickets as in-progress or resolved
   - Delete tickets

2. **Create a Student Account**:
   - Use any name
   - Email must end with @plv.edu.ph
   - Student ID format: XX-XXXX (e.g., 23-3302)
   - Choose "Student" or "Class Representative" role

3. **Create a Class Representative Account**:
   - During signup, select "Class Representative" as role
   - Account will start as Student role
   - A note will appear to contact admin
   - Login as admin to approve the Class Representative request in the "User Management" tab

## Features

### Student Features
- Submit tickets for hardware, software, network, and other issues
- Track ticket status (pending, approved, in-progress, resolved)
- View ticket history
- Delete own tickets
- Change password in settings

### Class Representative Features
- All student features
- Review and approve/reject student tickets
- Auto-approved tickets (no approval needed for own tickets)
- Delete any ticket
- View separate tabs for own tickets and tickets to review

### Admin Features
- View all tickets by status
- Mark tickets as in-progress or resolved
- Add resolution notes (required for resolved tickets)
- Approve Class Representative role requests
- Delete any ticket
- Full user management

## Color System

- **Pending:** Yellow (#FFC107)
- **Approved:** Green (#1DB954)
- **In Progress:** Blue (#3942A7)
- **Resolved:** Green (#1DB954)
- **Rejected:** Red (#FF4D4F)

## Issue Types

1. **Hardware Issue:** Mouse, Monitor, Keyboard, CPU, Power Supply, Cables
2. **Software Issue:** Operating System, Application, Driver, Updates, Performance
3. **Network Issue:** No Internet, Slow Connection, WiFi Not Working, Network Cable, Router
4. **Other Issue:** Chairs, Table, Lights, Whiteboard, Remote, Air Conditioning

## Classrooms

- CEIT - Comlab A
- CEIT - Comlab B

## Notes

- This is a frontend-only demo using localStorage for data persistence
- Email verification is simulated (no actual emails are sent)
- For production use, connect to a real backend service
- Data is stored locally in your browser
