// YouTube Atom Feed Video Loader
class YouTubeVideoLoader {
    constructor() {
        this.videos = [];
        this.displayedVideos = 0;
        this.videosToShow = 6; // Initial load
        this.currentFilter = 'all';
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        if (xmlDoc.querySelector('parsererror')) {
            throw new Error('XML parsing error in YouTube feed');
        }

        const ns = {
            atom: 'http://www.w3.org/2005/Atom',
            media: 'http://search.yahoo.com/mrss/',
            yt: 'http://www.youtube.com/xml/schemas/2015'
        };

        const entries = xmlDoc.getElementsByTagNameNS(ns.atom, 'entry');
        this.videos = Array.from(entries).map(entry => {
            
            const videoIdNode = entry.getElementsByTagNameNS(ns.yt, 'videoId')[0];
            const videoId = videoIdNode ? videoIdNode.textContent : 'N/A';

            const mediaGroup = entry.getElementsByTagNameNS(ns.media, 'group')[0];
            let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            let description = 'No description available.';
            let views = 'N/A';

            if (mediaGroup) {
                const thumbnailNode = mediaGroup.getElementsByTagNameNS(ns.media, 'thumbnail')[0];
                if (thumbnailNode) {
                    thumbnail = thumbnailNode.getAttribute('url');
                }

                const descriptionNode = mediaGroup.getElementsByTagNameNS(ns.media, 'description')[0];
                if (descriptionNode) {
                    description = descriptionNode.textContent;
                }

                const statisticsNode = mediaGroup.getElementsByTagNameNS(ns.media, 'statistics')[0];
                if (statisticsNode) {
                    views = statisticsNode.getAttribute('views');
                }
            }
            
            const title = entry.getElementsByTagNameNS(ns.atom, 'title')[0]?.textContent || 'Untitled';
            const published = entry.getElementsByTagNameNS(ns.atom, 'published')[0]?.textContent;
            const linkNode = entry.getElementsByTagNameNS(ns.atom, 'link')[0];
            const url = linkNode ? linkNode.getAttribute('href') : `https://www.youtube.com/watch?v=${videoId}`;

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
        if (isNaN(number)) return 'N/A';
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
    // SERVICE WORKER REGISTRATION for background notifications
    if ('serviceWorker' in navigator && window.location.pathname.includes('meowtalk.html')) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => console.log('Service Worker registered successfully:', registration))
            .catch(error => console.error('Service Worker registration failed:', error));
    }

    // Set active nav link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        link.classList.remove('active'); // Clear all first
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
    
    // Initialize YouTube video loader on videos page
    if (document.getElementById('videoGrid')) {
        youtubeLoader = new YouTubeVideoLoader();
        youtubeLoader.init();
    }

    // HOMEPAGE PREVIEW LOADER
    const isHomePage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html');
    if (isHomePage) {
        // Function to load the latest video
        const loadLatestVideo = () => {
            const container = document.getElementById('latest-video-preview');
            if (!container) return;

            fetch('meowbah-videos.xml')
                .then(response => response.text())
                .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
                .then(data => {
                    const ns = {
                        atom: 'http://www.w3.org/2005/Atom',
                        media: 'http://search.yahoo.com/mrss/'
                    };
                    const firstEntry = data.getElementsByTagNameNS(ns.atom, 'entry')[0];
                    if (!firstEntry) throw new Error("No video entry found");

                    const title = firstEntry.getElementsByTagNameNS(ns.atom, 'title')[0]?.textContent || 'Untitled';
                    const linkNode = firstEntry.getElementsByTagNameNS(ns.atom, 'link')[0];
                    const url = linkNode ? linkNode.getAttribute('href') : '#';
                    const published = new Date(firstEntry.getElementsByTagNameNS(ns.atom, 'published')[0]?.textContent);
                    
                    const mediaGroup = firstEntry.getElementsByTagNameNS(ns.media, 'group')[0];
                    let thumbnail = '';
                    let views = 'N/A';
                    if (mediaGroup) {
                        const thumbnailNode = mediaGroup.getElementsByTagNameNS(ns.media, 'thumbnail')[0];
                        thumbnail = thumbnailNode ? thumbnailNode.getAttribute('url') : '';
                        const statisticsNode = mediaGroup.getElementsByTagNameNS(ns.media, 'statistics')[0];
                        views = statisticsNode ? parseInt(statisticsNode.getAttribute('views')).toLocaleString() : 'N/A';
                    }

                    const diffTime = Math.abs(new Date() - published);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    let dateText = `${diffDays} days ago`;
                    if (diffDays <= 1) dateText = 'Today';
                    if (diffDays === 2) dateText = 'Yesterday';
                    
                    container.innerHTML = `
                        <a href="${url}" target="_blank" rel="noopener noreferrer" class="video-thumb" style="background-image: url('${thumbnail}'); background-size: cover; background-position: center;">
                            <span class="play-icon">▶</span>
                        </a>
                        <div class="video-info">
                            <h3>${title}</h3>
                            <p class="video-meta">• ${views} views • ${dateText}</p>
                            <a href="videos.html" class="preview-btn">Watch All Videos →</a>
                        </div>
                    `;
                }).catch(err => {
                    container.innerHTML = "<p>Could not load video preview.</p>";
                    console.error("Error loading latest video:", err);
                });
        };
        
        // Function to load latest posts from Nitter
        const loadLatestPosts = () => {
            const container = document.getElementById('latest-posts-preview');
            if (!container) return;

            fetch('meowbah-posts.xml')
                .then(response => response.text())
                .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
                .then(data => {
                    const items = data.querySelectorAll("item");
                    let html = "";
                    const itemsToShow = Array.from(items).slice(0, 2); 

                    if (itemsToShow.length === 0) throw new Error("No post items found");

                    itemsToShow.forEach(item => {
                        const title = item.querySelector("title").textContent;
                        const pubDate = new Date(item.querySelector("pubDate").textContent);
                        const description = item.querySelector("description").textContent;
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = description;
                        const imageTag = tempDiv.querySelector("img");
                        const imageUrl = imageTag ? imageTag.src : null;
                        
                        html += `
                            <div class="post-preview">
                                <div class="post-thumb" style="background-image: url('${imageUrl}'); background-size: contain; background-position: center; background-repeat: no-repeat;"></div>
                                <h4>${title.substring(0, 30)}...</h4>
                                <p class="post-meta">• ${pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                            </div>
                        `;
                    });
                    container.innerHTML = html;
                }).catch(err => {
                    container.innerHTML = "<p>Could not load post previews.</p>";
                    console.error("Error loading latest posts:", err);
                });
        };

        // Run the loaders
        loadLatestVideo();
        loadLatestPosts();
    }

    // HOURLY PHRASE & NOTIFICATION LOGIC
    if (document.getElementById('hourly-phrase')) {
        const phraseElement = document.getElementById('hourly-phrase');
        const notificationBtn = document.getElementById('enable-notifications-btn');
        const notificationStatus = document.getElementById('notification-status');

        if (phraseElement && notificationBtn && notificationStatus) {
            
            const phrases = [
                "Purr... Feeling cute today!", "Time for a digital head boop!", "Meow! Hope you're having a pawsome day!",
                "Did you know cats spend 70% of their lives sleeping? Goals!", "Just saw a virtual bird, it was riveting.",
                "Remember to stretch and land on your feet!", "Sending purrs and good vibes your way!",
                "Is it snack o'clock yet? Always is in my world.", "The keyboard is surprisingly comfy.",
                "Stay curious and keep exploring!", "If I fits, I sits... even in the digital realm.",
                "Chasing the red dot of destiny today.", "May your day be filled with sunbeams and gentle breezes.",
                "Let's make some mischief! Or maybe just nap.", "My meowtivation level is... surprisingly high right now!",
                "Just a little reminder that you're purrfect.", "Current mood: Zoomies, followed by a long nap.",
                "The internet is my giant litter box of information!", "Do you ever just stare blankly at a wall? It's an art form.",
                "Thinking about important cat stuff. You wouldn't understand.", "Meow does not have a race, Meow is a doll, dolls don't have races, silly.",
                "Jellybean-Sama!", "Arigato for educating Meow. Gomenasai, friends...Meow promises never to say that word again...",
                "Woof...hee-hee...bark, bark...", "Kawaii and small...uwu", "Meow is having a great day!",
                "Reading meow's discord questions!", "Meows gonna do unspeakable things to ur plush dada @zaptiee ( ´ ∀ `)ノ～ ♡",
                "KYAAAAA~~", "Rice Krispies are Meow's all-time favourite food!!", "nyahallo!!",
                "Meows selling a bodypillow!", "NYAN NYAN NIHAO NYAN!!"
            ];

            let currentHour = Math.floor(new Date().getTime() / (1000 * 60 * 60));

            const updatePhrase = () => {
                const phraseIndex = currentHour % phrases.length;
                const selectedPhrase = phrases[phraseIndex];
                phraseElement.textContent = selectedPhrase;
                return selectedPhrase;
            };
            
            updatePhrase();

            const updateNotificationUI = () => {
                if (!('Notification' in window)) {
                    notificationBtn.style.display = 'none';
                    notificationStatus.textContent = 'This browser does not support notifications.';
                    return;
                }

                switch (Notification.permission) {
                    case 'granted':
                        notificationBtn.style.display = 'none';
                        notificationStatus.textContent = 'Hourly notifications are enabled. ✅';
                        break;
                    case 'denied':
                        notificationBtn.style.display = 'none';
                        notificationStatus.textContent = 'Notifications are blocked. Please enable them in your browser settings.';
                        break;
                    default: // 'default'
                        notificationBtn.style.display = 'block';
                        notificationStatus.textContent = 'Click the button to receive a notification when the phrase changes.';
                        break;
                }
            };
            
            notificationBtn.addEventListener('click', () => {
                Notification.requestPermission().then(permission => {
                    updateNotificationUI();
                });
            });
            
            updateNotificationUI();

            const checkForNewHour = () => {
                const newHour = Math.floor(new Date().getTime() / (1000 * 60 * 60));
                if (newHour > currentHour) {
                    currentHour = newHour;
                    const newPhrase = updatePhrase(); 

                    if (Notification.permission === 'granted') {
                        new Notification('A New MeowTalk Phrase Has Arrived!', {
                            body: newPhrase,
                            icon: 'sitelogo.png'
                        });
                    }
                }
            };

            setInterval(checkForNewHour, 60000); 
        }
    }
    
    // NITTER RSS FEED LOADER FOR POSTS PAGE
    if (document.getElementById('posts-feed')) {
        const feedContainer = document.getElementById('posts-feed');
        
        fetch('meowbah-posts.xml')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok. Is meowbah-posts.xml in your folder?');
                }
                return response.text();
            })
            .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
            .then(data => {
                const items = data.querySelectorAll("item");
                let html = "";

                if (items.length === 0) {
                    feedContainer.innerHTML = "<p>Could not parse posts. The XML file might be empty or malformed.</p>";
                    return;
                }

                items.forEach(item => {
                    const title = item.querySelector("title").textContent;
                    const link = item.querySelector("link").textContent;
                    const pubDate = new Date(item.querySelector("pubDate").textContent);
                    const description = item.querySelector("description").textContent;

                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = description;

                    const imageTag = tempDiv.querySelector("img");
                    const imageUrl = imageTag ? imageTag.src : null;

                    html += `
                        <article class="post-card">
                            ${imageUrl ? `<div class="post-image" style="background-image: url('${imageUrl}'); background-size: contain; background-position: center; background-repeat: no-repeat;"></div>` : '<div class="post-image" style="background: linear-gradient(45deg, #ff69b4, #ffb6c1);"></div>'}
                            <div class="post-content">
                                <h3>${title}</h3>
                                <p class="post-meta">${pubDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                        </article>
                    `;
                });
                feedContainer.innerHTML = html;
            })
            .catch(error => {
                console.error("Error fetching or parsing local RSS feed:", error);
                feedContainer.innerHTML = "<p>Failed to load posts. Please ensure 'meowbah-posts.xml' exists and is correctly formatted.</p>";
            });
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