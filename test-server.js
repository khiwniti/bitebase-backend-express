const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth-mock');

const app = express();

// Enable CORS for all origins (testing only)
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Mount auth routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server running' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log('📌 Auth endpoints available at /api/auth/*');
  console.log('✅ CORS enabled for all origins');
});