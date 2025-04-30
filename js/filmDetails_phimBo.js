// filmDetails_phimBo.js - Handles Series Details Page Logic (Updated for YouTube API & Skip Intro Button)

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
    const relatedContentGrid = document.getElementById('related-content-grid');
    const scrollToTopButton = document.getElementById('scroll-to-top');
    const versionSelectionContainer = document.getElementById('version-selection');
    const versionButtons = versionSelectionContainer ? versionSelectionContainer.querySelectorAll('.version-button') : [];
    const toggleLightsButton = document.getElementById('toggle-lights-button');
    const toggleLightsText = document.getElementById('toggle-lights-text');
    const playerSection = document.getElementById('player-section');
    const relatedContentSection = document.querySelector('#related-content-heading')?.closest('section');

    // --- Series Specific Elements ---
    const seasonSelectorContainer = document.getElementById('season-selector-container');
    const episodeSelectorContainer = document.getElementById('episode-selector-container'); // Optional dropdown
    const episodeListContainer = document.getElementById('episode-list-container'); // Container for episode buttons
    const seasonSelect = document.getElementById('season-select');
    const episodeSelect = document.getElementById('episode-select'); // Optional dropdown

    // --- Player Elements ---
    const videoPosterImage = document.getElementById('video-poster-image');
    const videoPosterOverlay = document.getElementById('video-poster-overlay');
    const videoPlayButton = document.getElementById('video-play-button');
    const videoIframePlaceholder = document.getElementById('video-iframe-placeholder'); // Container for the video iframe/player
    const youtubePlayerDivId = 'youtube-player'; // ID of the div for YT API

    // --- Skip Intro Button Element ---
    const skipIntroButton = document.getElementById('skip-intro-button');

    // --- Meta Tag Elements ---
    // (Keep meta tag elements as before)
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
    let allMoviesData = [];
    let allSeriesData = [];
    let currentSeriesData = null;
    let currentSelectedSeasonIndex = 0;
    let currentSelectedEpisodeIndex = 0;
    let currentActiveVersion = null;
    let currentVideoUrl = null; // Stores the URL of the currently selected episode and version
    let observer;
    let youtubePlayer = null; // Stores the YT.Player instance
    let ytApiReady = false; // Flag to track if YT API is loaded

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
                 if (match && match[1] && /^[\w-]{11}$/.test(match[1])) {
                     videoId = match[1];
                     if (url.includes('https://youtu.be/C3S2vietsub9') || url.includes('https://youtu.be/C3S3vietsub0')) { // Example URLs
                         break;
                     }
                 }
             }
         } catch (e) { console.error("Lỗi phân tích URL YouTube:", e, url); }
         return videoId;
    };

    const getGoogleDriveEmbedUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        let embedUrl = null;
        try {
            const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
            if (match && match[1]) {
                embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
            }
        } catch (e) { console.error("Lỗi phân tích URL Google Drive:", e, url); }
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
         // Ensure poster overlay is visible when setting poster
         // Đảm bảo lớp phủ poster hiển thị khi đặt poster
        if (videoPlayerContainer) {
            videoPlayerContainer.classList.remove('playing');
        }
    };

    // --- YouTube API Functions ---

    /**
     * Loads the YouTube IFrame Player API script asynchronously.
     * Tải script API YouTube IFrame Player một cách bất đồng bộ.
     */
    function loadYouTubeApiScript() {
        if (window.YT && window.YT.Player) {
            ytApiReady = true;
            console.log("YouTube API đã sẵn sàng (đã tải trước đó - phim bộ).");
            return;
        }
        if (document.getElementById('youtube-api-script')) {
            return;
        }
        const tag = document.createElement('script');
        tag.id = 'youtube-api-script';
        tag.src = "https://youtu.be/C3S2vietsub9"; // Same API URL
        document.body.appendChild(tag);
        console.log("Đang tải script YouTube API (phim bộ)...");
    }

    /**
     * Global callback function for the YouTube API. Called when the API is ready.
     * Hàm callback toàn cục cho API YouTube. Được gọi khi API sẵn sàng.
     */
     // Check if the function is already defined by filmDetails.js to avoid conflicts
     // Kiểm tra xem hàm đã được định nghĩa bởi filmDetails.js chưa để tránh xung đột
     if (typeof window.onYouTubeIframeAPIReady !== 'function') {
         window.onYouTubeIframeAPIReady = function() {
             ytApiReady = true;
             console.log("YouTube API đã sẵn sàng (từ phim bộ).");
         };
     } else {
         // If already defined, just set the flag for this script instance
         // Nếu đã được định nghĩa, chỉ cần đặt cờ cho phiên bản script này
         // The global function will handle setting the flag for both scripts
         // Hàm toàn cục sẽ xử lý việc đặt cờ cho cả hai script
         if (window.YT && window.YT.Player) { // Check if API object exists too
             ytApiReady = true;
         }
     }


    /**
     * Called when the YouTube player is ready.
     * Được gọi khi trình phát YouTube sẵn sàng.
     * @param {object} event - The event object from the API. Đối tượng sự kiện từ API.
     */
    function onPlayerReady(event) {
        console.log("Trình phát YouTube đã sẵn sàng (phim bộ).");
        event.target.playVideo(); // Start playing
    }

    /**
     * Called when the YouTube player's state changes.
     * Được gọi khi trạng thái của trình phát YouTube thay đổi.
     * @param {object} event - The event object containing the new state. Đối tượng sự kiện chứa trạng thái mới.
     */
    function onPlayerStateChange(event) {
        console.log("Trạng thái trình phát YouTube thay đổi (phim bộ):", event.data);
        if (event.data == YT.PlayerState.ENDED) {
            console.log("Video YouTube đã kết thúc (phim bộ).");
            // Show poster and replay button
            // Hiển thị poster và nút xem lại
            if (videoPlayerContainer) {
                videoPlayerContainer.classList.remove('playing'); // Show poster overlay
            }
             // Destroy the player to prevent related videos and clean up
             // Hủy trình phát để ngăn video liên quan và dọn dẹp
            if (youtubePlayer) {
                try {
                    youtubePlayer.destroy(); // Destroy the player instance
                } catch (e) {
                    console.error("Lỗi khi hủy trình phát YouTube (phim bộ):", e);
                }
                youtubePlayer = null; // Clear the reference
            }
            // Clear the div where the player was
            // Xóa div chứa trình phát
            const playerDiv = document.getElementById(youtubePlayerDivId);
            if (playerDiv) {
                playerDiv.innerHTML = ''; // Remove the iframe content
            }
        } else if (event.data == YT.PlayerState.PLAYING) {
             // Ensure poster is hidden when playing starts
             // Đảm bảo poster bị ẩn khi bắt đầu phát
             if (videoPlayerContainer && !videoPlayerContainer.classList.contains('playing')) {
                 videoPlayerContainer.classList.add('playing');
             }
        }
    }

    /**
     * Creates or loads a new video into the YouTube player instance.
     * Tạo hoặc tải video mới vào phiên bản trình phát YouTube.
     * @param {string} videoId - The YouTube video ID. ID video YouTube.
     * @param {number} [startSeconds=0] - Time in seconds to start the video. Thời gian tính bằng giây để bắt đầu video.
     */
    function loadYouTubePlayer(videoId, startSeconds = 0) {
        if (!ytApiReady) {
            console.warn("API YouTube chưa sẵn sàng (phim bộ), đang thử tải lại...");
            loadYouTubeApiScript();
            showVideoMessage("Đang chuẩn bị trình phát YouTube...", false, true);
            setTimeout(() => loadYouTubePlayer(videoId, startSeconds), 1000);
            return;
        }

        hideVideoMessage();
        if (videoIframePlaceholder) videoIframePlaceholder.classList.add('active');

        if (youtubePlayer) {
            try {
                 youtubePlayer.destroy();
                 youtubePlayer = null;
                 console.log("Đã hủy trình phát YouTube cũ (phim bộ).");
            } catch (e) {
                 console.error("Lỗi khi hủy trình phát YouTube cũ (phim bộ):", e);
            }
        }
         if (!document.getElementById(youtubePlayerDivId)) {
             console.error(`Không tìm thấy div trình phát YouTube với ID: ${youtubePlayerDivId} (phim bộ)`);
             if (videoIframePlaceholder) {
                 videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`;
                 console.log(`Đã tạo lại div #${youtubePlayerDivId} (phim bộ).`);
             } else {
                 showVideoMessage("Lỗi: Không thể tạo vùng chứa trình phát.", true);
                 return;
             }
         } else {
             document.getElementById(youtubePlayerDivId).innerHTML = '';
         }


        console.log(`Đang tạo trình phát YouTube mới (phim bộ) cho video ID: ${videoId}, bắt đầu từ: ${startSeconds}s`);
        try {
            youtubePlayer = new YT.Player(youtubePlayerDivId, {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    'playsinline': 1,
                    'autoplay': 1,
                    'rel': 0,
                    'modestbranding': 1,
                    'iv_load_policy': 3,
                    'hl': 'vi',
                    'cc_load_policy': 1,
                    'start': startSeconds
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange,
                    'onError': (event) => {
                         console.error('Lỗi trình phát YouTube (phim bộ):', event.data);
                         showVideoMessage(`Lỗi trình phát YouTube: ${event.data}`, true);
                         if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
                         if (youtubePlayer) youtubePlayer.destroy();
                         youtubePlayer = null;
                         const playerDiv = document.getElementById(youtubePlayerDivId);
                         if(playerDiv) playerDiv.innerHTML = '';
                    }
                }
            });
            if (videoPlayerContainer) videoPlayerContainer.classList.add('playing');
        } catch (error) {
             console.error("Lỗi khi tạo trình phát YouTube (phim bộ):", error);
             showVideoMessage("Không thể khởi tạo trình phát YouTube.", true);
             if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
        }
    }

    // --- Updated startVideoPlayback ---
    /**
     * Starts video playback using the appropriate method (YouTube API or iframe).
     * Bắt đầu phát video bằng phương pháp thích hợp (API YouTube hoặc iframe).
     * @param {string|null} urlToPlay - The URL of the video to play. URL của video cần phát.
     * @param {boolean} [shouldSkipIntro=false] - Whether to add the 'start' parameter for skipping intro (YouTube only). Có thêm tham số 'start' để bỏ qua giới thiệu hay không (chỉ YouTube).
     */
    const startVideoPlayback = (urlToPlay, shouldSkipIntro = false) => {
        // Destroy any existing YouTube player first
        // Hủy mọi trình phát YouTube hiện có trước
        if (youtubePlayer) {
            try {
                youtubePlayer.destroy();
            } catch(e) { console.error("Lỗi khi hủy trình phát YT cũ (phim bộ):", e); }
            youtubePlayer = null;
        }
         // Clear the placeholder content and ensure target div exists
         // Xóa nội dung placeholder và đảm bảo div mục tiêu tồn tại
         if (videoIframePlaceholder) {
            videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`;
            videoIframePlaceholder.classList.remove('active');
         } else {
             console.error("Video iframe placeholder not found (phim bộ).");
             return;
         }

        if (!urlToPlay) {
            console.error("Không có URL video hợp lệ để phát (phim bộ).");
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2" aria-hidden="true"></i>Không có URL video hợp lệ để phát.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            return;
        }

        // currentVideoUrl is updated elsewhere based on selection, no need to set it here again
        // currentVideoUrl được cập nhật ở nơi khác dựa trên lựa chọn, không cần đặt lại ở đây
        hideVideoMessage();

        const youtubeId = getYouTubeVideoId(urlToPlay);
        const googleDriveEmbedUrl = getGoogleDriveEmbedUrl(urlToPlay);
        const skipSeconds = currentSeriesData?.skipIntroSeconds || 0; // Use series skip time
        const effectiveStartSeconds = shouldSkipIntro ? skipSeconds : 0;

        // Lấy thông tin tập và mùa hiện tại để hiển thị tiêu đề
        const season = currentSeriesData?.seasons?.[currentSelectedSeasonIndex];
        const episode = season?.episodes?.[currentSelectedEpisodeIndex];
        let playerTitleText = currentSeriesData?.title || 'Không có tiêu đề';
        if (episode) {
             const seasonNumber = season?.seasonNumber;
             playerTitleText += ` - Mùa ${seasonNumber || '?'} Tập ${episode.episodeNumber}`;
        }


        if (youtubeId) {
            console.log(`Chuẩn bị phát YouTube (phim bộ): ${youtubeId}, Bỏ qua: ${shouldSkipIntro}, Giây bắt đầu: ${effectiveStartSeconds}`);
            if (videoIframePlaceholder) videoIframePlaceholder.classList.add('active');
            loadYouTubePlayer(youtubeId, effectiveStartSeconds); // Use API
        } else if (googleDriveEmbedUrl) {
            console.log("Chuẩn bị phát Google Drive (phim bộ):", googleDriveEmbedUrl);
            if (videoIframePlaceholder) {
                 videoIframePlaceholder.innerHTML = `<iframe src="${googleDriveEmbedUrl}" frameborder="0" allow="autoplay; fullscreen" title="Trình phát video Google Drive cho ${playerTitleText}"></iframe>`;
                 videoIframePlaceholder.classList.add('active');
                 if (videoPlayerContainer) videoPlayerContainer.classList.add('playing');
            }
        } else {
            console.error("Định dạng URL không được hỗ trợ (phim bộ):", urlToPlay);
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2" aria-hidden="true"></i>Định dạng video không được hỗ trợ hoặc URL không hợp lệ.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
             if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
        }
         // Update player title
         // Cập nhật tiêu đề trình phát
         if (seriesTitlePlayer) seriesTitlePlayer.textContent = `Xem: ${playerTitleText}`;
    };


    // --- Function to update Skip Intro button visibility ---
    /**
     * Updates the visibility and data of the "Skip Intro" button for series.
     * Cập nhật trạng thái hiển thị và dữ liệu của nút "Bỏ qua giới thiệu" cho phim bộ.
     */
    const updateSkipIntroButtonVisibility = () => {
        if (!skipIntroButton || !currentSeriesData || currentActiveVersion === null) {
            if (skipIntroButton) skipIntroButton.classList.add('hidden');
            return;
        }

        const skipSeconds = currentSeriesData.skipIntroSeconds || 0;
        // Get the URL of the currently active version of the currently selected episode
        // Lấy URL của phiên bản đang hoạt động của tập hiện được chọn
        const season = currentSeriesData.seasons?.[currentSelectedSeasonIndex];
        const episode = season?.episodes?.[currentSelectedEpisodeIndex];
        const activeUrl = episode?.videoUrls?.[currentActiveVersion];

        const isYouTube = !!getYouTubeVideoId(activeUrl); // Check if the active URL is YouTube

        if (isYouTube && skipSeconds > 0) {
            skipIntroButton.dataset.skipSeconds = skipSeconds; // Store seconds in data attribute
            skipIntroButton.classList.remove('hidden');
            console.log(`Nút Bỏ qua Intro hiển thị cho video YouTube (phim bộ, bỏ qua ${skipSeconds}s).`);
        } else {
            skipIntroButton.classList.add('hidden');
            console.log(`Nút Bỏ qua Intro bị ẩn (Không phải YouTube hoặc skipSeconds=0 - phim bộ).`);
        }
    };


    /**
     * Updates the state (active/disabled) of the version selection buttons for the current episode.
     * Cập nhật trạng thái (hoạt động/bị vô hiệu hóa) của các nút chọn phiên bản cho tập hiện tại.
     * @param {object} availableUrls - Object containing available video URLs for the episode. Đối tượng chứa các URL video có sẵn cho tập phim.
     * @param {string|null} activeVersionKey - The key of the currently active version. Khóa của phiên bản hiện đang hoạt động.
     */
    const updateVersionButtonStates = (availableUrls, activeVersionKey) => {
        availableUrls = availableUrls || {}; // Đảm bảo là object
        let hasAnyUrl = false;
        versionButtons.forEach(button => {
            const version = button.dataset.version;
            const hasUrl = !!availableUrls[version]; // Kiểm tra URL có tồn tại và truthy không
            button.disabled = !hasUrl; // Vô hiệu hóa nếu không có URL
            button.classList.toggle('active', version === activeVersionKey && hasUrl);
            button.setAttribute('aria-pressed', String(version === activeVersionKey && hasUrl));
            if (hasUrl) hasAnyUrl = true;
        });
        currentActiveVersion = availableUrls[activeVersionKey] ? activeVersionKey : null;
        // Update the ready-to-play URL based on the active version
        // Cập nhật URL sẵn sàng phát dựa trên phiên bản đang hoạt động
        currentVideoUrl = availableUrls[currentActiveVersion] || null;


        // Hiển thị thông báo nếu không có URL nào cho tập này
        if (!hasAnyUrl) {
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Rất tiếc, không có phiên bản video nào khả dụng cho tập này.`, false, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            if (videoIframePlaceholder) videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; // Reset placeholder
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
            setPlayerPoster(currentSeriesData?.seasons?.[currentSelectedSeasonIndex]?.episodes?.[currentSelectedEpisodeIndex]); // Reset poster
            // currentVideoUrl is already null
        } else if (currentActiveVersion === null && activeVersionKey && !availableUrls[activeVersionKey]) {
             showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${activeVersionKey}" không có sẵn cho tập này.`, false, true);
        } else {
             hideVideoMessage(); // Ẩn thông báo nếu có URL hợp lệ được chọn hoặc có sẵn
        }
        // Update skip button visibility whenever version changes
        // Cập nhật hiển thị nút bỏ qua bất cứ khi nào phiên bản thay đổi
        updateSkipIntroButtonVisibility();
    };

    /**
     * Handles clicks on the version selection buttons.
     * Xử lý các lần nhấp vào nút chọn phiên bản.
     * @param {Event} event - The click event. Sự kiện nhấp chuột.
     */
    const handleVersionClick = (event) => {
        const button = event.target.closest('.version-button');
        if (!button || button.disabled || !currentSeriesData) return;

        const versionKey = button.dataset.version;
        const season = currentSeriesData.seasons?.[currentSelectedSeasonIndex];
        const episode = season?.episodes?.[currentSelectedEpisodeIndex];
        const availableUrls = episode?.videoUrls || {};
        const url = availableUrls[versionKey];

        if (url) {
            // Cập nhật trạng thái nút (cũng cập nhật currentVideoUrl) và bắt đầu phát (KHÔNG bỏ qua intro)
            updateVersionButtonStates(availableUrls, versionKey);
            startVideoPlayback(url, false); // Pass false for shouldSkipIntro
        } else {
            console.warn(`Không tìm thấy URL cho phiên bản: ${versionKey} của tập ${episode?.episodeNumber}`);
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${versionKey}" không có sẵn cho tập này.`, false, true);
        }
    };

    /**
     * Displays a general error message on the page.
     * Hiển thị thông báo lỗi chung trên trang.
     * @param {string} [message="Rất tiếc, đã xảy ra lỗi."] - The error message to display. Thông báo lỗi cần hiển thị.
     */
    const displayError = (message = "Rất tiếc, đã xảy ra lỗi.") => {
        if (loadingMessage) loadingMessage.classList.add('hidden');
        if (seriesDetailsSkeleton) seriesDetailsSkeleton.classList.add('hidden');
        if (seriesDetailsContent) seriesDetailsContent.classList.add('hidden');
        if (errorMessageContainer) errorMessageContainer.classList.remove('hidden');
        if (errorTextElement) errorTextElement.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i> ${message}`;
        const errorTitle = "Lỗi - Không tìm thấy phim bộ";
        if (pageTitleElement) pageTitleElement.textContent = errorTitle;
        // Update other meta tags for error state if needed
        // Cập nhật các thẻ meta khác cho trạng thái lỗi nếu cần
    };

    /**
     * Formats array data into a display string.
     * Định dạng dữ liệu mảng thành chuỗi hiển thị.
     * @param {Array<string>|string} data - Input data. Dữ liệu đầu vào.
     * @param {string} [separator=', '] - Separator. Dấu phân cách.
     * @param {number} [limit=Infinity] - Limit. Giới hạn.
     * @returns {string} Formatted string or 'N/A'. Chuỗi đã định dạng hoặc 'N/A'.
     */
    const formatArrayData = (data, separator = ', ', limit = Infinity) => {
        if (Array.isArray(data)) {
            return data.filter(item => typeof item === 'string' && item.trim())
                       .slice(0, limit).join(separator) || 'N/A'; // Return 'N/A' if empty after filtering
        }
        const strData = (typeof data === 'string' && data.trim()) ? data : 'N/A';
        if (strData === 'N/A') return 'N/A';
        return strData.split(separator).slice(0, limit).join(separator);
    };

    /**
     * Creates the HTML for a related content card.
     * Tạo HTML cho thẻ nội dung liên quan.
     * @param {object} item - Movie or series data. Dữ liệu phim hoặc phim bộ.
     * @param {string} type - 'movies' or 'series'.
     * @returns {string} HTML string for the card. Chuỗi HTML cho thẻ.
     */
    const createRelatedItemCard = (item, type) => {
        const detailPageUrl = type === 'series'
            ? `filmDetails_phimBo.html?id=${item.id}&type=series`
            : `filmDetail.html?id=${item.id}&type=movies`;
        const altText = `Poster ${type === 'movies' ? 'phim' : 'phim bộ'} liên quan: ${item.title || 'không có tiêu đề'}, năm ${item.releaseYear || 'không rõ'}`;
        const typeBadge = type === 'series' ? `<span class="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">Bộ</span>` : '';
        const posterUrl = item.posterUrl || 'https://placehold.co/300x450/111111/eeeeee?text=No+Poster';
        const titleText = item.title || 'Không có tiêu đề';
        const yearText = item.releaseYear || 'N/A';
        // Thêm loading="lazy"
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
     * Loads and displays related content.
     * Tải và hiển thị nội dung liên quan.
     * @param {object} currentSeries - The data of the series currently being viewed. Dữ liệu của phim bộ đang được xem.
     */
    const loadRelatedItems = (currentSeries) => {
        if (!currentSeries || !relatedContentGrid) {
            if(relatedContentGrid) relatedContentGrid.innerHTML = '<p class="text-text-muted col-span-full">Không thể tải nội dung liên quan.</p>';
            return;
        }

        const currentGenres = Array.isArray(currentSeries.genre) ? currentSeries.genre : (typeof currentSeries.genre === 'string' ? [currentSeries.genre] : []);
        const currentSeriesId = currentSeries.id;

        if (observer) observer.disconnect(); // Ngắt observer cũ
        if (currentGenres.length === 0) {
            relatedContentGrid.innerHTML = '<p class="text-text-muted col-span-full">Không có thông tin thể loại để tìm nội dung tương tự.</p>';
            return;
        }

        // Lọc phim bộ liên quan (cùng thể loại, khác ID)
        const relatedSeries = allSeriesData.filter(s => {
            const seriesGenres = Array.isArray(s.genre) ? s.genre : (typeof s.genre === 'string' ? [s.genre] : []);
            return s.id !== currentSeriesId && seriesGenres.some(g => currentGenres.includes(g));
        }).map(item => ({ item, type: 'series' }));

        // Lọc phim lẻ liên quan (cùng thể loại)
        const relatedMovies = allMoviesData.filter(m => {
            const movieGenres = Array.isArray(m.genre) ? m.genre : (typeof m.genre === 'string' ? [m.genre] : []);
            return movieGenres.some(g => currentGenres.includes(g));
        }).map(item => ({ item, type: 'movies' }));

        // Kết hợp, xáo trộn, giới hạn
        const allRelated = [...relatedSeries, ...relatedMovies]
            .sort(() => 0.5 - Math.random())
            .slice(0, 6); // Giới hạn 6 mục

        // Hiển thị
        if (allRelated.length > 0) {
            relatedContentGrid.innerHTML = allRelated.map(({ item, type }, index) => {
                 const cardHTML = createRelatedItemCard(item, type);
                 const cardWithIndex = cardHTML.replace('<a ', `<a data-index="${index}" `); // Thêm data-index
                 return cardWithIndex;
            }).join('');
            // Quan sát các thẻ mới
            observeElements(relatedContentGrid.querySelectorAll('.related-movie-card.animate-on-scroll'));
        } else {
            relatedContentGrid.innerHTML = '<p class="text-text-muted col-span-full">Không tìm thấy nội dung nào tương tự.</p>';
        }
    };

    /**
     * Updates meta tags for SEO and social sharing.
     * Cập nhật thẻ meta cho SEO và chia sẻ trên mạng xã hội.
     * @param {object} series - The series data object. Đối tượng dữ liệu phim bộ.
     */
    const updateMetaTags = (series) => {
        const pageUrl = window.location.href;
        const seriesTitleText = series.title || 'Phim bộ không có tiêu đề';
        const seriesYearText = series.releaseYear ? `(${series.releaseYear})` : '';
        const fullTitle = `Phim Bộ: ${seriesTitleText} ${seriesYearText} - Xem Online Vietsub, Thuyết Minh`;

        let description = `Xem phim bộ ${seriesTitleText} ${seriesYearText} online. `;
        if (series.description) {
            description += series.description.substring(0, 120) + '...';
        } else {
            description += `Thông tin chi tiết, các mùa, tập, diễn viên, đạo diễn, và các phiên bản Vietsub, Thuyết Minh.`;
        }
        description = description.substring(0, 160);

        const genresText = formatArrayData(series.genre, ', ');
        const keywords = `xem phim bộ ${seriesTitleText}, ${seriesTitleText} online, ${seriesTitleText} vietsub, ${seriesTitleText} thuyết minh, ${genresText}, phim bộ ${series.releaseYear || ''}, ${series.director || ''}, ${formatArrayData(series.cast, ', ', 3)}`;

        // Cập nhật thẻ chuẩn
        if (pageTitleElement) pageTitleElement.textContent = fullTitle;
        if (metaDescriptionTag) metaDescriptionTag.content = description;
        if (metaKeywordsTag) metaKeywordsTag.content = keywords;

        // Cập nhật thẻ Open Graph
        if (ogUrlTag) ogUrlTag.content = pageUrl;
        if (ogTitleTag) ogTitleTag.content = fullTitle;
        if (ogDescriptionTag) ogDescriptionTag.content = description;
        if (ogImageTag) ogImageTag.content = series.posterUrl || 'https://placehold.co/1200x630/141414/ffffff?text=Series+Poster';
        if (ogTypeTag) ogTypeTag.content = 'video.tv_show';
        if (ogVideoDirectorTag) ogVideoDirectorTag.content = series.director || '';
        if (ogVideoActorTag) ogVideoActorTag.content = formatArrayData(series.cast, ', ', 4);
        if (ogVideoReleaseDateTag && series.releaseYear) ogVideoReleaseDateTag.content = series.releaseYear.toString();

        // Cập nhật thẻ Twitter Card
        if (twitterUrlTag) twitterUrlTag.content = pageUrl;
        if (twitterTitleTag) twitterTitleTag.content = fullTitle;
        if (twitterDescriptionTag) twitterDescriptionTag.content = description;
        if (twitterImageTag) twitterImageTag.content = series.posterUrl || 'https://placehold.co/1200x630/141414/ffffff?text=Series+Poster';

        console.log("Đã cập nhật thẻ meta cho phim bộ:", seriesTitleText);
    };

    // --- Series Specific Functions ---

    /**
     * Populates the season selector dropdown.
     * Điền dữ liệu vào dropdown chọn mùa.
     * @param {Array} seasons - Array of season objects. Mảng các đối tượng mùa.
     */
    const populateSeasonSelector = (seasons) => {
        if (!seasonSelect || !seasons || seasons.length === 0) {
            if (seasonSelectorContainer) seasonSelectorContainer.classList.add('hidden');
            return;
        }
        if (seasonSelectorContainer) seasonSelectorContainer.classList.remove('hidden');
        seasonSelect.innerHTML = '';
        seasons.forEach((season, index) => {
            const option = document.createElement('option');
            option.value = index.toString();
            option.textContent = `Mùa ${season.seasonNumber}`;
            if (index === currentSelectedSeasonIndex) option.selected = true;
            seasonSelect.appendChild(option);
        });
        handleSeasonChange(); // Load episodes for the first season
    };

    /**
     * Populates the episode selector dropdown (optional).
     * Điền dữ liệu vào dropdown chọn tập (tùy chọn).
     * @param {Array} episodes - Array of episode objects. Mảng các đối tượng tập.
     */
    const populateEpisodeSelector = (episodes) => {
        // Keep this function for potential future use, but hide the dropdown
        // Giữ hàm này để sử dụng trong tương lai, nhưng ẩn dropdown
        if (!episodeSelect || !episodes || episodes.length === 0) {
            if (episodeSelectorContainer) episodeSelectorContainer.classList.add('hidden');
            return;
        }
        // if (episodeSelectorContainer) episodeSelectorContainer.classList.remove('hidden'); // Keep hidden
        episodeSelect.innerHTML = '';
        episodes.forEach((episode, index) => {
            const option = document.createElement('option');
            option.value = index.toString();
            option.textContent = `Tập ${episode.episodeNumber}: ${episode.title || 'Chưa có tên'}`;
            if (index === currentSelectedEpisodeIndex) option.selected = true;
            episodeSelect.appendChild(option);
        });
    };

    /**
     * Displays episode selection buttons (compact style).
     * Hiển thị các nút chọn tập (kiểu gọn).
     * @param {Array} episodes - Array of episode objects for the current season. Mảng các đối tượng tập cho mùa hiện tại.
     */
    const displayEpisodeButtons = (episodes) => {
        if (!episodeListContainer) return;

        if (!episodes || episodes.length === 0) {
            episodeListContainer.innerHTML = '<p class="text-text-muted text-sm italic col-span-full">Không có tập nào cho mùa này.</p>';
            // Ensure container uses flex for the message too
            // Đảm bảo container cũng sử dụng flex cho thông báo
            episodeListContainer.className = 'flex flex-wrap gap-2'; // Use classes from CSS
            return;
        }

        // Use flex layout defined in CSS for episode-list-container
        // Sử dụng layout flex được định nghĩa trong CSS cho episode-list-container
        episodeListContainer.className = 'flex flex-wrap gap-2'; // Match CSS

        episodeListContainer.innerHTML = episodes.map((episode, index) => {
            const isActive = index === currentSelectedEpisodeIndex;
            // Use the new CSS class 'episode-button'
            // Sử dụng lớp CSS mới 'episode-button'
            const activeClass = isActive ? 'active' : ''; // Add 'active' class if it's the current episode
            const episodeNumber = episode.episodeNumber || (index + 1); // Fallback to index + 1 if number missing

            return `
                <button class="episode-button ${activeClass}"
                        data-episode-index="${index}"
                        aria-current="${isActive ? 'true' : 'false'}"
                        aria-label="Chọn Tập ${episodeNumber}"
                        title="Xem Tập ${episodeNumber}${episode.title ? ': ' + episode.title : ''}">
                    ${episodeNumber}
                </button>
            `;
        }).join('');

        // Add event listeners to the new buttons
        // Thêm trình lắng nghe sự kiện vào các nút mới
        episodeListContainer.querySelectorAll('.episode-button').forEach(button => {
            button.addEventListener('click', handleEpisodeSelection);
        });

        // Optional: Scroll the active button into view
        // Tùy chọn: Cuộn nút đang hoạt động vào chế độ xem
        const activeButton = episodeListContainer.querySelector(`.episode-button.active`);
        // if (activeButton) {
            // activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        // }
    };

    /**
     * Handles the season selection change event.
     * Xử lý sự kiện thay đổi lựa chọn mùa.
     */
    const handleSeasonChange = () => {
        if (!seasonSelect || !currentSeriesData) return;
        currentSelectedSeasonIndex = parseInt(seasonSelect.value, 10);
        currentSelectedEpisodeIndex = 0; // Reset to first episode of the new season

        const season = currentSeriesData.seasons?.[currentSelectedSeasonIndex];
        if (season) {
            populateEpisodeSelector(season.episodes); // Keep for potential future use
            displayEpisodeButtons(season.episodes); // Use the new function
            loadEpisodeDataAndUpdateUI(currentSelectedEpisodeIndex); // Load data without playing
        } else {
            // Handle error case where season data is missing
            // Xử lý trường hợp lỗi khi thiếu dữ liệu mùa
            if (episodeSelectorContainer) episodeSelectorContainer.classList.add('hidden');
            if (episodeListContainer) {
                 episodeListContainer.innerHTML = '<p class="text-text-muted text-sm italic col-span-full">Lỗi tải dữ liệu mùa.</p>';
                 episodeListContainer.className = 'flex flex-wrap gap-2'; // Match CSS
            }
            // Reset player state
            // Đặt lại trạng thái trình phát
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            if (videoIframePlaceholder) videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; // Reset placeholder
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
            setPlayerPoster(); // Reset to default series poster
            updateVersionButtonStates({}, null); // Clear version buttons
            currentVideoUrl = null;
            updateSkipIntroButtonVisibility(); // Hide skip button
        }
    };

    /**
     * Handles the episode selection event (from button click).
     * Xử lý sự kiện chọn tập (từ lần nhấp nút).
     * @param {Event} event - The click event. Sự kiện nhấp chuột.
     */
    const handleEpisodeSelection = (event) => {
        let selectedIndex;
        // Check if the click came from the episode dropdown (if used) or the button list
        // Kiểm tra xem lần nhấp đến từ dropdown tập (nếu được sử dụng) hay danh sách nút
        if (event.target.id === 'episode-select') {
            selectedIndex = parseInt(event.target.value, 10);
        } else {
            // Target the new button structure
            // Nhắm mục tiêu cấu trúc nút mới
            const button = event.target.closest('.episode-button');
            if (!button) return; // Exit if click wasn't on a button
            selectedIndex = parseInt(button.dataset.episodeIndex, 10);
        }

        if (isNaN(selectedIndex) || selectedIndex === currentSelectedEpisodeIndex) return; // Ignore if invalid or same episode

        currentSelectedEpisodeIndex = selectedIndex; // Update the current index

        const season = currentSeriesData?.seasons?.[currentSelectedSeasonIndex];
        const episode = season?.episodes?.[currentSelectedEpisodeIndex];

        // Update UI (highlight the new button)
        // Cập nhật giao diện người dùng (làm nổi bật nút mới)
        if (episodeSelect) episodeSelect.value = selectedIndex.toString(); // Update dropdown if used
        displayEpisodeButtons(season?.episodes); // Re-render buttons to apply 'active' class

        if (!episode) {
             console.error(`Không tìm thấy tập tại index ${selectedIndex}`);
             displayError("Không thể tải thông tin tập phim.");
             // Reset player
             // Đặt lại trình phát
             if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
             if (videoIframePlaceholder) videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; // Reset placeholder
             if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
             setPlayerPoster();
             updateVersionButtonStates({}, null);
             currentVideoUrl = null;
             updateSkipIntroButtonVisibility();
             return;
        }

        // Find the default URL and start playback WITHOUT skipping intro
        // Tìm URL mặc định và bắt đầu phát MÀ KHÔNG bỏ qua giới thiệu
        let defaultVersionKey = null;
        let defaultUrl = null;
        let availableUrls = episode.videoUrls || {};
        const versionPriority = ['vietsub', 'dubbed', 'voiceover'];
        for (const key of versionPriority) {
            if (availableUrls[key]) {
                defaultVersionKey = key;
                defaultUrl = availableUrls[key];
                break;
            }
        }
        if (!defaultVersionKey) {
            for (const key in availableUrls) {
                if (availableUrls[key]) {
                    defaultVersionKey = key;
                    defaultUrl = availableUrls[key];
                    break;
                }
            }
        }

        updateVersionButtonStates(availableUrls, defaultVersionKey); // Update version buttons & currentVideoUrl
        setPlayerPoster(episode); // Update poster (might use episode thumbnail)
        startVideoPlayback(defaultUrl, false); // Start playing the video WITHOUT skipping

        console.log(`Đã chọn và bắt đầu phát Mùa ${season?.seasonNumber || '?'} - Tập ${episode.episodeNumber}`);
    };

    /**
     * Loads the data for a specific episode and updates the UI (poster, version buttons, title) without starting playback.
     * Tải dữ liệu cho một tập cụ thể và cập nhật giao diện người dùng (poster, nút phiên bản, tiêu đề) mà không bắt đầu phát.
     * @param {number} episodeIndex - The index of the episode to load. Chỉ số của tập cần tải.
     */
    const loadEpisodeDataAndUpdateUI = (episodeIndex) => {
        const season = currentSeriesData?.seasons?.[currentSelectedSeasonIndex];
        const episode = season?.episodes?.[episodeIndex];

        if (!episode) {
            console.error(`Không tìm thấy tập tại index ${episodeIndex} của mùa ${currentSelectedSeasonIndex} khi load UI.`);
            // Reset player state if episode not found
            // Đặt lại trạng thái trình phát nếu không tìm thấy tập
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            if (videoIframePlaceholder) videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; // Reset placeholder
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
            setPlayerPoster(); // Reset to series poster
            updateVersionButtonStates({}, null); // Clear version buttons
            currentVideoUrl = null;
            updateSkipIntroButtonVisibility(); // Hide skip button
            return;
        }

        // Update the current selected episode index
        // Cập nhật chỉ số tập hiện được chọn
        currentSelectedEpisodeIndex = episodeIndex;

        // Update UI elements
        // Cập nhật các phần tử giao diện người dùng
        if (episodeSelect) episodeSelect.value = episodeIndex.toString(); // Update dropdown if used
        displayEpisodeButtons(season.episodes); // Use new function to highlight button

        // Determine the default URL and version for this episode
        // Xác định URL và phiên bản mặc định cho tập này
        let defaultVersionKey = null;
        let defaultUrl = null;
        let availableUrls = episode.videoUrls || {};
        const versionPriority = ['vietsub', 'dubbed', 'voiceover'];
        for (const key of versionPriority) {
            if (availableUrls[key]) {
                defaultVersionKey = key;
                defaultUrl = availableUrls[key];
                break;
            }
        }
        // Fallback if preferred versions aren't available
        // Dự phòng nếu các phiên bản ưu tiên không có sẵn
        if (!defaultVersionKey) {
            for (const key in availableUrls) {
                if (availableUrls[key]) {
                    defaultVersionKey = key;
                    defaultUrl = availableUrls[key];
                    break;
                }
            }
        }

        // currentVideoUrl is set inside updateVersionButtonStates
        // currentVideoUrl được đặt bên trong updateVersionButtonStates
        setPlayerPoster(episode); // Update poster (might use episode thumbnail)
        updateVersionButtonStates(availableUrls, defaultVersionKey); // Update version buttons (this also updates skip button visibility)
        if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing'); // Ensure poster state
        if (videoIframePlaceholder) videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; // Reset placeholder
        if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active'); // Keep placeholder hidden initially

        // Update player title to reflect the loaded episode
        // Cập nhật tiêu đề trình phát để phản ánh tập đã tải
        let playerTitleText = currentSeriesData?.title || 'Không có tiêu đề';
        const seasonNumber = season?.seasonNumber;
        playerTitleText += ` - Mùa ${seasonNumber || '?'} Tập ${episode.episodeNumber}`;
        if (seriesTitlePlayer) seriesTitlePlayer.textContent = `Xem: ${playerTitleText}`;


        console.log(`Đã tải dữ liệu UI cho Mùa ${season?.seasonNumber || '?'} - Tập ${episode.episodeNumber}. URL sẵn sàng: ${currentVideoUrl}`);
    };


    // --- Scroll & Lights Off ---
    /**
     * Handles the page scroll event.
     * Xử lý sự kiện cuộn trang.
     */
    const handleScroll = () => {
        if (!scrollToTopButton) return;
        const isVisible = window.scrollY > 300;
        scrollToTopButton.classList.toggle('visible', isVisible);
        scrollToTopButton.classList.toggle('hidden', !isVisible);
        scrollToTopButton.setAttribute('aria-hidden', String(!isVisible));
    };

    /**
     * Scrolls the page to the top.
     * Cuộn trang lên đầu.
     */
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /**
     * Toggles the "lights off" mode.
     * Bật/tắt chế độ "tắt đèn".
     */
    const toggleLights = () => {
        const isLightsOff = document.body.classList.toggle('lights-off');
        if (toggleLightsButton) toggleLightsButton.setAttribute('aria-pressed', String(isLightsOff));
        if (toggleLightsText) toggleLightsText.textContent = isLightsOff ? 'Bật đèn' : 'Tắt đèn';
        const icon = toggleLightsButton?.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-lightbulb', !isLightsOff);
            icon.classList.toggle('fa-solid', !isLightsOff);
            icon.classList.toggle('fa-moon', isLightsOff);
        }
        console.log("Đèn đã được:", isLightsOff ? "Tắt" : "Bật");
    };

    // --- Observer ---
    /**
     * Initializes the Intersection Observer.
     * Khởi tạo Intersection Observer.
     */
    const initObserver = () => {
        if (!('IntersectionObserver' in window)) {
            console.warn("Intersection Observer không được hỗ trợ. Hoạt ảnh bị vô hiệu hóa.");
            document.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('is-visible'));
            return;
        }
        const options = { root: null, rootMargin: '0px', threshold: 0.1 };
        observer = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delayIndex = parseInt(entry.target.dataset.index || '0', 10);
                    const delay = delayIndex * 100;
                    entry.target.style.animationDelay = `${delay}ms`;
                    entry.target.classList.add('is-visible');
                    // observer.unobserve(entry.target); // Optional
                }
            });
        }, options);
        observeElements(document.querySelectorAll('.animate-on-scroll'));
    };

    /**
     * Starts observing elements.
     * Bắt đầu quan sát các phần tử.
     * @param {NodeListOf<Element>} elements - Elements to observe. Các phần tử cần quan sát.
     */
    const observeElements = (elements) => {
        if (!observer) return;
        elements.forEach((el) => {
            if (el.dataset.index === undefined && el.classList.contains('animate-on-scroll')) {
                 // Assign index if needed
                 // Gán chỉ số nếu cần
            }
            if (el.classList.contains('animate-on-scroll')) {
                 observer.observe(el);
            }
        });
    };

    // --- Main Logic ---
    // Lấy ID và loại từ URL
    const seriesId = getQueryParam('id');
    const typeParam = getQueryParam('type');

    // Xác thực ID và loại (phải là phim bộ)
    if (!seriesId || isNaN(parseInt(seriesId)) || typeParam !== 'series') {
        console.error("ID phim bộ không hợp lệ, bị thiếu hoặc loại nội dung không đúng.");
        displayError("ID phim bộ không hợp lệ, bị thiếu hoặc loại nội dung không đúng.");
        return; // Dừng thực thi
    }

    const numericSeriesId = parseInt(seriesId);

    // Ẩn thông báo tải ban đầu (skeleton hiển thị mặc định)
    if (loadingMessage) loadingMessage.classList.add('hidden');

    // Tải API YouTube sớm
    loadYouTubeApiScript();

    // Tải dữ liệu phim lẻ (cho phần liên quan) và phim bộ
    Promise.all([
        fetch('../json/filmData.json').then(res => res.ok ? res.json() : Promise.resolve([])), // Trả về mảng trống nếu lỗi
        fetch('../json/filmData_phimBo.json').then(res => {
             if (!res.ok) return Promise.reject(`HTTP error! status: ${res.status} for filmData_phimBo.json`);
             return res.json();
        })
    ])
    .then(([movies, series]) => {
        allMoviesData = movies; // Lưu dữ liệu phim lẻ
        allSeriesData = series; // Lưu dữ liệu phim bộ

        // Tìm phim bộ hiện tại bằng ID
        currentSeriesData = allSeriesData.find(s => s.id === numericSeriesId);

        if (currentSeriesData) {
            // --- Phim bộ được tìm thấy - Cập nhật UI ---
            updateMetaTags(currentSeriesData); // Cập nhật thẻ meta

            // Cập nhật thông tin chi tiết phim bộ
            if (seriesPoster) {
                seriesPoster.src = currentSeriesData.posterUrl || 'https://placehold.co/400x600/222222/555555?text=No+Poster';
                seriesPoster.alt = `Poster phim bộ ${currentSeriesData.title || 'không có tiêu đề'}`;
            }
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


            // Điền dữ liệu vào bộ chọn mùa (sẽ tự động tải UI tập đầu tiên)
            populateSeasonSelector(currentSeriesData.seasons);

            // Tải nội dung liên quan
            loadRelatedItems(currentSeriesData);

            // Hiển thị nội dung sau khi tải xong (ẩn skeleton)
            setTimeout(() => {
                if (seriesDetailsSkeleton) seriesDetailsSkeleton.classList.add('hidden');
                if (errorMessageContainer) errorMessageContainer.classList.add('hidden');
                if (seriesDetailsContent) seriesDetailsContent.classList.remove('hidden');
            }, 150); // Độ trễ nhỏ

            // Khởi tạo observer cho hiệu ứng cuộn
            initObserver();

        } else {
            // --- Không tìm thấy phim bộ ---
            console.error(`Không tìm thấy phim bộ với ID: ${numericSeriesId}`);
            displayError(`Rất tiếc, không tìm thấy phim bộ bạn yêu cầu (ID: ${numericSeriesId}).`);
        }
    })
    .catch(error => {
        // --- Xử lý lỗi tải dữ liệu ---
        console.error('Lỗi khi tải hoặc xử lý dữ liệu:', error);
        displayError(`Đã xảy ra lỗi khi tải dữ liệu: ${error.message || error}`);
    });

    // --- Event Listeners ---
    window.addEventListener('scroll', handleScroll); // Cuộn trang
    if (scrollToTopButton) scrollToTopButton.addEventListener('click', scrollToTop); // Nút cuộn lên đầu
    if (versionSelectionContainer) versionSelectionContainer.addEventListener('click', handleVersionClick); // Nút chọn phiên bản
    if (toggleLightsButton) toggleLightsButton.addEventListener('click', toggleLights); // Nút tắt/bật đèn
    if (seasonSelect) seasonSelect.addEventListener('change', handleSeasonChange); // Thay đổi mùa
    // Trình lắng nghe cho nút tập được thêm động trong displayEpisodeButtons

    // Play video when poster overlay or play button is clicked (play WITHOUT skipping intro)
    // Phát video khi nhấp vào lớp phủ poster hoặc nút phát (phát MÀ KHÔNG bỏ qua giới thiệu)
    if (videoPosterOverlay) videoPosterOverlay.addEventListener('click', () => {
        console.log("Poster/Overlay clicked (series). Attempting playback from start...");
        // Check if a valid version is selected for the current episode
        // Kiểm tra xem phiên bản hợp lệ đã được chọn cho tập hiện tại chưa
        if (currentVideoUrl) {
            startVideoPlayback(currentVideoUrl, false); // Pass false for shouldSkipIntro
        } else {
             console.warn("Cannot play (series): No video version selected or available for the current episode.");
             showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video để phát.`, false, true);
        }
    });
    if (videoPlayButton) videoPlayButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Ngăn chặn kích hoạt listener của overlay
        console.log("Play button clicked (series). Attempting playback from start...");
        if (currentVideoUrl) {
            startVideoPlayback(currentVideoUrl, false); // Pass false for shouldSkipIntro
        } else {
             console.warn("Cannot play (series): No video version selected or available for the current episode.");
             showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video để phát.`, false, true);
        }
    });

    // --- Skip Intro Button Event Listener ---
    if (skipIntroButton) {
        skipIntroButton.addEventListener('click', () => {
            console.log("Nút Bỏ qua Intro đã được nhấp (phim bộ).");
            // Check if there's a valid URL and version selected for the current episode
            // Kiểm tra xem có URL và phiên bản hợp lệ được chọn cho tập hiện tại không
            if (currentVideoUrl && currentActiveVersion) {
                const isYouTube = !!getYouTubeVideoId(currentVideoUrl);
                if (isYouTube) {
                    startVideoPlayback(currentVideoUrl, true); // Pass true for shouldSkipIntro
                } else {
                    console.warn("Bỏ qua giới thiệu chỉ hoạt động với video YouTube (phim bộ).");
                     showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Bỏ qua giới thiệu chỉ khả dụng cho video YouTube.`, false, true);
                }
            } else {
                console.warn("Không thể bỏ qua giới thiệu (phim bộ): Không có URL hoặc phiên bản video đang hoạt động cho tập hiện tại.");
                 showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video trước khi bỏ qua giới thiệu.`, false, true);
            }
        });
    }

}); // End DOMContentLoaded

