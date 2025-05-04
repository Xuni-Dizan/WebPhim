// filmDetails.js - Handles MOVIE Details Page Logic ONLY
// v1.5: Added redirect for anime-movie to animeDetails.html

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements (Movie Specific) ---
    const movieDetailsContent = document.getElementById('movie-details-content');
    const movieDetailsSkeleton = document.getElementById('movie-details-skeleton');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessageContainer = document.getElementById('error-message');
    const errorTextElement = document.getElementById('error-text');
    const movieTitlePlayer = document.getElementById('movie-title-player');
    const videoPlayerContainer = document.getElementById('video-player-container');
    const videoMessageContainer = document.getElementById('video-message');
    const moviePoster = document.getElementById('movie-poster');
    const movieTitle = document.getElementById('movie-title');
    const movieYear = document.getElementById('movie-year');
    const movieGenre = document.getElementById('movie-genre');
    const movieDuration = document.getElementById('movie-duration');
    const movieRating = document.getElementById('movie-rating');
    const movieDescription = document.getElementById('movie-description');
    const movieDirector = document.getElementById('movie-director');
    const movieCast = document.getElementById('movie-cast');
    const relatedMoviesContainer = document.getElementById('related-movies'); // Container for related items
    const scrollToTopButton = document.getElementById('scroll-to-top');
    const versionSelectionContainer = document.getElementById('version-selection');
    const versionButtons = versionSelectionContainer ? versionSelectionContainer.querySelectorAll('.version-button') : [];
    const toggleLightsButton = document.getElementById('toggle-lights-button');
    const toggleLightsText = document.getElementById('toggle-lights-text');

    // --- Player Elements ---
    const videoPosterImage = document.getElementById('video-poster-image');
    const videoPosterOverlay = document.getElementById('video-poster-overlay');
    const videoPlayButton = document.getElementById('video-play-button');
    const videoIframePlaceholder = document.getElementById('video-iframe-placeholder');
    const youtubePlayerDivId = 'youtube-player';

    // --- Skip Intro Button Element ---
    const skipIntroButton = document.getElementById('skip-intro-button');

    // --- Meta Tag Elements ---
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
    let currentMovieData = null; // Data for the current movie being viewed
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
         } catch (e) { console.error("Lỗi phân tích URL YouTube:", e, url); }
         return videoId;
    };

    const getGoogleDriveEmbedUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        let embedUrl = null;
        try {
            const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
            if (match && match[1]) { embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`; }
        } catch (e) { console.error("Lỗi phân tích URL Google Drive:", e, url); }
        if (embedUrl) console.warn("Nhúng Google Drive có thể yêu cầu quyền chia sẻ cụ thể.");
        return embedUrl;
    };

    const setPlayerPoster = () => {
        const playerPosterUrl = currentMovieData?.heroImage || currentMovieData?.posterUrl || 'https://placehold.co/1280x720/000000/333333?text=No+Poster';
        if (videoPosterImage) {
            videoPosterImage.src = playerPosterUrl;
            videoPosterImage.alt = `Poster xem phim ${currentMovieData?.title || 'không có tiêu đề'}`;
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
            ytApiReady = true; console.log("YouTube API đã sẵn sàng (filmDetails).");
            if (window.pendingYouTubeLoad) {
                const { videoId, startSeconds } = window.pendingYouTubeLoad;
                if (typeof loadYouTubePlayer === 'function') loadYouTubePlayer(videoId, startSeconds);
                delete window.pendingYouTubeLoad;
            }
        };
        window.ytApiGlobalCallbackDefined = true;
    } else { if (window.YT && window.YT.Player) ytApiReady = true; }

    function onPlayerReady(event) { console.log("Trình phát YouTube đã sẵn sàng (filmDetails)."); event.target.playVideo(); }
    function onPlayerStateChange(event) {
        if (event.data == YT.PlayerState.ENDED) {
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e){} youtubePlayer = null; }
            const playerDiv = document.getElementById(youtubePlayerDivId); if(playerDiv) playerDiv.innerHTML = '';
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
        } else if (event.data == YT.PlayerState.PLAYING) {
             if (videoPlayerContainer && !videoPlayerContainer.classList.contains('playing')) videoPlayerContainer.classList.add('playing');
        }
    }
    function loadYouTubePlayer(videoId, startSeconds = 0) {
        if (!videoId || typeof videoId !== 'string' || !/^[\w-]{11}$/.test(videoId)) {
            console.error(`loadYouTubePlayer (filmDetails): ID YouTube không hợp lệ: "${videoId}".`);
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2"></i> ID video YouTube không hợp lệ.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
            if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e){} youtubePlayer = null; }
            return;
        }
        if (!ytApiReady) {
            console.warn("loadYouTubePlayer (filmDetails): API YouTube chưa sẵn sàng, đang chờ...");
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
                         console.error('Lỗi trình phát YouTube (filmDetails):', event.data);
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
             console.error("Lỗi khi tạo trình phát YouTube (filmDetails):", error);
             showVideoMessage("Không thể khởi tạo trình phát YouTube.", true);
             if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
             if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
        }
    }

    // --- Updated startVideoPlayback ---
    const startVideoPlayback = (urlToPlay, shouldSkipIntro = false) => {
        console.log(`startVideoPlayback (filmDetails): Yêu cầu phát: ${urlToPlay}, Bỏ qua Intro: ${shouldSkipIntro}`);
        if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e) {} youtubePlayer = null; }
        if (videoIframePlaceholder) { videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; videoIframePlaceholder.classList.remove('active'); }
        else { return; }
        if (!urlToPlay) { showVideoMessage(`<i class="fas fa-exclamation-circle mr-2"></i>Không có URL video hợp lệ.`, true); if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing'); return; }

        hideVideoMessage();
        const youtubeId = getYouTubeVideoId(urlToPlay);
        const googleDriveEmbedUrl = getGoogleDriveEmbedUrl(urlToPlay);
        const skipSeconds = currentMovieData?.skipIntroSeconds || 0;
        const effectiveStartSeconds = shouldSkipIntro ? skipSeconds : 0;
        const playerTitleText = currentMovieData?.title || 'Không có tiêu đề';
        if (movieTitlePlayer) movieTitlePlayer.textContent = `Xem Phim: ${playerTitleText}`;

        if (youtubeId) {
            if (videoIframePlaceholder) videoIframePlaceholder.classList.add('active');
            loadYouTubePlayer(youtubeId, effectiveStartSeconds);
        } else if (googleDriveEmbedUrl) {
            if (videoIframePlaceholder) {
                 videoIframePlaceholder.innerHTML = `<iframe src="${googleDriveEmbedUrl}" frameborder="0" allow="autoplay; fullscreen" title="Trình phát video Google Drive cho phim ${playerTitleText}"></iframe>`;
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
        if (!skipIntroButton || !currentMovieData || !currentActiveVersion) {
            if (skipIntroButton) skipIntroButton.classList.add('hidden');
            return;
        }
        const skipSeconds = currentMovieData.skipIntroSeconds || 0;
        const activeUrl = currentMovieData.videoUrls?.[currentActiveVersion];
        const isYouTube = !!getYouTubeVideoId(activeUrl);
        if (isYouTube && skipSeconds > 0) {
            skipIntroButton.dataset.skipSeconds = skipSeconds;
            skipIntroButton.classList.remove('hidden');
        } else {
            skipIntroButton.classList.add('hidden');
        }
    };

    // --- Version Button State Update ---
    const updateVersionButtonStates = (activeVersionKey) => {
        const availableUrls = currentMovieData?.videoUrls || {};
        let hasAnyUrl = false;
        versionButtons.forEach(button => {
            const version = button.dataset.version;
            if (!version) return;
            const hasUrl = !!availableUrls[version];
            button.disabled = !hasUrl;
            button.classList.toggle('active', version === activeVersionKey && hasUrl);
            button.setAttribute('aria-pressed', String(version === activeVersionKey && hasUrl));
            if (hasUrl) hasAnyUrl = true;
        });
        currentActiveVersion = availableUrls[activeVersionKey] ? activeVersionKey : null;
        currentVideoUrl = availableUrls[currentActiveVersion] || null;
        console.log(`updateVersionButtonStates (filmDetails): Phiên bản hoạt động: ${currentActiveVersion}, URL sẵn sàng: ${currentVideoUrl}`);

        if (!hasAnyUrl) {
             showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Không có phiên bản video nào khả dụng.`, false, true);
             setPlayerPoster();
        } else if (currentActiveVersion === null && activeVersionKey && !availableUrls[activeVersionKey]) {
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${activeVersionKey}" không có sẵn.`, false, true);
        } else {
             hideVideoMessage();
        }
         updateSkipIntroButtonVisibility();
    };

    // --- localStorage Functions ---
    const saveVersionPreference = (movieId, versionKey) => {
        if (!movieId || !versionKey) return;
        try { localStorage.setItem(`moviePref_${movieId}_version`, versionKey); }
        catch (e) { console.error("Lỗi lưu lựa chọn vào localStorage:", e); }
    };
    const loadVersionPreference = (movieId) => {
        if (!movieId) return null;
        try { return localStorage.getItem(`moviePref_${movieId}_version`); }
        catch (e) { console.error("Lỗi tải lựa chọn từ localStorage:", e); return null; }
    };

    // --- Prepare Video Playback (No Auto-Play) ---
    const prepareVideoPlayback = (versionKey) => {
        if (!currentMovieData) return;
        const url = currentMovieData.videoUrls?.[versionKey];
        if (url) {
            updateVersionButtonStates(versionKey);
            setPlayerPoster();
            saveVersionPreference(currentMovieData.id, versionKey);
            const playerTitleText = currentMovieData?.title || 'Không có tiêu đề';
            if (movieTitlePlayer) movieTitlePlayer.textContent = `Xem Phim: ${playerTitleText}`;
        } else {
            updateVersionButtonStates(null);
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${versionKey}" không có sẵn.`, false, true);
        }
    };

    // --- Event Handlers ---
    const handleVersionClick = (event) => {
        const button = event.target.closest('.version-button');
        if (!button || button.disabled || !currentMovieData) return;
        const versionKey = button.dataset.version;
        if (!versionKey) return;
        prepareVideoPlayback(versionKey);
    };

    const displayError = (message = "Rất tiếc, đã xảy ra lỗi.") => {
        if(loadingMessage) loadingMessage.classList.add('hidden');
        if(movieDetailsSkeleton) movieDetailsSkeleton.classList.add('hidden');
        if(movieDetailsContent) movieDetailsContent.classList.add('hidden');
        if(errorMessageContainer) errorMessageContainer.classList.remove('hidden');
        if (errorTextElement) errorTextElement.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i> ${message}`;
        const errorTitle = "Lỗi - Không tìm thấy phim";
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
     * @param {object} currentMovie - The data of the movie currently being viewed. Dữ liệu của phim đang được xem.
     */
    const loadRelatedItems = (currentMovie) => {
        if (!currentMovie || !relatedMoviesContainer) {
            if(relatedMoviesContainer) relatedMoviesContainer.innerHTML = '<p class="text-text-muted col-span-full">Không thể tải nội dung liên quan.</p>';
            return;
        }

        const currentGenres = Array.isArray(currentMovie.genre) ? currentMovie.genre : (typeof currentMovie.genre === 'string' ? [currentMovie.genre] : []);
        const currentMovieId = currentMovie.id;

        if (observer) observer.disconnect();
        if (currentGenres.length === 0) { relatedMoviesContainer.innerHTML = '<p class="text-text-muted col-span-full">Không có thông tin thể loại để tìm nội dung tương tự.</p>'; return; }

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
            // Exclude the current movie itself
            // Loại trừ chính phim hiện tại
            if (item.id === currentMovieId && item.itemType === 'movies') return false;

            const itemGenres = Array.isArray(item.genre) ? item.genre : (typeof item.genre === 'string' ? [item.genre] : []);
            return itemGenres.some(g => currentGenres.includes(g));
        })
        .sort(() => 0.5 - Math.random()) // Randomize
        .slice(0, 6); // Limit

        if (relatedItems.length > 0) {
            relatedMoviesContainer.innerHTML = relatedItems.map((itemData, index) => {
                 const cardHTML = createRelatedItemCard(itemData, itemData.itemType); // Pass itemType
                 const cardWithIndex = cardHTML.replace('<a ', `<a data-index="${index}" `);
                 return cardWithIndex;
            }).join('');
            observeElements(relatedMoviesContainer.querySelectorAll('.related-movie-card.animate-on-scroll'));
        } else {
             relatedMoviesContainer.innerHTML = '<p class="text-text-muted col-span-full">Không tìm thấy nội dung nào tương tự.</p>';
        }
    };

    const updateMetaTags = (movie) => {
        if (!movie) return;
        const pageUrl = window.location.href;
        const movieTitleText = movie.title || 'Phim không có tiêu đề';
        const movieYearText = movie.releaseYear ? `(${movie.releaseYear})` : '';
        const fullTitle = `Phim: ${movieTitleText} ${movieYearText} - Xem Online Vietsub, Thuyết Minh`;
        let description = `Xem phim ${movieTitleText} ${movieYearText} online. `;
        if (movie.description) { const firstSentence = movie.description.split('.')[0]; description += (firstSentence.length < 120 ? firstSentence + '.' : movie.description.substring(0, 120) + '...'); }
        else { description += `Thông tin chi tiết, diễn viên, đạo diễn, và các phiên bản Vietsub, Thuyết minh.`; }
        description = description.substring(0, 160);
        const genresText = formatArrayData(movie.genre, ', ');
        const keywords = `xem phim ${movieTitleText}, ${movieTitleText} online, ${movieTitleText} vietsub, ${movieTitleText} thuyết minh, ${genresText}, phim ${movie.releaseYear || ''}, ${movie.director || ''}, ${formatArrayData(movie.cast, ', ', 3)}`;

        if (pageTitleElement) pageTitleElement.textContent = fullTitle; if (metaDescriptionTag) metaDescriptionTag.content = description; if (metaKeywordsTag) metaKeywordsTag.content = keywords;
        if (ogUrlTag) ogUrlTag.content = pageUrl; if (ogTitleTag) ogTitleTag.content = fullTitle; if (ogDescriptionTag) ogDescriptionTag.content = description;
        if (ogImageTag) ogImageTag.content = movie.posterUrl || 'https://placehold.co/1200x630/141414/ffffff?text=Movie+Poster'; if (ogTypeTag) ogTypeTag.content = 'video.movie';
        if (ogVideoDirectorTag) ogVideoDirectorTag.content = movie.director || ''; if (ogVideoActorTag) ogVideoActorTag.content = formatArrayData(movie.cast, ', ', 4);
        if (ogVideoReleaseDateTag && movie.releaseYear) ogVideoReleaseDateTag.content = movie.releaseYear.toString();
        if (twitterUrlTag) twitterUrlTag.content = pageUrl; if (twitterTitleTag) twitterTitleTag.content = fullTitle; if (twitterDescriptionTag) twitterDescriptionTag.content = description;
        if (twitterImageTag) twitterImageTag.content = movie.posterUrl || 'https://placehold.co/1200x630/141414/ffffff?text=Movie+Poster';
        console.log("Đã cập nhật thẻ meta cho phim:", movieTitleText);
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

    // --- Main Logic ---
    const movieId = getQueryParam('id');
    const typeParam = getQueryParam('type');

    // Redirect anime-movie to animeDetails.html
    if (typeParam === 'anime-movie') {
        const movieId = getQueryParam('id');
        window.location.href = `animeDetails.html?id=${movieId}&type=anime-movie`;
        return;
    }

    if (!movieId || isNaN(parseInt(movieId)) || (typeParam && typeParam !== 'movies' && typeParam !== 'anime-movie')) { // Allow anime-movie here
        let errorMsg = "ID phim không hợp lệ hoặc bị thiếu.";
        if (typeParam && typeParam !== 'movies' && typeParam !== 'anime-movie') errorMsg = "Loại nội dung không hợp lệ cho trang này.";
        console.error(errorMsg, "URL:", window.location.href);
        displayError(errorMsg);
        return;
    }
    const numericMovieId = parseInt(movieId);
    if (loadingMessage) loadingMessage.classList.add('hidden');
    loadYouTubeApiScript();

    // Fetch ALL data types
    // Tải TẤT CẢ các loại dữ liệu
    Promise.all([
        fetch('../json/filmData.json').then(res => res.ok ? res.json() : Promise.reject(`HTTP error! status: ${res.status} fetching filmData.json`)),
        fetch('../json/filmData_phimBo.json').then(res => res.ok ? res.json() : Promise.resolve([])), // Allow series fetch to fail gracefully
        fetch('../json/animeData.json').then(res => res.ok ? res.json() : Promise.resolve([])) // Allow anime fetch to fail gracefully
    ])
    .then(([movies, series, anime]) => {
        allMoviesData = movies || [];
        allSeriesData = series || [];
        allAnimeData = anime || [];

        // Find the current movie (could be from filmData or animeData if it's an anime-movie)
        // Tìm phim hiện tại (có thể từ filmData hoặc animeData nếu là anime-movie)
        currentMovieData = allMoviesData.find(m => m.id === numericMovieId);
        if (!currentMovieData && typeParam === 'anime-movie') {
            currentMovieData = allAnimeData.find(a => a.id === numericMovieId && a.itemType === 'anime-movie');
        }

        if (currentMovieData) {
            updateMetaTags(currentMovieData);

            if(moviePoster) { moviePoster.src = currentMovieData.posterUrl || 'https://placehold.co/400x600/222222/555555?text=No+Poster'; moviePoster.alt = `Poster phim ${currentMovieData.title || 'không có tiêu đề'}`; }
            if(movieTitle) movieTitle.textContent = currentMovieData.title || 'Không có tiêu đề';
            if(movieYear) movieYear.textContent = currentMovieData.releaseYear || 'N/A';
            if(movieGenre) movieGenre.textContent = formatArrayData(currentMovieData.genre);
            if(movieDuration) movieDuration.textContent = currentMovieData.duration || 'N/A';
            if(movieRating) movieRating.textContent = currentMovieData.rating ? `${currentMovieData.rating}` : 'N/A';
            if(movieDescription) movieDescription.textContent = currentMovieData.description || 'Không có mô tả.';
            if(movieDirector) movieDirector.textContent = currentMovieData.director || currentMovieData.studio || 'N/A'; // Use studio as fallback
            if(movieCast) movieCast.textContent = formatArrayData(currentMovieData.cast || currentMovieData.seiyuu); // Use seiyuu as fallback

            // Determine initial version
            // Xác định phiên bản ban đầu
            let initialVersionKey = loadVersionPreference(numericMovieId);
            const availableUrls = currentMovieData.videoUrls || {};
            if (!initialVersionKey || !availableUrls[initialVersionKey]) {
                initialVersionKey = null;
                const versionPriority = ['vietsub', 'dubbed', 'voiceover'];
                for (const key of versionPriority) { if (availableUrls[key]) { initialVersionKey = key; break; } }
                if (!initialVersionKey) { for (const key in availableUrls) { if (availableUrls[key]) { initialVersionKey = key; break; } } }
            }

            // Prepare initial version
            // Chuẩn bị phiên bản ban đầu
            if(initialVersionKey) { prepareVideoPlayback(initialVersionKey); }
            else { updateVersionButtonStates(null); setPlayerPoster(); }

            loadRelatedItems(currentMovieData); // Load related items from all data sources

            setTimeout(() => {
                if(movieDetailsSkeleton) movieDetailsSkeleton.classList.add('hidden');
                if(errorMessageContainer) errorMessageContainer.classList.add('hidden');
                if(movieDetailsContent) movieDetailsContent.classList.remove('hidden');
            }, 150);
            initObserver();

        } else {
            displayError(`Rất tiếc, không tìm thấy phim bạn yêu cầu (ID: ${numericMovieId}).`);
        }
    })
    .catch(error => {
        console.error('Lỗi khi tải hoặc xử lý dữ liệu phim:', error);
        displayError(`Đã xảy ra lỗi khi tải dữ liệu: ${error.message || 'Lỗi không xác định'}`);
    });

    // --- Event Listeners ---
    window.addEventListener('scroll', handleScroll);
    if (scrollToTopButton) scrollToTopButton.addEventListener('click', scrollToTop);
    if (versionSelectionContainer) versionSelectionContainer.addEventListener('click', handleVersionClick);
    if (toggleLightsButton) toggleLightsButton.addEventListener('click', toggleLights);
    const lightsOverlay = document.getElementById('lights-overlay');
    if (lightsOverlay) lightsOverlay.addEventListener('click', () => { if (document.body.classList.contains('lights-off')) toggleLights(); });
    if (videoPosterOverlay) videoPosterOverlay.addEventListener('click', () => { if (currentVideoUrl) startVideoPlayback(currentVideoUrl, false); else showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn phiên bản video.`, false, true); });
    if (videoPlayButton) videoPlayButton.addEventListener('click', (event) => { event.stopPropagation(); if (currentVideoUrl) startVideoPlayback(currentVideoUrl, false); else showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn phiên bản video.`, false, true); });
    if (skipIntroButton) {
        skipIntroButton.addEventListener('click', () => {
            if (currentVideoUrl && currentActiveVersion) { const isYouTube = !!getYouTubeVideoId(currentVideoUrl); if (isYouTube) startVideoPlayback(currentVideoUrl, true); else showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Bỏ qua giới thiệu chỉ khả dụng cho YouTube.`, false, true); }
            else { showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Chọn phiên bản video trước.`, false, true); }
        });
    }

}); // End DOMContentLoaded