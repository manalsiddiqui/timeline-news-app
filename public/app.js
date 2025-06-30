class NewsApp {
    constructor() {
        this.socket = null;
        this.subjects = [];
        this.currentTimeline = null;
        this.init();
    }

    init() {
        this.initSocket();
        this.bindEvents();
        this.loadSubjects();
    }

    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('news-alert', (data) => {
            this.showNotification(`📰 ${data.message}`, 'success');
            
            // Update timeline if it's currently displayed for this subject
            if (this.currentTimeline === data.subject) {
                this.loadTimeline(data.subject);
            }
            
            // Update subject card with new count
            this.updateSubjectCard(data.subject);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }

    bindEvents() {
        // Modal controls
        document.getElementById('addSubjectBtn').addEventListener('click', () => {
            this.showModal();
        });

        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay') {
                this.hideModal();
            }
        });

        // Form submission
        document.getElementById('addSubjectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSubject();
        });

        // Timeline controls
        document.getElementById('closeTimelineBtn').addEventListener('click', () => {
            this.hideTimeline();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
                this.hideTimeline();
            }
        });
    }

    async loadSubjects() {
        try {
            const response = await fetch('/api/news/subjects');
            const data = await response.json();
            this.subjects = data.subjects;
            this.renderSubjects();
            this.updateSubjectsCount();
        } catch (error) {
            console.error('Error loading subjects:', error);
            this.showNotification('Failed to load subjects', 'error');
        }
    }

    async addSubject() {
        const input = document.getElementById('subjectInput');
        const subject = input.value.trim();

        if (!subject) return;

        try {
            const response = await fetch('/api/news/subjects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subject })
            });

            const data = await response.json();

            if (response.ok) {
                this.subjects.push(data.subject);
                this.renderSubjects();
                this.updateSubjectsCount();
                this.hideModal();
                input.value = '';
                
                // Subscribe to real-time updates for this subject
                this.socket.emit('subscribe-subject', data.subject);
                
                this.showNotification(`Started tracking "${subject}"`, 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error adding subject:', error);
            this.showNotification('Failed to add subject', 'error');
        }
    }

    async removeSubject(subject) {
        try {
            const response = await fetch(`/api/news/subjects/${subject}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.subjects = this.subjects.filter(s => s !== subject);
                this.renderSubjects();
                this.updateSubjectsCount();
                
                // Unsubscribe from real-time updates
                this.socket.emit('unsubscribe-subject', subject);
                
                // Hide timeline if it's currently showing this subject
                if (this.currentTimeline === subject) {
                    this.hideTimeline();
                }
                
                this.showNotification(`Stopped tracking "${subject}"`, 'success');
            } else {
                throw new Error('Failed to remove subject');
            }
        } catch (error) {
            console.error('Error removing subject:', error);
            this.showNotification('Failed to remove subject', 'error');
        }
    }

    async loadTimeline(subject) {
        try {
            const response = await fetch(`/api/news/timeline/${subject}`);
            const data = await response.json();
            
            this.currentTimeline = subject;
            this.renderTimeline(data.timeline, subject);
            this.showTimeline();
        } catch (error) {
            console.error('Error loading timeline:', error);
            this.showNotification('Failed to load timeline', 'error');
        }
    }

    renderSubjects() {
        const grid = document.getElementById('subjectsGrid');
        const emptyState = document.getElementById('emptyState');

        if (this.subjects.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        const subjectsHTML = this.subjects.map(subject => `
            <div class="subject-card" data-subject="${subject}">
                <div class="subject-card-header">
                    <h4 class="subject-title">${subject}</h4>
                    <button class="subject-remove" onclick="app.removeSubject('${subject}')" title="Stop tracking">×</button>
                </div>
                <div class="subject-stats" id="stats-${subject}">Loading stats...</div>
                <div class="subject-preview" id="preview-${subject}">Click to view timeline...</div>
            </div>
        `).join('');

        grid.innerHTML = emptyState.outerHTML + subjectsHTML;

        // Add click handlers and load stats
        this.subjects.forEach(subject => {
            const card = document.querySelector(`[data-subject="${subject}"]`);
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('subject-remove')) {
                    this.loadTimeline(subject);
                    this.socket.emit('subscribe-subject', subject);
                }
            });
            
            this.loadSubjectStats(subject);
        });
    }

    async loadSubjectStats(subject) {
        try {
            const response = await fetch(`/api/news/timeline/${subject}`);
            const data = await response.json();
            
            const statsElement = document.getElementById(`stats-${subject}`);
            const previewElement = document.getElementById(`preview-${subject}`);
            
            if (data.timeline && data.timeline.length > 0) {
                statsElement.textContent = `${data.timeline.length} articles`;
                previewElement.textContent = data.timeline[0].title;
            } else {
                statsElement.textContent = 'No articles yet';
                previewElement.textContent = 'Waiting for news updates...';
            }
        } catch (error) {
            console.error('Error loading subject stats:', error);
        }
    }

    updateSubjectCard(subject) {
        // Reload stats for the specific subject
        this.loadSubjectStats(subject);
    }

    renderTimeline(articles, subject) {
        const timeline = document.getElementById('timeline');
        const title = document.getElementById('timelineTitle');
        
        title.textContent = `${subject.charAt(0).toUpperCase() + subject.slice(1)} Timeline`;

        if (!articles || articles.length === 0) {
            timeline.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📰</div>
                    <h4>No articles yet</h4>
                    <p>We're monitoring for news about "${subject}"</p>
                </div>
            `;
            return;
        }

        const timelineHTML = articles.map((article, index) => {
            const isRecent = new Date() - new Date(article.publishedAt) < 1000 * 60 * 60; // 1 hour
            const timeAgo = this.formatTimeAgo(new Date(article.publishedAt));
            
            return `
                <div class="timeline-item ${isRecent ? 'breaking' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div class="article-header">
                            <div class="article-title">
                                <a href="${article.url}" target="_blank" rel="noopener noreferrer">
                                    ${article.title}
                                </a>
                            </div>
                        </div>
                        <div class="article-meta">
                            <span class="article-source">${article.source}</span>
                            <span class="article-time">${timeAgo}</span>
                        </div>
                        ${article.description ? `<div class="article-description">${article.description}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        timeline.innerHTML = timelineHTML;
    }

    showModal() {
        document.getElementById('modalOverlay').style.display = 'flex';
        document.getElementById('subjectInput').focus();
    }

    hideModal() {
        document.getElementById('modalOverlay').style.display = 'none';
        document.getElementById('subjectInput').value = '';
    }

    showTimeline() {
        document.getElementById('timelineSection').style.display = 'block';
        document.getElementById('timelineSection').scrollIntoView({ 
            behavior: 'smooth' 
        });
    }

    hideTimeline() {
        document.getElementById('timelineSection').style.display = 'none';
        this.currentTimeline = null;
    }

    updateSubjectsCount() {
        const count = this.subjects.length;
        document.getElementById('subjectsCount').textContent = 
            `${count} subject${count !== 1 ? 's' : ''}`;
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        notificationText.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, 4000);
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NewsApp();
}); 