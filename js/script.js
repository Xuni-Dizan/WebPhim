// script.js - Updated for Advanced Filters, Tags, URL Params, Sliders, Tab Transitions, Responsiveness, Error Handling, Filter Toggle, and Format Filter
// v1.6: Added more detailed error logging for fetch failures.

// --- Make data arrays globally accessible for inline script (header search) ---
window.allMovies = [];
window.allSeries = [];
// --- Define currentFilters globally for access by inline script handlers ---
window.currentFilters = { // Store current filter state
    genres: [],
    yearRange: [null, null], // [min, max] - Populated after data load
    ratingRange: [0, 10],    // [min, max] - Default rating range
    sort: 'default',
    search: '',
    format: 'all' // NEW: Added format filter state
};
// --- NEW: Flag to track data loading status ---
window.dataLoaded = false; // Set to true after data is fetched successfully

document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const genreFilterContainer = document.getElementById('genre-filter-container');
    const genreFilterButton = document.getElementById('genre-filter-button');
    const genreDropdown = document.getElementById('genre-dropdown');
    const sortFilter = document.getElementById('sort-filter');
    const formatFilter = document.getElementById('format-filter'); // Format filter element
    const movieGrid = document.getElementById('movie-grid');
    const movieGridSection = document.getElementById('movie-grid-section'); // Parent for transition
    const movieGridTitle = document.getElementById('movie-grid-title');
    const noMoviesFound = document.getElementById('no-movies-found');
    const heroSection = document.getElementById('hero-section');
    const heroTitle = document.getElementById('hero-title');
    const heroDescription = document.getElementById('hero-description');
    const heroPlayButton = document.getElementById('hero-play-button');
    const heroDetailButton = document.getElementById('hero-detail-button');
    const filterControlsSection = document.getElementById('filter-controls'); // Renamed for clarity
    const tabsContainer = document.getElementById('content-tabs');
    const tabMovies = document.getElementById('tab-movies');
    const tabSeries = document.getElementById('tab-series');
    const filterTagsContainer = document.getElementById('filter-tags-container');
    const yearSliderElement = document.getElementById('year-slider');
    const ratingSliderElement = document.getElementById('rating-slider');
    const yearSliderValues = document.getElementById('year-slider-values');
    const ratingSliderValues = document.getElementById('rating-slider-values');
    const clearFiltersButton = document.getElementById('clear-filters-button');
    const filterControls = document.getElementById('filter-controls'); // Filter section element (used for checking visibility on load)

    // --- State Variables ---
    let currentContentType = 'movies'; // Default content type
    let uniqueGenres = { movies: [], series: [] }; // Store unique genres for each type
    // currentFilters is now defined globally above
    let yearSliderInstance = null; // noUiSlider instance for year
    let ratingSliderInstance = null; // noUiSlider instance for rating
    let minMaxYears = { movies: [Infinity, -Infinity], series: [Infinity, -Infinity] }; // Store min/max years per type
    let observer; // Intersection Observer for animations
    let filterDebounceTimer; // Timer for debouncing slider updates
    const TAB_TRANSITION_DURATION = 300; // Milliseconds, should match CSS transition

    // --- Helper Functions ---

    /**
     * Debounce function to limit the rate at which a function can fire.
     * Hàm debounce để giới hạn tần suất một hàm có thể được gọi.
     * @param {Function} func - The function to debounce. Hàm cần debounce.
     * @param {number} wait - The debounce delay in milliseconds. Độ trễ debounce tính bằng mili giây.
     * @returns {Function} - The debounced function. Hàm đã được debounce.
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
     * Tạo chuỗi HTML cho thẻ phim lẻ hoặc phim bộ.
     * @param {object} item - Movie or series data object. Đối tượng dữ liệu phim lẻ hoặc phim bộ.
     * @param {string} type - Content type ('movies' or 'series'). Loại nội dung ('movies' hoặc 'series').
     * @returns {string} - HTML string for the card. Chuỗi HTML cho thẻ.
     */
    const createItemCard = (item, type) => {
        const detailPageUrl = type === 'series'
            ? `pages/filmDetails_phimBo.html?id=${item.id}&type=series`
            : `pages/filmDetail.html?id=${item.id}&type=movies`;
        const altText = `Poster ${type === 'movies' ? 'phim' : 'phim bộ'} ${item.title || 'không có tiêu đề'}, năm ${item.releaseYear || 'không rõ'}`;

        // Determine badges based on type and format
        // Xác định huy hiệu dựa trên loại và định dạng
        let badgesHTML = '';
        const format = item.format || []; // Default to empty array if format is missing

        // Series Badge (Top Right)
        // Huy hiệu Phim Bộ (Trên cùng bên phải)
        if (type === 'series') {
            badgesHTML += `<span class="absolute top-2 right-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded shadow-md z-10">Bộ</span>`;
        }

        // Format Badge (Top Left - Prioritize 3D)
        // Huy hiệu Định dạng (Trên cùng bên trái - Ưu tiên 3D)
        let formatBadgeText = '';
        let formatBadgeClass = '';
        if (format.includes("3D")) {
            formatBadgeText = '3D';
            formatBadgeClass = 'bg-purple-600';
        } else if (format.includes("2D")) {
            formatBadgeText = '2D';
            formatBadgeClass = 'bg-green-600';
        }

        if (formatBadgeText) {
            badgesHTML += `<span class="absolute top-2 left-2 ${formatBadgeClass} text-white text-xs font-semibold px-2 py-1 rounded shadow-md z-10">${formatBadgeText}</span>`;
        }

        const posterUrl = item.posterUrl || 'https://placehold.co/300x450/111111/eeeeee?text=No+Poster';
        const titleText = item.title || 'Không có tiêu đề';
        const yearText = item.releaseYear || 'N/A';

        return `
            <a href="${detailPageUrl}" class="bg-light-gray rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition duration-300 cursor-pointer group relative block movie-card animate-on-scroll" data-item-id="${item.id}" data-item-type="${type}" aria-label="Xem chi tiết ${type === 'movies' ? 'phim' : 'phim bộ'} ${titleText}">
                <div class="relative">
                    <img src="${posterUrl}" alt="${altText}" class="w-full h-auto object-cover aspect-[2/3]" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/300x450/111111/eeeeee?text=Error'; this.alt='Lỗi tải ảnh poster ${titleText}';">
                    ${badgesHTML}
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100" aria-hidden="true">
                        <i class="fas fa-play text-white text-4xl"></i>
                    </div>
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
     * Hiển thị danh sách phim lẻ hoặc phim bộ lên lưới chính.
     * @param {Array<object>} items - Array of movie or series data. Mảng dữ liệu phim lẻ hoặc phim bộ.
     * @param {string} type - Content type ('movies' or 'series'). Loại nội dung ('movies' hoặc 'series').
     */
    const renderContentList = (items, type) => {
        if (!movieGrid) {
            console.error("Movie grid element not found.");
            return;
        }
        if (observer) observer.disconnect(); // Disconnect previous observer

        // Remove any existing skeleton cards
        // Xóa các thẻ skeleton hiện có
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
            // Tạo HTML và thêm data-index cho animation
            movieGrid.innerHTML = items.map((item, index) => {
                const cardHTML = createItemCard(item, type);
                 const cardWithIndex = cardHTML.replace('<a ', `<a data-index="${index}" `);
                 return cardWithIndex;
            }).join('');
            // Observe new cards
            // Quan sát các thẻ mới
            observeElements(movieGrid.querySelectorAll('.animate-on-scroll'));
        }
    };

    /**
     * Displays skeleton loading cards in the grid area.
     * Hiển thị các thẻ skeleton đang tải trong khu vực lưới.
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
            // Điều chỉnh hiển thị dựa trên các breakpoint Tailwind được sử dụng cho lưới
            if (i >= 2 && i < 3) hiddenClasses = 'hidden sm:block'; // Show from sm (col 3)
            if (i >= 3 && i < 4) hiddenClasses = 'hidden md:block'; // Show from md (col 4)
            if (i >= 4 && i < 5) hiddenClasses = 'hidden lg:block'; // Show from lg (col 5)
            if (i >= 5) hiddenClasses = 'hidden xl:block'; // Show from xl (col 6)

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
     * Cập nhật phần Hero với một phim nổi bật.
     */
    const updateHeroSection = () => {
        if (!heroSection) return; // Exit if hero section doesn't exist
        // --- NEW: Check if data is loaded ---
        if (!window.dataLoaded || !window.allMovies || window.allMovies.length === 0) {
            console.warn("Cannot update hero section: Movie data not loaded or empty.");
            // Optionally show a loading state or default placeholder
            heroSection.style.backgroundImage = `url('https://placehold.co/1920x1080/000000/333333?text=Loading...')`;
            if (heroTitle) heroTitle.textContent = "Đang tải...";
            if (heroDescription) heroDescription.textContent = "";
            if (heroPlayButton) heroPlayButton.disabled = true;
            if (heroDetailButton) heroDetailButton.disabled = true;
            return;
        }

        // Prioritize movies with heroImage, then trending, then first movie
        // Ưu tiên phim có heroImage, sau đó là phim trending, cuối cùng là phim đầu tiên
        const heroMovie = window.allMovies.find(m => m.heroImage)
                        || window.allMovies.find(m => m.isTrending)
                        || window.allMovies[0];

        if (!heroMovie) {
            heroSection.style.backgroundImage = `url('https://placehold.co/1920x1080/000000/333333?text=No+Hero+Image')`;
            if (heroTitle) heroTitle.textContent = "Không có phim nổi bật";
            if (heroDescription) heroDescription.textContent = "";
            if (heroPlayButton) heroPlayButton.disabled = true;
            if (heroDetailButton) heroDetailButton.disabled = true;
            console.warn("Hero section could not be updated (no suitable movie found).");
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
     * Cập nhật tham số truy vấn của URL trình duyệt dựa trên trạng thái bộ lọc hiện tại.
     */
    const updateUrlParams = () => {
        const params = new URLSearchParams();

        // --- NEW: Check if data is loaded before accessing minMaxYears ---
        const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
        const [defaultMinYear, defaultMaxYear] = defaultYears;

        if (window.currentFilters.genres.length > 0) {
            params.set('genres', window.currentFilters.genres.join(','));
        }

        const [currentMinYear, currentMaxYear] = window.currentFilters.yearRange;
        // Only add year params if they differ from the default *and* defaults are known
        if (defaultMinYear !== null && currentMinYear !== null && currentMinYear !== defaultMinYear) {
             params.set('minYear', String(currentMinYear));
        }
        if (defaultMaxYear !== null && currentMaxYear !== null && currentMaxYear !== defaultMaxYear) {
             params.set('maxYear', String(currentMaxYear));
        }

        const [currentMinRating, currentMaxRating] = window.currentFilters.ratingRange;
        if (currentMinRating !== null && currentMinRating !== 0) {
             params.set('minRating', currentMinRating.toFixed(1));
        }
        if (currentMaxRating !== null && currentMaxRating !== 10) {
             params.set('maxRating', currentMaxRating.toFixed(1));
        }

        if (window.currentFilters.sort !== 'default') {
            params.set('sort', window.currentFilters.sort);
        }
        if (window.currentFilters.search) {
            params.set('search', window.currentFilters.search);
        }

        // NEW: Add format filter to URL
        // MỚI: Thêm bộ lọc định dạng vào URL
        if (window.currentFilters.format !== 'all') {
            params.set('format', window.currentFilters.format);
        }

        const newUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
        // Use try-catch for replaceState as it can fail in some environments (e.g., sandboxed iframes)
        try {
            window.history.replaceState({ path: newUrl }, '', newUrl);
        } catch (e) {
            console.warn("Could not update URL history:", e);
        }


        updateClearButtonVisibility();
    };
    // Expose globally for inline script
    // Expose toàn cục cho script inline
    window.updateUrlParams = updateUrlParams;


    /**
     * Updates the display of filter tags (pills) based on the current filter state.
     * Cập nhật hiển thị các thẻ bộ lọc (pills) dựa trên trạng thái bộ lọc hiện tại.
     */
    const updateFilterTags = () => {
        if (!filterTagsContainer) return;
        filterTagsContainer.innerHTML = ''; // Clear existing tags

        // --- NEW: Check if data is loaded before accessing minMaxYears ---
        const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
        const [defaultMinYear, defaultMaxYear] = defaultYears;

        // Genre tags
        // Thẻ thể loại
        window.currentFilters.genres.forEach(genre => {
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
        // Thẻ khoảng năm
        const [minYear, maxYear] = window.currentFilters.yearRange;
        // Only show year tag if range differs from default *and* defaults are known
        if (defaultMinYear !== null && defaultMaxYear !== null && minYear !== null && maxYear !== null && (minYear !== defaultMinYear || maxYear !== defaultMaxYear)) {
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
        // Thẻ khoảng điểm đánh giá
        const [minRating, maxRating] = window.currentFilters.ratingRange;
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

        // NEW: Format tag
        // MỚI: Thẻ định dạng
        if (window.currentFilters.format !== 'all') {
            const tag = document.createElement('button');
            tag.className = 'filter-tag';
            tag.dataset.filterType = 'format';
            // Find the display text from the select options for better readability
            // Tìm văn bản hiển thị từ các tùy chọn select để dễ đọc hơn
            const formatOption = formatFilter?.querySelector(`option[value="${window.currentFilters.format}"]`);
            const formatText = formatOption ? formatOption.textContent : window.currentFilters.format;
            tag.innerHTML = `
                <span class="tag-label">Định dạng: ${formatText}</span>
                <span class="material-icons-outlined remove-tag text-sm">close</span>
            `;
            tag.setAttribute('aria-label', `Xóa bộ lọc định dạng: ${formatText}`);
            filterTagsContainer.appendChild(tag);
        }

        updateClearButtonVisibility();
    };
    // Expose globally for inline script
    // Expose toàn cục cho script inline
    window.updateFilterTags = updateFilterTags;


    /**
     * Sets up the multi-select genre filter dropdown.
     * Thiết lập dropdown bộ lọc thể loại đa lựa chọn.
     */
    const setupGenreFilter = () => {
        // --- NEW: Check if data is loaded ---
        if (!window.dataLoaded) {
            console.warn("Cannot setup genre filter: Data not loaded yet.");
            if (genreDropdown) genreDropdown.innerHTML = '<div class="p-3 text-sm text-text-muted italic">Đang tải thể loại...</div>';
            return;
        }

        const genres = uniqueGenres[currentContentType] || [];
        if (!genreDropdown || !genreFilterButton) return;

        genreDropdown.innerHTML = ''; // Clear previous options

        if (genres.length === 0) {
            genreDropdown.innerHTML = '<div class="p-3 text-sm text-text-muted italic">Không có thể loại nào.</div>';
            updateGenreButtonText(); // Update button text to default
            return;
        }

        genres.sort().forEach(genre => {
            const label = document.createElement('label');
            label.className = 'block px-3 py-1.5 hover:bg-gray-600 rounded cursor-pointer flex items-center';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = genre;
            checkbox.className = 'mr-2 accent-primary';
            checkbox.checked = window.currentFilters.genres.includes(genre);
            checkbox.addEventListener('change', handleGenreChange);
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(genre));
            genreDropdown.appendChild(label);
        });

        updateGenreButtonText();
    };

    /**
     * Handles changes in the genre filter checkboxes.
     * Xử lý thay đổi trong các checkbox bộ lọc thể loại.
     * @param {Event} event - The change event from the checkbox. Sự kiện thay đổi từ checkbox.
     */
    const handleGenreChange = (event) => {
        const genre = event.target.value;
        const isChecked = event.target.checked;

        if (isChecked) {
            if (!window.currentFilters.genres.includes(genre)) {
                window.currentFilters.genres.push(genre);
            }
        } else {
            window.currentFilters.genres = window.currentFilters.genres.filter(g => g !== genre);
        }

        updateGenreButtonText();
        updateFilterTags();
        filterAndSortContent();
        updateUrlParams();
    };

    /**
     * Updates the text displayed on the genre filter button based on selections.
     * Cập nhật văn bản hiển thị trên nút bộ lọc thể loại dựa trên các lựa chọn.
     */
    const updateGenreButtonText = () => {
        if (!genreFilterButton) return;
        const buttonTextSpan = genreFilterButton.querySelector('span');
        if (!buttonTextSpan) return;

        const count = window.currentFilters.genres.length;
        if (count === 0) {
            buttonTextSpan.textContent = 'Chọn thể loại...';
        } else if (count === 1) {
            buttonTextSpan.textContent = window.currentFilters.genres[0];
        } else {
            buttonTextSpan.textContent = `${count} thể loại đã chọn`;
        }
    };

    /**
     * Initializes or re-initializes the noUiSlider instances.
     * Khởi tạo hoặc khởi tạo lại các instance noUiSlider.
     */
    const setupSliders = () => {
         // --- NEW: Check if data is loaded ---
         if (!window.dataLoaded) {
            console.warn("Cannot setup sliders: Data not loaded yet.");
             if (yearSliderElement) {
                 yearSliderElement.innerHTML = '<p class="text-xs text-text-muted italic">Đang tải...</p>';
                 yearSliderElement.setAttribute('disabled', 'true');
                 if(yearSliderValues) yearSliderValues.textContent = 'N/A';
             }
             if (ratingSliderElement) {
                 ratingSliderElement.innerHTML = '<p class="text-xs text-text-muted italic">Đang tải...</p>';
                 ratingSliderElement.setAttribute('disabled', 'true');
                 if(ratingSliderValues) ratingSliderValues.textContent = 'N/A';
             }
            return;
         }

         const [minYear, maxYear] = minMaxYears[currentContentType] || [null, null];
         const ratingMin = 0;
         const ratingMax = 10;

         // --- Year Slider ---
         // --- Slider Năm ---
         if (yearSliderInstance) {
             yearSliderInstance.destroy();
             yearSliderInstance = null;
         }
         if (yearSliderElement && minYear !== null && maxYear !== null && minYear <= maxYear) { // Check min <= max
             yearSliderElement.innerHTML = '';
             try {
                 yearSliderInstance = noUiSlider.create(yearSliderElement, {
                     range: { 'min': minYear, 'max': maxYear },
                     start: [window.currentFilters.yearRange[0] ?? minYear, window.currentFilters.yearRange[1] ?? maxYear],
                     connect: true,
                     step: 1,
                     format: wNumb({ decimals: 0 }),
                     behaviour: 'tap-drag',
                 });
                 yearSliderInstance.on('update', debounceFilter((values) => {
                     const newMinYear = parseInt(values[0]);
                     const newMaxYear = parseInt(values[1]);
                     if (newMinYear !== window.currentFilters.yearRange[0] || newMaxYear !== window.currentFilters.yearRange[1]) {
                         window.currentFilters.yearRange = [newMinYear, newMaxYear];
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
         // --- Slider Điểm Đánh Giá ---
         if (ratingSliderInstance) {
             ratingSliderInstance.destroy();
             ratingSliderInstance = null;
         }
         if (ratingSliderElement) {
             ratingSliderElement.innerHTML = '';
             try {
                 ratingSliderInstance = noUiSlider.create(ratingSliderElement, {
                     range: { 'min': ratingMin, 'max': ratingMax },
                     start: [window.currentFilters.ratingRange[0] ?? ratingMin, window.currentFilters.ratingRange[1] ?? ratingMax],
                     connect: true,
                     step: 0.1,
                     format: wNumb({ decimals: 1 }),
                     behaviour: 'tap-drag',
                 });
                 ratingSliderInstance.on('update', debounceFilter((values) => {
                     const newMinRating = parseFloat(values[0]);
                     const newMaxRating = parseFloat(values[1]);
                     if (newMinRating !== window.currentFilters.ratingRange[0] || newMaxRating !== window.currentFilters.ratingRange[1]) {
                         window.currentFilters.ratingRange = [newMinRating, newMaxRating];
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
     * Xử lý sự kiện nhấp vào nút xóa của thẻ bộ lọc.
     * @param {Event} event - The click event. Sự kiện nhấp chuột.
     */
    const handleRemoveTag = (event) => {
        const tagButton = event.target.closest('.filter-tag');
        if (!tagButton) return;

        const filterType = tagButton.dataset.filterType;
        const filterValue = tagButton.dataset.filterValue; // Value for genre/format

        console.log("Removing filter:", filterType, filterValue);

        // --- NEW: Check if data is loaded before accessing minMaxYears ---
        const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
        const [defaultMinYear, defaultMaxYear] = defaultYears;

        switch (filterType) {
            case 'genre':
                window.currentFilters.genres = window.currentFilters.genres.filter(g => g !== filterValue);
                const checkbox = genreDropdown?.querySelector(`input[value="${filterValue}"]`);
                if (checkbox) checkbox.checked = false;
                updateGenreButtonText();
                break;
            case 'year':
                // Only reset if default years are known
                if (defaultMinYear !== null && defaultMaxYear !== null) {
                    window.currentFilters.yearRange = [defaultMinYear, defaultMaxYear];
                    if (yearSliderInstance) {
                        yearSliderInstance.set([defaultMinYear, defaultMaxYear]);
                    }
                } else {
                    // If defaults aren't known, just clear the range visually
                    window.currentFilters.yearRange = [null, null];
                    if (yearSliderValues) yearSliderValues.textContent = 'Tất cả';
                }
                break;
            case 'rating':
                window.currentFilters.ratingRange = [0, 10];
                if (ratingSliderInstance) {
                    ratingSliderInstance.set([0, 10]);
                } else if (ratingSliderValues) {
                    ratingSliderValues.textContent = 'Tất cả';
                }
                break;
            // NEW: Handle format filter removal
            // MỚI: Xử lý xóa bộ lọc định dạng
            case 'format':
                window.currentFilters.format = 'all';
                if (formatFilter) formatFilter.value = 'all'; // Reset dropdown
                break;
        }

        updateFilterTags();
        filterAndSortContent();
        updateUrlParams();
    };

    /**
     * Updates the visibility of the "Clear All Filters" button.
     * Cập nhật khả năng hiển thị của nút "Xóa tất cả bộ lọc".
     */
    const updateClearButtonVisibility = () => {
        if (!clearFiltersButton) return;

        // --- NEW: Check if data is loaded before accessing minMaxYears ---
        const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
        const [defaultMinYear, defaultMaxYear] = defaultYears;

        const [minYear, maxYear] = window.currentFilters.yearRange;
        const [minRating, maxRating] = window.currentFilters.ratingRange;

        const isGenreFiltered = window.currentFilters.genres.length > 0;
        // Compare with known defaults if available
        const isYearFiltered = defaultMinYear !== null && defaultMaxYear !== null
                                ? (minYear !== defaultMinYear || maxYear !== defaultMaxYear)
                                : (minYear !== null || maxYear !== null); // Check if not null if defaults unknown
        const isRatingFiltered = (minRating !== 0 || maxRating !== 10);
        const isSortFiltered = window.currentFilters.sort !== 'default';
        const isSearchFiltered = window.currentFilters.search !== '';
        const isFormatFiltered = window.currentFilters.format !== 'all'; // NEW: Check format filter

        const hasActiveFilters = isGenreFiltered || isYearFiltered || isRatingFiltered || isSortFiltered || isSearchFiltered || isFormatFiltered; // NEW: Added format

        clearFiltersButton.classList.toggle('hidden', !hasActiveFilters);
        clearFiltersButton.setAttribute('aria-hidden', String(!hasActiveFilters));
    };

    /**
     * Handles the click event on the "Clear All Filters" button.
     * Xử lý sự kiện nhấp vào nút "Xóa tất cả bộ lọc".
     */
    const handleClearFilters = () => {
        // --- NEW: Check if data is loaded before accessing minMaxYears ---
        const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
        const [defaultMinYear, defaultMaxYear] = defaultYears;

        // Reset state
        // Đặt lại trạng thái
        window.currentFilters = {
            genres: [],
            yearRange: [defaultMinYear, defaultMaxYear], // Use known defaults if available
            ratingRange: [0, 10],
            sort: 'default',
            search: '',
            format: 'all' // NEW: Reset format filter
        };

        // Reset UI elements
        // Đặt lại các phần tử UI
        const searchInputDesktop = document.getElementById('search-input-desktop');
        const searchInputMobile = document.getElementById('search-input-mobile');
        if (searchInputDesktop) searchInputDesktop.value = '';
        if (searchInputMobile) searchInputMobile.value = '';
        if (sortFilter) sortFilter.value = 'default';
        if (formatFilter) formatFilter.value = 'all'; // NEW: Reset format dropdown

        genreDropdown?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateGenreButtonText();

        // Safely reset sliders only if they exist and defaults are valid
        // Đặt lại slider một cách an toàn chỉ khi chúng tồn tại và giá trị mặc định hợp lệ
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
     * Filters and sorts the content based on the current state in `window.currentFilters`.
     * Lọc và sắp xếp nội dung dựa trên trạng thái hiện tại trong `window.currentFilters`.
     */
    const filterAndSortContent = () => {
        // --- NEW: Check if data is loaded ---
        if (!window.dataLoaded) {
            console.warn("Cannot filter/sort: Data not loaded yet.");
            showSkeletonCards(); // Ensure skeleton is shown if data isn't ready
            return;
        }

        showSkeletonCards(); // Show loading state while filtering

        const dataToFilter = currentContentType === 'movies' ? [...window.allMovies] : [...window.allSeries];
        const { search, genres: selectedGenres, yearRange, ratingRange, sort: selectedSort, format: selectedFormat } = window.currentFilters; // Use global state
        const [minYear, maxYear] = yearRange;
        const [minRating, maxRating] = ratingRange;

        console.log(`Filtering Grid (${currentContentType}): `, JSON.stringify(window.currentFilters));

        let filtered = dataToFilter;
        let gridTitleText = currentContentType === 'movies' ? "Phim Lẻ" : "Phim Bộ";

        // Apply filters sequentially
        // Áp dụng bộ lọc tuần tự
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

        // NEW: Apply format filter
        // MỚI: Áp dụng bộ lọc định dạng
        if (selectedFormat !== 'all') {
            filtered = filtered.filter(item => Array.isArray(item.format) && item.format.includes(selectedFormat));
            const formatOption = formatFilter?.querySelector(`option[value="${selectedFormat}"]`);
            const formatText = formatOption ? formatOption.textContent : selectedFormat;
            if (!search && selectedGenres.length === 0) gridTitleText = `${currentContentType === 'movies' ? 'Phim Lẻ' : 'Phim Bộ'} Định dạng: ${formatText}`;
            else gridTitleText += ` (Định dạng: ${formatText})`;
        }

        // --- NEW: Check if data is loaded before accessing minMaxYears ---
        const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
        const [defaultMinYear, defaultMaxYear] = defaultYears;
        // Only filter by year if range differs from default *and* defaults are known
        if (defaultMinYear !== null && defaultMaxYear !== null && minYear !== null && maxYear !== null && (minYear !== defaultMinYear || maxYear !== defaultMaxYear)) {
             filtered = filtered.filter(item => item.releaseYear && typeof item.releaseYear === 'number' && item.releaseYear >= minYear && item.releaseYear <= maxYear);
        }

        if (minRating !== null && maxRating !== null && (minRating !== 0 || maxRating !== 10)) {
             filtered = filtered.filter(item => typeof item.rating === 'number' && item.rating >= minRating && item.rating <= maxRating);
        }

        // Update Grid Title
        // Cập nhật Tiêu đề Lưới
        if (movieGridTitle) movieGridTitle.textContent = gridTitleText;

        // Sort Results
        // Sắp xếp Kết quả
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
            // Mặc định: Không cần sắp xếp thêm
        }

        // Render Results after a short delay
        // Hiển thị Kết quả sau một khoảng trễ ngắn
        setTimeout(() => {
            renderContentList(filtered, currentContentType);
        }, 150);
    };

    /**
     * Expose filterAndSortContent globally for the inline script.
     * Updates the search term in state before filtering.
     * Expose filterAndSortContent toàn cục cho script inline.
     * Cập nhật thuật ngữ tìm kiếm trong state trước khi lọc.
     */
    window.filterAndSortContent = () => {
         const searchInputDesktop = document.getElementById('search-input-desktop');
         const searchInputMobile = document.getElementById('search-input-mobile');
         let searchTerm = '';
         // Check which input is likely visible and has value
         // Kiểm tra input nào có khả năng hiển thị và có giá trị
         if (searchInputMobile && searchInputMobile.offsetParent !== null && searchInputMobile.value) {
              searchTerm = searchInputMobile.value.trim().toLowerCase();
         } else if (searchInputDesktop && searchInputDesktop.value) {
             searchTerm = searchInputDesktop.value.trim().toLowerCase();
         }
         window.currentFilters.search = searchTerm; // Update state

         filterAndSortContent(); // Filter with the new search term
         updateUrlParams();
         updateFilterTags();
    };

    /**
     * Event handler for the sort dropdown change.
     * Trình xử lý sự kiện cho thay đổi dropdown sắp xếp.
     */
    const handleFilterChange = () => {
        window.currentFilters.sort = sortFilter?.value || 'default';
        filterAndSortContent();
        updateUrlParams();
        updateFilterTags();
    };
    // Expose globally for inline script
    // Expose toàn cục cho script inline
    window.handleFilterChange = handleFilterChange;


    // NEW: Event handler for the format dropdown change
    // MỚI: Trình xử lý sự kiện cho thay đổi dropdown định dạng
    const handleFormatChange = () => {
        window.currentFilters.format = formatFilter?.value || 'all';
        filterAndSortContent();
        updateUrlParams();
        updateFilterTags();
    };


    /**
     * Initializes the Intersection Observer.
     * Khởi tạo Intersection Observer.
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
     * Yêu cầu Intersection Observer bắt đầu quan sát các phần tử.
     * @param {NodeListOf<Element>} elements - The elements to observe. Các phần tử cần quan sát.
     */
    const observeElements = (elements) => {
        if (!observer) return;
        elements.forEach((el) => { observer.observe(el); });
    };

    /**
     * Handles switching between content tabs (Movies/Series).
     * Xử lý chuyển đổi giữa các tab nội dung (Phim Lẻ/Phim Bộ).
     * @param {string} newType - The new content type ('movies' or 'series'). Loại nội dung mới ('movies' hoặc 'series').
     */
    const switchTab = (newType) => {
        if (newType === currentContentType || !movieGrid || !movieGridSection) return;

        const oldType = currentContentType;
        currentContentType = newType;

        const slideOutClass = oldType === 'movies' ? 'slide-out-left' : 'slide-out-right';
        const slideInClass = newType === 'movies' ? 'slide-in-from-right' : 'slide-in-from-left';

        // 1. Animate out current content
        // 1. Tạo hiệu ứng trượt ra cho nội dung hiện tại
        movieGrid.classList.remove('is-visible');
        movieGrid.classList.add(slideOutClass);

        // 2. After animation, update state, UI, and animate in new content
        // 2. Sau hiệu ứng, cập nhật state, UI và tạo hiệu ứng trượt vào cho nội dung mới
        setTimeout(() => {
            // Update tab styles
            // Cập nhật kiểu tab
            if (tabMovies) {
                 tabMovies.classList.toggle('active', newType === 'movies');
                 tabMovies.setAttribute('aria-selected', String(newType === 'movies'));
            }
            if (tabSeries) {
                 tabSeries.classList.toggle('active', newType === 'series');
                 tabSeries.setAttribute('aria-selected', String(newType === 'series'));
            }

            // Reset filters for the new type
            // Đặt lại bộ lọc cho loại mới
            // --- NEW: Check if data is loaded before accessing minMaxYears ---
            const defaultYears = window.dataLoaded ? minMaxYears[currentContentType] : [null, null];
            const [defaultMinYear, defaultMaxYear] = defaultYears;

            window.currentFilters = { // Use global state
                genres: [],
                yearRange: [defaultMinYear, defaultMaxYear], // Use potentially loaded defaults
                ratingRange: [0, 10],
                sort: 'default',
                search: '',
                format: 'all' // Reset format filter on tab switch
            };
             // Reset UI
             // Đặt lại UI
             const searchInputDesktop = document.getElementById('search-input-desktop');
             const searchInputMobile = document.getElementById('search-input-mobile');
             if (searchInputDesktop) searchInputDesktop.value = '';
             if (searchInputMobile) searchInputMobile.value = '';
             if (sortFilter) sortFilter.value = 'default';
             if (formatFilter) formatFilter.value = 'all'; // Reset format dropdown

            // Setup filters for the new type
            // Thiết lập bộ lọc cho loại mới
            setupGenreFilter();
            setupSliders();
            updateFilterTags();

            // Show skeleton for new content
            // Hiển thị skeleton cho nội dung mới
            showSkeletonCards();

            // Prepare grid for slide-in
            // Chuẩn bị lưới cho hiệu ứng trượt vào
            movieGrid.classList.remove(slideOutClass);
            movieGrid.classList.add(slideInClass);

            // Filter and render new content
            // Lọc và hiển thị nội dung mới
            filterAndSortContent(); // Will call renderContentList after delay

            // Force reflow for animation
            // Buộc reflow cho animation
            void movieGrid.offsetWidth;

            // Start slide-in animation
            // Bắt đầu animation trượt vào
            movieGrid.classList.add('is-visible');

            // Remove slide-in class after animation starts (optional, CSS can handle)
            // Xóa lớp slide-in sau khi animation bắt đầu (tùy chọn, CSS có thể xử lý)
             setTimeout(() => {
                 if (movieGrid) movieGrid.classList.remove(slideInClass);
             }, TAB_TRANSITION_DURATION); // Use constant duration


            // Update URL
            // Cập nhật URL
            updateUrlParams();

        }, TAB_TRANSITION_DURATION); // Match CSS transition duration

        console.log(`Switching tab to: ${newType}`);
    };

     /**
      * Reads filter parameters from the URL on initial page load.
      * Đọc các tham số bộ lọc từ URL khi tải trang ban đầu.
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
         const formatParam = params.get('format'); // NEW: Read format

         let filtersChanged = false;
         // Start with defaults for the initial content type (movies)
         // Bắt đầu với giá trị mặc định cho loại nội dung ban đầu (phim lẻ)
         // --- NEW: Use potentially loaded defaults ---
         const defaultYears = window.dataLoaded ? minMaxYears['movies'] : [null, null];
         const [defaultMinYear, defaultMaxYear] = defaultYears;

         const initialFilters = {
             genres: [],
             yearRange: [defaultMinYear, defaultMaxYear],
             ratingRange: [0, 10],
             sort: 'default',
             search: '',
             format: 'all' // NEW: Default format filter
         };

         // Apply URL params over defaults
         // Áp dụng tham số URL lên giá trị mặc định
         if (genresParam) {
             initialFilters.genres = genresParam.split(',').map(g => g.trim()).filter(Boolean);
             filtersChanged = true;
         }

         const parsedMinYear = minYearParam ? parseInt(minYearParam) : null;
         const parsedMaxYear = maxYearParam ? parseInt(maxYearParam) : null;
         if (parsedMinYear !== null) initialFilters.yearRange[0] = parsedMinYear;
         if (parsedMaxYear !== null) initialFilters.yearRange[1] = parsedMaxYear;
         // Only mark changed if the parsed value is different from the default (which might still be null if data not loaded)
         if ((parsedMinYear !== null && parsedMinYear !== defaultMinYear) || (parsedMaxYear !== null && parsedMaxYear !== defaultMaxYear)) filtersChanged = true;


         const parsedMinRating = minRatingParam ? parseFloat(minRatingParam) : null;
         const parsedMaxRating = maxRatingParam ? parseFloat(maxRatingParam) : null;
         if (parsedMinRating !== null) initialFilters.ratingRange[0] = parsedMinRating;
         if (parsedMaxRating !== null) initialFilters.ratingRange[1] = parsedMaxRating;
         if ((parsedMinRating !== null && parsedMinRating !== 0) || (parsedMaxRating !== null && parsedMaxRating !== 10)) filtersChanged = true;


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
         // NEW: Apply format filter from URL
         // MỚI: Áp dụng bộ lọc định dạng từ URL
         if (formatParam) {
             initialFilters.format = formatParam;
             if (formatFilter) formatFilter.value = formatParam; // Update dropdown UI
             filtersChanged = true;
         }

         // Set the global state
         // Đặt trạng thái toàn cục
         window.currentFilters = initialFilters;

         console.log("Initial filters loaded from URL (or defaults):", JSON.stringify(window.currentFilters));

         // Update UI based on loaded state *before* filtering
         // Cập nhật UI dựa trên trạng thái đã tải *trước* khi lọc
         // These functions now check window.dataLoaded internally
         setupGenreFilter();
         setupSliders();
         updateFilterTags();

         // Apply the filters to render content
         // Áp dụng bộ lọc để hiển thị nội dung
         // This function also checks window.dataLoaded
         filterAndSortContent();

         updateClearButtonVisibility();

         return filtersChanged; // Return whether any filters were applied from URL
     };

    // --- Event Listeners Setup ---
    if (sortFilter) sortFilter.addEventListener('change', handleFilterChange);
    if (formatFilter) formatFilter.addEventListener('change', handleFormatChange); // Listener for format filter
    if (tabMovies) tabMovies.addEventListener('click', () => switchTab('movies'));
    if (tabSeries) tabSeries.addEventListener('click', () => switchTab('series'));
    if (filterTagsContainer) filterTagsContainer.addEventListener('click', handleRemoveTag);
    if (clearFiltersButton) clearFiltersButton.addEventListener('click', handleClearFilters);
    // Other listeners (genre button, nav links, mobile menu, click outside) are handled by inline script in index.html


    // --- Initial Data Load and Application Setup ---
    // --- Tải Dữ liệu Ban đầu và Thiết lập Ứng dụng ---
    const initializeApp = async () => {
        showSkeletonCards(); // Show loading state first
        window.dataLoaded = false; // Ensure flag is false initially

        try {
            console.log("Fetching data...");
            // Define URLs clearly
            const moviesUrl = 'json/filmData.json';
            const seriesUrl = 'json/filmData_phimBo.json';

            const [moviesResponse, seriesResponse] = await Promise.all([
                fetch(moviesUrl),
                fetch(seriesUrl)
            ]);

            // Check response status IMMEDIATELY after fetch
            if (!moviesResponse.ok) {
                // --- MORE DETAILED ERROR ---
                throw new Error(`HTTP error fetching movies! Status: ${moviesResponse.status} (${moviesResponse.statusText}) from URL: ${moviesUrl}`);
            }
            if (!seriesResponse.ok) {
                // --- MORE DETAILED ERROR ---
                throw new Error(`HTTP error fetching series! Status: ${seriesResponse.status} (${seriesResponse.statusText}) from URL: ${seriesUrl}`);
            }

            // Parse JSON only if responses are ok
            const moviesData = await moviesResponse.json();
            const seriesData = await seriesResponse.json();

            // Assign to global scope
            window.allMovies = moviesData || [];
            window.allSeries = seriesData || [];
            window.dataLoaded = true; // <<< SET FLAG TO TRUE HERE

            console.log("Movies data loaded:", window.allMovies.length);
            console.log("Series data loaded:", window.allSeries.length);

            // --- Calculate dynamic values needed for filters ---
            // --- Tính toán các giá trị động cần thiết cho bộ lọc ---
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
                  return [Math.min(finalMin, finalMax), finalMax];
             };
             minMaxYears.movies = calculateMinMaxYears(window.allMovies);
             minMaxYears.series = calculateMinMaxYears(window.allSeries);
             console.log("Min/Max Years (Movies):", minMaxYears.movies);
             console.log("Min/Max Years (Series):", minMaxYears.series);


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
            console.log("Unique Genres (Movies):", uniqueGenres.movies);
            console.log("Unique Genres (Series):", uniqueGenres.series);


            // --- Initial UI Setup ---
            // --- Thiết lập UI Ban đầu ---
            if (tabMovies) {
                tabMovies.classList.add('active');
                tabMovies.setAttribute('aria-selected', 'true');
            }
             if (tabSeries) {
                 tabSeries.setAttribute('aria-selected', 'false');
             }
            currentContentType = 'movies'; // Set initial state

            updateHeroSection(); // Now safe to call as data is loaded

            // Read URL params to set initial filter state *after* data is loaded
            // Đọc tham số URL để đặt trạng thái bộ lọc ban đầu *sau* khi dữ liệu được tải
            const filtersAppliedFromUrl = readUrlParamsAndApplyFilters(); // This now handles setup and initial filtering

            // If URL params caused filters to be active, show the filter section initially
            // Nếu tham số URL làm cho bộ lọc hoạt động, hiển thị phần bộ lọc ban đầu
            if (filtersAppliedFromUrl) {
                filterControls?.classList.remove('hidden');
                console.log("Filters section shown initially due to URL parameters.");
            }


            initObserver(); // Initialize scroll animations

        } catch (error) {
            window.dataLoaded = false; // Ensure flag is false on error
            // --- MORE DETAILED LOGGING ---
            console.error("Lỗi khi khởi tạo ứng dụng:", error); // Log the full error object
            // Display error state
            // Hiển thị trạng thái lỗi
            const skeletons = movieGrid?.querySelectorAll('.movie-card-skeleton');
            skeletons?.forEach(skeleton => skeleton.remove());
            if (movieGrid) movieGrid.innerHTML = '';
            if(noMoviesFound) {
                noMoviesFound.classList.remove('hidden');
                // --- MORE USER-FRIENDLY ERROR MESSAGE ---
                let userErrorMessage = 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng kiểm tra đường dẫn tệp JSON và đảm bảo bạn đang chạy trang web qua máy chủ cục bộ (không phải file:///).';
                if (error.message && error.message.includes('HTTP error')) {
                    userErrorMessage = `Lỗi tải dữ liệu: ${error.message}. Hãy kiểm tra xem tệp có tồn tại và đường dẫn đúng không.`;
                } else if (error instanceof SyntaxError) {
                     userErrorMessage = `Lỗi xử lý dữ liệu JSON. Vui lòng kiểm tra định dạng của tệp JSON.`;
                } else if (navigator.onLine === false) {
                    userErrorMessage = `Lỗi mạng. Vui lòng kiểm tra kết nối internet của bạn.`;
                }
                noMoviesFound.textContent = userErrorMessage;
            }
            if (heroTitle) heroTitle.textContent = "Lỗi Tải Dữ Liệu";
            if (heroDescription) heroDescription.textContent = "Không thể kết nối hoặc xử lý dữ liệu.";
            // Disable controls
            // Vô hiệu hóa các điều khiển
            if(genreFilterContainer) genreFilterContainer.classList.add('hidden');
            if(sortFilter) sortFilter.disabled = true;
            if(formatFilter) formatFilter.disabled = true; // Disable format filter on error
            if(tabsContainer) tabsContainer.classList.add('hidden');
            if(yearSliderElement) yearSliderElement.setAttribute('disabled', 'true');
            if(ratingSliderElement) ratingSliderElement.setAttribute('disabled', 'true');
            if(clearFiltersButton) clearFiltersButton.classList.add('hidden');
        }
    };

    // Start the application
    // Bắt đầu ứng dụng
    initializeApp();
    console.log("Trang chủ web xem phim đã sẵn sàng!");

}); // End DOMContentLoaded
