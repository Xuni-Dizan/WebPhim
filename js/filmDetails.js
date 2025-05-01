// filmDetails.js - Handles MOVIE Details Page Logic ONLY
// Enhanced with YouTube API, Skip Intro Option, Show Poster First & Remember Version Preference
// v1.2: Improved YouTube API error message for code 5 and added more detailed logging.

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements (Movie Specific) ---
    const movieDetailsContent = document.getElementById('movie-details-content');
    const movieDetailsSkeleton = document.getElementById('movie-details-skeleton');
    const loadingMessage = document.getElementById('loading-message'); // Fallback, hidden initially
    const errorMessageContainer = document.getElementById('error-message');
    const errorTextElement = document.getElementById('error-text');
    const movieTitlePlayer = document.getElementById('movie-title-player');
    const videoPlayerContainer = document.getElementById('video-player-container');
    const videoMessageContainer = document.getElementById('video-message');
    const moviePoster = document.getElementById('movie-poster'); // Main poster below details
    const movieTitle = document.getElementById('movie-title');
    const movieYear = document.getElementById('movie-year');
    const movieGenre = document.getElementById('movie-genre');
    const movieDuration = document.getElementById('movie-duration');
    const movieRating = document.getElementById('movie-rating');
    const movieDescription = document.getElementById('movie-description');
    const movieDirector = document.getElementById('movie-director');
    const movieCast = document.getElementById('movie-cast');
    const relatedMoviesContainer = document.getElementById('related-movies');
    const scrollToTopButton = document.getElementById('scroll-to-top');
    const versionSelectionContainer = document.getElementById('version-selection');
    const versionButtons = versionSelectionContainer ? versionSelectionContainer.querySelectorAll('.version-button') : [];
    const toggleLightsButton = document.getElementById('toggle-lights-button');
    const toggleLightsText = document.getElementById('toggle-lights-text');

    // --- Player Elements ---
    const videoPosterImage = document.getElementById('video-poster-image'); // Poster inside the player
    const videoPosterOverlay = document.getElementById('video-poster-overlay'); // Overlay containing play button
    const videoPlayButton = document.getElementById('video-play-button'); // Play button inside overlay
    const videoIframePlaceholder = document.getElementById('video-iframe-placeholder'); // Container for the video iframe/player
    const youtubePlayerDivId = 'youtube-player'; // ID of the div for YT API

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
    let allMoviesData = [];
    let allSeriesData = [];
    let currentMovieData = null;
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
            console.log("getYouTubeVideoId: URL không hợp lệ hoặc không phải chuỗi:", url);
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
                    console.log(`getYouTubeVideoId: Đã tìm thấy ID hợp lệ '${videoId}' từ URL: ${url}`);
                    break; // Found a valid ID
                }
            }
            if (!videoId) {
                console.log(`getYouTubeVideoId: Không tìm thấy ID YouTube hợp lệ trong URL: ${url}`);
            }
        } catch (e) { console.error("Lỗi phân tích URL YouTube:", e, url); }
        return videoId; // Returns null if no valid 11-char ID is found
    };

    const getGoogleDriveEmbedUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        let embedUrl = null;
        try {
            const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
            if (match && match[1]) {
                embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
                console.log(`getGoogleDriveEmbedUrl: Đã tạo URL nhúng: ${embedUrl}`);
            } else {
                 console.log(`getGoogleDriveEmbedUrl: Không tìm thấy ID Google Drive trong URL: ${url}`);
            }
        } catch (e) { console.error("Lỗi phân tích URL Google Drive:", e, url); }
        if (embedUrl) console.warn("Nhúng Google Drive có thể yêu cầu quyền chia sẻ cụ thể.");
        return embedUrl;
    };

    /**
     * Sets the poster image and ensures the player is in the 'poster' state.
     * Đặt ảnh poster và đảm bảo trình phát ở trạng thái 'poster'.
     */
    const setPlayerPoster = () => {
        const playerPosterUrl = currentMovieData?.heroImage
                               || currentMovieData?.posterUrl
                               || 'https://placehold.co/1280x720/000000/333333?text=No+Poster';
        if (videoPosterImage) {
            videoPosterImage.src = playerPosterUrl;
            videoPosterImage.alt = `Poster xem phim ${currentMovieData?.title || 'không có tiêu đề'}`;
            console.log("setPlayerPoster: Đã đặt ảnh poster trình phát:", playerPosterUrl);
        } else {
            console.warn("setPlayerPoster: Không tìm thấy phần tử ảnh poster video.");
        }
        // Ensure poster overlay is visible when setting poster
        // Đảm bảo lớp phủ poster hiển thị khi đặt poster
        if (videoPlayerContainer) {
            videoPlayerContainer.classList.remove('playing');
            console.log("setPlayerPoster: Đã xóa lớp 'playing' khỏi video container.");
        }
        // Destroy any existing player if resetting to poster
        // Hủy mọi trình phát hiện có nếu đặt lại về poster
        if (youtubePlayer) {
             try {
                 youtubePlayer.destroy();
                 console.log("setPlayerPoster: Đã hủy trình phát YouTube hiện có.");
             } catch (e) {
                 console.error("setPlayerPoster: Lỗi khi hủy trình phát YouTube:", e);
             }
             youtubePlayer = null;
        }
        if (videoIframePlaceholder) {
             videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; // Ensure div exists but is empty
             videoIframePlaceholder.classList.remove('active'); // Hide placeholder area
             console.log("setPlayerPoster: Đã đặt lại placeholder iframe.");
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
            console.log("YouTube API đã sẵn sàng (đã tải trước đó).");
            return;
        }
        if (document.getElementById('youtube-api-script')) {
            console.log("Script YouTube API đang được tải.");
            return;
        }
        const tag = document.createElement('script');
        tag.id = 'youtube-api-script';
        tag.src = "https://www.youtube.com/iframe_api"; // Use official API URL
        document.body.appendChild(tag);
        console.log("Đang tải script YouTube API...");
    }

    /**
     * Global callback function for the YouTube API. Called when the API is ready.
     * Hàm callback toàn cục cho API YouTube. Được gọi khi API sẵn sàng.
     */
    window.onYouTubeIframeAPIReady = function() {
        ytApiReady = true;
        console.log("YouTube API đã sẵn sàng (onYouTubeIframeAPIReady được gọi).");
        // Attempt to play if a video was waiting for the API
        // Thử phát nếu có video đang chờ API
        if (window.pendingYouTubeLoad) {
             console.log("Phát video đang chờ sau khi API sẵn sàng.");
             const { videoId, startSeconds } = window.pendingYouTubeLoad;
             loadYouTubePlayer(videoId, startSeconds);
             delete window.pendingYouTubeLoad;
        }
    };

    /**
     * Called when the YouTube player is ready.
     * Được gọi khi trình phát YouTube sẵn sàng.
     * @param {object} event - The event object from the API. Đối tượng sự kiện từ API.
     */
    function onPlayerReady(event) {
        console.log("Trình phát YouTube đã sẵn sàng (onPlayerReady).");
        event.target.playVideo(); // Start playing
    }

    /**
     * Called when the YouTube player's state changes.
     * Được gọi khi trạng thái của trình phát YouTube thay đổi.
     * @param {object} event - The event object containing the new state. Đối tượng sự kiện chứa trạng thái mới.
     */
    function onPlayerStateChange(event) {
        console.log("Trạng thái trình phát YouTube thay đổi:", event.data);
        if (event.data == YT.PlayerState.ENDED) {
            console.log("Video YouTube đã kết thúc.");
            // Show poster and replay button
            // Hiển thị poster và nút xem lại
            if (videoPlayerContainer) {
                videoPlayerContainer.classList.remove('playing'); // Show poster overlay
            }
            if (youtubePlayer) {
                try {
                    youtubePlayer.destroy(); // Destroy the player instance
                    console.log("Đã hủy trình phát YouTube sau khi kết thúc.");
                } catch (e) {
                    console.error("Lỗi khi hủy trình phát YouTube sau khi kết thúc:", e);
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
                 console.log("Đã thêm lớp 'playing' vào video container.");
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
            console.error(`loadYouTubePlayer: ID video YouTube không hợp lệ: "${videoId}". Phải là chuỗi 11 ký tự.`);
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
            console.warn("loadYouTubePlayer: API YouTube chưa sẵn sàng, đang thử tải lại và đặt video vào hàng chờ...");
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
                 console.log("loadYouTubePlayer: Đã hủy trình phát YouTube cũ.");
            } catch (e) {
                 console.error("loadYouTubePlayer: Lỗi khi hủy trình phát YouTube cũ:", e);
            }
        }
         const playerDivTarget = document.getElementById(youtubePlayerDivId);
         if (!playerDivTarget) {
             console.error(`loadYouTubePlayer: Không tìm thấy div trình phát YouTube với ID: ${youtubePlayerDivId}`);
             if (videoIframePlaceholder) {
                 videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`;
                 console.log(`loadYouTubePlayer: Đã tạo lại div #${youtubePlayerDivId}.`);
             } else {
                 showVideoMessage("Lỗi: Không thể tạo vùng chứa trình phát.", true);
                 return;
             }
         } else {
             playerDivTarget.innerHTML = ''; // Clear any previous content
         }


        console.log(`loadYouTubePlayer: Đang tạo trình phát YouTube mới cho video ID: ${videoId}, bắt đầu từ: ${startSeconds}s`);
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
                         console.error('Lỗi trình phát YouTube (onError):', event.data);
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
             console.error("Lỗi khi tạo trình phát YouTube (try/catch):", error);
             showVideoMessage("Không thể khởi tạo trình phát YouTube do lỗi.", true);
             if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
             if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
        }
    }

    // --- Updated startVideoPlayback ---
    /**
     * Starts video playback using the appropriate method (YouTube API or iframe).
     * Bắt đầu phát video bằng phương pháp thích hợp (API YouTube hoặc iframe).
     * This function is now primarily called by user interaction (play/skip buttons).
     * Hàm này giờ chủ yếu được gọi bởi tương tác người dùng (nút phát/bỏ qua).
     * @param {string|null} urlToPlay - The URL of the video to play. URL của video cần phát.
     * @param {boolean} [shouldSkipIntro=false] - Whether to add the 'start' parameter for skipping intro (YouTube only). Có thêm tham số 'start' để bỏ qua giới thiệu hay không (chỉ YouTube).
     */
    const startVideoPlayback = (urlToPlay, shouldSkipIntro = false) => {
        console.log(`startVideoPlayback: Yêu cầu phát: ${urlToPlay}, Bỏ qua Intro: ${shouldSkipIntro}`);
        // Destroy any existing YouTube player first
        // Hủy mọi trình phát YouTube hiện có trước
        if (youtubePlayer) {
            try {
                youtubePlayer.destroy();
                 console.log("startVideoPlayback: Đã hủy trình phát YT hiện có trước khi bắt đầu phát mới.");
            } catch(e) { console.error("startVideoPlayback: Lỗi khi hủy trình phát YT cũ:", e); }
            youtubePlayer = null;
        }
         // Clear the placeholder content and ensure target div exists
         // Xóa nội dung placeholder và đảm bảo div mục tiêu tồn tại
         if (videoIframePlaceholder) {
            videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`;
            videoIframePlaceholder.classList.remove('active'); // Hide placeholder initially
         } else {
             console.error("startVideoPlayback: Video iframe placeholder not found.");
             return;
         }

        if (!urlToPlay) {
            console.error("startVideoPlayback: Không có URL video hợp lệ để phát.");
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2" aria-hidden="true"></i>Không có URL video hợp lệ để phát.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing'); // Show poster
            return;
        }

        // No need to set currentVideoUrl here, it's set by prepareVideoPlayback
        // Không cần đặt currentVideoUrl ở đây, nó được đặt bởi prepareVideoPlayback
        hideVideoMessage(); // Clear any previous messages

        const youtubeId = getYouTubeVideoId(urlToPlay); // This now returns null for invalid IDs like '0'
        const googleDriveEmbedUrl = getGoogleDriveEmbedUrl(urlToPlay);
        const skipSeconds = currentMovieData?.skipIntroSeconds || 0;
        const effectiveStartSeconds = shouldSkipIntro ? skipSeconds : 0;

        if (youtubeId) {
            console.log(`startVideoPlayback: Chuẩn bị phát YouTube: ${youtubeId}, Bỏ qua: ${shouldSkipIntro}, Giây bắt đầu: ${effectiveStartSeconds}`);
            if (videoIframePlaceholder) videoIframePlaceholder.classList.add('active'); // Show placeholder area
            // loadYouTubePlayer will now handle the invalid ID check internally
            // loadYouTubePlayer giờ sẽ xử lý kiểm tra ID không hợp lệ bên trong
            loadYouTubePlayer(youtubeId, effectiveStartSeconds);
        } else if (googleDriveEmbedUrl) {
            console.log("startVideoPlayback: Chuẩn bị phát Google Drive:", googleDriveEmbedUrl);
            if (videoIframePlaceholder) {
                 videoIframePlaceholder.innerHTML = `<iframe src="${googleDriveEmbedUrl}" frameborder="0" allow="autoplay; fullscreen" title="Trình phát video Google Drive cho phim ${currentMovieData?.title || ''}"></iframe>`;
                 videoIframePlaceholder.classList.add('active'); // Show placeholder area
                 if (videoPlayerContainer) videoPlayerContainer.classList.add('playing'); // Hide poster
            }
        } else {
            // Handle unsupported URL format or URLs that didn't yield a valid YouTube ID
            // Xử lý định dạng URL không được hỗ trợ hoặc URL không trả về ID YouTube hợp lệ
            console.error("startVideoPlayback: Định dạng URL không được hỗ trợ hoặc ID YouTube không hợp lệ:", urlToPlay);
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2" aria-hidden="true"></i>Định dạng video không được hỗ trợ hoặc URL không hợp lệ.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing'); // Show poster on error
             if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
        }
         // Update player title
         // Cập nhật tiêu đề trình phát
         const playerTitleText = currentMovieData?.title || 'Không có tiêu đề';
         if (movieTitlePlayer) movieTitlePlayer.textContent = `Xem Phim: ${playerTitleText}`;
    };

    // --- Function to update Skip Intro button visibility ---
    /**
     * Updates the visibility and data of the "Skip Intro" button.
     * Cập nhật trạng thái hiển thị và dữ liệu của nút "Bỏ qua giới thiệu".
     */
    const updateSkipIntroButtonVisibility = () => {
        if (!skipIntroButton || !currentMovieData || !currentActiveVersion) {
            if (skipIntroButton) skipIntroButton.classList.add('hidden');
            return;
        }

        const skipSeconds = currentMovieData.skipIntroSeconds || 0;
        const activeUrl = currentMovieData.videoUrls?.[currentActiveVersion];
        const isYouTube = !!getYouTubeVideoId(activeUrl); // Check if the active URL has a VALID YouTube ID

        if (isYouTube && skipSeconds > 0) {
            skipIntroButton.dataset.skipSeconds = skipSeconds; // Store seconds in data attribute
            skipIntroButton.classList.remove('hidden');
            console.log(`Nút Bỏ qua Intro hiển thị cho video YouTube (bỏ qua ${skipSeconds}s).`);
        } else {
            skipIntroButton.classList.add('hidden');
            console.log(`Nút Bỏ qua Intro bị ẩn (Không phải YouTube hợp lệ hoặc skipSeconds=0).`);
        }
    };


    /**
     * Updates the state (active/disabled) of the version selection buttons.
     * Cập nhật trạng thái (hoạt động/bị vô hiệu hóa) của các nút chọn phiên bản.
     * @param {string|null} activeVersionKey - The key of the currently selected version (e.g., 'vietsub'). Khóa của phiên bản hiện được chọn (ví dụ: 'vietsub').
     */
    const updateVersionButtonStates = (activeVersionKey) => {
        const availableUrls = currentMovieData?.videoUrls || {};
        let hasAnyUrl = false; // Flag to check if any version has a URL

        versionButtons.forEach(button => {
            const version = button.dataset.version;
            if (!version) return; // Skip if button has no data-version

            const hasUrl = !!availableUrls[version]; // Check if URL exists and is truthy
            button.disabled = !hasUrl; // Disable button if no URL
            button.classList.toggle('active', version === activeVersionKey && hasUrl);
            button.setAttribute('aria-pressed', String(version === activeVersionKey && hasUrl));
            if (hasUrl) hasAnyUrl = true; // Mark if at least one URL is found
        });

        // Update the global state for the active version
        currentActiveVersion = availableUrls[activeVersionKey] ? activeVersionKey : null;
        // Update the ready-to-play URL based on the active version
        // Cập nhật URL sẵn sàng phát dựa trên phiên bản đang hoạt động
        currentVideoUrl = availableUrls[currentActiveVersion] || null;
        console.log(`updateVersionButtonStates: Phiên bản hoạt động: ${currentActiveVersion}, URL sẵn sàng: ${currentVideoUrl}`);


         // If no versions have URLs, show an info message
         // Nếu không có phiên bản nào có URL, hiển thị thông báo thông tin
        if (!hasAnyUrl) {
             showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Rất tiếc, không có phiên bản video nào khả dụng cho phim này.`, false, true);
             setPlayerPoster(); // Reset to default poster
        } else if (currentActiveVersion === null && activeVersionKey && !availableUrls[activeVersionKey]) {
            // If the intended active version has no URL, but others do, show info message
            // Nếu phiên bản dự định kích hoạt không có URL, nhưng các phiên bản khác có, hiển thị thông báo thông tin
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${activeVersionKey}" không có sẵn. Vui lòng chọn phiên bản khác.`, false, true);
        } else {
            // Otherwise, hide any previous messages
            // Ngược lại, ẩn mọi thông báo trước đó
             hideVideoMessage();
        }
         // Update skip button visibility whenever version changes
         // Cập nhật hiển thị nút bỏ qua bất cứ khi nào phiên bản thay đổi
         updateSkipIntroButtonVisibility();
    };

    // --- START: localStorage Functions ---
    /**
     * Saves the preferred version for a movie to localStorage.
     * Lưu phiên bản ưu tiên cho một phim vào localStorage.
     * @param {number} movieId - The ID of the movie. ID của phim.
     * @param {string} versionKey - The selected version key ('vietsub', 'dubbed', etc.). Khóa phiên bản đã chọn.
     */
    const saveVersionPreference = (movieId, versionKey) => {
        if (!movieId || !versionKey) return;
        try {
            localStorage.setItem(`moviePref_${movieId}_version`, versionKey);
            console.log(`Đã lưu lựa chọn phiên bản '${versionKey}' cho phim ID ${movieId}`);
        } catch (e) {
            console.error("Lỗi khi lưu lựa chọn vào localStorage:", e);
        }
    };

    /**
     * Loads the preferred version for a movie from localStorage.
     * Tải phiên bản ưu tiên cho một phim từ localStorage.
     * @param {number} movieId - The ID of the movie. ID của phim.
     * @returns {string|null} The preferred version key or null. Khóa phiên bản ưu tiên hoặc null.
     */
    const loadVersionPreference = (movieId) => {
        if (!movieId) return null;
        try {
            const preferredVersion = localStorage.getItem(`moviePref_${movieId}_version`);
            if (preferredVersion) {
                console.log(`Đã tải lựa chọn phiên bản '${preferredVersion}' cho phim ID ${movieId}`);
            }
            return preferredVersion;
        } catch (e) {
            console.error("Lỗi khi tải lựa chọn từ localStorage:", e);
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
        if (!currentMovieData) return;

        const url = currentMovieData.videoUrls?.[versionKey];

        if (url) {
            console.log(`prepareVideoPlayback: Đang chuẩn bị phiên bản: ${versionKey}, URL: ${url}`);
            // Update button states (this also sets currentActiveVersion and currentVideoUrl)
            // Cập nhật trạng thái nút (điều này cũng đặt currentActiveVersion và currentVideoUrl)
            updateVersionButtonStates(versionKey);
            // Set the poster (resets player if it was playing)
            // Đặt poster (đặt lại trình phát nếu nó đang phát)
            setPlayerPoster();
            // Save the preference
            // Lưu lựa chọn
            saveVersionPreference(currentMovieData.id, versionKey);
             // Update player title initially
             // Cập nhật tiêu đề trình phát ban đầu
             const playerTitleText = currentMovieData?.title || 'Không có tiêu đề';
             if (movieTitlePlayer) movieTitlePlayer.textContent = `Xem Phim: ${playerTitleText}`;

        } else {
            console.warn(`prepareVideoPlayback: Không tìm thấy URL cho phiên bản: ${versionKey} khi chuẩn bị.`);
            // Update buttons to show this version is not active/available
            // Cập nhật các nút để hiển thị phiên bản này không hoạt động/khả dụng
            updateVersionButtonStates(null); // Pass null to deactivate all if the target is invalid
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${versionKey}" không có sẵn.`, false, true);
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
        if (!button || button.disabled || !currentMovieData) return;

        const versionKey = button.dataset.version;
        if (!versionKey) return;

        prepareVideoPlayback(versionKey); // Prepare the selected version
    };

    /**
     * Displays a general error message on the page, hiding content and skeleton.
     * Hiển thị thông báo lỗi chung trên trang, ẩn nội dung và skeleton.
     * @param {string} [message="Rất tiếc, đã xảy ra lỗi."] - The error message to display. Thông báo lỗi cần hiển thị.
     */
    const displayError = (message = "Rất tiếc, đã xảy ra lỗi.") => {
        if(loadingMessage) loadingMessage.classList.add('hidden');
        if(movieDetailsSkeleton) movieDetailsSkeleton.classList.add('hidden');
        if(movieDetailsContent) movieDetailsContent.classList.add('hidden');
        if(errorMessageContainer) errorMessageContainer.classList.remove('hidden');
        if (errorTextElement) errorTextElement.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i> ${message}`;
        else console.error("Không tìm thấy phần tử văn bản lỗi.");

        const errorTitle = "Lỗi - Không tìm thấy phim";
        if (pageTitleElement) pageTitleElement.textContent = errorTitle;
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
     * Formats array data (like genres, cast) into a display string.
     * Định dạng dữ liệu mảng (như thể loại, diễn viên) thành chuỗi hiển thị.
     * @param {Array<string>|string} data - Input data (array or string). Dữ liệu đầu vào (mảng hoặc chuỗi).
     * @param {string} [separator=', '] - Separator for joining array elements. Dấu phân cách để nối các phần tử mảng.
     * @param {number} [limit=Infinity] - Maximum number of elements to include. Số lượng phần tử tối đa để bao gồm.
     * @returns {string} Formatted string or 'N/A'. Chuỗi đã định dạng hoặc 'N/A'.
     */
    const formatArrayData = (data, separator = ', ', limit = Infinity) => {
        if (Array.isArray(data)) {
            const filteredData = data.filter(item => typeof item === 'string' && item.trim());
            if (filteredData.length === 0) return 'N/A';
            return filteredData.slice(0, limit).join(separator);
        }
        const strData = (typeof data === 'string' && data.trim()) ? data : 'N/A';
        if (strData === 'N/A') return 'N/A';
        // Ensure string splitting handles the limit correctly
        return strData.split(separator).map(s => s.trim()).filter(Boolean).slice(0, limit).join(separator);
    };

    /**
     * Creates the HTML for a related content card (movie or series).
     * Tạo HTML cho thẻ nội dung liên quan (phim hoặc phim bộ).
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

         // Added loading="lazy" to the img tag
         // Đã thêm loading="lazy" vào thẻ img
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
     * Loads and displays related content (movies and series) based on genre similarity.
     * Tải và hiển thị nội dung liên quan (phim và phim bộ) dựa trên sự tương đồng về thể loại.
     * @param {object} currentMovie - The data of the movie currently being viewed. Dữ liệu của phim đang được xem.
     */
    const loadRelatedItems = (currentMovie) => {
        if (!currentMovie || !relatedMoviesContainer) {
            if(relatedMoviesContainer) relatedMoviesContainer.innerHTML = '<p class="text-text-muted col-span-full">Không thể tải nội dung liên quan.</p>';
            else console.error("Không tìm thấy container phim liên quan.");
            return;
        }

        const currentGenres = Array.isArray(currentMovie.genre) ? currentMovie.genre : (typeof currentMovie.genre === 'string' ? [currentMovie.genre] : []);
        const currentMovieId = currentMovie.id;

        if (observer) observer.disconnect();

        if (currentGenres.length === 0) {
             relatedMoviesContainer.innerHTML = '<p class="text-text-muted col-span-full">Không có thông tin thể loại để tìm nội dung tương tự.</p>';
             return;
        }

        const relatedMovies = allMoviesData.filter(m => {
            if (m.id === currentMovieId) return false;
            const movieGenres = Array.isArray(m.genre) ? m.genre : (typeof m.genre === 'string' ? [m.genre] : []);
            return movieGenres.some(g => currentGenres.includes(g));
        }).map(item => ({ item, type: 'movies' }));

        const relatedSeries = allSeriesData.filter(s => {
            const seriesGenres = Array.isArray(s.genre) ? s.genre : (typeof s.genre === 'string' ? [s.genre] : []);
            return seriesGenres.some(g => currentGenres.includes(g));
        }).map(item => ({ item, type: 'series' }));

        const allRelated = [...relatedMovies, ...relatedSeries]
            .sort(() => 0.5 - Math.random()) // Randomize related items
            .slice(0, 6); // Limit to 6 items

        if (allRelated.length > 0) {
            relatedMoviesContainer.innerHTML = allRelated.map(({ item, type }, index) => {
                 const cardHTML = createRelatedItemCard(item, type);
                 // Add data-index for animation staggering
                 const cardWithIndex = cardHTML.replace('<a ', `<a data-index="${index}" `);
                 return cardWithIndex;
            }).join('');
            // Observe the newly added elements
            observeElements(relatedMoviesContainer.querySelectorAll('.related-movie-card.animate-on-scroll'));
        } else {
             relatedMoviesContainer.innerHTML = '<p class="text-text-muted col-span-full">Không tìm thấy nội dung nào tương tự.</p>';
        }
    };

    /**
     * Updates meta tags for SEO and social sharing.
     * Cập nhật thẻ meta cho SEO và chia sẻ trên mạng xã hội.
     * @param {object} movie - The movie data object. Đối tượng dữ liệu phim.
     */
    const updateMetaTags = (movie) => {
        if (!movie) return;

        const pageUrl = window.location.href;
        const movieTitleText = movie.title || 'Phim không có tiêu đề';
        const movieYearText = movie.releaseYear ? `(${movie.releaseYear})` : '';
        const fullTitle = `Phim: ${movieTitleText} ${movieYearText} - Xem Online Vietsub, Thuyết Minh`;

        let description = `Xem phim ${movieTitleText} ${movieYearText} online. `;
        if (movie.description) {
            // Take the first sentence or first 120 chars
            const firstSentence = movie.description.split('.')[0];
            description += (firstSentence.length < 120 ? firstSentence + '.' : movie.description.substring(0, 120) + '...');
        } else {
            description += `Thông tin chi tiết, diễn viên, đạo diễn, và các phiên bản Vietsub, Thuyết minh.`;
        }
        description = description.substring(0, 160); // Max length for meta description

        const genresText = formatArrayData(movie.genre, ', ');
        const keywords = `xem phim ${movieTitleText}, ${movieTitleText} online, ${movieTitleText} vietsub, ${movieTitleText} thuyết minh, ${genresText}, phim ${movie.releaseYear || ''}, ${movie.director || ''}, ${formatArrayData(movie.cast, ', ', 3)}`;

        // Update standard meta tags
        if (pageTitleElement) pageTitleElement.textContent = fullTitle;
        if (metaDescriptionTag) metaDescriptionTag.content = description;
        if (metaKeywordsTag) metaKeywordsTag.content = keywords;

        // Update Open Graph meta tags
        if (ogUrlTag) ogUrlTag.content = pageUrl;
        if (ogTitleTag) ogTitleTag.content = fullTitle;
        if (ogDescriptionTag) ogDescriptionTag.content = description;
        if (ogImageTag) ogImageTag.content = movie.posterUrl || 'https://placehold.co/1200x630/141414/ffffff?text=Movie+Poster';
        if (ogTypeTag) ogTypeTag.content = 'video.movie';
        if (ogVideoDirectorTag) ogVideoDirectorTag.content = movie.director || '';
        if (ogVideoActorTag) ogVideoActorTag.content = formatArrayData(movie.cast, ', ', 4);
        if (ogVideoReleaseDateTag && movie.releaseYear) ogVideoReleaseDateTag.content = movie.releaseYear.toString();

        // Update Twitter Card meta tags
        if (twitterUrlTag) twitterUrlTag.content = pageUrl;
        if (twitterTitleTag) twitterTitleTag.content = fullTitle;
        if (twitterDescriptionTag) twitterDescriptionTag.content = description;
        if (twitterImageTag) twitterImageTag.content = movie.posterUrl || 'https://placehold.co/1200x630/141414/ffffff?text=Movie+Poster';

        console.log("Đã cập nhật thẻ meta cho phim:", movieTitleText);
    };

    // --- Scroll & Lights Off ---
    const handleScroll = () => {
        if (!scrollToTopButton) return;
        const isVisible = window.scrollY > 300;
        // Use classList.toggle for cleaner logic
        scrollToTopButton.classList.toggle('visible', isVisible);
        scrollToTopButton.classList.toggle('hidden', !isVisible);
        scrollToTopButton.setAttribute('aria-hidden', String(!isVisible));
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleLights = () => {
        const isLightsOff = document.body.classList.toggle('lights-off');
        if (toggleLightsButton) toggleLightsButton.setAttribute('aria-pressed', String(isLightsOff));
        if (toggleLightsText) toggleLightsText.textContent = isLightsOff ? 'Bật đèn' : 'Tắt đèn';
        const icon = toggleLightsButton?.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-lightbulb', !isLightsOff);
            icon.classList.toggle('fa-solid', !isLightsOff); // Ensure solid is used when on
            icon.classList.toggle('fa-moon', isLightsOff);
            icon.classList.toggle('fa-regular', isLightsOff); // Use regular moon icon
        }
        console.log("Đèn đã được:", isLightsOff ? "Tắt" : "Bật");
    };

    // --- Observer ---
    const initObserver = () => {
        if (!('IntersectionObserver' in window)) {
            console.warn("Intersection Observer không được hỗ trợ. Hoạt ảnh bị vô hiệu hóa.");
            // Make all elements visible immediately if observer not supported
            document.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('is-visible'));
            return;
        }
        const options = { root: null, rootMargin: '0px', threshold: 0.1 };
        observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delayIndex = parseInt(entry.target.dataset.index || '0', 10);
                    const delay = delayIndex * 100; // Stagger animation
                    entry.target.style.animationDelay = `${delay}ms`;
                    entry.target.classList.add('is-visible');
                    observerInstance.unobserve(entry.target); // Unobserve after animating once
                }
            });
        }, options);
        // Initial observation pass
        observeElements(document.querySelectorAll('.animate-on-scroll'));
    };

    const observeElements = (elements) => {
        if (!observer) return;
        elements.forEach((el) => {
            // Only observe elements that have the class and aren't already visible
            if (el.classList.contains('animate-on-scroll') && !el.classList.contains('is-visible')) {
                 observer.observe(el);
            }
        });
    };


    // --- Main Logic ---
    const movieId = getQueryParam('id');
    const typeParam = getQueryParam('type');

    if (!movieId || isNaN(parseInt(movieId)) || typeParam === 'series') {
        let errorMsg = "ID phim không hợp lệ hoặc bị thiếu.";
        if (typeParam === 'series') errorMsg = "Trang này chỉ dành cho phim lẻ. Vui lòng kiểm tra URL.";
        console.error(errorMsg, "URL:", window.location.href);
        displayError(errorMsg);
        return; // Stop execution
    }

    const numericMovieId = parseInt(movieId);

    if (loadingMessage) loadingMessage.classList.add('hidden'); // Hide initial text loading message

    // Load YouTube API script early
    // Tải script API YouTube sớm
    loadYouTubeApiScript();

    Promise.all([
        fetch('../json/filmData.json').then(res => {
            if (!res.ok) return Promise.reject(new Error(`HTTP error! status: ${res.status} fetching filmData.json`));
            return res.json();
        }),
        // Fetch series data as well for the related content section
        // Tải dữ liệu phim bộ cho phần nội dung liên quan
        fetch('../json/filmData_phimBo.json').then(res => res.ok ? res.json() : []) // Handle potential error gracefully
    ])
    .then(([movies, series]) => {
        allMoviesData = movies || [];
        allSeriesData = series || []; // Store series data
        currentMovieData = allMoviesData.find(m => m.id === numericMovieId);

        if (currentMovieData) {
            updateMetaTags(currentMovieData); // Update SEO tags

            // Populate movie details
            if(moviePoster) {
                moviePoster.src = currentMovieData.posterUrl || 'https://placehold.co/400x600/222222/555555?text=No+Poster';
                moviePoster.alt = `Poster phim ${currentMovieData.title || 'không có tiêu đề'}`;
            } else { console.warn("Không tìm thấy phần tử poster chính."); }

            if(movieTitle) movieTitle.textContent = currentMovieData.title || 'Không có tiêu đề';
            if(movieYear) movieYear.textContent = currentMovieData.releaseYear || 'N/A';
            if(movieGenre) movieGenre.textContent = formatArrayData(currentMovieData.genre);
            if(movieDuration) movieDuration.textContent = currentMovieData.duration || 'N/A';
            if(movieRating) movieRating.textContent = currentMovieData.rating ? `${currentMovieData.rating}` : 'N/A';
            if(movieDescription) movieDescription.textContent = currentMovieData.description || 'Không có mô tả.';
            if(movieDirector) movieDirector.textContent = currentMovieData.director || 'N/A';
            if(movieCast) movieCast.textContent = formatArrayData(currentMovieData.cast);

            // --- START: Determine initial version (check localStorage first) ---
            let initialVersionKey = loadVersionPreference(numericMovieId); // Load preference
            const availableUrls = currentMovieData.videoUrls || {};

            // Validate the loaded preference
            // Xác thực lựa chọn đã tải
            if (!initialVersionKey || !availableUrls[initialVersionKey]) {
                console.log(`Lựa chọn đã lưu '${initialVersionKey}' không hợp lệ hoặc không có sẵn, đang tìm mặc định...`);
                initialVersionKey = null; // Reset if invalid
                // Find default if no valid preference
                // Tìm mặc định nếu không có lựa chọn hợp lệ
                const versionPriority = ['vietsub', 'dubbed', 'voiceover']; // Define preferred order
                for (const key of versionPriority) {
                    if (availableUrls[key]) {
                        initialVersionKey = key;
                        console.log(`Tìm thấy phiên bản mặc định ưu tiên: ${initialVersionKey}`);
                        break;
                    }
                }
                // Fallback to the first available if none of the preferred exist
                // Dự phòng về cái đầu tiên có sẵn nếu không có cái nào trong số ưu tiên tồn tại
                if (!initialVersionKey) {
                    for (const key in availableUrls) {
                        if (availableUrls[key]) {
                            initialVersionKey = key;
                            console.log(`Tìm thấy phiên bản mặc định dự phòng: ${initialVersionKey}`);
                            break;
                        }
                    }
                }
            }
            // --- END: Determine initial version ---

            // Prepare the initial/preferred version without playing
            // Chuẩn bị phiên bản ban đầu/ưu tiên mà không cần phát
            if(initialVersionKey) {
                prepareVideoPlayback(initialVersionKey);
            } else {
                // Handle case where NO versions are available at all
                // Xử lý trường hợp KHÔNG có phiên bản nào khả dụng
                console.warn(`Không có phiên bản video nào cho phim ID ${numericMovieId}`);
                updateVersionButtonStates(null); // Disable all buttons
                setPlayerPoster(); // Show poster
            }


            loadRelatedItems(currentMovieData); // Load related movies/series

            // Hide skeleton and show content after a short delay
            // Ẩn skeleton và hiển thị nội dung sau một khoảng trễ ngắn
            setTimeout(() => {
                if(movieDetailsSkeleton) movieDetailsSkeleton.classList.add('hidden');
                if(errorMessageContainer) errorMessageContainer.classList.add('hidden');
                if(movieDetailsContent) movieDetailsContent.classList.remove('hidden');
                console.log("Đã hiển thị nội dung chi tiết phim.");
            }, 150); // Small delay for smoother transition

            initObserver(); // Initialize scroll animations

        } else {
            console.error(`Không tìm thấy phim với ID: ${numericMovieId}`);
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
    if (versionSelectionContainer) versionSelectionContainer.addEventListener('click', handleVersionClick); // Calls prepareVideoPlayback
    if (toggleLightsButton) toggleLightsButton.addEventListener('click', toggleLights);
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
         console.log("Poster/Overlay clicked. Attempting playback from start...");
         if (currentVideoUrl) {
             startVideoPlayback(currentVideoUrl, false); // Pass false for shouldSkipIntro
         } else {
             console.warn("Cannot play: No video version selected or available.");
             showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn phiên bản video để phát.`, false, true);
         }
    });
    // Ensure play button click doesn't propagate to overlay if they overlap
    if (videoPlayButton) videoPlayButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent triggering overlay click too
        console.log("Play button clicked. Attempting playback from start...");
         if (currentVideoUrl) {
             startVideoPlayback(currentVideoUrl, false); // Pass false for shouldSkipIntro
         } else {
             console.warn("Cannot play: No video version selected or available.");
             showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn phiên bản video để phát.`, false, true);
         }
    });

    // --- Skip Intro Button Event Listener ---
    if (skipIntroButton) {
        skipIntroButton.addEventListener('click', () => {
            console.log("Nút Bỏ qua Intro đã được nhấp.");
            if (currentVideoUrl && currentActiveVersion) {
                const isYouTube = !!getYouTubeVideoId(currentVideoUrl); // Check if it's a valid YT ID
                if (isYouTube) {
                    startVideoPlayback(currentVideoUrl, true); // Pass true for shouldSkipIntro
                } else {
                    console.warn("Bỏ qua giới thiệu chỉ hoạt động với video YouTube hợp lệ.");
                     showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Bỏ qua giới thiệu chỉ khả dụng cho video YouTube hợp lệ.`, false, true);
                }
            } else {
                console.warn("Không thể bỏ qua giới thiệu: Không có URL hoặc phiên bản video đang hoạt động.");
                 showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn phiên bản video trước khi bỏ qua giới thiệu.`, false, true);
            }
        });
    }

}); // End DOMContentLoaded
