// js/anime.js - JavaScript for Anime Page Functionality
// Handles data loading, display, hero update, search, mobile interactions, and ANIME-SPECIFIC FILTERS.
// v1.7: Ensured hero button visibility by resetting and re-triggering animation after display style change.

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const heroSection = document.querySelector('.anime-hero');
    const heroTitle = document.getElementById('anime-hero-title');
    const heroGenresContainer = document.querySelector('.hero-content-anime .genres');
    const heroDescription = document.querySelector('.hero-content-anime p');
    const heroButton = document.querySelector('.hero-content-anime .hero-button');

    // Grid Elements (Consolidated)
    const allAnimeGrid = document.getElementById('all-anime-grid'); // Main grid
    const loadingIndicator = document.getElementById('loading-anime');
    const noResultsIndicator = document.getElementById('no-anime-found');
    const animeGridTitle = document.getElementById('anime-grid-title'); // Title above the grid

    // Header Elements
    const header = document.getElementById('main-header');
    const searchInputDesktop = document.getElementById('search-input-desktop-anime');
    const searchInputMobile = document.getElementById('search-input-mobile-anime');
    const suggestionsDesktop = document.getElementById('search-suggestions-desktop-anime');
    const suggestionsMobile = document.getElementById('search-suggestions-mobile-anime');
    const searchIconMobile = document.getElementById('search-icon-mobile-anime');
    const mobileSearchContainer = document.getElementById('mobile-search-container-anime');

    // Mobile Menu Elements
    const mobileMenuButton = document.getElementById('mobile-menu-button-anime');
    const mobileMenuPanel = document.getElementById('mobile-menu-panel-anime');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay-anime');
    const closeMobileMenuButton = document.getElementById('close-mobile-menu-button-anime');

    // --- ANIME FILTER Elements ---
    const animeFilterSection = document.getElementById('anime-filter-section');
    const filterIconButtonDesktop = document.getElementById('nav-filter-icon-anime');
    const filterIconButtonMobile = document.getElementById('mobile-nav-filter-icon-anime');
    const animeGenreFilterContainer = document.getElementById('anime-genre-filter-container');
    const animeGenreFilterButton = document.getElementById('anime-genre-filter-button');
    const animeGenreDropdown = document.getElementById('anime-genre-dropdown');
    const animeStatusFilter = document.getElementById('anime-status-filter');
    const animeSortFilter = document.getElementById('anime-sort-filter');
    const clearAnimeFiltersButton = document.getElementById('clear-anime-filters-button');
    const animeFilterTagsContainer = document.getElementById('anime-filter-tags-container');

    // Scroll-to-top Button
    const scrollToTopButton = document.getElementById('scroll-to-top');

    // --- State Variables ---
    let allAnimeData = []; // Store fetched anime data
    let filteredAnimeData = []; // Store filtered data for display
    let searchDebounceTimerAnime; // Timer for debouncing search
    let filterDebounceTimerAnime; // Timer for debouncing filter changes
    window.currentAnimeSearchTerm = ''; // Global variable for search term on this page

    // --- ANIME FILTER State ---
    let currentAnimeFilters = {
        genres: [],
        status: 'all',
        sort: 'default',
        search: '' // Keep search term here as well for combined filtering
    };
    let uniqueAnimeGenres = []; // Store unique genres for the filter dropdown

    // --- Helper Functions ---

    /**
     * Debounce function specifically for anime filters.
     * @param {Function} func The function to debounce.
     * @param {number} wait The delay in milliseconds.
     * @returns {Function} The debounced function.
     */
    const debounceAnimeFilter = (func, wait) => {
        return (...args) => {
            clearTimeout(filterDebounceTimerAnime);
            filterDebounceTimerAnime = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    };

    /**
     * Debounce function specifically for anime search.
     * @param {Function} func The function to debounce.
     * @param {number} wait The delay in milliseconds.
     * @returns {Function} The debounced function.
     */
    const debounceAnimeSearch = (func, wait) => {
        return (...args) => {
            clearTimeout(searchDebounceTimerAnime);
            searchDebounceTimerAnime = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    };

    /**
     * Highlights the search term within a given text.
     * @param {string|null} text The text to highlight within.
     * @param {string} term The search term.
     * @returns {string} The text with the term highlighted, or the original text.
     */
    const highlightTerm = (text, term) => {
        if (!term || !text) return text || '';
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return text.replace(regex, `<span class="search-highlight">$1</span>`);
    };

    /**
     * Creates the HTML string for a single Anime card.
     * @param {object} anime - The anime data object.
     * @returns {string} HTML string for the card.
     */
    const createAnimeCard = (anime) => {
        // Luôn trỏ đến animeDetails.html cho cả anime-series và anime-movie
        const itemType = anime.itemType || (anime.episodes === null ? 'anime-movie' : 'anime-series');
        const detailPageUrl = `animeDetails.html?id=${anime.id}&type=${itemType}`;

        const posterUrl = anime.posterUrl || 'https://placehold.co/300x450/1f1f1f/888888?text=No+Poster';
        const title = anime.title || 'Không có tiêu đề';
        const rating = anime.rating ? anime.rating.toFixed(1) : 'N/A';
        
        let episodesText = 'N/A';
        if (itemType === 'anime-movie') {
            episodesText = 'Movie';
        } else if (anime.totalEpisodes) {
            episodesText = `${anime.totalEpisodes} Tập`;
        } else if (anime.seasons && anime.seasons[0] && anime.seasons[0].episodes) {
            episodesText = `${anime.seasons[0].episodes.length} Tập`; 
        }

        const year = anime.releaseYear || 'N/A';
        const altText = `Poster Anime: ${title} (${year})`;
        const displayTitle = currentAnimeFilters.search ? highlightTerm(title, currentAnimeFilters.search) : title;

        return `
            <div class="anime-card animate-fade-in-up">
                <a href="${detailPageUrl}" class="anime-card-poster-link group" aria-label="Xem chi tiết ${title}">
                    <img src="${posterUrl}" alt="${altText}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/300x450/1f1f1f/888888?text=Error';">
                    <div class="anime-card-overlay">
                        <i class="fas fa-play anime-card-play-icon"></i>
                    </div>
                </a>
                <div class="anime-card-info">
                    <h3 class="anime-card-title" title="${title}">${displayTitle}</h3>
                    <div class="anime-card-meta">
                        <span class="anime-card-rating">
                            <i class="fas fa-star"></i> ${rating}
                        </span>
                        <span class="anime-card-episodes">${episodesText}</span>
                    </div>
                </div>
            </div>
        `;
    };


    /**
     * Populates the main anime grid container with anime cards.
     * @param {Array<object>} animeList - The list of anime data to display.
     */
    const populateAnimeGrid = (animeList) => {
        if (!allAnimeGrid) {
            console.warn("Anime grid element not found for population.");
            return;
        }
        if (loadingIndicator) loadingIndicator.classList.add('hidden'); 

        if (!animeList || animeList.length === 0) {
            allAnimeGrid.innerHTML = ''; 
            if (noResultsIndicator) {
                 noResultsIndicator.textContent = currentAnimeFilters.search
                    ? `Không tìm thấy Anime nào cho "${currentAnimeFilters.search}".`
                    : "Không tìm thấy Anime nào phù hợp với bộ lọc.";
                noResultsIndicator.classList.remove('hidden');
            }
            return;
        }

        if (noResultsIndicator) noResultsIndicator.classList.add('hidden'); 
        allAnimeGrid.innerHTML = animeList.map(createAnimeCard).join('');
    };

    /**
     * Displays skeleton loading cards in the main anime grid.
     */
    const displayAnimeSkeletonLoaders = () => {
        if (!allAnimeGrid) return;
        if (loadingIndicator) loadingIndicator.classList.remove('hidden'); 
        if (noResultsIndicator) noResultsIndicator.classList.add('hidden');

        const skeletonCount = 12; 
        let skeletonsHTML = '';
        for (let i = 0; i < skeletonCount; i++) {
            let hiddenClasses = '';
            if (i >= 2 && i < 3) hiddenClasses = 'hidden sm:block';
            if (i >= 3 && i < 4) hiddenClasses = 'hidden md:block';
            if (i >= 4 && i < 5) hiddenClasses = 'hidden lg:block';
            if (i >= 5) hiddenClasses = 'hidden xl:block';

            skeletonsHTML += `
                <div class="skeleton-card ${hiddenClasses}">
                    <div class="skeleton-image"></div>
                    <div class="skeleton-title"></div>
                    <div class="skeleton-text"></div>
                </div>`;
        }
        allAnimeGrid.innerHTML = skeletonsHTML;
    }

    /**
     * Updates the hero section with featured anime data.
     * @param {object} anime - The featured anime data object.
     */
    const updateAnimeHero = (anime) => {
        const heroContentElement = document.querySelector('.hero-content-anime');

        if (!heroSection || !anime) {
            if (heroSection) heroSection.style.backgroundImage = `url('https://placehold.co/1920x700/1a1a1a/666666?text=Anime+Hero+Background')`;
            if (heroTitle) heroTitle.textContent = "Thế Giới Anime";
            if (heroGenresContainer) heroGenresContainer.innerHTML = '';
            if (heroDescription) heroDescription.textContent = "Khám phá bộ sưu tập Anime mới nhất và hay nhất.";
            if (heroButton) heroButton.style.display = 'none'; // Hide button if no data
            console.warn("updateAnimeHero: Missing hero section or anime data. Setting default.");
            if (heroContentElement) heroContentElement.classList.remove('animate-fadeInUpDelayed'); // Remove animation class if no data
            return;
        }

        const heroImageUrl = anime.heroImage || anime.posterUrl || 'https://placehold.co/1920x700/1a1a1a/666666?text=No+Hero+Image';
        heroSection.style.backgroundImage = `url('${heroImageUrl}')`;

        if (heroTitle) {
            heroTitle.textContent = anime.title || 'Không có tiêu đề';
            heroTitle.classList.remove('animate-heroTitleSlideIn');
            void heroTitle.offsetWidth; // Force reflow
            heroTitle.classList.add('animate-heroTitleSlideIn');
        }


        if (heroGenresContainer && Array.isArray(anime.genre)) {
            heroGenresContainer.innerHTML = anime.genre.map(g =>
                `<span class="px-2 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur-sm border border-white/20">${g}</span>`
            ).join('');
            heroGenresContainer.classList.remove('animate-heroGenresFadeIn');
            void heroGenresContainer.offsetWidth; // Force reflow
            heroGenresContainer.classList.add('animate-heroGenresFadeIn');
        } else if (heroGenresContainer) {
            heroGenresContainer.innerHTML = ''; 
        }

        if (heroDescription) {
            heroDescription.textContent = anime.description ? (anime.description.length > 180 ? anime.description.substring(0, 180) + '...' : anime.description) : 'Không có mô tả.';
            heroDescription.classList.remove('animate-heroDescSlideIn');
            void heroDescription.offsetWidth; // Force reflow
            heroDescription.classList.add('animate-heroDescSlideIn');
        }

        if (heroButton) {
            heroButton.style.display = 'inline-flex'; 
            const itemType = anime.itemType || (anime.episodes === null ? 'anime-movie' : 'anime-series');
            const detailPageUrl = `animeDetails.html?id=${anime.id}&type=${itemType}`;
            heroButton.onclick = () => { window.location.href = detailPageUrl; }; 
            heroButton.innerHTML = `<i class="fas fa-play"></i> Xem Ngay ${anime.title || ''}`; 
            
            // Reset and re-trigger animation for the button
            heroButton.classList.remove('animate-fadeInUp', 'animate-heroButtonPulse');
            void heroButton.offsetWidth; // Force reflow to restart animation
            heroButton.classList.add('animate-fadeInUp', 'animate-heroButtonPulse');
        }

        // Trigger fade-in animation for the main hero content container
        if (heroContentElement) {
            heroContentElement.classList.remove('animate-fadeInUpDelayed'); 
            void heroContentElement.offsetWidth; 
            heroContentElement.classList.add('animate-fadeInUpDelayed'); 
        }
    };


    // --- ANIME FILTER Logic ---

    const setupAnimeGenreFilter = () => {
        if (!animeGenreDropdown || !animeGenreFilterButton) return;

        const genres = new Set();
        allAnimeData.forEach(anime => {
            if (Array.isArray(anime.genre)) {
                anime.genre.forEach(g => { if (typeof g === 'string' && g.trim()) genres.add(g.trim()); });
            }
        });
        uniqueAnimeGenres = Array.from(genres).sort();

        animeGenreDropdown.innerHTML = ''; 
        if (uniqueAnimeGenres.length === 0) {
            animeGenreDropdown.innerHTML = '<div class="p-3 text-sm text-text-muted italic">Không có thể loại nào.</div>';
            updateAnimeGenreButtonText();
            return;
        }

        uniqueAnimeGenres.forEach(genre => {
            const label = document.createElement('label');
            label.className = 'block px-3 py-1.5 hover:bg-gray-700 rounded cursor-pointer flex items-center text-sm'; 
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = genre;
            checkbox.className = 'mr-2 accent-anime-accent'; 
            checkbox.checked = currentAnimeFilters.genres.includes(genre); 
            checkbox.addEventListener('change', handleAnimeGenreChange); 
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(genre));
            animeGenreDropdown.appendChild(label);
        });
        updateAnimeGenreButtonText(); 
    };

    const handleAnimeGenreChange = (event) => {
        const genre = event.target.value;
        const isChecked = event.target.checked;
        if (isChecked) {
            if (!currentAnimeFilters.genres.includes(genre)) {
                currentAnimeFilters.genres.push(genre);
            }
        } else {
            currentAnimeFilters.genres = currentAnimeFilters.genres.filter(g => g !== genre);
        }
        updateAnimeGenreButtonText();
        updateAnimeFilterTags();
        applyAnimeFiltersAndRender();
    };

    const updateAnimeGenreButtonText = () => {
        if (!animeGenreFilterButton) return;
        const buttonTextSpan = animeGenreFilterButton.querySelector('span');
        if (!buttonTextSpan) return;
        const count = currentAnimeFilters.genres.length;
        if (count === 0) buttonTextSpan.textContent = 'Chọn thể loại...';
        else if (count === 1) buttonTextSpan.textContent = currentAnimeFilters.genres[0];
        else buttonTextSpan.textContent = `${count} thể loại đã chọn`;
    };

    const updateAnimeFilterTags = () => {
        if (!animeFilterTagsContainer) return;
        animeFilterTagsContainer.innerHTML = ''; 

        currentAnimeFilters.genres.forEach(genre => {
            createAnimeTag('genre', genre, genre);
        });

        if (currentAnimeFilters.status !== 'all') {
            const statusOption = animeStatusFilter?.querySelector(`option[value="${currentAnimeFilters.status}"]`);
            const statusText = statusOption ? statusOption.textContent : currentAnimeFilters.status;
            createAnimeTag('status', currentAnimeFilters.status, `Trạng thái: ${statusText}`);
        }

        updateClearAnimeFiltersButtonVisibility();
    };

    const createAnimeTag = (type, value, label) => {
        const tag = document.createElement('button');
        tag.className = 'filter-tag bg-purple-800 border-purple-600 hover:bg-purple-700';
        tag.dataset.filterType = type;
        tag.dataset.filterValue = value;
        tag.innerHTML = `<span class="tag-label">${label}</span><span class="material-icons-outlined remove-tag text-sm">close</span>`;
        tag.setAttribute('aria-label', `Xóa bộ lọc ${label}`);
        animeFilterTagsContainer.appendChild(tag);
    };

    const handleRemoveAnimeTag = (event) => {
        const tagButton = event.target.closest('.filter-tag');
        if (!tagButton) return; 
        const filterType = tagButton.dataset.filterType;
        const filterValue = tagButton.dataset.filterValue;

        switch (filterType) {
            case 'genre':
                currentAnimeFilters.genres = currentAnimeFilters.genres.filter(g => g !== filterValue);
                const checkbox = animeGenreDropdown?.querySelector(`input[value="${filterValue}"]`);
                if (checkbox) checkbox.checked = false;
                updateAnimeGenreButtonText();
                break;
            case 'status':
                currentAnimeFilters.status = 'all';
                if (animeStatusFilter) animeStatusFilter.value = 'all'; 
                break;
        }
        updateAnimeFilterTags();
        applyAnimeFiltersAndRender();
        console.log("Anime filter tag removed.");
    };

    const updateClearAnimeFiltersButtonVisibility = () => {
        if (!clearAnimeFiltersButton) return;
        const hasActiveFilters = currentAnimeFilters.genres.length > 0 ||
                                 currentAnimeFilters.status !== 'all' ||
                                 currentAnimeFilters.sort !== 'default' ||
                                 currentAnimeFilters.search !== ''; 
        clearAnimeFiltersButton.classList.toggle('hidden', !hasActiveFilters);
        clearAnimeFiltersButton.setAttribute('aria-hidden', String(!hasActiveFilters));
    };

    const handleClearAnimeFilters = () => {
        currentAnimeFilters = { genres: [], status: 'all', sort: 'default', search: '' };

        animeGenreDropdown?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateAnimeGenreButtonText();
        if (animeStatusFilter) animeStatusFilter.value = 'all';
        if (animeSortFilter) animeSortFilter.value = 'default';
        if (searchInputDesktop) searchInputDesktop.value = '';
        if (searchInputMobile) searchInputMobile.value = '';
        window.currentAnimeSearchTerm = ''; 

        updateAnimeFilterTags();
        applyAnimeFiltersAndRender();
        console.log("All anime filters cleared.");
    };


    const applyAnimeFiltersAndRender = () => {
        displayAnimeSkeletonLoaders(); 

        let itemsToDisplay = [...allAnimeData]; 
        let filterDescriptions = []; 

        if (currentAnimeFilters.search) {
            const searchTerm = currentAnimeFilters.search.toLowerCase();
            itemsToDisplay = itemsToDisplay.filter(anime =>
                anime.title && anime.title.toLowerCase().includes(searchTerm)
            );
        }

        if (currentAnimeFilters.genres.length > 0) {
            itemsToDisplay = itemsToDisplay.filter(anime => {
                const itemGenres = Array.isArray(anime.genre) ? anime.genre : [];
                return currentAnimeFilters.genres.some(selectedGenre => itemGenres.includes(selectedGenre));
            });
            filterDescriptions.push(`Thể loại: ${currentAnimeFilters.genres.join(', ')}`);
        }

        if (currentAnimeFilters.status !== 'all') {
            itemsToDisplay = itemsToDisplay.filter(anime => anime.status === currentAnimeFilters.status);
             const statusOption = animeStatusFilter?.querySelector(`option[value="${currentAnimeFilters.status}"]`);
             if (statusOption) filterDescriptions.push(`Trạng thái: ${statusOption.textContent}`);
        }

        switch (currentAnimeFilters.sort) {
            case 'newest': itemsToDisplay.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0)); break;
            case 'rating_desc': itemsToDisplay.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
            case 'rating_asc': itemsToDisplay.sort((a, b) => (a.rating || 0) - (b.rating || 0)); break;
            case 'title_asc': itemsToDisplay.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
            case 'title_desc': itemsToDisplay.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
        }

        if (animeGridTitle) {
            let titleText = currentAnimeFilters.search ? `Kết quả cho "${currentAnimeFilters.search}"` : "Tất Cả Anime";
            if (filterDescriptions.length > 0) {
                titleText += ` (${filterDescriptions.join('; ')})`;
            }
            animeGridTitle.textContent = titleText;
        }

        setTimeout(() => {
            populateAnimeGrid(itemsToDisplay);
            updateClearAnimeFiltersButtonVisibility(); 
        }, 150); 
    };


    // --- Search Functionality ---

    const createAnimeSuggestionItem = (item, searchTerm) => {
        const itemType = item.itemType || (item.episodes === null ? 'anime-movie' : 'anime-series');
        const detailPageUrl = `animeDetails.html?id=${item.id}&type=${itemType}`;

        const altText = `Poster nhỏ của Anime ${item.title || 'không có tiêu đề'}`;
        const posterSrc = item.posterUrl || 'https://placehold.co/40x60/1f1f1f/888888?text=N/A';
        const highlightedTitle = highlightTerm(item.title || 'Không có tiêu đề', searchTerm);

        return `
            <a href="${detailPageUrl}" class="suggestion-item" role="option">
                <img src="${posterSrc}" alt="${altText}" loading="lazy" class="w-10 h-15 object-cover rounded border border-border-color">
                <div class="suggestion-item-info">
                    <span class="suggestion-item-title">${highlightedTitle}</span>
                    <span class="suggestion-item-year">${item.releaseYear || 'N/A'}</span>
                </div>
            </a>`;
    };


    const displayAnimeSearchSuggestions = (searchTerm, inputElement, suggestionsContainer) => {
        if (!suggestionsContainer) {
            console.warn("Suggestions container not found for input:", inputElement.id);
            return;
        }
        const placeholder = suggestionsContainer.querySelector('.no-suggestions-placeholder');

        if (!searchTerm) {
            suggestionsContainer.style.display = 'none';
            inputElement.setAttribute('aria-expanded', 'false');
            if (placeholder) placeholder.textContent = 'Nhập để tìm kiếm...'; 
            return;
        }

        if (placeholder) placeholder.textContent = 'Đang tìm...';
        suggestionsContainer.innerHTML = ''; 

        const matchedAnime = allAnimeData
            .filter(anime => anime.title && anime.title.toLowerCase().includes(searchTerm))
            .slice(0, 7); 

        if (matchedAnime.length > 0) {
            suggestionsContainer.innerHTML = matchedAnime.map(anime => createAnimeSuggestionItem(anime, searchTerm)).join('');
            suggestionsContainer.style.display = 'block';
            inputElement.setAttribute('aria-expanded', 'true');
        } else {
            suggestionsContainer.innerHTML = `<div class="no-suggestions-placeholder p-3 text-sm text-text-muted text-center italic">Không tìm thấy Anime nào.</div>`;
            suggestionsContainer.style.display = 'block';
            inputElement.setAttribute('aria-expanded', 'true');
        }
    };

    const hideAllAnimeSearchSuggestions = () => {
        if (suggestionsDesktop) {
            suggestionsDesktop.style.display = 'none';
            if(searchInputDesktop) searchInputDesktop.setAttribute('aria-expanded', 'false');
        }
        if (suggestionsMobile) {
            suggestionsMobile.style.display = 'none';
            if(searchInputMobile) searchInputMobile.setAttribute('aria-expanded', 'false');
        }
    };
 
    const handleAnimeSearchInput = (event) => {
        const inputEl = event.target;
        const suggestionsEl = inputEl === searchInputDesktop ? suggestionsDesktop : suggestionsMobile;
        const term = inputEl.value.trim();
        
        currentAnimeFilters.search = term.toLowerCase();
        SearchUtils.debounce(() => applyAnimeFiltersAndRender(), 300)();
        
        SearchUtils.debounce(() => {
            SearchUtils.displaySearchSuggestions(term, inputEl, suggestionsEl, allAnimeData, {
                maxResults: 8
            });
        }, 150)();
    };

    const handleAnimeSearchSubmit = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const searchTerm = event.target.value.trim();
            
            currentAnimeFilters.search = searchTerm.toLowerCase();
            applyAnimeFiltersAndRender();
            
            hideAllAnimeSearchSuggestions();
            event.target.blur();
        }
    };

    searchInputDesktop?.addEventListener('input', handleAnimeSearchInput);
    searchInputMobile?.addEventListener('input', handleAnimeSearchInput);
    searchInputDesktop?.addEventListener('keydown', handleAnimeSearchSubmit);
    searchInputMobile?.addEventListener('keydown', handleAnimeSearchSubmit);

    document.addEventListener('click', (event) => {
        const target = event.target;
        const isInsideDesktopSearch = searchInputDesktop?.contains(target) || suggestionsDesktop?.contains(target);
        const isInsideMobileSearch = searchInputMobile?.contains(target) || suggestionsMobile?.contains(target) || searchIconMobile?.contains(target) || mobileSearchContainer?.contains(target);
        const isInsideGenreFilter = animeGenreDropdown?.contains(target) || animeGenreFilterButton?.contains(target);
        const isInsideFilterControls = animeFilterSection?.contains(target);
        const isFilterIcon = filterIconButtonDesktop?.contains(target) || filterIconButtonMobile?.contains(target);

        if (!isInsideDesktopSearch && !isInsideMobileSearch) {
            hideAllAnimeSearchSuggestions();
        }
        if (!isInsideGenreFilter && animeGenreDropdown && !animeGenreDropdown.classList.contains('hidden')) {
            animeGenreDropdown.classList.add('hidden');
            animeGenreFilterButton?.setAttribute('aria-expanded', 'false');
        }
        if (animeFilterSection && !animeFilterSection.classList.contains('hidden') &&
            !isInsideFilterControls && !isFilterIcon) {
            animeFilterSection.classList.add('hidden');
        }
    });

    // --- Mobile Menu & Search Toggle Logic ---
    const openMobileMenu = () => {
        mobileMenuPanel?.classList.remove('translate-x-full');
        mobileMenuPanel?.classList.add('translate-x-0');
        mobileMenuOverlay?.classList.remove('hidden');
        mobileMenuButton?.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    };
    const closeMobileMenu = () => {
        mobileMenuPanel?.classList.remove('translate-x-0');
        mobileMenuPanel?.classList.add('translate-x-full');
        mobileMenuOverlay?.classList.add('hidden');
        mobileMenuButton?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    };
    mobileMenuButton?.addEventListener('click', openMobileMenu);
    closeMobileMenuButton?.addEventListener('click', closeMobileMenu);
    mobileMenuOverlay?.addEventListener('click', closeMobileMenu);

    searchIconMobile?.addEventListener('click', () => {
        const isHidden = mobileSearchContainer?.classList.toggle('hidden');
        searchIconMobile.setAttribute('aria-expanded', String(!isHidden));
        if (!isHidden) searchInputMobile?.focus();
        else hideAllAnimeSearchSuggestions(); 
    });


    // --- Scroll-to-Top Functionality ---
    const handleScroll = () => {
        if (!scrollToTopButton) return;
        const isVisible = window.scrollY > 300; 
        scrollToTopButton.classList.toggle('visible', isVisible);
        scrollToTopButton.classList.toggle('hidden', !isVisible);
        scrollToTopButton.setAttribute('aria-hidden', String(!isVisible));
    };
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('scroll', handleScroll);
    scrollToTopButton?.addEventListener('click', scrollToTop);
    handleScroll(); 

    // --- ANIME FILTER TOGGLE ---
    const toggleAnimeFilterSection = (event) => {
        event.preventDefault(); 
        if (animeFilterSection) {
            const isHidden = animeFilterSection.classList.toggle('hidden');
            console.log("Anime filter controls visibility toggled:", !isHidden);
            if (!isHidden) {
                setTimeout(() => {
                    animeFilterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50); 
            }
        } else {
            console.error("Anime filter section element not found.");
        }
        if (event.currentTarget === filterIconButtonMobile && mobileMenuPanel && !mobileMenuPanel.classList.contains('translate-x-full')) {
            closeMobileMenu();
        }
    };
    filterIconButtonDesktop?.addEventListener('click', toggleAnimeFilterSection);
    filterIconButtonMobile?.addEventListener('click', toggleAnimeFilterSection);

    // --- Initial Load ---
    const loadInitialAnimeData = async () => {
        displayAnimeSkeletonLoaders(); 

        try {
            console.log("Attempting to fetch animeData.json...");
            const response = await fetch('../json/animeData.json'); 
            console.log("Fetch response status:", response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, message: ${response.statusText}`);
            }
            
            const jsonData = await response.json();
            console.log("Fetched JSON data:", jsonData);

            if (!Array.isArray(jsonData)) {
                 console.error("Fetched data is not an array. Data type:", typeof jsonData, "Data:", jsonData);
                 throw new Error("Dữ liệu Anime nhận được không hợp lệ (không phải là mảng).");
            }
            
            allAnimeData = jsonData;
            filteredAnimeData = [...allAnimeData]; 

            console.log(`Fetched ${allAnimeData.length} anime items successfully.`);

            const featuredAnime = allAnimeData.find(a => a.isTrending) || allAnimeData[0];
            updateAnimeHero(featuredAnime);

            setupAnimeGenreFilter(); 

            animeStatusFilter?.addEventListener('change', (e) => { currentAnimeFilters.status = e.target.value; updateAnimeFilterTags(); applyAnimeFiltersAndRender(); });
            animeSortFilter?.addEventListener('change', (e) => { currentAnimeFilters.sort = e.target.value; updateAnimeFilterTags(); applyAnimeFiltersAndRender(); });
            animeGenreFilterButton?.addEventListener('click', (e) => {
                e.stopPropagation(); 
                animeGenreDropdown?.classList.toggle('hidden');
                animeGenreFilterButton.setAttribute('aria-expanded', String(!animeGenreDropdown?.classList.contains('hidden')));
            });
            animeFilterTagsContainer?.addEventListener('click', handleRemoveAnimeTag);
            clearAnimeFiltersButton?.addEventListener('click', handleClearAnimeFilters);

            applyAnimeFiltersAndRender();

            const footerYearSpan = document.getElementById('footer-year');
            if (footerYearSpan) {
                footerYearSpan.textContent = new Date().getFullYear();
            }

        } catch (error) {
            console.error("Error loading anime data:", error.message, error.stack);
            if (allAnimeGrid) {
                allAnimeGrid.innerHTML = `<p class="text-red-400 bg-red-900/30 border border-red-700 rounded-md p-6 col-span-full text-center py-4 text-lg">
                                            <i class="fas fa-exclamation-triangle mr-2"></i>
                                            Lỗi nghiêm trọng khi tải dữ liệu Anime. Vui lòng kiểm tra console (F12) để biết thêm chi tiết hoặc liên hệ quản trị viên.
                                            <br><small class="text-sm text-red-300">Nguyên nhân có thể: Đường dẫn file JSON sai, file JSON lỗi, hoặc vấn đề mạng.</small>
                                          </p>`;
            }
            if (noResultsIndicator) {
                noResultsIndicator.textContent = "Lỗi tải dữ liệu Anime."; 
                noResultsIndicator.classList.remove('hidden'); 
            }
            updateAnimeHero(null); 
        } finally {
             if (loadingIndicator) loadingIndicator.classList.add('hidden');
        }
    };

    loadInitialAnimeData();

    console.log("Trang Anime đã được tải và JS đã cập nhật (v1.7).");

}); 