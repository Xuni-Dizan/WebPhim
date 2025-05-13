/**
 * favorites.js - Handles user favorites and watchlist functionality
 * This script manages saving/loading from localStorage, UI updates, and interactions
 * v1.1: Updated selectors to use js-prefixed classes for buttons.
 *       Ensured itemType is correctly handled when adding to library.
 */

// Store favorites data in a structured way
const userLibrary = {
    favorites: [],
    watchLater: [],
    inProgress: [], // Items user is currently watching
    completed: []   // Items user has finished watching
};

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    loadLibraryFromStorage();
    initializeFavoriteButtons();
    initializeWatchlistButtons();
    // updateLibraryUI(); // Call this if you have a UI element that shows counts immediately
});

/**
 * Load library data from localStorage
 */
function loadLibraryFromStorage() {
    try {
        const savedFavorites = localStorage.getItem('user_library_favorites');
        const savedWatchLater = localStorage.getItem('user_library_watchLater');
        const savedInProgress = localStorage.getItem('user_library_inProgress');
        const savedCompleted = localStorage.getItem('user_library_completed');
        
        if (savedFavorites) userLibrary.favorites = JSON.parse(savedFavorites);
        if (savedWatchLater) userLibrary.watchLater = JSON.parse(savedWatchLater);
        if (savedInProgress) userLibrary.inProgress = JSON.parse(savedInProgress);
        if (savedCompleted) userLibrary.completed = JSON.parse(savedCompleted);
        
        console.log('User library loaded from storage:', userLibrary);
    } catch (error) {
        console.error('Error loading library data from localStorage:', error);
    }
}

/**
 * Save current library data to localStorage
 */
function saveLibraryToStorage() {
    try {
        localStorage.setItem('user_library_favorites', JSON.stringify(userLibrary.favorites));
        localStorage.setItem('user_library_watchLater', JSON.stringify(userLibrary.watchLater));
        localStorage.setItem('user_library_inProgress', JSON.stringify(userLibrary.inProgress));
        localStorage.setItem('user_library_completed', JSON.stringify(userLibrary.completed));
        console.log('User library saved to storage.');
    } catch (error) {
        console.error('Error saving library data to localStorage:', error);
        showNotification('Lỗi khi lưu thay đổi. Vui lòng thử lại.', 'error');
    }
}

/**
 * Initialize favorite button interactions using a common class
 */
function initializeFavoriteButtons() {
    const favoriteButtons = document.querySelectorAll('.js-favorite-btn'); // Use common JS class
    
    favoriteButtons.forEach(button => {
        const itemId = button.dataset.id;
        const itemType = button.dataset.type; // Ensure this is set by detail page JS
        
        if (!itemId || !itemType) {
            // console.warn('Favorite button missing data-id or data-type:', button);
            return;
        }
        
        const isFavorite = isItemInLibrary('favorites', itemId, itemType);
        updateButtonState(button, isFavorite, 'Yêu Thích', 'Đã Thích', 'fa-heart');
        
        button.removeEventListener('click', handleFavoriteClick); // Remove previous if any
        button.addEventListener('click', handleFavoriteClick);
    });
}
// Expose for dynamic content loading (e.g., after detail page JS sets data-id)
window.initializeFavoriteButtons = initializeFavoriteButtons;

function handleFavoriteClick(e) {
    e.preventDefault();
    const button = e.currentTarget;
    const itemId = button.dataset.id;
    const itemType = button.dataset.type;
    if (!itemId || !itemType) return;
    toggleFavoriteStatus(itemId, itemType, button);
}


/**
 * Initialize watchlist button interactions using a common class
 */
function initializeWatchlistButtons() {
    const watchlistButtons = document.querySelectorAll('.js-watchlist-btn'); // Use common JS class
    
    watchlistButtons.forEach(button => {
        const itemId = button.dataset.id;
        const itemType = button.dataset.type; 
        
        if (!itemId || !itemType) {
            // console.warn('Watchlist button missing data-id or data-type:', button);
            return;
        }
        
        const isInWatchlist = isItemInLibrary('watchLater', itemId, itemType);
        updateButtonState(button, isInWatchlist, 'Xem Sau', 'Đã Lưu', 'fa-bookmark');
        
        button.removeEventListener('click', handleWatchlistClick); // Remove previous if any
        button.addEventListener('click', handleWatchlistClick);
    });
}
window.initializeWatchlistButtons = initializeWatchlistButtons;

function handleWatchlistClick(e) {
    e.preventDefault();
    const button = e.currentTarget;
    const itemId = button.dataset.id;
    const itemType = button.dataset.type;
    if (!itemId || !itemType) return;
    toggleWatchlistStatus(itemId, itemType, button);
}


/**
 * Toggle favorite status for an item
 */
function toggleFavoriteStatus(itemId, itemType, buttonElement) {
    const isFavorite = isItemInLibrary('favorites', itemId, itemType);
    
    if (isFavorite) {
        removeFromLibrary('favorites', itemId, itemType);
        updateButtonState(buttonElement, false, 'Yêu Thích', 'Đã Thích', 'fa-heart');
        showNotification('Đã xóa khỏi danh sách Yêu thích', 'info');
    } else {
        const itemData = getItemDataFromPage(itemId, itemType); // Get title/poster
        addToLibrary('favorites', itemId, itemType, itemData);
        updateButtonState(buttonElement, true, 'Yêu Thích', 'Đã Thích', 'fa-heart');
        showNotification('Đã thêm vào Yêu thích!', 'success');
        animateHeartIcon(buttonElement);
    }
    saveLibraryToStorage();
    updateLibraryUI(); // Update any UI that displays counts, etc.
}

/**
 * Toggle watchlist status for an item
 */
function toggleWatchlistStatus(itemId, itemType, buttonElement) {
    const isInWatchlist = isItemInLibrary('watchLater', itemId, itemType);
    
    if (isInWatchlist) {
        removeFromLibrary('watchLater', itemId, itemType);
        updateButtonState(buttonElement, false, 'Xem Sau', 'Đã Lưu', 'fa-bookmark');
        showNotification('Đã xóa khỏi danh sách Xem Sau', 'info');
    } else {
        const itemData = getItemDataFromPage(itemId, itemType); // Get title/poster
        addToLibrary('watchLater', itemId, itemType, itemData);
        updateButtonState(buttonElement, true, 'Xem Sau', 'Đã Lưu', 'fa-bookmark');
        showNotification('Đã thêm vào Xem Sau!', 'success');
    }
    saveLibraryToStorage();
    updateLibraryUI();
}

/**
 * Helper to get item title and poster from the current page (detail pages)
 */
function getItemDataFromPage(itemId, itemType) {
    const data = {};
    let titleSelector, posterSelector;

    if (itemType.includes('anime')) {
        titleSelector = '#anime-main-title';
        posterSelector = '#anime-poster';
    } else if (itemType === 'series') {
        titleSelector = '#series-main-title';
        posterSelector = '#series-poster';
    } else { // movies
        titleSelector = '#movie-title'; // Assuming movie details page has this ID for main title
        posterSelector = '#movie-poster';
    }

    const titleElement = document.querySelector(titleSelector);
    const posterElement = document.querySelector(posterSelector);

    if (titleElement) data.title = titleElement.textContent.trim();
    if (posterElement) data.posterUrl = posterElement.src;
    
    return data;
}


/**
 * Add item to a library category
 */
function addToLibrary(category, itemId, itemType, additionalData = {}) {
    if (!userLibrary[category]) userLibrary[category] = [];
    if (!isItemInLibrary(category, itemId, itemType)) {
        userLibrary[category].push({
            id: itemId,
            type: itemType, // e.g., "movies", "series", "anime-movie", "anime-series"
            dateAdded: new Date().toISOString(),
            ...additionalData // This will include title and posterUrl if fetched
        });
    }
}

/**
 * Remove item from a library category
 */
function removeFromLibrary(category, itemId, itemType) {
    if (!userLibrary[category]) return;
    userLibrary[category] = userLibrary[category].filter(item => 
        !(String(item.id) === String(itemId) && item.type === itemType) // Ensure ID comparison is robust
    );
}

/**
 * Check if an item exists in a library category
 */
function isItemInLibrary(category, itemId, itemType) {
    if (!userLibrary[category]) return false;
    return userLibrary[category].some(item => 
        String(item.id) === String(itemId) && item.type === itemType
    );
}

/**
 * Update button appearance and ARIA attributes based on state
 */
function updateButtonState(buttonElement, isActive, inactiveText, activeText, iconBaseClass) {
    if (!buttonElement) return;
    
    const icon = buttonElement.querySelector('i.fas, i.far'); // Select Font Awesome solid or regular icons
    const textSpan = buttonElement.childNodes[1] && buttonElement.childNodes[1].nodeType === Node.TEXT_NODE 
                     ? buttonElement.childNodes[1] // Text node directly after icon
                     : (buttonElement.querySelector('span') || buttonElement); // Or find a span or use button itself

    if (isActive) {
        buttonElement.classList.add('active'); // General active class for potential global styling
        buttonElement.setAttribute('aria-pressed', 'true');
        if (textSpan && activeText) {
            // If textSpan is the button itself and contains an icon, we need to be careful
            if (textSpan === buttonElement && icon) {
                 buttonElement.innerHTML = `<i class="fas ${iconBaseClass} mr-1"></i> ${activeText}`;
            } else if (textSpan.nodeType === Node.TEXT_NODE) {
                 textSpan.textContent = ` ${activeText}`; // Add space if it's a direct text node
            } else {
                textSpan.textContent = activeText;
            }
        }
        if (icon) {
            icon.classList.remove(`fa-regular`, `far`); // Remove regular/outline style
            icon.classList.add(`fa-solid`, `fas`);   // Add solid style
            // Specific class changes for heart/bookmark
            if (iconBaseClass === 'fa-heart') icon.classList.replace('fa-heart-o', 'fa-heart'); // Deprecated -o
            if (iconBaseClass === 'fa-bookmark') icon.classList.replace('fa-bookmark-o', 'fa-bookmark'); // Deprecated -o
        }
        // For primary buttons, toggle between primary and a "deactivated" or secondary style
        if (buttonElement.classList.contains('button-primary') || buttonElement.classList.contains('action-button-anime')) {
            buttonElement.classList.remove('button-primary', 'action-button-anime');
            buttonElement.classList.add('button-secondary'); // Or a specific "active-favorite" class
        }

    } else {
        buttonElement.classList.remove('active');
        buttonElement.setAttribute('aria-pressed', 'false');
        if (textSpan && inactiveText) {
             if (textSpan === buttonElement && icon) {
                 buttonElement.innerHTML = `<i class="far ${iconBaseClass} mr-1"></i> ${inactiveText}`;
             } else if (textSpan.nodeType === Node.TEXT_NODE) {
                 textSpan.textContent = ` ${inactiveText}`;
             } else {
                textSpan.textContent = inactiveText;
            }
        }
        if (icon) {
            icon.classList.remove(`fa-solid`, `fas`);
            icon.classList.add(`fa-regular`, `far`);
             if (iconBaseClass === 'fa-heart') icon.classList.replace('fa-heart', 'fa-heart-o');
             if (iconBaseClass === 'fa-bookmark') icon.classList.replace('fa-bookmark', 'fa-bookmark-o');
        }
        // Revert to primary style if it was changed
        if (buttonElement.classList.contains('button-secondary') && 
            (buttonElement.classList.contains('js-favorite-btn'))) { // Check if it should be primary
            buttonElement.classList.remove('button-secondary');
            // Add back original primary class (e.g. 'button-primary' or 'action-button-anime')
            // This part needs to know the original primary class. A data attribute could store it.
            // For now, assuming 'button-primary' as a default if it's not an anime button
            if (buttonElement.classList.contains('favorite-button') && !buttonElement.classList.contains('action-button-anime')) {
                 buttonElement.classList.add('button-primary');
            } else if (buttonElement.classList.contains('favorite-button') && buttonElement.classList.contains('action-button-anime')) {
                 buttonElement.classList.add('action-button-anime');
            }
        }
    }
}


/**
 * Update any UI components showing the library items (e.g., counts)
 */
function updateLibraryUI() {
    const favCountElements = document.querySelectorAll('.favorites-count');
    favCountElements.forEach(element => {
        element.textContent = userLibrary.favorites.length;
    });
    
    const watchCountElements = document.querySelectorAll('.watchlist-count');
    watchCountElements.forEach(element => {
        element.textContent = userLibrary.watchLater.length;
    });
    
    // If on a dedicated library page, re-render it
    // Example: if (document.getElementById('my-library-page-container')) renderMyLibraryPage();
}

/**
 * Show notification to the user
 */
function showNotification(message, type = 'info') { // success, error, info
    let notificationContainer = document.getElementById('flick-notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'flick-notification-container';
        // Style the container (append to body or a specific wrapper)
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.bottom = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '10000'; // High z-index
        notificationContainer.style.display = 'flex';
        notificationContainer.style.flexDirection = 'column';
        notificationContainer.style.gap = '10px';
        document.body.appendChild(notificationContainer);
    }

    const notification = document.createElement('div');
    notification.className = `flick-notification flick-notification-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    else if (type === 'error') iconClass = 'fa-exclamation-triangle';

    notification.innerHTML = `
        <i class="fas ${iconClass} notification-icon"></i>
        <span class="notification-message">${message}</span>
        <button class="notification-close-btn">×</button>
    `;
    
    // Basic styling for notification (can be moved to CSS)
    notification.style.padding = '12px 18px';
    notification.style.borderRadius = 'var(--border-radius-md, 8px)';
    notification.style.color = 'white';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.gap = '10px';
    notification.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    if (type === 'success') notification.style.backgroundColor = 'rgba(76, 175, 80, 0.9)'; // Green
    else if (type === 'error') notification.style.backgroundColor = 'rgba(244, 67, 54, 0.9)'; // Red
    else notification.style.backgroundColor = 'rgba(33, 150, 243, 0.9)'; // Blue for info

    notification.querySelector('.notification-icon').style.fontSize = '1.2em';
    notification.querySelector('.notification-close-btn').style.background = 'none';
    notification.querySelector('.notification-close-btn').style.border = 'none';
    notification.querySelector('.notification-close-btn').style.color = 'white';
    notification.querySelector('.notification-close-btn').style.marginLeft = 'auto';
    notification.querySelector('.notification-close-btn').style.fontSize = '1.2em';
    notification.querySelector('.notification-close-btn').style.cursor = 'pointer';
    notification.querySelector('.notification-close-btn').style.lineHeight = '1';


    notification.querySelector('.notification-close-btn').onclick = () => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    };

    notificationContainer.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);

    // Auto-dismiss
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3500); // Dismiss after 3.5 seconds
}


/**
 * Animate heart icon when adding to favorites
 */
function animateHeartIcon(buttonElement) {
    const icon = buttonElement.querySelector('i.fas.fa-heart'); // Target solid heart
    if (!icon) return;
    
    icon.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    icon.style.transform = 'scale(1.3)';
    
    setTimeout(() => {
        icon.style.transform = 'scale(1)';
    }, 300);
}

// Expose functions to be callable from HTML (e.g., if dynamically adding buttons)
// window.toggleFavoriteStatus = toggleFavoriteStatus;
// window.toggleWatchlistStatus = toggleWatchlistStatus;

console.log("favorites.js loaded (v1.1)");