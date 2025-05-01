// filmDetails_phimBo.js - Handles Series Details Page Logic
// Enhanced with YouTube API, Skip Intro Option, Show Poster First & Remember Version Preference
// v1.2: Improved YouTube API error message for code 5 and added more detailed logging.

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
    let currentActiveVersion = null; // Key of the active video version (e.g., 'vietsub')
    let currentVideoUrl = null; // URL of the video *ready* to be played
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

    /**
     * Extracts the YouTube video ID from various URL formats.
     * Trích xuất ID video YouTube từ các định dạng URL khác nhau.
     * @param {string} url - The URL to parse. URL cần phân tích.
     * @returns {string|null} The 11-character YouTube video ID or null if not found/invalid. ID video YouTube 11 ký tự hoặc null nếu không tìm thấy/không hợp lệ.
     */
    const getYouTubeVideoId = (url) => {
         if (!url || typeof url !== 'string') {
             console.log("getYouTubeVideoId (Series): URL không hợp lệ hoặc không phải chuỗi:", url);
             return null;
         }
         let videoId = null;
         try {
             const patterns = [
                 /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/, // Standard YouTube URLs
                 /(?:https?:\/\/)?googleusercontent\.com\/youtube\.com\/([\w-]+)(?:\?.*)?$/, // Google User Content URLs
             ];
             for (const pattern of patterns) {
                 const match = url.match(pattern);
                 // Ensure the extracted ID is exactly 11 characters long and contains valid characters
                 // Đảm bảo ID được trích xuất dài đúng 11 ký tự và chứa các ký tự hợp lệ
                 if (match && match[1] && /^[\w-]{11}$/.test(match[1])) {
                     videoId = match[1];
                     console.log(`getYouTubeVideoId (Series): Đã tìm thấy ID hợp lệ '${videoId}' từ URL: ${url}`);
                     break; // Found a valid ID
                 }
             }
             if (!videoId) {
                 console.log(`getYouTubeVideoId (Series): Không tìm thấy ID YouTube hợp lệ trong URL: ${url}`);
             }
         } catch (e) { console.error("Lỗi phân tích URL YouTube (phim bộ):", e, url); }
         return videoId; // Returns null if no valid 11-char ID is found
    };

    const getGoogleDriveEmbedUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        let embedUrl = null;
        try {
            const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
            if (match && match[1]) {
                embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
                console.log(`getGoogleDriveEmbedUrl (Series): Đã tạo URL nhúng: ${embedUrl}`);
            } else {
                 console.log(`getGoogleDriveEmbedUrl (Series): Không tìm thấy ID Google Drive trong URL: ${url}`);
            }
        } catch (e) { console.error("Lỗi phân tích URL Google Drive (phim bộ):", e, url); }
        if (embedUrl) console.warn("Nhúng Google Drive có thể yêu cầu quyền chia sẻ cụ thể.");
        return embedUrl;
    };

    /**
     * Sets the poster image and ensures the player is in the 'poster' state.
     * Đặt ảnh poster và đảm bảo trình phát ở trạng thái 'poster'.
     * @param {object|null} episode - The current episode object, or null. Đối tượng tập hiện tại, hoặc null.
     */
    const setPlayerPoster = (episode = null) => {
        // Ưu tiên thumbnail của tập, sau đó đến ảnh hero của series, cuối cùng là poster series
        const episodeThumbnail = episode?.thumbnailUrl;
        const seriesHeroImage = currentSeriesData?.heroImage;
        const seriesPosterUrl = currentSeriesData?.posterUrl;
        const posterSrc = episodeThumbnail || seriesHeroImage || seriesPosterUrl || 'https://placehold.co/1280x720/000000/333333?text=No+Poster';

        if (videoPosterImage) {
            videoPosterImage.src = posterSrc;
            videoPosterImage.alt = `Poster xem ${currentSeriesData?.title || ''} - ${episode?.title || 'Tập hiện tại'}`;
            console.log("setPlayerPoster (Series): Đã đặt ảnh poster trình phát:", posterSrc);
        }
         // Ensure poster overlay is visible when setting poster
         // Đảm bảo lớp phủ poster hiển thị khi đặt poster
        if (videoPlayerContainer) {
            videoPlayerContainer.classList.remove('playing');
            console.log("setPlayerPoster (Series): Đã xóa lớp 'playing' khỏi video container.");
        }
        // Destroy any existing player if resetting to poster
        // Hủy mọi trình phát hiện có nếu đặt lại về poster
        if (youtubePlayer) {
             try {
                 youtubePlayer.destroy();
                 console.log("setPlayerPoster (Series): Đã hủy trình phát YouTube hiện có.");
             } catch (e) {
                 console.error("setPlayerPoster (Series): Lỗi khi hủy trình phát YouTube:", e);
             }
             youtubePlayer = null;
        }
        if (videoIframePlaceholder) {
             videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; // Ensure div exists but is empty
             videoIframePlaceholder.classList.remove('active'); // Hide placeholder area
             console.log("setPlayerPoster (Series): Đã đặt lại placeholder iframe.");
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
            console.log("Script YouTube API đang được tải (phim bộ).");
            return;
        }
        const tag = document.createElement('script');
        tag.id = 'youtube-api-script';
        tag.src = "https://www.youtube.com/iframe_api"; // Use official API URL
        document.body.appendChild(tag);
        console.log("Đang tải script YouTube API (phim bộ)...");
    }

    /**
     * Global callback function for the YouTube API. Called when the API is ready.
     * Hàm callback toàn cục cho API YouTube. Được gọi khi API sẵn sàng.
     */
     // Use a flag to ensure this is defined only once across both detail scripts
     // Sử dụng cờ để đảm bảo điều này chỉ được định nghĩa một lần trên cả hai script chi tiết
     if (typeof window.ytApiGlobalCallbackDefined === 'undefined') {
         window.onYouTubeIframeAPIReady = function() {
             ytApiReady = true;
             console.log("YouTube API đã sẵn sàng (onYouTubeIframeAPIReady được gọi - định nghĩa bởi phim bộ).");
             // Attempt to play if a video was waiting for the API
             // Thử phát nếu có video đang chờ API
             if (window.pendingYouTubeLoad) {
                 console.log("Phát video đang chờ sau khi API sẵn sàng.");
                 const { videoId, startSeconds } = window.pendingYouTubeLoad;
                 // Need to determine which load function to call based on context if needed
                 // Cần xác định hàm tải nào để gọi dựa trên ngữ cảnh nếu cần
                 // For now, assume it's for the current page context
                 // Hiện tại, giả sử nó dành cho ngữ cảnh trang hiện tại
                 if (typeof loadYouTubePlayer === 'function') {
                     loadYouTubePlayer(videoId, startSeconds);
                 }
                 delete window.pendingYouTubeLoad;
             }
         };
         window.ytApiGlobalCallbackDefined = true;
     } else {
         // If the callback was defined by the other script, just check readiness
         // Nếu callback được định nghĩa bởi script khác, chỉ cần kiểm tra trạng thái sẵn sàng
         if (window.YT && window.YT.Player) {
             ytApiReady = true;
         }
     }


    /**
     * Called when the YouTube player is ready.
     * Được gọi khi trình phát YouTube sẵn sàng.
     * @param {object} event - The event object from the API. Đối tượng sự kiện từ API.
     */
    function onPlayerReady(event) {
        console.log("Trình phát YouTube đã sẵn sàng (onPlayerReady - phim bộ).");
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
            if (youtubePlayer) {
                try {
                    youtubePlayer.destroy(); // Destroy the player instance
                    console.log("Đã hủy trình phát YouTube sau khi kết thúc (phim bộ).");
                } catch (e) {
                    console.error("Lỗi khi hủy trình phát YouTube sau khi kết thúc (phim bộ):", e);
                }
                youtubePlayer = null; // Clear the reference
            }
            const playerDiv = document.getElementById(youtubePlayerDivId);
            if (playerDiv) {
                playerDiv.innerHTML = ''; // Remove the iframe content
            }
            if (videoIframePlaceholder) {
                 videoIframePlaceholder.classList.remove('active'); // Hide placeholder area
            }
        } else if (event.data == YT.PlayerState.PLAYING) {
             // Ensure poster is hidden when playing starts
             // Đảm bảo poster bị ẩn khi bắt đầu phát
             if (videoPlayerContainer && !videoPlayerContainer.classList.contains('playing')) {
                 videoPlayerContainer.classList.add('playing');
                 console.log("Đã thêm lớp 'playing' vào video container (phim bộ).");
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
        // *** NEW: Validate videoId format before proceeding ***
        // *** MỚI: Xác thực định dạng videoId trước khi tiếp tục ***
        if (!videoId || typeof videoId !== 'string' || !/^[\w-]{11}$/.test(videoId)) {
            console.error(`loadYouTubePlayer (Series): ID video YouTube không hợp lệ: "${videoId}". Phải là chuỗi 11 ký tự.`);
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2"></i> ID video YouTube không hợp lệ được cung cấp. Video này không thể phát.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing'); // Show poster
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active'); // Hide iframe area
            // Destroy any potentially broken player instance
            // Hủy mọi phiên bản trình phát có thể bị hỏng
            if (youtubePlayer) {
                try { youtubePlayer.destroy(); } catch(e){}
                youtubePlayer = null;
            }
            return; // Stop execution for this invalid ID
        }

        if (!ytApiReady) {
            console.warn("loadYouTubePlayer (Series): API YouTube chưa sẵn sàng, đang thử tải lại và đặt video vào hàng chờ...");
            loadYouTubeApiScript();
            showVideoMessage("Đang chuẩn bị trình phát YouTube...", false, true);
            // Store the request to be executed when API is ready
            // Lưu yêu cầu để thực thi khi API sẵn sàng
            window.pendingYouTubeLoad = { videoId, startSeconds };
            return;
        }

        hideVideoMessage();
        if (videoIframePlaceholder) videoIframePlaceholder.classList.add('active');

        if (youtubePlayer) {
            try {
                 youtubePlayer.destroy();
                 youtubePlayer = null;
                 console.log("loadYouTubePlayer (Series): Đã hủy trình phát YouTube cũ.");
            } catch (e) {
                 console.error("loadYouTubePlayer (Series): Lỗi khi hủy trình phát YouTube cũ:", e);
            }
        }
         const playerDivTarget = document.getElementById(youtubePlayerDivId);
         if (!playerDivTarget) {
             console.error(`loadYouTubePlayer (Series): Không tìm thấy div trình phát YouTube với ID: ${youtubePlayerDivId}`);
             if (videoIframePlaceholder) {
                 videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`;
                 console.log(`loadYouTubePlayer (Series): Đã tạo lại div #${youtubePlayerDivId}.`);
             } else {
                 showVideoMessage("Lỗi: Không thể tạo vùng chứa trình phát.", true);
                 return;
             }
         } else {
             playerDivTarget.innerHTML = ''; // Clear any previous content
         }


        console.log(`loadYouTubePlayer (Series): Đang tạo trình phát YouTube mới cho video ID: ${videoId}, bắt đầu từ: ${startSeconds}s`);
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
                    'hl': 'vi', // Set language to Vietnamese
                    'cc_load_policy': 1, // Attempt to show captions
                    'start': startSeconds
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange,
                    'onError': (event) => {
                         console.error('Lỗi trình phát YouTube (onError - Series):', event.data);
                          // Provide more specific error messages based on event.data
                         // Cung cấp thông báo lỗi cụ thể hơn dựa trên event.data
                         let errorMsg = `Lỗi trình phát YouTube: ${event.data}`;
                         switch(event.data) {
                             case 2: errorMsg = "Yêu cầu chứa giá trị tham số không hợp lệ (ID video có thể sai)."; break;
                             case 5: errorMsg = "Lỗi liên quan đến trình phát HTML5. Video có thể bị giới hạn phát nhúng, riêng tư, đã bị xóa hoặc có vấn đề về tương thích trình duyệt."; break; // ** IMPROVED MESSAGE **
                             case 100: errorMsg = "Không tìm thấy video yêu cầu (có thể đã bị xóa hoặc ID sai)."; break;
                             case 101:
                             case 150: errorMsg = "Chủ sở hữu video không cho phép phát video này trên các trang web khác."; break;
                             default: errorMsg = `Đã xảy ra lỗi không xác định khi tải video (${event.data}).`;
                         }
                         showVideoMessage(`<i class="fas fa-exclamation-circle mr-2"></i> ${errorMsg}`, true);
                         if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
                         if (youtubePlayer) {
                             try { youtubePlayer.destroy(); } catch(e) {}
                             youtubePlayer = null;
                         }
                         const playerDiv = document.getElementById(youtubePlayerDivId);
                         if(playerDiv) playerDiv.innerHTML = '';
                         if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
                    }
                }
            });
            if (videoPlayerContainer) videoPlayerContainer.classList.add('playing');
        } catch (error) {
             console.error("Lỗi khi tạo trình phát YouTube (try/catch - Series):", error);
             showVideoMessage("Không thể khởi tạo trình phát YouTube do lỗi.", true);
             if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
             if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
        }
    }

    // --- Updated startVideoPlayback ---
    /**
     * Starts video playback using the appropriate method (YouTube API or iframe).
     * Bắt đầu phát video bằng phương pháp thích hợp (API YouTube hoặc iframe).
     * Called only on explicit user action (play/skip buttons).
     * Chỉ được gọi khi có hành động rõ ràng của người dùng (nút phát/bỏ qua).
     * @param {string|null} urlToPlay - The URL of the video to play. URL của video cần phát.
     * @param {boolean} [shouldSkipIntro=false] - Whether to add the 'start' parameter for skipping intro (YouTube only). Có thêm tham số 'start' để bỏ qua giới thiệu hay không (chỉ YouTube).
     */
    const startVideoPlayback = (urlToPlay, shouldSkipIntro = false) => {
        console.log(`startVideoPlayback (Series): Yêu cầu phát: ${urlToPlay}, Bỏ qua Intro: ${shouldSkipIntro}`);
        // Destroy any existing YouTube player first
        // Hủy mọi trình phát YouTube hiện có trước
        if (youtubePlayer) {
            try {
                youtubePlayer.destroy();
                console.log("startVideoPlayback (Series): Đã hủy trình phát YT hiện có trước khi bắt đầu phát mới.");
            } catch(e) { console.error("startVideoPlayback (Series): Lỗi khi hủy trình phát YT cũ:", e); }
            youtubePlayer = null;
        }
         // Clear the placeholder content and ensure target div exists
         // Xóa nội dung placeholder và đảm bảo div mục tiêu tồn tại
         if (videoIframePlaceholder) {
            videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`;
            videoIframePlaceholder.classList.remove('active'); // Hide placeholder initially
         } else {
             console.error("startVideoPlayback (Series): Video iframe placeholder not found.");
             return;
         }

        if (!urlToPlay) {
            console.error("startVideoPlayback (Series): Không có URL video hợp lệ để phát.");
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2" aria-hidden="true"></i>Không có URL video hợp lệ để phát.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing'); // Show poster
            return;
        }

        // currentVideoUrl should already be set by prepareVideoPlayback
        // currentVideoUrl nên đã được đặt bởi prepareVideoPlayback
        hideVideoMessage(); // Clear any previous messages

        const youtubeId = getYouTubeVideoId(urlToPlay); // This now returns null for invalid IDs
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
            console.log(`startVideoPlayback (Series): Chuẩn bị phát YouTube: ${youtubeId}, Bỏ qua: ${shouldSkipIntro}, Giây bắt đầu: ${effectiveStartSeconds}`);
            if (videoIframePlaceholder) videoIframePlaceholder.classList.add('active'); // Show placeholder area
            // loadYouTubePlayer will handle the invalid ID check
            // loadYouTubePlayer sẽ xử lý kiểm tra ID không hợp lệ
            loadYouTubePlayer(youtubeId, effectiveStartSeconds);
        } else if (googleDriveEmbedUrl) {
            console.log("startVideoPlayback (Series): Chuẩn bị phát Google Drive:", googleDriveEmbedUrl);
            if (videoIframePlaceholder) {
                 videoIframePlaceholder.innerHTML = `<iframe src="${googleDriveEmbedUrl}" frameborder="0" allow="autoplay; fullscreen" title="Trình phát video Google Drive cho ${playerTitleText}"></iframe>`;
                 videoIframePlaceholder.classList.add('active'); // Show placeholder area
                 if (videoPlayerContainer) videoPlayerContainer.classList.add('playing'); // Hide poster
            }
        } else {
            // Handle unsupported URL format or URLs that didn't yield a valid YouTube ID
            // Xử lý định dạng URL không được hỗ trợ hoặc URL không trả về ID YouTube hợp lệ
            console.error("startVideoPlayback (Series): Định dạng URL không được hỗ trợ hoặc ID YouTube không hợp lệ:", urlToPlay);
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2" aria-hidden="true"></i>Định dạng video không được hỗ trợ hoặc URL không hợp lệ.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing'); // Show poster on error
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

        const isYouTube = !!getYouTubeVideoId(activeUrl); // Check if the active URL has a VALID YouTube ID

        if (isYouTube && skipSeconds > 0) {
            skipIntroButton.dataset.skipSeconds = skipSeconds; // Store seconds in data attribute
            skipIntroButton.classList.remove('hidden');
            console.log(`Nút Bỏ qua Intro hiển thị cho video YouTube (phim bộ, bỏ qua ${skipSeconds}s).`);
        } else {
            skipIntroButton.classList.add('hidden');
            console.log(`Nút Bỏ qua Intro bị ẩn (Không phải YouTube hợp lệ hoặc skipSeconds=0 - phim bộ).`);
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
        console.log(`updateVersionButtonStates (Series): Phiên bản hoạt động: ${currentActiveVersion}, URL sẵn sàng: ${currentVideoUrl}`);


        // Hiển thị thông báo nếu không có URL nào cho tập này
        if (!hasAnyUrl) {
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Rất tiếc, không có phiên bản video nào khả dụng cho tập này.`, false, true);
             setPlayerPoster(currentSeriesData?.seasons?.[currentSelectedSeasonIndex]?.episodes?.[currentSelectedEpisodeIndex]); // Reset poster
        } else if (currentActiveVersion === null && activeVersionKey && !availableUrls[activeVersionKey]) {
             showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${activeVersionKey}" không có sẵn cho tập này.`, false, true);
        } else {
             hideVideoMessage(); // Ẩn thông báo nếu có URL hợp lệ được chọn hoặc có sẵn
        }
        // Update skip button visibility whenever version changes
        // Cập nhật hiển thị nút bỏ qua bất cứ khi nào phiên bản thay đổi
        updateSkipIntroButtonVisibility();
    };

    // --- START: localStorage Functions ---
    /**
     * Saves the preferred version for a series to localStorage.
     * Lưu phiên bản ưu tiên cho một phim bộ vào localStorage.
     * @param {number} seriesId - The ID of the series. ID của phim bộ.
     * @param {string} versionKey - The selected version key. Khóa phiên bản đã chọn.
     */
    const saveVersionPreference = (seriesId, versionKey) => {
        if (!seriesId || !versionKey) return;
        try {
            // Use a distinct prefix for series preferences
            // Sử dụng tiền tố riêng cho lựa chọn phim bộ
            localStorage.setItem(`seriesPref_${seriesId}_version`, versionKey);
            console.log(`Đã lưu lựa chọn phiên bản '${versionKey}' cho phim bộ ID ${seriesId}`);
        } catch (e) {
            console.error("Lỗi khi lưu lựa chọn vào localStorage (phim bộ):", e);
        }
    };

    /**
     * Loads the preferred version for a series from localStorage.
     * Tải phiên bản ưu tiên cho một phim bộ từ localStorage.
     * @param {number} seriesId - The ID of the series. ID của phim bộ.
     * @returns {string|null} The preferred version key or null. Khóa phiên bản ưu tiên hoặc null.
     */
    const loadVersionPreference = (seriesId) => {
        if (!seriesId) return null;
        try {
            const preferredVersion = localStorage.getItem(`seriesPref_${seriesId}_version`);
            if (preferredVersion) {
                console.log(`Đã tải lựa chọn phiên bản '${preferredVersion}' cho phim bộ ID ${seriesId}`);
            }
            return preferredVersion;
        } catch (e) {
            console.error("Lỗi khi tải lựa chọn từ localStorage (phim bộ):", e);
            return null;
        }
    };
    // --- END: localStorage Functions ---

    // --- START: New function to prepare video without playing ---
    /**
     * Prepares the video player for playback without starting it.
     * Chuẩn bị trình phát video để phát lại mà không cần bắt đầu.
     * Updates UI states, sets the poster, and saves preference.
     * Cập nhật trạng thái giao diện người dùng, đặt poster và lưu lựa chọn.
     * @param {string} versionKey - The version key to prepare. Khóa phiên bản cần chuẩn bị.
     */
    const prepareVideoPlayback = (versionKey) => {
        if (!currentSeriesData) return;
        const season = currentSeriesData.seasons?.[currentSelectedSeasonIndex];
        const episode = season?.episodes?.[currentSelectedEpisodeIndex];
        if (!episode) {
            console.error("prepareVideoPlayback (Series): Không thể chuẩn bị phát: không tìm thấy dữ liệu tập hiện tại.");
            return;
        }

        const availableUrls = episode.videoUrls || {};
        const url = availableUrls[versionKey];

        if (url) {
            console.log(`prepareVideoPlayback (Series): Đang chuẩn bị phiên bản: ${versionKey} cho Tập ${episode.episodeNumber}, URL: ${url}`);
            // Update button states (this also sets currentActiveVersion and currentVideoUrl)
            // Cập nhật trạng thái nút (điều này cũng đặt currentActiveVersion và currentVideoUrl)
            updateVersionButtonStates(availableUrls, versionKey);
            // Set the poster (resets player if it was playing)
            // Đặt poster (đặt lại trình phát nếu nó đang phát)
            setPlayerPoster(episode);
            // Save the preference for the series
            // Lưu lựa chọn cho phim bộ
            saveVersionPreference(currentSeriesData.id, versionKey);
             // Update player title initially
             // Cập nhật tiêu đề trình phát ban đầu
            let playerTitleText = currentSeriesData?.title || 'Không có tiêu đề';
            const seasonNumber = season?.seasonNumber;
            playerTitleText += ` - Mùa ${seasonNumber || '?'} Tập ${episode.episodeNumber}`;
            if (seriesTitlePlayer) seriesTitlePlayer.textContent = `Xem: ${playerTitleText}`;

        } else {
            console.warn(`prepareVideoPlayback (Series): Không tìm thấy URL cho phiên bản: ${versionKey} khi chuẩn bị.`);
            // Update buttons to show this version is not active/available
            // Cập nhật các nút để hiển thị phiên bản này không hoạt động/khả dụng
            updateVersionButtonStates(availableUrls, null); // Pass null to deactivate all if the target is invalid
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${versionKey}" không có sẵn cho tập này.`, false, true);
        }
    };
    // --- END: New function ---


    /**
     * Handles clicks on the version selection buttons. Now prepares instead of playing.
     * Xử lý các lần nhấp vào nút chọn phiên bản. Bây giờ chuẩn bị thay vì phát.
     * @param {Event} event - The click event. Sự kiện nhấp chuột.
     */
    const handleVersionClick = (event) => {
        const button = event.target.closest('.version-button');
        if (!button || button.disabled || !currentSeriesData) return;

        const versionKey = button.dataset.version;
        if (!versionKey) return;

        prepareVideoPlayback(versionKey); // Prepare the selected version
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
        if (ogTitleTag) ogTitleTag.content = errorTitle;
        if (twitterTitleTag) twitterTitleTag.content = errorTitle;
        if (metaDescriptionTag) metaDescriptionTag.content = message;
        if (ogDescriptionTag) ogDescriptionTag.content = message;
        if (twitterDescriptionTag) twitterDescriptionTag.content = message;
        if (ogImageTag) ogImageTag.content = 'https://placehold.co/1200x630/141414/ffffff?text=Error';
        if (twitterImageTag) twitterImageTag.content = 'https://placehold.co/1200x630/141414/ffffff?text=Error';
        if (ogUrlTag) ogUrlTag.content = window.location.href;
        if (twitterUrlTag) twitterUrlTag.content = window.location.href;
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
        // Ensure string splitting handles the limit correctly
        return strData.split(separator).map(s => s.trim()).filter(Boolean).slice(0, limit).join(separator);
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
            // Take the first sentence or first 120 chars
            const firstSentence = series.description.split('.')[0];
            description += (firstSentence.length < 120 ? firstSentence + '.' : series.description.substring(0, 120) + '...');
        } else {
            description += `Thông tin chi tiết, các mùa, tập, diễn viên, đạo diễn, và các phiên bản Vietsub, Thuyết Minh.`;
        }
        description = description.substring(0, 160); // Max length for meta description

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
            loadEpisodeDataAndUpdateUI(currentSelectedEpisodeIndex); // Prepare the first episode
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

        // Load the data for the selected episode and update UI (poster, buttons, etc.)
        // Tải dữ liệu cho tập đã chọn và cập nhật giao diện người dùng (poster, nút, v.v.)
        loadEpisodeDataAndUpdateUI(selectedIndex);
        // Do NOT start playback here. User needs to click play/skip.
        // KHÔNG bắt đầu phát ở đây. Người dùng cần nhấp vào nút phát/bỏ qua.
    };

    /**
     * Loads the data for a specific episode and updates the UI (poster, version buttons, title) without starting playback.
     * Tải dữ liệu cho một tập cụ thể và cập nhật giao diện người dùng (poster, nút phiên bản, tiêu đề) mà không bắt đầu phát.
     * It prepares the player by setting the correct poster and determining the default/preferred version.
     * Nó chuẩn bị trình phát bằng cách đặt poster chính xác và xác định phiên bản mặc định/ưu tiên.
     * @param {number} episodeIndex - The index of the episode to load. Chỉ số của tập cần tải.
     */
    const loadEpisodeDataAndUpdateUI = (episodeIndex) => {
        const season = currentSeriesData?.seasons?.[currentSelectedSeasonIndex];
        const episode = season?.episodes?.[episodeIndex];

        if (!episode) {
            console.error(`loadEpisodeDataAndUpdateUI: Không tìm thấy tập tại index ${episodeIndex} của mùa ${currentSelectedSeasonIndex}.`);
            // Reset player state if episode not found
            // Đặt lại trạng thái trình phát nếu không tìm thấy tập
            setPlayerPoster(); // Reset to series poster
            updateVersionButtonStates({}, null); // Clear version buttons
            currentVideoUrl = null;
            updateSkipIntroButtonVisibility(); // Hide skip button
            return;
        }

        // Update the current selected episode index
        // Cập nhật chỉ số tập hiện được chọn
        currentSelectedEpisodeIndex = episodeIndex;

        // Update UI elements for episode selection
        // Cập nhật các phần tử giao diện người dùng cho việc chọn tập
        if (episodeSelect) episodeSelect.value = episodeIndex.toString(); // Update dropdown if used
        displayEpisodeButtons(season.episodes); // Use new function to highlight button

        // --- Determine the version to prepare (preference or default) ---
        let versionToPrepare = loadVersionPreference(currentSeriesData.id); // Load preference for the series
        const availableUrls = episode.videoUrls || {};

        // Validate the loaded preference for *this specific episode*
        // Xác thực lựa chọn đã tải cho *tập cụ thể này*
        if (!versionToPrepare || !availableUrls[versionToPrepare]) {
             console.log(`loadEpisodeDataAndUpdateUI: Lựa chọn đã lưu '${versionToPrepare}' không hợp lệ/khả dụng cho tập ${episode.episodeNumber}, đang tìm mặc định...`);
             versionToPrepare = null; // Reset if invalid for this episode
             // Find default if no valid preference for this episode
             // Tìm mặc định nếu không có lựa chọn hợp lệ cho tập này
             const versionPriority = ['vietsub', 'dubbed', 'voiceover'];
             for (const key of versionPriority) {
                 if (availableUrls[key]) {
                     versionToPrepare = key;
                     console.log(`loadEpisodeDataAndUpdateUI: Tìm thấy phiên bản mặc định ưu tiên cho tập: ${versionToPrepare}`);
                     break;
                 }
             }
             // Fallback to the first available if none of the preferred exist
             // Dự phòng về cái đầu tiên có sẵn nếu không có cái nào trong số ưu tiên tồn tại
             if (!versionToPrepare) {
                 for (const key in availableUrls) {
                     if (availableUrls[key]) {
                         versionToPrepare = key;
                         console.log(`loadEpisodeDataAndUpdateUI: Tìm thấy phiên bản mặc định dự phòng cho tập: ${versionToPrepare}`);
                         break;
                     }
                 }
             }
        }
        // --- End Determine version ---

        // Prepare the determined version (updates buttons, sets poster, saves pref, sets currentVideoUrl)
        // Chuẩn bị phiên bản đã xác định (cập nhật nút, đặt poster, lưu lựa chọn, đặt currentVideoUrl)
        if (versionToPrepare) {
             prepareVideoPlayback(versionToPrepare);
        } else {
             // Handle case where episode has NO available versions
             // Xử lý trường hợp tập KHÔNG có phiên bản nào khả dụng
             console.warn(`loadEpisodeDataAndUpdateUI: Không có phiên bản video nào cho tập ${episode.episodeNumber}`);
             setPlayerPoster(episode); // Show episode poster if available, otherwise series poster
             updateVersionButtonStates({}, null); // Disable all version buttons
             currentVideoUrl = null;
             updateSkipIntroButtonVisibility();
        }

        console.log(`loadEpisodeDataAndUpdateUI: Đã tải dữ liệu UI cho Mùa ${season?.seasonNumber || '?'} - Tập ${episode.episodeNumber}. Phiên bản chuẩn bị: ${currentActiveVersion || 'None'}. URL sẵn sàng: ${currentVideoUrl}`);
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
            icon.classList.toggle('fa-regular', isLightsOff); // Use regular moon icon
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
        observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delayIndex = parseInt(entry.target.dataset.index || '0', 10);
                    const delay = delayIndex * 100;
                    entry.target.style.animationDelay = `${delay}ms`;
                    entry.target.classList.add('is-visible');
                    observerInstance.unobserve(entry.target); // Unobserve after animating
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
            if (el.classList.contains('animate-on-scroll') && !el.classList.contains('is-visible')) {
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
        allMoviesData = movies || []; // Lưu dữ liệu phim lẻ
        allSeriesData = series || []; // Lưu dữ liệu phim bộ

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


            // Điền dữ liệu vào bộ chọn mùa (sẽ tự động tải và chuẩn bị UI tập đầu tiên)
            populateSeasonSelector(currentSeriesData.seasons);

            // Tải nội dung liên quan
            loadRelatedItems(currentSeriesData);

            // Hiển thị nội dung sau khi tải xong (ẩn skeleton)
            setTimeout(() => {
                if (seriesDetailsSkeleton) seriesDetailsSkeleton.classList.add('hidden');
                if (errorMessageContainer) errorMessageContainer.classList.add('hidden');
                if (seriesDetailsContent) seriesDetailsContent.classList.remove('hidden');
                console.log("Đã hiển thị nội dung chi tiết phim bộ.");
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
    if (versionSelectionContainer) versionSelectionContainer.addEventListener('click', handleVersionClick); // Calls prepareVideoPlayback
    if (toggleLightsButton) toggleLightsButton.addEventListener('click', toggleLights); // Nút tắt/bật đèn
    if (seasonSelect) seasonSelect.addEventListener('change', handleSeasonChange); // Calls loadEpisodeDataAndUpdateUI
    // Trình lắng nghe cho nút tập được thêm động trong displayEpisodeButtons -> calls loadEpisodeDataAndUpdateUI
    // Click listener for the lights-off overlay itself to turn lights back on
    const lightsOverlay = document.getElementById('lights-overlay');
    if (lightsOverlay) lightsOverlay.addEventListener('click', () => {
         if (document.body.classList.contains('lights-off')) {
             toggleLights();
         }
    });

    // Play video when poster overlay or play button is clicked (play WITHOUT skipping intro)
    // Phát video khi nhấp vào lớp phủ poster hoặc nút phát (phát MÀ KHÔNG bỏ qua giới thiệu)
    if (videoPosterOverlay) videoPosterOverlay.addEventListener('click', () => {
        console.log("Poster/Overlay clicked (series). Attempting playback from start...");
        if (currentVideoUrl) {
            startVideoPlayback(currentVideoUrl, false); // Pass false for shouldSkipIntro
        } else {
             console.warn("Cannot play (series): No video version selected or available for the current episode.");
             showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video để phát.`, false, true);
        }
    });
    // Ensure play button click doesn't propagate to overlay if they overlap
    if (videoPlayButton) videoPlayButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent triggering overlay click too
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
            if (currentVideoUrl && currentActiveVersion) {
                const isYouTube = !!getYouTubeVideoId(currentVideoUrl); // Check if it's a valid YT ID
                if (isYouTube) {
                    startVideoPlayback(currentVideoUrl, true); // Pass true for shouldSkipIntro
                } else {
                    console.warn("Bỏ qua giới thiệu chỉ hoạt động với video YouTube hợp lệ (phim bộ).");
                     showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Bỏ qua giới thiệu chỉ khả dụng cho video YouTube hợp lệ.`, false, true);
                }
            } else {
                console.warn("Không thể bỏ qua giới thiệu (phim bộ): Không có URL hoặc phiên bản video đang hoạt động cho tập hiện tại.");
                 showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video trước khi bỏ qua giới thiệu.`, false, true);
            }
        });
    }

}); // End DOMContentLoaded
