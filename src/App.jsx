import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'expense-tracker-expenses-v1'
const BUDGET_KEY = 'expense-tracker-budget-v1'
const THEME_KEY = 'expense-tracker-theme-v1'
const CATEGORIES = ['Food', 'Travel', 'Bills', 'Other']
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Date: newest first' },
  { value: 'date-asc', label: 'Date: oldest first' },
  { value: 'amount-desc', label: 'Amount: highest first' },
  { value: 'amount-asc', label: 'Amount: lowest first' },
  { value: 'title-asc', label: 'Title: A–Z' },
  { value: 'title-desc', label: 'Title: Z–A' },
]

const emptyForm = { title: '', amount: '', category: 'Food' }

function loadExpenses() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return []
    }

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item) => {
      if (!item || typeof item !== 'object') {
        return false
      }

      return (
        typeof item.title === 'string' &&
        typeof item.category === 'string' &&
        typeof item.date === 'string' &&
        !Number.isNaN(Number(item.amount))
      )
    })
  } catch {
    return []
  }
}

function loadBudget() {
  if (typeof window === 'undefined') {
    return 0
  }

  try {
    const saved = localStorage.getItem(BUDGET_KEY)
    if (!saved) {
      return 0
    }

    const parsed = JSON.parse(saved)
    return Number.isFinite(Number(parsed)) ? Number(parsed) : 0
  } catch {
    return 0
  }
}

function loadTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (!saved) {
      return 'light'
    }

    return saved === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function prettyMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function safeSortValue(value) {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

function escapeCsv(value) {
  const content = String(value ?? '')
  if (/[",\n\r]/.test(content)) {
    return `"${content.replace(/"/g, '""')}"`
  }
  return content
}

function App() {
  const [expenses, setExpenses] = useState(loadExpenses)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [editId, setEditId] = useState(null)
  const [filterCategory, setFilterCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [budget, setBudget] = useState(loadBudget)
  const [budgetInput, setBudgetInput] = useState(String(loadBudget()))
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [pendingClearAll, setPendingClearAll] = useState(false)
  const [theme, setTheme] = useState(loadTheme)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  }, [expenses])

  useEffect(() => {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budget))
  }, [budget])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, JSON.stringify(theme))
  }, [theme])

  const visibleExpenses = useMemo(() => {
    const trimmedSearch = searchTerm.trim().toLowerCase()

    const filtered = expenses.filter((expense) => {
      const matchesCategory =
        filterCategory === 'All' || expense.category === filterCategory
      const matchesSearch =
        trimmedSearch.length === 0 ||
        expense.title.toLowerCase().includes(trimmedSearch)

      return matchesCategory && matchesSearch
    })

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.date) - new Date(b.date)
        case 'amount-desc':
          return Number(b.amount) - Number(a.amount)
        case 'amount-asc':
          return Number(a.amount) - Number(b.amount)
        case 'title-asc':
          return safeSortValue(a.title).localeCompare(safeSortValue(b.title))
        case 'title-desc':
          return safeSortValue(b.title).localeCompare(safeSortValue(a.title))
        case 'date-desc':
        default:
          return new Date(b.date) - new Date(a.date)
      }
    })
  }, [expenses, filterCategory, searchTerm, sortBy])

  const visibleTotal = useMemo(
    () => visibleExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [visibleExpenses],
  )

  const monthlyExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const date = new Date(expense.date)
        return (
          date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
        )
      }),
    [expenses, selectedMonth, selectedYear],
  )

  const monthlyTotal = useMemo(
    () => monthlyExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [monthlyExpenses],
  )

  const statistics = useMemo(() => {
    const totalSpending = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
    const highest = expenses.length
      ? Math.max(...expenses.map((expense) => Number(expense.amount)))
      : 0
    const lowest = expenses.length
      ? Math.min(...expenses.map((expense) => Number(expense.amount)))
      : 0
    const average = expenses.length ? totalSpending / expenses.length : 0

    const categoryTotals = CATEGORIES.reduce((accumulator, category) => {
      accumulator[category] = expenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + Number(expense.amount), 0)
      return accumulator
    }, {})

    return {
      totalSpending,
      highest,
      lowest,
      average,
      categoryTotals,
    }
  }, [expenses])

  const remainingBudget = budget - monthlyTotal
  const budgetWarning = budget > 0 && monthlyTotal >= budget

  const validateExpense = (data) => {
    const trimmedTitle = data.title.trim()
    const numericAmount = Number(data.amount)
    const nextErrors = {}

    if (!trimmedTitle) {
      nextErrors.title = 'Title is required.'
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      nextErrors.amount = 'Amount must be a number greater than zero.'
    } else if (numericAmount > 100000) {
      nextErrors.amount = 'Amount cannot exceed ₹1,00,000.'
    }

    return nextErrors
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditId(null)
    setErrors({})
  }

  const handleAddExpense = (event) => {
    event.preventDefault()

    const nextErrors = validateExpense(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const newExpense = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `expense-${Date.now()}`,
      title: form.title.trim(),
      amount: Number(form.amount),
      category: form.category,
      date: new Date().toISOString(),
    }

    setExpenses((current) => [newExpense, ...current])
    setForm(emptyForm)
    setErrors({})
  }

  const handleEditStart = (expense) => {
    setEditId(expense.id)
    setForm({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
    })
    setErrors({})
  }

  const handleEditSave = (event) => {
    event.preventDefault()

    const nextErrors = validateExpense(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setExpenses((current) =>
      current.map((expense) =>
        expense.id === editId
          ? {
              ...expense,
              title: form.title.trim(),
              amount: Number(form.amount),
              category: form.category,
            }
          : expense,
      ),
    )

    resetForm()
  }

  const handleDelete = () => {
    if (!deleteTargetId) {
      return
    }

    setExpenses((current) => current.filter((expense) => expense.id !== deleteTargetId))
    setDeleteTargetId(null)
  }

  const handleClearAll = () => {
    setExpenses([])
    setPendingClearAll(false)
  }

  const handleBudgetSave = () => {
    const amount = Number(budgetInput)
    if (!Number.isFinite(amount) || amount <= 0) {
      setBudgetInput('')
      return
    }

    setBudget(amount)
  }

  const handleExportCsv = () => {
    const rows = visibleExpenses.length > 0 ? visibleExpenses : []
    const header = ['Expense ID', 'Title', 'Amount', 'Category', 'Date']
    const csvRows = [header, ...rows.map((expense) => [
      expense.id,
      expense.title,
      prettyMoney(expense.amount).replace('₹', ''),
      expense.category,
      formatDate(expense.date),
    ])]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
      .join('\n')

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'expenses.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const yearOptions = Array.from({ length: 7 }, (_, index) => new Date().getFullYear() - 3 + index)

  return (
    <div className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Expense Tracker</p>
          <h1>Manage your spending</h1>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button type="button" className="danger-button" onClick={() => setPendingClearAll(true)}>
            Clear All
          </button>
        </div>
      </header>

      <main className="tracker-grid">
        <section className="panel form-panel" aria-label="Expense form">
          <h2>{editId ? 'Edit Expense' : 'Add Expense'}</h2>
          <form className="expense-form">
            <div className="field-group">
              <label htmlFor="expense-title">Expense Title</label>
              <input
                id="expense-title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleFormChange}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'title-error' : undefined}
                placeholder="e.g. Groceries"
              />
              {errors.title ? <p id="title-error" className="error-text">{errors.title}</p> : null}
            </div>

            <div className="field-group">
              <label htmlFor="expense-amount">Amount</label>
              <input
                id="expense-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={handleFormChange}
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? 'amount-error' : undefined}
                placeholder="₹0.00"
              />
              {errors.amount ? <p id="amount-error" className="error-text">{errors.amount}</p> : null}
            </div>

            <div className="field-group">
              <label htmlFor="expense-category">Category</label>
              <select
                id="expense-category"
                name="category"
                value={form.category}
                onChange={handleFormChange}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              {editId ? (
                <>
                  <button type="button" className="primary-button" onClick={handleEditSave}>Save</button>
                  <button type="button" className="secondary-button" onClick={resetForm}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" className="primary-button" onClick={handleAddExpense}>
                  Add Expense
                </button>
              )}
            </div>
          </form>
        </section>

        <aside className="panel sidebar-panel" aria-label="Expense tools">
          <div className="sidebar-section">
            <h2>Filters</h2>
            <div className="pill-row">
              {['All', ...CATEGORIES].map((category) => (
                <button
                  key={category}
                  type="button"
                  className={filterCategory === category ? 'pill active' : 'pill'}
                  onClick={() => setFilterCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <label htmlFor="search-expenses">Search</label>
            <input
              id="search-expenses"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title"
            />
          </div>

          <div className="sidebar-section">
            <label htmlFor="sort-expenses">Sort</label>
            <select id="sort-expenses" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sidebar-section budget-box">
            <h2>Budget</h2>
            <div className="budget-input-row">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={budgetInput}
                onChange={(event) => setBudgetInput(event.target.value)}
                placeholder="Monthly budget"
              />
              <button type="button" className="secondary-button" onClick={handleBudgetSave}>
                Set
              </button>
            </div>
            <p className="budget-summary">
              Budget: <strong>{prettyMoney(budget)}</strong>
            </p>
            <p className={`budget-summary ${budgetWarning ? 'warning' : ''}`}>
              Remaining: <strong>{prettyMoney(remainingBudget)}</strong>
            </p>
            <p className="budget-summary">
              Spent: <strong>{prettyMoney(monthlyTotal)}</strong>
            </p>
          </div>

          <div className="sidebar-section period-box">
            <h2>Monthly Summary</h2>
            <div className="month-controls">
              <select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>
                {MONTH_NAMES.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>
              <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <p className="summary-stat">
              {MONTH_NAMES[selectedMonth]} {selectedYear}: {prettyMoney(monthlyTotal)}
            </p>
            <p className="summary-stat">
              {monthlyExpenses.length} expense{monthlyExpenses.length === 1 ? '' : 's'} recorded
            </p>
          </div>
        </aside>

        <section className="panel table-panel" aria-label="Expense entries">
          <div className="table-header">
            <div>
              <h2>Expenses</h2>
              <p>Visible total: <strong>{prettyMoney(visibleTotal)}</strong></p>
            </div>
            <div className="totals-inline">
              <span>{visibleExpenses.length} visible</span>
              <button type="button" className="secondary-button" onClick={handleExportCsv}>
                Export CSV
              </button>
            </div>
          </div>

          {visibleExpenses.length === 0 ? (
            <div className="empty-state" role="status">
              No matching expenses found.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Expense ID</th>
                    <th>Title</th>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.id.slice(0, 8)}</td>
                      <td>{expense.title}</td>
                      <td>{prettyMoney(expense.amount)}</td>
                      <td>{expense.category}</td>
                      <td>{formatDate(expense.date)}</td>
                      <td className="action-cell">
                        <button type="button" className="secondary-button" onClick={() => handleEditStart(expense)}>
                          Edit
                        </button>
                        <button type="button" className="danger-button" onClick={() => setDeleteTargetId(expense.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel stats-panel" aria-label="Expense statistics">
          <h2>Expense Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <span>Total expenses</span>
              <strong>{expenses.length}</strong>
            </div>
            <div className="stat-card">
              <span>Total spending</span>
              <strong>{prettyMoney(statistics.totalSpending)}</strong>
            </div>
            <div className="stat-card">
              <span>Highest expense</span>
              <strong>{prettyMoney(statistics.highest)}</strong>
            </div>
            <div className="stat-card">
              <span>Lowest expense</span>
              <strong>{prettyMoney(statistics.lowest)}</strong>
            </div>
            <div className="stat-card">
              <span>Average expense</span>
              <strong>{prettyMoney(statistics.average)}</strong>
            </div>
          </div>

          <div className="category-breakdown">
            <h3>Spending by category</h3>
            {CATEGORIES.map((category) => (
              <div key={category} className="category-row">
                <span>{category}</span>
                <strong>{prettyMoney(statistics.categoryTotals[category] || 0)}</strong>
              </div>
            ))}
          </div>
        </section>
      </main>

      {deleteTargetId ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Delete confirmation">
          <div className="modal-card">
            <h3>Delete expense?</h3>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" className="danger-button" onClick={handleDelete}>
                Confirm
              </button>
              <button type="button" className="secondary-button" onClick={() => setDeleteTargetId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingClearAll ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Clear all confirmation">
          <div className="modal-card">
            <h3>Clear all expenses?</h3>
            <p>This will permanently remove every expense.</p>
            <div className="modal-actions">
              <button type="button" className="danger-button" onClick={handleClearAll}>
                Confirm
              </button>
              <button type="button" className="secondary-button" onClick={() => setPendingClearAll(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
