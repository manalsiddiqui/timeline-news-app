const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
require('dotenv').config();

const newsRoutes = require('./routes/news');
const NewsService = require('./services/newsService');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/news', newsRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe-subject', (subject) => {
    socket.join(`subject-${subject}`);
    console.log(`Client ${socket.id} subscribed to subject: ${subject}`);
  });
  
  socket.on('unsubscribe-subject', (subject) => {
    socket.leave(`subject-${subject}`);
    console.log(`Client ${socket.id} unsubscribed from subject: ${subject}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize news service with socket instance
const newsService = new NewsService(io);

// Make news service available to routes
app.locals.newsService = newsService;

// Schedule news updates every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('Running scheduled news update...');
  await newsService.checkForNewNews();
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}); 