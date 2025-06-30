const axios = require('axios');

class NewsService {
  constructor(io) {
    this.io = io;
    this.trackedSubjects = new Set();
    this.newsCache = new Map(); // subject -> timeline of articles
    this.lastChecked = new Map(); // subject -> last check timestamp
  }

  // Add a subject to track
  addSubject(subject) {
    this.trackedSubjects.add(subject.toLowerCase());
    if (!this.newsCache.has(subject.toLowerCase())) {
      this.newsCache.set(subject.toLowerCase(), []);
      this.lastChecked.set(subject.toLowerCase(), new Date());
    }
  }

  // Remove a subject from tracking
  removeSubject(subject) {
    this.trackedSubjects.delete(subject.toLowerCase());
    this.newsCache.delete(subject.toLowerCase());
    this.lastChecked.delete(subject.toLowerCase());
  }

  // Get timeline for a subject
  getTimeline(subject) {
    return this.newsCache.get(subject.toLowerCase()) || [];
  }

  // Build more accurate search query
  buildSearchQuery(subject) {
    // Clean and prepare the subject
    const cleanSubject = subject.trim().toLowerCase();
    
    // For multi-word subjects, use exact phrase matching
    if (cleanSubject.includes(' ')) {
      return `"${cleanSubject}"`;
    }
    
    // For single words, enhance with related terms
    const enhancements = {
      'tesla': 'tesla OR "elon musk tesla" OR "tesla motors"',
      'ai': '"artificial intelligence" OR "machine learning" OR AI OR "neural networks"',
      'palestine': 'palestine OR palestinian OR gaza OR "west bank"',
      'bitcoin': 'bitcoin OR BTC OR cryptocurrency OR "crypto currency"',
      'climate': '"climate change" OR "global warming" OR "climate crisis"',
      'covid': 'covid OR coronavirus OR "covid-19" OR pandemic',
      'ukraine': 'ukraine OR ukrainian OR kyiv OR kiev',
      'apple': 'apple AND (iphone OR ipad OR mac OR "tim cook" OR cupertino) NOT fruit',
      'google': 'google OR alphabet OR "search engine" NOT "google maps directions"',
      'meta': 'meta OR facebook OR instagram OR "mark zuckerberg" NOT "meta description"'
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

      const searchQuery = this.buildSearchQuery(subject);
      const fromParam = from ? `&from=${from.toISOString()}` : '';
      
      // Enhanced query with better parameters
      const url = `https://newsapi.org/v2/everything?` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `searchIn=title,description&` +
        `sortBy=publishedAt&` +
        `pageSize=25&` +
        `language=en&` +
        `excludeDomains=reddit.com,twitter.com,facebook.com,instagram.com,tiktok.com&` +
        `${fromParam}&` +
        `apiKey=${apiKey}`;
      
      console.log(`Search query for "${subject}": ${searchQuery}`);
      
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