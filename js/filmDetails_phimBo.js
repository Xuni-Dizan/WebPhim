// filmDetails_phimBo.js - Handles Series Details Page Logic
// v1.4: Updated to fetch all data types (movies, series, anime) for comprehensive related content.
// v1.5: Ensured favorite/watchlist buttons have correct data attributes.

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
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

    // Series Specific Elements
    const seriesContentSection = document.getElementById('series-content-section');
    const seasonSelectorContainer = document.getElementById('season-selector-container');
    const episodeSelectorContainer = document.getElementById('episode-selector-container');
    const episodeListContainer = document.getElementById('episode-list-container');
    const seasonSelect = document.getElementById('season-select');
    const episodeSelect = document.getElementById('episode-select');
    const seriesSpecificInfo = document.getElementById('series-specific-info');

    // Player Elements
    const videoPosterImage = document.getElementById('video-poster-image');
    const videoPosterOverlay = document.getElementById('video-poster-overlay');
    const videoPlayButton = document.getElementById('video-play-button');
    const videoIframePlaceholder = document.getElementById('video-iframe-placeholder');
    const youtubePlayerDivId = 'youtube-player';

    // Skip Intro Button Element
    const skipIntroButton = document.getElementById('skip-intro-button');
    
    // Favorite/Watchlist buttons
    const favoriteButton = document.querySelector('.favorite-button');
    const watchlistButton = document.querySelector('.watchlist-button');

    // Meta Tag Elements
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

    // State Variables
    let allMoviesData = [];
    let allSeriesData = [];
    let allAnimeData = [];
    let currentSeriesData = null;
    let currentSelectedSeasonIndex = 0;
    let currentSelectedEpisodeIndex = 0;
    let currentActiveVersion = null;
    let currentVideoUrl = null;
    let observer;
    let youtubePlayer = null;
    let ytApiReady = false;

    // Helper Functions
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
        const seriesPosterUrl = currentSeriesData?.posterUrl; // This could be an array too
        const actualSeriesPoster = Array.isArray(seriesPosterUrl) ? seriesPosterUrl[0] : seriesPosterUrl;
        
        const posterSrc = episodeThumbnail || seriesHeroImage || actualSeriesPoster || 'https://placehold.co/1280x720/000000/333333?text=No+Poster';

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

    // YouTube API Functions
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
        let playerDivTarget = document.getElementById(youtubePlayerDivId);
        if (!playerDivTarget) { 
            if (videoIframePlaceholder) {
                videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; 
                playerDivTarget = document.getElementById(youtubePlayerDivId);
            }
            if (!playerDivTarget) { 
                showVideoMessage("Lỗi: Không thể tạo vùng chứa trình phát.", true); 
                return; 
            }
        } else { 
            playerDivTarget.innerHTML = ''; 
        }
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
                         if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e){} youtubePlayer = null; }
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

    const startVideoPlayback = (urlToPlay, shouldSkipIntro = false) => {
        console.log(`startVideoPlayback (Series): Yêu cầu phát: ${urlToPlay}, Bỏ qua Intro: ${shouldSkipIntro}`);
        if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e) {} youtubePlayer = null; }
        if (videoIframePlaceholder) { videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; videoIframePlaceholder.classList.remove('active'); }
        else { console.error("Video iframe placeholder not found."); return; }
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
                 videoIframePlaceholder.innerHTML = `<iframe src="${googleDriveEmbedUrl}" class="w-full h-full" frameborder="0" allow="autoplay; fullscreen" allowfullscreen title="Trình phát video Google Drive cho ${playerTitleText}"></iframe>`;
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

    const createRelatedItemCard = (item, itemType) => {
        let detailPageUrl = '#';
        if (itemType === 'anime-series' || itemType === 'anime-movie') {
            detailPageUrl = `animeDetails.html?id=${item.id}&type=${itemType}`;
        } else if (itemType === 'series') {
            detailPageUrl = `filmDetails_phimBo.html?id=${item.id}&type=series`;
        } else { 
            detailPageUrl = `filmDetail.html?id=${item.id}&type=movies`;
        }

        const altText = `Poster ${itemType.includes('anime') ? 'Anime' : (itemType === 'movies' ? 'phim' : 'phim bộ')} liên quan: ${item.title || 'không có tiêu đề'}`;
        const posterUrl = (Array.isArray(item.posterUrl) ? item.posterUrl[0] : item.posterUrl) || 'https://placehold.co/300x450/111111/eeeeee?text=No+Poster';
        const titleText = item.title || 'Không có tiêu đề';
        const yearText = item.releaseYear || 'N/A';
        const ratingText = item.rating ? parseFloat(item.rating).toFixed(1) : 'N/A';
        const format = item.format || [];
        const isAnimeRelated = itemType.includes('anime');
        
        const cardClass = isAnimeRelated ? 'anime-card stagger-item' : 'movie-card stagger-item';

        let badgesHTML = '';
        if (itemType === 'series' || itemType === 'anime-series') {
            badgesHTML += `<span class="card-badge card-badge-top-right badge-series">Bộ</span>`;
        } else if (itemType === 'anime-movie') {
            badgesHTML += `<span class="card-badge card-badge-top-right badge-anime">Anime</span>`;
        } else if (itemType === 'movies') {
             badgesHTML += `<span class="card-badge card-badge-top-right badge-movie">Lẻ</span>`;
        }

        if (format.includes("3D")) {
            badgesHTML += `<span class="card-badge card-badge-top-left badge-3d">3D</span>`;
        } else if (format.includes("2D")) {
            badgesHTML += `<span class="card-badge card-badge-top-left badge-2d">2D</span>`;
        } else if (format.includes("Animation") && !format.includes("2D") && !format.includes("3D") && !isAnimeRelated) {
            badgesHTML += `<span class="card-badge card-badge-top-left badge-animation">Hoạt Hình</span>`;
        }
        
        let episodesHTML = '';
        if (itemType === 'series' || itemType === 'anime-series') {
            let episodeCount = '?'; 
            if (item.totalEpisodes) episodeCount = item.totalEpisodes;
            else if (item.seasons && item.seasons[0] && typeof item.seasons[0].numberOfEpisodes === 'number') episodeCount = item.seasons[0].numberOfEpisodes;
            else if (item.seasons && item.seasons[0] && Array.isArray(item.seasons[0].episodes)) episodeCount = item.seasons[0].episodes.length;
            episodesHTML = `<div class="card-episodes"><i class="fas fa-list-ol"></i> ${episodeCount} tập</div>`;
        }

        return `
           <a href="${detailPageUrl}" class="${cardClass}" data-item-id="${item.id}" data-item-type="${itemType}" aria-label="Xem chi tiết ${isAnimeRelated ? 'Anime' : (itemType === 'movies' ? 'phim' : 'phim bộ')} ${titleText}">
                <div class="movie-card-poster-container relative overflow-hidden rounded-t-lg">
                    <img src="${posterUrl}" alt="${altText}" loading="lazy" class="w-full h-auto aspect-[2/3] object-cover transition-transform duration-400" onerror="this.onerror=null; this.src='https://placehold.co/300x450/111111/eeeeee?text=Error'; this.alt='Lỗi tải ảnh poster ${titleText}';">
                    ${badgesHTML}
                    <div class="card-hover-overlay absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 transition-opacity duration-300 flex flex-col justify-center items-center">
                        <div class="card-play-button bg-black/40 text-white text-3xl p-4 rounded-full border-2 border-white/70 hover:bg-primary hover:border-white hover:scale-110 transition-all duration-300 flex items-center justify-center">
                            <i class="fas fa-play"></i>
                        </div>
                        <div class="mt-3 text-white font-semibold text-lg text-center px-3">${titleText}</div>
                    </div>
                </div>
                <div class="card-info p-3 border-t border-gray-700/20">
                    <div>
                        <h3 class="card-title font-semibold text-bright-color text-sm leading-tight mb-1 h-[2.5em] overflow-hidden" title="${titleText}">${titleText}</h3>
                        <div class="card-meta flex justify-between items-center text-xs text-text-muted">
                            <div class="card-year flex items-center"><i class="far fa-calendar-alt text-xs mr-1 opacity-70"></i> ${yearText}</div>
                            <div class="card-rating flex items-center text-gold-accent"><i class="fas fa-star text-xs mr-1"></i> ${ratingText}</div>
                        </div>
                        ${episodesHTML} 
                    </div>
                </div>
            </a>`;
    };


    const loadRelatedItems = (currentSeries) => {
        if (!currentSeries || !relatedContentGrid) {
            if(relatedContentGrid) relatedContentGrid.innerHTML = '<p class="text-text-muted col-span-full text-center py-4">Không thể tải nội dung liên quan.</p>';
            return;
        }

        const currentGenres = Array.isArray(currentSeries.genre) ? currentSeries.genre : (typeof currentSeries.genre === 'string' ? [currentSeries.genre] : []);
        const currentSeriesId = currentSeries.id;
        const currentItemType = currentSeries.itemType || 'series';

        if (observer) observer.disconnect();
        if (currentGenres.length === 0) { relatedContentGrid.innerHTML = '<p class="text-text-muted col-span-full text-center py-4">Không có thông tin thể loại để tìm nội dung tương tự.</p>'; return; }

        const allItems = [
            ...allMoviesData.map(item => ({ ...item, itemType: item.itemType || 'movies' })),
            ...allSeriesData.map(item => ({ ...item, itemType: item.itemType || 'series' })),
            ...allAnimeData.map(item => ({ ...item, itemType: item.itemType || (item.episodes === null || item.episodes === undefined ? 'anime-movie' : 'anime-series') }))
        ];

        const relatedItems = allItems.filter(item => {
            if (item.id === currentSeriesId && item.itemType === currentItemType) return false; 
            const itemGenres = Array.isArray(item.genre) ? item.genre : (typeof item.genre === 'string' ? [item.genre] : []);
            return itemGenres.some(g => currentGenres.includes(g));
        })
        .sort(() => 0.5 - Math.random()) 
        .slice(0, 6); 

        if (relatedItems.length > 0) {
            relatedContentGrid.innerHTML = relatedItems.map((itemData, index) => {
                 const cardHTML = createRelatedItemCard(itemData, itemData.itemType);
                 // Add stagger-item class directly in createRelatedItemCard
                 return cardHTML.replace('<a ', `<a data-index="${index}" `);
            }).join('');
            observeElements(relatedContentGrid.querySelectorAll('.stagger-item'));
        } else {
             relatedContentGrid.innerHTML = '<p class="text-text-muted col-span-full text-center py-4">Không tìm thấy nội dung nào tương tự.</p>';
        }
    };

    const updateMetaTags = (series) => {
        const pageUrl = window.location.href;
        const seriesTitleText = series.title || 'Phim bộ không có tiêu đề';
        const seriesYearText = series.releaseYear ? `(${series.releaseYear})` : '';
        const fullTitle = `Phim Bộ: ${seriesTitleText} ${seriesYearText} - Xem Online Vietsub, Thuyết Minh | Flick Tale`;
        let description = `Xem phim bộ ${seriesTitleText} ${seriesYearText} online tại Flick Tale. `;
        if (series.description) { const firstSentence = series.description.split('.')[0]; description += (firstSentence.length < 120 ? firstSentence + '.' : series.description.substring(0, 120) + '...'); }
        else { description += `Thông tin chi tiết, các mùa, tập, diễn viên, đạo diễn, và các phiên bản Vietsub, Thuyết Minh.`; }
        description = description.substring(0, 160);
        const genresText = formatArrayData(series.genre, ', ');
        const keywords = `xem phim bộ ${seriesTitleText}, ${seriesTitleText} online, ${seriesTitleText} vietsub, ${seriesTitleText} thuyết minh, ${genresText}, phim bộ ${series.releaseYear || ''}, ${series.director || ''}, ${formatArrayData(series.cast, ', ', 3)}, Flick Tale`;

        if (pageTitleElement) pageTitleElement.textContent = fullTitle; if (metaDescriptionTag) metaDescriptionTag.content = description; if (metaKeywordsTag) metaKeywordsTag.content = keywords;
        if (ogUrlTag) ogUrlTag.content = pageUrl; if (ogTitleTag) ogTitleTag.content = fullTitle; if (ogDescriptionTag) ogDescriptionTag.content = description;
        if (ogImageTag) ogImageTag.content = (Array.isArray(series.posterUrl) ? series.posterUrl[0] : series.posterUrl) || 'https://placehold.co/1200x630/141414/ffffff?text=Series+Poster'; if (ogTypeTag) ogTypeTag.content = 'video.tv_show';
        if (ogSiteNameTag) ogSiteNameTag.content = "Flick Tale";
        if (ogVideoDirectorTag) ogVideoDirectorTag.content = series.director || ''; if (ogVideoActorTag) ogVideoActorTag.content = formatArrayData(series.cast, ', ', 4);
        if (ogVideoReleaseDateTag && series.releaseYear) ogVideoReleaseDateTag.content = series.releaseYear.toString();
        if (twitterCardTag) twitterCardTag.content = "summary_large_image";
        if (twitterUrlTag) twitterUrlTag.content = pageUrl; if (twitterTitleTag) twitterTitleTag.content = fullTitle; if (twitterDescriptionTag) twitterDescriptionTag.content = description;
        if (twitterImageTag) twitterImageTag.content = (Array.isArray(series.posterUrl) ? series.posterUrl[0] : series.posterUrl) || 'https://placehold.co/1200x630/141414/ffffff?text=Series+Poster';
        console.log("Đã cập nhật thẻ meta cho phim bộ:", seriesTitleText);
    };

    const populateSeasonSelector = (seasons) => {
        if (!seasonSelect || !seasons || seasons.length === 0) { 
            if (seasonSelectorContainer) seasonSelectorContainer.classList.add('hidden'); 
            if (seriesContentSection) seriesContentSection.classList.add('hidden'); // Hide the whole section
            return; 
        }
        if (seasonSelectorContainer) seasonSelectorContainer.classList.remove('hidden');
        if (seriesContentSection) seriesContentSection.classList.remove('hidden'); // Show the section

        seasonSelect.innerHTML = '';
        seasons.forEach((season, index) => {
            const option = document.createElement('option'); option.value = index.toString(); option.textContent = `Mùa ${season.seasonNumber}`;
            if (index === currentSelectedSeasonIndex) option.selected = true; seasonSelect.appendChild(option);
        });
        handleSeasonChange();
    };

    const populateEpisodeSelector = (episodes) => {
        if (!episodeSelect || !episodes || episodes.length === 0) { if (episodeSelectorContainer) episodeSelectorContainer.classList.add('hidden'); return; }
        // episodeSelectorContainer.classList.remove('hidden'); // Keep hidden for now, use buttons
        episodeSelect.innerHTML = '';
        episodes.forEach((episode, index) => {
            const option = document.createElement('option'); option.value = index.toString(); option.textContent = `Tập ${episode.episodeNumber}: ${episode.title || 'Chưa có tên'}`;
            if (index === currentSelectedEpisodeIndex) option.selected = true; episodeSelect.appendChild(option);
        });
    };

    const displayEpisodeButtons = (episodes) => {
        if (!episodeListContainer) return;
        if (!episodes || episodes.length === 0) { 
            episodeListContainer.innerHTML = '<p class="text-text-muted text-sm italic col-span-full">Không có tập nào cho mùa này.</p>'; 
            return; 
        }
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
            if (episodeListContainer) { episodeListContainer.innerHTML = '<p class="text-text-muted text-sm italic col-span-full">Lỗi tải dữ liệu mùa.</p>';}
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
        if (icon) { 
            icon.classList.toggle('fa-lightbulb', !isLightsOff); 
            icon.classList.toggle('fa-solid', !isLightsOff); 
            icon.classList.toggle('fa-moon', isLightsOff); 
            icon.classList.toggle('fa-regular', isLightsOff); 
        }
        const playerArea = document.querySelector('.player-area'); 
        if (playerArea) { playerArea.style.opacity = isLightsOff ? '1' : ''; playerArea.style.filter = isLightsOff ? 'none' : '';}
    };

    const initObserver = () => {
        if (!('IntersectionObserver' in window)) { document.querySelectorAll('.stagger-item').forEach(el => el.classList.add('is-visible')); return; }
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
        observeElements(document.querySelectorAll('.stagger-item'));
    };
    const observeElements = (elements) => { if (!observer) return; elements.forEach((el) => { if (el.classList.contains('stagger-item') && !el.classList.contains('is-visible')) observer.observe(el); }); };

    // Main Initialization Logic
    const seriesId = getQueryParam('id');
    const typeParam = getQueryParam('type');

    if (!seriesId || isNaN(parseInt(seriesId)) || typeParam !== 'series') {
        displayError("ID phim bộ không hợp lệ, bị thiếu hoặc loại nội dung không đúng.");
        if (seriesDetailsSkeleton) seriesDetailsSkeleton.classList.add('hidden');
        if (loadingMessage) loadingMessage.classList.add('hidden');
        return;
    }
    const numericSeriesId = parseInt(seriesId);
    if (loadingMessage) loadingMessage.classList.remove('hidden');
    if (seriesDetailsSkeleton) seriesDetailsSkeleton.classList.remove('hidden');
    loadYouTubeApiScript();

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

        currentSeriesData = allSeriesData.find(s => s.id === numericSeriesId);
        
        if (currentSeriesData) {
            updateMetaTags(currentSeriesData);
            const actualPosterUrl = Array.isArray(currentSeriesData.posterUrl) ? currentSeriesData.posterUrl[0] : currentSeriesData.posterUrl;

            if (seriesPoster) { seriesPoster.src = actualPosterUrl || 'https://placehold.co/400x600/222222/555555?text=No+Poster'; seriesPoster.alt = `Poster phim bộ ${currentSeriesData.title || 'không có tiêu đề'}`; }
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

            // Update data attributes for favorite/watchlist buttons
            if (favoriteButton) {
                favoriteButton.dataset.id = currentSeriesData.id;
            }
            if (watchlistButton) {
                watchlistButton.dataset.id = currentSeriesData.id;
            }
             // Call to initialize button states from favorites.js if it's loaded
            if (typeof initializeFavoriteButtons === 'function') { // Check if function exists
                initializeFavoriteButtons();
                initializeWatchlistButtons(); 
            }


            populateSeasonSelector(currentSeriesData.seasons);
            loadRelatedItems(currentSeriesData);

            setTimeout(() => {
                if (loadingMessage) loadingMessage.classList.add('hidden');
                if (seriesDetailsSkeleton) seriesDetailsSkeleton.classList.add('hidden');
                if (errorMessageContainer) errorMessageContainer.classList.add('hidden');
                if (seriesDetailsContent) seriesDetailsContent.classList.remove('hidden');
            }, 200);
            initObserver();

        } else {
            displayError(`Rất tiếc, không tìm thấy phim bộ bạn yêu cầu (ID: ${numericSeriesId}).`);
        }
    })
    .catch(error => {
        console.error('Lỗi khi tải hoặc xử lý dữ liệu:', error);
        displayError(`Đã xảy ra lỗi khi tải dữ liệu: ${error.message || error}`);
        if (loadingMessage) loadingMessage.classList.add('hidden');
        if (seriesDetailsSkeleton) seriesDetailsSkeleton.classList.add('hidden');
    });

    // Event Listeners Setup
    window.addEventListener('scroll', handleScroll);
    if (scrollToTopButton) scrollToTopButton.addEventListener('click', scrollToTop);
    if (versionSelectionContainer) versionSelectionContainer.addEventListener('click', handleVersionClick);
    if (toggleLightsButton) toggleLightsButton.addEventListener('click', toggleLights);
    if (seasonSelect) seasonSelect.addEventListener('change', handleSeasonChange);
    
    const lightsOverlay = document.getElementById('lights-overlay');
    if (lightsOverlay) lightsOverlay.addEventListener('click', () => { if (document.body.classList.contains('lights-off')) toggleLights(); });
    
    const playFunction = (skipIntro = false) => {
        if (currentVideoUrl) {
            startVideoPlayback(currentVideoUrl, skipIntro);
        } else {
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video.`, false, true);
        }
    };

    if (videoPosterOverlay) videoPosterOverlay.addEventListener('click', () => playFunction(false));
    if (videoPlayButton) videoPlayButton.addEventListener('click', (event) => { event.stopPropagation(); playFunction(false); });
    
    if (skipIntroButton) {
        skipIntroButton.addEventListener('click', () => {
            if (currentVideoUrl && currentActiveVersion) { 
                const isYouTube = !!getYouTubeVideoId(currentVideoUrl); 
                if (isYouTube) playFunction(true); 
                else showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Bỏ qua giới thiệu chỉ khả dụng cho YouTube.`, false, true); 
            } else { 
                showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video trước.`, false, true); 
            }
        });
    }
    console.log("filmDetails_phimBo.js loaded and initialized (v1.5)");
});