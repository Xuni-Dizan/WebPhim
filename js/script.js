// script.js - Updated for Advanced Filters, Tags, URL Params, Sliders, Tab Transitions, Responsiveness, Error Handling, Filter Toggle, Format Filter, Hero Slideshow, and **Combined JSON Loading**
// v1.9: Explicitly handles anime-movie and anime-series linking and badge display in createItemCard.

// --- Make data arrays globally accessible ---
window.allMovies = []; // Now includes movie-type anime
window.allSeries = []; // Now includes series-type anime
// --- Define currentFilters globally ---
window.currentFilters = {
    genres: [],
    yearRange: [null, null],
    ratingRange: [0, 10],
    sort: 'default',
    search: '',
    format: 'all'
};
// --- Flag to track data loading status ---
window.dataLoaded = false;

document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const genreFilterContainer = document.getElementById('genre-filter-container');
    const genreFilterButton = document.getElementById('genre-filter-button');
    const genreDropdown = document.getElementById('genre-dropdown');
    const sortFilter = document.getElementById('sort-filter');
    const formatFilter = document.getElementById('format-filter');
    const movieGrid = document.getElementById('movie-grid');
    const movieGridSection = document.getElementById('movie-grid-section');
    const movieGridTitle = document.getElementById('movie-grid-title');
    const noMoviesFound = document.getElementById('no-movies-found');
    const heroSection = document.getElementById('hero-section');
    const heroTitle = document.getElementById('hero-title');
    const heroDescription = document.getElementById('hero-description');
    const heroPlayButton = document.getElementById('hero-play-button');
    const heroDetailButton = document.getElementById('hero-detail-button');
    const filterControlsSection = document.getElementById('filter-controls');
    const tabsContainer = document.getElementById('content-tabs');
    const tabMovies = document.getElementById('tab-movies');
    const tabSeries = document.getElementById('tab-series');
    const filterTagsContainer = document.getElementById('filter-tags-container');
    const yearSliderElement = document.getElementById('year-slider');
    const ratingSliderElement = document.getElementById('rating-slider');
    const yearSliderValues = document.getElementById('year-slider-values');
    const ratingSliderValues = document.getElementById('rating-slider-values');
    const clearFiltersButton = document.getElementById('clear-filters-button');
    const filterControls = document.getElementById('filter-controls');

    // --- State Variables ---
    let currentContentType = 'movies'; // Default: 'movies' tab active
    let uniqueGenres = { movies: [], series: [] };
    let minMaxYears = { movies: [Infinity, -Infinity], series: [Infinity, -Infinity] };
    let yearSliderInstance = null;
    let ratingSliderInstance = null;
    let observer;
    let filterDebounceTimer;
    const TAB_TRANSITION_DURATION = 300;

    // --- Hero Slideshow State ---
    let hotItems = [];
    let currentHeroIndex = 0;
    let heroIntervalId = null;
    const HERO_SLIDESHOW_INTERVAL = 7000; // Increased interval to 7 seconds

    // --- Helper Functions ---

    /**
     * Debounce function.
     * Hàm debounce.
     * @param {Function} func - Function to debounce. Hàm cần debounce.
     * @param {number} wait - Delay in ms. Độ trễ (ms).
     * @returns {Function} - Debounced function. Hàm đã debounce.
     */
    const debounceFilter = (func, wait) => {
        return (...args) => {
            clearTimeout(filterDebounceTimer);
            filterDebounceTimer = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    };

    /**
     * Creates HTML for a movie or series card.
     * Tạo HTML cho thẻ phim lẻ hoặc phim bộ.
     * @param {object} item - Item data. Dữ liệu mục.
     * @param {string} type - 'movies' or 'series' (based on current tab). Loại (dựa trên tab hiện tại).
     * @returns {string} - Card HTML. HTML thẻ.
     */
    const createItemCard = (item, type) => {
        // Determine detail page URL based on itemType
        let detailPageUrl = '#';
        const itemType = item.itemType || type; // Use itemType from data first, fallback to tab type

        if (itemType === 'anime-series' || itemType === 'anime-movie') {
            detailPageUrl = `pages/animeDetails.html?id=${item.id}&type=${itemType}`;
        } else if (itemType === 'series') {
            detailPageUrl = `pages/filmDetails_phimBo.html?id=${item.id}&type=series`;
        } else { // movies
            detailPageUrl = `pages/filmDetail.html?id=${item.id}&type=movies`;
        }

        const altText = `Poster ${itemType.includes('anime') ? 'Anime' : (itemType === 'movies' ? 'phim' : 'phim bộ')} ${item.title || 'không có tiêu đề'}`;
        const posterUrl = item.posterUrl || 'https://placehold.co/300x450/111111/eeeeee?text=No+Poster';
        const titleText = item.title || 'Không có tiêu đề';
        const yearText = item.releaseYear || 'N/A';
        const ratingText = item.rating ? parseFloat(item.rating).toFixed(1) : 'N/A';
        const displayTitle = window.currentFilters.search ? highlightTerm(titleText, window.currentFilters.search) : titleText;
        const format = item.format || [];
        const isAnime = itemType.includes('anime');
        
        // Determine card class based on type
        const cardClass = isAnime ? 'anime-card stagger-item' : 'movie-card stagger-item';
        
        // Build badges HTML
        let badgesHTML = '';
        
        // Type badge (top right)
        if (itemType === 'series' || itemType === 'anime-series') {
            badgesHTML += `<span class="card-badge card-badge-top-right badge-series">Bộ</span>`;
        } else if (itemType === 'anime-movie') {
            badgesHTML += `<span class="card-badge card-badge-top-right badge-anime">Anime</span>`;
        } else if (itemType === 'movies') {
            badgesHTML += `<span class="card-badge card-badge-top-right badge-movie">Lẻ</span>`;
        }

        // Format badge (top left)
        if (format.includes("3D")) {
            badgesHTML += `<span class="card-badge card-badge-top-left badge-3d">3D</span>`;
        } else if (format.includes("2D")) {
            badgesHTML += `<span class="card-badge card-badge-top-left badge-2d">2D</span>`;
        } else if (format.includes("Animation") && !format.includes("2D") && !format.includes("3D")) {
            badgesHTML += `<span class="card-badge card-badge-top-left badge-animation">Hoạt Hình</span>`;
        }
        
        // Episodes badge (only for series)
        let episodesHTML = '';
        if (itemType === 'series' || itemType === 'anime-series') {
            const episodes = item.episodes || item.episodeCount || '?';
            episodesHTML = `
                <div class="card-episodes">
                    <i class="fas fa-film"></i> ${episodes} tập
                </div>
            `;
        }

        return `
            <a href="${detailPageUrl}" class="${cardClass}" data-item-id="${item.id}" data-item-type="${itemType}" aria-label="Xem chi tiết ${isAnime ? 'Anime' : (itemType === 'movies' ? 'phim' : 'phim bộ')} ${titleText}">
                <div class="movie-card-poster-container relative overflow-hidden rounded-t-lg">
                    <img src="${posterUrl}" alt="${altText}" loading="lazy" class="w-full h-auto aspect-[2/3] object-cover transition-transform duration-400" onerror="this.onerror=null; this.src='https://placehold.co/300x450/111111/eeeeee?text=Error'; this.alt='Lỗi tải ảnh poster ${titleText}';">
                    ${badgesHTML}
                    <div class="card-hover-overlay absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 transition-opacity duration-300 flex flex-col justify-center items-center">
                        <div class="card-play-button bg-black/40 text-white text-3xl p-4 rounded-full border-2 border-white/70 hover:bg-primary hover:border-white hover:scale-110 transition-all duration-300 flex items-center justify-center">
                            <i class="fas fa-play"></i>
                        </div>
                        <div class="mt-3 text-white font-semibold text-lg text-center px-3">${titleText}</div>
                    </div>
                </div>
                <div class="card-info p-3 border-t border-gray-700/20">
                    <div>
                        <h3 class="card-title font-semibold text-bright-color text-sm leading-tight mb-1 h-[2.5em] overflow-hidden" title="${titleText}">${displayTitle}</h3>
                        <div class="card-meta flex justify-between items-center text-xs text-text-muted">
                            <div class="card-year flex items-center">
                                <i class="far fa-calendar-alt text-xs mr-1 opacity-70"></i> ${yearText}
                            </div>
                            <div class="card-rating flex items-center text-gold-accent">
                                <i class="fas fa-star text-xs mr-1"></i> ${ratingText}
                            </div>
                        </div>
                        ${episodesHTML}
                    </div>
                </div>
            </a>
        `;
    };

    /**
     * Renders content list.
     * Hiển thị danh sách nội dung.
     * @param {Array<object>} items - Items to render. Các mục cần hiển thị.
     * @param {string} type - 'movies' or 'series' (based on current tab). Loại (dựa trên tab hiện tại).
     */
    const renderContentList = (items, type) => {
        if (!movieGrid) return;
        if (observer) observer.disconnect();

        const skeletons = movieGrid.querySelectorAll('.movie-card-skeleton');
        skeletons.forEach(skeleton => skeleton.remove());

        if (items.length === 0) {
            movieGrid.innerHTML = '';
            if (noMoviesFound) {
                noMoviesFound.classList.remove('hidden');
                noMoviesFound.textContent = `Không tìm thấy ${type === 'movies' ? 'phim lẻ/anime movie' : 'phim bộ/anime series'} nào phù hợp.`; // Updated text
            }
        } else {
            if (noMoviesFound) noMoviesFound.classList.add('hidden');
            movieGrid.innerHTML = items.map((item, index) => {
                // Pass the item's actual itemType if available, otherwise use the tab type
                const cardHTML = createItemCard(item, item.itemType || type);
                 const cardWithIndex = cardHTML.replace('<a ', `<a data-index="${index}" `);
                 return cardWithIndex;
            }).join('');
            observeElements(movieGrid.querySelectorAll('.animate-on-scroll'));
        }
    };

    /**
     * Shows skeleton cards.
     * Hiển thị thẻ skeleton.
     */
    const showSkeletonCards = () => {
        if (!movieGrid) return;
        movieGrid.innerHTML = '';
        if(noMoviesFound) noMoviesFound.classList.add('hidden');
        const skeletonCount = 12;
        let skeletonHTML = '';
        for (let i = 0; i < skeletonCount; i++) {
            let hiddenClasses = '';
            if (i >= 2 && i < 3) hiddenClasses = 'hidden sm:block';
            if (i >= 3 && i < 4) hiddenClasses = 'hidden md:block';
            if (i >= 4 && i < 5) hiddenClasses = 'hidden lg:block';
            if (i >= 5) hiddenClasses = 'hidden xl:block';
            skeletonHTML += `
                <div class="movie-card-skeleton ${hiddenClasses}">
                    <div class="skeleton skeleton-image"></div><div class="p-3"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div></div>
                </div>`;
        }
        movieGrid.innerHTML = skeletonHTML;
    };

    /**
     * Updates the Hero UI with the specified item data and animations.
     * Cập nhật UI Hero với dữ liệu từ item và hiệu ứng.
     * @param {object} item - The item to display in the hero. Item hiển thị trong hero.
     */
    const updateHeroUI = (item) => {
        if (!heroSection) return;
        
        // Get required data with fallbacks
        const title = item.title || 'Phim Nổi Bật';
        const description = item.description || 'Không có mô tả.';
        const posterUrl = item.posterUrl || 'https://placehold.co/1920x1080/000000/333333?text=No+Hero+Image';
        const backgroundUrl = item.heroImage || item.backgroundUrl || item.posterUrl || 'https://placehold.co/1920x1080/000000/333333?text=No+Hero+Image';
        const rating = item.rating ? parseFloat(item.rating).toFixed(1) : 'N/A';
        const year = item.releaseYear || 'N/A';
        const type = item.type || (currentContentType === 'series' ? 'Phim bộ' : 'Phim lẻ');
        const duration = item.duration || 'N/A';
        const genres = item.genre || item.genres || [];
        
        // Determine type-specific details
        const itemType = item.itemType || (currentContentType === 'series' ? 'series' : 'movies');
        const isAnime = itemType.includes('anime');
        const detailUrl = isAnime 
            ? `pages/animeDetails.html?id=${item.id}&type=${itemType}`
            : (itemType === 'series' 
                ? `pages/filmDetails_phimBo.html?id=${item.id}&type=${itemType}` 
                : `pages/filmDetail.html?id=${item.id}&type=${itemType}`);
        
        // Clear existing content
        heroSection.innerHTML = '';
        
        // Create new elements
        const heroBg = document.createElement('div');
        heroBg.className = 'hero-bg absolute inset-0';
        heroBg.style.backgroundImage = `url('${backgroundUrl}')`;
        heroBg.style.backgroundSize = 'cover';
        heroBg.style.backgroundPosition = 'center';
        heroBg.style.zIndex = 'var(--z-index-hero-bg)';
        heroBg.style.transform = 'scale(1.1)';
        heroBg.style.transition = 'transform 0.8s ease-out';
        
        const heroOverlay = document.createElement('div');
        heroOverlay.className = 'hero-overlay absolute inset-0';
        heroOverlay.style.zIndex = 'var(--z-index-hero-overlay)';
        heroOverlay.style.background = 'linear-gradient(to top, var(--secondary-color-darker) 0%, var(--secondary-color-darker) 20%, rgba(10, 10, 10, 0.7) 50%, transparent 100%), linear-gradient(to right, var(--secondary-color-darker) 0%, rgba(10, 10, 10, 0.5) 30%, transparent 70%)';
        
        const heroContent = document.createElement('div');
        heroContent.className = 'hero-content relative z-20 max-w-md sm:max-w-lg lg:max-w-xl px-4 pb-8 md:px-0 md:pl-8 lg:pl-16 md:pb-0 text-center md:text-left';
        heroContent.innerHTML = `
            <div class="flex flex-wrap mb-3 stagger-item">
                ${genres.length > 0 
                    ? genres.slice(0, 2).map(genre => 
                        `<span class="hero-badge hero-badge-tertiary mr-2 mb-2">
                            <i class="fas fa-tag mr-1"></i> ${genre}
                        </span>`
                      ).join('')
                    : `<span class="hero-badge hero-badge-primary mr-2 mb-2">
                         <i class="fas fa-star mr-1"></i> Đề Xuất
                       </span>`
                }
                <span class="hero-badge hero-badge-tertiary">
                    <i class="fas fa-certificate mr-1"></i> ${item.isNew ? 'Mới' : (item.isTrending ? 'Thịnh hành' : 'Hot')}
                </span>
            </div>
            
            <h1 id="hero-title" class="stagger-item" style="font-family: var(--font-display); font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 800; letter-spacing: -0.03em; text-shadow: var(--text-glow-primary); margin-bottom: 1rem;">${title}</h1>
            
            <div class="hero-meta mb-3 md:mb-4 flex flex-wrap items-center stagger-item">
                <div class="hero-meta-item mr-4">
                    <i class="far fa-calendar-alt"></i> <span id="hero-year">${year}</span>
                </div>
                <div class="hero-meta-item mr-4">
                    <i class="fas fa-film"></i> <span id="hero-type">${type}</span>
                </div>
                <div class="hero-meta-item hero-rating">
                    <i class="fas fa-star"></i> <span id="hero-rating">${rating}</span>
                </div>
                ${duration !== 'N/A' ? `
                <div class="hero-meta-item hero-duration">
                    <i class="far fa-clock"></i> <span>${duration}</span>
                </div>` : ''}
            </div>
            
            <p id="hero-description" class="text-gray-200 line-clamp-3 sm:line-clamp-4 text-shadow-md stagger-item" style="font-size: clamp(1rem, 2vw, 1.25rem); margin-bottom: 1.5rem;">${description}</p>
            
            <div class="hero-button-container flex flex-wrap gap-3 stagger-item">
                <a href="${detailUrl}" id="hero-play-button" class="hero-play-button text-uppercase py-3 px-6 flex items-center transform transition-transform hover:translate-y-[-2px] hover:scale-105 hover:shadow-lg">
                    <i class="fas fa-play mr-1 md:mr-2" aria-hidden="true"></i> Xem Ngay
                </a>
                <a href="${detailUrl}" id="hero-detail-button" class="hero-detail-button text-uppercase py-3 px-6 flex items-center transform transition-transform hover:translate-y-[-2px] hover:scale-105 hover:shadow-lg">
                    <i class="fas fa-info-circle mr-1 md:mr-2" aria-hidden="true"></i> Chi Tiết
                </a>
            </div>
        `;
        
        // Append elements to hero section
        heroSection.appendChild(heroBg);
        heroSection.appendChild(heroOverlay);
        heroSection.appendChild(heroContent);
        
        // Set aria-label for better accessibility
        heroSection.setAttribute('aria-label', `Phim nổi bật: ${title}`);
        
        // Initialize staggered animations
        const staggerItems = heroContent.querySelectorAll('.stagger-item');
        staggerItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                item.style.transition = 'opacity 0.6s var(--animation-timing), transform 0.6s var(--animation-timing)';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, 100 + (index * 120)); // Staggered delay
        });
        
        // Animate hero background
        setTimeout(() => {
            heroBg.style.transform = 'scale(1.05)';
        }, 300);
    };

    /**
     * Starts the automatic hero slideshow.
     * Bắt đầu trình chiếu Hero tự động.
     */
    const startHeroSlideshow = () => {
        if (heroIntervalId) clearInterval(heroIntervalId);
        if (hotItems.length > 1) {
            heroIntervalId = setInterval(() => {
                currentHeroIndex = (currentHeroIndex + 1) % hotItems.length;
                updateHeroUI(hotItems[currentHeroIndex]);
            }, HERO_SLIDESHOW_INTERVAL);
            console.log(`Hero slideshow started with ${hotItems.length} items.`);
        } else {
            console.log("Hero slideshow not started (less than 2 hot items).");
        }
    };

    /**
     * Updates URL query parameters.
     * Cập nhật tham số truy vấn URL.
     */
    const updateUrlParams = () => {
        const params = new URLSearchParams();
        // Add tab parameter
        if (currentContentType !== 'movies') { // Only add if not the default tab
             params.set('tab', currentContentType);
        }

        const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
        const [defaultMinYear, defaultMaxYear] = defaultYears;

        if (window.currentFilters.genres.length > 0) params.set('genres', window.currentFilters.genres.join(','));

        const [currentMinYear, currentMaxYear] = window.currentFilters.yearRange;
        if (defaultMinYear !== null && currentMinYear !== null && currentMinYear !== defaultMinYear) params.set('minYear', String(currentMinYear));
        if (defaultMaxYear !== null && currentMaxYear !== null && currentMaxYear !== defaultMaxYear) params.set('maxYear', String(currentMaxYear));

        const [currentMinRating, currentMaxRating] = window.currentFilters.ratingRange;
         if (currentMinRating !== null && currentMinRating !== 0) params.set('minRating', currentMinRating.toFixed(1));
         if (currentMaxRating !== null && currentMaxRating !== 10) params.set('maxRating', currentMaxRating.toFixed(1));

        if (window.currentFilters.sort !== 'default') params.set('sort', window.currentFilters.sort);
        if (window.currentFilters.search) params.set('search', window.currentFilters.search);
        if (window.currentFilters.format !== 'all') params.set('format', window.currentFilters.format);

        const newUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
        try { window.history.replaceState({ path: newUrl }, '', newUrl); } catch (e) { console.warn("Could not update URL history:", e); }
        updateClearButtonVisibility();
    };
    window.updateUrlParams = updateUrlParams;

    /**
     * Updates filter tags display.
     * Cập nhật hiển thị thẻ bộ lọc.
     */
    const updateFilterTags = () => {
        if (!filterTagsContainer) return;
        filterTagsContainer.innerHTML = '';
        const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
        const [defaultMinYear, defaultMaxYear] = defaultYears;

        window.currentFilters.genres.forEach(genre => createTag('genre', genre, genre));

        const [minYear, maxYear] = window.currentFilters.yearRange;
        if (defaultMinYear !== null && defaultMaxYear !== null && minYear !== null && maxYear !== null && (minYear !== defaultMinYear || maxYear !== defaultMaxYear)) {
            createTag('year', `${minYear} - ${maxYear}`, `Năm: ${minYear} - ${maxYear}`);
        }

        const [minRating, maxRating] = window.currentFilters.ratingRange;
         if (minRating !== null && maxRating !== null && (minRating !== 0 || maxRating !== 10)) {
            createTag('rating', `${minRating.toFixed(1)} - ${maxRating.toFixed(1)}`, `Điểm: ${minRating.toFixed(1)} - ${maxRating.toFixed(1)}`);
        }

        if (window.currentFilters.format !== 'all') {
            const formatOption = formatFilter?.querySelector(`option[value="${window.currentFilters.format}"]`);
            const formatText = formatOption ? formatOption.textContent : window.currentFilters.format;
            createTag('format', window.currentFilters.format, `Định dạng: ${formatText}`);
        }

        updateClearButtonVisibility();
    };
    window.updateFilterTags = updateFilterTags;

    /**
     * Helper to create a filter tag button.
     * Hàm trợ giúp tạo nút thẻ bộ lọc.
     * @param {string} type - Filter type (genre, year, etc.). Loại bộ lọc.
     * @param {string} value - Filter value. Giá trị bộ lọc.
     * @param {string} label - Display label for the tag. Nhãn hiển thị cho thẻ.
     */
    const createTag = (type, value, label) => {
        const tag = document.createElement('button');
        tag.className = 'filter-tag';
        tag.dataset.filterType = type;
        tag.dataset.filterValue = value; // Store original value for removal
        tag.innerHTML = `<span class="tag-label">${label}</span><span class="material-icons-outlined remove-tag text-sm">close</span>`;
        tag.setAttribute('aria-label', `Xóa bộ lọc ${label}`);
        filterTagsContainer.appendChild(tag);
    };

    /**
     * Sets up the genre filter dropdown.
     * Thiết lập dropdown bộ lọc thể loại.
     */
    const setupGenreFilter = () => {
        if (!window.dataLoaded) {
            if (genreDropdown) genreDropdown.innerHTML = '<div class="p-3 text-sm text-text-muted italic">Đang tải thể loại...</div>';
            return;
        }
        const genres = uniqueGenres[currentContentType] || [];
        if (!genreDropdown || !genreFilterButton) return;
        genreDropdown.innerHTML = '';
        if (genres.length === 0) {
            genreDropdown.innerHTML = '<div class="p-3 text-sm text-text-muted italic">Không có thể loại nào.</div>';
            updateGenreButtonText(); return;
        }
        genres.sort().forEach(genre => {
            const label = document.createElement('label');
            label.className = 'block px-3 py-1.5 hover:bg-gray-600 rounded cursor-pointer flex items-center';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.value = genre; checkbox.className = 'mr-2 accent-primary';
            checkbox.checked = window.currentFilters.genres.includes(genre);
            checkbox.addEventListener('change', handleGenreChange);
            label.appendChild(checkbox); label.appendChild(document.createTextNode(genre));
            genreDropdown.appendChild(label);
        });
        updateGenreButtonText();
    };

    /**
     * Handles genre checkbox changes.
     * Xử lý thay đổi checkbox thể loại.
     * @param {Event} event - Change event. Sự kiện thay đổi.
     */
    const handleGenreChange = (event) => {
        const genre = event.target.value;
        const isChecked = event.target.checked;
        if (isChecked) { if (!window.currentFilters.genres.includes(genre)) window.currentFilters.genres.push(genre); }
        else { window.currentFilters.genres = window.currentFilters.genres.filter(g => g !== genre); }
        updateGenreButtonText(); updateFilterTags(); filterAndSortContent(); updateUrlParams();
    };

    /**
     * Updates genre filter button text.
     * Cập nhật văn bản nút bộ lọc thể loại.
     */
    const updateGenreButtonText = () => {
        if (!genreFilterButton) return;
        const buttonTextSpan = genreFilterButton.querySelector('span');
        if (!buttonTextSpan) return;
        const count = window.currentFilters.genres.length;
        if (count === 0) buttonTextSpan.textContent = 'Chọn thể loại...';
        else if (count === 1) buttonTextSpan.textContent = window.currentFilters.genres[0];
        else buttonTextSpan.textContent = `${count} thể loại đã chọn`;
    };

    /**
     * Initializes or re-initializes sliders.
     * Khởi tạo hoặc khởi tạo lại slider.
     */
    const setupSliders = () => {
         if (!window.dataLoaded) {
             if (yearSliderElement) { yearSliderElement.innerHTML = '<p class="text-xs text-text-muted italic">Đang tải...</p>'; yearSliderElement.setAttribute('disabled', 'true'); if(yearSliderValues) yearSliderValues.textContent = 'N/A'; }
             if (ratingSliderElement) { ratingSliderElement.innerHTML = '<p class="text-xs text-text-muted italic">Đang tải...</p>'; ratingSliderElement.setAttribute('disabled', 'true'); if(ratingSliderValues) ratingSliderValues.textContent = 'N/A'; }
            return;
         }
         const [minYear, maxYear] = minMaxYears[currentContentType] || [null, null];
         const ratingMin = 0, ratingMax = 10;

         // Year Slider
         if (yearSliderInstance) yearSliderInstance.destroy(); yearSliderInstance = null;
         if (yearSliderElement && minYear !== null && maxYear !== null && minYear <= maxYear) {
             yearSliderElement.innerHTML = '';
             try {
                 yearSliderInstance = noUiSlider.create(yearSliderElement, { range: { 'min': minYear, 'max': maxYear }, start: [window.currentFilters.yearRange[0] ?? minYear, window.currentFilters.yearRange[1] ?? maxYear], connect: true, step: 1, format: wNumb({ decimals: 0 }), behaviour: 'tap-drag' });
                 yearSliderInstance.on('update', debounceFilter((values) => {
                     const newMinYear = parseInt(values[0]), newMaxYear = parseInt(values[1]);
                     // Only trigger filter/update if values actually changed significantly
                     if (newMinYear !== window.currentFilters.yearRange[0] || newMaxYear !== window.currentFilters.yearRange[1]) {
                         window.currentFilters.yearRange = [newMinYear, newMaxYear];
                         if (yearSliderValues) yearSliderValues.textContent = `${values[0]} - ${values[1]}`;
                         updateFilterTags(); filterAndSortContent(); updateUrlParams();
                     }
                 }, 300));
                 // Set initial display value
                 const initialYearValues = yearSliderInstance.get();
                 if (yearSliderValues) yearSliderValues.textContent = `${initialYearValues[0]} - ${initialYearValues[1]}`;
                 yearSliderElement.removeAttribute('disabled');
             } catch (error) { console.error("Error creating year slider:", error); if (yearSliderValues) yearSliderValues.textContent = 'Lỗi'; yearSliderElement.innerHTML = '<p class="text-xs text-red-400 italic">Lỗi slider.</p>'; yearSliderElement.setAttribute('disabled', 'true'); }
         } else if (yearSliderElement) { yearSliderElement.innerHTML = '<p class="text-xs text-text-muted italic">Không đủ dữ liệu năm.</p>'; if (yearSliderValues) yearSliderValues.textContent = 'N/A'; yearSliderElement.setAttribute('disabled', 'true'); }

         // Rating Slider
         if (ratingSliderInstance) ratingSliderInstance.destroy(); ratingSliderInstance = null;
         if (ratingSliderElement) {
             ratingSliderElement.innerHTML = '';
             try {
                 ratingSliderInstance = noUiSlider.create(ratingSliderElement, { range: { 'min': ratingMin, 'max': ratingMax }, start: [window.currentFilters.ratingRange[0] ?? ratingMin, window.currentFilters.ratingRange[1] ?? ratingMax], connect: true, step: 0.1, format: wNumb({ decimals: 1 }), behaviour: 'tap-drag' });
                 ratingSliderInstance.on('update', debounceFilter((values) => {
                     const newMinRating = parseFloat(values[0]), newMaxRating = parseFloat(values[1]);
                      // Only trigger filter/update if values actually changed significantly
                     if (newMinRating.toFixed(1) !== window.currentFilters.ratingRange[0].toFixed(1) || newMaxRating.toFixed(1) !== window.currentFilters.ratingRange[1].toFixed(1)) {
                         window.currentFilters.ratingRange = [newMinRating, newMaxRating];
                         if (ratingSliderValues) ratingSliderValues.textContent = `${values[0]} - ${values[1]}`;
                         updateFilterTags(); filterAndSortContent(); updateUrlParams();
                     }
                 }, 300));
                 // Set initial display value
                 const initialRatingValues = ratingSliderInstance.get();
                 if (ratingSliderValues) ratingSliderValues.textContent = `${initialRatingValues[0]} - ${initialRatingValues[1]}`;
                 ratingSliderElement.removeAttribute('disabled');
             } catch (error) { console.error("Error creating rating slider:", error); if (ratingSliderValues) ratingSliderValues.textContent = 'Lỗi'; ratingSliderElement.innerHTML = '<p class="text-xs text-red-400 italic">Lỗi slider.</p>'; ratingSliderElement.setAttribute('disabled', 'true'); }
         } else if (ratingSliderElement) { if (ratingSliderValues) ratingSliderValues.textContent = 'N/A'; ratingSliderElement.setAttribute('disabled', 'true'); }
    };


    /**
     * Handles removing a filter tag.
     * Xử lý xóa thẻ bộ lọc.
     * @param {Event} event - Click event. Sự kiện nhấp chuột.
     */
    const handleRemoveTag = (event) => {
        const tagButton = event.target.closest('.filter-tag');
        if (!tagButton) return;
        const filterType = tagButton.dataset.filterType;
        const filterValue = tagButton.dataset.filterValue;
        const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
        const [defaultMinYear, defaultMaxYear] = defaultYears;

        switch (filterType) {
            case 'genre':
                window.currentFilters.genres = window.currentFilters.genres.filter(g => g !== filterValue);
                const checkbox = genreDropdown?.querySelector(`input[value="${filterValue}"]`); if (checkbox) checkbox.checked = false; updateGenreButtonText(); break;
            case 'year':
                if (defaultMinYear !== null && defaultMaxYear !== null) { window.currentFilters.yearRange = [defaultMinYear, defaultMaxYear]; if (yearSliderInstance) yearSliderInstance.set([defaultMinYear, defaultMaxYear]); }
                else { window.currentFilters.yearRange = [null, null]; if (yearSliderValues) yearSliderValues.textContent = 'Tất cả'; } break;
            case 'rating':
                window.currentFilters.ratingRange = [0, 10]; if (ratingSliderInstance) ratingSliderInstance.set([0, 10]); else if (ratingSliderValues) ratingSliderValues.textContent = 'Tất cả'; break;
            case 'format':
                window.currentFilters.format = 'all'; if (formatFilter) formatFilter.value = 'all'; break;
        }
        updateFilterTags(); filterAndSortContent(); updateUrlParams(); updateClearButtonVisibility();
    };

    /**
     * Updates visibility of the "Clear All" button.
     * Cập nhật khả năng hiển thị nút "Xóa tất cả".
     */
    const updateClearButtonVisibility = () => {
        if (!clearFiltersButton) return;
        const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
        const [defaultMinYear, defaultMaxYear] = defaultYears;
        const [minYear, maxYear] = window.currentFilters.yearRange;
        const [minRating, maxRating] = window.currentFilters.ratingRange;
        const isGenreFiltered = window.currentFilters.genres.length > 0;
        const isYearFiltered = defaultMinYear !== null && defaultMaxYear !== null ? (minYear !== defaultMinYear || maxYear !== defaultMaxYear) : (minYear !== null || maxYear !== null);
        const isRatingFiltered = (minRating !== 0 || maxRating !== 10);
        const isSortFiltered = window.currentFilters.sort !== 'default';
        const isSearchFiltered = window.currentFilters.search !== '';
        const isFormatFiltered = window.currentFilters.format !== 'all';
        const hasActiveFilters = isGenreFiltered || isYearFiltered || isRatingFiltered || isSortFiltered || isSearchFiltered || isFormatFiltered;
        clearFiltersButton.classList.toggle('hidden', !hasActiveFilters);
        clearFiltersButton.setAttribute('aria-hidden', String(!hasActiveFilters));
    };

    /**
     * Handles clearing all active filters.
     * Xử lý xóa tất cả bộ lọc đang hoạt động.
     */
    const handleClearFilters = () => {
        const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
        const [defaultMinYear, defaultMaxYear] = defaultYears;
        window.currentFilters = { genres: [], yearRange: [defaultMinYear, defaultMaxYear], ratingRange: [0, 10], sort: 'default', search: '', format: 'all' };
        const searchInputDesktop = document.getElementById('search-input-desktop'); const searchInputMobile = document.getElementById('search-input-mobile');
        if (searchInputDesktop) searchInputDesktop.value = ''; if (searchInputMobile) searchInputMobile.value = '';
        if (sortFilter) sortFilter.value = 'default'; if (formatFilter) formatFilter.value = 'all';
        genreDropdown?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false); updateGenreButtonText();
        if (yearSliderInstance && defaultMinYear !== null && defaultMaxYear !== null) { yearSliderInstance.set([defaultMinYear, defaultMaxYear]); if (yearSliderValues) yearSliderValues.textContent = `${defaultMinYear} - ${defaultMaxYear}`; } else if (yearSliderValues) yearSliderValues.textContent = 'Tất cả';
        if (ratingSliderInstance) { ratingSliderInstance.set([0, 10]); if (ratingSliderValues) ratingSliderValues.textContent = '0.0 - 10.0'; } else if (ratingSliderValues) ratingSliderValues.textContent = 'Tất cả';
        updateFilterTags(); filterAndSortContent(); updateUrlParams(); updateClearButtonVisibility();
        console.log("All filters cleared.");
    };

    /**
     * Filters and sorts content based on current state.
     * Lọc và sắp xếp nội dung dựa trên trạng thái hiện tại.
     */
    const filterAndSortContent = () => {
        if (!window.dataLoaded) { showSkeletonCards(); return; }
        showSkeletonCards();
        const dataPool = currentContentType === 'movies' ? window.allMovies : window.allSeries;
        const { search, genres: selectedGenres, yearRange, ratingRange, sort: selectedSort, format: selectedFormat } = window.currentFilters;
        const [minYear, maxYear] = yearRange;
        const [minRating, maxRating] = ratingRange;
        let filtered = [...dataPool]; // Create a copy to filter
        let gridTitleText = currentContentType === 'movies' ? "Phim Lẻ & Anime Movie" : "Phim Bộ & Anime Series"; // Updated title
        let filterDescriptions = [];

        if (search) {
            filtered = filtered.filter(item => item.title && item.title.toLowerCase().includes(search));
            gridTitleText = `Kết quả tìm kiếm cho "${search}"`;
        }
        if (selectedGenres.length > 0) {
            filtered = filtered.filter(item => { const itemGenres = Array.isArray(item.genre) ? item.genre : []; return selectedGenres.some(g => itemGenres.includes(g)); });
            if (!search) filterDescriptions.push(`Thể loại: ${selectedGenres.join(', ')}`);
        }
        if (selectedFormat !== 'all') {
            filtered = filtered.filter(item => Array.isArray(item.format) && item.format.includes(selectedFormat));
            const formatOption = formatFilter?.querySelector(`option[value="${selectedFormat}"]`);
            if (formatOption) filterDescriptions.push(`Định dạng: ${formatOption.textContent}`);
        }
        const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
        const [defaultMinYear, defaultMaxYear] = defaultYears;
        if (defaultMinYear !== null && defaultMaxYear !== null && minYear !== null && maxYear !== null && (minYear !== defaultMinYear || maxYear !== defaultMaxYear)) {
            filtered = filtered.filter(item => item.releaseYear && typeof item.releaseYear === 'number' && item.releaseYear >= minYear && item.releaseYear <= maxYear);
            filterDescriptions.push(`Năm: ${minYear}-${maxYear}`);
        }
        if (minRating !== null && maxRating !== null && (minRating !== 0 || maxRating !== 10)) {
            filtered = filtered.filter(item => typeof item.rating === 'number' && item.rating >= minRating && item.rating <= maxRating);
            filterDescriptions.push(`Điểm: ${minRating.toFixed(1)}-${maxRating.toFixed(1)}`);
        }

        if (movieGridTitle) {
             movieGridTitle.textContent = filterDescriptions.length > 0 ? `${gridTitleText} (${filterDescriptions.join('; ')})` : gridTitleText;
        }

        switch (selectedSort) {
            case 'newest': filtered.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0)); break;
            case 'rating_desc': filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
            case 'rating_asc': filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0)); break;
            case 'title_asc': filtered.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
            case 'title_desc': filtered.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
        }

        setTimeout(() => renderContentList(filtered, currentContentType), 150);
    };
    window.filterAndSortContent = filterAndSortContent; // Expose globally

    /**
     * Handles sort dropdown change.
     * Xử lý thay đổi dropdown sắp xếp.
     */
    const handleFilterChange = () => {
        window.currentFilters.sort = sortFilter?.value || 'default';
        filterAndSortContent(); updateUrlParams(); updateFilterTags();
    };
    window.handleFilterChange = handleFilterChange;

    /**
     * Handles format dropdown change.
     * Xử lý thay đổi dropdown định dạng.
     */
    const handleFormatChange = () => {
        window.currentFilters.format = formatFilter?.value || 'all';
        filterAndSortContent(); updateUrlParams(); updateFilterTags();
    };

    /**
     * Initializes Intersection Observer.
     * Khởi tạo Intersection Observer.
     */
    const initObserver = () => {
        if (!('IntersectionObserver' in window)) { document.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('is-visible')); return; }
        const options = { root: null, rootMargin: '0px', threshold: 0.1 };
        observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delayIndex = parseInt(entry.target.dataset.index || '0', 10);
                    entry.target.style.animationDelay = `${delayIndex * 100}ms`;
                    entry.target.classList.add('is-visible');
                    // observerInstance.unobserve(entry.target); // Keep observing if content reloads
                }
            });
        }, options);
        // Initially observe elements already in view
        observeElements(document.querySelectorAll('.animate-on-scroll'));
    };

    /**
     * Observes elements.
     * Quan sát các phần tử.
     * @param {NodeListOf<Element>} elements - Elements to observe. Các phần tử cần quan sát.
     */
    const observeElements = (elements) => {
        if (!observer) return;
        elements.forEach((el) => {
             // Only observe if it has the class and hasn't been made visible yet
            if (el.classList.contains('animate-on-scroll') && !el.classList.contains('is-visible')) {
                 observer.observe(el);
            }
        });
    };


    /**
     * Switches between tabs with animated indicator.
     * Chuyển đổi giữa các tab với chỉ báo được hoạt ảnh.
     * @param {string} newType - The new tab type 'movies' or 'series'. Loại tab mới 'movies' hoặc 'series'.
     */
    const switchTab = (newType) => {
        if (newType === currentContentType || !movieGrid || !movieGridSection) return;
        const oldType = currentContentType; currentContentType = newType;
        const slideOutClass = oldType === 'movies' ? 'slide-out-left' : 'slide-out-right';
        const slideInClass = newType === 'movies' ? 'slide-in-from-right' : 'slide-in-from-left';

        // Update tab indicator
        const activeTabIndicator = document.getElementById('active-tab-indicator');
        const activeTabButton = newType === 'movies' ? tabMovies : tabSeries;
        
        if (activeTabIndicator && activeTabButton) {
            // Get the position and width of the active tab
            const tabRect = activeTabButton.getBoundingClientRect();
            const tabsContainerRect = tabsContainer.getBoundingClientRect();
            
            // Set the position and width of the indicator
            activeTabIndicator.style.left = `${tabRect.left - tabsContainerRect.left}px`;
            activeTabIndicator.style.width = `${tabRect.width}px`;
        }

        // Add classes for transition
        movieGrid.classList.remove('is-visible'); // Remove visibility class to allow transition
        movieGrid.classList.add(slideOutClass);

        // Wait for transition to complete before changing content
        setTimeout(() => {
            // Update active tab button styles
            if (tabMovies) { 
                tabMovies.classList.toggle('active', newType === 'movies'); 
                tabMovies.setAttribute('aria-selected', String(newType === 'movies'));
                tabMovies.style.color = newType === 'movies' ? 'var(--primary-color)' : 'var(--text-gray-300)';
            }
            if (tabSeries) { 
                tabSeries.classList.toggle('active', newType === 'series'); 
                tabSeries.setAttribute('aria-selected', String(newType === 'series'));
                tabSeries.style.color = newType === 'series' ? 'var(--primary-color)' : 'var(--text-gray-300)';
            }

            // Reset filters based on the new content type's default year range
            const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
            window.currentFilters = { genres: [], yearRange: [defaultYears[0], defaultYears[1]], ratingRange: [0, 10], sort: 'default', search: '', format: 'all' };

            // Reset UI filter controls
            const searchInputDesktop = document.getElementById('search-input-desktop'); const searchInputMobile = document.getElementById('search-input-mobile');
            if (searchInputDesktop) searchInputDesktop.value = ''; if (searchInputMobile) searchInputMobile.value = '';
            if (sortFilter) sortFilter.value = 'default'; if (formatFilter) formatFilter.value = 'all';
            genreDropdown?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false); updateGenreButtonText();

            // Reset sliders
             if (yearSliderInstance && defaultYears[0] !== null && defaultYears[1] !== null) {
                 yearSliderInstance.set([defaultYears[0], defaultYears[1]]);
                 if (yearSliderValues) yearSliderValues.textContent = `${defaultYears[0]} - ${defaultYears[1]}`;
             } else if (yearSliderValues) { yearSliderValues.textContent = 'Tất cả'; }
             if (ratingSliderInstance) {
                 ratingSliderInstance.set([0, 10]);
                 if (ratingSliderValues) ratingSliderValues.textContent = '0.0 - 10.0';
             } else if (ratingSliderValues) { ratingSliderValues.textContent = 'Tất cả'; }


            // Update tags, show skeletons, apply filters for the new content type
            updateFilterTags();
            showSkeletonCards();
            // Remove old slide-out class and add new slide-in class
            movieGrid.classList.remove(slideOutClass);
            movieGrid.classList.add(slideInClass);
            // Re-apply filters for the new tab's data
            filterAndSortContent();

            // Force reflow and add visibility class to trigger slide-in animation
            void movieGrid.offsetWidth;
            movieGrid.classList.add('is-visible');

            // Clean up slide-in class after animation
            setTimeout(() => {
                if (movieGrid) movieGrid.classList.remove(slideInClass);
            }, TAB_TRANSITION_DURATION);

            // Update URL
            updateUrlParams();

        }, TAB_TRANSITION_DURATION); // Match this duration to the CSS transition duration
        console.log(`Switching tab to: ${newType}`);
    };


     /**
      * Reads URL parameters and applies filters on load.
      * Đọc tham số URL và áp dụng bộ lọc khi tải.
      * @returns {boolean} - True if any filters were applied from URL. True nếu có bộ lọc nào được áp dụng từ URL.
      */
     const readUrlParamsAndApplyFilters = () => {
         const params = new URLSearchParams(window.location.search);
         const tabParam = params.get('tab');
         const genresParam = params.get('genres'); const minYearParam = params.get('minYear'); const maxYearParam = params.get('maxYear');
         const minRatingParam = params.get('minRating'); const maxRatingParam = params.get('maxRating'); const sortParam = params.get('sort');
         const searchParam = params.get('search'); const formatParam = params.get('format');
         let filtersChanged = false;

         // Set initial tab based on URL param
         if (tabParam === 'series' && tabSeries) {
             currentContentType = 'series';
             if (tabMovies) { tabMovies.classList.remove('active'); tabMovies.setAttribute('aria-selected', 'false'); }
             tabSeries.classList.add('active'); tabSeries.setAttribute('aria-selected', 'true');
             filtersChanged = true; // Tab change counts as a filter change
         } else {
             currentContentType = 'movies'; // Default to movies
             if (tabMovies) { tabMovies.classList.add('active'); tabMovies.setAttribute('aria-selected', 'true'); }
             if (tabSeries) { tabSeries.classList.remove('active'); tabSeries.setAttribute('aria-selected', 'false'); }
         }

         const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
         const initialFilters = { genres: [], yearRange: [defaultYears[0], defaultYears[1]], ratingRange: [0, 10], sort: 'default', search: '', format: 'all' };

         if (genresParam) { initialFilters.genres = genresParam.split(',').map(g => g.trim()).filter(Boolean); filtersChanged = true; }
         const parsedMinYear = minYearParam ? parseInt(minYearParam) : null; const parsedMaxYear = maxYearParam ? parseInt(maxYearParam) : null;
         // Only apply year range if default years are available
         if (defaultYears[0] !== null && defaultYears[1] !== null) {
              initialFilters.yearRange[0] = parsedMinYear !== null ? parsedMinYear : defaultYears[0];
              initialFilters.yearRange[1] = parsedMaxYear !== null ? parsedMaxYear : defaultYears[1];
              if ((parsedMinYear !== null && parsedMinYear !== defaultYears[0]) || (parsedMaxYear !== null && parsedMaxYear !== defaultYears[1])) filtersChanged = true;
         } else {
              // If default years aren't available yet, just store the parsed values
              initialFilters.yearRange[0] = parsedMinYear;
              initialFilters.yearRange[1] = parsedMaxYear;
              if (parsedMinYear !== null || parsedMaxYear !== null) filtersChanged = true;
         }


         const parsedMinRating = minRatingParam ? parseFloat(minRatingParam) : null; const parsedMaxRating = maxRatingParam ? parseFloat(maxRatingParam) : null;
         if (parsedMinRating !== null) initialFilters.ratingRange[0] = parsedMinRating; if (parsedMaxRating !== null) initialFilters.ratingRange[1] = parsedMaxRating;
         if ((parsedMinRating !== null && parsedMinRating !== 0) || (parsedMaxRating !== null && parsedMaxRating !== 10)) filtersChanged = true;
         if (sortParam) { initialFilters.sort = sortParam; if (sortFilter) sortFilter.value = sortParam; filtersChanged = true; }
         if (searchParam) { initialFilters.search = searchParam.trim().toLowerCase(); const searchInputDesktop = document.getElementById('search-input-desktop'); const searchInputMobile = document.getElementById('search-input-mobile'); if(searchInputDesktop) searchInputDesktop.value = searchParam; if(searchInputMobile) searchInputMobile.value = searchParam; filtersChanged = true; }
         if (formatParam) { initialFilters.format = formatParam; if (formatFilter) formatFilter.value = formatParam; filtersChanged = true; }

         window.currentFilters = initialFilters;
         console.log("Initial filters loaded:", JSON.stringify(window.currentFilters));

         // Setup filters and render based on the initial state
         setupGenreFilter(); // Sets up genres for the current tab
         setupSliders(); // Sets up sliders for the current tab
         updateFilterTags(); // Updates tags based on currentFilters
         filterAndSortContent(); // Filters and renders based on currentFilters and currentContentType
         updateClearButtonVisibility();

         return filtersChanged;
     };


    // --- Event Listeners Setup ---
    if (sortFilter) sortFilter.addEventListener('change', handleFilterChange);
    if (formatFilter) formatFilter.addEventListener('change', handleFormatChange);
    if (tabsContainer) { // Add listener to the container for delegation
        tabsContainer.addEventListener('click', (event) => {
            const target = event.target.closest('.tab-button');
            if (target) {
                if (target.id === 'tab-movies') switchTab('movies');
                else if (target.id === 'tab-series') switchTab('series');
            }
        });
    }
    if (filterTagsContainer) filterTagsContainer.addEventListener('click', handleRemoveTag);
    if (clearFiltersButton) clearFiltersButton.addEventListener('click', handleClearFilters);
    // Other listeners (genre button, nav links, mobile menu, click outside) are in index.html inline script

    // --- Initial Data Load and Application Setup ---
    const initializeApp = async () => {
        showSkeletonCards(); window.dataLoaded = false;
        try {
            console.log("Fetching all data...");
            const [moviesResponse, seriesResponse, animeResponse] = await Promise.all([
                fetch('json/filmData.json').catch(e => ({ ok: false, error: e })),
                fetch('json/filmData_phimBo.json').catch(e => ({ ok: false, error: e })),
                fetch('json/animeData.json').catch(e => ({ ok: false, error: e })) // Fetch anime data
            ]);

            // Process responses, default to empty array on error
            // Xử lý phản hồi, mặc định là mảng trống nếu có lỗi
            const moviesData = moviesResponse.ok ? await moviesResponse.json() : [];
            const seriesData = seriesResponse.ok ? await seriesResponse.json() : [];
            const animeData = animeResponse.ok ? await animeResponse.json() : [];

            if (!moviesResponse.ok) console.error("Error fetching movies:", moviesResponse.error || `Status: ${moviesResponse.status}`);
            if (!seriesResponse.ok) console.error("Error fetching series:", seriesResponse.error || `Status: ${seriesResponse.status}`);
            if (!animeResponse.ok) console.error("Error fetching anime:", animeResponse.error || `Status: ${animeResponse.status}`);

            // Combine and assign to global scope based on itemType
            // Kết hợp và gán vào phạm vi toàn cục dựa trên itemType
            window.allMovies = [
                ...(moviesData || []).map(item => ({ ...item, itemType: item.itemType || 'movies' })), // Ensure itemType exists
                ...(animeData || []).filter(item => item.itemType === 'anime-movie').map(item => ({ ...item, itemType: 'anime-movie' })) // Keep anime movie itemType
            ];
            window.allSeries = [
                ...(seriesData || []).map(item => ({ ...item, itemType: item.itemType || 'series' })), // Ensure itemType exists
                ...(animeData || []).filter(item => item.itemType === 'anime-series').map(item => ({ ...item, itemType: 'anime-series' })) // Keep anime series itemType
            ];
            window.dataLoaded = true;
            console.log("Combined Movies (incl. Anime Movies):", window.allMovies.length);
            console.log("Combined Series (incl. Anime Series):", window.allSeries.length);

            // Prepare Hero Slideshow Data from ALL sources
            // Chuẩn bị dữ liệu Hero Slideshow từ TẤT CẢ các nguồn
            const allItemsForHero = [
                 ...window.allMovies, // Use combined data
                 ...window.allSeries  // Use combined data
            ];
            hotItems = allItemsForHero
                .filter(item => item.isHot === true && typeof item.hotnumber === 'number')
                .sort((a, b) => a.hotnumber - b.hotnumber);
            console.log("Hot items for hero:", hotItems.length);

            // Calculate dynamic values (Years and Genres)
            // Tính toán các giá trị động (Năm và Thể loại)
             const calculateMinMaxYears = (data) => {
                 let min = Infinity, max = -Infinity;
                 data.forEach(item => { if (item.releaseYear && typeof item.releaseYear === 'number') { min = Math.min(min, item.releaseYear); max = Math.max(max, item.releaseYear); } });
                 const currentYear = new Date().getFullYear();
                 // Provide reasonable fallbacks if no year data is found
                 const finalMin = (min === Infinity || min > currentYear) ? currentYear - 20 : min;
                 const finalMax = (max === -Infinity || max < finalMin) ? currentYear : max;
                 return [finalMin, finalMax];
             };
             minMaxYears.movies = calculateMinMaxYears(window.allMovies);
             minMaxYears.series = calculateMinMaxYears(window.allSeries);
             console.log("Min/Max Years Movies:", minMaxYears.movies);
             console.log("Min/Max Years Series:", minMaxYears.series);


            const extractUniqueGenres = (data) => {
                const genres = new Set();
                data.forEach(item => {
                    // Handle both array and string formats for genres/genre
                    if (Array.isArray(item.genres)) {
                        item.genres.forEach(genre => genres.add(genre));
                    } else if (Array.isArray(item.genre)) {
                        item.genre.forEach(genre => genres.add(genre));
                    } else if (typeof item.genres === 'string') {
                        genres.add(item.genres);
                    } else if (typeof item.genre === 'string') {
                        genres.add(item.genre);
                    }
                });
                return Array.from(genres);
            };
            uniqueGenres.movies = extractUniqueGenres(window.allMovies);
            uniqueGenres.series = extractUniqueGenres(window.allSeries);
             console.log("Unique Genres Movies:", uniqueGenres.movies.length);
             console.log("Unique Genres Series:", uniqueGenres.series.length);


            // Read URL params, apply filters, and render content
            // Đọc tham số URL, áp dụng bộ lọc và hiển thị nội dung
            const filtersApplied = readUrlParamsAndApplyFilters();
            if (!filtersApplied && hotItems.length > 0) {
                updateHeroUI(hotItems[0]); // Set initial hero if no filters applied
                startHeroSlideshow();
            }

            // Initialize tab indicator
            const activeTabIndicator = document.getElementById('active-tab-indicator');
            const activeTabButton = currentContentType === 'movies' ? tabMovies : tabSeries;
            
            if (activeTabIndicator && activeTabButton && tabsContainer) {
                // Get the position and width of the active tab
                const tabRect = activeTabButton.getBoundingClientRect();
                const containerRect = tabsContainer.getBoundingClientRect();
                
                // Set the position and width of the indicator
                activeTabIndicator.style.left = `${tabRect.left - containerRect.left}px`;
                activeTabIndicator.style.width = `${tabRect.width}px`;
                
                // Set the color of the active tab
                activeTabButton.style.color = 'var(--primary-color)';
            }

            // Init Intersection Observer for lazy loading animations
            initObserver();

        } catch (error) {
            console.error("Error initializing app:", error);
            if (movieGrid) movieGrid.innerHTML = `<p class="text-red-500 col-span-full text-center py-8">Đã xảy ra lỗi khi tải dữ liệu. Vui lòng làm mới trang hoặc thử lại sau.</p>`;
        }
    };

    initializeApp();
    console.log("Trang chủ web xem phim đã sẵn sàng (v1.9)!");

    // Create Suggestion Item
    const createSuggestionItem = (item, type, searchTerm) => {
        let detailPageUrl = '#';
        const itemType = item.itemType || type;
        if (itemType === 'anime-series' || itemType === 'anime-movie') {
            detailPageUrl = `pages/animeDetails.html?id=${item.id}&type=${itemType}`;
        } else if (itemType === 'series') {
            detailPageUrl = `pages/filmDetails_phimBo.html?id=${item.id}&type=series`;
        } else { // movies
            detailPageUrl = `pages/filmDetail.html?id=${item.id}&type=movies`;
        }
        
        const altText = `Poster nhỏ của ${itemType.includes('anime') ? 'Anime' : (itemType === 'movies' ? 'phim' : 'phim bộ')} ${item.title || 'không có tiêu đề'}`;
        const posterSrc = item.posterUrl || 'https://placehold.co/40x60/111111/eeeeee?text=N/A';
        const title = item.title || 'Không có tiêu đề';
        const year = item.releaseYear || 'N/A';
        const rating = item.rating ? parseFloat(item.rating).toFixed(1) : 'N/A';
        const typeLabel = itemType === 'series' ? 'Phim Bộ' : 
                         (itemType === 'anime-series' ? 'Anime Series' : 
                         (itemType === 'anime-movie' ? 'Anime Movie' : 'Phim Lẻ'));
        const highlightedTitle = highlightTerm(title, searchTerm);

        return `
            <a href="${detailPageUrl}" class="suggestion-item" data-item-id="${item.id}" data-item-type="${itemType}" role="option" aria-label="Xem chi tiết ${title || ''}">
                <img src="${posterSrc}" alt="${altText}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/40x60/111111/eeeeee?text=Err'; this.alt='Lỗi tải ảnh nhỏ ${title || ''}';">
                <div class="suggestion-item-info">
                    <span class="suggestion-item-title">${highlightedTitle}</span>
                    <div class="suggestion-item-meta">
                        <span class="suggestion-item-year"><i class="far fa-calendar-alt"></i>${year}</span>
                        <span class="suggestion-item-type"><i class="fas fa-film"></i>${typeLabel}</span>
                    </div>
                </div>
            </a>`;
    };

    // Display Search Suggestions
    const displaySearchSuggestions = (searchTerm, inputElement, suggestionsContainer) => {
        if (!suggestionsContainer) return;
        
        const placeholder = suggestionsContainer.querySelector('.no-suggestions-placeholder');
        
        if (!searchTerm) {
            suggestionsContainer.classList.remove('visible');
            inputElement.setAttribute('aria-expanded', 'false');
            if (placeholder) placeholder.textContent = 'Nhập để tìm kiếm...';
            return;
        }
        
        if (placeholder) placeholder.textContent = 'Đang tìm...';
        suggestionsContainer.innerHTML = '';
        
        if (!window.dataLoaded) {
            suggestionsContainer.innerHTML = `<div class="no-suggestions-placeholder">Dữ liệu đang tải...</div>`;
            suggestionsContainer.classList.add('visible');
            inputElement.setAttribute('aria-expanded', 'true');
            return;
        }

        // Combine all data for suggestions
        const allSuggestItems = [
            ...(window.allMovies || []).map(item => ({ ...item, itemType: item.itemType || 'movies' })),
            ...(window.allSeries || []).map(item => ({ ...item, itemType: item.itemType || 'series' }))
        ];

        const matchedItems = allSuggestItems
            .filter(item => item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
            .slice(0, 7);

        if (matchedItems.length > 0) {
            suggestionsContainer.innerHTML = matchedItems
                .map(item => createSuggestionItem(item, item.itemType, searchTerm))
                .join('');
            suggestionsContainer.classList.add('visible');
            inputElement.setAttribute('aria-expanded', 'true');
        } else {
            suggestionsContainer.innerHTML = `<div class="no-suggestions-placeholder">Không tìm thấy kết quả nào.</div>`;
            suggestionsContainer.classList.add('visible');
            inputElement.setAttribute('aria-expanded', 'true');
        }
    };

    // Hide Search Suggestions
    const hideAllSearchSuggestions = () => {
        const suggestionsContainers = document.querySelectorAll('.search-suggestions');
        const searchInputs = document.querySelectorAll('.search-input');
        
        suggestionsContainers.forEach(container => {
            container.classList.remove('visible');
        });
        
        searchInputs.forEach(input => {
            input.setAttribute('aria-expanded', 'false');
        });
    };
    window.hideAllSearchSuggestions = hideAllSearchSuggestions;

}); // End DOMContentLoaded
