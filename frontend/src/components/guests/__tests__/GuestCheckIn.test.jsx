import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import GuestCheckIn from '../GuestCheckIn'
import * as api from '../../../services/api'

// Mock the API module
vi.mock('../../../services/api', () => ({
  getCheckinContext: vi.fn(),
  singleEventCheckin: vi.fn(),
  multiEventCheckin: vi.fn(),
}))

// Mock TopNavBar component
vi.mock('../../layout/TopNavBar', () => ({
  default: () => <div data-testid="top-nav-bar">TopNavBar</div>
}))

const mockEvent = {
  _id: 'event-123',
  eventName: 'Test Event',
  contractNumber: 'CN-001'
}

const mockGuest = {
  _id: 'guest-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  company: 'Test Company',
  type: 'VIP'
}

const mockContext = {
  checkinMode: 'single',
  availableEvents: [mockEvent],
  inventoryByEvent: {
    'event-123': [
      { _id: 'inv-1', style: 'T-Shirt', size: 'M' },
      { _id: 'inv-2', style: 'Hat', size: 'L' }
    ]
  }
}

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('GuestCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCheckinContext.mockResolvedValue({ data: mockContext })
  })

  it('renders guest check-in form', async () => {
    renderWithRouter(
      <GuestCheckIn 
        event={mockEvent} 
        guest={mockGuest} 
        onClose={vi.fn()} 
        onCheckinSuccess={vi.fn()} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Guest Check-In')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Email: john.doe@example.com')).toBeInTheDocument()
    })
  })

  it('shows QR input when no guest is provided', async () => {
    renderWithRouter(
      <GuestCheckIn 
        event={mockEvent} 
        onClose={vi.fn()} 
        onCheckinSuccess={vi.fn()} 
      />
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter or scan QR')).toBeInTheDocument()
      expect(screen.getByText('Find Guest')).toBeInTheDocument()
    })
  })

  it('handles single event check-in', async () => {
    const onCheckinSuccess = vi.fn()
    api.singleEventCheckin.mockResolvedValue({ data: { success: true } })

    renderWithRouter(
      <GuestCheckIn 
        event={mockEvent} 
        guest={mockGuest} 
        onClose={vi.fn()} 
        onCheckinSuccess={onCheckinSuccess} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Check In Guest')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Check In Guest'))

    await waitFor(() => {
      expect(api.singleEventCheckin).toHaveBeenCalledWith(
        'guest-123',
        'event-123',
        []
      )
      expect(screen.getByText('Guest checked in successfully!')).toBeInTheDocument()
    })
  })

  it('handles gift selection', async () => {
    renderWithRouter(
      <GuestCheckIn 
        event={mockEvent} 
        guest={mockGuest} 
        onClose={vi.fn()} 
        onCheckinSuccess={vi.fn()} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Test Event Gift:')).toBeInTheDocument()
    })

    const giftSelect = screen.getByDisplayValue('Select a gift')
    fireEvent.change(giftSelect, { target: { value: 'inv-1' } })

    expect(giftSelect.value).toBe('inv-1')
  })

  it('shows error message on check-in failure', async () => {
    const errorMessage = 'Check-in failed'
    api.singleEventCheckin.mockRejectedValue({ 
      response: { data: { message: errorMessage } } 
    })

    renderWithRouter(
      <GuestCheckIn 
        event={mockEvent} 
        guest={mockGuest} 
        onClose={vi.fn()} 
        onCheckinSuccess={vi.fn()} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Check In Guest')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Check In Guest'))

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })
}) 