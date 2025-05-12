/**
 * favorites.js - Handles user favorites and watchlist functionality
 * This script manages saving/loading from localStorage, UI updates, and interactions
 */

// Store favorites data in a structured way
const userLibrary = {
    favorites: [],
    watchLater: [],
    inProgress: [],
    completed: []
};

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load existing data from localStorage
    loadLibraryFromStorage();
    
    // Initialize UI components
    initializeFavoriteButtons();
    initializeWatchlistButtons();
    
    // Update UI based on current library
    updateLibraryUI();
});

/**
 * Load favorites and watchlist data from localStorage
 */
function loadLibraryFromStorage() {
    try {
        // Get data from localStorage
        const savedFavorites = localStorage.getItem('user_favorites');
        const savedWatchlist = localStorage.getItem('user_watchlist');
        const savedInProgress = localStorage.getItem('user_in_progress');
        const savedCompleted = localStorage.getItem('user_completed');
        
        // Parse and populate if data exists
        if (savedFavorites) userLibrary.favorites = JSON.parse(savedFavorites);
        if (savedWatchlist) userLibrary.watchLater = JSON.parse(savedWatchlist);
        if (savedInProgress) userLibrary.inProgress = JSON.parse(savedInProgress);
        if (savedCompleted) userLibrary.completed = JSON.parse(savedCompleted);
        
        console.log('Library data loaded successfully');
    } catch (error) {
        console.error('Error loading library data:', error);
    }
}

/**
 * Save current library data to localStorage
 */
function saveLibraryToStorage() {
    try {
        localStorage.setItem('user_favorites', JSON.stringify(userLibrary.favorites));
        localStorage.setItem('user_watchlist', JSON.stringify(userLibrary.watchLater));
        localStorage.setItem('user_in_progress', JSON.stringify(userLibrary.inProgress));
        localStorage.setItem('user_completed', JSON.stringify(userLibrary.completed));
        
        console.log('Library data saved successfully');
    } catch (error) {
        console.error('Error saving library data:', error);
        showNotification('Failed to save changes. Please try again.', 'error');
    }
}

/**
 * Initialize favorite button interactions
 */
function initializeFavoriteButtons() {
    // Find all favorite buttons in the page
    const favoriteButtons = document.querySelectorAll('.favorite-button, .action-button-anime[aria-label*="Yêu Thích"]');
    
    favoriteButtons.forEach(button => {
        // Get item data
        const itemId = button.dataset.id;
        const itemType = button.dataset.type;
        
        if (!itemId || !itemType) return;
        
        // Check if already in favorites
        const isFavorite = isItemInLibrary('favorites', itemId, itemType);
        updateButtonState(button, isFavorite);
        
        // Add click handler
        button.addEventListener('click', function(e) {
            e.preventDefault();
            toggleFavoriteStatus(itemId, itemType, button);
        });
    });
}

/**
 * Initialize watchlist button interactions
 */
function initializeWatchlistButtons() {
    // Find all watchlist buttons in the page
    const watchlistButtons = document.querySelectorAll('.watchlist-button, .action-button-secondary[aria-label*="Xem Sau"]');
    
    watchlistButtons.forEach(button => {
        // Get item data
        const itemId = button.dataset.id;
        const itemType = button.dataset.type;
        
        if (!itemId || !itemType) return;
        
        // Check if already in watchlist
        const isInWatchlist = isItemInLibrary('watchLater', itemId, itemType);
        updateButtonState(button, isInWatchlist);
        
        // Add click handler
        button.addEventListener('click', function(e) {
            e.preventDefault();
            toggleWatchlistStatus(itemId, itemType, button);
        });
    });
}

/**
 * Update favorite status for an item
 */
function toggleFavoriteStatus(itemId, itemType, buttonElement) {
    // Check if item is already in favorites
    const isFavorite = isItemInLibrary('favorites', itemId, itemType);
    
    if (isFavorite) {
        // Remove from favorites
        removeFromLibrary('favorites', itemId, itemType);
        updateButtonState(buttonElement, false);
        showNotification('Removed from favorites', 'info');
    } else {
        // Add to favorites
        addToLibrary('favorites', itemId, itemType);
        updateButtonState(buttonElement, true);
        showNotification('Added to favorites', 'success');
        
        // Animate heart
        animateHeartIcon(buttonElement);
    }
    
    // Save changes
    saveLibraryToStorage();
    
    // Update any library UI that's showing
    updateLibraryUI();
}

/**
 * Update watchlist status for an item
 */
function toggleWatchlistStatus(itemId, itemType, buttonElement) {
    // Check if item is already in watchlist
    const isInWatchlist = isItemInLibrary('watchLater', itemId, itemType);
    
    if (isInWatchlist) {
        // Remove from watchlist
        removeFromLibrary('watchLater', itemId, itemType);
        updateButtonState(buttonElement, false);
        showNotification('Removed from Watch Later', 'info');
    } else {
        // Add to watchlist
        addToLibrary('watchLater', itemId, itemType);
        updateButtonState(buttonElement, true);
        showNotification('Added to Watch Later', 'success');
    }
    
    // Save changes
    saveLibraryToStorage();
    
    // Update any library UI that's showing
    updateLibraryUI();
}

/**
 * Set watching progress
 */
function setWatchingProgress(itemId, itemType, progress, episode = null) {
    if (progress === 'in-progress') {
        // Add to in-progress list
        addToLibrary('inProgress', itemId, itemType, { lastEpisode: episode });
        
        // If was in completed, remove from there
        if (isItemInLibrary('completed', itemId, itemType)) {
            removeFromLibrary('completed', itemId, itemType);
        }
    } else if (progress === 'completed') {
        // Add to completed list
        addToLibrary('completed', itemId, itemType);
        
        // Remove from in-progress
        if (isItemInLibrary('inProgress', itemId, itemType)) {
            removeFromLibrary('inProgress', itemId, itemType);
        }
    }
    
    // Save changes
    saveLibraryToStorage();
    
    // Update any progress UI
    updateProgressUI(itemId, itemType, progress);
}

/**
 * Add item to a library category
 */
function addToLibrary(category, itemId, itemType, additionalData = {}) {
    // Make sure this category exists
    if (!userLibrary[category]) {
        userLibrary[category] = [];
    }
    
    // Check if item already exists to avoid duplicates
    if (!isItemInLibrary(category, itemId, itemType)) {
        const item = {
            id: itemId,
            type: itemType,
            dateAdded: new Date().toISOString(),
            ...additionalData
        };
        
        // Attempt to add title and poster if we can find it in the DOM
        const detailsSection = document.querySelector('#movie-details-content, #anime-details-content');
        if (detailsSection) {
            const titleElement = document.querySelector('#movie-main-title, #anime-main-title');
            const posterElement = document.querySelector('#movie-poster, #anime-poster');
            
            if (titleElement) item.title = titleElement.textContent;
            if (posterElement && posterElement.src) item.posterUrl = posterElement.src;
        }
        
        userLibrary[category].push(item);
    }
}

/**
 * Remove item from a library category
 */
function removeFromLibrary(category, itemId, itemType) {
    if (!userLibrary[category]) return;
    
    userLibrary[category] = userLibrary[category].filter(item => 
        !(item.id === itemId && item.type === itemType)
    );
}

/**
 * Check if an item exists in a library category
 */
function isItemInLibrary(category, itemId, itemType) {
    if (!userLibrary[category]) return false;
    
    return userLibrary[category].some(item => 
        item.id === itemId && item.type === itemType
    );
}

/**
 * Update button appearance based on state
 */
function updateButtonState(buttonElement, isActive) {
    if (!buttonElement) return;
    
    if (isActive) {
        buttonElement.classList.add('active');
        
        // Update icon if it exists
        const icon = buttonElement.querySelector('i');
        if (icon && icon.classList.contains('fa-heart-o')) {
            icon.classList.remove('fa-heart-o');
            icon.classList.add('fa-heart');
        } else if (icon && icon.classList.contains('fa-bookmark-o')) {
            icon.classList.remove('fa-bookmark-o');
            icon.classList.add('fa-bookmark');
        }
        
        // Update text if needed
        if (buttonElement.dataset.activeText) {
            const textSpan = buttonElement.querySelector('span');
            if (textSpan) textSpan.textContent = buttonElement.dataset.activeText;
        }
    } else {
        buttonElement.classList.remove('active');
        
        // Update icon if it exists
        const icon = buttonElement.querySelector('i');
        if (icon && icon.classList.contains('fa-heart')) {
            icon.classList.remove('fa-heart');
            icon.classList.add('fa-heart-o');
        } else if (icon && icon.classList.contains('fa-bookmark')) {
            icon.classList.remove('fa-bookmark');
            icon.classList.add('fa-bookmark-o');
        }
        
        // Update text if needed
        if (buttonElement.dataset.inactiveText) {
            const textSpan = buttonElement.querySelector('span');
            if (textSpan) textSpan.textContent = buttonElement.dataset.inactiveText;
        }
    }
}

/**
 * Update any UI components showing the library items
 */
function updateLibraryUI() {
    // Update favorites count if exists
    const favCountElements = document.querySelectorAll('.favorites-count');
    favCountElements.forEach(element => {
        element.textContent = userLibrary.favorites.length;
    });
    
    // Update watchlist count if exists
    const watchCountElements = document.querySelectorAll('.watchlist-count');
    watchCountElements.forEach(element => {
        element.textContent = userLibrary.watchLater.length;
    });
    
    // If we're on the library page, update content
    if (window.location.pathname.includes('my-library.html')) {
        renderLibraryPage();
    }
}

/**
 * Update progress indication UI
 */
function updateProgressUI(itemId, itemType, progressStatus) {
    // Find progress indicators for this item
    const progressIndicators = document.querySelectorAll(`.progress-indicator[data-id="${itemId}"][data-type="${itemType}"]`);
    
    progressIndicators.forEach(indicator => {
        // Clear existing status classes
        indicator.classList.remove('status-not-started', 'status-in-progress', 'status-completed');
        
        // Add new status class
        if (progressStatus === 'in-progress') {
            indicator.classList.add('status-in-progress');
            indicator.title = 'Đang xem';
        } else if (progressStatus === 'completed') {
            indicator.classList.add('status-completed');
            indicator.title = 'Đã xem xong';
        } else {
            indicator.classList.add('status-not-started');
            indicator.title = 'Chưa xem';
        }
    });
}

/**
 * Render content on the library page
 */
function renderLibraryPage() {
    // Favorites section
    renderLibrarySection('favorites-grid', userLibrary.favorites, 'Bạn chưa thêm mục yêu thích nào.');
    
    // Watch Later section
    renderLibrarySection('watchlist-grid', userLibrary.watchLater, 'Bạn chưa thêm mục nào vào danh sách Xem Sau.');
    
    // In Progress section
    renderLibrarySection('in-progress-grid', userLibrary.inProgress, 'Không có nội dung nào đang xem.');
    
    // Completed section
    renderLibrarySection('completed-grid', userLibrary.completed, 'Không có nội dung nào đã xem xong.');
}

/**
 * Render a specific library section
 */
function renderLibrarySection(containerId, items, emptyMessage) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = `<div class="empty-list-message">${emptyMessage}</div>`;
        return;
    }
    
    // Generate HTML for items
    let html = '';
    items.forEach(item => {
        const detailUrl = getDetailPageUrl(item.type, item.id);
        const posterUrl = item.posterUrl || 'https://placehold.co/300x450/1f1f1f/888888?text=No+Poster';
        const itemClass = item.type.includes('anime') ? 'anime-card' : 'movie-card';
        
        html += `
        <div class="${itemClass} library-item" data-id="${item.id}" data-type="${item.type}">
            <div class="movie-card-poster-container">
                <img src="${posterUrl}" alt="${item.title || 'No title'}" loading="lazy">
                <div class="card-overlay">
                    <div class="card-play-button">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <div class="library-item-actions">
                    <button class="library-remove-btn" onclick="removeLibraryItem('${containerId}', '${item.id}', '${item.type}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="card-info">
                <div>
                    <h3 class="card-title" title="${item.title || 'No title'}">${item.title || 'No title'}</h3>
                    <div class="card-meta">
                        <div class="card-type">
                            <i class="${item.type.includes('series') ? 'fas fa-tv' : 'fas fa-film'}"></i>
                            ${item.type.includes('anime') ? 'Anime' : (item.type.includes('series') ? 'Series' : 'Movie')}
                        </div>
                    </div>
                </div>
                <a href="${detailUrl}" class="view-details-link">Xem chi tiết</a>
            </div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Get the correct detail page URL based on item type
 */
function getDetailPageUrl(itemType, itemId) {
    if (itemType.includes('anime')) {
        return `pages/animeDetails.html?id=${itemId}&type=${itemType}`;
    } else if (itemType.includes('series')) {
        return `pages/filmDetails_phimBo.html?id=${itemId}&type=${itemType}`;
    } else {
        return `pages/filmDetail.html?id=${itemId}&type=${itemType}`;
    }
}

/**
 * Remove item from library section
 * This function is called directly from onclick in the rendered HTML
 */
function removeLibraryItem(sectionId, itemId, itemType) {
    // Determine which category based on section ID
    let category;
    if (sectionId === 'favorites-grid') category = 'favorites';
    else if (sectionId === 'watchlist-grid') category = 'watchLater';
    else if (sectionId === 'in-progress-grid') category = 'inProgress';
    else if (sectionId === 'completed-grid') category = 'completed';
    
    if (!category) return;
    
    // Remove item
    removeFromLibrary(category, itemId, itemType);
    
    // Save changes
    saveLibraryToStorage();
    
    // Re-render the section
    renderLibrarySection(sectionId, userLibrary[category], getEmptyMessageForCategory(category));
    
    // Show notification
    showNotification(`Removed from ${category}`, 'info');
    
    // Update counts
    updateLibraryUI();
}

/**
 * Get appropriate empty message for a category
 */
function getEmptyMessageForCategory(category) {
    switch(category) {
        case 'favorites': return 'Bạn chưa thêm mục yêu thích nào.';
        case 'watchLater': return 'Bạn chưa thêm mục nào vào danh sách Xem Sau.';
        case 'inProgress': return 'Không có nội dung nào đang xem.';
        case 'completed': return 'Không có nội dung nào đã xem xong.';
        default: return 'Không có nội dung nào.';
    }
}

/**
 * Show notification to the user
 */
function showNotification(message, type = 'info') {
    // Check if notification container exists, create if not
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.bottom = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '9999';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        </div>
        <div class="notification-message">${message}</div>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

/**
 * Animate heart icon when adding to favorites
 */
function animateHeartIcon(buttonElement) {
    const icon = buttonElement.querySelector('i.fa-heart');
    if (!icon) return;
    
    // Add animation class
    icon.classList.add('heart-pulse');
    
    // Remove class after animation is done
    setTimeout(() => {
        icon.classList.remove('heart-pulse');
    }, 600);
}

// Expose functions that need to be called from HTML
window.removeLibraryItem = removeLibraryItem;
window.toggleFavoriteStatus = toggleFavoriteStatus;
window.toggleWatchlistStatus = toggleWatchlistStatus;
window.setWatchingProgress = setWatchingProgress; 