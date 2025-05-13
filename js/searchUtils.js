/**
 * searchUtils.js - Unified Search Utilities v1.0
 * This file contains common search functionality shared across all pages
 */

// Global search utils namespace
const SearchUtils = {
    /**
     * Normalize text for better search matching (removes accents/diacritics)
     * @param {string} text - Text to normalize
     * @returns {string} Normalized text
     */
    normalizeText(text) {
        if (!text) return '';
        return text.toLowerCase()
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
     * Highlight search term in text
     * @param {string} text - Original text
     * @param {string} term - Term to highlight
     * @returns {string} HTML with highlighted term
     */
    highlightTerm(text, term) {
        if (!term || !text) return text || '';
        
        const normalizedText = text;
        const normalizedTerm = term.toLowerCase();
        
        // Find all occurrences - case insensitive but preserve original case
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        
        return normalizedText.replace(regex, '<span class="search-highlight">$1</span>');
    },
    
    /**
     * Calculate relevance score for search result
     * @param {Object} item - Content item (movie, series, anime)
     * @param {string} searchTerm - Search term
     * @param {Object} options - Scoring options
     * @returns {number} Relevance score (higher is more relevant)
     */
    calculateRelevanceScore(item, searchTerm, options = {}) {
        // Normalize search term and item properties for better matching
        const normalizedTerm = this.normalizeText(searchTerm);
        const normalizedTitle = this.normalizeText(item.title);
        
        // Basic initial score
        let score = 0;
        
        // Exact title match gets highest score
        if (normalizedTitle === normalizedTerm) {
            score += 100;
        }
        // Title starts with search term
        else if (normalizedTitle.startsWith(normalizedTerm)) {
            score += 80;
        }
        // Search term appears in title
        else if (normalizedTitle.includes(normalizedTerm)) {
            score += 60;
        }
        // For each word in title that starts with search term
        else {
            normalizedTitle.split(' ').forEach(word => {
                if (word.startsWith(normalizedTerm)) score += 40;
                else if (word.includes(normalizedTerm)) score += 20;
            });
        }
        
        // Boost score for special items
        if (item.isTrending) score += 10;
        if (item.isNew) score += 8;
        if (item.isHot) score += 6;
        
        // Boost recent releases
        const currentYear = new Date().getFullYear();
        if (item.releaseYear && item.releaseYear >= currentYear - 1) {
            score += 5;
        }
        
        // Match in description (lower weight)
        if (item.description) {
            const normalizedDescription = this.normalizeText(item.description);
            if (normalizedDescription.includes(normalizedTerm)) {
                score += 15;
            }
        }
        
        // Match in genre (medium weight)
        if (item.genre && Array.isArray(item.genre)) {
            const matchesGenre = item.genre.some(g => 
                this.normalizeText(g).includes(normalizedTerm)
            );
            if (matchesGenre) score += 25;
        }
        
        // Match in cast (medium weight)
        if (item.cast && Array.isArray(item.cast)) {
            const matchesCast = item.cast.some(c => 
                this.normalizeText(c).includes(normalizedTerm)
            );
            if (matchesCast) score += 20;
        }
        
        // Match in director (high weight)
        if (item.director) {
            const normalizedDirector = this.normalizeText(item.director);
            if (normalizedDirector.includes(normalizedTerm)) {
                score += 30;
            }
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
        if (!searchTerm || searchTerm.trim().length < 2) {
            return [];
        }
        
        const normalizedTerm = this.normalizeText(searchTerm);
        
        // Map items to results with scores
        const results = items
            .map(item => {
                const score = this.calculateRelevanceScore(item, searchTerm, options);
                const type = this.determineItemType(item);
                return { item, score, type };
            })
            .filter(result => result.score > 0) // Only keep items with a positive score
            .sort((a, b) => b.score - a.score); // Sort by score descending
        
        // Limit results if maxResults is specified
        return options.maxResults ? results.slice(0, options.maxResults) : results;
    },
    
    /**
     * Create HTML for a search suggestion item
     * @param {Object} item - Content item
     * @param {string} type - Item type (movie, series, anime)
     * @param {string} searchTerm - Term to highlight
     * @returns {HTMLElement} Suggestion item element
     */
    createSuggestionItem(item, type, searchTerm) {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        
        // Determine the correct URL based on item type
        let detailUrl;
        if (type === 'movie') {
            detailUrl = `${this.getBasePath()}pages/filmDetail.html?id=${item.id}`;
        } else if (type === 'series') {
            detailUrl = `${this.getBasePath()}pages/filmDetails_phimBo.html?id=${item.id}`;
        } else if (type === 'anime') {
            detailUrl = `${this.getBasePath()}pages/animeDetails.html?id=${item.id}`;
        }
        
        // Set URL and ARIA attributes
        div.setAttribute('data-url', detailUrl);
        div.setAttribute('role', 'option');
        div.setAttribute('aria-label', `Xem chi tiết ${item.title}`);
        
        // Create thumbnail
        const thumbnailSrc = item.posterUrl && (Array.isArray(item.posterUrl) ? item.posterUrl[0] : item.posterUrl);
        
        // Get year and type for meta info
        const year = item.releaseYear || 'N/A';
        let typeLabel = 'Phim lẻ';
        let typeIcon = 'film';
        
        if (type === 'series') {
            typeLabel = 'Phim bộ';
            typeIcon = 'tv';
        } else if (type === 'anime') {
            typeLabel = 'Anime';
            typeIcon = 'dragon';
        }
        
        // Build HTML structure with advanced highlighting
        div.innerHTML = `
            <img src="${thumbnailSrc}" alt="${item.title}" onerror="this.src='${this.getBasePath()}access/img/placeholder.jpg'">
            <div class="suggestion-item-info">
                <div class="suggestion-item-title">${this.highlightTerm(item.title, searchTerm)}</div>
                <div class="suggestion-item-meta">
                    <span class="suggestion-item-year"><i class="far fa-calendar-alt"></i> ${year}</span>
                    <span class="suggestion-item-type"><i class="fas fa-${typeIcon}"></i> ${typeLabel}</span>
                    ${item.rating ? `<span class="suggestion-item-rating"><i class="fas fa-star"></i> ${item.rating}</span>` : ''}
                </div>
            </div>
        `;
        
        // Add badges for trending/new/hot
        if (item.isHot || item.isTrending || item.isNew) {
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'suggestion-item-badges';
            
            if (item.isHot) {
                const hotBadge = document.createElement('span');
                hotBadge.className = 'suggestion-badge suggestion-badge-hot';
                hotBadge.innerHTML = '<i class="fas fa-fire"></i>';
                hotBadge.setAttribute('title', 'Nội dung hot');
                badgeContainer.appendChild(hotBadge);
            }
            
            if (item.isNew) {
                const newBadge = document.createElement('span');
                newBadge.className = 'suggestion-badge suggestion-badge-new';
                newBadge.innerHTML = '<i class="fas fa-certificate"></i>';
                newBadge.setAttribute('title', 'Nội dung mới');
                badgeContainer.appendChild(newBadge);
            }
            
            if (item.isTrending) {
                const trendingBadge = document.createElement('span');
                trendingBadge.className = 'suggestion-badge suggestion-badge-trending';
                trendingBadge.innerHTML = '<i class="fas fa-chart-line"></i>';
                trendingBadge.setAttribute('title', 'Đang thịnh hành');
                badgeContainer.appendChild(trendingBadge);
            }
            
            div.querySelector('.suggestion-item-info').appendChild(badgeContainer);
        }
        
        // Navigate to detail page on click
        div.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = detailUrl;
        });
        
        return div;
    },
    
    /**
     * Setup keyboard navigation for search suggestions
     * @param {HTMLElement} inputElement - Search input element
     * @param {HTMLElement} suggestionsContainer - Suggestions container element
     */
    setupKeyboardNavigation(inputElement, suggestionsContainer) {
        inputElement.addEventListener('keydown', (event) => {
            if (!suggestionsContainer.classList.contains('visible')) return;
            
            const items = suggestionsContainer.querySelectorAll('.suggestion-item');
            if (items.length === 0) return;
            
            let activeItem = suggestionsContainer.querySelector('.suggestion-item.active');
            let activeIndex = Array.from(items).indexOf(activeItem);
            
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    if (activeItem) {
                        activeItem.classList.remove('active');
                        activeIndex = (activeIndex + 1) % items.length;
                    } else {
                        activeIndex = 0;
                    }
                    items[activeIndex].classList.add('active');
                    items[activeIndex].scrollIntoView({ block: 'nearest' });
                    break;
                    
                case 'ArrowUp':
                    event.preventDefault();
                    if (activeItem) {
                        activeItem.classList.remove('active');
                        activeIndex = (activeIndex - 1 + items.length) % items.length;
                    } else {
                        activeIndex = items.length - 1;
                    }
                    items[activeIndex].classList.add('active');
                    items[activeIndex].scrollIntoView({ block: 'nearest' });
                    break;
                    
                case 'Enter':
                    if (activeItem) {
                        event.preventDefault();
                        activeItem.click();
                    }
                    break;
                    
                case 'Escape':
                    event.preventDefault();
                    this.hideAllSearchSuggestions();
                    inputElement.blur();
                    break;
            }
        });
    },
    
    /**
     * Display search suggestions
     * @param {string} searchTerm - Search term
     * @param {HTMLElement} inputElement - Search input element
     * @param {HTMLElement} suggestionsContainer - Suggestions container element
     * @param {Array} items - Items to search through
     * @param {Object} options - Display options
     */
    displaySearchSuggestions(searchTerm, inputElement, suggestionsContainer, items, options = {}) {
        if (!suggestionsContainer) return;
        
        // Clear existing content
        suggestionsContainer.innerHTML = '';
        
        // Hide if search term is empty or too short
        if (!searchTerm || searchTerm.trim().length < 2) {
            suggestionsContainer.innerHTML = '<div class="no-suggestions-placeholder">Nhập ít nhất 2 ký tự để tìm kiếm...</div>';
            suggestionsContainer.classList.remove('visible');
            return;
        }
        
        // Show loading state
        suggestionsContainer.innerHTML = '<div class="no-suggestions-placeholder"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tìm kiếm...</div>';
        suggestionsContainer.classList.add('visible');
        
        // Search items
        const results = this.search(items, searchTerm, {
            maxResults: options.maxResults || 8,
            ...options
        });
        
        // If no results found
        if (results.length === 0) {
            suggestionsContainer.innerHTML = '<div class="no-suggestions-placeholder">Không tìm thấy kết quả nào.</div>';
            return;
        }
        
        // Render suggestions
        results.forEach(({ item, type }) => {
            const suggestionItem = this.createSuggestionItem(item, type, searchTerm);
            suggestionsContainer.appendChild(suggestionItem);
        });
        
        // Make first item active for keyboard navigation
        const firstItem = suggestionsContainer.querySelector('.suggestion-item');
        if (firstItem) firstItem.classList.add('active');
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation(inputElement, suggestionsContainer);
    },
    
    /**
     * Hide all search suggestions
     */
    hideAllSearchSuggestions() {
        document.querySelectorAll('.search-suggestions').forEach(el => {
            el.classList.remove('visible');
        });
    },
    
    /**
     * Determine item type based on its properties
     * @param {Object} item - Content item
     * @returns {string} Item type (movie, series, anime)
     */
    determineItemType(item) {
        if (item.format && item.format.includes('Animation') && item.format.includes('Series')) {
            return 'anime';
        } else if (item.totalEpisodes || (item.format && item.format.includes('Series'))) {
            return 'series';
        } else {
            return 'movie';
        }
    },
    
    /**
     * Get base path for URLs
     * @returns {string} Base path
     */
    getBasePath() {
        const path = window.location.pathname;
        return path.includes('/pages/') ? '../' : '';
    },
    
    /**
     * Initialize global search listeners
     */
    initializeGlobalSearch() {
        // Setup click outside listener
        document.addEventListener('click', (event) => {
            const searchContainers = document.querySelectorAll('.search-container');
            let isInsideSearch = false;
            
            searchContainers.forEach(container => {
                if (container.contains(event.target)) {
                    isInsideSearch = true;
                }
            });
            
            if (!isInsideSearch) {
                this.hideAllSearchSuggestions();
            }
        });
        
        // Make hideAllSearchSuggestions available globally
        window.hideAllSearchSuggestions = this.hideAllSearchSuggestions.bind(this);
    }
};

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    SearchUtils.initializeGlobalSearch();
}); 