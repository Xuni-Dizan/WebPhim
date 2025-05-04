// filmDetails_phimBo.js - Handles Series Details Page Logic
// v1.4: Updated to fetch all data types (movies, series, anime) for comprehensive related content.

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const seriesDetailsContent = document.getElementById('series-details-content');
    const seriesDetailsSkeleton = document.getElementById('series-details-skeleton');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessageContainer = document.getElementById('error-message');
    const errorTextElement = document.getElementById('error-text');
    const seriesTitlePlayer = document.getElementById('series-title-player');
    const videoPlayerContainer = document.getElementById('video-player-container');
    const videoMessageContainer = document.getElementById('video-message');
    const seriesPoster = document.getElementById('series-poster');
    const seriesMainTitle = document.getElementById('series-main-title');
    const seriesYear = document.getElementById('series-year');
    const seriesGenre = document.getElementById('series-genre');
    const seriesRating = document.getElementById('series-rating');
    const seriesStatus = document.getElementById('series-status');
    const seriesDescription = document.getElementById('series-description');
    const seriesDirector = document.getElementById('series-director');
    const seriesCast = document.getElementById('series-cast');
    const seriesSeasonsCount = document.getElementById('series-seasons-count');
    const seriesEpisodesCount = document.getElementById('series-episodes-count');
    const relatedContentGrid = document.getElementById('related-content-grid'); // Updated ID
    const scrollToTopButton = document.getElementById('scroll-to-top');
    const versionSelectionContainer = document.getElementById('version-selection');
    const versionButtons = versionSelectionContainer ? versionSelectionContainer.querySelectorAll('.version-button') : [];
    const toggleLightsButton = document.getElementById('toggle-lights-button');
    const toggleLightsText = document.getElementById('toggle-lights-text');
    const playerSection = document.getElementById('player-section');
    const relatedContentSection = document.querySelector('#related-content-heading')?.closest('section');

    // --- Series Specific Elements ---
    const seriesContentSection = document.getElementById('series-content-section'); // Container for season/episode selectors
    const seasonSelectorContainer = document.getElementById('season-selector-container');
    const episodeSelectorContainer = document.getElementById('episode-selector-container'); // Optional dropdown
    const episodeListContainer = document.getElementById('episode-list-container'); // Container for episode buttons
    const seasonSelect = document.getElementById('season-select');
    const episodeSelect = document.getElementById('episode-select'); // Optional dropdown
    const seriesSpecificInfo = document.getElementById('series-specific-info'); // Div containing season/episode counts


    // --- Player Elements ---
    const videoPosterImage = document.getElementById('video-poster-image');
    const videoPosterOverlay = document.getElementById('video-poster-overlay');
    const videoPlayButton = document.getElementById('video-play-button');
    const videoIframePlaceholder = document.getElementById('video-iframe-placeholder');
    const youtubePlayerDivId = 'youtube-player';

    // --- Skip Intro Button Element ---
    const skipIntroButton = document.getElementById('skip-intro-button');

    // --- Meta Tag Elements (Keep as before) ---
    const pageTitleElement = document.querySelector('title');
    const metaDescriptionTag = document.querySelector('meta[name="description"]');
    const metaKeywordsTag = document.querySelector('meta[name="keywords"]');
    const ogTypeTag = document.querySelector('meta[property="og:type"]');
    const ogUrlTag = document.querySelector('meta[property="og:url"]');
    const ogTitleTag = document.querySelector('meta[property="og:title"]');
    const ogDescriptionTag = document.querySelector('meta[property="og:description"]');
    const ogImageTag = document.querySelector('meta[property="og:image"]');
    const ogSiteNameTag = document.querySelector('meta[property="og:site_name"]');
    const ogVideoDirectorTag = document.querySelector('meta[property="video:director"]');
    const ogVideoActorTag = document.querySelector('meta[property="video:actor"]');
    const ogVideoReleaseDateTag = document.querySelector('meta[property="video:release_date"]');
    const twitterCardTag = document.querySelector('meta[property="twitter:card"]');
    const twitterUrlTag = document.querySelector('meta[property="twitter:url"]');
    const twitterTitleTag = document.querySelector('meta[property="twitter:title"]');
    const twitterDescriptionTag = document.querySelector('meta[property="twitter:description"]');
    const twitterImageTag = document.querySelector('meta[property="twitter:image"]');

    // --- State Variables ---
    let allMoviesData = []; // Stores fetched movie data
    let allSeriesData = []; // Stores fetched series data
    let allAnimeData = []; // Stores fetched anime data
    let currentSeriesData = null; // Data for the current series being viewed
    let currentSelectedSeasonIndex = 0;
    let currentSelectedEpisodeIndex = 0;
    let currentActiveVersion = null;
    let currentVideoUrl = null;
    let observer;
    let youtubePlayer = null;
    let ytApiReady = false;

    // --- Helper Functions ---
    const getQueryParam = (param) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    };

    const showVideoMessage = (message, isError = false, isInfo = false) => {
        if (!videoMessageContainer) return;
        videoMessageContainer.innerHTML = message;
        videoMessageContainer.classList.remove('hidden', 'error-message', 'info-message');
        if (isError) videoMessageContainer.classList.add('error-message');
        else if (isInfo) videoMessageContainer.classList.add('info-message');
    };

    const hideVideoMessage = () => {
        if (videoMessageContainer) {
            videoMessageContainer.classList.add('hidden');
            videoMessageContainer.innerHTML = '';
        }
    };

    const getYouTubeVideoId = (url) => {
         if (!url || typeof url !== 'string') return null;
         let videoId = null;
         try {
             const patterns = [
                 /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/,
                 /(?:https?:\/\/)?googleusercontent\.com\/youtube\.com\/([\w-]+)(?:\?.*)?$/,
             ];
             for (const pattern of patterns) {
                 const match = url.match(pattern);
                 if (match && match[1] && /^[\w-]{11}$/.test(match[1])) { videoId = match[1]; break; }
             }
         } catch (e) { console.error("Lỗi phân tích URL YouTube (phim bộ):", e, url); }
         return videoId;
    };

    const getGoogleDriveEmbedUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        let embedUrl = null;
        try {
            const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
            if (match && match[1]) { embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`; }
        } catch (e) { console.error("Lỗi phân tích URL Google Drive (phim bộ):", e, url); }
        if (embedUrl) console.warn("Nhúng Google Drive có thể yêu cầu quyền chia sẻ cụ thể.");
        return embedUrl;
    };

    const setPlayerPoster = (episode = null) => {
        const episodeThumbnail = episode?.thumbnailUrl;
        const seriesHeroImage = currentSeriesData?.heroImage;
        const seriesPosterUrl = currentSeriesData?.posterUrl;
        const posterSrc = episodeThumbnail || seriesHeroImage || seriesPosterUrl || 'https://placehold.co/1280x720/000000/333333?text=No+Poster';

        if (videoPosterImage) {
            videoPosterImage.src = posterSrc;
            videoPosterImage.alt = `Poster xem ${currentSeriesData?.title || ''} - ${episode?.title || 'Tập hiện tại'}`;
        }
        if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
        if (youtubePlayer) { try { youtubePlayer.destroy(); } catch (e) {} youtubePlayer = null; }
        if (videoIframePlaceholder) {
             videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`;
             videoIframePlaceholder.classList.remove('active');
        }
    };

    // --- YouTube API Functions ---
    function loadYouTubeApiScript() {
        if (window.YT && window.YT.Player) { ytApiReady = true; return; }
        if (document.getElementById('youtube-api-script')) return;
        const tag = document.createElement('script');
        tag.id = 'youtube-api-script'; tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
    }

    if (typeof window.ytApiGlobalCallbackDefined === 'undefined') {
        window.onYouTubeIframeAPIReady = function() {
            ytApiReady = true; console.log("YouTube API đã sẵn sàng (filmDetails_phimBo).");
            if (window.pendingYouTubeLoad) {
                const { videoId, startSeconds } = window.pendingYouTubeLoad;
                if (typeof loadYouTubePlayer === 'function') loadYouTubePlayer(videoId, startSeconds);
                delete window.pendingYouTubeLoad;
            }
        };
        window.ytApiGlobalCallbackDefined = true;
    } else { if (window.YT && window.YT.Player) ytApiReady = true; }

    function onPlayerReady(event) { console.log("Trình phát YouTube đã sẵn sàng (phim bộ)."); event.target.playVideo(); }
    function onPlayerStateChange(event) {
        if (event.data == YT.PlayerState.ENDED) {
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e){} youtubePlayer = null; }
            const playerDiv = document.getElementById(youtubePlayerDivId); if (playerDiv) playerDiv.innerHTML = '';
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
        } else if (event.data == YT.PlayerState.PLAYING) {
             if (videoPlayerContainer && !videoPlayerContainer.classList.contains('playing')) videoPlayerContainer.classList.add('playing');
        }
    }
    function loadYouTubePlayer(videoId, startSeconds = 0) {
        if (!videoId || typeof videoId !== 'string' || !/^[\w-]{11}$/.test(videoId)) {
            console.error(`loadYouTubePlayer (Series): ID YouTube không hợp lệ: "${videoId}".`);
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2"></i> ID video YouTube không hợp lệ.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
            if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e){} youtubePlayer = null; }
            return;
        }
        if (!ytApiReady) {
            console.warn("loadYouTubePlayer (Series): API YouTube chưa sẵn sàng, đang chờ...");
            loadYouTubeApiScript(); showVideoMessage("Đang chuẩn bị trình phát YouTube...", false, true);
            window.pendingYouTubeLoad = { videoId, startSeconds }; return;
        }
        hideVideoMessage(); if (videoIframePlaceholder) videoIframePlaceholder.classList.add('active');
        if (youtubePlayer) { try { youtubePlayer.destroy(); } catch (e) {} youtubePlayer = null; }
        const playerDivTarget = document.getElementById(youtubePlayerDivId);
        if (!playerDivTarget) { if (videoIframePlaceholder) videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; else { showVideoMessage("Lỗi: Không thể tạo vùng chứa trình phát.", true); return; } }
        else { playerDivTarget.innerHTML = ''; }
        try {
            youtubePlayer = new YT.Player(youtubePlayerDivId, {
                height: '100%', width: '100%', videoId: videoId,
                playerVars: { 'playsinline': 1, 'autoplay': 1, 'rel': 0, 'modestbranding': 1, 'iv_load_policy': 3, 'hl': 'vi', 'cc_load_policy': 1, 'start': startSeconds },
                events: {
                    'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange,
                    'onError': (event) => {
                         console.error('Lỗi trình phát YouTube (Series):', event.data);
                         let errorMsg = `Lỗi trình phát YouTube: ${event.data}`;
                         switch(event.data) {
                             case 2: errorMsg = "Yêu cầu chứa giá trị tham số không hợp lệ."; break;
                             case 5: errorMsg = "Lỗi trình phát HTML5."; break;
                             case 100: errorMsg = "Không tìm thấy video."; break;
                             case 101: case 150: errorMsg = "Không được phép phát nhúng."; break;
                             default: errorMsg = `Lỗi không xác định (${event.data}).`;
                         }
                         showVideoMessage(`<i class="fas fa-exclamation-circle mr-2"></i> ${errorMsg}`, true);
                         if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
                         if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e) {} youtubePlayer = null; }
                         const playerDiv = document.getElementById(youtubePlayerDivId); if(playerDiv) playerDiv.innerHTML = '';
                         if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
                    }
                }
            });
            if (videoPlayerContainer) videoPlayerContainer.classList.add('playing');
        } catch (error) {
             console.error("Lỗi khi tạo trình phát YouTube (Series):", error);
             showVideoMessage("Không thể khởi tạo trình phát YouTube.", true);
             if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
             if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
        }
    }

    // --- Updated startVideoPlayback ---
    const startVideoPlayback = (urlToPlay, shouldSkipIntro = false) => {
        console.log(`startVideoPlayback (Series): Yêu cầu phát: ${urlToPlay}, Bỏ qua Intro: ${shouldSkipIntro}`);
        if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e) {} youtubePlayer = null; }
        if (videoIframePlaceholder) { videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; videoIframePlaceholder.classList.remove('active'); }
        else { return; }
        if (!urlToPlay) { showVideoMessage(`<i class="fas fa-exclamation-circle mr-2"></i>Không có URL video hợp lệ.`, true); if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing'); return; }

        hideVideoMessage();
        const youtubeId = getYouTubeVideoId(urlToPlay);
        const googleDriveEmbedUrl = getGoogleDriveEmbedUrl(urlToPlay);
        const skipSeconds = currentSeriesData?.skipIntroSeconds || 0;
        const effectiveStartSeconds = shouldSkipIntro ? skipSeconds : 0;
        const season = currentSeriesData?.seasons?.[currentSelectedSeasonIndex];
        const episode = season?.episodes?.[currentSelectedEpisodeIndex];
        let playerTitleText = currentSeriesData?.title || 'Không có tiêu đề';
        if (episode) { const seasonNumber = season?.seasonNumber; playerTitleText += ` - Mùa ${seasonNumber || '?'} Tập ${episode.episodeNumber}`; }
        if (seriesTitlePlayer) seriesTitlePlayer.textContent = `Xem: ${playerTitleText}`;

        if (youtubeId) {
            if (videoIframePlaceholder) videoIframePlaceholder.classList.add('active');
            loadYouTubePlayer(youtubeId, effectiveStartSeconds);
        } else if (googleDriveEmbedUrl) {
            if (videoIframePlaceholder) {
                 videoIframePlaceholder.innerHTML = `<iframe src="${googleDriveEmbedUrl}" frameborder="0" allow="autoplay; fullscreen" title="Trình phát video Google Drive cho ${playerTitleText}"></iframe>`;
                 videoIframePlaceholder.classList.add('active');
                 if (videoPlayerContainer) videoPlayerContainer.classList.add('playing');
                 showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Đang tải video từ Google Drive...`, false, true);
            }
        } else {
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2"></i>Định dạng video không được hỗ trợ.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
        }
    };

    // --- Skip Intro Button Visibility ---
    const updateSkipIntroButtonVisibility = () => {
        if (!skipIntroButton || !currentSeriesData || currentActiveVersion === null) {
            if (skipIntroButton) skipIntroButton.classList.add('hidden');
            return;
        }
        const skipSeconds = currentSeriesData.skipIntroSeconds || 0;
        const season = currentSeriesData.seasons?.[currentSelectedSeasonIndex];
        const episode = season?.episodes?.[currentSelectedEpisodeIndex];
        const activeUrl = episode?.videoUrls?.[currentActiveVersion];
        const isYouTube = !!getYouTubeVideoId(activeUrl);
        if (isYouTube && skipSeconds > 0) {
            skipIntroButton.dataset.skipSeconds = skipSeconds;
            skipIntroButton.classList.remove('hidden');
        } else {
            skipIntroButton.classList.add('hidden');
        }
    };

    // --- Version Button State Update ---
    const updateVersionButtonStates = (availableUrls, activeVersionKey) => {
        availableUrls = availableUrls || {};
        let hasAnyUrl = false;
        versionButtons.forEach(button => {
            const version = button.dataset.version;
            const hasUrl = !!availableUrls[version];
            button.disabled = !hasUrl;
            button.classList.toggle('active', version === activeVersionKey && hasUrl);
            button.setAttribute('aria-pressed', String(version === activeVersionKey && hasUrl));
            if (hasUrl) hasAnyUrl = true;
        });
        currentActiveVersion = availableUrls[activeVersionKey] ? activeVersionKey : null;
        currentVideoUrl = availableUrls[currentActiveVersion] || null;
        console.log(`updateVersionButtonStates (Series): Phiên bản hoạt động: ${currentActiveVersion}, URL sẵn sàng: ${currentVideoUrl}`);

        if (!hasAnyUrl) {
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Không có phiên bản video nào khả dụng cho tập này.`, false, true);
             setPlayerPoster(currentSeriesData?.seasons?.[currentSelectedSeasonIndex]?.episodes?.[currentSelectedEpisodeIndex]);
        } else if (currentActiveVersion === null && activeVersionKey && !availableUrls[activeVersionKey]) {
             showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${activeVersionKey}" không có sẵn cho tập này.`, false, true);
        } else {
             hideVideoMessage();
        }
        updateSkipIntroButtonVisibility();
    };

    // --- localStorage Functions ---
    const saveVersionPreference = (seriesId, versionKey) => {
        if (!seriesId || !versionKey) return;
        try { localStorage.setItem(`seriesPref_${seriesId}_version`, versionKey); }
        catch (e) { console.error("Lỗi lưu lựa chọn vào localStorage (phim bộ):", e); }
    };
    const loadVersionPreference = (seriesId) => {
        if (!seriesId) return null;
        try { return localStorage.getItem(`seriesPref_${seriesId}_version`); }
        catch (e) { console.error("Lỗi tải lựa chọn từ localStorage (phim bộ):", e); return null; }
    };

    // --- Prepare Video Playback (No Auto-Play) ---
    const prepareVideoPlayback = (versionKey) => {
        if (!currentSeriesData) return;
        const season = currentSeriesData.seasons?.[currentSelectedSeasonIndex];
        const episode = season?.episodes?.[currentSelectedEpisodeIndex];
        if (!episode) { console.error("prepareVideoPlayback (Series): Không thể chuẩn bị phát: không tìm thấy dữ liệu tập."); return; }
        const availableUrls = episode.videoUrls || {};
        const url = availableUrls[versionKey];
        if (url) {
            updateVersionButtonStates(availableUrls, versionKey);
            setPlayerPoster(episode);
            saveVersionPreference(currentSeriesData.id, versionKey);
            let playerTitleText = currentSeriesData?.title || 'Không có tiêu đề';
            const seasonNumber = season?.seasonNumber;
            playerTitleText += ` - Mùa ${seasonNumber || '?'} Tập ${episode.episodeNumber}`;
            if (seriesTitlePlayer) seriesTitlePlayer.textContent = `Xem: ${playerTitleText}`;
        } else {
            updateVersionButtonStates(availableUrls, null);
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${versionKey}" không có sẵn cho tập này.`, false, true);
        }
    };

    // --- Event Handlers ---
    const handleVersionClick = (event) => {
        const button = event.target.closest('.version-button');
        if (!button || button.disabled || !currentSeriesData) return;
        const versionKey = button.dataset.version;
        if (!versionKey) return;
        prepareVideoPlayback(versionKey);
    };

    const displayError = (message = "Rất tiếc, đã xảy ra lỗi.") => {
        if (loadingMessage) loadingMessage.classList.add('hidden');
        if (seriesDetailsSkeleton) seriesDetailsSkeleton.classList.add('hidden');
        if (seriesDetailsContent) seriesDetailsContent.classList.add('hidden');
        if (errorMessageContainer) errorMessageContainer.classList.remove('hidden');
        if (errorTextElement) errorTextElement.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i> ${message}`;
        const errorTitle = "Lỗi - Không tìm thấy phim bộ";
        if (pageTitleElement) pageTitleElement.textContent = errorTitle;
        if (ogTitleTag) ogTitleTag.content = errorTitle; if (twitterTitleTag) twitterTitleTag.content = errorTitle;
        if (metaDescriptionTag) metaDescriptionTag.content = message; if (ogDescriptionTag) ogDescriptionTag.content = message; if (twitterDescriptionTag) twitterDescriptionTag.content = message;
        if (ogImageTag) ogImageTag.content = 'https://placehold.co/1200x630/141414/ffffff?text=Error'; if (twitterImageTag) twitterImageTag.content = 'https://placehold.co/1200x630/141414/ffffff?text=Error';
        if (ogUrlTag) ogUrlTag.content = window.location.href; if (twitterUrlTag) twitterUrlTag.content = window.location.href;
    };

    const formatArrayData = (data, separator = ', ', limit = Infinity) => {
        if (Array.isArray(data)) { return data.filter(item => typeof item === 'string' && item.trim()).slice(0, limit).join(separator) || 'N/A'; }
        const strData = (typeof data === 'string' && data.trim()) ? data : 'N/A'; if (strData === 'N/A') return 'N/A';
        return strData.split(separator).map(s => s.trim()).filter(Boolean).slice(0, limit).join(separator);
    };

    /**
     * Creates the HTML for a related content card (movie, series, or anime).
     * Tạo HTML cho thẻ nội dung liên quan (phim, series, hoặc anime).
     * @param {object} item - Data object. Đối tượng dữ liệu.
     * @param {string} type - 'movies', 'series', 'anime-movie', 'anime-series'. Loại.
     * @returns {string} HTML string for the card. Chuỗi HTML cho thẻ.
     */
    const createRelatedItemCard = (item, type) => {
        // Determine detail page URL based on item type
        // Xác định URL trang chi tiết dựa trên loại mục
        let detailPageUrl = '#';
        if (type === 'anime-series' || type === 'anime-movie') {
            detailPageUrl = `animeDetails.html?id=${item.id}&type=${type}`;
        } else if (type === 'series') {
            detailPageUrl = `filmDetails_phimBo.html?id=${item.id}&type=series`;
        } else { // movies
            detailPageUrl = `filmDetail.html?id=${item.id}&type=movies`;
        }

        const altText = `Poster ${type.includes('anime') ? 'Anime' : (type === 'movies' ? 'phim' : 'phim bộ')} liên quan: ${item.title || 'không có tiêu đề'}`;
        let typeBadge = '';
        if (type === 'anime-series' || type === 'series') {
            typeBadge = `<span class="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">Bộ</span>`;
        } else if (type === 'anime-movie') {
            typeBadge = `<span class="absolute top-1 right-1 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded">Anime Movie</span>`;
        }
        const posterUrl = item.posterUrl || 'https://placehold.co/300x450/111111/eeeeee?text=No+Poster';
        const titleText = item.title || 'Không có tiêu đề';
        const yearText = item.releaseYear || 'N/A';

        return `
           <a href="${detailPageUrl}" class="related-movie-card bg-light-gray rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition duration-300 cursor-pointer group relative block animate-on-scroll animate-slide-up" data-item-id="${item.id}" data-item-type="${type}" aria-label="Xem chi tiết ${titleText}">
               <img src="${posterUrl}" alt="${altText}" class="w-full h-auto object-cover related-movie-poster" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/300x450/111111/eeeeee?text=Error'; this.alt='Lỗi tải ảnh poster liên quan ${titleText}';">
               ${typeBadge}
               <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100" aria-hidden="true">
                   <i class="fas fa-play text-white text-3xl"></i>
               </div>
               <div class="p-2">
                   <h4 class="font-semibold text-gray-200 text-xs md:text-sm truncate" title="${titleText}">${titleText}</h4>
                   <p class="text-xs text-text-muted">${yearText}</p>
               </div>
           </a>
       `;
    };

    /**
     * Loads and displays related content (movies, series, anime) based on genre similarity.
     * Tải và hiển thị nội dung liên quan (phim, series, anime) dựa trên sự tương đồng về thể loại.
     * @param {object} currentSeries - The data of the series currently being viewed. Dữ liệu của phim bộ đang được xem.
     */
    const loadRelatedItems = (currentSeries) => {
        if (!currentSeries || !relatedContentGrid) {
            if(relatedContentGrid) relatedContentGrid.innerHTML = '<p class="text-text-muted col-span-full">Không thể tải nội dung liên quan.</p>';
            return;
        }

        const currentGenres = Array.isArray(currentSeries.genre) ? currentSeries.genre : (typeof currentSeries.genre === 'string' ? [currentSeries.genre] : []);
        const currentSeriesId = currentSeries.id;

        if (observer) observer.disconnect();
        if (currentGenres.length === 0) { relatedContentGrid.innerHTML = '<p class="text-text-muted col-span-full">Không có thông tin thể loại để tìm nội dung tương tự.</p>'; return; }

        // Combine all data types with their respective types
        // Kết hợp tất cả các loại dữ liệu với loại tương ứng của chúng
        const allItems = [
            ...allMoviesData.map(item => ({ ...item, itemType: 'movies' })),
            ...allSeriesData.map(item => ({ ...item, itemType: 'series' })),
            ...allAnimeData.map(item => ({ ...item, itemType: item.itemType || (item.episodes === null ? 'anime-movie' : 'anime-series') })) // Assign anime type
        ];

        // Filter related items across all types
        // Lọc các mục liên quan trên tất cả các loại
        const relatedItems = allItems.filter(item => {
            // Exclude the current series itself
            // Loại trừ chính phim bộ hiện tại
            if (item.id === currentSeriesId && item.itemType === 'series') return false;

            const itemGenres = Array.isArray(item.genre) ? item.genre : (typeof item.genre === 'string' ? [item.genre] : []);
            return itemGenres.some(g => currentGenres.includes(g));
        })
        .sort(() => 0.5 - Math.random()) // Randomize
        .slice(0, 6); // Limit

        if (relatedItems.length > 0) {
            relatedContentGrid.innerHTML = relatedItems.map((itemData, index) => {
                 const cardHTML = createRelatedItemCard(itemData, itemData.itemType); // Pass itemType
                 const cardWithIndex = cardHTML.replace('<a ', `<a data-index="${index}" `);
                 return cardWithIndex;
            }).join('');
            observeElements(relatedContentGrid.querySelectorAll('.related-movie-card.animate-on-scroll')); // Use updated class
        } else {
             relatedContentGrid.innerHTML = '<p class="text-text-muted col-span-full">Không tìm thấy nội dung nào tương tự.</p>';
        }
    };

    const updateMetaTags = (series) => {
        const pageUrl = window.location.href;
        const seriesTitleText = series.title || 'Phim bộ không có tiêu đề';
        const seriesYearText = series.releaseYear ? `(${series.releaseYear})` : '';
        const fullTitle = `Phim Bộ: ${seriesTitleText} ${seriesYearText} - Xem Online Vietsub, Thuyết Minh`;
        let description = `Xem phim bộ ${seriesTitleText} ${seriesYearText} online. `;
        if (series.description) { const firstSentence = series.description.split('.')[0]; description += (firstSentence.length < 120 ? firstSentence + '.' : series.description.substring(0, 120) + '...'); }
        else { description += `Thông tin chi tiết, các mùa, tập, diễn viên, đạo diễn, và các phiên bản Vietsub, Thuyết Minh.`; }
        description = description.substring(0, 160);
        const genresText = formatArrayData(series.genre, ', ');
        const keywords = `xem phim bộ ${seriesTitleText}, ${seriesTitleText} online, ${seriesTitleText} vietsub, ${seriesTitleText} thuyết minh, ${genresText}, phim bộ ${series.releaseYear || ''}, ${series.director || ''}, ${formatArrayData(series.cast, ', ', 3)}`;

        if (pageTitleElement) pageTitleElement.textContent = fullTitle; if (metaDescriptionTag) metaDescriptionTag.content = description; if (metaKeywordsTag) metaKeywordsTag.content = keywords;
        if (ogUrlTag) ogUrlTag.content = pageUrl; if (ogTitleTag) ogTitleTag.content = fullTitle; if (ogDescriptionTag) ogDescriptionTag.content = description;
        if (ogImageTag) ogImageTag.content = series.posterUrl || 'https://placehold.co/1200x630/141414/ffffff?text=Series+Poster'; if (ogTypeTag) ogTypeTag.content = 'video.tv_show';
        if (ogVideoDirectorTag) ogVideoDirectorTag.content = series.director || ''; if (ogVideoActorTag) ogVideoActorTag.content = formatArrayData(series.cast, ', ', 4);
        if (ogVideoReleaseDateTag && series.releaseYear) ogVideoReleaseDateTag.content = series.releaseYear.toString();
        if (twitterUrlTag) twitterUrlTag.content = pageUrl; if (twitterTitleTag) twitterTitleTag.content = fullTitle; if (twitterDescriptionTag) twitterDescriptionTag.content = description;
        if (twitterImageTag) twitterImageTag.content = series.posterUrl || 'https://placehold.co/1200x630/141414/ffffff?text=Series+Poster';
        console.log("Đã cập nhật thẻ meta cho phim bộ:", seriesTitleText);
    };

    // --- Series Specific Functions ---
    const populateSeasonSelector = (seasons) => {
        if (!seasonSelect || !seasons || seasons.length === 0) { if (seasonSelectorContainer) seasonSelectorContainer.classList.add('hidden'); return; }
        if (seasonSelectorContainer) seasonSelectorContainer.classList.remove('hidden');
        seasonSelect.innerHTML = '';
        seasons.forEach((season, index) => {
            const option = document.createElement('option'); option.value = index.toString(); option.textContent = `Mùa ${season.seasonNumber}`;
            if (index === currentSelectedSeasonIndex) option.selected = true; seasonSelect.appendChild(option);
        });
        handleSeasonChange();
    };

    const populateEpisodeSelector = (episodes) => {
        if (!episodeSelect || !episodes || episodes.length === 0) { if (episodeSelectorContainer) episodeSelectorContainer.classList.add('hidden'); return; }
        // Keep hidden: if (episodeSelectorContainer) episodeSelectorContainer.classList.remove('hidden');
        episodeSelect.innerHTML = '';
        episodes.forEach((episode, index) => {
            const option = document.createElement('option'); option.value = index.toString(); option.textContent = `Tập ${episode.episodeNumber}: ${episode.title || 'Chưa có tên'}`;
            if (index === currentSelectedEpisodeIndex) option.selected = true; episodeSelect.appendChild(option);
        });
    };

    const displayEpisodeButtons = (episodes) => {
        if (!episodeListContainer) return;
        if (!episodes || episodes.length === 0) { episodeListContainer.innerHTML = '<p class="text-text-muted text-sm italic col-span-full">Không có tập nào cho mùa này.</p>'; episodeListContainer.className = 'flex flex-wrap gap-2'; return; }
        episodeListContainer.className = 'flex flex-wrap gap-2';
        episodeListContainer.innerHTML = episodes.map((episode, index) => {
            const isActive = index === currentSelectedEpisodeIndex; const activeClass = isActive ? 'active' : ''; const episodeNumber = episode.episodeNumber || (index + 1);
            return `<button class="episode-button ${activeClass}" data-episode-index="${index}" aria-current="${isActive ? 'true' : 'false'}" aria-label="Chọn Tập ${episodeNumber}" title="Xem Tập ${episodeNumber}${episode.title ? ': ' + episode.title : ''}">${episodeNumber}</button>`;
        }).join('');
        episodeListContainer.querySelectorAll('.episode-button').forEach(button => button.addEventListener('click', handleEpisodeSelection));
    };

    const handleSeasonChange = () => {
        if (!seasonSelect || !currentSeriesData) return;
        currentSelectedSeasonIndex = parseInt(seasonSelect.value, 10); currentSelectedEpisodeIndex = 0;
        const season = currentSeriesData.seasons?.[currentSelectedSeasonIndex];
        if (season) { populateEpisodeSelector(season.episodes); displayEpisodeButtons(season.episodes); loadEpisodeDataAndUpdateUI(currentSelectedEpisodeIndex); }
        else {
            if (episodeSelectorContainer) episodeSelectorContainer.classList.add('hidden');
            if (episodeListContainer) { episodeListContainer.innerHTML = '<p class="text-text-muted text-sm italic col-span-full">Lỗi tải dữ liệu mùa.</p>'; episodeListContainer.className = 'flex flex-wrap gap-2'; }
            setPlayerPoster(); updateVersionButtonStates({}, null); currentVideoUrl = null; updateSkipIntroButtonVisibility();
        }
    };

    const handleEpisodeSelection = (event) => {
        let selectedIndex;
        if (event.target.id === 'episode-select') { selectedIndex = parseInt(event.target.value, 10); }
        else { const button = event.target.closest('.episode-button'); if (!button) return; selectedIndex = parseInt(button.dataset.episodeIndex, 10); }
        if (isNaN(selectedIndex) || selectedIndex === currentSelectedEpisodeIndex) return;
        loadEpisodeDataAndUpdateUI(selectedIndex);
    };

    const loadEpisodeDataAndUpdateUI = (episodeIndex) => {
        const season = currentSeriesData?.seasons?.[currentSelectedSeasonIndex];
        const episode = season?.episodes?.[episodeIndex];
        if (!episode) { console.error(`loadEpisodeDataAndUpdateUI: Không tìm thấy tập tại index ${episodeIndex}.`); setPlayerPoster(); updateVersionButtonStates({}, null); currentVideoUrl = null; updateSkipIntroButtonVisibility(); return; }
        currentSelectedEpisodeIndex = episodeIndex;
        if (episodeSelect) episodeSelect.value = episodeIndex.toString();
        displayEpisodeButtons(season.episodes);
        let versionToPrepare = loadVersionPreference(currentSeriesData.id);
        const availableUrls = episode.videoUrls || {};
        if (!versionToPrepare || !availableUrls[versionToPrepare]) {
             versionToPrepare = null; const versionPriority = ['vietsub', 'dubbed', 'voiceover'];
             for (const key of versionPriority) { if (availableUrls[key]) { versionToPrepare = key; break; } }
             if (!versionToPrepare) { for (const key in availableUrls) { if (availableUrls[key]) { versionToPrepare = key; break; } } }
        }
        if (versionToPrepare) { prepareVideoPlayback(versionToPrepare); }
        else { setPlayerPoster(episode); updateVersionButtonStates({}, null); currentVideoUrl = null; updateSkipIntroButtonVisibility(); }
        console.log(`loadEpisodeDataAndUpdateUI: Đã tải UI cho Mùa ${season?.seasonNumber || '?'} - Tập ${episode.episodeNumber}. Phiên bản chuẩn bị: ${currentActiveVersion || 'None'}.`);
    };

    // --- Scroll & Lights Off ---
    const handleScroll = () => {
        if (!scrollToTopButton) return;
        const isVisible = window.scrollY > 300;
        scrollToTopButton.classList.toggle('visible', isVisible); scrollToTopButton.classList.toggle('hidden', !isVisible);
        scrollToTopButton.setAttribute('aria-hidden', String(!isVisible));
    };
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const toggleLights = () => {
        const isLightsOff = document.body.classList.toggle('lights-off');
        if (toggleLightsButton) toggleLightsButton.setAttribute('aria-pressed', String(isLightsOff));
        if (toggleLightsText) toggleLightsText.textContent = isLightsOff ? 'Bật đèn' : 'Tắt đèn';
        const icon = toggleLightsButton?.querySelector('i');
        if (icon) { icon.classList.toggle('fa-lightbulb', !isLightsOff); icon.classList.toggle('fa-solid', !isLightsOff); icon.classList.toggle('fa-moon', isLightsOff); icon.classList.toggle('fa-regular', isLightsOff); }
    };

    // --- Observer ---
    const initObserver = () => {
        if (!('IntersectionObserver' in window)) { document.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('is-visible')); return; }
        const options = { root: null, rootMargin: '0px', threshold: 0.1 };
        observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delayIndex = parseInt(entry.target.dataset.index || '0', 10);
                    entry.target.style.animationDelay = `${delayIndex * 100}ms`;
                    entry.target.classList.add('is-visible');
                    observerInstance.unobserve(entry.target);
                }
            });
        }, options);
        observeElements(document.querySelectorAll('.animate-on-scroll'));
    };
    const observeElements = (elements) => { if (!observer) return; elements.forEach((el) => { if (el.classList.contains('animate-on-scroll') && !el.classList.contains('is-visible')) observer.observe(el); }); };

    // --- Main Initialization Logic ---
    const seriesId = getQueryParam('id');
    const typeParam = getQueryParam('type');

    if (!seriesId || isNaN(parseInt(seriesId)) || typeParam !== 'series') {
        displayError("ID phim bộ không hợp lệ, bị thiếu hoặc loại nội dung không đúng.");
        return;
    }
    const numericSeriesId = parseInt(seriesId);
    if (loadingMessage) loadingMessage.classList.add('hidden');
    loadYouTubeApiScript();

    // Fetch ALL data types
    // Tải TẤT CẢ các loại dữ liệu
    Promise.all([
        fetch('../json/filmData.json').then(res => res.ok ? res.json() : Promise.resolve([])),
        fetch('../json/filmData_phimBo.json').then(res => {
             if (!res.ok) throw new Error(`HTTP error! status: ${res.status} fetching filmData_phimBo.json`);
             return res.json();
        }),
        fetch('../json/animeData.json').then(res => res.ok ? res.json() : Promise.resolve([]))
    ])
    .then(([movies, series, anime]) => {
        allMoviesData = movies || [];
        allSeriesData = series || [];
        allAnimeData = anime || [];

        // Find the current series
        // Tìm phim bộ hiện tại
        currentSeriesData = allSeriesData.find(s => s.id === numericSeriesId);
        // Note: We don't check animeData here because the typeParam is strictly 'series' for this page.
        // Lưu ý: Chúng ta không kiểm tra animeData ở đây vì typeParam là 'series' cho trang này.

        if (currentSeriesData) {
            updateMetaTags(currentSeriesData);

            if (seriesPoster) { seriesPoster.src = currentSeriesData.posterUrl || 'https://placehold.co/400x600/222222/555555?text=No+Poster'; seriesPoster.alt = `Poster phim bộ ${currentSeriesData.title || 'không có tiêu đề'}`; }
            if (seriesMainTitle) seriesMainTitle.textContent = currentSeriesData.title || 'Không có tiêu đề';
            if(seriesYear) seriesYear.textContent = currentSeriesData.releaseYear || 'N/A';
            if(seriesGenre) seriesGenre.textContent = formatArrayData(currentSeriesData.genre);
            if(seriesRating) seriesRating.textContent = currentSeriesData.rating ? `${currentSeriesData.rating}` : 'N/A';
            if(seriesStatus) seriesStatus.textContent = currentSeriesData.status || 'N/A';
            if(seriesDescription) seriesDescription.textContent = currentSeriesData.description || 'Không có mô tả.';
            if(seriesDirector) seriesDirector.textContent = currentSeriesData.director || 'N/A';
            if(seriesCast) seriesCast.textContent = formatArrayData(currentSeriesData.cast);
            if(seriesSeasonsCount) seriesSeasonsCount.textContent = currentSeriesData.numberOfSeasons || 'N/A';
            if(seriesEpisodesCount) seriesEpisodesCount.textContent = currentSeriesData.totalEpisodes || 'N/A';

            // Populate season selector (triggers episode load and player prep)
            // Điền bộ chọn mùa (kích hoạt tải tập và chuẩn bị trình phát)
            populateSeasonSelector(currentSeriesData.seasons);

            // Load related content from all sources
            // Tải nội dung liên quan từ tất cả các nguồn
            loadRelatedItems(currentSeriesData);

            setTimeout(() => {
                if (seriesDetailsSkeleton) seriesDetailsSkeleton.classList.add('hidden');
                if (errorMessageContainer) errorMessageContainer.classList.add('hidden');
                if (seriesDetailsContent) seriesDetailsContent.classList.remove('hidden');
            }, 150);
            initObserver();

        } else {
            displayError(`Rất tiếc, không tìm thấy phim bộ bạn yêu cầu (ID: ${numericSeriesId}).`);
        }
    })
    .catch(error => {
        console.error('Lỗi khi tải hoặc xử lý dữ liệu:', error);
        displayError(`Đã xảy ra lỗi khi tải dữ liệu: ${error.message || error}`);
    });

    // --- Event Listeners Setup ---
    window.addEventListener('scroll', handleScroll);
    if (scrollToTopButton) scrollToTopButton.addEventListener('click', scrollToTop);
    if (versionSelectionContainer) versionSelectionContainer.addEventListener('click', handleVersionClick);
    if (toggleLightsButton) toggleLightsButton.addEventListener('click', toggleLights);
    if (seasonSelect) seasonSelect.addEventListener('change', handleSeasonChange);
    // Episode button listeners added dynamically
    const lightsOverlay = document.getElementById('lights-overlay');
    if (lightsOverlay) lightsOverlay.addEventListener('click', () => { if (document.body.classList.contains('lights-off')) toggleLights(); });
    if (videoPosterOverlay) videoPosterOverlay.addEventListener('click', () => { if (currentVideoUrl) startVideoPlayback(currentVideoUrl, false); else showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video.`, false, true); });
    if (videoPlayButton) videoPlayButton.addEventListener('click', (event) => { event.stopPropagation(); if (currentVideoUrl) startVideoPlayback(currentVideoUrl, false); else showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video.`, false, true); });
    if (skipIntroButton) {
        skipIntroButton.addEventListener('click', () => {
            if (currentVideoUrl && currentActiveVersion) { const isYouTube = !!getYouTubeVideoId(currentVideoUrl); if (isYouTube) startVideoPlayback(currentVideoUrl, true); else showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Bỏ qua giới thiệu chỉ khả dụng cho YouTube.`, false, true); }
            else { showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video trước.`, false, true); }
        });
    }

}); // End DOMContentLoaded
