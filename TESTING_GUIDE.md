# 🧪 Testing Guide

This guide explains how to run tests for the Event Check-in Management System.

## 📋 Overview

The project uses different testing frameworks for frontend and backend:

- **Frontend**: Vitest + React Testing Library
- **Backend**: Jest + Supertest

## 🚀 Running Tests

### Frontend Tests

Navigate to the frontend directory and run:

```bash
cd frontend

# Run tests in watch mode (recommended for development)
npm test

# Run tests once
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Run tests with UI (if @vitest/ui is installed)
npm run test:ui
```

### Backend Tests

Navigate to the backend directory and run:

```bash
cd backend

# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## 🧩 Test Structure

### Frontend Tests

```
frontend/
├── src/
│   ├── components/
│   │   └── Guest/
│   │       ├── GuestCheckIn.jsx
│   │       └── __tests__/
│   │           └── GuestCheckIn.test.jsx
│   └── test/
│       └── setup.js
├── vitest.config.js
└── package.json
```

### Backend Tests

```
backend/
├── routes/
│   └── __tests__/
│       └── auth.test.js
├── test/
│   └── setup.js
├── jest.config.js
└── package.json
```

## 📝 What We Test

### Frontend Tests

1. **Component Rendering**
   - Components render correctly with props
   - Conditional rendering works as expected
   - Error states display properly

2. **User Interactions**
   - Button clicks trigger correct functions
   - Form inputs update state correctly
   - Event handlers work as expected

3. **API Integration**
   - API calls are made with correct parameters
   - Success and error responses are handled
   - Loading states are managed properly

4. **Navigation**
   - Routes work correctly
   - Breadcrumbs display properly
   - Navigation between pages works

### Backend Tests

1. **API Endpoints**
   - Routes return correct HTTP status codes
   - Response data matches expected format
   - Error handling works properly

2. **Authentication**
   - User registration works
   - Login with valid/invalid credentials
   - JWT token validation
   - Protected routes require authentication

3. **Database Operations**
   - CRUD operations work correctly
   - Data validation prevents invalid data
   - Relationships between models work

4. **Business Logic**
   - Check-in logic works correctly
   - Inventory management functions properly
   - Event management operations work

## 🛠️ Writing New Tests

### Frontend Test Example

```javascript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('handles user interaction', () => {
    const handleClick = vi.fn()
    render(<MyComponent onClick={handleClick} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })
})
```

### Backend Test Example

```javascript
const request = require('supertest')
const app = require('../../server')

describe('My API Route', () => {
  it('returns correct response', async () => {
    const response = await request(app)
      .get('/api/my-route')
      .expect(200)

    expect(response.body).toHaveProperty('data')
  })
})
```

## 🔧 Test Configuration

### Frontend (Vitest)

- **Environment**: jsdom (simulates browser environment)
- **Setup**: `src/test/setup.js` (configures testing utilities)
- **Coverage**: Built-in coverage reporting
- **Watch Mode**: Automatically re-runs tests on file changes

### Backend (Jest)

- **Environment**: Node.js
- **Setup**: `test/setup.js` (configures test environment variables)
- **Database**: Uses separate test database
- **Coverage**: Generates HTML and text coverage reports

## 🎯 Best Practices

1. **Test Organization**
   - Group related tests using `describe` blocks
   - Use descriptive test names
   - Keep tests focused and isolated

2. **Mocking**
   - Mock external dependencies (APIs, databases)
   - Use realistic mock data
   - Test both success and failure scenarios

3. **Coverage**
   - Aim for high test coverage (80%+)
   - Focus on critical business logic
   - Test edge cases and error conditions

4. **Maintenance**
   - Update tests when code changes
   - Keep tests fast and reliable
   - Use meaningful assertions

## 🚨 Common Issues

### Frontend
- **Module not found**: Check import paths and file extensions
- **Component not rendering**: Ensure all required props are provided
- **Async test failures**: Use `waitFor` for asynchronous operations

### Backend
- **Database connection**: Ensure test database is running
- **Environment variables**: Check test setup file
- **Port conflicts**: Use different ports for test environment

## 📊 Coverage Reports

After running tests with coverage, you can view detailed reports:

- **Frontend**: Coverage report in terminal and `coverage/` directory
- **Backend**: Coverage report in terminal and `coverage/` directory

## 🔄 Continuous Integration

Tests should be run automatically in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Frontend Tests
  run: cd frontend && npm run test:run

- name: Run Backend Tests
  run: cd backend && npm test
```

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest) 