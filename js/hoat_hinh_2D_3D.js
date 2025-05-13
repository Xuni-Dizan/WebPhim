// hoat_hinh_2D_3D.js - JavaScript for the 2D/3D Films Page
// v1.6: Improved data loading error handling, added default format for anime items,
//       and enhanced logging for debugging.

// --- START: Basic Page Functionality (Copied from previous version - no change needed here) ---
const footerYearSpanPage = document.getElementById('footer-year');
if (footerYearSpanPage) {
    footerYearSpanPage.textContent = new Date().getFullYear();
}
const scrollToTopButtonPage = document.getElementById('scroll-to-top');
if (scrollToTopButtonPage) {
    const handleScrollPage = () => {
        const isVisible = window.scrollY > 300;
        scrollToTopButtonPage.classList.toggle('visible', isVisible);
        scrollToTopButtonPage.classList.toggle('hidden', !isVisible);
        scrollToTopButtonPage.setAttribute('aria-hidden', String(!isVisible));
    };
    const scrollToTopPage = (event) => {
        event.preventDefault(); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('scroll', handleScrollPage);
    scrollToTopButtonPage.addEventListener('click', scrollToTopPage);
    handleScrollPage(); 
}
// Mobile Menu Toggle is handled by inline script in hoat_hinh_2D_3D.html
// --- END: Basic Page Functionality ---


// --- START: JavaScript for 2D/3D Page with Filters & Search Suggestions ---
document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('grid-container');
    const loadingIndicator = document.getElementById('loading-films');
    const noResultsIndicator = document.getElementById('no-films-found');
    const heroSection = document.getElementById('hero-section-2d3d');
    const heroTitle = document.getElementById('hero-title-2d3d');
    const heroDescription = document.getElementById('hero-description-2d3d');
    const dimensionFilter = document.getElementById('dimension-filter');
    const typeFilter = document.getElementById('type-filter-2d3d');
    const sortFilter = document.getElementById('sort-filter-2d3d');
    const gridTitle = document.getElementById('grid-title-2d3d');
    
    // Search elements are handled by the inline script in hoat_hinh_2D_3D.html
    // We will interact with window.currentFilters for search term

    let allFetchedItems = []; 
    window.allFetchedItems = allFetchedItems; // Expose for inline script
    
    window.currentFilters = { // Expose for inline script and this script
        dimension: 'all', 
        type: 'all',      
        sort: 'default',
        search: ''        
    };

    const createItemCard = (item) => {
        let detailPageUrl = '#';
        const itemType = item.itemType; 
        if (itemType === 'anime-series' || itemType === 'anime-movie') {
            detailPageUrl = `animeDetails.html?id=${item.id}&type=${itemType}`;
        } else if (itemType === 'series') {
            detailPageUrl = `filmDetails_phimBo.html?id=${item.id}&type=series`;
        } else { 
            detailPageUrl = `filmDetail.html?id=${item.id}&type=movies`;
        }
        const altText = `Poster ${itemType.includes('anime') ? 'Anime' : (itemType === 'movies' ? 'phim' : 'phim bộ')} ${item.title || 'không có tiêu đề'}, năm ${item.releaseYear || 'không rõ'}`;
        let badgesHTML = '';
        const format = item.format || []; 
        let formatBadgeText = '';
        let formatBadgeClass = '';
        if (format.includes("3D")) {
            formatBadgeText = '3D';
            formatBadgeClass = 'format-badge-3d'; 
        } else if (format.includes("2D")) {
            formatBadgeText = '2D';
            formatBadgeClass = 'format-badge-2d'; 
        }
        if (formatBadgeText) {
            badgesHTML += `<span class="absolute top-2 left-2 ${formatBadgeClass} text-white text-xs font-semibold px-2 py-1 rounded shadow-md z-10">${formatBadgeText}</span>`;
        }
        if (itemType === 'series' || itemType === 'anime-series') {
            badgesHTML += `<span class="absolute top-2 right-2 series-badge text-white text-xs font-semibold px-2 py-1 rounded shadow-md z-10">Bộ</span>`;
        } else if (itemType === 'anime-movie') {
             badgesHTML += `<span class="absolute top-2 right-2 bg-purple-600 text-white text-xs font-semibold px-2 py-1 rounded shadow-md z-10">Anime Movie</span>`;
        } else if (itemType === 'movies') {
             badgesHTML += `<span class="absolute top-2 right-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded shadow-md z-10">Lẻ</span>`;
        }
        const posterUrl = item.posterUrl || '../https://placehold.co/300x450/111111/eeeeee?text=No+Poster';
        const titleText = item.title || 'Không có tiêu đề';
        const yearText = item.releaseYear || 'N/A';
        const displayTitle = window.currentFilters.search && typeof SearchUtils !== 'undefined' ? SearchUtils.highlightTerm(titleText, window.currentFilters.search) : titleText;

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

      const updateHeroUI = (item) => {
          if (!heroSection) return;
          if (!item) {
              heroSection.style.backgroundImage = `url('../https://placehold.co/1920x500/141414/333333?text=No+Featured+Item')`;
              if (heroTitle) heroTitle.textContent = "Không có phim nổi bật";
              if (heroDescription) heroDescription.textContent = "Khám phá danh sách phim 2D và 3D.";
              heroSection.setAttribute('aria-label', 'Không có phim nổi bật');
              const heroPlayButton = heroSection.querySelector('#hero-play-button'); // Assuming these buttons might be part of hero-2d3d
              const heroDetailButton = heroSection.querySelector('#hero-detail-button');
              if (heroPlayButton) heroPlayButton.style.display = 'none';
              if (heroDetailButton) heroDetailButton.style.display = 'none';
              return;
          }
          const backgroundImageUrl = item.heroImage || item.posterUrl || '../https://placehold.co/1920x500/141414/333333?text=Image+Error';
          heroSection.style.backgroundImage = `url('${backgroundImageUrl}')`;
          heroSection.setAttribute('aria-label', `Phim nổi bật: ${item.title || 'Đang tải'}`);
          if (heroTitle) heroTitle.textContent = item.title || 'Đang tải...';
          if (heroDescription) {
              const shortDesc = item.description ? (item.description.length > 150 ? item.description.substring(0, 150) + '...' : item.description) : 'Khám phá thế giới 2D và 3D sống động.';
              heroDescription.textContent = shortDesc;
          }
          // Buttons in hero-2d3d might not exist or have different IDs. If they do, update them.
          // For now, this function primarily updates background and text.
      };

    const applyFiltersAndRender = () => {
        if (!gridContainer) return;
        if (window.allFetchedItems.length > 0) {
             if (loadingIndicator) loadingIndicator.classList.add('hidden'); 
        } else {
             if (loadingIndicator) loadingIndicator.classList.remove('hidden'); 
        }
        if (noResultsIndicator) noResultsIndicator.classList.add('hidden'); 
        gridContainer.innerHTML = ''; 

        let itemsToDisplay = [...window.allFetchedItems]; 
        let titlePrefix = "Danh Sách Phim 2D/3D";
        let filterDescriptions = []; 

        if (window.currentFilters.search) {
            const searchTerm = window.currentFilters.search.trim().toLowerCase(); 
            itemsToDisplay = itemsToDisplay.filter(item =>
                item.title && item.title.toLowerCase().includes(searchTerm)
            );
            titlePrefix = `Kết quả tìm kiếm cho "${window.currentFilters.search}"`;
        }

        if (window.currentFilters.dimension === '2D') {
            itemsToDisplay = itemsToDisplay.filter(item => Array.isArray(item.format) && item.format.includes('2D') && !item.format.includes('3D'));
            if (!window.currentFilters.search) filterDescriptions.push("Chỉ 2D"); 
        } else if (window.currentFilters.dimension === '3D') {
            itemsToDisplay = itemsToDisplay.filter(item => Array.isArray(item.format) && item.format.includes('3D'));
            if (!window.currentFilters.search) filterDescriptions.push("Chỉ 3D"); 
        }
        
        if (window.currentFilters.type === 'movies') {
            itemsToDisplay = itemsToDisplay.filter(item => item.itemType === 'movies' || item.itemType === 'anime-movie');
            if (!window.currentFilters.search) filterDescriptions.push("Phim lẻ"); 
        } else if (window.currentFilters.type === 'series') {
            itemsToDisplay = itemsToDisplay.filter(item => item.itemType === 'series' || item.itemType === 'anime-series');
            if (!window.currentFilters.search) filterDescriptions.push("Phim bộ"); 
        }
        
        switch (window.currentFilters.sort) {
            case 'newest': itemsToDisplay.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0)); break;
            case 'rating_desc': itemsToDisplay.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
            case 'rating_asc': itemsToDisplay.sort((a, b) => (a.rating || 0) - (b.rating || 0)); break;
            case 'title_asc': itemsToDisplay.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
            case 'title_desc': itemsToDisplay.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
        }

        if (gridTitle) {
            gridTitle.textContent = filterDescriptions.length > 0 ? `${titlePrefix} (${filterDescriptions.join(', ')})` : titlePrefix;
        }
        console.log(`[2D/3D Page] Displaying ${itemsToDisplay.length} items after filtering. Search: "${window.currentFilters.search}", Dimension: ${window.currentFilters.dimension}, Type: ${window.currentFilters.type}`);

        if (loadingIndicator) loadingIndicator.classList.add('hidden'); 
        if (itemsToDisplay.length > 0) {
            gridContainer.innerHTML = itemsToDisplay.map(item => createItemCard(item)).join('');
        } else {
            if (noResultsIndicator) {
                noResultsIndicator.textContent = window.currentFilters.search
                    ? `Không tìm thấy kết quả nào cho "${window.currentFilters.search}".`
                    : "Không tìm thấy phim nào phù hợp với bộ lọc.";
                noResultsIndicator.classList.remove('hidden');
            }
            gridContainer.innerHTML = ''; 
        }
    };
    window.applyFiltersAndRender = applyFiltersAndRender; // Expose for inline script

    const loadAndDisplayFilms = async () => {
        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
        if (noResultsIndicator) noResultsIndicator.classList.add('hidden');
        const initialSkeletonsHTML = Array(12).fill(`
            <div class="movie-card-skeleton">
                <div class="skeleton skeleton-image"></div><div class="p-3"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div></div>
            </div>
        `).join('');
        if (gridContainer) gridContainer.innerHTML = initialSkeletonsHTML;

        console.log("--- [2D/3D Page] Starting data load ---");

        try {
            const fetchData = async (url, typeName) => {
                console.log(`[2D/3D Page] Fetching ${typeName} from ${url}`);
                const response = await fetch(url);
                if (!response.ok) {
                    console.error(`[2D/3D Page] HTTP error! Status: ${response.status} while fetching ${typeName} from ${url}`);
                    // Return empty array but log error, allowing other fetches to proceed
                    return []; 
                }
                try {
                    return await response.json();
                } catch (jsonError) {
                    console.error(`[2D/3D Page] Error parsing JSON for ${typeName} from ${url}:`, jsonError);
                    return []; // Return empty on JSON parse error
                }
            };

            const [moviesData, seriesData, animeData] = await Promise.all([
                fetchData('../json/filmData.json', 'Movies'),
                fetchData('../json/filmData_phimBo.json', 'Series'),
                fetchData('../json/animeData.json', 'Anime')
            ]);

            console.log(`[2D/3D Page] Fetched Movies: ${moviesData.length}, Series: ${seriesData.length}, Anime: ${animeData.length}`);

            const allItems = [];
            allItems.push(...(moviesData || []).map(item => ({ ...item, itemType: item.itemType || 'movies' })));
            allItems.push(...(seriesData || []).map(item => ({ ...item, itemType: item.itemType || 'series' })));
            // For Anime, if format is missing, add a default to make them eligible for 2D/3D page
            allItems.push(...(animeData || []).map(item => ({ 
                ...item, 
                itemType: item.itemType || (item.episodes === null ? 'anime-movie' : 'anime-series'), // Determine anime type
                format: item.format || ["Animation", "2D"] // Add default format if missing
            })));
            
            console.log("[2D/3D Page] Total items before 2D/3D filter:", allItems.length);

            window.allFetchedItems = allItems.filter(item => {
                const is2D3D = Array.isArray(item.format) && (item.format.includes('2D') || item.format.includes('3D'));
                // if (!is2D3D) {
                //     console.log("[2D/3D Page] Filtering out item (no 2D/3D format):", item.title, item.format);
                // }
                return is2D3D;
            });

            console.log(`[2D/3D Page] Items after 2D/3D filter: ${window.allFetchedItems.length}`);
            if (window.allFetchedItems.length === 0) {
                console.warn("[2D/3D Page] No items have '2D' or '3D' in their 'format' array. The grid will be empty. Check your JSON data's 'format' field.");
            }


            if (window.allFetchedItems.length > 0) {
                const heroItem = window.allFetchedItems.find(item => item.heroImage) || window.allFetchedItems[0];
                updateHeroUI(heroItem);
            } else {
                 updateHeroUI(null); 
            }

            const skeletons = gridContainer?.querySelectorAll('.movie-card-skeleton');
            skeletons?.forEach(skeleton => skeleton.remove());
            applyFiltersAndRender(); 

            dimensionFilter?.addEventListener('change', (e) => {
                window.currentFilters.dimension = e.target.value;
                applyFiltersAndRender();
            });
            typeFilter?.addEventListener('change', (e) => {
                window.currentFilters.type = e.target.value;
                applyFiltersAndRender();
            });
            sortFilter?.addEventListener('change', (e) => {
                window.currentFilters.sort = e.target.value;
                applyFiltersAndRender();
            });
            // Search listeners are in the inline script

        } catch (error) {
            console.error('[2D/3D Page] Error loading and displaying films:', error);
            const errorSkeletons = gridContainer?.querySelectorAll('.movie-card-skeleton');
            errorSkeletons?.forEach(skeleton => skeleton.remove());
            if (noResultsIndicator) {
                noResultsIndicator.textContent = `Đã xảy ra lỗi khi tải phim (${error.message || 'Lỗi không xác định'}). Vui lòng thử lại sau.`;
                noResultsIndicator.classList.remove('hidden');
            }
            if (gridContainer) gridContainer.innerHTML = ''; 
            updateHeroUI(null); 
        } finally {
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            console.log("--- [2D/3D Page] Data loading process finished ---");
        }
    };

    loadAndDisplayFilms();
});
// --- END: JavaScript for 2D/3D Page ---