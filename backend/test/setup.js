// Set test environment
process.env.NODE_ENV = 'test'
process.env.MONGODB_URI = 'mongodb://localhost:27017/sevent-test'
process.env.JWT_SECRET = 'test-secret-key'
process.env.JWT_EXPIRE = '1h'
process.env.PORT = 3002

// Increase timeout for tests
jest.setTimeout(10000) 