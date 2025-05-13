// script.js - Updated for Advanced Filters, Tags, URL Params, Sliders, Tab Transitions, Responsiveness, Error Handling, Filter Toggle, Format Filter, Hero Slideshow, and **Combined JSON Loading**
// v2.0: Added episode count display for series/anime-series cards.

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
    // const heroTitle = document.getElementById('hero-title'); // Managed by updateHeroUI
    // const heroDescription = document.getElementById('hero-description'); // Managed by updateHeroUI
    // const heroPlayButton = document.getElementById('hero-play-button'); // Managed by updateHeroUI
    // const heroDetailButton = document.getElementById('hero-detail-button'); // Managed by updateHeroUI
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
    let currentContentType = 'movies'; 
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
    const HERO_SLIDESHOW_INTERVAL = 7000; 

    // --- Helper Functions ---
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
        let detailPageUrl = '#';
        const itemType = item.itemType || type; 

        if (itemType === 'anime-series' || itemType === 'anime-movie') {
            detailPageUrl = `pages/animeDetails.html?id=${item.id}&type=${itemType}`;
        } else if (itemType === 'series') {
            detailPageUrl = `pages/filmDetails_phimBo.html?id=${item.id}&type=series`;
        } else { 
            detailPageUrl = `pages/filmDetail.html?id=${item.id}&type=movies`;
        }

        const altText = `Poster ${itemType.includes('anime') ? 'Anime' : (itemType === 'movies' ? 'phim' : 'phim bộ')} ${item.title || 'không có tiêu đề'}, năm ${item.releaseYear || 'không rõ'}`;
        const posterUrl = item.posterUrl || 'https://placehold.co/300x450/111111/eeeeee?text=No+Poster';
        const titleText = item.title || 'Không có tiêu đề';
        const yearText = item.releaseYear || 'N/A';
        const ratingText = item.rating ? parseFloat(item.rating).toFixed(1) : 'N/A';
        const displayTitle = window.currentFilters.search && typeof SearchUtils !== 'undefined' ? SearchUtils.highlightTerm(titleText, window.currentFilters.search) : titleText;
        const format = item.format || []; 
        const isAnime = itemType.includes('anime');
        
        const cardClass = isAnime ? 'anime-card stagger-item' : 'movie-card stagger-item'; // Use stagger-item for potential future animation
        
        let badgesHTML = '';
        if (itemType === 'series' || itemType === 'anime-series') {
            badgesHTML += `<span class="card-badge card-badge-top-right badge-series">Bộ</span>`;
        } else if (itemType === 'anime-movie') {
            badgesHTML += `<span class="card-badge card-badge-top-right badge-anime">Anime</span>`; // Specific for Anime Movie
        } else if (itemType === 'movies') {
             badgesHTML += `<span class="card-badge card-badge-top-right badge-movie">Lẻ</span>`;
        }

        if (format.includes("3D")) {
            badgesHTML += `<span class="card-badge card-badge-top-left badge-3d">3D</span>`;
        } else if (format.includes("2D")) {
            badgesHTML += `<span class="card-badge card-badge-top-left badge-2d">2D</span>`;
        } else if (format.includes("Animation") && !format.includes("2D") && !format.includes("3D") && !isAnime) { // Avoid double "Animation" if it's Anime
            badgesHTML += `<span class="card-badge card-badge-top-left badge-animation">Hoạt Hình</span>`;
        }
        
        let episodesHTML = '';
        if (itemType === 'series' || itemType === 'anime-series') {
            let episodeCount = '?'; 
            if (item.totalEpisodes) {
                episodeCount = item.totalEpisodes;
            } else if (item.seasons && item.seasons[0] && typeof item.seasons[0].numberOfEpisodes === 'number') {
                episodeCount = item.seasons[0].numberOfEpisodes; 
            } else if (item.seasons && item.seasons[0] && Array.isArray(item.seasons[0].episodes)) {
                episodeCount = item.seasons[0].episodes.length; 
            }
            
            episodesHTML = `
                <div class="card-episodes">
                    <i class="fas fa-list-ol"></i> ${episodeCount} tập 
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

    const renderContentList = (items, type) => {
        if (!movieGrid) return;
        if (observer) observer.disconnect();

        const skeletons = movieGrid.querySelectorAll('.movie-card-skeleton');
        skeletons.forEach(skeleton => skeleton.remove());

        if (items.length === 0) {
            movieGrid.innerHTML = '';
            if (noMoviesFound) {
                noMoviesFound.classList.remove('hidden');
                noMoviesFound.textContent = `Không tìm thấy ${type === 'movies' ? 'phim lẻ/anime movie' : 'phim bộ/anime series'} nào phù hợp.`;
            }
        } else {
            if (noMoviesFound) noMoviesFound.classList.add('hidden');
            movieGrid.innerHTML = items.map((item, index) => {
                const cardHTML = createItemCard(item, item.itemType || type);
                 const cardWithIndex = cardHTML.replace('<a ', `<a data-index="${index}" `); // For stagger animation
                 return cardWithIndex;
            }).join('');
            observeElements(movieGrid.querySelectorAll('.stagger-item')); // Observe new items
        }
    };

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

    const updateHeroUI = (item) => {
        const heroTitleEl = document.getElementById('hero-title');
        const heroDescEl = document.getElementById('hero-description');
        const heroPlayBtnEl = document.getElementById('hero-play-button');
        const heroDetailBtnEl = document.getElementById('hero-detail-button');
        const heroYearEl = document.getElementById('hero-year');
        const heroTypeEl = document.getElementById('hero-type');
        const heroRatingEl = document.getElementById('hero-rating');
        const heroBadgesContainer = heroSection?.querySelector('.hero-content .flex.flex-wrap.mb-3');


        if (!heroSection || !item) { 
            if(heroSection) heroSection.style.backgroundImage = `url('https://placehold.co/1920x1080/000000/333333?text=No+Hero+Image')`;
            if(heroTitleEl) heroTitleEl.textContent = "Khám Phá Phim Hay";
            if(heroDescEl) heroDescEl.textContent = "Duyệt qua bộ sưu tập phim lẻ và phim bộ mới nhất của chúng tôi.";
            if(heroPlayBtnEl) heroPlayBtnEl.style.display = 'none';
            if(heroDetailBtnEl) heroDetailBtnEl.style.display = 'none';
            if(heroYearEl) heroYearEl.textContent = new Date().getFullYear();
            if(heroTypeEl) heroTypeEl.textContent = "Đa dạng";
            if(heroRatingEl) heroRatingEl.textContent = "N/A";
            if(heroBadgesContainer) heroBadgesContainer.innerHTML = '';
            return;
        }
        
        const title = item.title || 'Phim Nổi Bật';
        const description = item.description || 'Không có mô tả.';
        const backgroundUrl = item.heroImage || item.posterUrl || 'https://placehold.co/1920x1080/000000/333333?text=No+Hero+Image';
        const rating = item.rating ? parseFloat(item.rating).toFixed(1) : 'N/A';
        const year = item.releaseYear || 'N/A';
        
        const itemType = item.itemType || (currentContentType === 'series' ? 'series' : 'movies');
        const typeDisplay = itemType.includes("anime") ? "Anime" : (itemType === "series" ? "Phim Bộ" : "Phim Lẻ");
        const isAnime = itemType.includes('anime');
        const detailUrl = isAnime 
            ? `pages/animeDetails.html?id=${item.id}&type=${itemType}`
            : (itemType === 'series' 
                ? `pages/filmDetails_phimBo.html?id=${item.id}&type=${itemType}` 
                : `pages/filmDetail.html?id=${item.id}&type=${itemType}`);
        
        heroSection.style.backgroundImage = `url('${backgroundUrl}')`;
        heroSection.setAttribute('aria-label', `Phim nổi bật: ${title}`);

        if(heroTitleEl) heroTitleEl.textContent = title;
        if(heroDescEl) heroDescEl.textContent = description.length > 180 ? description.substring(0, 180) + '...' : description; // Truncate description
        
        if(heroYearEl) heroYearEl.textContent = year;
        if(heroTypeEl) heroTypeEl.textContent = typeDisplay;
        if(heroRatingEl) heroRatingEl.textContent = rating;

        if(heroPlayBtnEl) {
            heroPlayBtnEl.style.display = 'inline-flex';
            heroPlayBtnEl.onclick = () => window.location.href = detailUrl; 
        }
        if(heroDetailBtnEl) {
            heroDetailBtnEl.style.display = 'inline-flex';
            heroDetailBtnEl.onclick = () => window.location.href = detailUrl;
        }
        
        if(heroBadgesContainer) {
            heroBadgesContainer.innerHTML = ''; // Clear old badges
            const genres = item.genre || [];
            if (genres.length > 0) {
                genres.slice(0, 2).forEach(genre => { // Show max 2 genres
                    const badgeSpan = document.createElement('span');
                    badgeSpan.className = 'hero-badge hero-badge-tertiary mr-2 mb-2';
                    badgeSpan.innerHTML = `<i class="fas fa-tag mr-1"></i> ${genre}`;
                    heroBadgesContainer.appendChild(badgeSpan);
                });
            } else {
                const defaultBadge = document.createElement('span');
                defaultBadge.className = 'hero-badge hero-badge-primary mr-2 mb-2';
                defaultBadge.innerHTML = `<i class="fas fa-star mr-1"></i> Đề Xuất`;
                heroBadgesContainer.appendChild(defaultBadge);
            }
            const statusBadge = document.createElement('span');
            statusBadge.className = 'hero-badge hero-badge-tertiary';
            statusBadge.innerHTML = `<i class="fas fa-certificate mr-1"></i> ${item.isNew ? 'Mới' : (item.isTrending ? 'Thịnh hành' : (item.isHot ? 'Hot' : 'Phổ biến'))}`;
            heroBadgesContainer.appendChild(statusBadge);
        }

        const heroContentAnimate = heroSection.querySelector('.hero-content');
        if (heroContentAnimate) {
            heroContentAnimate.style.opacity = '0';
            heroContentAnimate.style.transform = 'translateY(20px)';
            setTimeout(() => {
                heroContentAnimate.style.transition = 'opacity 0.6s var(--animation-timing), transform 0.6s var(--animation-timing)';
                heroContentAnimate.style.opacity = '1';
                heroContentAnimate.style.transform = 'translateY(0)';
            }, 100); 
        }
    };


    const startHeroSlideshow = () => {
        if (heroIntervalId) clearInterval(heroIntervalId);
        if (hotItems.length > 1) {
            heroIntervalId = setInterval(() => {
                currentHeroIndex = (currentHeroIndex + 1) % hotItems.length;
                updateHeroUI(hotItems[currentHeroIndex]);
            }, HERO_SLIDESHOW_INTERVAL);
        } else if (hotItems.length === 1) {
            updateHeroUI(hotItems[0]); 
        } else {
            const fallbackData = window.allMovies.length > 0 ? window.allMovies[0] : (window.allSeries.length > 0 ? window.allSeries[0] : null);
            if (fallbackData) {
                updateHeroUI(fallbackData);
            } else {
                updateHeroUI(null); 
            }
        }
    };

    const updateUrlParams = () => {
        const params = new URLSearchParams();
        if (currentContentType !== 'movies') {
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

    const createTag = (type, value, label) => {
        const tag = document.createElement('button');
        tag.className = 'filter-tag';
        tag.dataset.filterType = type;
        tag.dataset.filterValue = value; 
        tag.innerHTML = `<span class="tag-label">${label}</span><span class="material-icons-outlined remove-tag text-sm">close</span>`;
        tag.setAttribute('aria-label', `Xóa bộ lọc ${label}`);
        filterTagsContainer.appendChild(tag);
    };

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
            label.className = 'block px-3 py-1.5 hover:bg-gray-600 rounded cursor-pointer flex items-center'; // Tailwind for styling
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.value = genre; checkbox.className = 'mr-2 accent-primary';
            checkbox.checked = window.currentFilters.genres.includes(genre);
            checkbox.addEventListener('change', handleGenreChange);
            label.appendChild(checkbox); label.appendChild(document.createTextNode(genre));
            genreDropdown.appendChild(label);
        });
        updateGenreButtonText();
    };

    const handleGenreChange = (event) => {
        const genre = event.target.value;
        const isChecked = event.target.checked;
        if (isChecked) { if (!window.currentFilters.genres.includes(genre)) window.currentFilters.genres.push(genre); }
        else { window.currentFilters.genres = window.currentFilters.genres.filter(g => g !== genre); }
        updateGenreButtonText(); updateFilterTags(); filterAndSortContent(); updateUrlParams();
    };

    const updateGenreButtonText = () => {
        if (!genreFilterButton) return;
        const buttonTextSpan = genreFilterButton.querySelector('span');
        if (!buttonTextSpan) return;
        const count = window.currentFilters.genres.length;
        if (count === 0) buttonTextSpan.textContent = 'Chọn thể loại...';
        else if (count === 1) buttonTextSpan.textContent = window.currentFilters.genres[0];
        else buttonTextSpan.textContent = `${count} thể loại đã chọn`;
    };

    const setupSliders = () => {
         if (!window.dataLoaded) {
             if (yearSliderElement) { yearSliderElement.innerHTML = '<p class="text-xs text-text-muted italic">Đang tải...</p>'; yearSliderElement.setAttribute('disabled', 'true'); if(yearSliderValues) yearSliderValues.textContent = 'N/A'; }
             if (ratingSliderElement) { ratingSliderElement.innerHTML = '<p class="text-xs text-text-muted italic">Đang tải...</p>'; ratingSliderElement.setAttribute('disabled', 'true'); if(ratingSliderValues) ratingSliderValues.textContent = 'N/A'; }
            return;
         }
         const [minYear, maxYear] = minMaxYears[currentContentType] || [null, null];
         const ratingMin = 0, ratingMax = 10;

         if (yearSliderInstance) yearSliderInstance.destroy(); yearSliderInstance = null;
         if (yearSliderElement && minYear !== null && maxYear !== null && minYear <= maxYear) {
             yearSliderElement.innerHTML = ''; // Clear placeholder
             try {
                 yearSliderInstance = noUiSlider.create(yearSliderElement, { range: { 'min': minYear, 'max': maxYear }, start: [window.currentFilters.yearRange[0] ?? minYear, window.currentFilters.yearRange[1] ?? maxYear], connect: true, step: 1, format: wNumb({ decimals: 0 }), behaviour: 'tap-drag' });
                 yearSliderInstance.on('update', debounceFilter((values) => {
                     const newMinYear = parseInt(values[0]), newMaxYear = parseInt(values[1]);
                     if (newMinYear !== window.currentFilters.yearRange[0] || newMaxYear !== window.currentFilters.yearRange[1]) {
                         window.currentFilters.yearRange = [newMinYear, newMaxYear];
                         if (yearSliderValues) yearSliderValues.textContent = `${values[0]} - ${values[1]}`;
                         updateFilterTags(); filterAndSortContent(); updateUrlParams();
                     }
                 }, 300));
                 const initialYearValues = yearSliderInstance.get();
                 if (yearSliderValues) yearSliderValues.textContent = `${initialYearValues[0]} - ${initialYearValues[1]}`;
                 yearSliderElement.removeAttribute('disabled');
             } catch (error) { console.error("Error creating year slider:", error); if (yearSliderValues) yearSliderValues.textContent = 'Lỗi'; yearSliderElement.innerHTML = '<p class="text-xs text-red-400 italic">Lỗi slider.</p>'; yearSliderElement.setAttribute('disabled', 'true'); }
         } else if (yearSliderElement) { yearSliderElement.innerHTML = '<p class="text-xs text-text-muted italic">Không đủ dữ liệu năm.</p>'; if (yearSliderValues) yearSliderValues.textContent = 'N/A'; yearSliderElement.setAttribute('disabled', 'true'); }

         if (ratingSliderInstance) ratingSliderInstance.destroy(); ratingSliderInstance = null;
         if (ratingSliderElement) {
             ratingSliderElement.innerHTML = ''; // Clear placeholder
             try {
                 ratingSliderInstance = noUiSlider.create(ratingSliderElement, { range: { 'min': ratingMin, 'max': ratingMax }, start: [window.currentFilters.ratingRange[0] ?? ratingMin, window.currentFilters.ratingRange[1] ?? ratingMax], connect: true, step: 0.1, format: wNumb({ decimals: 1 }), behaviour: 'tap-drag' });
                 ratingSliderInstance.on('update', debounceFilter((values) => {
                     const newMinRating = parseFloat(values[0]), newMaxRating = parseFloat(values[1]);
                     if (newMinRating.toFixed(1) !== window.currentFilters.ratingRange[0].toFixed(1) || newMaxRating.toFixed(1) !== window.currentFilters.ratingRange[1].toFixed(1)) {
                         window.currentFilters.ratingRange = [newMinRating, newMaxRating];
                         if (ratingSliderValues) ratingSliderValues.textContent = `${values[0]} - ${values[1]}`;
                         updateFilterTags(); filterAndSortContent(); updateUrlParams();
                     }
                 }, 300));
                 const initialRatingValues = ratingSliderInstance.get();
                 if (ratingSliderValues) ratingSliderValues.textContent = `${initialRatingValues[0]} - ${initialRatingValues[1]}`;
                 ratingSliderElement.removeAttribute('disabled');
             } catch (error) { console.error("Error creating rating slider:", error); if (ratingSliderValues) ratingSliderValues.textContent = 'Lỗi'; ratingSliderElement.innerHTML = '<p class="text-xs text-red-400 italic">Lỗi slider.</p>'; ratingSliderElement.setAttribute('disabled', 'true'); }
         } else if (ratingSliderElement) { if (ratingSliderValues) ratingSliderValues.textContent = 'N/A'; ratingSliderElement.setAttribute('disabled', 'true'); }
    };

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
    };

    const filterAndSortContent = () => {
        if (!window.dataLoaded) { showSkeletonCards(); return; }
        showSkeletonCards(); // Show skeletons while filtering
        const dataPool = currentContentType === 'movies' ? window.allMovies : window.allSeries;
        const { search, genres: selectedGenres, yearRange, ratingRange, sort: selectedSort, format: selectedFormat } = window.currentFilters;
        const [minYear, maxYear] = yearRange;
        const [minRating, maxRating] = ratingRange;
        let filtered = [...dataPool]; 
        let gridTitleText = currentContentType === 'movies' ? "Phim Lẻ & Anime Movie" : "Phim Bộ & Anime Series"; 
        let filterDescriptions = []; // For building the subtitle

        if (search) {
            const normalizedSearch = SearchUtils.normalizeText(search); // Normalize search term
            filtered = filtered.filter(item => item.title && SearchUtils.normalizeText(item.title).includes(normalizedSearch));
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
            if (!search) filterDescriptions.push(`Năm: ${minYear}-${maxYear}`);
        }
        if (minRating !== null && maxRating !== null && (minRating !== 0 || maxRating !== 10)) {
            filtered = filtered.filter(item => typeof item.rating === 'number' && item.rating >= minRating && item.rating <= maxRating);
            if (!search) filterDescriptions.push(`Điểm: ${minRating.toFixed(1)}-${maxRating.toFixed(1)}`);
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

        setTimeout(() => renderContentList(filtered, currentContentType), 150); // Small delay for skeleton display
    };
    window.filterAndSortContent = filterAndSortContent; // Expose to global scope

    const handleFilterChange = () => {
        window.currentFilters.sort = sortFilter?.value || 'default';
        filterAndSortContent(); updateUrlParams(); updateFilterTags();
    };
    window.handleFilterChange = handleFilterChange; // Expose for inline JS if needed

    const handleFormatChange = () => {
        window.currentFilters.format = formatFilter?.value || 'all';
        filterAndSortContent(); updateUrlParams(); updateFilterTags();
    };

    const initObserver = () => {
        if (!('IntersectionObserver' in window)) { // Fallback for older browsers
            document.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('is-visible'));
            return;
        }
        const options = { root: null, rootMargin: '0px', threshold: 0.1 }; // Trigger when 10% visible
        observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delayIndex = parseInt(entry.target.dataset.index || '0', 10);
                    entry.target.style.animationDelay = `${delayIndex * 100}ms`; // Stagger animation
                    entry.target.classList.add('is-visible');
                    // observerInstance.unobserve(entry.target); // Stop observing once animated if preferred
                }
            });
        }, options);
        observeElements(document.querySelectorAll('.stagger-item')); // Observe items with stagger-item class
    };

    const observeElements = (elements) => {
        if (!observer) return;
        elements.forEach((el) => {
            // Only observe if it has the class and hasn't been made visible yet
            if (el.classList.contains('stagger-item') && !el.classList.contains('is-visible')) {
                 observer.observe(el);
            }
        });
    };

    const switchTab = (newType) => {
        if (newType === currentContentType || !movieGrid || !movieGridSection) return;
        const oldType = currentContentType; currentContentType = newType;
        const slideOutClass = oldType === 'movies' ? 'slide-out-left' : 'slide-out-right';
        const slideInClass = newType === 'movies' ? 'slide-in-from-right' : 'slide-in-from-left';

        // Tab indicator logic removed as it was causing issues, relying on button active class
        
        movieGrid.classList.remove('is-visible');
        movieGrid.classList.add(slideOutClass);

        setTimeout(() => {
            if (tabMovies) { 
                tabMovies.classList.toggle('active', newType === 'movies'); 
                tabMovies.setAttribute('aria-selected', String(newType === 'movies'));
            }
            if (tabSeries) { 
                tabSeries.classList.toggle('active', newType === 'series'); 
                tabSeries.setAttribute('aria-selected', String(newType === 'series'));
            }

            // Reset filters for the new tab
            const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
            window.currentFilters = { genres: [], yearRange: [defaultYears[0], defaultYears[1]], ratingRange: [0, 10], sort: 'default', search: '', format: 'all' };
            // Reset UI elements
            const searchInputDesktop = document.getElementById('search-input-desktop'); const searchInputMobile = document.getElementById('search-input-mobile');
            if (searchInputDesktop) searchInputDesktop.value = ''; if (searchInputMobile) searchInputMobile.value = '';
            if (sortFilter) sortFilter.value = 'default'; if (formatFilter) formatFilter.value = 'all';
            genreDropdown?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false); updateGenreButtonText();
             if (yearSliderInstance && defaultYears[0] !== null && defaultYears[1] !== null) {
                 yearSliderInstance.set([defaultYears[0], defaultYears[1]]);
                 if (yearSliderValues) yearSliderValues.textContent = `${defaultYears[0]} - ${defaultYears[1]}`;
             } else if (yearSliderValues) { yearSliderValues.textContent = 'Tất cả'; }
             if (ratingSliderInstance) {
                 ratingSliderInstance.set([0, 10]);
                 if (ratingSliderValues) ratingSliderValues.textContent = '0.0 - 10.0';
             } else if (ratingSliderValues) { ratingSliderValues.textContent = 'Tất cả'; }

            updateFilterTags(); // Update tags for the new default filters
            showSkeletonCards(); // Show skeletons for the new tab
            movieGrid.classList.remove(slideOutClass);
            movieGrid.classList.add(slideInClass);
            filterAndSortContent(); // This will re-render based on new defaults
            void movieGrid.offsetWidth; // Force reflow
            movieGrid.classList.add('is-visible'); // Animate in
            setTimeout(() => {
                if (movieGrid) movieGrid.classList.remove(slideInClass);
            }, TAB_TRANSITION_DURATION);
            updateUrlParams(); // Update URL for new tab
        }, TAB_TRANSITION_DURATION); 
    };

     const readUrlParamsAndApplyFilters = () => {
         const params = new URLSearchParams(window.location.search);
         const tabParam = params.get('tab');
         const genresParam = params.get('genres'); const minYearParam = params.get('minYear'); const maxYearParam = params.get('maxYear');
         const minRatingParam = params.get('minRating'); const maxRatingParam = params.get('maxRating'); const sortParam = params.get('sort');
         const searchParam = params.get('search'); const formatParam = params.get('format');
         let filtersChanged = false;

         if (tabParam === 'series' && tabSeries) {
             currentContentType = 'series';
             if (tabMovies) { tabMovies.classList.remove('active'); tabMovies.setAttribute('aria-selected', 'false'); }
             tabSeries.classList.add('active'); tabSeries.setAttribute('aria-selected', 'true');
             filtersChanged = true; 
         } else {
             currentContentType = 'movies'; // Default to movies if no tab or invalid tab
             if (tabMovies) { tabMovies.classList.add('active'); tabMovies.setAttribute('aria-selected', 'true'); }
             if (tabSeries) { tabSeries.classList.remove('active'); tabSeries.setAttribute('aria-selected', 'false'); }
         }

         const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
         const initialFilters = { genres: [], yearRange: [defaultYears[0], defaultYears[1]], ratingRange: [0, 10], sort: 'default', search: '', format: 'all' };

         if (genresParam) { initialFilters.genres = genresParam.split(',').map(g => g.trim()).filter(Boolean); filtersChanged = true; }
         const parsedMinYear = minYearParam ? parseInt(minYearParam) : null; const parsedMaxYear = maxYearParam ? parseInt(maxYearParam) : null;
         if (defaultYears[0] !== null && defaultYears[1] !== null) { // Check if default years are valid
              initialFilters.yearRange[0] = parsedMinYear !== null ? parsedMinYear : defaultYears[0];
              initialFilters.yearRange[1] = parsedMaxYear !== null ? parsedMaxYear : defaultYears[1];
              if ((parsedMinYear !== null && parsedMinYear !== defaultYears[0]) || (parsedMaxYear !== null && parsedMaxYear !== defaultYears[1])) filtersChanged = true;
         } else { // If default years are not valid (e.g., data not loaded), use URL params or null
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
         setupGenreFilter(); 
         setupSliders(); 
         updateFilterTags(); 
         filterAndSortContent(); 
         updateClearButtonVisibility();
         return filtersChanged;
     };

    // --- Event Listeners Setup ---
    if (sortFilter) sortFilter.addEventListener('change', handleFilterChange);
    if (formatFilter) formatFilter.addEventListener('change', handleFormatChange);
    if (tabsContainer) { 
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
    
    // --- Initialization ---
    const initializeApp = async () => {
        showSkeletonCards(); window.dataLoaded = false; // Show skeletons and mark data as not loaded
        try {
            // Fetch all three JSON files concurrently
            const [moviesResponse, seriesResponse, animeResponse] = await Promise.all([
                fetch('json/filmData.json').catch(e => ({ ok: false, error: e })), // Catch network errors
                fetch('json/filmData_phimBo.json').catch(e => ({ ok: false, error: e })),
                fetch('json/animeData.json').catch(e => ({ ok: false, error: e })) 
            ]);

            // Process responses, defaulting to empty array on error
            const moviesData = moviesResponse.ok ? await moviesResponse.json() : [];
            const seriesData = seriesResponse.ok ? await seriesResponse.json() : [];
            const animeData = animeResponse.ok ? await animeResponse.json() : [];

            // Log errors if any fetch failed
            if (!moviesResponse.ok) console.error("Error fetching movies:", moviesResponse.error || `Status: ${moviesResponse.status}`);
            if (!seriesResponse.ok) console.error("Error fetching series:", seriesResponse.error || `Status: ${seriesResponse.status}`);
            if (!animeResponse.ok) console.error("Error fetching anime:", animeResponse.error || `Status: ${animeResponse.status}`);

            // Combine data into appropriate global arrays
            window.allMovies = [
                ...(moviesData || []).map(item => ({ ...item, itemType: item.itemType || 'movies' })), // Assign default type if missing
                ...(animeData || []).filter(item => item.itemType === 'anime-movie').map(item => ({ ...item, itemType: 'anime-movie' })) // Explicitly type anime movies
            ];
            window.allSeries = [
                ...(seriesData || []).map(item => ({ ...item, itemType: item.itemType || 'series' })), // Assign default type if missing
                ...(animeData || []).filter(item => item.itemType === 'anime-series').map(item => ({ ...item, itemType: 'anime-series' })) // Explicitly type anime series
            ];
            window.dataLoaded = true; // Mark data as loaded

            // Prepare data for Hero Slideshow (items marked as 'isHot')
            const allItemsForHero = [ ...window.allMovies, ...window.allSeries ];
            hotItems = allItemsForHero
                .filter(item => item.isHot === true && typeof item.hotnumber === 'number')
                .sort((a, b) => a.hotnumber - b.hotnumber); // Sort by hotnumber

             // Calculate min/max years for sliders AFTER data is loaded
             const calculateMinMaxYears = (data) => {
                 let min = Infinity, max = -Infinity;
                 data.forEach(item => { if (item.releaseYear && typeof item.releaseYear === 'number') { min = Math.min(min, item.releaseYear); max = Math.max(max, item.releaseYear); } });
                 const currentYear = new Date().getFullYear();
                 // Ensure minYear is not in the future or too far in the past if data is sparse
                 const finalMin = (min === Infinity || min > currentYear) ? currentYear - 20 : min; // Default to 20 years back if no data
                 // Ensure maxYear is not less than minYear or too far in the past
                 const finalMax = (max === -Infinity || max < finalMin) ? currentYear : max;
                 return [finalMin, finalMax];
             };
             minMaxYears.movies = calculateMinMaxYears(window.allMovies);
             minMaxYears.series = calculateMinMaxYears(window.allSeries);

            // Extract unique genres for filters AFTER data is loaded
            const extractUniqueGenres = (data) => {
                const genres = new Set();
                data.forEach(item => {
                    const itemGenres = item.genre || item.genres; // Handle both 'genre' and 'genres' field names
                    if (Array.isArray(itemGenres)) {
                        itemGenres.forEach(genre => { if(typeof genre === 'string') genres.add(genre.trim())});
                    } else if (typeof itemGenres === 'string') { // Handle single string genre
                        genres.add(itemGenres.trim());
                    }
                });
                return Array.from(genres);
            };
            uniqueGenres.movies = extractUniqueGenres(window.allMovies);
            uniqueGenres.series = extractUniqueGenres(window.allSeries);

            // Read URL parameters and apply filters (this now calls setupGenreFilter, setupSliders, filterAndSortContent)
            const filtersAppliedFromUrl = readUrlParamsAndApplyFilters(); 

            // Update Hero section based on hot items or fallback
            // Only update hero from slideshow if no specific filters were applied from URL that might imply specific content view
            if (!filtersAppliedFromUrl || !window.currentFilters.search) { // Also check if not a search result page
                if (hotItems.length > 0) {
                    updateHeroUI(hotItems[0]); // Show the first hot item immediately
                    startHeroSlideshow();
                } else {
                     // Fallback to the first item of the current tab if no hot items
                    const fallbackData = currentContentType === 'movies' && window.allMovies.length > 0 ? window.allMovies[0] : 
                                         currentContentType === 'series' && window.allSeries.length > 0 ? window.allSeries[0] : null;
                    updateHeroUI(fallbackData);
                }
            } else if (window.currentFilters.search && window.allMovies.length > 0) { // If there was a search
                // Show the first search result in hero, or fallback to hot item
                const firstSearchResult = currentContentType === 'movies' ? window.allMovies[0] : window.allSeries[0]; // This logic might need refinement to get actual first search result
                if (firstSearchResult) updateHeroUI(firstSearchResult);
                else if (hotItems.length > 0) updateHeroUI(hotItems[0]); // Fallback to hot item
            } else if (hotItems.length > 0) { // Default to hot item if filters from URL but no search
                 updateHeroUI(hotItems[0]);
                 startHeroSlideshow();
            }


            // Tab indicator initialization moved after readUrlParamsAndApplyFilters
            const activeTabButton = currentContentType === 'movies' ? tabMovies : tabSeries;
            if (tabsContainer && activeTabButton) { // No separate indicator div
                if (tabMovies) tabMovies.classList.toggle('active', currentContentType === 'movies');
                if (tabSeries) tabSeries.classList.toggle('active', currentContentType === 'series');
            }
            initObserver(); // Initialize Intersection Observer for animations
        } catch (error) {
            console.error("Error initializing app:", error);
            if (movieGrid) movieGrid.innerHTML = `<p class="text-red-500 col-span-full text-center py-8">Đã xảy ra lỗi khi tải dữ liệu. Vui lòng làm mới trang hoặc thử lại sau.</p>`;
            updateHeroUI(null); // Show generic hero on error
        }
    };

    initializeApp();
    console.log("Trang chủ web xem phim đã sẵn sàng (v2.0)!");

    // Search functionality (from inline script, now integrated here)
    // Ensure SearchUtils is available
    const searchInputDesktop = document.getElementById('search-input-desktop');
    const searchSuggestionsDesktop = document.getElementById('search-suggestions-desktop');
    const searchInputMobile = document.getElementById('search-input-mobile');
    const searchSuggestionsMobile = document.getElementById('search-suggestions-mobile');

    const handleGlobalSearchInput = (event) => {
        const inputEl = event.target;
        const suggestionsEl = inputEl === searchInputDesktop ? searchSuggestionsDesktop : searchSuggestionsMobile;
        const term = inputEl.value.trim();

        window.currentFilters.search = term.toLowerCase(); // Update global filter state
        SearchUtils.debounce(() => filterAndSortContent(), 300)(); // Debounce grid update

        SearchUtils.debounce(() => { // Debounce suggestions
            if (typeof SearchUtils !== 'undefined' && typeof SearchUtils.displaySearchSuggestions === 'function') {
                const allItems = [...(window.allMovies || []), ...(window.allSeries || [])]; // Use combined data for suggestions
                SearchUtils.displaySearchSuggestions(term, inputEl, suggestionsEl, allItems, {
                    maxResults: 8 // Example: limit to 8 suggestions
                });
            }
        }, 150)();
    };

    const handleGlobalSearchSubmit = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const searchTerm = event.target.value.trim();
            window.currentFilters.search = searchTerm.toLowerCase();
            filterAndSortContent(); // Apply search filter
            if (typeof SearchUtils !== 'undefined' && typeof SearchUtils.hideAllSearchSuggestions === 'function') {
                SearchUtils.hideAllSearchSuggestions();
            }
            event.target.blur(); // Remove focus from input
        }
    };

    searchInputDesktop?.addEventListener('input', handleGlobalSearchInput);
    searchInputMobile?.addEventListener('input', handleGlobalSearchInput);
    searchInputDesktop?.addEventListener('keydown', handleGlobalSearchSubmit);
    searchInputMobile?.addEventListener('keydown', handleGlobalSearchSubmit);

    // Initialize keyboard navigation for search suggestions
    if (typeof SearchUtils !== 'undefined' && typeof SearchUtils.setupKeyboardNavigation === 'function') {
        if (searchInputDesktop && searchSuggestionsDesktop) {
            SearchUtils.setupKeyboardNavigation(searchInputDesktop, searchSuggestionsDesktop);
        }
        if (searchInputMobile && searchSuggestionsMobile) {
            SearchUtils.setupKeyboardNavigation(searchInputMobile, searchSuggestionsMobile);
        }
    }

}); // End DOMContentLoaded