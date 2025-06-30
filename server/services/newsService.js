const axios = require('axios');

class NewsService {
  constructor(io) {
    this.io = io;
    this.trackedSubjects = new Set();
    this.newsCache = new Map(); // subject -> timeline of articles
    this.lastChecked = new Map(); // subject -> last check timestamp
    this.customQueries = new Map(); // subject -> custom search query
  }

  // Add a subject to track
  addSubject(subject, customQuery = null) {
    const key = subject.toLowerCase();
    this.trackedSubjects.add(key);
    if (!this.newsCache.has(key)) {
      this.newsCache.set(key, []);
      this.lastChecked.set(key, new Date());
      
      // Store custom query if provided
      if (customQuery) {
        if (!this.customQueries) this.customQueries = new Map();
        this.customQueries.set(key, customQuery);
      }
    }
  }

  // Remove a subject from tracking
  removeSubject(subject) {
    const key = subject.toLowerCase();
    this.trackedSubjects.delete(key);
    this.newsCache.delete(key);
    this.lastChecked.delete(key);
    if (this.customQueries) {
      this.customQueries.delete(key);
    }
  }

  // Update custom search query for a subject
  updateCustomQuery(subject, customQuery) {
    const key = subject.toLowerCase();
    if (this.trackedSubjects.has(key)) {
      if (!this.customQueries) this.customQueries = new Map();
      this.customQueries.set(key, customQuery);
      return true;
    }
    return false;
  }

  // Get custom query for a subject
  getCustomQuery(subject) {
    const key = subject.toLowerCase();
    return this.customQueries ? this.customQueries.get(key) : null;
  }

  // Get timeline for a subject
  getTimeline(subject) {
    return this.newsCache.get(subject.toLowerCase()) || [];
  }

  // Build more accurate search query
  buildSearchQuery(subject) {
    const key = subject.toLowerCase();
    
    // Check if user has a custom query first
    if (this.customQueries && this.customQueries.has(key)) {
      return this.customQueries.get(key);
    }
    
    // Clean and prepare the subject
    const cleanSubject = subject.trim().toLowerCase();
    
    // For multi-word subjects, use exact phrase matching
    if (cleanSubject.includes(' ')) {
      return `"${cleanSubject}"`;
    }
    
    // For single words, enhance with related terms (simplified for NewsAPI compatibility)
    const enhancements = {
      'tesla': 'tesla',
      'ai': 'artificial intelligence',
      'palestine': 'palestine',
      'bitcoin': 'bitcoin cryptocurrency',
      'climate': 'climate change',
      'covid': 'covid coronavirus',
      'ukraine': 'ukraine',
      'apple': 'apple iphone',
      'google': 'google',
      'meta': 'meta facebook',
      'liverpool': 'liverpool fc',
      'muslims': 'muslim islam'
    };
    
    return enhancements[cleanSubject] || `"${cleanSubject}"`;
  }

  // Fetch news from NewsAPI (you'll need an API key)
  async fetchNewsFromAPI(subject, from = null) {
    try {
      const apiKey = process.env.NEWS_API_KEY;
      if (!apiKey) {
        console.warn('NEWS_API_KEY not found, using mock data');
        return this.getMockNews(subject);
      }
      
      console.log(`API Key present: ${apiKey ? 'YES' : 'NO'} (length: ${apiKey ? apiKey.length : 0})`);

      const searchQuery = this.buildSearchQuery(subject);
      const fromParam = from ? `&from=${from.toISOString()}` : '';
      
      // Enhanced query with better parameters
      const url = `https://newsapi.org/v2/everything?` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `sortBy=publishedAt&` +
        `pageSize=25&` +
        `language=en` +
        `${fromParam ? '&' + fromParam : ''}` +
        `&apiKey=${apiKey}`;
      
      console.log(`Search query for "${subject}": ${searchQuery}`);
      console.log(`Full URL: ${url}`);
      
      const response = await axios.get(url);
      console.log(`NewsAPI returned ${response.data.articles.length} articles for "${subject}" (requested 25)`);
      console.log(`Total results available: ${response.data.totalResults}`);
      
      // Filter out articles with missing essential data
      const validArticles = response.data.articles.filter(article => 
        article.title && 
        article.title !== '[Removed]' && 
        article.description && 
        article.description !== '[Removed]' &&
        article.url &&
        article.publishedAt
      );
      
      console.log(`Valid articles after filtering: ${validArticles.length}`);
      
      return validArticles.map(article => ({
        id: article.url,
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.urlToImage,
        publishedAt: article.publishedAt,
        source: article.source.name,
        subject: subject.toLowerCase()
      }));
    } catch (error) {
      console.error('Error fetching news:', error.message);
      if (error.response) {
        console.error('NewsAPI error response:', error.response.status, error.response.data);
      }
      console.log('Falling back to mock data for:', subject);
      return this.getMockNews(subject);
    }
  }

  // Mock news data for development/demo
  getMockNews(subject) {
    const mockArticles = [
      {
        id: `mock-${subject}-${Date.now()}-1`,
        title: `Breaking: Major development in ${subject}`,
        description: `Latest updates on ${subject} situation with significant implications...`,
        url: `https://example.com/news/${subject}/1`,
        urlToImage: 'https://via.placeholder.com/400x200?text=News+Image',
        publishedAt: new Date().toISOString(),
        source: 'Mock News',
        subject: subject.toLowerCase()
      },
      {
        id: `mock-${subject}-${Date.now()}-2`,
        title: `Analysis: Understanding the ${subject} situation`,
        description: `Expert analysis provides insight into the ongoing ${subject} developments...`,
        url: `https://example.com/news/${subject}/2`,
        urlToImage: 'https://via.placeholder.com/400x200?text=Analysis',
        publishedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        source: 'Mock Analysis',
        subject: subject.toLowerCase()
      }
    ];
    return mockArticles;
  }

  // Check for new news on all tracked subjects
  async checkForNewNews() {
    for (const subject of this.trackedSubjects) {
      try {
        const lastCheck = this.lastChecked.get(subject);
        const newArticles = await this.fetchNewsFromAPI(subject, lastCheck);
        
        if (newArticles.length > 0) {
          // Add to timeline
          const timeline = this.newsCache.get(subject) || [];
          const updatedTimeline = [...newArticles, ...timeline]
            .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
            .slice(0, 100); // Keep only latest 100 articles
          
          this.newsCache.set(subject, updatedTimeline);
          this.lastChecked.set(subject, new Date());
          
          // Send real-time alert to subscribers
          this.io.to(`subject-${subject}`).emit('news-alert', {
            subject,
            count: newArticles.length,
            latest: newArticles[0],
            message: `${newArticles.length} new article${newArticles.length > 1 ? 's' : ''} about ${subject}`
          });
          
          console.log(`Found ${newArticles.length} new articles for ${subject}`);
        }
      } catch (error) {
        console.error(`Error checking news for ${subject}:`, error.message);
      }
    }
  }

  // Get initial news for a subject
  async getInitialNews(subject) {
    try {
      const articles = await this.fetchNewsFromAPI(subject);
      const timeline = articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      
      this.newsCache.set(subject.toLowerCase(), timeline);
      this.lastChecked.set(subject.toLowerCase(), new Date());
      
      return timeline;
    } catch (error) {
      console.error(`Error getting initial news for ${subject}:`, error.message);
      return [];
    }
  }

  // Get all tracked subjects
  getTrackedSubjects() {
    return Array.from(this.trackedSubjects);
  }
}

module.exports = NewsService; 