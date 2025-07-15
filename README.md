# Event Check-in App

A comprehensive event management system for handling guest check-ins, gift distribution, and event analytics.

## Features

### Event Management
- Create main events and secondary events
- **Guest List Inheritance**: Secondary events automatically inherit the guest list from their parent main event
- Guest management with CSV/Excel upload support
- Real-time check-in tracking

### Guest Management
- **Inherited Guest Lists**: When viewing a secondary event, you'll see all guests from both the secondary event and its parent main event
- Visual indicators distinguish between directly assigned guests and inherited guests
- Bulk guest upload via CSV/Excel
- Individual guest management
- QR code generation for each guest

### Check-in System
- Multi-event check-in support
- Gift selection and distribution tracking
- Real-time status updates
- Activity logging

### Analytics
- Comprehensive event analytics
- Gift distribution tracking
- Check-in statistics
- Activity feeds

### Inventory Management
- Gift inventory tracking
- Style and size management
- Allocation to specific events
- Export functionality

## Guest List Inheritance

The app now supports guest list inheritance from main events to secondary events:

- **Main Events**: Contain the primary guest list
- **Secondary Events**: Automatically inherit guests from their parent main event
- **Visual Indicators**: Inherited guests are marked with an icon and different styling
- **Duplicate Prevention**: The system prevents adding duplicate guests across main and secondary events
- **Flexible Management**: You can still add guests directly to secondary events

### How It Works

1. When viewing a secondary event, the system fetches guests from both:
   - The secondary event itself
   - The parent main event

2. Inherited guests are visually distinguished with:
   - A tree icon next to their name
   - Light blue background highlighting
   - "Inherited" chip in the Source column
   - Tooltip showing the original event name

3. Guest management operations:
   - Adding guests to a secondary event checks for duplicates in the parent event
   - Uploading guests respects the inheritance structure
   - Check-ins work seamlessly with inherited guests

## Installation

### Backend Setup
```bash
cd backend
npm install
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Guest Management
- `GET /guests?eventId={id}&includeInherited=true` - Get guests with inheritance support
- `POST /guests` - Create guest (handles inheritance checks)
- `POST /guests/bulk-add` - Bulk add guests (handles inheritance checks)

## Contributing

Please read our contributing guidelines before submitting pull requests. 
