// YouTube Atom Feed Video Loader
class YouTubeVideoLoader {
    constructor() {
        this.videos = [];
        this.displayedVideos = 0;
        this.videosToShow = 6; // Initial load
        this.currentFilter = 'all'; // FIX: Initialize the default filter
    }

    async init() {
        try {
            await this.loadVideos();
            this.displayedVideos = this.videosToShow; 
            this.updateStats();
            this.renderVideos();
            this.setupFilters();
            this.setupLoadMore();
            document.getElementById('loading').style.display = 'none';
        } catch (error) {
            console.error('Failed to load YouTube videos:', error);
            this.showError();
        }
    }

    async loadVideos() {
        const response = await fetch('meowbah-videos.xml');
        if (!response.ok) {
            console.error('Error fetching XML:', response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        if (xmlDoc.querySelector('parsererror')) {
            console.error('XML parsing error:', xmlDoc.querySelector('parsererror').textContent);
            throw new Error('XML parsing error in YouTube feed');
        }
        
        const entries = xmlDoc.getElementsByTagName('entry');
        this.videos = Array.from(entries).map(entry => {
            const mediaGroup = entry.querySelector('media\\:group') || entry.querySelector('group');
            const title = entry.querySelector('title').textContent;
            const videoId = entry.querySelector('yt\\:videoId')?.textContent || 
                            entry.querySelector('videoId')?.textContent;
            const thumbnail = mediaGroup?.querySelector('media\\:thumbnail')?.getAttribute('url') || 
                                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            const description = mediaGroup?.querySelector('media\\:description')?.textContent || 
                                entry.querySelector('description')?.textContent || 'No description available';
            const published = entry.querySelector('published')?.textContent;
            const views = mediaGroup?.querySelector('media\\:statistics')?.getAttribute('views') || 'N/A';
            const url = entry.querySelector('link')?.getAttribute('href') || 
                       `https://www.youtube.com/watch?v=${videoId}`;
            
            const category = this.extractCategory(title, description);
            
            return {
                id: videoId,
                title: title,
                description: description,
                thumbnail: thumbnail,
                url: url,
                published: published,
                views: views,
                category: category
            };
        });
    }

    extractCategory(title, description) {
        const titleLower = title.toLowerCase();
        const descLower = description.toLowerCase();
        
        if (titleLower.includes('showcase') || titleLower.includes('model')) return 'showcase';
        if (titleLower.includes('q&a') || titleLower.includes('questions') || titleLower.includes('discord')) return 'qna';
        if (titleLower.includes('animation') || titleLower.includes('meme') || titleLower.includes('dance')) return 'animation';
        if (titleLower.includes('collab') || descLower.includes('collab')) return 'collab';
        if (titleLower.includes('behind') || titleLower.includes('bts')) return 'bts';
        return 'other';
    }

    getFilteredVideos() {
        if (this.currentFilter === 'all') {
            return this.videos;
        }
        return this.videos.filter(video => video.category === this.currentFilter);
    }

    updateStats() {
        const totalVideos = this.videos.length;
        const totalViews = this.videos.reduce((sum, video) => {
            return sum + parseInt(video.views) || 0;
        }, 0);
        
        document.getElementById('videoCount').textContent = `${totalVideos} Videos`;
        document.getElementById('totalViews').textContent = `${this.formatNumber(totalViews)} Views`;
    }

    renderVideos() {
        const container = document.getElementById('videoGrid');
        const filteredVideos = this.getFilteredVideos();
        const videosToShow = filteredVideos.slice(0, this.displayedVideos);
        
        if (videosToShow.length === 0) {
            container.innerHTML = `
                <div class="no-videos">
                    <div class="no-videos-icon">😿</div>
                    <h3>No videos match this filter</h3>
                    <p>Try "All Videos" or check back later!</p>
                    <button class="filter-btn" onclick="youtubeLoader.setFilter('all')">Show All Videos</button>
                </div>
            `;
            document.getElementById('loadMore').style.display = 'none';
            return;
        }

        container.innerHTML = videosToShow.map(video => `
            <div class="video-card" data-category="${video.category}" data-video-id="${video.id}">
                <a href="${video.url}" target="_blank" rel="noopener noreferrer" class="video-link">
                    <div class="video-thumbnail">
                        <img src="${video.thumbnail}" alt="${video.title}" loading="lazy" 
                                onerror="this.src='https://via.placeholder.com/480x270/ff69b4/ffffff?text=Meowbah+Video'">
                        <div class="play-overlay">
                            <span class="play-button">▶</span>
                        </div>
                    </div>
                </a>
                <div class="video-info">
                    <h3 class="video-title">${this.escapeHtml(video.title)}</h3>
                    <p class="video-description">${this.truncateText(this.stripHtml(video.description), 120)}</p>
                    <div class="video-meta">
                        <span class="views">${this.formatNumber(video.views)} views</span>
                        <span class="bullet">•</span>
                        <span class="upload-date">${this.formatDate(video.published)}</span>
                        <span class="category-badge ${video.category}">${this.formatCategory(video.category)}</span>
                    </div>
                </div>
            </div>
        `).join('');

        const totalAvailable = filteredVideos.length;
        if (this.displayedVideos >= totalAvailable) {
            document.getElementById('loadMore').style.display = 'none';
        } else {
            document.getElementById('loadMore').style.display = 'block';
        }

        container.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    }

    setupFilters() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.currentFilter = btn.dataset.filter;
                this.displayedVideos = this.videosToShow; 
                this.renderVideos();
            });
        });
    }

    setupLoadMore() {
        const loadMoreBtn = document.getElementById('loadMore');
        loadMoreBtn.addEventListener('click', () => {
            this.displayedVideos += this.videosToShow;
            this.renderVideos();
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(b => b.classList.remove('active'));
        filterBtns.forEach(b => {
            if (b.dataset.filter === filter) {
                b.classList.add('active');
            }
        });
        this.displayedVideos = this.videosToShow;
        this.renderVideos();
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength).trim() + '...' : text;
    }

    stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatNumber(num) {
        const number = parseInt(num);
        if (!number) return 'N/A';
        if (number >= 1000000) {
            return (number / 1000000).toFixed(1) + 'M';
        } else if (number >= 1000) {
            return (number / 1000).toFixed(1) + 'K';
        }
        return number.toLocaleString();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }

    formatCategory(category) {
        const categories = {
            'showcase': 'Showcase',
            'qna': 'Q&A',
            'animation': 'Animation',
            'collab': 'Collab',
            'bts': 'Behind Scenes',
            'other': 'Other'
        };
        return categories[category] || category;
    }

    showError() {
        const container = document.getElementById('videoGrid');
        container.innerHTML = `
            <div class="error-message">
                <div class="error-icon">😿</div>
                <h3>Oops! Meowbah's videos are taking a nap</h3>
                <p>Couldn't load the YouTube feed right now. Please try refreshing!</p>
                <button onclick="location.reload()" class="retry-btn">Try Again 🐾</button>
                <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                    Or visit <a href="https://www.youtube.com/channel/UCNytjdD5-KZInxjVeWV_qQw" target="_blank">Meowbah's YouTube</a>
                </p>
            </div>
        `;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('loadMore').style.display = 'none';
    }
}

// Global variable for button access
let youtubeLoader;

// Initialize when the entire page has finished loading
window.onload = function() {
    // Set active nav link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
    
    // Initialize YouTube video loader on videos page
    if (window.location.pathname.includes('videos.html')) {
        youtubeLoader = new YouTubeVideoLoader();
        youtubeLoader.init();
    }

    // Header scroll effect
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.header');
        if (window.scrollY > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.backdropFilter = 'blur(20px)';
        } else {
            header.style.background = 'var(--white)';
            header.style.backdropFilter = 'none';
        }
    });

    // Animate on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    document.querySelectorAll('.content-card, .video-card, .post-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
};

// Global functions for HTML onclick
function setYouTubeFilter(filter) {
    if (youtubeLoader) {
        youtubeLoader.setFilter(filter);
    }
}