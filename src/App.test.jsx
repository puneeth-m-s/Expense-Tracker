import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

beforeEach(() => {
  window.localStorage.clear()
})

test('validates expense input and adds a valid record', async () => {
  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: /add expense/i }))
  expect(screen.getByText(/title is required/i)).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText(/expense title/i), {
    target: { value: 'Groceries' },
  })
  fireEvent.change(screen.getByLabelText(/amount/i), {
    target: { value: '0' },
  })

  fireEvent.click(screen.getByRole('button', { name: /add expense/i }))
  await waitFor(() => {
    expect(screen.getByText(/amount must be a number greater than zero/i)).toBeInTheDocument()
  })

  fireEvent.change(screen.getByLabelText(/amount/i), {
    target: { value: '1500' },
  })
  fireEvent.click(screen.getByRole('button', { name: /add expense/i }))

  expect(screen.getByText('Groceries')).toBeInTheDocument()
  expect(screen.getAllByText('₹1500.00').length).toBeGreaterThan(0)
  expect(screen.getByText(/1 visible/i)).toBeInTheDocument()
})

test('supports editing and deleting expenses', () => {
  render(<App />)

  fireEvent.change(screen.getByLabelText(/expense title/i), {
    target: { value: 'Train Pass' },
  })
  fireEvent.change(screen.getByLabelText(/amount/i), {
    target: { value: '300' },
  })
  fireEvent.change(screen.getByLabelText(/category/i), {
    target: { value: 'Travel' },
  })
  fireEvent.click(screen.getByRole('button', { name: /add expense/i }))

  expect(screen.getByText('Train Pass')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /edit/i }))
  fireEvent.change(screen.getByLabelText(/expense title/i), {
    target: { value: 'Metro Pass' },
  })
  fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

  expect(screen.getByText('Metro Pass')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /delete/i }))
  fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }))

  expect(screen.queryByText('Metro Pass')).not.toBeInTheDocument()
})

test('filters expenses and keeps visible total in sync', () => {
  render(<App />)

  fireEvent.change(screen.getByLabelText(/expense title/i), {
    target: { value: 'Lunch' },
  })
  fireEvent.change(screen.getByLabelText(/amount/i), {
    target: { value: '150' },
  })
  fireEvent.click(screen.getByRole('button', { name: /add expense/i }))

  fireEvent.change(screen.getByLabelText(/expense title/i), {
    target: { value: 'Taxi' },
  })
  fireEvent.change(screen.getByLabelText(/amount/i), {
    target: { value: '200' },
  })
  fireEvent.change(screen.getByLabelText(/category/i), {
    target: { value: 'Travel' },
  })
  fireEvent.click(screen.getByRole('button', { name: /add expense/i }))

  fireEvent.click(screen.getByRole('button', { name: /^travel$/i }))

  expect(screen.getByText('Taxi')).toBeInTheDocument()
  expect(screen.queryByText('Lunch')).not.toBeInTheDocument()
  expect(screen.getAllByText('₹200.00').length).toBeGreaterThan(0)
})

test('loads persisted expenses from localStorage', () => {
  const saved = [
    {
      id: 'saved-1',
      title: 'Movie Tickets',
      amount: 450,
      category: 'Other',
      date: '2024-03-12T12:00:00.000Z',
    },
    {
      id: 'saved-2',
      title: 'Rent',
      amount: 1200,
      category: 'Bills',
      date: '2024-03-18T12:00:00.000Z',
    },
  ]

  window.localStorage.setItem('expense-tracker-expenses-v1', JSON.stringify(saved))

  render(<App />)

  expect(screen.getByText('Movie Tickets')).toBeInTheDocument()
  expect(screen.getByText('Rent')).toBeInTheDocument()
  expect(screen.getAllByText('₹1650.00').length).toBeGreaterThan(0)
})
