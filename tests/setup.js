// Test setup and global configurations
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/bitebase_test';

// Mock external dependencies
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock AI response' } }]
        })
      }
    }
  }))
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_mock123',
        email: 'test@example.com'
      })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_mock123',
          url: 'https://checkout.stripe.com/mock'
        })
      }
    },
    billingPortal: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          url: 'https://billing.stripe.com/mock'
        })
      }
    }
  }));
});

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    subscription_tier: 'basic'
  }),
  
  createMockAdmin: () => ({
    id: 'admin_123',
    email: 'admin@bitebase.com',
    name: 'Admin User',
    role: 'admin',
    subscription_tier: 'enterprise'
  })
};

// Cleanup after tests
afterEach(() => {
  jest.clearAllMocks();
});