// filmDetails.js - Handles MOVIE Details Page Logic ONLY
// Enhanced with YouTube API for end-of-video handling, Skeleton, Lazy Loading, Skip Intro Option

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
    let currentMovieData = null;
    let currentActiveVersion = null;
    let currentVideoUrl = null; // URL of the currently selected version
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
                    if (url.includes('https://www.youtube.com/iframe_api') || url.includes('https://youtu.be/C3S2vietsub8')) { // Example URLs
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

    const setPlayerPoster = () => {
        const playerPosterUrl = currentMovieData?.heroImage
                               || currentMovieData?.posterUrl
                               || 'https://placehold.co/1280x720/000000/333333?text=No+Poster';
        if (videoPosterImage) {
            videoPosterImage.src = playerPosterUrl;
            videoPosterImage.alt = `Poster xem phim ${currentMovieData?.title || 'không có tiêu đề'}`;
        } else {
            console.warn("Không tìm thấy phần tử ảnh poster video.");
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
            // API already loaded
            // API đã được tải
            ytApiReady = true;
            console.log("YouTube API đã sẵn sàng (đã tải trước đó).");
            return;
        }
        if (document.getElementById('youtube-api-script')) {
            // Script tag already added, waiting for it to load
            // Thẻ script đã được thêm, đang chờ tải
            return;
        }
        const tag = document.createElement('script');
        tag.id = 'youtube-api-script';
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
        console.log("Đang tải script YouTube API...");
    }

    /**
     * Global callback function for the YouTube API. Called when the API is ready.
     * Hàm callback toàn cục cho API YouTube. Được gọi khi API sẵn sàng.
     */
    window.onYouTubeIframeAPIReady = function() {
        ytApiReady = true;
        console.log("YouTube API đã sẵn sàng.");
        // If a video was intended to play before API was ready, try playing it now
        // Nếu một video dự định phát trước khi API sẵn sàng, hãy thử phát nó ngay bây giờ
        // (This might need more complex state management depending on exact flow)
        // (Điều này có thể cần quản lý trạng thái phức tạp hơn tùy thuộc vào luồng chính xác)
    };

    /**
     * Called when the YouTube player is ready.
     * Được gọi khi trình phát YouTube sẵn sàng.
     * @param {object} event - The event object from the API. Đối tượng sự kiện từ API.
     */
    function onPlayerReady(event) {
        console.log("Trình phát YouTube đã sẵn sàng.");
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
             // Destroy the player to prevent related videos and clean up
             // Hủy trình phát để ngăn video liên quan và dọn dẹp
            if (youtubePlayer) {
                try {
                    youtubePlayer.destroy(); // Destroy the player instance
                } catch (e) {
                    console.error("Lỗi khi hủy trình phát YouTube:", e);
                }
                youtubePlayer = null; // Clear the reference
            }
            // Clear the div where the player was
            // Xóa div chứa trình phát
            const playerDiv = document.getElementById(youtubePlayerDivId);
            if (playerDiv) {
                playerDiv.innerHTML = ''; // Remove the iframe content
            }
             // Optionally, change the play button icon to replay, or just rely on the poster click
             // Tùy chọn, thay đổi biểu tượng nút phát thành xem lại, hoặc chỉ dựa vào việc nhấp vào poster
            // Example: if(videoPlayButton) videoPlayButton.querySelector('i').className = 'fas fa-redo';
        } else if (event.data == YT.PlayerState.PLAYING) {
             // Ensure poster is hidden when playing starts (useful if autoplay fails initially)
             // Đảm bảo poster bị ẩn khi bắt đầu phát (hữu ích nếu tự động phát ban đầu không thành công)
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
            console.warn("API YouTube chưa sẵn sàng, đang thử tải lại...");
            loadYouTubeApiScript(); // Try loading API if not ready
            // Optionally, queue the playback request or show a message
            // Tùy chọn, đưa yêu cầu phát lại vào hàng đợi hoặc hiển thị thông báo
            showVideoMessage("Đang chuẩn bị trình phát YouTube...", false, true);
             // Try again after a short delay
             setTimeout(() => loadYouTubePlayer(videoId, startSeconds), 1000);
            return;
        }

        hideVideoMessage(); // Hide any previous messages
        if (videoIframePlaceholder) videoIframePlaceholder.classList.add('active'); // Make sure placeholder area is visible

        // Destroy existing player if it exists
        // Hủy trình phát hiện có nếu nó tồn tại
        if (youtubePlayer) {
            try {
                 youtubePlayer.destroy();
                 youtubePlayer = null;
                 console.log("Đã hủy trình phát YouTube cũ.");
            } catch (e) {
                 console.error("Lỗi khi hủy trình phát YouTube cũ:", e);
            }
        }
         // Ensure the target div exists
         // Đảm bảo div mục tiêu tồn tại
         if (!document.getElementById(youtubePlayerDivId)) {
             console.error(`Không tìm thấy div trình phát YouTube với ID: ${youtubePlayerDivId}`);
             // Attempt to recreate the div if missing
             // Cố gắng tạo lại div nếu thiếu
             if (videoIframePlaceholder) {
                 videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`;
                 console.log(`Đã tạo lại div #${youtubePlayerDivId}.`);
             } else {
                 showVideoMessage("Lỗi: Không thể tạo vùng chứa trình phát.", true);
                 return;
             }
         } else {
             // Clear the div content before creating a new player
             // Xóa nội dung div trước khi tạo trình phát mới
             document.getElementById(youtubePlayerDivId).innerHTML = '';
         }


        console.log(`Đang tạo trình phát YouTube mới cho video ID: ${videoId}, bắt đầu từ: ${startSeconds}s`);
        try {
            youtubePlayer = new YT.Player(youtubePlayerDivId, {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    'playsinline': 1, // Important for mobile playback
                    'autoplay': 1,    // Attempt autoplay
                    'rel': 0,         // Disable related videos at end (though ENDED event is better)
                    'modestbranding': 1,
                    'iv_load_policy': 3,
                    'hl': 'vi',       // Language
                    'cc_load_policy': 1, // Show captions if available
                    'start': startSeconds // Start time
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange,
                    'onError': (event) => { // Basic error handling
                         console.error('Lỗi trình phát YouTube:', event.data);
                         showVideoMessage(`Lỗi trình phát YouTube: ${event.data}`, true);
                         // Reset to poster on error
                         // Đặt lại thành poster khi có lỗi
                         if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
                         if (youtubePlayer) youtubePlayer.destroy();
                         youtubePlayer = null;
                         const playerDiv = document.getElementById(youtubePlayerDivId);
                         if(playerDiv) playerDiv.innerHTML = '';
                    }
                }
            });
            // Ensure container is marked as playing immediately after creating player
            // Đảm bảo container được đánh dấu là đang phát ngay sau khi tạo trình phát
             if (videoPlayerContainer) videoPlayerContainer.classList.add('playing');

        } catch (error) {
             console.error("Lỗi khi tạo trình phát YouTube:", error);
             showVideoMessage("Không thể khởi tạo trình phát YouTube.", true);
             if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing'); // Show poster on error
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
            } catch(e) { console.error("Lỗi khi hủy trình phát YT cũ:", e); }
            youtubePlayer = null;
        }
         // Clear the placeholder content
         // Xóa nội dung placeholder
         if (videoIframePlaceholder) {
            videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; // Ensure the target div exists
            videoIframePlaceholder.classList.remove('active'); // Hide placeholder initially
         } else {
             console.error("Video iframe placeholder not found.");
             return;
         }

        if (!urlToPlay) {
            console.error("Không có URL video hợp lệ để phát.");
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2" aria-hidden="true"></i>Không có URL video hợp lệ để phát.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing'); // Show poster
            return;
        }

        currentVideoUrl = urlToPlay; // Store the URL intended for playback
        hideVideoMessage(); // Clear any previous messages

        const youtubeId = getYouTubeVideoId(urlToPlay);
        const googleDriveEmbedUrl = getGoogleDriveEmbedUrl(urlToPlay);
        const skipSeconds = currentMovieData?.skipIntroSeconds || 0;
        const effectiveStartSeconds = shouldSkipIntro ? skipSeconds : 0;

        if (youtubeId) {
            console.log(`Chuẩn bị phát YouTube: ${youtubeId}, Bỏ qua: ${shouldSkipIntro}, Giây bắt đầu: ${effectiveStartSeconds}`);
            if (videoIframePlaceholder) videoIframePlaceholder.classList.add('active'); // Show placeholder area
            loadYouTubePlayer(youtubeId, effectiveStartSeconds); // Use API
        } else if (googleDriveEmbedUrl) {
            console.log("Chuẩn bị phát Google Drive:", googleDriveEmbedUrl);
            if (videoIframePlaceholder) {
                 videoIframePlaceholder.innerHTML = `<iframe src="${googleDriveEmbedUrl}" frameborder="0" allow="autoplay; fullscreen" title="Trình phát video Google Drive cho phim ${currentMovieData?.title || ''}"></iframe>`;
                 videoIframePlaceholder.classList.add('active'); // Show placeholder area
                 if (videoPlayerContainer) videoPlayerContainer.classList.add('playing'); // Hide poster
            }
        } else {
            // Handle unsupported URL format
            // Xử lý định dạng URL không được hỗ trợ
            console.error("Định dạng URL không được hỗ trợ:", urlToPlay);
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
        const isYouTube = !!getYouTubeVideoId(activeUrl); // Check if the active URL is YouTube

        if (isYouTube && skipSeconds > 0) {
            skipIntroButton.dataset.skipSeconds = skipSeconds; // Store seconds in data attribute
            skipIntroButton.classList.remove('hidden');
            console.log(`Nút Bỏ qua Intro hiển thị cho video YouTube (bỏ qua ${skipSeconds}s).`);
        } else {
            skipIntroButton.classList.add('hidden');
            console.log(`Nút Bỏ qua Intro bị ẩn (Không phải YouTube hoặc skipSeconds=0).`);
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


         // If no versions have URLs, show an info message
         // Nếu không có phiên bản nào có URL, hiển thị thông báo thông tin
        if (!hasAnyUrl) {
             showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Rất tiếc, không có phiên bản video nào khả dụng cho phim này.`, false, true);
             // Ensure player shows poster if no versions are available
             // Đảm bảo trình phát hiển thị poster nếu không có phiên bản nào
             if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
             if (videoIframePlaceholder) videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; // Reset placeholder
             if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
             setPlayerPoster(); // Reset to default poster
             // currentVideoUrl is already null
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

    /**
     * Handles clicks on the version selection buttons. Starts playback immediately.
     * Xử lý các lần nhấp vào nút chọn phiên bản. Bắt đầu phát lại ngay lập tức.
     * @param {Event} event - The click event. Sự kiện nhấp chuột.
     */
    const handleVersionClick = (event) => {
        const button = event.target.closest('.version-button');
        if (!button || button.disabled || !currentMovieData) return;

        const versionKey = button.dataset.version;
        if (!versionKey) return;

        const url = currentMovieData.videoUrls?.[versionKey];

        if (url) {
            // Update button states (this also updates currentActiveVersion and currentVideoUrl)
            // Cập nhật trạng thái nút (điều này cũng cập nhật currentActiveVersion và currentVideoUrl)
            updateVersionButtonStates(versionKey);
            // Start playing the selected video version WITHOUT skipping intro by default
            // Bắt đầu phát phiên bản video đã chọn MÀ KHÔNG bỏ qua giới thiệu theo mặc định
            startVideoPlayback(url, false); // Pass false for shouldSkipIntro
        } else {
            console.warn(`Không tìm thấy URL cho phiên bản: ${versionKey}, mặc dù nút đã được nhấp.`);
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${versionKey}" không có sẵn.`, false, true);
        }
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

        // Update page title and meta tags for error state
        // Cập nhật tiêu đề trang và thẻ meta cho trạng thái lỗi
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
        return strData.split(separator).slice(0, limit).join(separator);
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
            .sort(() => 0.5 - Math.random())
            .slice(0, 6);

        if (allRelated.length > 0) {
            relatedMoviesContainer.innerHTML = allRelated.map(({ item, type }, index) => {
                 const cardHTML = createRelatedItemCard(item, type);
                 const cardWithIndex = cardHTML.replace('<a ', `<a data-index="${index}" `);
                 return cardWithIndex;
            }).join('');
            if (observer) {
                observeElements(relatedMoviesContainer.querySelectorAll('.related-movie-card.animate-on-scroll'));
            } else {
                console.warn("Intersection Observer chưa được khởi tạo khi cố gắng quan sát các mục liên quan.");
            }
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
            description += movie.description.substring(0, 120) + '...';
        } else {
            description += `Thông tin chi tiết, diễn viên, đạo diễn, và các phiên bản Vietsub, Thuyết minh.`;
        }
        description = description.substring(0, 160);

        const genresText = formatArrayData(movie.genre, ', ');
        const keywords = `xem phim ${movieTitleText}, ${movieTitleText} online, ${movieTitleText} vietsub, ${movieTitleText} thuyết minh, ${genresText}, phim ${movie.releaseYear || ''}, ${movie.director || ''}, ${formatArrayData(movie.cast, ', ', 3)}`;

        if (pageTitleElement) pageTitleElement.textContent = fullTitle;
        if (metaDescriptionTag) metaDescriptionTag.content = description;
        if (metaKeywordsTag) metaKeywordsTag.content = keywords;

        if (ogUrlTag) ogUrlTag.content = pageUrl;
        if (ogTitleTag) ogTitleTag.content = fullTitle;
        if (ogDescriptionTag) ogDescriptionTag.content = description;
        if (ogImageTag) ogImageTag.content = movie.posterUrl || 'https://placehold.co/1200x630/141414/ffffff?text=Movie+Poster';
        if (ogTypeTag) ogTypeTag.content = 'video.movie';
        if (ogVideoDirectorTag) ogVideoDirectorTag.content = movie.director || '';
        if (ogVideoActorTag) ogVideoActorTag.content = formatArrayData(movie.cast, ', ', 4);
        if (ogVideoReleaseDateTag && movie.releaseYear) ogVideoReleaseDateTag.content = movie.releaseYear.toString();

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
            icon.classList.toggle('fa-solid', !isLightsOff);
            icon.classList.toggle('fa-moon', isLightsOff);
        }
        console.log("Đèn đã được:", isLightsOff ? "Tắt" : "Bật");
    };

    // --- Observer ---
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
                    observerInstance.unobserve(entry.target);
                }
            });
        }, options);
        observeElements(document.querySelectorAll('.animate-on-scroll'));
    };

    const observeElements = (elements) => {
        if (!observer) return;
        elements.forEach((el) => {
            if (el.classList.contains('animate-on-scroll')) {
                 observer.observe(el);
            }
        });
    };


    // --- Main Logic ---
    const movieId = getQueryParam('id');
    const typeParam = getQueryParam('type');

    if (!movieId || isNaN(parseInt(movieId)) || typeParam === 'series') {
        let errorMsg = "ID phim không hợp lệ hoặc bị thiếu.";
        if (typeParam === 'series') errorMsg = "Trang này chỉ dành cho phim lẻ.";
        console.error(errorMsg, "URL:", window.location.href);
        displayError(errorMsg);
        return;
    }

    const numericMovieId = parseInt(movieId);

    if (loadingMessage) loadingMessage.classList.add('hidden');

    // Load YouTube API script early
    // Tải script API YouTube sớm
    loadYouTubeApiScript();

    Promise.all([
        fetch('../json/filmData.json').then(res => {
            if (!res.ok) return Promise.reject(new Error(`HTTP error! status: ${res.status} fetching filmData.json`));
            return res.json();
        }),
        fetch('../json/filmData_phimBo.json').then(res => res.ok ? res.json() : [])
    ])
    .then(([movies, series]) => {
        allMoviesData = movies || [];
        allSeriesData = series || [];
        currentMovieData = allMoviesData.find(m => m.id === numericMovieId);

        if (currentMovieData) {
            updateMetaTags(currentMovieData);

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

            setPlayerPoster();

            let defaultVersionKey = null;
            let defaultUrl = null;
            const availableUrls = currentMovieData.videoUrls || {};
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

            // currentVideoUrl is set inside updateVersionButtonStates now
            // currentVideoUrl hiện được đặt bên trong updateVersionButtonStates
            updateVersionButtonStates(defaultVersionKey);

            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            if (videoIframePlaceholder) videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; // Ensure div exists
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active'); // Keep placeholder hidden initially

             const playerTitleText = currentMovieData?.title || 'Không có tiêu đề';
             if (movieTitlePlayer) movieTitlePlayer.textContent = `Xem Phim: ${playerTitleText}`;

            loadRelatedItems(currentMovieData);

            setTimeout(() => {
                if(movieDetailsSkeleton) movieDetailsSkeleton.classList.add('hidden');
                if(errorMessageContainer) errorMessageContainer.classList.add('hidden');
                if(movieDetailsContent) movieDetailsContent.classList.remove('hidden');
            }, 150);

            initObserver();

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
    if (versionSelectionContainer) versionSelectionContainer.addEventListener('click', handleVersionClick);
    if (toggleLightsButton) toggleLightsButton.addEventListener('click', toggleLights);

    // Play video when poster overlay or play button is clicked (play WITHOUT skipping intro)
    // Phát video khi nhấp vào lớp phủ poster hoặc nút phát (phát MÀ KHÔNG bỏ qua giới thiệu)
    if (videoPosterOverlay) videoPosterOverlay.addEventListener('click', () => {
         console.log("Poster/Overlay clicked. Attempting playback from start...");
         // Check if a valid version is selected
         // Kiểm tra xem phiên bản hợp lệ đã được chọn chưa
         if (currentVideoUrl) {
             startVideoPlayback(currentVideoUrl, false); // Pass false for shouldSkipIntro
         } else {
             console.warn("Cannot play: No video version selected or available.");
             showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn phiên bản video để phát.`, false, true);
         }
    });
    // Event listener for the play button inside the overlay (redundant if overlay covers it, but safe)
    // Trình lắng nghe sự kiện cho nút phát bên trong lớp phủ (thừa nếu lớp phủ che nó, nhưng an toàn)
    if (videoPlayButton) videoPlayButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent triggering overlay listener
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
            // Check if there's a valid URL and version selected
            // Kiểm tra xem có URL và phiên bản hợp lệ được chọn không
            if (currentVideoUrl && currentActiveVersion) {
                const isYouTube = !!getYouTubeVideoId(currentVideoUrl);
                if (isYouTube) {
                    startVideoPlayback(currentVideoUrl, true); // Pass true for shouldSkipIntro
                } else {
                    console.warn("Bỏ qua giới thiệu chỉ hoạt động với video YouTube.");
                     showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Bỏ qua giới thiệu chỉ khả dụng cho video YouTube.`, false, true);
                }
            } else {
                console.warn("Không thể bỏ qua giới thiệu: Không có URL hoặc phiên bản video đang hoạt động.");
                 showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn phiên bản video trước khi bỏ qua giới thiệu.`, false, true);
            }
        });
    }

}); // End DOMContentLoaded
