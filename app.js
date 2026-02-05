/**
 * CHUM Movies - Main Application Logic
 * Movie streaming webapp using NguonC API
 */

// API Configuration
const API_BASE = 'https://phim.nguonc.com/api';

// State Management
const state = {
    currentPage: 1,
    currentCategory: 'phim-moi-cap-nhat',
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
    navBtns: document.querySelectorAll('.nav-btn')
};

// HLS Player Instance
let hls = null;

// ========================================
// API Functions
// ========================================

async function fetchAPI(endpoint) {
    const apiUrl = `${API_BASE}${endpoint}`;

    // List of CORS proxies to try - optimized for GitHub Pages hosting
    const proxies = [
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(apiUrl)}`,
        `https://corsproxy.org/?${encodeURIComponent(apiUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${apiUrl}`,
        `https://proxy.cors.sh/${apiUrl}`
    ];

    let lastError = null;

    for (const proxyUrl of proxies) {
        try {
            const response = await fetch(proxyUrl, {
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (response.ok) {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    // Validate we got actual data
                    if (data && (data.items || data.movie || data.data)) {
                        console.log('✓ Proxy hoạt động:', proxyUrl.split('?')[0]);
                        return data;
                    }
                } catch {
                    continue;
                }
            } else if (response.status === 403 || response.status === 429) {
                // Proxy bị chặn hoặc rate limited, thử proxy tiếp theo
                console.log('✗ Proxy bị chặn:', proxyUrl.split('?')[0]);
                continue;
            }
        } catch (e) {
            lastError = e;
            continue;
        }
    }

    console.error('Tất cả proxy đều thất bại:', lastError);
    throw new Error('Failed to fetch from API');
}

async function getLatestMovies(page = 1) {
    return fetchAPI(`/films/phim-moi-cap-nhat?page=${page}`);
}

async function getMoviesByCategory(category, page = 1) {
    return fetchAPI(`/films/danh-sach/${category}?page=${page}`);
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

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.slug = movie.slug;

    const posterUrl = movie.thumb_url || movie.poster_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"%3E%3Crect fill="%231a1d29" width="300" height="450"/%3E%3Ctext fill="%234a5568" x="150" y="225" text-anchor="middle" font-size="16"%3ENo Image%3C/text%3E%3C/svg%3E';

    card.innerHTML = `
        <img class="movie-poster" src="${posterUrl}" alt="${movie.name}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 450%22%3E%3Crect fill=%22%231a1d29%22 width=%22300%22 height=%22450%22/%3E%3Ctext fill=%22%234a5568%22 x=%22150%22 y=%22225%22 text-anchor=%22middle%22 font-size=%2216%22%3ENo Image%3C/text%3E%3C/svg%3E'">
        <div class="movie-info">
            <h3 class="movie-title">${movie.name}</h3>
            <p class="movie-original-title">${movie.original_name || ''}</p>
            <div class="movie-meta">
                ${movie.quality ? `<span class="movie-badge quality">${movie.quality}</span>` : ''}
                ${movie.current_episode ? `<span class="movie-badge episode">${movie.current_episode}</span>` : ''}
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
    const posterUrl = movie.thumb_url || movie.poster_url || '';

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
    elements.playerTitle.textContent = `${movieName} - ${episodeName}`;

    // Clean up previous HLS instance
    if (hls) {
        hls.destroy();
        hls = null;
    }

    const playerWrapper = document.querySelector('.player-wrapper');

    // Try M3U8 first if available
    if (m3u8Url) {
        // Make sure we have the video element
        playerWrapper.innerHTML = '<video id="videoPlayer" controls playsinline></video>';
        const video = document.getElementById('videoPlayer');

        if (Hls.isSupported()) {
            hls = new Hls({
                maxBufferLength: 30,
                maxMaxBufferLength: 60
            });
            hls.loadSource(m3u8Url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => console.log('Autoplay prevented:', e));
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error('HLS Fatal Error:', data);
                    // Fallback to embed
                    if (embedUrl) {
                        useEmbed(playerWrapper, embedUrl);
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = m3u8Url;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(e => console.log('Autoplay prevented:', e));
            });
        } else if (embedUrl) {
            useEmbed(playerWrapper, embedUrl);
        }
    } else if (embedUrl) {
        useEmbed(playerWrapper, embedUrl);
    } else {
        playerWrapper.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;">
                <p>Không tìm thấy nguồn phát</p>
            </div>
        `;
    }

    elements.playerModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function useEmbed(container, embedUrl) {
    container.innerHTML = `
        <iframe 
            src="${embedUrl}" 
            frameborder="0" 
            allowfullscreen 
            allow="autoplay; encrypted-media; picture-in-picture"
            style="position:absolute;top:0;left:0;width:100%;height:100%;">
        </iframe>
    `;
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
        } else if (state.currentCategory === 'phim-moi-cap-nhat') {
            response = await getLatestMovies(state.currentPage);
        } else {
            response = await getMoviesByCategory(state.currentCategory, state.currentPage);
        }

        const movies = response.items || response.data?.items || [];
        const pagination = response.paginate || response.data?.params?.pagination || {};

        if (append) {
            state.movies = [...state.movies, ...movies];
        } else {
            state.movies = movies;
        }

        renderMovies(movies, append);

        // Check if there are more pages
        const totalPages = pagination.total_page || pagination.totalPages || 1;
        state.hasMore = state.currentPage < totalPages;

        if (state.hasMore && !state.searchKeyword) {
            elements.loadMoreBtn.classList.remove('hidden');
        }

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
// Initialize App
// ========================================

function init() {
    initTheme();
    initEventListeners();
    loadMovies();
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
