// js/anime.js - JavaScript for Anime Page Functionality
// Handles data loading, display, hero update, search, mobile interactions, and ANIME-SPECIFIC FILTERS.
// v1.5: Updated detailPageUrl logic in createAnimeCard and createAnimeSuggestionItem to always point to animeDetails.html.

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
        // *** CẬP NHẬT LOGIC LIÊN KẾT ANIME CARD ***
        // Luôn trỏ đến animeDetails.html cho cả anime-series và anime-movie
        // Xác định itemType, mặc định là 'anime-series' nếu không có hoặc episodes không null
        const itemType = anime.itemType || (anime.episodes === null ? 'anime-movie' : 'anime-series');
        const detailPageUrl = `animeDetails.html?id=${anime.id}&type=${itemType}`;
        // *** KẾT THÚC CẬP NHẬT LOGIC ***

        const posterUrl = anime.posterUrl || 'https://placehold.co/300x450/1f1f1f/888888?text=No+Poster';
        const title = anime.title || 'Không có tiêu đề';
        const rating = anime.rating ? anime.rating.toFixed(1) : 'N/A';
        // Determine display text for episodes/movie
        let episodesText = 'N/A';
        if (itemType === 'anime-movie') { // Use determined itemType
            episodesText = 'Movie';
        } else if (anime.totalEpisodes) {
            episodesText = `${anime.totalEpisodes} Tập`;
        } else if (anime.seasons && anime.seasons[0] && anime.seasons[0].episodes) {
            episodesText = `${anime.seasons[0].episodes.length} Tập`; // Fallback if totalEpisodes is missing
        }

        const year = anime.releaseYear || 'N/A';
        const altText = `Poster Anime: ${title} (${year})`;
        // Highlight search term if active
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
        if (loadingIndicator) loadingIndicator.classList.add('hidden'); // Hide loading

        if (!animeList || animeList.length === 0) {
            allAnimeGrid.innerHTML = ''; // Clear any skeletons
            if (noResultsIndicator) {
                 noResultsIndicator.textContent = currentAnimeFilters.search
                    ? `Không tìm thấy Anime nào cho "${currentAnimeFilters.search}".`
                    : "Không tìm thấy Anime nào phù hợp với bộ lọc.";
                noResultsIndicator.classList.remove('hidden');
            }
            return;
        }

        if (noResultsIndicator) noResultsIndicator.classList.add('hidden'); // Hide no results message
        allAnimeGrid.innerHTML = animeList.map(createAnimeCard).join('');
    };

    /**
     * Displays skeleton loading cards in the main anime grid.
     */
    const displayAnimeSkeletonLoaders = () => {
        if (!allAnimeGrid) return;
        if (loadingIndicator) loadingIndicator.classList.remove('hidden'); // Hide text loading
        if (noResultsIndicator) noResultsIndicator.classList.add('hidden'); // Hide no results

        const skeletonCount = 12; // Show more skeletons for the main grid
        let skeletonsHTML = '';
        for (let i = 0; i < skeletonCount; i++) {
            let hiddenClasses = '';
            if (i >= 2 && i < 3) hiddenClasses = 'hidden sm:block';
            if (i >= 3 && i < 4) hiddenClasses = 'hidden md:block';
            if (i >= 4 && i < 5) hiddenClasses = 'hidden lg:block';
            if (i >= 5 && i < 6) hiddenClasses = 'hidden xl:block'; // Ensure enough skeletons for xl
            // Adjust logic to show more skeletons on larger screens if needed
            // For example, keep showing them on xl beyond the 6th
            if (i >= 6) hiddenClasses = 'hidden xl:block'; // Example: Hide extras on smaller screens

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
        if (!heroSection || !anime) {
            // Set default/fallback state
            if (heroSection) heroSection.style.backgroundImage = `url('https://placehold.co/1920x700/1a1a1a/666666?text=Anime+Hero+Background')`;
            if (heroTitle) heroTitle.textContent = "Thế Giới Anime";
            if (heroGenresContainer) heroGenresContainer.innerHTML = '';
            if (heroDescription) heroDescription.textContent = "Khám phá bộ sưu tập Anime mới nhất và hay nhất.";
            if (heroButton) heroButton.style.display = 'none';
            console.warn("updateAnimeHero: Missing hero section or anime data. Setting default.");
            return;
        }

        // Set background image
        const heroImageUrl = anime.heroImage || anime.posterUrl || 'https://placehold.co/1920x700/1a1a1a/666666?text=No+Hero+Image';
        heroSection.style.backgroundImage = `url('${heroImageUrl}')`;

        // Update text content
        if (heroTitle) heroTitle.textContent = anime.title || 'Không có tiêu đề';

        // Update genres
        if (heroGenresContainer && Array.isArray(anime.genre)) {
            heroGenresContainer.innerHTML = anime.genre.map(g =>
                `<span class="px-2 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur-sm border border-white/20">${g}</span>`
            ).join('');
        } else if (heroGenresContainer) {
            heroGenresContainer.innerHTML = ''; // Clear if no genres
        }

        // Update description (truncated)
        if (heroDescription) {
            heroDescription.textContent = anime.description ? (anime.description.length > 180 ? anime.description.substring(0, 180) + '...' : anime.description) : 'Không có mô tả.';
        }

        // Update hero button
        if (heroButton) {
            heroButton.style.display = 'inline-flex'; // Show the button
            // *** CẬP NHẬT LOGIC LIÊN KẾT NÚT HERO ***
            // Luôn trỏ đến animeDetails.html
            const itemType = anime.itemType || (anime.episodes === null ? 'anime-movie' : 'anime-series');
            const detailPageUrl = `animeDetails.html?id=${anime.id}&type=${itemType}`;
            // *** KẾT THÚC CẬP NHẬT LOGIC ***
            heroButton.onclick = () => { window.location.href = detailPageUrl; }; // Set click action
            heroButton.innerHTML = `<i class="fas fa-play"></i> Xem Ngay ${anime.title || ''}`; // Update text
        }

        // Trigger fade-in animation for content
        const heroContentElement = document.querySelector('.hero-content-anime');
        if (heroContentElement) {
            heroContentElement.classList.remove('animate-fade-in-up'); // Remove class to reset animation
            void heroContentElement.offsetWidth; // Force reflow
            heroContentElement.classList.add('animate-fade-in-up'); // Re-add class to trigger animation
        }
    };


    // --- ANIME FILTER Logic ---

    /**
     * Sets up the anime genre filter dropdown.
     */
    const setupAnimeGenreFilter = () => {
        if (!animeGenreDropdown || !animeGenreFilterButton) return;

        // Extract unique genres from allAnimeData
        const genres = new Set();
        allAnimeData.forEach(anime => {
            if (Array.isArray(anime.genre)) {
                anime.genre.forEach(g => { if (typeof g === 'string' && g.trim()) genres.add(g.trim()); });
            }
        });
        uniqueAnimeGenres = Array.from(genres).sort();

        animeGenreDropdown.innerHTML = ''; // Clear loading/previous
        if (uniqueAnimeGenres.length === 0) {
            animeGenreDropdown.innerHTML = '<div class="p-3 text-sm text-text-muted italic">Không có thể loại nào.</div>';
            updateAnimeGenreButtonText();
            return;
        }

        // Create checkboxes for each unique genre
        uniqueAnimeGenres.forEach(genre => {
            const label = document.createElement('label');
            label.className = 'block px-3 py-1.5 hover:bg-gray-700 rounded cursor-pointer flex items-center text-sm'; // Adjusted styles
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = genre;
            checkbox.className = 'mr-2 accent-anime-accent'; // Use anime accent color
            checkbox.checked = currentAnimeFilters.genres.includes(genre); // Check based on current filter state
            checkbox.addEventListener('change', handleAnimeGenreChange); // Add listener
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(genre));
            animeGenreDropdown.appendChild(label);
        });
        updateAnimeGenreButtonText(); // Update button text initially
    };

    /**
     * Handles changes in the anime genre filter checkboxes.
     * @param {Event} event - The change event object.
     */
    const handleAnimeGenreChange = (event) => {
        const genre = event.target.value;
        const isChecked = event.target.checked;
        // Add or remove genre from the filter state
        if (isChecked) {
            if (!currentAnimeFilters.genres.includes(genre)) {
                currentAnimeFilters.genres.push(genre);
            }
        } else {
            currentAnimeFilters.genres = currentAnimeFilters.genres.filter(g => g !== genre);
        }
        // Update UI
        updateAnimeGenreButtonText();
        updateAnimeFilterTags();
        applyAnimeFiltersAndRender();
        // updateUrlParams(); // Optional: Add URL param update if needed for anime filters
    };

    /**
     * Updates the text displayed on the anime genre filter button.
     */
    const updateAnimeGenreButtonText = () => {
        if (!animeGenreFilterButton) return;
        const buttonTextSpan = animeGenreFilterButton.querySelector('span');
        if (!buttonTextSpan) return;
        const count = currentAnimeFilters.genres.length;
        // Set text based on selection count
        if (count === 0) buttonTextSpan.textContent = 'Chọn thể loại...';
        else if (count === 1) buttonTextSpan.textContent = currentAnimeFilters.genres[0];
        else buttonTextSpan.textContent = `${count} thể loại đã chọn`;
    };

    /**
     * Creates and displays filter tags for active anime filters.
     */
    const updateAnimeFilterTags = () => {
        if (!animeFilterTagsContainer) return;
        animeFilterTagsContainer.innerHTML = ''; // Clear existing tags

        // Genre Tags
        currentAnimeFilters.genres.forEach(genre => {
            createAnimeTag('genre', genre, genre);
        });

        // Status Tag
        if (currentAnimeFilters.status !== 'all') {
            const statusOption = animeStatusFilter?.querySelector(`option[value="${currentAnimeFilters.status}"]`);
            const statusText = statusOption ? statusOption.textContent : currentAnimeFilters.status;
            createAnimeTag('status', currentAnimeFilters.status, `Trạng thái: ${statusText}`);
        }

        // Update clear button visibility
        updateClearAnimeFiltersButtonVisibility();
    };

    /**
     * Helper function to create an anime filter tag button.
     * @param {string} type - Filter type ('genre', 'status').
     * @param {string} value - Filter value.
     * @param {string} label - Display label for the tag.
     */
    const createAnimeTag = (type, value, label) => {
        const tag = document.createElement('button');
        // Use anime accent colors for tags on this page
        tag.className = 'filter-tag bg-purple-800 border-purple-600 hover:bg-purple-700';
        tag.dataset.filterType = type;
        tag.dataset.filterValue = value;
        tag.innerHTML = `<span class="tag-label">${label}</span><span class="material-icons-outlined remove-tag text-sm">close</span>`;
        tag.setAttribute('aria-label', `Xóa bộ lọc ${label}`);
        animeFilterTagsContainer.appendChild(tag);
    };

    /**
     * Handles the removal of an anime filter tag.
     * @param {Event} event - The click event object.
     */
    const handleRemoveAnimeTag = (event) => {
        const tagButton = event.target.closest('.filter-tag');
        if (!tagButton) return; // Ignore clicks not on a tag
        const filterType = tagButton.dataset.filterType;
        const filterValue = tagButton.dataset.filterValue;

        // Update filter state based on the tag removed
        switch (filterType) {
            case 'genre':
                currentAnimeFilters.genres = currentAnimeFilters.genres.filter(g => g !== filterValue);
                // Uncheck the corresponding checkbox
                const checkbox = animeGenreDropdown?.querySelector(`input[value="${filterValue}"]`);
                if (checkbox) checkbox.checked = false;
                updateAnimeGenreButtonText();
                break;
            case 'status':
                currentAnimeFilters.status = 'all';
                if (animeStatusFilter) animeStatusFilter.value = 'all'; // Reset dropdown
                break;
        }
        // Update UI
        updateAnimeFilterTags();
        applyAnimeFiltersAndRender();
        // updateUrlParams(); // Optional
        console.log("All anime filters cleared.");
    };

    /**
     * Updates the visibility of the "Clear Anime Filters" button.
     */
    const updateClearAnimeFiltersButtonVisibility = () => {
        if (!clearAnimeFiltersButton) return;
        // Check if any anime-specific filter is active
        const hasActiveFilters = currentAnimeFilters.genres.length > 0 ||
                                 currentAnimeFilters.status !== 'all' ||
                                 currentAnimeFilters.sort !== 'default' ||
                                 currentAnimeFilters.search !== ''; // Include search
        clearAnimeFiltersButton.classList.toggle('hidden', !hasActiveFilters);
        clearAnimeFiltersButton.setAttribute('aria-hidden', String(!hasActiveFilters));
    };

    /**
     * Handles clearing all active anime filters.
     */
    const handleClearAnimeFilters = () => {
        // Reset filter state
        currentAnimeFilters = { genres: [], status: 'all', sort: 'default', search: '' };

        // Reset filter UI controls
        animeGenreDropdown?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateAnimeGenreButtonText();
        if (animeStatusFilter) animeStatusFilter.value = 'all';
        if (animeSortFilter) animeSortFilter.value = 'default';
        // Clear search inputs as well
        if (searchInputDesktop) searchInputDesktop.value = '';
        if (searchInputMobile) searchInputMobile.value = '';
        window.currentAnimeSearchTerm = ''; // Clear global search term too

        // Update UI
        updateAnimeFilterTags();
        applyAnimeFiltersAndRender();
        // updateUrlParams(); // Optional
        console.log("All anime filters cleared.");
    };


    /**
     * Filters and renders anime based on the current filter state and search term.
     */
    const applyAnimeFiltersAndRender = () => {
        displayAnimeSkeletonLoaders(); // Show skeletons while filtering

        let itemsToDisplay = [...allAnimeData]; // Start with all anime
        let filterDescriptions = []; // To build the subtitle

        // 1. Apply Search Filter
        if (currentAnimeFilters.search) {
            const searchTerm = currentAnimeFilters.search.toLowerCase();
            itemsToDisplay = itemsToDisplay.filter(anime =>
                anime.title && anime.title.toLowerCase().includes(searchTerm)
            );
        }

        // 2. Apply Genre Filter
        if (currentAnimeFilters.genres.length > 0) {
            itemsToDisplay = itemsToDisplay.filter(anime => {
                const itemGenres = Array.isArray(anime.genre) ? anime.genre : [];
                return currentAnimeFilters.genres.some(selectedGenre => itemGenres.includes(selectedGenre));
            });
            filterDescriptions.push(`Thể loại: ${currentAnimeFilters.genres.join(', ')}`);
        }

        // 3. Apply Status Filter
        if (currentAnimeFilters.status !== 'all') {
            itemsToDisplay = itemsToDisplay.filter(anime => anime.status === currentAnimeFilters.status);
             const statusOption = animeStatusFilter?.querySelector(`option[value="${currentAnimeFilters.status}"]`);
             if (statusOption) filterDescriptions.push(`Trạng thái: ${statusOption.textContent}`);
        }

        // 4. Apply Sorting
        switch (currentAnimeFilters.sort) {
            case 'newest': itemsToDisplay.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0)); break;
            case 'rating_desc': itemsToDisplay.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
            case 'rating_asc': itemsToDisplay.sort((a, b) => (a.rating || 0) - (b.rating || 0)); break;
            case 'title_asc': itemsToDisplay.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
            case 'title_desc': itemsToDisplay.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
            // 'default' requires no additional sorting
        }

        // 5. Update Grid Title
        if (animeGridTitle) {
            let titleText = currentAnimeFilters.search ? `Kết quả cho "${currentAnimeFilters.search}"` : "Tất Cả Anime";
            if (filterDescriptions.length > 0) {
                titleText += ` (${filterDescriptions.join('; ')})`;
            }
            animeGridTitle.textContent = titleText;
        }

        // 6. Render the filtered and sorted items
        // Use a small delay to allow skeletons to show before rendering
        setTimeout(() => {
            populateAnimeGrid(itemsToDisplay);
            updateClearAnimeFiltersButtonVisibility(); // Update clear button based on final filter state
        }, 150); // Small delay
    };


    // --- Search Functionality ---

    /**
     * Creates HTML for a search suggestion item.
     * @param {object} item The anime data object.
     * @param {string} searchTerm The current search term for highlighting.
     * @returns {string} HTML string for the suggestion item.
     */
    const createAnimeSuggestionItem = (item, searchTerm) => {
        // *** CẬP NHẬT LOGIC LIÊN KẾT GỢI Ý TÌM KIẾM ***
        // Luôn trỏ đến animeDetails.html cho cả anime-series và anime-movie
        // Xác định itemType, mặc định là 'anime-series' nếu không có hoặc episodes không null
        const itemType = item.itemType || (item.episodes === null ? 'anime-movie' : 'anime-series');
        const detailPageUrl = `animeDetails.html?id=${item.id}&type=${itemType}`;
        // *** KẾT THÚC CẬP NHẬT LOGIC ***

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


    /**
     * Displays search suggestions.
     * @param {string} searchTerm The term entered by the user.
     * @param {HTMLInputElement} inputElement The input element triggering the search.
     * @param {HTMLElement} suggestionsContainer The container to display suggestions in.
     */
    const displayAnimeSearchSuggestions = (searchTerm, inputElement, suggestionsContainer) => {
        if (!suggestionsContainer) {
            console.warn("Suggestions container not found for input:", inputElement.id);
            return;
        }
        const placeholder = suggestionsContainer.querySelector('.no-suggestions-placeholder');

        // Hide suggestions if search term is empty
        if (!searchTerm) {
            suggestionsContainer.style.display = 'none';
            inputElement.setAttribute('aria-expanded', 'false');
            if (placeholder) placeholder.textContent = 'Nhập để tìm kiếm...'; // Reset placeholder
            return;
        }

        // Show "Searching..." while filtering
        if (placeholder) placeholder.textContent = 'Đang tìm...';
        suggestionsContainer.innerHTML = ''; // Clear previous suggestions

        // Filter anime data based on the search term
        const matchedAnime = allAnimeData
            .filter(anime => anime.title && anime.title.toLowerCase().includes(searchTerm))
            .slice(0, 7); // Limit suggestions

        // Display results or "No results" message
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

    /**
     * Hides all search suggestion dropdowns.
     */
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

    // Handle search functionality 
    const handleAnimeSearchInput = (event) => {
        const inputEl = event.target;
        const suggestionsEl = inputEl === searchInputDesktop ? suggestionsDesktop : suggestionsMobile;
        const term = inputEl.value.trim();
        
        // Update global filter state
        currentAnimeFilters.search = term.toLowerCase();
        SearchUtils.debounce(() => applyAnimeFiltersAndRender(), 300)();
        
        // Use unified search utility for suggestions
        SearchUtils.debounce(() => {
            // Display search suggestions
            SearchUtils.displaySearchSuggestions(term, inputEl, suggestionsEl, allAnimeData, {
                maxResults: 8
            });
        }, 150)();
    };

    // Handle search form submission
    const handleAnimeSearchSubmit = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const searchTerm = event.target.value.trim();
            
            // Update filter and apply
            currentAnimeFilters.search = searchTerm.toLowerCase();
            applyAnimeFiltersAndRender();
            
            // Hide suggestions and blur input
            hideAllAnimeSearchSuggestions();
            event.target.blur();
        }
    };

    // Attach input listeners
    searchInputDesktop?.addEventListener('input', handleAnimeSearchInput);
    searchInputMobile?.addEventListener('input', handleAnimeSearchInput);
    searchInputDesktop?.addEventListener('keydown', handleAnimeSearchSubmit);
    searchInputMobile?.addEventListener('keydown', handleAnimeSearchSubmit);

    // Hide suggestions on click outside
    document.addEventListener('click', (event) => {
        const target = event.target;
        // Check if click is inside search areas or filter dropdowns
        const isInsideDesktopSearch = searchInputDesktop?.contains(target) || suggestionsDesktop?.contains(target);
        const isInsideMobileSearch = searchInputMobile?.contains(target) || suggestionsMobile?.contains(target) || searchIconMobile?.contains(target) || mobileSearchContainer?.contains(target);
        const isInsideGenreFilter = animeGenreDropdown?.contains(target) || animeGenreFilterButton?.contains(target);
        const isInsideFilterControls = animeFilterSection?.contains(target);
        const isFilterIcon = filterIconButtonDesktop?.contains(target) || filterIconButtonMobile?.contains(target);

        // Hide search suggestions if click is outside search areas
        if (!isInsideDesktopSearch && !isInsideMobileSearch) {
            hideAllAnimeSearchSuggestions();
        }
        // Hide ANIME genre dropdown if click is outside its area
        if (!isInsideGenreFilter && animeGenreDropdown && !animeGenreDropdown.classList.contains('hidden')) {
            animeGenreDropdown.classList.add('hidden');
            animeGenreFilterButton?.setAttribute('aria-expanded', 'false');
        }
        // Hide ANIME Filter Controls when clicking outside (unless it's the filter icon itself)
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

    // Mobile search toggle
    searchIconMobile?.addEventListener('click', () => {
        const isHidden = mobileSearchContainer?.classList.toggle('hidden');
        searchIconMobile.setAttribute('aria-expanded', String(!isHidden));
        if (!isHidden) searchInputMobile?.focus();
        else hideAllAnimeSearchSuggestions(); // Hide suggestions when closing search
    });


    // --- Scroll-to-Top Functionality ---
    const handleScroll = () => {
        if (!scrollToTopButton) return;
        const isVisible = window.scrollY > 300; // Show after scrolling 300px
        scrollToTopButton.classList.toggle('visible', isVisible);
        scrollToTopButton.classList.toggle('hidden', !isVisible);
        scrollToTopButton.setAttribute('aria-hidden', String(!isVisible));
    };
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('scroll', handleScroll);
    scrollToTopButton?.addEventListener('click', scrollToTop);
    handleScroll(); // Initial check

    // --- ANIME FILTER TOGGLE ---
    const toggleAnimeFilterSection = (event) => {
        event.preventDefault(); // Prevent default anchor jump if it's a link
        if (animeFilterSection) {
            const isHidden = animeFilterSection.classList.toggle('hidden');
            console.log("Anime filter controls visibility toggled:", !isHidden);
            // Optional: Scroll to the filter section when opening
            if (!isHidden) {
                setTimeout(() => {
                    animeFilterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50); // Small delay to allow display change
            }
        } else {
            console.error("Anime filter section element not found.");
        }
        // Close mobile menu if open and the mobile filter icon was clicked
        if (event.currentTarget === filterIconButtonMobile && mobileMenuPanel && !mobileMenuPanel.classList.contains('translate-x-full')) {
            closeMobileMenu();
        }
    };
    filterIconButtonDesktop?.addEventListener('click', toggleAnimeFilterSection);
    filterIconButtonMobile?.addEventListener('click', toggleAnimeFilterSection);

    // --- Initial Load ---
    /**
     * Loads initial anime data from JSON and populates the UI.
     */
    const loadInitialAnimeData = async () => {
        displayAnimeSkeletonLoaders(); // Show skeletons initially

        try {
            // Fetch anime data
            const response = await fetch('../json/animeData.json'); // Adjusted path
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allAnimeData = await response.json();
            filteredAnimeData = [...allAnimeData]; // Initialize filtered data

            console.log(`Fetched ${allAnimeData.length} anime items.`);

            // 1. Update Hero Section
            // Find a trending or the first item for the hero
            const featuredAnime = allAnimeData.find(a => a.isTrending) || allAnimeData[0];
            updateAnimeHero(featuredAnime);

            // 2. Setup Filters
            setupAnimeGenreFilter(); // Populate genre filter dropdown

            // 3. Add Filter Event Listeners
            animeStatusFilter?.addEventListener('change', (e) => { currentAnimeFilters.status = e.target.value; updateAnimeFilterTags(); applyAnimeFiltersAndRender(); });
            animeSortFilter?.addEventListener('change', (e) => { currentAnimeFilters.sort = e.target.value; updateAnimeFilterTags(); applyAnimeFiltersAndRender(); });
            // Toggle genre dropdown visibility
            animeGenreFilterButton?.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent click from closing immediately
                animeGenreDropdown?.classList.toggle('hidden');
                animeGenreFilterButton.setAttribute('aria-expanded', String(!animeGenreDropdown?.classList.contains('hidden')));
            });
            // Listener for removing tags
            animeFilterTagsContainer?.addEventListener('click', handleRemoveAnimeTag);
            // Listener for clearing all filters
            clearAnimeFiltersButton?.addEventListener('click', handleClearAnimeFilters);

            // 4. Initial Render (apply default filters which might be none)
            applyAnimeFiltersAndRender();

            // Set footer year
            const footerYearSpan = document.getElementById('footer-year');
            if (footerYearSpan) {
                footerYearSpan.textContent = new Date().getFullYear();
            }

        } catch (error) {
            // Handle fetch or processing errors
            console.error("Error loading anime data:", error);
            if (allAnimeGrid) allAnimeGrid.innerHTML = '<p class="text-red-500 col-span-full text-center py-4">Lỗi tải dữ liệu Anime. Vui lòng thử lại sau.</p>';
            if (noResultsIndicator) noResultsIndicator.classList.remove('hidden'); // Show error indicator
            updateAnimeHero(null); // Set hero to default/error state
        } finally {
             // Always hide the text loading indicator when done
             if (loadingIndicator) loadingIndicator.classList.add('hidden');
        }
    };

    // Load data when the page is ready
    loadInitialAnimeData();

    console.log("Trang Anime đã được tải và JS đã cập nhật với bộ lọc và sửa lỗi liên kết (v1.5).");

}); // End DOMContentLoaded
