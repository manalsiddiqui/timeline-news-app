const express = require('express');
const NewsService = require('../services/newsService');

const router = express.Router();

// Global news service instance (will be initialized in main server)
let newsService;

// Initialize news service (called from main server)
router.use((req, res, next) => {
  if (!newsService && req.app.locals.newsService) {
    newsService = req.app.locals.newsService;
  }
  next();
});

// Get all tracked subjects
router.get('/subjects', (req, res) => {
  try {
    const subjects = newsService ? newsService.getTrackedSubjects() : [];
    res.json({ subjects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new subject to track
router.post('/subjects', async (req, res) => {
  try {
    const { subject } = req.body;
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    if (!newsService) {
      return res.status(500).json({ error: 'News service not initialized' });
    }

    newsService.addSubject(subject);
    
    // Get initial news for the subject
    const timeline = await newsService.getInitialNews(subject);
    
    res.json({ 
      message: `Started tracking ${subject}`,
      subject: subject.toLowerCase(),
      timeline 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove a subject from tracking
router.delete('/subjects/:subject', (req, res) => {
  try {
    const { subject } = req.params;
    
    if (!newsService) {
      return res.status(500).json({ error: 'News service not initialized' });
    }

    newsService.removeSubject(subject);
    res.json({ message: `Stopped tracking ${subject}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get timeline for a specific subject
router.get('/timeline/:subject', (req, res) => {
  try {
    const { subject } = req.params;
    
    if (!newsService) {
      return res.status(500).json({ error: 'News service not initialized' });
    }

    const timeline = newsService.getTimeline(subject);
    res.json({ subject, timeline });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger news update for a subject
router.post('/update/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    
    if (!newsService) {
      return res.status(500).json({ error: 'News service not initialized' });
    }

    const timeline = await newsService.getInitialNews(subject);
    res.json({ 
      message: `Updated news for ${subject}`,
      timeline 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get news summary/stats
router.get('/stats', (req, res) => {
  try {
    if (!newsService) {
      return res.status(500).json({ error: 'News service not initialized' });
    }

    const subjects = newsService.getTrackedSubjects();
    const stats = subjects.map(subject => ({
      subject,
      articleCount: newsService.getTimeline(subject).length
    }));

    res.json({ 
      totalSubjects: subjects.length,
      subjects: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 