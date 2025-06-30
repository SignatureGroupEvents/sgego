const request = require('supertest')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// Mock mongoose before requiring the app
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(true),
  connection: {
    readyState: 1,
    close: jest.fn().mockResolvedValue(true)
  },
  Schema: jest.fn(),
  model: jest.fn()
}))

// Mock the User model
const mockUser = {
  _id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashedpassword',
  role: 'staff'
}

const User = {
  create: jest.fn(),
  findOne: jest.fn(),
  deleteMany: jest.fn().mockResolvedValue(true)
}

jest.mock('../../models/User', () => User)

// Now require the app after mocking
const app = require('../../server')

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'newpassword123',
        role: 'staff'
      }

      User.create.mockResolvedValue({
        ...mockUser,
        ...userData,
        _id: 'new-user-123'
      })

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body).toHaveProperty('token')
      expect(response.body.user).toHaveProperty('username', 'newuser')
      expect(response.body.user).toHaveProperty('email', 'newuser@example.com')
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('should return error for duplicate username', async () => {
      const userData = {
        username: 'testuser',
        email: 'another@example.com',
        password: 'password123',
        role: 'staff'
      }

      User.create.mockRejectedValue(new Error('Username already exists'))

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })

    it('should return error for invalid email format', async () => {
      const userData = {
        username: 'invaliduser',
        email: 'invalid-email',
        password: 'password123',
        role: 'staff'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login user with correct credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'testpassword123'
      }

      const hashedPassword = await bcrypt.hash('testpassword123', 10)
      User.findOne.mockResolvedValue({
        ...mockUser,
        password: hashedPassword
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body.user).toHaveProperty('username', 'testuser')
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('should return error for incorrect password', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword'
      }

      const hashedPassword = await bcrypt.hash('correctpassword', 10)
      User.findOne.mockResolvedValue({
        ...mockUser,
        password: hashedPassword
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('Invalid credentials')
    })

    it('should return error for non-existent user', async () => {
      const loginData = {
        username: 'nonexistentuser',
        password: 'password123'
      }

      User.findOne.mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('Invalid credentials')
    })
  })

  describe('GET /api/auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const token = jwt.sign({ id: mockUser._id }, process.env.JWT_SECRET)

      User.findOne.mockResolvedValue(mockUser)

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('username', 'testuser')
      expect(response.body).toHaveProperty('email', 'test@example.com')
      expect(response.body).not.toHaveProperty('password')
    })

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('No token provided')
    })

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('Invalid token')
    })
  })
}) 