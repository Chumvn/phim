/**
 * CHUM Movies - Main Application Logic
 * Movie streaming webapp using NguonC API
 */

// API Configuration
const API_BASE = 'https://phim.nguonc.com/api';

// State Management
const state = {
    currentPage: 1,
    currentCategory: 'latest',
    currentFilter: null,
    filterType: null,
    searchKeyword: '',
    isLoading: false,
    hasMore: true,
    movies: [],
    currentMovie: null,
    viewMode: 'list' // 'list' or 'detail'
};

// DOM Elements
const elements = {
    movieGrid: document.getElementById('movieGrid'),
    movieDetail: document.getElementById('movieDetail'),
    loading: document.getElementById('loading'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    themeToggle: document.getElementById('themeToggle'),
    sectionTitle: document.getElementById('sectionTitle'),
    backBtn: document.getElementById('backBtn'),
    playerModal: document.getElementById('playerModal'),
    videoPlayer: document.getElementById('videoPlayer'),
    playerTitle: document.getElementById('playerTitle'),
    closePlayer: document.getElementById('closePlayer'),
    episodeList: document.getElementById('episodeList'),
    serverList: document.getElementById('serverList'),
    genreFilter: document.getElementById('genreFilter'),
    countryFilter: document.getElementById('countryFilter'),
    yearFilter: document.getElementById('yearFilter'),
    navBtns: document.querySelectorAll('.nav-btn'),
    // Hero Slider
    heroSlides: document.getElementById('heroSlides'),
    heroDots: document.getElementById('heroDots'),
    heroPrev: document.getElementById('heroPrev'),
    heroNext: document.getElementById('heroNext')
};

// HLS Player Instance
let hls = null;

// ========================================
// OPhim API Functions
// ========================================

const API_TIMEOUT = 8000; // 8 seconds timeout

// Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = API_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw error;
    }
}

async function fetchAPI(endpoint) {
    const apiUrl = `${API_BASE}${endpoint}`;

    // CORS proxies for GitHub Pages
    const proxies = [
        (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        (url) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
    ];

    // Try direct fetch first
    try {
        const response = await fetchWithTimeout(apiUrl, {
            headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
            const data = await response.json();
            if (data && (data.items || data.movie || data.status)) {
                console.log('✓ Direct API hoạt động');
                return data;
            }
        }
    } catch (e) {
        console.log('Direct call failed:', e.message);
    }

    // Fallback to proxies
    for (const getProxyUrl of proxies) {
        const proxyUrl = getProxyUrl(apiUrl);
        try {
            const response = await fetchWithTimeout(proxyUrl, {
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const text = await response.text();
                const data = JSON.parse(text);
                if (data && (data.items || data.movie || data.status)) {
                    console.log('✓ Proxy hoạt động');
                    return data;
                }
            }
        } catch (e) {
            console.log('Proxy failed:', e.message);
            continue;
        }
    }

    throw new Error('Không thể kết nối API');
}

// NguonC API endpoints
async function getLatestMovies(page = 1) {
    return fetchAPI(`/films/phim-moi-cap-nhat?page=${page}`);
}

async function getMoviesByCategory(category, page = 1) {
    // Map category for NguonC API
    const categoryMap = {
        'latest': 'phim-moi-cap-nhat',
        'trending': 'phim-moi-cap-nhat',
        'phim-le': 'phim-le',
        'phim-bo': 'phim-bo',
        'hoat-hinh': 'hoat-hinh',
        'tv-shows': 'tv-shows'
    };
    const cat = categoryMap[category] || category;
    return fetchAPI(`/films/danh-sach/${cat}?page=${page}`);
}

async function getMoviesByGenre(genre, page = 1) {
    return fetchAPI(`/films/the-loai/${genre}?page=${page}`);
}

async function getMoviesByCountry(country, page = 1) {
    return fetchAPI(`/films/quoc-gia/${country}?page=${page}`);
}

async function getMoviesByYear(year, page = 1) {
    return fetchAPI(`/films/nam-phat-hanh/${year}?page=${page}`);
}

async function searchMovies(keyword) {
    return fetchAPI(`/films/search?keyword=${encodeURIComponent(keyword)}`);
}

async function getMovieDetail(slug) {
    return fetchAPI(`/film/${slug}`);
}

// ========================================
// UI Rendering Functions
// ========================================

// NguonC CDN for images
const IMAGE_CDN = '';

function getImageUrl(imagePath) {
    if (!imagePath) return null;
    // If already full URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    // NguonC returns full URLs, so just return the path
    return imagePath;
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.slug = movie.slug;

    const posterUrl = getImageUrl(movie.thumb_url) || getImageUrl(movie.poster_url) || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"%3E%3Crect fill="%231a1d29" width="300" height="450"/%3E%3Ctext fill="%234a5568" x="150" y="225" text-anchor="middle" font-size="16"%3ENo Image%3C/text%3E%3C/svg%3E';

    card.innerHTML = `
        <div class="poster-wrapper">
            <img class="movie-poster" src="${posterUrl}" alt="${movie.name}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 450%22%3E%3Crect fill=%22%231a1d29%22 width=%22300%22 height=%22450%22/%3E%3Ctext fill=%22%234a5568%22 x=%22150%22 y=%22225%22 text-anchor=%22middle%22 font-size=%2216%22%3ENo Image%3C/text%3E%3C/svg%3E'">
            <div class="poster-overlay">
                <div class="play-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                </div>
            </div>
            <div class="movie-badges-overlay">
                ${movie.quality ? `<span class="movie-badge quality">${movie.quality}</span>` : ''}
                ${movie.current_episode ? `<span class="movie-badge episode">${movie.current_episode}</span>` : ''}
            </div>
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${movie.name}</h3>
            <p class="movie-original-title">${movie.original_name || ''}</p>
            <div class="movie-meta">
                ${movie.language ? `<span class="movie-badge">${movie.language}</span>` : ''}
                ${movie.year ? `<span class="movie-badge">${movie.year}</span>` : ''}
            </div>
        </div>
    `;

    card.addEventListener('click', () => showMovieDetail(movie.slug));

    return card;
}

function renderMovies(movies, append = false) {
    if (!append) {
        elements.movieGrid.innerHTML = '';
    }

    if (movies.length === 0 && !append) {
        elements.movieGrid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 15h8M9 9h.01M15 9h.01"></path>
                </svg>
                <h3>Không tìm thấy phim</h3>
                <p>Thử tìm kiếm với từ khóa khác</p>
            </div>
        `;
        return;
    }

    movies.forEach(movie => {
        const card = createMovieCard(movie);
        elements.movieGrid.appendChild(card);
    });
}

function renderMovieDetail(movie) {
    const posterUrl = getImageUrl(movie.poster_url) || getImageUrl(movie.thumb_url) || '';

    // Handle category - can be array or object with keys "1", "2", etc.
    let categoryTags = [];
    if (movie.category) {
        if (Array.isArray(movie.category)) {
            categoryTags = movie.category.map(cat => cat.name);
        } else if (typeof movie.category === 'object') {
            // API returns object like {"1": {group: {}, list: [{name: "..."}]}, ...}
            Object.values(movie.category).forEach(catGroup => {
                if (catGroup.list && Array.isArray(catGroup.list)) {
                    catGroup.list.forEach(item => {
                        if (item.name) categoryTags.push(item.name);
                    });
                }
            });
        }
    }

    let episodesHtml = '';
    if (movie.episodes && movie.episodes.length > 0) {
        episodesHtml = movie.episodes.map((server, serverIndex) => {
            const serverName = server.server_name || `Server ${serverIndex + 1}`;
            const episodes = server.items || [];

            return `
                <div class="detail-section">
                    <h3>${serverName}</h3>
                    <div class="episodes-grid">
                        ${episodes.map((ep, epIndex) => `
                            <button class="episode-btn" 
                                data-server="${serverIndex}" 
                                data-episode="${epIndex}"
                                data-name="${ep.name}"
                                data-embed="${ep.embed || ''}"
                                data-m3u8="${ep.m3u8 || ''}">
                                ${ep.name}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    elements.movieDetail.innerHTML = `
        <div class="detail-header">
            <img class="detail-poster" src="${posterUrl}" alt="${movie.name}" onerror="this.style.display='none'">
            <div class="detail-info">
                <h1 class="detail-title">${movie.name}</h1>
                <p class="detail-original-title">${movie.original_name || ''}</p>
                <div class="detail-meta">
                    ${movie.quality ? `<span class="movie-badge quality">${movie.quality}</span>` : ''}
                    ${movie.current_episode ? `<span class="movie-badge episode">${movie.current_episode}</span>` : ''}
                    ${movie.language ? `<span class="movie-badge">${movie.language}</span>` : ''}
                    ${movie.time ? `<span class="movie-badge">${movie.time}</span>` : ''}
                </div>
                <p class="detail-description">${movie.description || 'Chưa có mô tả'}</p>
            </div>
        </div>
        ${categoryTags.length > 0 ? `
            <div class="detail-section">
                <h3>Thể loại</h3>
                <div class="detail-meta">
                    ${categoryTags.map(name => `<span class="movie-badge">${name}</span>`).join('')}
                </div>
            </div>
        ` : ''}
        ${episodesHtml}
    `;

    // Add episode click handlers
    elements.movieDetail.querySelectorAll('.episode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const embed = btn.dataset.embed;
            const m3u8 = btn.dataset.m3u8;
            const name = btn.dataset.name;
            playVideo(movie.name, name, embed, m3u8);
        });
    });
}

// ========================================
// Video Player Functions
// ========================================

function playVideo(movieName, episodeName, embedUrl, m3u8Url) {
    // Cleanup previous HLS instance first
    if (hls) {
        hls.destroy();
        hls = null;
    }

    // Normalize URLs - treat empty strings as null
    const embed = embedUrl && embedUrl.trim() !== '' ? embedUrl.trim() : null;
    const m3u8 = m3u8Url && m3u8Url.trim() !== '' ? m3u8Url.trim() : null;

    console.log('🎬 Play video:', { embed, m3u8 });

    // PRIORITY: Open embed URL in new tab (iframe embedding is blocked by most servers)
    if (embed) {
        console.log('▶ Mở embed trong tab mới');
        // Ensure page is scrollable
        document.body.style.overflow = '';
        elements.playerModal.classList.remove('active');
        window.open(embed, '_blank', 'noopener,noreferrer');
        return;
    }

    // Fallback to M3U8 HLS stream if no embed
    if (m3u8) {
        elements.playerTitle.textContent = `${movieName} - ${episodeName}`;
        const playerWrapper = document.querySelector('.player-wrapper');
        console.log('▶ Thử HLS stream');
        playHLS(playerWrapper, m3u8);
        elements.playerModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        return;
    }

    // No source available
    console.log('✗ Không có nguồn phát');
    elements.playerTitle.textContent = `${movieName} - ${episodeName}`;
    const playerWrapper = document.querySelector('.player-wrapper');
    showVideoError(playerWrapper, 'Không tìm thấy nguồn phát.');
    elements.playerModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function playHLS(playerWrapper, m3u8Url) {
    playerWrapper.innerHTML = '<video id="videoPlayer" controls playsinline></video>';
    const video = document.getElementById('videoPlayer');

    if (Hls.isSupported()) {
        hls = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            manifestLoadingTimeOut: 8000,
            manifestLoadingMaxRetry: 1
        });

        hls.loadSource(m3u8Url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('✓ HLS stream loaded');
            video.play().catch(e => console.log('Autoplay prevented:', e));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                console.error('✗ HLS Error:', data.details);
                hls.destroy();
                hls = null;
                showVideoError(playerWrapper, 'Nguồn phát không khả dụng hoặc đã hết hạn.');
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = m3u8Url;
        video.addEventListener('loadedmetadata', () => {
            video.play().catch(e => console.log('Autoplay prevented:', e));
        });
        video.addEventListener('error', () => {
            showVideoError(playerWrapper, 'Không thể phát video.');
        });
    } else {
        showVideoError(playerWrapper, 'Trình duyệt không hỗ trợ.');
    }
}

function showVideoError(container, message) {
    container.innerHTML = `
        <div class="video-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px;margin-bottom:16px;opacity:0.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p style="font-size:16px;margin:0;opacity:0.9">${message}</p>
            <p style="font-size:12px;margin-top:8px;opacity:0.5">Thử chọn tập khác hoặc server khác</p>
        </div>
    `;
}

function useEmbed(container, embedUrl) {
    // Show loading first
    container.innerHTML = `
        <div class="video-loading" style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#fff;">
            <div class="spinner" style="width:40px;height:40px;border:3px solid #333;border-top-color:#818cf8;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            <p style="margin-top:16px;opacity:0.7;font-size:14px;">Đang tải video...</p>
        </div>
    `;

    // Store embed URL for external link
    window.currentEmbedUrl = embedUrl;

    // Show external link button
    const serverList = document.getElementById('serverList');
    if (serverList) {
        serverList.innerHTML = `
            <div style="text-align:center;padding:10px;">
                <a href="${embedUrl}" target="_blank" rel="noopener" 
                   style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:linear-gradient(135deg,#818cf8 0%,#c084fc 100%);color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Mở video trong tab mới
                </a>
                <p style="margin-top:8px;font-size:12px;opacity:0.6;">Nếu video không phát, hãy click nút trên</p>
            </div>
        `;
    }

    // Create iframe after a small delay to show loading
    setTimeout(() => {
        container.innerHTML = `
            <iframe 
                id="videoFrame"
                src="${embedUrl}" 
                frameborder="0" 
                scrolling="no"
                allowfullscreen="true"
                webkitallowfullscreen="true"
                mozallowfullscreen="true"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
                referrerpolicy="origin"
                style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;">
            </iframe>
        `;

        const iframe = document.getElementById('videoFrame');
        if (iframe) {
            iframe.onerror = () => {
                console.error('✗ Iframe load error');
                showVideoError(container, 'Không thể tải trình phát video.');
            };
        }
    }, 300);
}

function closeVideoPlayer() {
    if (hls) {
        hls.destroy();
        hls = null;
    }

    const video = document.getElementById('videoPlayer');
    if (video) {
        video.pause();
        video.src = '';
    }

    // Reset player wrapper
    document.querySelector('.player-wrapper').innerHTML = '<video id="videoPlayer" controls playsinline></video>';

    elements.playerModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ========================================
// Navigation & State Functions
// ========================================

async function loadMovies(append = false) {
    if (state.isLoading) return;

    state.isLoading = true;
    showLoading(true);
    elements.loadMoreBtn.classList.add('hidden');

    try {
        let response;

        if (state.searchKeyword) {
            response = await searchMovies(state.searchKeyword);
            state.hasMore = false;
        } else if (state.filterType === 'genre') {
            response = await getMoviesByGenre(state.currentFilter, state.currentPage);
        } else if (state.filterType === 'country') {
            response = await getMoviesByCountry(state.currentFilter, state.currentPage);
        } else if (state.filterType === 'year') {
            response = await getMoviesByYear(state.currentFilter, state.currentPage);
        } else if (state.currentCategory === 'latest' || state.currentCategory === 'trending' || state.currentCategory === 'phim-moi-cap-nhat') {
            response = await getLatestMovies(state.currentPage);
        } else {
            response = await getMoviesByCategory(state.currentCategory, state.currentPage);
        }

        console.log('📦 API Response:', response);
        const movies = response.items || response.data?.items || [];
        const pagination = response.paginate || response.data?.params?.pagination || {};
        console.log('🎬 Parsed movies:', movies.length, 'items');

        if (append) {
            state.movies = [...state.movies, ...movies];
        } else {
            state.movies = movies;
        }

        renderMovies(movies, append);

        // Check if there are more pages and auto-load them
        const totalPages = pagination.total_page || pagination.totalPages || 1;
        const maxPagesToLoad = 5; // Load up to 5 pages (approx 100-150 movies)

        if (state.currentPage < totalPages && state.currentPage < maxPagesToLoad && !state.searchKeyword) {
            // Auto load next page
            state.currentPage++;
            state.isLoading = false;
            await loadMovies(true);
            return;
        }

        state.hasMore = false;

    } catch (error) {
        console.error('Error loading movies:', error);
        if (!append) {
            elements.movieGrid.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3>Có lỗi xảy ra</h3>
                    <p>Không thể tải danh sách phim</p>
                </div>
            `;
        }
    } finally {
        state.isLoading = false;
        showLoading(false);
    }
}

async function showMovieDetail(slug) {
    state.viewMode = 'detail';
    showLoading(true);
    elements.movieGrid.classList.add('hidden');
    elements.loadMoreBtn.classList.add('hidden');
    elements.backBtn.classList.remove('hidden');

    try {
        const response = await getMovieDetail(slug);
        // API returns movie data directly or nested under 'movie' key
        const movie = response.movie || response;
        state.currentMovie = movie;

        elements.sectionTitle.textContent = movie.name;
        renderMovieDetail(movie);
        elements.movieDetail.classList.remove('hidden');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading movie detail:', error);
        elements.movieDetail.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Có lỗi xảy ra</h3>
                <p>Không thể tải thông tin phim</p>
            </div>
        `;
        elements.movieDetail.classList.remove('hidden');
    } finally {
        showLoading(false);
    }
}

function showMovieList() {
    state.viewMode = 'list';
    state.currentMovie = null;

    elements.movieDetail.classList.add('hidden');
    elements.movieGrid.classList.remove('hidden');
    elements.backBtn.classList.add('hidden');

    updateSectionTitle();

    if (state.hasMore && !state.searchKeyword) {
        elements.loadMoreBtn.classList.remove('hidden');
    }
}

function updateSectionTitle() {
    if (state.searchKeyword) {
        elements.sectionTitle.textContent = `Kết quả: "${state.searchKeyword}"`;
    } else if (state.filterType === 'genre') {
        const genreSelect = document.getElementById('genreFilter');
        const selectedText = genreSelect.options[genreSelect.selectedIndex].text;
        elements.sectionTitle.textContent = `Phim ${selectedText}`;
    } else if (state.filterType === 'country') {
        const countrySelect = document.getElementById('countryFilter');
        const selectedText = countrySelect.options[countrySelect.selectedIndex].text;
        elements.sectionTitle.textContent = `Phim ${selectedText}`;
    } else if (state.filterType === 'year') {
        elements.sectionTitle.textContent = `Phim năm ${state.currentFilter}`;
    } else {
        const titles = {
            'phim-moi-cap-nhat': 'Phim mới cập nhật',
            'phim-le': 'Phim lẻ',
            'phim-bo': 'Phim bộ',
            'hoat-hinh': 'Phim hoạt hình',
            'phim-dang-chieu': 'Phim đang chiếu'
        };
        elements.sectionTitle.textContent = titles[state.currentCategory] || 'Danh sách phim';
    }
}

function resetAndLoad(category = null, filterType = null, filterValue = null) {
    state.currentPage = 1;
    state.movies = [];
    state.hasMore = true;
    state.searchKeyword = '';
    elements.searchInput.value = '';

    if (category) {
        state.currentCategory = category;
        state.filterType = null;
        state.currentFilter = null;
        resetFilters();
    }

    if (filterType && filterValue) {
        state.filterType = filterType;
        state.currentFilter = filterValue;
        updateNavBtns(null);
    }

    showMovieList();
    updateSectionTitle();
    loadMovies();
}

function resetFilters() {
    elements.genreFilter.value = '';
    elements.countryFilter.value = '';
    elements.yearFilter.value = '';
}

function updateNavBtns(activeCategory) {
    elements.navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === activeCategory);
    });
}

function showLoading(show) {
    elements.loading.classList.toggle('hidden', !show);
}

// ========================================
// Theme Functions
// ========================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        document.documentElement.dataset.theme = savedTheme;
    } else if (prefersDark) {
        document.documentElement.dataset.theme = 'dark';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
}

// ========================================
// Event Listeners
// ========================================

function initEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Navigation buttons
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            updateNavBtns(category);
            resetAndLoad(category);
        });
    });

    // Filter selects - auto-load when selected
    elements.genreFilter.addEventListener('change', (e) => {
        if (e.target.value) {
            elements.countryFilter.value = '';
            elements.yearFilter.value = '';
            resetAndLoad(null, 'genre', e.target.value);
            updateNavBtns(null);
        }
    });

    elements.countryFilter.addEventListener('change', (e) => {
        if (e.target.value) {
            elements.genreFilter.value = '';
            elements.yearFilter.value = '';
            resetAndLoad(null, 'country', e.target.value);
            updateNavBtns(null);
        }
    });

    elements.yearFilter.addEventListener('change', (e) => {
        if (e.target.value) {
            elements.genreFilter.value = '';
            elements.countryFilter.value = '';
            resetAndLoad(null, 'year', e.target.value);
            updateNavBtns(null);
        }
    });

    // Search
    elements.searchBtn.addEventListener('click', performSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Back button
    elements.backBtn.addEventListener('click', showMovieList);

    // Load more
    elements.loadMoreBtn.addEventListener('click', () => {
        state.currentPage++;
        loadMovies(true);
    });

    // Close player
    elements.closePlayer.addEventListener('click', closeVideoPlayer);
    elements.playerModal.addEventListener('click', (e) => {
        if (e.target === elements.playerModal) {
            closeVideoPlayer();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.playerModal.classList.contains('active')) {
                closeVideoPlayer();
            } else if (state.viewMode === 'detail') {
                showMovieList();
            }
        }
    });
}

function performSearch() {
    const keyword = elements.searchInput.value.trim();
    if (keyword) {
        state.searchKeyword = keyword;
        state.currentPage = 1;
        state.movies = [];
        state.filterType = null;
        state.currentFilter = null;
        resetFilters();
        updateNavBtns(null);
        showMovieList();
        updateSectionTitle();
        loadMovies();
    }
}

// ========================================
// Hero Slider
// ========================================

let heroCurrentSlide = 0;
let heroInterval = null;
const HERO_LIMIT = 5;

function renderHeroSlider(movies) {
    if (!elements.heroSlides || movies.length === 0) return;

    const heroMovies = movies.slice(0, HERO_LIMIT);

    elements.heroSlides.innerHTML = heroMovies.map((movie, index) => {
        const posterUrl = getImageUrl(movie.poster_url) || getImageUrl(movie.thumb_url) || '';
        const description = movie.origin_name || 'Không có mô tả';

        return `
            <div class="hero-slide" style="background-image: url('${posterUrl}')" data-slug="${movie.slug}">
                <div class="hero-content">
                    <h2 class="hero-title">${movie.name}</h2>
                    <p class="hero-subtitle">${movie.original_name || ''}</p>
                    <div class="hero-badges">
                        ${movie.quality ? `<span class="hero-badge quality">${movie.quality}</span>` : ''}
                        ${movie.current_episode ? `<span class="hero-badge">${movie.current_episode}</span>` : ''}
                        ${movie.language ? `<span class="hero-badge">${movie.language}</span>` : ''}
                        ${movie.year ? `<span class="hero-badge">${movie.year}</span>` : ''}
                    </div>
                    <p class="hero-description">${description.substring(0, 200)}...</p>
                    <div class="hero-actions">
                        <button class="hero-play-btn" onclick="showMovieDetail('${movie.slug}')">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            Xem ngay
                        </button>
                        <button class="hero-info-btn" onclick="showMovieDetail('${movie.slug}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            Chi tiết
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Render dots
    elements.heroDots.innerHTML = heroMovies.map((_, index) =>
        `<div class="hero-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`
    ).join('');

    // Event listeners for dots
    elements.heroDots.querySelectorAll('.hero-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            goToSlide(parseInt(dot.dataset.index));
        });
    });

    // Start auto-play
    startHeroAutoPlay();
}

function goToSlide(index) {
    const slides = elements.heroSlides.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;

    heroCurrentSlide = index;
    if (heroCurrentSlide >= slides.length) heroCurrentSlide = 0;
    if (heroCurrentSlide < 0) heroCurrentSlide = slides.length - 1;

    elements.heroSlides.style.transform = `translateX(-${heroCurrentSlide * 100}%)`;

    // Update dots
    elements.heroDots.querySelectorAll('.hero-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === heroCurrentSlide);
    });
}

function nextSlide() {
    const slides = elements.heroSlides.querySelectorAll('.hero-slide');
    goToSlide((heroCurrentSlide + 1) % slides.length);
}

function prevSlide() {
    const slides = elements.heroSlides.querySelectorAll('.hero-slide');
    goToSlide((heroCurrentSlide - 1 + slides.length) % slides.length);
}

function startHeroAutoPlay() {
    if (heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(nextSlide, 5000);
}

function initHeroControls() {
    if (elements.heroPrev) {
        elements.heroPrev.addEventListener('click', () => {
            prevSlide();
            startHeroAutoPlay(); // Reset timer
        });
    }
    if (elements.heroNext) {
        elements.heroNext.addEventListener('click', () => {
            nextSlide();
            startHeroAutoPlay(); // Reset timer
        });
    }
}

async function loadHeroSlider() {
    try {
        const data = await getLatestMovies(1);
        const movies = data.items || data.data?.items || [];
        renderHeroSlider(movies);
    } catch (error) {
        console.error('Error loading hero slider:', error);
    }
}

// ========================================
// Search Suggestions (Autocomplete)
// ========================================

let searchDebounceTimer = null;
const SEARCH_DEBOUNCE_MS = 300;

function initSearchSuggestions() {
    const searchInput = elements.searchInput;
    const suggestionsContainer = document.getElementById('searchSuggestions');

    if (!searchInput || !suggestionsContainer) return;

    // Input event with debounce
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        clearTimeout(searchDebounceTimer);

        if (query.length < 2) {
            hideSuggestions();
            return;
        }

        searchDebounceTimer = setTimeout(() => {
            fetchSuggestions(query);
        }, SEARCH_DEBOUNCE_MS);
    });

    // Focus event - show cached suggestions
    searchInput.addEventListener('focus', () => {
        const query = searchInput.value.trim();
        if (query.length >= 2 && suggestionsContainer.children.length > 0) {
            suggestionsContainer.classList.remove('hidden');
        }
    });

    // Click outside to hide
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSuggestions();
        }
    });
}

async function fetchSuggestions(query) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;

    // Show loading
    suggestionsContainer.innerHTML = '<div class="suggestion-loading">Đang tìm kiếm...</div>';
    suggestionsContainer.classList.remove('hidden');

    try {
        const response = await searchMovies(query);
        const movies = response.items || response.data?.items || [];

        if (movies.length === 0) {
            suggestionsContainer.innerHTML = '<div class="suggestion-empty">Không tìm thấy phim</div>';
            return;
        }

        // Show max 8 suggestions
        const suggestions = movies.slice(0, 8);

        suggestionsContainer.innerHTML = suggestions.map(movie => {
            const posterUrl = getImageUrl(movie.thumb_url) || getImageUrl(movie.poster_url) || '';
            return `
                <div class="suggestion-item" data-slug="${movie.slug}">
                    <img class="suggestion-poster" src="${posterUrl}" alt="${movie.name}" 
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 45 65%22%3E%3Crect fill=%22%231a1a2e%22 width=%2245%22 height=%2265%22/%3E%3C/svg%3E'">
                    <div class="suggestion-info">
                        <div class="suggestion-title">${movie.name}</div>
                        <div class="suggestion-meta">
                            ${movie.year ? `<span>${movie.year}</span>` : ''}
                            ${movie.quality ? `<span>${movie.quality}</span>` : ''}
                            ${movie.current_episode ? `<span>${movie.current_episode}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click events
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const slug = item.dataset.slug;
                hideSuggestions();
                elements.searchInput.value = '';
                showMovieDetail(slug);
            });
        });

    } catch (error) {
        console.error('Search suggestions error:', error);
        suggestionsContainer.innerHTML = '<div class="suggestion-empty">Lỗi tìm kiếm</div>';
    }
}

function hideSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.classList.add('hidden');
    }
}

// ========================================
// Initialize App
// ========================================

function init() {
    initTheme();
    initEventListeners();
    initHeroControls();
    initSearchSuggestions();
    loadHeroSlider();
    loadMovies();
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
