const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced CORS configuration
app.use(cors({
  origin: [
    "http://localhost:12000",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://beta-bitebase-app.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.use(express.json());

// Simple health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "bitebase-simple-backend",
    version: "2.0.0",
    environment: "development"
  });
});

// AI status
app.get("/ai", (req, res) => {
  res.json({
    status: "operational",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    features: ["basic_api", "health_check"],
    message: "Simple backend for testing frontend-backend communication"
  });
});

// Simple restaurant search
app.get("/restaurants/search", (req, res) => {
  res.json({
    success: true,
    data: {
      restaurants: [
        {
          id: 1,
          name: "Test Restaurant 1",
          cuisine: "Thai",
          rating: 4.5,
          latitude: 13.7563,
          longitude: 100.5018
        },
        {
          id: 2,
          name: "Test Restaurant 2", 
          cuisine: "Italian",
          rating: 4.2,
          latitude: 13.7463,
          longitude: 100.4918
        }
      ],
      total: 2
    },
    message: "Test data from simple backend"
  });
});

// Catch all for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.listen(PORT, () => {
  console.log(`🚀 Simple BiteBase Backend running on port ${PORT}`);
  console.log(`🌐 Environment: development`);
  console.log(`🔗 Backend URL: http://localhost:${PORT}`);
  console.log(`🤖 Status: Ready for frontend testing`);
});

module.exports = app;