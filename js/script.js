// script.js - Updated for Advanced Filters, Tags, URL Params, Sliders, Tab Transitions, Responsiveness, and Error Handling

// --- Make data arrays globally accessible for inline script (header search) ---
window.allMovies = [];
window.allSeries = [];

document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const genreFilterContainer = document.getElementById('genre-filter-container');
    const genreFilterButton = document.getElementById('genre-filter-button');
    const genreDropdown = document.getElementById('genre-dropdown');
    const sortFilter = document.getElementById('sort-filter');
    const movieGrid = document.getElementById('movie-grid');
    const movieGridSection = document.getElementById('movie-grid-section'); // Parent for transition
    const movieGridTitle = document.getElementById('movie-grid-title');
    // const loadingMovies = document.getElementById('loading-movies'); // Skeleton is preferred
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

    // --- State Variables ---
    let currentContentType = 'movies'; // Default content type
    let uniqueGenres = { movies: [], series: [] }; // Store unique genres for each type
    let currentFilters = { // Store current filter state
        genres: [],
        yearRange: [null, null], // [min, max] - Populated after data load
        ratingRange: [0, 10],    // [min, max] - Default rating range
        sort: 'default',
        search: ''
    };
    let yearSliderInstance = null; // noUiSlider instance for year
    let ratingSliderInstance = null; // noUiSlider instance for rating
    let minMaxYears = { movies: [Infinity, -Infinity], series: [Infinity, -Infinity] }; // Store min/max years per type
    let observer; // Intersection Observer for animations
    let filterDebounceTimer; // Timer for debouncing slider updates
    const TAB_TRANSITION_DURATION = 300; // Milliseconds, should match CSS transition

    // --- Helper Functions ---

    /**
     * Debounce function to limit the rate at which a function can fire.
     * @param {Function} func - The function to debounce.
     * @param {number} wait - The debounce delay in milliseconds.
     * @returns {Function} - The debounced function.
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
     * Creates the HTML string for a movie or series card.
     * @param {object} item - Movie or series data object.
     * @param {string} type - Content type ('movies' or 'series').
     * @returns {string} - HTML string for the card.
     */
    const createItemCard = (item, type) => {
        const detailPageUrl = type === 'series'
            ? `pages/filmDetails_phimBo.html?id=${item.id}&type=series`
            : `pages/filmDetail.html?id=${item.id}&type=movies`;
        const altText = `Poster ${type === 'movies' ? 'phim' : 'phim bộ'} ${item.title || 'không có tiêu đề'}, năm ${item.releaseYear || 'không rõ'}`;
        const seriesBadge = type === 'series'
            ? `<span class="absolute top-2 right-2 bg-primary text-white text-xs font-semibold px-2 py-1 rounded shadow-md">Phim Bộ</span>`
            : '';
        const posterUrl = item.posterUrl || 'https://placehold.co/300x450/111111/eeeeee?text=No+Poster';
        const titleText = item.title || 'Không có tiêu đề';
        const yearText = item.releaseYear || 'N/A';

        return `
            <a href="${detailPageUrl}" class="bg-light-gray rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition duration-300 cursor-pointer group relative block movie-card animate-on-scroll" data-item-id="${item.id}" data-item-type="${type}" aria-label="Xem chi tiết ${type === 'movies' ? 'phim' : 'phim bộ'} ${titleText}">
                <img src="${posterUrl}" alt="${altText}" class="w-full h-auto object-cover aspect-[2/3]" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/300x450/111111/eeeeee?text=Error'; this.alt='Lỗi tải ảnh poster ${titleText}';">
                ${seriesBadge}
                 <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100" aria-hidden="true">
                    <i class="fas fa-play text-white text-4xl"></i>
                </div>
                <div class="p-3">
                    <h3 class="font-semibold text-gray-200 text-sm md:text-base truncate" title="${titleText}">${titleText}</h3>
                    <p class="text-xs text-text-muted">${yearText}</p>
                </div>
            </a>
        `;
    };

    /**
     * Renders the list of movies or series onto the main grid.
     * @param {Array<object>} items - Array of movie or series data.
     * @param {string} type - Content type ('movies' or 'series').
     */
    const renderContentList = (items, type) => {
        if (!movieGrid) {
            console.error("Movie grid element not found.");
            return;
        }
        if (observer) observer.disconnect(); // Disconnect previous observer

        // Remove any existing skeleton cards
        const skeletons = movieGrid.querySelectorAll('.movie-card-skeleton');
        skeletons.forEach(skeleton => skeleton.remove());

        if (items.length === 0) {
            movieGrid.innerHTML = ''; // Clear grid
            if (noMoviesFound) {
                noMoviesFound.classList.remove('hidden');
                noMoviesFound.textContent = `Không tìm thấy ${type === 'movies' ? 'phim lẻ' : 'phim bộ'} nào phù hợp với bộ lọc.`;
            }
        } else {
            if (noMoviesFound) noMoviesFound.classList.add('hidden');
            // Generate HTML and add data-index for animation
            movieGrid.innerHTML = items.map((item, index) => {
                const cardHTML = createItemCard(item, type);
                 const cardWithIndex = cardHTML.replace('<a ', `<a data-index="${index}" `);
                 return cardWithIndex;
            }).join('');
            // Observe new cards
            observeElements(movieGrid.querySelectorAll('.animate-on-scroll'));
        }
    };

    /**
     * Displays skeleton loading cards in the grid area.
     */
    const showSkeletonCards = () => {
        if (!movieGrid) return;
        movieGrid.innerHTML = '';
        if(noMoviesFound) noMoviesFound.classList.add('hidden');

        const skeletonCount = 12; // Adjust based on max columns
        let skeletonHTML = '';
        for (let i = 0; i < skeletonCount; i++) {
            let hiddenClasses = '';
            // Adjust visibility based on Tailwind breakpoints used for the grid
            if (i >= 2 && i < 3) hiddenClasses = 'hidden sm:block'; // Show from sm (col 3)
            if (i >= 3 && i < 4) hiddenClasses = 'hidden md:block'; // Show from md (col 4)
            if (i >= 4 && i < 5) hiddenClasses = 'hidden lg:block'; // Show from lg (col 5)
            if (i >= 5) hiddenClasses = 'hidden xl:block'; // Show from xl (col 6)
            // If grid is grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6
            // Skeleton visibility should match these breakpoints
            skeletonHTML += `
                <div class="movie-card-skeleton ${hiddenClasses}">
                    <div class="skeleton skeleton-image"></div>
                    <div class="p-3">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-text"></div>
                    </div>
                </div>`;
        }
        movieGrid.innerHTML = skeletonHTML;
    }

    /**
     * Updates the Hero section with a featured movie.
     */
    const updateHeroSection = () => {
        if (!heroSection) return; // Exit if hero section doesn't exist

        const heroMovie = window.allMovies.find(m => m.heroImage)
                        || window.allMovies.find(m => m.isTrending)
                        || window.allMovies[0];

        if (!heroMovie) {
            heroSection.style.backgroundImage = `url('https://placehold.co/1920x1080/000000/333333?text=No+Hero+Image')`;
            if (heroTitle) heroTitle.textContent = "Không có phim nổi bật";
            if (heroDescription) heroDescription.textContent = "";
            if (heroPlayButton) heroPlayButton.disabled = true;
            if (heroDetailButton) heroDetailButton.disabled = true;
            console.warn("Hero section could not be updated.");
            return;
        }

        const backgroundImageUrl = heroMovie.heroImage || heroMovie.posterUrl || 'https://placehold.co/1920x1080/000000/333333?text=Image+Error';
        heroSection.style.backgroundImage = `url('${backgroundImageUrl}')`;
        heroSection.setAttribute('aria-label', `Phim nổi bật: ${heroMovie.title || 'Đang tải'}`);

        if (heroTitle) heroTitle.textContent = heroMovie.title || 'Đang tải...';
        if (heroDescription) heroDescription.textContent = heroMovie.description || 'Đang tải mô tả...';

        const detailPageUrl = `pages/filmDetail.html?id=${heroMovie.id}&type=movies`;
        if (heroPlayButton) {
            heroPlayButton.disabled = false;
            heroPlayButton.onclick = () => { window.location.href = detailPageUrl + '#player-section'; };
            heroPlayButton.setAttribute('aria-label', `Xem ngay phim ${heroMovie.title || ''}`);
        }
        if (heroDetailButton) {
            heroDetailButton.disabled = false;
            heroDetailButton.onclick = () => { window.location.href = detailPageUrl; };
            heroDetailButton.setAttribute('aria-label', `Xem chi tiết phim ${heroMovie.title || ''}`);
        }
    };

    /**
     * Updates the browser URL's query parameters based on the current filter state.
     */
    const updateUrlParams = () => {
        const params = new URLSearchParams();

        if (currentFilters.genres.length > 0) {
            params.set('genres', currentFilters.genres.join(','));
        }

        const [currentMinYear, currentMaxYear] = currentFilters.yearRange;
        const [defaultMinYear, defaultMaxYear] = minMaxYears[currentContentType] || [null, null];
        if (currentMinYear !== null && currentMinYear !== defaultMinYear) {
             params.set('minYear', String(currentMinYear));
        }
        if (currentMaxYear !== null && currentMaxYear !== defaultMaxYear) {
             params.set('maxYear', String(currentMaxYear));
        }

        const [currentMinRating, currentMaxRating] = currentFilters.ratingRange;
        if (currentMinRating !== null && currentMinRating !== 0) {
             params.set('minRating', currentMinRating.toFixed(1));
        }
        if (currentMaxRating !== null && currentMaxRating !== 10) {
             params.set('maxRating', currentMaxRating.toFixed(1));
        }

        if (currentFilters.sort !== 'default') {
            params.set('sort', currentFilters.sort);
        }
        if (currentFilters.search) {
            params.set('search', currentFilters.search);
        }

        const newUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);

        updateClearButtonVisibility();
    };

    /**
     * Updates the display of filter tags (pills) based on the current filter state.
     */
    const updateFilterTags = () => {
        if (!filterTagsContainer) return;
        filterTagsContainer.innerHTML = ''; // Clear existing tags

        // Genre tags
        currentFilters.genres.forEach(genre => {
            const tag = document.createElement('button');
            tag.className = 'filter-tag';
            tag.dataset.filterType = 'genre';
            tag.dataset.filterValue = genre;
            tag.innerHTML = `
                <span class="tag-label">${genre}</span>
                <span class="material-icons-outlined remove-tag text-sm">close</span>
            `;
            tag.setAttribute('aria-label', `Xóa bộ lọc thể loại: ${genre}`);
            filterTagsContainer.appendChild(tag);
        });

        // Year range tag
        const [minYear, maxYear] = currentFilters.yearRange;
        const [defaultMinYear, defaultMaxYear] = minMaxYears[currentContentType] || [null, null];
        if (minYear !== null && maxYear !== null && (minYear !== defaultMinYear || maxYear !== defaultMaxYear)) {
            const tag = document.createElement('button');
            tag.className = 'filter-tag';
            tag.dataset.filterType = 'year';
            tag.innerHTML = `
                <span class="tag-label">Năm: ${minYear} - ${maxYear}</span>
                <span class="material-icons-outlined remove-tag text-sm">close</span>
            `;
             tag.setAttribute('aria-label', `Xóa bộ lọc năm: ${minYear} - ${maxYear}`);
            filterTagsContainer.appendChild(tag);
        }

        // Rating range tag
        const [minRating, maxRating] = currentFilters.ratingRange;
         if (minRating !== null && maxRating !== null && (minRating !== 0 || maxRating !== 10)) {
            const tag = document.createElement('button');
            tag.className = 'filter-tag';
            tag.dataset.filterType = 'rating';
            tag.innerHTML = `
                <span class="tag-label">Điểm: ${minRating.toFixed(1)} - ${maxRating.toFixed(1)}</span>
                <span class="material-icons-outlined remove-tag text-sm">close</span>
            `;
            tag.setAttribute('aria-label', `Xóa bộ lọc điểm: ${minRating.toFixed(1)} - ${maxRating.toFixed(1)}`);
            filterTagsContainer.appendChild(tag);
        }

        updateClearButtonVisibility();
    };


    /**
     * Sets up the multi-select genre filter dropdown.
     */
    const setupGenreFilter = () => {
        const genres = uniqueGenres[currentContentType] || [];
        if (!genreDropdown || !genreFilterButton) return;

        genreDropdown.innerHTML = ''; // Clear previous options
        genres.sort().forEach(genre => {
            const label = document.createElement('label');
            label.className = 'block px-3 py-1.5 hover:bg-gray-600 rounded cursor-pointer flex items-center';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = genre;
            checkbox.className = 'mr-2 accent-primary';
            checkbox.checked = currentFilters.genres.includes(genre);
            checkbox.addEventListener('change', handleGenreChange);
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(genre));
            genreDropdown.appendChild(label);
        });

        // Toggle dropdown visibility
        genreFilterButton.onclick = (e) => {
            e.stopPropagation();
            genreDropdown.classList.toggle('hidden');
             genreFilterButton.setAttribute('aria-expanded', String(!genreDropdown.classList.contains('hidden')));
        };

        updateGenreButtonText();
    };

    /**
     * Handles changes in the genre filter checkboxes.
     * @param {Event} event - The change event from the checkbox.
     */
    const handleGenreChange = (event) => {
        const genre = event.target.value;
        const isChecked = event.target.checked;

        if (isChecked) {
            if (!currentFilters.genres.includes(genre)) {
                currentFilters.genres.push(genre);
            }
        } else {
            currentFilters.genres = currentFilters.genres.filter(g => g !== genre);
        }

        updateGenreButtonText();
        updateFilterTags();
        filterAndSortContent();
        updateUrlParams();
    };

    /**
     * Updates the text displayed on the genre filter button based on selections.
     */
    const updateGenreButtonText = () => {
        if (!genreFilterButton) return;
        const buttonTextSpan = genreFilterButton.querySelector('span');
        if (!buttonTextSpan) return;

        const count = currentFilters.genres.length;
        if (count === 0) {
            buttonTextSpan.textContent = 'Chọn thể loại...';
        } else if (count === 1) {
            buttonTextSpan.textContent = currentFilters.genres[0];
        } else {
            buttonTextSpan.textContent = `${count} thể loại đã chọn`;
        }
    };

    /**
     * Initializes or re-initializes the noUiSlider instances.
     */
    const setupSliders = () => {
         const [minYear, maxYear] = minMaxYears[currentContentType] || [null, null];
         const ratingMin = 0;
         const ratingMax = 10;

         // --- Year Slider ---
         if (yearSliderInstance) {
             yearSliderInstance.destroy();
             yearSliderInstance = null;
         }
         if (yearSliderElement && minYear !== null && maxYear !== null && minYear <= maxYear) { // Check min <= max
             yearSliderElement.innerHTML = '';
             try {
                 yearSliderInstance = noUiSlider.create(yearSliderElement, {
                     range: { 'min': minYear, 'max': maxYear },
                     start: [currentFilters.yearRange[0] ?? minYear, currentFilters.yearRange[1] ?? maxYear],
                     connect: true,
                     step: 1,
                     format: wNumb({ decimals: 0 }),
                     behaviour: 'tap-drag',
                 });
                 yearSliderInstance.on('update', debounceFilter((values) => {
                     const newMinYear = parseInt(values[0]);
                     const newMaxYear = parseInt(values[1]);
                     if (newMinYear !== currentFilters.yearRange[0] || newMaxYear !== currentFilters.yearRange[1]) {
                         currentFilters.yearRange = [newMinYear, newMaxYear];
                         if (yearSliderValues) yearSliderValues.textContent = `${values[0]} - ${values[1]}`;
                         updateFilterTags();
                         filterAndSortContent();
                         updateUrlParams();
                     }
                 }, 300));
                 const initialYearValues = yearSliderInstance.get();
                 if (yearSliderValues) yearSliderValues.textContent = `${initialYearValues[0]} - ${initialYearValues[1]}`;
                 yearSliderElement.removeAttribute('disabled');
             } catch (error) {
                 console.error("Error creating year slider:", error);
                 if (yearSliderValues) yearSliderValues.textContent = 'Lỗi';
                 yearSliderElement.innerHTML = '<p class="text-xs text-red-400 italic">Lỗi slider.</p>';
                 yearSliderElement.setAttribute('disabled', 'true');
             }
         } else if (yearSliderElement) {
             yearSliderElement.innerHTML = '<p class="text-xs text-text-muted italic">Không đủ dữ liệu năm.</p>';
             if (yearSliderValues) yearSliderValues.textContent = 'N/A';
             yearSliderElement.setAttribute('disabled', 'true');
         }

         // --- Rating Slider ---
         if (ratingSliderInstance) {
             ratingSliderInstance.destroy();
             ratingSliderInstance = null;
         }
         if (ratingSliderElement) {
             ratingSliderElement.innerHTML = '';
             try {
                 ratingSliderInstance = noUiSlider.create(ratingSliderElement, {
                     range: { 'min': ratingMin, 'max': ratingMax },
                     start: [currentFilters.ratingRange[0] ?? ratingMin, currentFilters.ratingRange[1] ?? ratingMax],
                     connect: true,
                     step: 0.1,
                     format: wNumb({ decimals: 1 }),
                     behaviour: 'tap-drag',
                 });
                 ratingSliderInstance.on('update', debounceFilter((values) => {
                     const newMinRating = parseFloat(values[0]);
                     const newMaxRating = parseFloat(values[1]);
                     if (newMinRating !== currentFilters.ratingRange[0] || newMaxRating !== currentFilters.ratingRange[1]) {
                         currentFilters.ratingRange = [newMinRating, newMaxRating];
                         if (ratingSliderValues) ratingSliderValues.textContent = `${values[0]} - ${values[1]}`;
                         updateFilterTags();
                         filterAndSortContent();
                         updateUrlParams();
                     }
                 }, 300));
                 const initialRatingValues = ratingSliderInstance.get();
                 if (ratingSliderValues) ratingSliderValues.textContent = `${initialRatingValues[0]} - ${initialRatingValues[1]}`;
                 ratingSliderElement.removeAttribute('disabled');
             } catch (error) {
                 console.error("Error creating rating slider:", error);
                 if (ratingSliderValues) ratingSliderValues.textContent = 'Lỗi';
                 ratingSliderElement.innerHTML = '<p class="text-xs text-red-400 italic">Lỗi slider.</p>';
                 ratingSliderElement.setAttribute('disabled', 'true');
             }
         } else if (ratingSliderElement) {
             if (ratingSliderValues) ratingSliderValues.textContent = 'N/A';
             ratingSliderElement.setAttribute('disabled', 'true');
         }
    };

    /**
     * Handles the click event on a filter tag's remove button.
     * @param {Event} event - The click event.
     */
    const handleRemoveTag = (event) => {
        const tagButton = event.target.closest('.filter-tag');
        if (!tagButton) return;

        const filterType = tagButton.dataset.filterType;
        const filterValue = tagButton.dataset.filterValue;

        console.log("Removing filter:", filterType, filterValue);

        switch (filterType) {
            case 'genre':
                currentFilters.genres = currentFilters.genres.filter(g => g !== filterValue);
                const checkbox = genreDropdown?.querySelector(`input[value="${filterValue}"]`);
                if (checkbox) checkbox.checked = false;
                updateGenreButtonText();
                break;
            case 'year':
                 const [defaultMinYear, defaultMaxYear] = minMaxYears[currentContentType] || [null, null];
                currentFilters.yearRange = [defaultMinYear, defaultMaxYear];
                // Check if slider instance exists before calling set
                if (yearSliderInstance && defaultMinYear !== null && defaultMaxYear !== null) {
                    yearSliderInstance.set([defaultMinYear, defaultMaxYear]);
                } else if (yearSliderValues) {
                    yearSliderValues.textContent = 'Tất cả'; // Reset text if slider doesn't exist
                }
                break;
            case 'rating':
                currentFilters.ratingRange = [0, 10];
                // Check if slider instance exists before calling set
                if (ratingSliderInstance) {
                    ratingSliderInstance.set([0, 10]);
                } else if (ratingSliderValues) {
                    ratingSliderValues.textContent = 'Tất cả'; // Reset text if slider doesn't exist
                }
                break;
        }

        updateFilterTags();
        filterAndSortContent();
        updateUrlParams();
    };

    /**
     * Updates the visibility of the "Clear All Filters" button.
     */
    const updateClearButtonVisibility = () => {
        if (!clearFiltersButton) return;

        const [minYear, maxYear] = currentFilters.yearRange;
        const [defaultMinYear, defaultMaxYear] = minMaxYears[currentContentType] || [null, null];
        const [minRating, maxRating] = currentFilters.ratingRange;

        const isGenreFiltered = currentFilters.genres.length > 0;
        const isYearFiltered = (minYear !== null && minYear !== defaultMinYear) || (maxYear !== null && maxYear !== defaultMaxYear);
        const isRatingFiltered = (minRating !== null && minRating !== 0) || (maxRating !== null && maxRating !== 10);
        const isSortFiltered = currentFilters.sort !== 'default';
        const isSearchFiltered = currentFilters.search !== '';

        const hasActiveFilters = isGenreFiltered || isYearFiltered || isRatingFiltered || isSortFiltered || isSearchFiltered;

        clearFiltersButton.classList.toggle('hidden', !hasActiveFilters);
        clearFiltersButton.setAttribute('aria-hidden', String(!hasActiveFilters));
    };

    /**
     * Handles the click event on the "Clear All Filters" button.
     */
    const handleClearFilters = () => {
        const [defaultMinYear, defaultMaxYear] = minMaxYears[currentContentType] || [null, null];

        // Reset state
        currentFilters = {
            genres: [],
            yearRange: [defaultMinYear, defaultMaxYear],
            ratingRange: [0, 10],
            sort: 'default',
            search: ''
        };

        // Reset UI elements
        const searchInputDesktop = document.getElementById('search-input-desktop');
        const searchInputMobile = document.getElementById('search-input-mobile');
        if (searchInputDesktop) searchInputDesktop.value = '';
        if (searchInputMobile) searchInputMobile.value = '';
        if (sortFilter) sortFilter.value = 'default';

        genreDropdown?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateGenreButtonText();

        // Safely reset sliders only if they exist and defaults are valid
        if (yearSliderInstance && defaultMinYear !== null && defaultMaxYear !== null) {
             yearSliderInstance.set([defaultMinYear, defaultMaxYear]);
             if (yearSliderValues) yearSliderValues.textContent = `${defaultMinYear} - ${defaultMaxYear}`;
        } else if (yearSliderValues) {
             yearSliderValues.textContent = 'Tất cả';
        }
        if (ratingSliderInstance) {
            ratingSliderInstance.set([0, 10]);
             if (ratingSliderValues) ratingSliderValues.textContent = '0.0 - 10.0';
        } else if (ratingSliderValues) {
             ratingSliderValues.textContent = 'Tất cả';
        }

        updateFilterTags(); // Clear tags
        filterAndSortContent(); // Reload default content
        updateUrlParams(); // Clear URL params
        updateClearButtonVisibility(); // Hide the button
        console.log("All filters cleared.");
    };


    /**
     * Filters and sorts the content based on the current state in `currentFilters`.
     */
    const filterAndSortContent = () => {
        showSkeletonCards(); // Show loading state

        const dataToFilter = currentContentType === 'movies' ? [...window.allMovies] : [...window.allSeries];
        const { search, genres: selectedGenres, yearRange, ratingRange, sort: selectedSort } = currentFilters;
        const [minYear, maxYear] = yearRange;
        const [minRating, maxRating] = ratingRange;

        console.log(`Filtering Grid (${currentContentType}): `, JSON.stringify(currentFilters));

        let filtered = dataToFilter;
        let gridTitleText = currentContentType === 'movies' ? "Phim Lẻ" : "Phim Bộ";

        // Apply filters sequentially
        if (search) {
            filtered = filtered.filter(item => item.title && item.title.toLowerCase().includes(search));
            gridTitleText = `Kết quả tìm kiếm cho "${search}" (${currentContentType === 'movies' ? 'Phim Lẻ' : 'Phim Bộ'})`;
        }

        if (selectedGenres.length > 0) {
            filtered = filtered.filter(item => {
                const itemGenres = Array.isArray(item.genre) ? item.genre : (typeof item.genre === 'string' ? [item.genre] : []);
                return selectedGenres.some(g => itemGenres.includes(g));
            });
            if (!search) gridTitleText = `${currentContentType === 'movies' ? 'Phim Lẻ' : 'Phim Bộ'} Thể Loại: ${selectedGenres.join(', ')}`;
            else gridTitleText += ` (Thể loại: ${selectedGenres.join(', ')})`;
        }

        const [defaultMinYear, defaultMaxYear] = minMaxYears[currentContentType] || [null, null];
        if (minYear !== null && maxYear !== null && (minYear !== defaultMinYear || maxYear !== defaultMaxYear)) {
             filtered = filtered.filter(item => item.releaseYear && typeof item.releaseYear === 'number' && item.releaseYear >= minYear && item.releaseYear <= maxYear);
        }

        if (minRating !== null && maxRating !== null && (minRating !== 0 || maxRating !== 10)) {
             filtered = filtered.filter(item => typeof item.rating === 'number' && item.rating >= minRating && item.rating <= maxRating);
        }

        // Update Grid Title
        if (movieGridTitle) movieGridTitle.textContent = gridTitleText;

        // Sort Results
        switch (selectedSort) {
            case 'newest':
                filtered.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
                break;
            case 'rating_desc':
                filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'rating_asc':
                filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
                break;
            case 'title_asc':
                filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'title_desc':
                filtered.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                break;
            // Default: No additional sort needed
        }

        // Render Results after a short delay
        setTimeout(() => {
            renderContentList(filtered, currentContentType);
        }, 150);
    };

    /**
     * Expose filterAndSortContent globally for the inline script.
     * Updates the search term in state before filtering.
     */
    window.filterAndSortContent = () => {
         const searchInputDesktop = document.getElementById('search-input-desktop');
         const searchInputMobile = document.getElementById('search-input-mobile');
         let searchTerm = '';
         // Check which input is likely visible and has value
         if (searchInputMobile && searchInputMobile.offsetParent !== null && searchInputMobile.value) {
              searchTerm = searchInputMobile.value.trim().toLowerCase();
         } else if (searchInputDesktop && searchInputDesktop.value) {
             searchTerm = searchInputDesktop.value.trim().toLowerCase();
         }
         currentFilters.search = searchTerm; // Update state

         filterAndSortContent(); // Filter with the new search term
         updateUrlParams();
         updateFilterTags();
    };

    /**
     * Event handler for the sort dropdown change.
     */
    const handleFilterChange = () => {
        currentFilters.sort = sortFilter?.value || 'default';
        filterAndSortContent();
        updateUrlParams();
        updateFilterTags();
    };

    /**
     * Initializes the Intersection Observer.
     */
    const initObserver = () => {
        const options = { root: null, rootMargin: '0px', threshold: 0.1 };
        observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delayIndex = parseInt(entry.target.dataset.index || '0', 10);
                    const delay = delayIndex * 100; // 100ms delay per item
                    entry.target.style.animationDelay = `${delay}ms`;
                    entry.target.classList.add('is-visible');
                    // observerInstance.unobserve(entry.target); // Optional: unobserve after animation
                }
            });
        }, options);
        observeElements(document.querySelectorAll('.animate-on-scroll'));
    };

    /**
     * Tells the Intersection Observer to start observing elements.
     * @param {NodeListOf<Element>} elements - The elements to observe.
     */
    const observeElements = (elements) => {
        if (!observer) return;
        elements.forEach((el) => { observer.observe(el); });
    };

    /**
     * Handles switching between content tabs (Movies/Series).
     * @param {string} newType - The new content type ('movies' or 'series').
     */
    const switchTab = (newType) => {
        if (newType === currentContentType || !movieGrid || !movieGridSection) return;

        const oldType = currentContentType;
        currentContentType = newType;

        const slideOutClass = oldType === 'movies' ? 'slide-out-left' : 'slide-out-right';
        const slideInClass = newType === 'movies' ? 'slide-in-from-right' : 'slide-in-from-left';

        // 1. Animate out current content
        movieGrid.classList.remove('is-visible');
        movieGrid.classList.add(slideOutClass);

        // 2. After animation, update state, UI, and animate in new content
        setTimeout(() => {
            // Update tab styles
            if (tabMovies) {
                 tabMovies.classList.toggle('active', newType === 'movies');
                 tabMovies.setAttribute('aria-selected', String(newType === 'movies'));
            }
            if (tabSeries) {
                 tabSeries.classList.toggle('active', newType === 'series');
                 tabSeries.setAttribute('aria-selected', String(newType === 'series'));
            }

            // Reset filters for the new type
            const [defaultMinYear, defaultMaxYear] = minMaxYears[currentContentType] || [null, null];
            currentFilters = {
                genres: [],
                yearRange: [defaultMinYear, defaultMaxYear],
                ratingRange: [0, 10],
                sort: 'default',
                search: ''
            };
             // Reset UI
             const searchInputDesktop = document.getElementById('search-input-desktop');
             const searchInputMobile = document.getElementById('search-input-mobile');
             if (searchInputDesktop) searchInputDesktop.value = '';
             if (searchInputMobile) searchInputMobile.value = '';
             if (sortFilter) sortFilter.value = 'default';

            // Setup filters for the new type
            setupGenreFilter();
            setupSliders();
            updateFilterTags();

            // Show skeleton for new content
            showSkeletonCards();

            // Prepare grid for slide-in
            movieGrid.classList.remove(slideOutClass);
            movieGrid.classList.add(slideInClass);

            // Filter and render new content
            filterAndSortContent(); // Will call renderContentList after delay

            // Force reflow for animation
            void movieGrid.offsetWidth;

            // Start slide-in animation
            movieGrid.classList.add('is-visible');

            // Remove slide-in class after animation starts (optional, CSS can handle)
             setTimeout(() => {
                 if (movieGrid) movieGrid.classList.remove(slideInClass);
             }, TAB_TRANSITION_DURATION); // Use constant duration


            // Update URL
            updateUrlParams();

        }, TAB_TRANSITION_DURATION); // Match CSS transition duration

        console.log(`Switching tab to: ${newType}`);
    };

     /**
      * Reads filter parameters from the URL on initial page load.
      */
     const readUrlParamsAndApplyFilters = () => {
         const params = new URLSearchParams(window.location.search);
         const genresParam = params.get('genres');
         const minYearParam = params.get('minYear');
         const maxYearParam = params.get('maxYear');
         const minRatingParam = params.get('minRating');
         const maxRatingParam = params.get('maxRating');
         const sortParam = params.get('sort');
         const searchParam = params.get('search');

         let filtersChanged = false;
         // Start with defaults for the initial content type (movies)
         const initialFilters = {
             genres: [],
             yearRange: [...(minMaxYears['movies'] || [null, null])], // Use spread to copy
             ratingRange: [0, 10],
             sort: 'default',
             search: ''
         };

         // Apply URL params over defaults
         if (genresParam) {
             initialFilters.genres = genresParam.split(',').map(g => g.trim()).filter(Boolean);
             filtersChanged = true;
         }

         const parsedMinYear = minYearParam ? parseInt(minYearParam) : null;
         const parsedMaxYear = maxYearParam ? parseInt(maxYearParam) : null;
         if (parsedMinYear !== null) initialFilters.yearRange[0] = parsedMinYear;
         if (parsedMaxYear !== null) initialFilters.yearRange[1] = parsedMaxYear;
         if (parsedMinYear !== null || parsedMaxYear !== null) filtersChanged = true;

         const parsedMinRating = minRatingParam ? parseFloat(minRatingParam) : null;
         const parsedMaxRating = maxRatingParam ? parseFloat(maxRatingParam) : null;
         if (parsedMinRating !== null) initialFilters.ratingRange[0] = parsedMinRating;
         if (parsedMaxRating !== null) initialFilters.ratingRange[1] = parsedMaxRating;
         if (parsedMinRating !== null || parsedMaxRating !== null) filtersChanged = true;

         if (sortParam) {
             initialFilters.sort = sortParam;
             if (sortFilter) sortFilter.value = sortParam;
             filtersChanged = true;
         }
          if (searchParam) {
             initialFilters.search = searchParam.trim().toLowerCase();
             const searchInputDesktop = document.getElementById('search-input-desktop');
             const searchInputMobile = document.getElementById('search-input-mobile');
             if(searchInputDesktop) searchInputDesktop.value = searchParam;
             if(searchInputMobile) searchInputMobile.value = searchParam;
             filtersChanged = true;
         }

         // Set the global state
         currentFilters = initialFilters;

         console.log("Initial filters loaded:", JSON.stringify(currentFilters));

         // Update UI based on loaded state *before* filtering
         setupGenreFilter();
         setupSliders();
         updateFilterTags();

         // Apply the filters to render content
         filterAndSortContent();

         updateClearButtonVisibility();
     };

    // --- Event Listeners Setup ---
    if (sortFilter) sortFilter.addEventListener('change', handleFilterChange);
    if (tabMovies) tabMovies.addEventListener('click', () => switchTab('movies'));
    if (tabSeries) tabSeries.addEventListener('click', () => switchTab('series'));
    if (filterTagsContainer) filterTagsContainer.addEventListener('click', handleRemoveTag);
    if (clearFiltersButton) clearFiltersButton.addEventListener('click', handleClearFilters);

    // --- Initial Data Load and Application Setup ---
    const initializeApp = async () => {
        showSkeletonCards(); // Show loading state first

        try {
            const [moviesResponse, seriesResponse] = await Promise.all([
                fetch('json/filmData.json'),
                fetch('json/filmData_phimBo.json')
            ]);

            if (!moviesResponse.ok) throw new Error(`HTTP error fetching movies! status: ${moviesResponse.status}`);
            if (!seriesResponse.ok) throw new Error(`HTTP error fetching series! status: ${seriesResponse.status}`);

            window.allMovies = await moviesResponse.json();
            window.allSeries = await seriesResponse.json();

            console.log("Movies data loaded:", window.allMovies.length);
            console.log("Series data loaded:", window.allSeries.length);

            // --- Calculate dynamic values needed for filters ---
             const calculateMinMaxYears = (data) => {
                 let min = Infinity, max = -Infinity;
                 data.forEach(item => {
                     if (item.releaseYear && typeof item.releaseYear === 'number') {
                         min = Math.min(min, item.releaseYear);
                         max = Math.max(max, item.releaseYear);
                     }
                 });
                  const currentYear = new Date().getFullYear();
                  const finalMin = (min === Infinity) ? currentYear - 20 : min;
                  const finalMax = (max === -Infinity) ? currentYear : max;
                  return [Math.min(finalMin, finalMax), finalMax]; // Ensure min <= max
             };
             minMaxYears.movies = calculateMinMaxYears(window.allMovies);
             minMaxYears.series = calculateMinMaxYears(window.allSeries);

            const extractUniqueGenres = (data) => {
                const genres = new Set();
                data.forEach(item => {
                    const itemGenres = Array.isArray(item.genre) ? item.genre : (typeof item.genre === 'string' ? [item.genre] : []);
                    itemGenres.forEach(g => { if(typeof g === 'string' && g.trim()) genres.add(g.trim()); });
                });
                return Array.from(genres);
            };
            uniqueGenres.movies = extractUniqueGenres(window.allMovies);
            uniqueGenres.series = extractUniqueGenres(window.allSeries);

            // --- Initial UI Setup ---
            if (tabMovies) {
                tabMovies.classList.add('active');
                tabMovies.setAttribute('aria-selected', 'true');
            }
             if (tabSeries) {
                 tabSeries.setAttribute('aria-selected', 'false');
             }
            currentContentType = 'movies'; // Set initial state

            updateHeroSection();

            // Read URL params to set initial filter state *before* rendering
            readUrlParamsAndApplyFilters(); // This now handles setup and initial filtering

            initObserver(); // Initialize scroll animations

        } catch (error) {
            console.error("Lỗi khi khởi tạo ứng dụng:", error);
            // Display error state
            const skeletons = movieGrid?.querySelectorAll('.movie-card-skeleton');
            skeletons?.forEach(skeleton => skeleton.remove());
            if (movieGrid) movieGrid.innerHTML = '';
            if(noMoviesFound) {
                noMoviesFound.classList.remove('hidden');
                noMoviesFound.textContent = 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.';
            }
            if (heroTitle) heroTitle.textContent = "Lỗi Tải Dữ Liệu";
            if (heroDescription) heroDescription.textContent = "Không thể kết nối đến máy chủ.";
            // Disable controls
            if(genreFilterContainer) genreFilterContainer.classList.add('hidden');
            if(sortFilter) sortFilter.disabled = true;
            if(tabsContainer) tabsContainer.classList.add('hidden');
            if(yearSliderElement) yearSliderElement.setAttribute('disabled', 'true');
            if(ratingSliderElement) ratingSliderElement.setAttribute('disabled', 'true');
            if(clearFiltersButton) clearFiltersButton.classList.add('hidden');
        }
    };

    // Start the application
    initializeApp();
    console.log("Trang chủ web xem phim đã sẵn sàng!");

}); // End DOMContentLoaded
