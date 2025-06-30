# Timeline News App

A beautiful, Apple-inspired news tracking application that provides real-time alerts and timeline-based news updates for any subject you want to follow.

## ✨ Features

- **Clean, Apple-inspired Design**: Modern UI with smooth animations and elegant typography
- **Real-time News Alerts**: Get instant notifications when new articles are published about your tracked subjects
- **Timeline View**: See the complete chronological story of any subject - never miss context again
- **Subject Tracking**: Add any topic, person, or event you want to monitor
- **Live Updates**: Real-time updates via WebSockets - no need to refresh the page
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd newsapp
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Set up NewsAPI:
   - Get a free API key from [NewsAPI.org](https://newsapi.org/)
   - Create a `.env` file in the root directory:
   ```
   PORT=5000
   NEWS_API_KEY=your_api_key_here
   ```
   - If you don't provide an API key, the app will use mock data for demonstration

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and go to `http://localhost:3001`

## 📱 How to Use

### Adding a Subject to Track

1. Click the "Track Subject" button in the header
2. Enter any topic, person, or event (e.g., "Climate Change", "AI Technology", "Election 2024")
3. Click "Start Tracking"
4. You'll see a card appear for your subject with real-time statistics

### Viewing Timeline

1. Click on any subject card to view its timeline
2. Articles are displayed chronologically with the newest first
3. Recent articles (within 1 hour) have a pulsing red indicator
4. Click article titles to read the full story on the original site

### Real-time Alerts

- When new articles are found for your tracked subjects, you'll get a notification
- The timeline automatically updates if you're currently viewing that subject
- Subject cards show updated article counts in real-time

### Managing Subjects

- Click the "×" button on any subject card to stop tracking it
- Use the "Close" button to hide the timeline view
- Press "Escape" key to close modals or timeline

## 🛠 Technical Details

### Architecture

- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.IO
- **News Data**: NewsAPI.org (with mock data fallback)
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Styling**: CSS Grid, Flexbox, and CSS Custom Properties
- **Scheduled Updates**: Node-cron for automatic news checking every 15 minutes

### Key Files

- `server/index.js` - Main server and Socket.IO setup
- `server/services/newsService.js` - News fetching and timeline management
- `server/routes/news.js` - API endpoints for subject management
- `public/index.html` - Main HTML structure
- `public/styles.css` - Apple-inspired styling
- `public/app.js` - Frontend application logic

## 🎨 Design Philosophy

The app follows Apple's design principles:

- **Clarity**: Clean typography and generous white space
- **Deference**: Content-first approach with subtle UI elements
- **Depth**: Layered interface with smooth animations and transitions
- **Consistency**: Coherent visual design throughout the app

## 🔧 Customization

### Changing Update Frequency

Edit the cron schedule in `server/index.js`:
```javascript
// Check every 5 minutes instead of 15
cron.schedule('*/5 * * * *', async () => {
  await newsService.checkForNewNews();
});
```

### Adding New News Sources

Extend the `NewsService` class in `server/services/newsService.js` to support additional news APIs.

### Styling Modifications

All styles are in `public/styles.css` using CSS custom properties for easy theming:
```css
:root {
  --primary-color: #007AFF; /* Change primary color */
  --background-color: #FFFFFF; /* Change background */
  /* ... other variables */
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [NewsAPI.org](https://newsapi.org/) - News data provider
- [Socket.IO](https://socket.io/) - Real-time communication
- [Inter Font](https://fonts.google.com/specimen/Inter) - Typography

---

Built with ❤️ for staying informed in our fast-paced world. 