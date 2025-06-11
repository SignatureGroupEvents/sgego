# 🎪 Event Check-in Management System

A comprehensive, enterprise-level event management platform with multi-event check-ins, real-time inventory tracking, and advanced guest management.

## ✨ Features

### 🔐 **Authentication & Authorization**
- Role-based access control (Operations Manager, Staff, Admin)
- JWT token authentication
- Protected routes and API endpoints

### 🎪 **Event Management**
- Main events with contract numbers
- Secondary events (nested under main events)
- Custom tags and attendee types
- Flexible gift management system

### 👥 **Enhanced Guest Management**
- Comprehensive guest profiles (Job Title, Company, Attendee Type, Tags, Notes)
- CSV/Excel upload with smart column mapping
- Bulk guest addition with duplicate detection
- QR code support (existing + auto-generated)

### 📦 **Advanced Inventory System**
- CSV upload with full audit trail
- Real-time inventory tracking
- Shared inventory pool across events
- Manual count adjustments with history

### ✅ **Revolutionary Check-in System**
- **Multi-Event Mode**: Check guests into multiple events simultaneously
- **Single-Event Mode**: Focused check-in for specific events
- Real-time inventory deduction
- Gift selection per event
- Undo functionality with reason tracking

## 🛠️ **Tech Stack**

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **CSV-Parser** for data processing

### Frontend
- **React** with Vite
- **Material-UI (MUI)** for components
- **React Router** for navigation
- **Axios** for API calls

## 🚀 **Getting Started**

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/brittanybyoung/sevent.git
   cd sevent

2. **Backend Setup**
   bash cd backend
   npm install

create .env file
   NODE_ENV=development
   PORT=3001
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRE=7d
   CORS_ORIGIN=http://localhost:3000

3. **Front End Set Up**
   bash
      cd ../frontend
      npm install 
   create .env file
      VITE_API_URL=http://localhost:3001/api
      VITE_APP_NAME=Event Check-in System
4. **Start Development**
         # Terminal 1 - Backend
      cd backend
      npm run dev

      # Terminal 2 - Frontend  
      cd frontend
      npm run dev

📖 Usage
Operations Manager Workflow

Create main event with contract number
Upload inventory CSV with gift options
Create secondary events for different sessions
Upload guest list with enhanced fields
Staff handles multi-event check-ins

Staff Check-in Process

Main Event Booth: Check guests into multiple events simultaneously
Specific Event Booth: Focus on single event check-ins
Real-time inventory updates as gifts are distributed

🗂️ Project Structure
sevent/
├── backend/                 # Node.js API
│   ├── controllers/        # Route handlers
│   ├── models/            # Database schemas
│   ├── routes/            # API routes
│   ├── middleware/        # Authentication & validation
│   └── uploads/           # File uploads
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   └── services/      # API services
└── README.md

🔄 API Endpoints

Authentication

POST /api/auth/register - Register new user
POST /api/auth/login - User login
GET /api/auth/profile - Get user profile

Events

GET /api/events - List all events
POST /api/events - Create new event
GET /api/events/:id - Get event details
PUT /api/events/:id - Update event
DELETE /api/events/:id - Delete event

Guests

GET /api/guests?eventId=:id - List event guests
POST /api/guests - Create guest
POST /api/guests/bulk-add - Bulk add guests
DELETE /api/guests/:id - Delete guest

Inventory

GET /api/inventory/:eventId - Get event inventory
POST /api/inventory/upload - Upload inventory CSV
PUT /api/inventory/:id - Update inventory count

Check-ins

GET /api/checkins/context/:eventId - Get check-in context
POST /api/checkins/multi - Multi-event check-in
POST /api/checkins/single - Single event check-in

🤝 Contributing
Fork the repository
Create a feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

Made with ❤️ by Brittany Young & Alyssa Herrera 
