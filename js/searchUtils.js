/**
 * searchUtils.js - Unified Search Utilities v1.1
 * This file contains common search functionality shared across all pages
 * v1.1: Enhanced relevance scoring, suggestion item display with more meta info and badges,
 *       improved type determination, and refined placeholder/loading messages.
 */

// Global search utils namespace
const SearchUtils = {
    /**
     * Normalize text for better search matching (removes accents/diacritics, toLowerCase)
     * @param {string} text - Text to normalize
     * @returns {string} Normalized text
     */
    normalizeText(text) {
        if (!text) return '';
        return String(text).toLowerCase() // Ensure text is a string before calling methods
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    },

    /**
     * Create a debounced function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Milliseconds to wait
     * @returns {Function} Debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Highlight search term in text, preserving original case of the text but matching case-insensitively.
     * @param {string} text - Original text
     * @param {string} term - Term to highlight
     * @returns {string} HTML with highlighted term
     */
    highlightTerm(text, term) {
        if (!term || !text) return text || '';
        
        // Escape special characters in the search term for regex
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi'); // 'g' for global, 'i' for case-insensitive
        
        return String(text).replace(regex, '<span class="search-highlight">$1</span>');
    },
    
    /**
     * Calculate relevance score for search result
     * @param {Object} item - Content item (movie, series, anime)
     * @param {string} searchTerm - Search term
     * @param {Object} options - Scoring options (e.g., currentTabType to boost relevant types)
     * @returns {number} Relevance score (higher is more relevant)
     */
    calculateRelevanceScore(item, searchTerm, options = {}) {
        const normalizedTerm = this.normalizeText(searchTerm);
        const normalizedTitle = this.normalizeText(item.title);
        
        let score = 0;
        
        if (normalizedTitle === normalizedTerm) score += 100;
        else if (normalizedTitle.startsWith(normalizedTerm)) score += 80;
        else if (normalizedTitle.includes(normalizedTerm)) score += 60;
        else {
            normalizedTitle.split(' ').forEach(word => {
                if (word.startsWith(normalizedTerm)) score += 30; // Slightly lower for partial word start
                else if (word.includes(normalizedTerm)) score += 15; // Lower for includes within a word
            });
        }
        
        if (item.description) {
            if (this.normalizeText(item.description).includes(normalizedTerm)) score += 10;
        }
        
        if (item.genre && Array.isArray(item.genre)) {
            if (item.genre.some(g => this.normalizeText(g).includes(normalizedTerm))) score += 20;
        }
        
        if (item.cast && Array.isArray(item.cast)) {
            if (item.cast.some(c => this.normalizeText(c).includes(normalizedTerm))) score += 15;
        }
        
        if (item.director && this.normalizeText(item.director).includes(normalizedTerm)) {
            score += 20;
        }

        // Boost by item status
        if (item.isHot) score += 15;
        if (item.isTrending) score += 12;
        if (item.isNew) score += 10;
        
        // Boost recent releases slightly more
        const currentYear = new Date().getFullYear();
        if (item.releaseYear) {
            if (item.releaseYear >= currentYear - 1) score += 8;
            else if (item.releaseYear >= currentYear - 3) score += 4;
        }
        
        // Boost if itemType matches current context (if provided)
        if (options.currentTabType && item.itemType && item.itemType.includes(options.currentTabType)) {
            score += 5; 
        }

        return score;
    },
    
    /**
     * Perform search across content items
     * @param {Array} items - Array of content items
     * @param {string} searchTerm - Search term
     * @param {Object} options - Search options
     * @returns {Array} Scored and sorted search results
     */
    search(items, searchTerm, options = {}) {
        if (!searchTerm || searchTerm.trim().length < 2) { // Require at least 2 characters
            return [];
        }
        
        const results = items
            .map(item => {
                const score = this.calculateRelevanceScore(item, searchTerm, options);
                // Ensure itemType is correctly determined for each item
                const itemType = item.itemType || this.determineItemType(item); // Use existing or determine
                return { item, score, type: itemType }; // Store determined type
            })
            .filter(result => result.score > 0) 
            .sort((a, b) => b.score - a.score); 
        
        return options.maxResults ? results.slice(0, options.maxResults) : results;
    },
    
    /**
     * Create HTML for a search suggestion item
     * @param {Object} item - Content item
     * @param {string} itemType - Item type (e.g., 'movies', 'series', 'anime-movie', 'anime-series')
     * @param {string} searchTerm - Term to highlight
     * @returns {HTMLElement} Suggestion item element (<a> tag)
     */
    createSuggestionItem(item, itemType, searchTerm) {
        const anchor = document.createElement('a'); // Use an anchor tag for direct navigation
        anchor.className = 'suggestion-item';
        
        let detailPageUrl;
        // Determine the correct detail page URL based on the precise itemType
        if (itemType === 'anime-series' || itemType === 'anime-movie') {
            detailPageUrl = `${this.getBasePath()}pages/animeDetails.html?id=${item.id}&type=${itemType}`;
        } else if (itemType === 'series') {
            detailPageUrl = `${this.getBasePath()}pages/filmDetails_phimBo.html?id=${item.id}&type=series`;
        } else { // 'movies'
            detailPageUrl = `${this.getBasePath()}pages/filmDetail.html?id=${item.id}&type=movies`;
        }
        
        anchor.href = detailPageUrl;
        anchor.setAttribute('role', 'option');
        anchor.setAttribute('aria-label', `Xem chi tiết ${item.title || 'Không có tiêu đề'}`);
        
        const posterSrc = (item.posterUrl && (Array.isArray(item.posterUrl) ? item.posterUrl[0] : item.posterUrl)) || 
                          `${this.getBasePath()}access/img/placeholder_poster_45x68.png`; // Placeholder
        
        const year = item.releaseYear || 'N/A';
        let typeLabel = 'Phim Lẻ';
        let typeIcon = 'film';
        
        if (itemType === 'series') { typeLabel = 'Phim Bộ'; typeIcon = 'tv'; }
        else if (itemType === 'anime-movie') { typeLabel = 'Anime Movie'; typeIcon = 'video'; } // Or 'dragon' or specific icon
        else if (itemType === 'anime-series') { typeLabel = 'Anime Series'; typeIcon = 'list-alt';} // Or 'dragon'

        // Badges HTML
        let badgesHTML = '<div class="suggestion-item-badges">';
        if (item.isHot) badgesHTML += `<span class="suggestion-badge suggestion-badge-hot" title="Hot"><i class="fas fa-fire"></i></span>`;
        if (item.isNew) badgesHTML += `<span class="suggestion-badge suggestion-badge-new" title="Mới"><i class="fas fa-certificate"></i></span>`;
        if (item.isTrending) badgesHTML += `<span class="suggestion-badge suggestion-badge-trending" title="Thịnh hành"><i class="fas fa-chart-line"></i></span>`;
        badgesHTML += '</div>';

        anchor.innerHTML = `
            <img src="${posterSrc}" alt="Poster ${item.title || ''}" onerror="this.src='${this.getBasePath()}access/img/placeholder_poster_45x68.png'; this.alt='Lỗi ảnh';">
            <div class="suggestion-item-info">
                <div class="suggestion-item-title">${this.highlightTerm(item.title || 'Không có tiêu đề', searchTerm)}</div>
                <div class="suggestion-item-meta">
                    <span class="suggestion-item-year"><i class="far fa-calendar-alt"></i> ${year}</span>
                    <span class="suggestion-item-type"><i class="fas fa-${typeIcon}"></i> ${typeLabel}</span>
                    ${item.rating ? `<span class="suggestion-item-rating"><i class="fas fa-star"></i> ${parseFloat(item.rating).toFixed(1)}</span>` : ''}
                </div>
                ${(item.isHot || item.isNew || item.isTrending) ? badgesHTML : ''}
            </div>
        `;
        
        return anchor;
    },
    
    /**
     * Setup keyboard navigation for search suggestions
     * @param {HTMLElement} inputElement - Search input element
     * @param {HTMLElement} suggestionsContainer - Suggestions container element
     */
    setupKeyboardNavigation(inputElement, suggestionsContainer) {
        inputElement.addEventListener('keydown', (event) => {
            // Check if suggestions are visible (using the 'visible' class as per updated style.css)
            if (!suggestionsContainer.classList.contains('visible')) return;
            
            const items = suggestionsContainer.querySelectorAll('.suggestion-item');
            if (items.length === 0) return;
            
            let activeItem = suggestionsContainer.querySelector('.suggestion-item.active');
            let activeIndex = Array.from(items).indexOf(activeItem);
            
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    if (activeItem) activeItem.classList.remove('active');
                    activeIndex = activeItem ? (activeIndex + 1) % items.length : 0;
                    items[activeIndex].classList.add('active');
                    items[activeIndex].scrollIntoView({ block: 'nearest' });
                    inputElement.setAttribute('aria-activedescendant', items[activeIndex].id || `suggestion-item-${activeIndex}`);
                    break;
                    
                case 'ArrowUp':
                    event.preventDefault();
                    if (activeItem) activeItem.classList.remove('active');
                    activeIndex = activeItem ? (activeIndex - 1 + items.length) % items.length : items.length - 1;
                    items[activeIndex].classList.add('active');
                    items[activeIndex].scrollIntoView({ block: 'nearest' });
                    inputElement.setAttribute('aria-activedescendant', items[activeIndex].id || `suggestion-item-${activeIndex}`);
                    break;
                    
                case 'Enter':
                    if (activeItem) {
                        event.preventDefault();
                        activeItem.click(); // Trigger navigation
                        this.hideAllSearchSuggestions();
                        inputElement.blur();
                    }
                    break;
                    
                case 'Escape':
                    event.preventDefault();
                    this.hideAllSearchSuggestions();
                    inputElement.blur();
                    break;
            }
        });

        // Add mouseover listener to update active state for keyboard users who then use mouse
        suggestionsContainer.addEventListener('mouseover', (event) => {
            const targetItem = event.target.closest('.suggestion-item');
            if (targetItem) {
                suggestionsContainer.querySelectorAll('.suggestion-item.active').forEach(item => item.classList.remove('active'));
                targetItem.classList.add('active');
                 inputElement.setAttribute('aria-activedescendant', targetItem.id || `suggestion-item-${Array.from(suggestionsContainer.querySelectorAll('.suggestion-item')).indexOf(targetItem)}`);
            }
        });
    },
    
    /**
     * Display search suggestions
     * @param {string} searchTerm - Search term
     * @param {HTMLElement} inputElement - Search input element
     * @param {HTMLElement} suggestionsContainer - Suggestions container element
     * @param {Array} itemsPool - Pool of items to search through
     * @param {Object} options - Display options (e.g., maxResults, currentTabType)
     */
    displaySearchSuggestions(searchTerm, inputElement, suggestionsContainer, itemsPool, options = {}) {
        if (!suggestionsContainer || !inputElement) {
            console.warn("Search input or suggestions container not found.");
            return;
        }
        
        suggestionsContainer.innerHTML = ''; // Clear previous
        const placeholder = suggestionsContainer.querySelector('.no-suggestions-placeholder') || document.createElement('div');
        placeholder.className = 'no-suggestions-placeholder'; // Ensure class
        
        if (!searchTerm || searchTerm.trim().length < 1) { // Show "type to search" if less than 1 char
            placeholder.textContent = 'Nhập để tìm kiếm...';
            suggestionsContainer.appendChild(placeholder);
            suggestionsContainer.classList.remove('visible'); // Use class for visibility
            inputElement.setAttribute('aria-expanded', 'false');
            return;
        }
        
        placeholder.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang tìm kiếm...';
        suggestionsContainer.appendChild(placeholder);
        suggestionsContainer.classList.add('visible');
        inputElement.setAttribute('aria-expanded', 'true');
        
        // Perform the search
        const results = this.search(itemsPool, searchTerm, {
            maxResults: options.maxResults || 7, // Default to 7 results
            currentTabType: options.currentTabType || null // Pass current tab context if available
        });
        
        suggestionsContainer.innerHTML = ''; // Clear loading message
        
        if (results.length === 0) {
            placeholder.textContent = `Không tìm thấy kết quả cho "${searchTerm}".`;
            suggestionsContainer.appendChild(placeholder);
        } else {
            results.forEach(({ item, type }, index) => { // `type` here is the determined itemType
                const suggestionElement = this.createSuggestionItem(item, type, searchTerm);
                // Add unique ID for aria-activedescendant
                suggestionElement.id = `suggestion-item-${inputElement.id}-${index}`; 
                suggestionsContainer.appendChild(suggestionElement);
            });
        }
        
        // Highlight first item if results exist (after clearing container)
        const firstItem = suggestionsContainer.querySelector('.suggestion-item');
        if (firstItem) {
            firstItem.classList.add('active');
            inputElement.setAttribute('aria-activedescendant', firstItem.id);
        } else {
            inputElement.removeAttribute('aria-activedescendant');
        }
    },
    
    /**
     * Hide all search suggestions on the page.
     */
    hideAllSearchSuggestions() {
        document.querySelectorAll('.search-suggestions').forEach(el => {
            el.classList.remove('visible');
            // Also reset aria-expanded on associated input
            const inputId = el.getAttribute('aria-controls');
            const inputEl = inputId ? document.getElementById(inputId.replace('-suggestions', '-input')) : null;
            if (inputEl) inputEl.setAttribute('aria-expanded', 'false');
        });
    },
    
    /**
     * Determine item type based on its properties (more robust)
     * @param {Object} item - Content item
     * @returns {string} Item type ('movies', 'series', 'anime-movie', 'anime-series')
     */
    determineItemType(item) {
        if (item.itemType) return item.itemType; // Prefer existing itemType

        // Anime logic (more specific)
        if (item.format && Array.isArray(item.format) && item.format.includes('Anime')) {
            // If it has seasons or totalEpisodes > 1 (or some other series indicator), it's anime-series
            if (item.numberOfSeasons > 0 || item.totalEpisodes > 1 || (item.seasons && item.seasons.length > 0) ) {
                return 'anime-series';
            }
            return 'anime-movie'; // Default to anime-movie if marked as Anime but not clearly a series
        }

        // General series/movie logic
        if (item.numberOfSeasons > 0 || item.totalEpisodes > 1 || (item.seasons && item.seasons.length > 0) || (item.format && Array.isArray(item.format) && item.format.includes('Series'))) {
            return 'series';
        }
        
        return 'movies'; // Default to movie
    },
    
    /**
     * Get base path for URLs, robustly handling different page depths.
     * @returns {string} Base path (e.g., '../' or './' or just '')
     */
    getBasePath() {
        // Determines depth based on '/pages/' segment in URL
        const pathSegments = window.location.pathname.split('/').filter(segment => segment.length > 0);
        if (pathSegments.includes('pages')) {
            // Find index of 'pages' and go one level up for each segment after it
            const pagesIndex = pathSegments.indexOf('pages');
            const depth = pathSegments.length - 1 - pagesIndex;
            return '../'.repeat(depth);
        }
        return ''; // Root directory
    },
    
    /**
     * Initialize global search listeners (e.g., click outside to close suggestions)
     */
    initializeGlobalSearch() {
        document.addEventListener('click', (event) => {
            // Check if the click was inside any search container or suggestions dropdown
            const isInsideSearchComponent = event.target.closest('.search-container, .search-suggestions');
            if (!isInsideSearchComponent) {
                this.hideAllSearchSuggestions();
            }
        });
        
        // Make hideAllSearchSuggestions globally accessible if needed by other scripts directly
        // window.hideAllSearchSuggestions = this.hideAllSearchSuggestions.bind(this);
    }
};

// Initialize global search utilities listeners when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    SearchUtils.initializeGlobalSearch();
});