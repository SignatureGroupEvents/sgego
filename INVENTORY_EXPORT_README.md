# Inventory Export Functionality

This document describes the inventory export functionality that has been implemented for the Event Check-in App.

## Features

### CSV Export
- Exports inventory data in CSV format
- Includes all inventory fields: Type, Style, Size, Gender, Quantities, Status, etc.
- Populates allocated events with event names
- Includes creation and update timestamps
- Filters to show only active inventory items
- Sorted by Type, Style, and Size

### Excel Export
- Exports inventory data in Excel (.xlsx) format
- Includes all the same data as CSV export
- Features formatted headers with styling
- Includes summary section with totals
- Column widths are optimized for readability
- Professional formatting with header styling

## Backend Implementation

### New Dependencies
- `exceljs`: For Excel file generation

### API Endpoints
- `GET /api/inventory/:eventId/export/csv` - Export inventory as CSV
- `GET /api/inventory/:eventId/export/excel` - Export inventory as Excel

### Controller Functions
- `exportInventoryCSV()` - Handles CSV export with proper data transformation
- `exportInventoryExcel()` - Handles Excel export with formatting and summary

### Data Included in Export
- Type
- Style
- Size
- Gender
- Qty Warehouse
- Qty On Site
- Current Inventory
- Post Event Count
- Allocated Events (comma-separated event names)
- Status (Active/Inactive)
- Created At
- Last Updated

## Frontend Implementation

### New API Functions
- `exportInventoryCSV(eventId)` - Calls CSV export endpoint
- `exportInventoryExcel(eventId)` - Calls Excel export endpoint

### UI Components
- Two export buttons: "Export CSV" and "Export Excel"
- Automatic file download with proper naming
- Success/error notifications
- File naming format: `inventory_{eventContractNumber}_{date}.{extension}`

### File Download Process
1. User clicks export button
2. API call is made with `responseType: 'blob'`
3. Blob URL is created from response data
4. Temporary download link is created and clicked
5. File downloads automatically
6. Temporary resources are cleaned up

## Usage

1. Navigate to the Inventory page for any event
2. Click "Export CSV" to download inventory as CSV file
3. Click "Export Excel" to download inventory as Excel file
4. Files will be automatically downloaded to the user's default download folder

## File Naming Convention

Files are named using the following pattern:
- `inventory_{eventContractNumber}_{YYYY-MM-DD}.csv`
- `inventory_{eventContractNumber}_{YYYY-MM-DD}.xlsx`

Example: `inventory_EV2024001_2024-01-15.csv`

## Error Handling

- If no inventory is found, returns 404 with appropriate message
- If event is not found, returns 404 with appropriate message
- Frontend shows error notifications for failed exports
- Backend returns 500 status for server errors

## Security

- All export endpoints are protected with authentication middleware
- Only authenticated users can access export functionality
- Event-specific data is properly filtered by event ID

## Performance Considerations

- Excel export includes summary calculations
- Large datasets are handled efficiently with streaming
- Proper memory cleanup after file generation
- Response headers are set for optimal download experience 