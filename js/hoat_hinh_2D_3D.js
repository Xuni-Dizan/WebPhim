// hoat_hinh_2D_3D.js - JavaScript for the 2D/3D Films Page
// v1.5: Added more console logging for debugging data loading and filtering.
//       Ensured itemType is handled consistently.
//       Improved error handling messages.

// --- START: Basic Page Functionality ---
// --- BẮT ĐẦU: Chức năng Cơ bản của Trang ---

// Set current year in footer
// Đặt năm hiện tại trong footer
const footerYearSpan = document.getElementById('footer-year');
if (footerYearSpan) {
    footerYearSpan.textContent = new Date().getFullYear();
}

// Basic Scroll-to-Top functionality
// Chức năng Cuộn lên đầu cơ bản
const scrollToTopButton = document.getElementById('scroll-to-top');
if (scrollToTopButton) {
    /**
     * Handles the scroll event to show/hide the scroll-to-top button.
     * Xử lý sự kiện cuộn để hiển thị/ẩn nút cuộn lên đầu.
     */
    const handleScroll = () => {
        const isVisible = window.scrollY > 300;
        // Use classList.toggle for cleaner logic
        scrollToTopButton.classList.toggle('visible', isVisible);
        scrollToTopButton.classList.toggle('hidden', !isVisible);
        scrollToTopButton.setAttribute('aria-hidden', String(!isVisible));
    };

    /**
     * Scrolls the window to the top smoothly.
     * Cuộn cửa sổ lên đầu một cách mượt mà.
     * @param {Event} event The click event.
     */
    const scrollToTop = (event) => {
        event.preventDefault(); // Prevent default anchor behavior
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('scroll', handleScroll);
    scrollToTopButton.addEventListener('click', scrollToTop);
    handleScroll(); // Initial check - Kiểm tra ban đầu
}

// Mobile Menu Toggle (Specific for this page)
// Chuyển đổi Menu Di động (Cụ thể cho trang này)
const mobileMenuButton2d3d = document.getElementById('mobile-menu-button'); // Corrected ID to match index.html header
const mobileMenuPanel2d3d = document.getElementById('mobile-menu-panel'); // Corrected ID to match index.html header
const mobileMenuOverlay2d3d = document.getElementById('mobile-menu-overlay'); // Corrected ID to match index.html header
const closeMobileMenuButton2d3d = document.getElementById('close-mobile-menu-button'); // Corrected ID to match index.html header

/**
 * Opens the mobile navigation menu.
 * Mở menu điều hướng di động.
 */
const openMobileMenu2d3d = () => {
    mobileMenuPanel2d3d?.classList.remove('translate-x-full');
    mobileMenuPanel2d3d?.classList.add('translate-x-0');
    mobileMenuOverlay2d3d?.classList.remove('hidden');
    mobileMenuButton2d3d?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // Prevent body scroll when menu is open
};

/**
 * Closes the mobile navigation menu.
 * Đóng menu điều hướng di động.
 */
const closeMobileMenu2d3d = () => {
    mobileMenuPanel2d3d?.classList.remove('translate-x-0');
    mobileMenuPanel2d3d?.classList.add('translate-x-full');
    mobileMenuOverlay2d3d?.classList.add('hidden');
    mobileMenuButton2d3d?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = ''; // Restore body scroll
};

// Add event listeners for mobile menu
// Thêm trình lắng nghe sự kiện cho menu di động
mobileMenuButton2d3d?.addEventListener('click', openMobileMenu2d3d);
closeMobileMenuButton2d3d?.addEventListener('click', closeMobileMenu2d3d);
mobileMenuOverlay2d3d?.addEventListener('click', closeMobileMenu2d3d);

// --- END: Basic Page Functionality ---
// --- KẾT THÚC: Chức năng Cơ bản của Trang ---


// --- START: JavaScript for 2D/3D Page with Filters & Search Suggestions ---
// --- BẮT ĐẦU: JavaScript cho Trang 2D/3D với Bộ lọc & Gợi ý Tìm kiếm ---
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    // Các phần tử DOM
    const gridContainer = document.getElementById('grid-container');
    const loadingIndicator = document.getElementById('loading-films');
    const noResultsIndicator = document.getElementById('no-films-found');
    const heroSection = document.getElementById('hero-section-2d3d');
    const heroTitle = document.getElementById('hero-title-2d3d');
    const heroDescription = document.getElementById('hero-description-2d3d');
    const dimensionFilter = document.getElementById('dimension-filter');
    const typeFilter = document.getElementById('type-filter-2d3d');
    const sortFilter = document.getElementById('sort-filter-2d3d');
    // Corrected search input IDs to match the updated header
    const searchInputDesktop = document.getElementById('search-input-desktop');
    const searchInputMobile = document.getElementById('search-input-mobile');
    const searchIconMobile = document.getElementById('search-icon-mobile');
    const mobileSearchContainer = document.getElementById('mobile-search-container');
    const gridTitle = document.getElementById('grid-title-2d3d');
    // Corrected search suggestions container IDs
    const suggestionsDesktop = document.getElementById('search-suggestions-desktop');
    const suggestionsMobile = document.getElementById('search-suggestions-mobile');


    // State Variables
    // Biến trạng thái
    let allFetchedItems = []; // Store all 2D/3D items fetched - Lưu trữ tất cả các mục 2D/3D được tìm nạp
    let currentFilters = {
        dimension: 'all', // 'all', '2D', '3D'
        type: 'all',      // 'all', 'movies', 'series'
        sort: 'default',
        search: ''        // Added search state - Đã thêm trạng thái tìm kiếm
    };
    let searchDebounceTimer; // Timer for search input debounce - Bộ hẹn giờ cho debounce đầu vào tìm kiếm

    // --- Helper Functions ---

    /**
     * Debounce function to limit the rate at which a function can fire.
     * Hàm debounce để giới hạn tần suất một hàm có thể được gọi.
     * @param {Function} func The function to debounce.
     * @param {number} wait The delay in milliseconds.
     * @returns {Function} The debounced function.
     */
     const debounce = (func, wait) => {
         let timeout;
         return (...args) => {
             clearTimeout(timeout);
             timeout = setTimeout(() => {
                 func.apply(this, args);
             }, wait);
         };
     };

    /**
     * Highlights the search term within a given text.
     * Tô sáng thuật ngữ tìm kiếm trong một văn bản nhất định.
     * @param {string|null} text The text to highlight within.
     * @param {string} term The search term.
     * @returns {string} The text with the term highlighted, or the original text.
     */
    const highlightTerm = (text, term) => {
        if (!term || !text) return text || '';
        // Escape special characters in the search term for regex
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi'); // 'g' for global, 'i' for case-insensitive
        return text.replace(regex, `<span class="search-highlight">$1</span>`);
    };

    /**
     * Creates the HTML string for a single search suggestion item.
     * Tạo chuỗi HTML cho một mục gợi ý tìm kiếm đơn lẻ.
     * @param {object} item The movie/series data object.
     * @param {string} searchTerm The current search term for highlighting.
     * @returns {string} The HTML string for the suggestion item.
     */
    const createSuggestionItem = (item, searchTerm) => {
        // Determine detail page URL based on itemType (movies, series, anime-movie, anime-series)
        // Xác định URL trang chi tiết dựa trên itemType
        let detailPageUrl = '#';
        const itemType = item.itemType; // Use itemType from data

        if (itemType === 'anime-series' || itemType === 'anime-movie') {
            // Link anime types to animeDetails.html
            detailPageUrl = `animeDetails.html?id=${item.id}&type=${itemType}`;
        } else if (itemType === 'series') {
            // Link series to filmDetails_phimBo.html
            detailPageUrl = `filmDetails_phimBo.html?id=${item.id}&type=series`;
        } else { // movies
            // Link standard movies to filmDetail.html
            detailPageUrl = `filmDetail.html?id=${item.id}&type=movies`;
        }

        const altText = `Poster nhỏ của ${itemType.includes('anime') ? 'Anime' : (itemType === 'movies' ? 'phim' : 'phim bộ')} ${item.title || 'không có tiêu đề'}`;
        const typeLabel = (itemType === 'series' || itemType === 'anime-series') ? ' (Bộ)' : (itemType === 'anime-movie' ? ' (Anime Movie)' : ''); // Add labels
        const posterSrc = item.posterUrl || '../https://placehold.co/40x60/111111/eeeeee?text=N/A'; // Fallback poster (relative path)
        // Highlight the search term in the title
        const highlightedTitle = highlightTerm(item.title || 'Không có tiêu đề', searchTerm);

        return `
            <a href="${detailPageUrl}" class="suggestion-item" data-item-id="${item.id}" data-item-type="${itemType}" role="option" aria-label="Xem chi tiết ${item.title || ''}${typeLabel}">
                <img src="${posterSrc}" alt="${altText}" loading="lazy" class="w-10 h-15 object-cover rounded border border-border-color" onerror="this.onerror=null; this.src='../https://placehold.co/40x60/111111/eeeeee?text=Err'; this.alt='Lỗi tải ảnh nhỏ ${item.title || ''}';">
                <div class="suggestion-item-info">
                    <span class="suggestion-item-title">${highlightedTitle}${typeLabel}</span>
                    <span class="suggestion-item-year">${item.releaseYear || 'N/A'}</span>
                </div>
            </a>`;
    };


    /**
     * Displays search suggestions based on the input term.
     * Hiển thị gợi ý tìm kiếm dựa trên thuật ngữ nhập vào.
     * @param {string} searchTerm The term entered by the user.
     * @param {HTMLInputElement} inputElement The input element triggering the search.
     * @param {HTMLElement} suggestionsContainer The container to display suggestions in.
     */
    const displaySearchSuggestions = (searchTerm, inputElement, suggestionsContainer) => {
        if (!suggestionsContainer) return; // Exit if container doesn't exist
        const placeholder = suggestionsContainer.querySelector('.no-suggestions-placeholder');

        // If search term is empty, hide suggestions
        if (!searchTerm) {
            suggestionsContainer.style.display = 'none';
            inputElement.setAttribute('aria-expanded', 'false');
            if (placeholder) placeholder.textContent = 'Nhập để tìm kiếm...'; // Reset placeholder text
            return;
        }

        // Show "Searching..." message while filtering
        if (placeholder) placeholder.textContent = 'Đang tìm...';
        suggestionsContainer.innerHTML = ''; // Clear old suggestions

        // Filter the *allFetchedItems* (which are already 2D/3D) based on the search term
        const matchedItems = allFetchedItems
            .filter(item => item.title && item.title.toLowerCase().includes(searchTerm))
            .slice(0, 7); // Limit to a reasonable number of suggestions (e.g., 7)

        if (matchedItems.length > 0) {
            // Populate container with new suggestions
            suggestionsContainer.innerHTML = matchedItems.map(item => createSuggestionItem(item, searchTerm)).join('');
            suggestionsContainer.style.display = 'block'; // Show the container
            inputElement.setAttribute('aria-expanded', 'true'); // Indicate suggestions are shown
        } else {
            // Show "No results" message
            suggestionsContainer.innerHTML = `<div class="no-suggestions-placeholder p-3 text-sm text-text-muted text-center italic">Không tìm thấy kết quả nào.</div>`;
            suggestionsContainer.style.display = 'block'; // Show the container
            inputElement.setAttribute('aria-expanded', 'true');
        }
    };

    /**
     * Hides all search suggestion dropdowns.
     * Ẩn tất cả các dropdown gợi ý tìm kiếm.
     */
    const hideAllSearchSuggestions = () => {
        if (suggestionsDesktop) {
            suggestionsDesktop.style.display = 'none';
            if(searchInputDesktop) searchInputDesktop.setAttribute('aria-expanded', 'false');
        }
        if (suggestionsMobile) {
            suggestionsMobile.style.display = 'none';
            if(searchInputMobile) searchInputMobile.setAttribute('aria-expanded', 'false');
        }
    };
    // Expose globally for inline script or other parts of the page if needed
    window.hideAllSearchSuggestions = hideAllSearchSuggestions;


    /**
     * Creates the HTML string for a movie or series card with badges.
     * Tạo chuỗi HTML cho thẻ phim hoặc phim bộ với các huy hiệu.
     * @param {object} item The movie or series data object.
     * @returns {string} The HTML string for the card.
     */
    const createItemCard = (item) => {
        // Determine detail page URL based on itemType (movies, series, anime-movie, anime-series)
        // Xác định URL trang chi tiết dựa trên itemType
        let detailPageUrl = '#';
        const itemType = item.itemType; // Use itemType from data

        if (itemType === 'anime-series' || itemType === 'anime-movie') {
            // Link anime types to animeDetails.html
            detailPageUrl = `animeDetails.html?id=${item.id}&type=${itemType}`;
        } else if (itemType === 'series') {
            // Link series to filmDetails_phimBo.html
            detailPageUrl = `filmDetails_phimBo.html?id=${item.id}&type=series`;
        } else { // movies
            // Link standard movies to filmDetail.html
            detailPageUrl = `filmDetail.html?id=${item.id}&type=movies`;
        }

        const altText = `Poster ${itemType.includes('anime') ? 'Anime' : (itemType === 'movies' ? 'phim' : 'phim bộ')} ${item.title || 'không có tiêu đề'}, năm ${item.releaseYear || 'không rõ'}`;

        let badgesHTML = '';
        const format = item.format || []; // Default to empty array if format is missing

        // Add a badge for 2D or 3D (prioritize 3D if both exist)
        let formatBadgeText = '';
        let formatBadgeClass = '';
        if (format.includes("3D")) {
            formatBadgeText = '3D';
            formatBadgeClass = 'format-badge-3d'; // Use CSS class for styling
        } else if (format.includes("2D")) {
            formatBadgeText = '2D';
            formatBadgeClass = 'format-badge-2d'; // Use CSS class for styling
        }
        // Note: Animation badge is not typically needed on the 2D/3D page as all items are expected to be animated.
        // If you want to show it for non-2D/3D animated content that might somehow appear here, add:
        // else if (format.includes("Animation")) { formatBadgeText = 'Hoạt Hình'; formatBadgeClass = 'bg-yellow-500'; }

        if (formatBadgeText) {
            // Place format badge on the top-left
            badgesHTML += `<span class="absolute top-2 left-2 ${formatBadgeClass} text-white text-xs font-semibold px-2 py-1 rounded shadow-md z-10">${formatBadgeText}</span>`;
        }

        // Add a badge if it's a series or anime series (Top Right)
        if (itemType === 'series' || itemType === 'anime-series') {
            badgesHTML += `<span class="absolute top-2 right-2 series-badge text-white text-xs font-semibold px-2 py-1 rounded shadow-md z-10">Bộ</span>`; // Use CSS class
        } else if (itemType === 'anime-movie') {
             badgesHTML += `<span class="absolute top-2 right-2 bg-purple-600 text-white text-xs font-semibold px-2 py-1 rounded shadow-md z-10">Anime Movie</span>`;
        } else if (itemType === 'movies') {
             badgesHTML += `<span class="absolute top-2 right-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded shadow-md z-10">Lẻ</span>`;
        }


        const posterUrl = item.posterUrl || '../https://placehold.co/300x450/111111/eeeeee?text=No+Poster'; // Relative path
        const titleText = item.title || 'Không có tiêu đề';
        const yearText = item.releaseYear || 'N/A';

        // Highlight search term in title if a search is active
        const displayTitle = currentFilters.search ? highlightTerm(titleText, currentFilters.search) : titleText;

        return `
            <a href="${detailPageUrl}" class="bg-light-gray rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition duration-300 cursor-pointer group relative block movie-card" data-item-id="${item.id}" data-item-type="${itemType}" aria-label="Xem chi tiết ${itemType.includes('anime') ? 'Anime' : (itemType === 'movies' ? 'phim' : 'phim bộ')} ${titleText}">
                <div class="relative">
                    <img src="${posterUrl}" alt="${altText}" class="w-full h-auto object-cover aspect-[2/3]" loading="lazy" onerror="this.onerror=null; this.src='../https://placehold.co/300x450/111111/eeeeee?text=Error'; this.alt='Lỗi tải ảnh poster ${titleText}';">
                    ${badgesHTML}
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100" aria-hidden="true">
                        <i class="fas fa-play text-white text-4xl"></i>
                    </div>
                </div>
                <div class="p-3">
                    <h3 class="font-semibold text-gray-200 text-sm md:text-base truncate" title="${titleText}">${displayTitle}</h3>
                    <p class="text-xs text-text-muted">${yearText}</p>
                </div>
            </a>
        `;
    };


     /**
      * Updates the hero section UI based on the provided item.
      * Cập nhật giao diện người dùng phần hero dựa trên mục được cung cấp.
      * Uses enhanced CSS styles for animations and appearance.
      * Sử dụng các kiểu CSS nâng cao cho hoạt ảnh và giao diện.
      * @param {object|null} item The movie or series object, or null for default/error state.
      */
      const updateHeroUI = (item) => {
          if (!heroSection) {
              console.warn("Hero section element not found.");
              return;
          }

          if (!item) {
              // Set a default or error state if no item is provided
              console.warn("Hero item data is missing. Setting default hero.");
              heroSection.style.backgroundImage = `url('../https://placehold.co/1920x500/141414/333333?text=No+Featured+Item')`;
              if (heroTitle) heroTitle.textContent = "Không có phim nổi bật";
              if (heroDescription) heroDescription.textContent = "Khám phá danh sách phim 2D và 3D.";
              heroSection.setAttribute('aria-label', 'Không có phim nổi bật');
              // Disable buttons if no item
              const heroPlayButton = heroSection.querySelector('#hero-play-button');
              const heroDetailButton = heroSection.querySelector('#hero-detail-button');
              if (heroPlayButton) heroPlayButton.style.display = 'none';
              if (heroDetailButton) heroDetailButton.style.display = 'none';
              return;
          }

          // Determine the background image URL (prefer heroImage, fallback to posterUrl)
          const backgroundImageUrl = item.heroImage || item.posterUrl || '../https://placehold.co/1920x500/141414/333333?text=Image+Error'; // Relative path

          // Apply new background image (CSS handles the zoom animation)
          heroSection.style.backgroundImage = `url('${backgroundImageUrl}')`;
          heroSection.setAttribute('aria-label', `Phim nổi bật: ${item.title || 'Đang tải'}`);

          // Update text content (CSS handles the fade-in animation)
          if (heroTitle) heroTitle.textContent = item.title || 'Đang tải...';
          if (heroDescription) {
              // Limit description length for display
              const shortDesc = item.description ? (item.description.length > 150 ? item.description.substring(0, 150) + '...' : item.description) : 'Khám phá thế giới 2D và 3D sống động.';
              heroDescription.textContent = shortDesc;
          }

          // Determine detail page URL based on itemType
          // Xác định URL trang chi tiết dựa trên itemType
          let detailPageUrl = '#';
          const itemType = item.itemType; // Should exist now from combined data
          if (itemType === 'anime-series' || itemType === 'anime-movie') {
              detailPageUrl = `animeDetails.html?id=${item.id}&type=${itemType}`;
          } else if (itemType === 'series') {
              detailPageUrl = `filmDetails_phimBo.html?id=${item.id}&type=series`;
          } else { // movies
              detailPageUrl = `filmDetail.html?id=${item.id}&type=movies`;
          }

          // Update button links and visibility
          const heroPlayButton = heroSection.querySelector('#hero-play-button');
          const heroDetailButton = heroSection.querySelector('#hero-detail-button');

          if (heroPlayButton) {
              heroPlayButton.style.display = ''; // Show button
              heroPlayButton.onclick = () => { window.location.href = detailPageUrl + '#player-section'; };
              heroPlayButton.setAttribute('aria-label', `Xem ngay ${itemType.includes('anime') ? 'Anime' : (itemType === 'movies' ? 'phim' : 'phim bộ')} ${item.title || ''}`);
          }
          if (heroDetailButton) {
              heroDetailButton.style.display = ''; // Show button
              heroDetailButton.onclick = () => { window.location.href = detailPageUrl; };
              heroDetailButton.setAttribute('aria-label', `Xem chi tiết ${itemType.includes('anime') ? 'Anime' : (itemType === 'movies' ? 'phim' : 'phim bộ')} ${item.title || ''}`);
          }
      };


    /**
     * Applies filters and sorting to the fetched data and renders the grid.
     * Áp dụng bộ lọc và sắp xếp cho dữ liệu đã tìm nạp và hiển thị lưới.
     */
    const applyFiltersAndRender = () => {
        if (!gridContainer) return; // Exit if grid container not found

        // Show loading indicators
        // Keep loading indicator visible briefly during re-render if needed, but hide if data is ready
        if (allFetchedItems.length > 0) {
             if (loadingIndicator) loadingIndicator.classList.add('hidden'); // Hide if data is loaded
        } else {
             if (loadingIndicator) loadingIndicator.classList.remove('hidden'); // Keep visible if no data yet
        }
        if (noResultsIndicator) noResultsIndicator.classList.add('hidden'); // Hide "no results" initially
        gridContainer.innerHTML = ''; // Clear previous results

        let itemsToDisplay = [...allFetchedItems]; // Start with all fetched 2D/3D items
        let titlePrefix = "Danh Sách Phim 2D/3D";
        let filterDescriptions = []; // To build the subtitle

        // 1. Apply Search Filter FIRST
        if (currentFilters.search) {
            const searchTerm = currentFilters.search.trim().toLowerCase(); // Trim whitespace
            itemsToDisplay = itemsToDisplay.filter(item =>
                item.title && item.title.toLowerCase().includes(searchTerm)
            );
            // If search is active, change the main title
            titlePrefix = `Kết quả tìm kiếm cho "${currentFilters.search}"`;
        }

        // 2. Apply Dimension Filter (2D/3D)
        if (currentFilters.dimension === '2D') {
            // Filter for items that include '2D' but NOT '3D' in their format array
            itemsToDisplay = itemsToDisplay.filter(item => Array.isArray(item.format) && item.format.includes('2D') && !item.format.includes('3D'));
            if (!currentFilters.search) filterDescriptions.push("Chỉ 2D"); // Add description if not searching
        } else if (currentFilters.dimension === '3D') {
            // Filter for items that include '3D' in their format array
            itemsToDisplay = itemsToDisplay.filter(item => Array.isArray(item.format) && item.format.includes('3D'));
            if (!currentFilters.search) filterDescriptions.push("Chỉ 3D"); // Add description if not searching
        }
        // If 'all', no dimension filtering is needed

        // 3. Apply Type Filter (Movie/Series)
        if (currentFilters.type === 'movies') {
            // Filter for items that are movies OR anime-movies
            itemsToDisplay = itemsToDisplay.filter(item => item.itemType === 'movies' || item.itemType === 'anime-movie');
            if (!currentFilters.search) filterDescriptions.push("Phim lẻ"); // Add description if not searching
        } else if (currentFilters.type === 'series') {
             // Filter for items that are series OR anime-series
            itemsToDisplay = itemsToDisplay.filter(item => item.itemType === 'series' || item.itemType === 'anime-series');
            if (!currentFilters.search) filterDescriptions.push("Phim bộ"); // Add description if not searching
        }
        // If 'all', no type filtering is needed

        // 4. Apply Sorting
        switch (currentFilters.sort) {
            case 'newest': itemsToDisplay.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0)); break;
            case 'rating_desc': itemsToDisplay.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
            case 'rating_asc': itemsToDisplay.sort((a, b) => (a.rating || 0) - (b.rating || 0)); break;
            case 'title_asc': itemsToDisplay.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
            case 'title_desc': itemsToDisplay.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
            // 'default' requires no additional sorting here
        }

        // 5. Update Grid Title based on applied filters
        if (gridTitle) {
            // Combine title prefix with filter descriptions
            gridTitle.textContent = filterDescriptions.length > 0 ? `${titlePrefix} (${filterDescriptions.join(', ')})` : titlePrefix;
        }

        console.log(`Đang hiển thị ${itemsToDisplay.length} mục sau khi áp dụng bộ lọc và tìm kiếm.`, itemsToDisplay);

        // 6. Render the filtered and sorted items
        if (loadingIndicator) loadingIndicator.classList.add('hidden'); // Hide loading indicator
        if (itemsToDisplay.length > 0) {
            // Render cards, passing the item itself
            gridContainer.innerHTML = itemsToDisplay.map(item => createItemCard(item)).join('');
        } else {
            // Show "No results" message
            if (noResultsIndicator) {
                // Customize message based on whether a search was performed
                noResultsIndicator.textContent = currentFilters.search
                    ? `Không tìm thấy kết quả nào cho "${currentFilters.search}".`
                    : "Không tìm thấy phim nào phù hợp với bộ lọc.";
                noResultsIndicator.classList.remove('hidden');
            }
            gridContainer.innerHTML = ''; // Ensure grid is empty
        }
    };


    /**
     * Fetches initial data (movies, series, anime), filters for 2D/3D items,
     * updates the hero section, sets up filters, and renders the initial grid.
     * Tìm nạp dữ liệu ban đầu (phim lẻ, bộ, anime), lọc các mục 2D/3D,
     * cập nhật phần hero, thiết lập bộ lọc và hiển thị lưới ban đầu.
     */
    const loadAndDisplayFilms = async () => {
        // Show loading indicators initially
        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
        if (noResultsIndicator) noResultsIndicator.classList.add('hidden');
        // Display skeleton cards while loading
        const initialSkeletonsHTML = Array(12).fill(`
            <div class="movie-card-skeleton">
                <div class="skeleton skeleton-image"></div>
                <div class="p-3">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                </div>
            </div>
        `).join('');
        if (gridContainer) gridContainer.innerHTML = initialSkeletonsHTML;

        console.log("--- Bắt đầu tải dữ liệu phim 2D/3D ---");
        console.log("Đang cố gắng tải dữ liệu từ: ../json/filmData.json, ../json/filmData_phimBo.json, ../json/animeData.json");


        try {
            // Fetch ALL data sources concurrently
            const [moviesResponse, seriesResponse, animeResponse] = await Promise.all([
                fetch('../json/filmData.json').catch(e => { console.error("Fetch movies failed:", e); return { ok: false, error: e, url: '../json/filmData.json' }; }),
                fetch('../json/filmData_phimBo.json').catch(e => { console.error("Fetch series failed:", e); return { ok: false, error: e, url: '../json/filmData_phimBo.json' }; }),
                fetch('../json/animeData.json').catch(e => { console.error("Fetch anime failed:", e); return { ok: false, error: e, url: '../json/animeData.json' }; })
            ]);

            console.log("Trạng thái phản hồi Fetch:");
            console.log("moviesResponse:", moviesResponse);
            console.log("seriesResponse:", seriesResponse);
            console.log("animeResponse:", animeResponse);

            // Process responses, default to empty array on error or non-ok status
            const moviesData = moviesResponse.ok ? await moviesResponse.json().catch(e => { console.error(`Parse JSON failed for ${moviesResponse.url}:`, e); return []; }) : [];
            const seriesData = seriesResponse.ok ? await seriesResponse.json().catch(e => { console.error(`Parse JSON failed for ${seriesResponse.url}:`, e); return []; }) : [];
            const animeData = animeResponse.ok ? await animeResponse.json().catch(e => { console.error(`Parse JSON failed for ${animeResponse.url}:`, e); return []; }) : [];

            console.log("Dữ liệu đã tải và phân tích cú pháp:");
            console.log("moviesData (count):", moviesData.length, moviesData);
            console.log("seriesData (count):", seriesData.length, seriesData);
            console.log("animeData (count):", animeData.length, animeData);


            // Combine all data sources and add itemType if missing
            // Ensure itemType is correctly assigned based on source if not present
            const allItems = [];
            if (Array.isArray(moviesData)) {
                allItems.push(...moviesData.map(item => ({ ...item, itemType: item.itemType || 'movies' })));
            } else {
                console.warn("moviesData không phải là mảng hoặc trống:", moviesData);
            }
            if (Array.isArray(seriesData)) {
                 allItems.push(...seriesData.map(item => ({ ...item, itemType: item.itemType || 'series' })));
            } else {
                console.warn("seriesData không phải là mảng hoặc trống:", seriesData);
            }
            if (Array.isArray(animeData)) {
                // Assuming anime items can also be 2D/3D, add them with appropriate itemType
                allItems.push(...animeData.map(item => ({ ...item, itemType: item.itemType || 'anime' })));
            } else {
                 console.warn("animeData không phải là mảng hoặc trống:", animeData);
            }
            console.log("Tổng số mục sau khi kết hợp:", allItems.length, allItems);
            // Log a sample item to check structure
            if (allItems.length > 0) console.log("Mục mẫu sau khi kết hợp:", allItems[0]);


            // Filter the combined list to get only items marked as 2D or 3D
            // This includes movies, series, and anime that have these formats
            // CRITICAL CHECK: Ensure your JSON data items have a 'format' property which is an array,
            // and contains the strings '2D' or '3D' for items you want to appear here.
            allFetchedItems = allItems.filter(item => {
                const is2D3D = Array.isArray(item.format) && (item.format.includes('2D') || item.format.includes('3D'));
                // Uncomment the line below if you want to see which items are being filtered out
                // if (!is2D3D) { console.log("Loại bỏ mục không có format 2D/3D:", item); }
                return is2D3D;
            });


            console.log(`Số lượng mục 2D/3D sau khi lọc: ${allFetchedItems.length}`, allFetchedItems);
             // Log a sample item from the filtered list
            if (allFetchedItems.length > 0) console.log("Mục mẫu 2D/3D đã lọc:", allFetchedItems[0]);
            else console.warn("Không tìm thấy mục nào có định dạng 2D hoặc 3D trong dữ liệu đã tải. Vui lòng kiểm tra nội dung các file JSON.");


            // Update the Hero section with the first 2D/3D item found (or a default)
            if (allFetchedItems.length > 0) {
                // Find the first item that has a heroImage, otherwise use the very first item
                // Prioritize items with heroImage for better visual appeal in the hero section
                const heroItem = allFetchedItems.find(item => item.heroImage) || allFetchedItems[0];
                updateHeroUI(heroItem);
            } else {
                 updateHeroUI(null); // Handle case with no 2D/3D items
            }

            // Remove skeleton cards before rendering actual content
            const skeletons = gridContainer?.querySelectorAll('.movie-card-skeleton');
            skeletons?.forEach(skeleton => skeleton.remove());

            // Apply initial filters (default or from URL) and render the grid
            applyFiltersAndRender(); // Initial render

            // Add event listeners to filter controls AFTER data is loaded
            dimensionFilter?.addEventListener('change', (e) => {
                currentFilters.dimension = e.target.value;
                console.log("Bộ lọc thay đổi: Dimension =", currentFilters.dimension);
                applyFiltersAndRender();
            });
            typeFilter?.addEventListener('change', (e) => {
                currentFilters.type = e.target.value;
                 console.log("Bộ lọc thay đổi: Type =", currentFilters.type);
                applyFiltersAndRender();
            });
            sortFilter?.addEventListener('change', (e) => {
                currentFilters.sort = e.target.value;
                 console.log("Bộ lọc thay đổi: Sort =", currentFilters.sort);
                applyFiltersAndRender();
            });

            // --- SEARCH EVENT LISTENERS & SUGGESTIONS ---
            /**
             * Handles input events on search fields.
             * @param {Event} event The input event.
             */
            const handleSearchInput = (event) => {
                 const searchTerm = event.target.value.trim().toLowerCase();
                 const inputElement = event.target;
                 // Determine which suggestions container corresponds to the input
                 const suggestionsContainer = inputElement === searchInputDesktop ? suggestionsDesktop : suggestionsMobile;

                 // Debounce the main grid filtering to avoid excessive updates
                 debounce(() => {
                     currentFilters.search = searchTerm; // Update the global search filter state
                     console.log("Search term updated (debounced):", searchTerm);
                     applyFiltersAndRender(); // Re-filter and render the main grid
                 }, 300)(); // 300ms debounce delay for filtering

                 // Show/hide suggestions with a shorter debounce (or immediately)
                 // Suggestions should search within allFetchedItems for this page
                 // Note: Suggestions are based on the *current* search term, not the debounced one for filtering
                 debounce(() => displaySearchSuggestions(searchTerm, inputElement, suggestionsContainer), 150)(); // 150ms delay for suggestions
            };

            // Add listener for Enter key on search inputs to trigger filter immediately
             const handleSearchSubmit = (event) => {
                  if (event.key === 'Enter') {
                      event.preventDefault();
                      const searchTerm = event.target.value.trim().toLowerCase();
                      console.log(`Performing search for: "${searchTerm}" (Enter key)`);
                      currentFilters.search = searchTerm; // Update the global search filter state
                      applyFiltersAndRender(); // Trigger filtering
                      hideAllSearchSuggestions(); // Hide suggestions after search submit
                      event.target.blur(); // Remove focus from input
                  }
             };


            // Attach the input handler to both desktop and mobile search inputs
            searchInputDesktop?.addEventListener('input', handleSearchInput);
            searchInputMobile?.addEventListener('input', handleSearchInput);
            searchInputDesktop?.addEventListener('keydown', handleSearchSubmit); // Add keydown listener
            searchInputMobile?.addEventListener('keydown', handleSearchSubmit); // Add keydown listener

            // Add listener to hide suggestions when clicking outside search areas
            document.addEventListener('click', (event) => {
                const target = event.target;
                // Check if the click occurred inside the desktop search input or its suggestions
                const isInsideDesktopSearch = searchInputDesktop?.contains(target) || suggestionsDesktop?.contains(target);
                // Check if the click occurred inside the mobile search input, its suggestions, or the icon that opens it
                const isInsideMobileSearch = searchInputMobile?.contains(target) || suggestionsMobile?.contains(target) || searchIconMobile?.contains(target);

                // If the click was outside both search areas, hide the suggestions
                if (!isInsideDesktopSearch && !isInsideMobileSearch) {
                    hideAllSearchSuggestions();
                }
            });

            // Add listener for the mobile search icon to toggle the search input visibility
            searchIconMobile?.addEventListener('click', () => {
                 // Toggle the 'hidden' class on the mobile search container
                 const isHidden = mobileSearchContainer?.classList.toggle('hidden');
                 // Update the aria-expanded attribute for accessibility
                 searchIconMobile.setAttribute('aria-expanded', String(!isHidden));
                 // If the search input is now visible, focus on it
                 if (!isHidden) searchInputMobile?.focus();
                 // If the search input is now hidden, hide any open suggestions
                 else hideAllSearchSuggestions();
            });

        } catch (error) {
            // Handle errors during data fetching or processing
            console.error('Lỗi tải và hiển thị phim 2D/3D:', error);
            // Remove skeleton cards on error
            const errorSkeletons = gridContainer?.querySelectorAll('.movie-card-skeleton');
            errorSkeletons?.forEach(skeleton => skeleton.remove());
            // Display an error message to the user
            if (noResultsIndicator) {
                noResultsIndicator.textContent = `Đã xảy ra lỗi khi tải phim (${error.message || 'Lỗi không xác định'}). Vui lòng kiểm tra console để biết chi tiết và thử lại sau.`;
                noResultsIndicator.classList.remove('hidden');
            }
            if (gridContainer) gridContainer.innerHTML = ''; // Clear the grid
            updateHeroUI(null); // Update hero for error state
        } finally {
            // Always hide the main loading indicator when done (success or error)
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            console.log("--- Kết thúc quá trình tải dữ liệu phim 2D/3D ---");
        }
    };

    // Initialize the page by loading and displaying films
    loadAndDisplayFilms();
});
// --- END: JavaScript for 2D/3D Page ---
// --- KẾT THÚC: JavaScript cho Trang 2D/3D ---
