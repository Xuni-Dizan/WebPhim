// animeDetails.js - Handles Anime Details Page Logic (Series & Movies)
// Based on filmDetails_phimBo.js, adapted for Anime data structure and elements.
// v1.2: Updated logic to handle both anime-series and anime-movie types.
//       Ensured correct data loading and UI display based on type.
//       Refined video player logic to work with both series episodes and movie URLs.
//       Improved related content loading from multiple JSON sources.

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements (Anime Specific) ---
    const animeDetailsContent = document.getElementById('anime-details-content');
    const animeDetailsSkeleton = document.getElementById('anime-details-skeleton');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessageContainer = document.getElementById('error-message');
    const errorTextElement = document.getElementById('error-text');
    const animeTitlePlayer = document.getElementById('anime-title-player'); // Player title
    const videoPlayerContainer = document.getElementById('video-player-container');
    const videoMessageContainer = document.getElementById('video-message');
    const animePoster = document.getElementById('anime-poster'); // Main poster
    const animeMainTitle = document.getElementById('anime-main-title'); // Main title below poster
    const animeYear = document.getElementById('anime-year');
    const animeGenre = document.getElementById('anime-genre');
    const animeRating = document.getElementById('anime-rating');
    const animeStatus = document.getElementById('anime-status');
    const animeDescription = document.getElementById('anime-description');
    const animeStudio = document.getElementById('anime-studio'); // Changed from director
    const animeCast = document.getElementById('anime-cast'); // Changed to Seiyuu/Cast
    const animeSeasonsCount = document.getElementById('anime-seasons-count');
    const animeEpisodesCount = document.getElementById('anime-episodes-count');
    const relatedContentGrid = document.getElementById('related-content-grid'); // Changed ID
    const scrollToTopButton = document.getElementById('scroll-to-top');
    const versionSelectionContainer = document.getElementById('version-selection');
    const versionButtons = versionSelectionContainer ? versionSelectionContainer.querySelectorAll('.version-button') : [];
    const toggleLightsButton = document.getElementById('toggle-lights-button');
    const toggleLightsText = document.getElementById('toggle-lights-text');
    const playerSection = document.getElementById('player-section'); // For lights off feature
    const relatedContentSection = document.querySelector('#related-content-heading')?.closest('section'); // For lights off

    // --- Anime Specific Elements (Series Only) ---
    const animeContentSection = document.getElementById('anime-content-section'); // Container for season/episode selectors
    const seasonSelectorContainer = document.getElementById('season-selector-container');
    const episodeSelectorContainer = document.getElementById('episode-selector-container'); // Optional dropdown
    const episodeListContainer = document.getElementById('episode-list-container'); // Container for episode buttons
    const seasonSelect = document.getElementById('season-select');
    const episodeSelect = document.getElementById('episode-select'); // Optional dropdown
    const animeSpecificInfo = document.getElementById('anime-specific-info'); // Div containing season/episode counts
    const skeletonAnimeContentSection = document.getElementById('skeleton-anime-content-section'); // Skeleton for season/episode area

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
    let allAnimeItems = []; // Store fetched Anime data
    let allMoviesData = []; // Store fetched movie data for related content
    let allSeriesData = []; // Store fetched series data for related content
    let currentAnimeData = null; // Store the data for the currently viewed Anime
    let currentSelectedSeasonIndex = 0;
    let currentSelectedEpisodeIndex = 0;
    let currentActiveVersion = null;
    let currentVideoUrl = null;
    let observer;
    let youtubePlayer = null;
    let ytApiReady = false;

    // --- Helper Functions ---

    /**
     * Gets a query parameter from the URL.
     * @param {string} param - The name of the parameter.
     * @returns {string|null} The value of the parameter or null if not found.
     */
    const getQueryParam = (param) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    };

    /**
     * Displays a message in the video message container.
     * @param {string} message - The message HTML or text.
     * @param {boolean} [isError=false] - True if it's an error message.
     * @param {boolean} [isInfo=false] - True if it's an informational message.
     */
    const showVideoMessage = (message, isError = false, isInfo = false) => {
        if (!videoMessageContainer) return;
        videoMessageContainer.innerHTML = message;
        videoMessageContainer.classList.remove('hidden', 'error-message', 'info-message');
        if (isError) videoMessageContainer.classList.add('error-message');
        else if (isInfo) videoMessageContainer.classList.add('info-message');
    };

    /**
     * Hides the video message container.
     */
    const hideVideoMessage = () => {
        if (videoMessageContainer) {
            videoMessageContainer.classList.add('hidden');
            videoMessageContainer.innerHTML = '';
        }
    };

    /**
     * Extracts YouTube Video ID from various URL formats.
     * @param {string|null} url - The URL to parse.
     * @returns {string|null} The YouTube video ID or null.
     */
    const getYouTubeVideoId = (url) => {
         if (!url || typeof url !== 'string') {
             console.log("getYouTubeVideoId (Anime): Invalid or non-string URL:", url);
             return null;
         }
         let videoId = null;
         try {
             // Patterns to match YouTube URLs (including googleusercontent links)
             const patterns = [
                 /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/,
                 /(?:https?:\/\/)?googleusercontent\.com\/youtube\.com\/([\w-]+)(?:\?.*)?$/, // Example pattern
             ];
             for (const pattern of patterns) {
                 const match = url.match(pattern);
                 // Ensure the captured group is a valid 11-character ID
                 if (match && match[1] && /^[\w-]{11}$/.test(match[1])) {
                     videoId = match[1];
                     console.log(`getYouTubeVideoId (Anime): Found valid ID '${videoId}' from URL: ${url}`);
                     break; // Stop after finding the first valid ID
                 }
             }
             if (!videoId) {
                 console.log(`getYouTubeVideoId (Anime): No valid YouTube ID found in URL: ${url}`);
             }
         } catch (e) { console.error("Error parsing YouTube URL (Anime):", e, url); }
         return videoId;
    };

    /**
     * Creates a Google Drive embed URL from a share link.
     * @param {string|null} url - The Google Drive share URL.
     * @returns {string|null} The embeddable URL or null.
     */
    const getGoogleDriveEmbedUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        let embedUrl = null;
        try {
            // Match common Google Drive file URLs
            const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
            if (match && match[1]) {
                embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
                console.log(`getGoogleDriveEmbedUrl (Anime): Created embed URL: ${embedUrl}`);
            } else {
                 console.log(`getGoogleDriveEmbedUrl (Anime): No Google Drive ID found in URL: ${url}`);
            }
        } catch (e) { console.error("Error parsing Google Drive URL (Anime):", e, url); }
        // Warn about potential permission issues
        if (embedUrl) console.warn("Google Drive embeds may require specific sharing permissions to work correctly.");
        return embedUrl;
    };

    /**
     * Sets the poster image for the video player area.
     * Uses episode thumbnail, then anime hero image, then anime poster, then placeholder.
     * @param {object|null} episode - The currently selected episode data (null for movies).
     */
    const setPlayerPoster = (episode = null) => {
        const episodeThumbnail = episode?.thumbnailUrl;
        const animeHeroImage = currentAnimeData?.heroImage;
        const animePosterUrl = currentAnimeData?.posterUrl;
        const posterSrc = episodeThumbnail || animeHeroImage || animePosterUrl || 'https://placehold.co/1280x720/000000/333333?text=No+Poster';

        if (videoPosterImage) {
            videoPosterImage.src = posterSrc;
            videoPosterImage.alt = `Poster xem ${currentAnimeData?.title || ''} - ${episode?.title || 'Anime'}`;
            console.log("setPlayerPoster (Anime): Set player poster image:", posterSrc);
        }
        // Reset player state visually
        if (videoPlayerContainer) {
            videoPlayerContainer.classList.remove('playing');
        }
        // Destroy existing YouTube player if any
        if (youtubePlayer) {
             try { youtubePlayer.destroy(); } catch (e) { console.warn("Error destroying YT player:", e); }
             youtubePlayer = null;
        }
        // Reset iframe placeholder
        if (videoIframePlaceholder) {
             videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`; // Ensure YT div exists
             videoIframePlaceholder.classList.remove('active');
        }
    };

    // --- YouTube API Functions ---

    /**
     * Loads the YouTube IFrame Player API script asynchronously.
     */
    function loadYouTubeApiScript() {
        if (window.YT && window.YT.Player) {
            ytApiReady = true;
            console.log("YouTube API already ready (Anime).");
            return;
        }
        if (document.getElementById('youtube-api-script')) return; // Script already requested
        const tag = document.createElement('script');
        tag.id = 'youtube-api-script';
        tag.src = "https://www.youtube.com/iframe_api"; // Official source
        document.body.appendChild(tag);
        console.log("Requested YouTube API script (Anime).");
    }

    /**
     * Global callback for the YouTube API. MUST be defined globally ONCE.
     * Checks if another script (like filmDetails.js) already defined it.
     */
    if (typeof window.onYouTubeIframeAPIReady === 'undefined') {
         window.onYouTubeIframeAPIReady = function() {
             ytApiReady = true;
             console.log("YouTube API is ready (onYouTubeIframeAPIReady - defined by animeDetails).");
             // If a video load was pending, execute it now
             if (window.pendingYouTubeLoad) {
                 const { videoId, startSeconds } = window.pendingYouTubeLoad;
                 // Ensure loadYouTubePlayer is available in the current scope
                 if (typeof loadYouTubePlayer === 'function') {
                     loadYouTubePlayer(videoId, startSeconds);
                 } else {
                      console.error("loadYouTubePlayer function not found after API ready.");
                 }
                 delete window.pendingYouTubeLoad;
             }
         };
         window.ytApiGlobalCallbackDefined = true; // Flag to indicate it's defined
     } else {
         // If the callback was defined elsewhere, just check if the API object exists
         if (window.YT && window.YT.Player) {
             ytApiReady = true;
             console.log("YouTube API was already ready or callback defined elsewhere (Anime).");
         } else {
              console.log("YouTube API callback defined elsewhere, but API not yet ready (Anime).");
              // We can potentially hook into the existing callback if needed,
              // but for simplicity, we'll rely on the pendingYouTubeLoad mechanism.
         }
     }


    /**
     * Called when the YouTube player is ready.
     * @param {object} event - The player ready event.
     */
    function onPlayerReady(event) {
        console.log("YouTube player ready (Anime).");
        event.target.playVideo(); // Start playing
    }

    /**
     * Called when the YouTube player's state changes.
     * @param {object} event - The state change event.
     */
    function onPlayerStateChange(event) {
        console.log("YouTube player state changed (Anime):", event.data);
        if (event.data == YT.PlayerState.ENDED) {
            // Reset player UI when video ends
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e){} youtubePlayer = null; }
            const playerDiv = document.getElementById(youtubePlayerDivId);
            if (playerDiv) playerDiv.innerHTML = ''; // Clear the player div
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
        } else if (event.data == YT.PlayerState.PLAYING) {
             // Ensure the 'playing' class is added when playback starts
             if (videoPlayerContainer && !videoPlayerContainer.classList.contains('playing')) {
                 videoPlayerContainer.classList.add('playing');
             }
        }
    }

    /**
     * Loads and controls the YouTube player.
     * @param {string} videoId - The 11-character YouTube video ID.
     * @param {number} [startSeconds=0] - Time in seconds to start playback.
     */
    function loadYouTubePlayer(videoId, startSeconds = 0) {
        // Validate videoId
        if (!videoId || typeof videoId !== 'string' || !/^[\w-]{11}$/.test(videoId)) {
            console.error(`loadYouTubePlayer (Anime): Invalid YouTube video ID: "${videoId}".`);
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2"></i> ID video YouTube không hợp lệ.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
            if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e){} youtubePlayer = null; }
            return;
        }

        // Check if API is ready, load if necessary
        if (!ytApiReady) {
            console.warn("loadYouTubePlayer (Anime): YouTube API not ready, queuing load...");
            loadYouTubeApiScript(); // Request the API script
            showVideoMessage("Đang chuẩn bị trình phát YouTube...", false, true);
            // Store the request to be executed when the API is ready
            window.pendingYouTubeLoad = { videoId, startSeconds };
            return;
        }

        // API is ready, proceed
        hideVideoMessage();
        if (videoIframePlaceholder) videoIframePlaceholder.classList.add('active'); // Show the placeholder
        // Destroy previous player instance if exists
        if (youtubePlayer) { try { youtubePlayer.destroy(); } catch (e) { console.warn("Error destroying previous YT player:", e); } youtubePlayer = null; }

        // Ensure the target div exists
        let playerDivTarget = document.getElementById(youtubePlayerDivId);
        if (!playerDivTarget) {
             console.error(`loadYouTubePlayer (Anime): Target div #${youtubePlayerDivId} not found. Attempting to recreate.`);
             if (videoIframePlaceholder) {
                 videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`;
                 playerDivTarget = document.getElementById(youtubePlayerDivId);
             }
             if (!playerDivTarget) {
                 showVideoMessage("Lỗi: Không thể tạo vùng chứa trình phát.", true);
                 return;
             }
        } else {
             playerDivTarget.innerHTML = ''; // Clear any previous content/error messages
        }

        console.log(`loadYouTubePlayer (Anime): Creating player for ID: ${videoId}, start at: ${startSeconds}s`);
        try {
            youtubePlayer = new YT.Player(youtubePlayerDivId, {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    'playsinline': 1,       // Play inline on mobile
                    'autoplay': 1,          // Autoplay
                    'rel': 0,               // Don't show related videos
                    'modestbranding': 1,    // Minimal YouTube logo
                    'iv_load_policy': 3,    // Don't show annotations
                    'hl': 'vi',             // Player language
                    'cc_load_policy': 1,    // Show captions if available
                    'start': startSeconds   // Start time
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange,
                    'onError': (event) => {
                         console.error('YouTube Player Error (Anime):', event.data);
                         let errorMsg = `Lỗi trình phát YouTube: ${event.data}`;
                         // Provide more user-friendly error messages
                         switch(event.data) {
                             case 2: errorMsg = "Yêu cầu chứa giá trị tham số không hợp lệ."; break;
                             case 5: errorMsg = "Lỗi trình phát HTML5."; break;
                             case 100: errorMsg = "Không tìm thấy video."; break;
                             case 101: case 150: errorMsg = "Chủ sở hữu không cho phép phát nhúng video này."; break;
                             default: errorMsg = `Lỗi không xác định (${event.data}).`;
                         }
                         showVideoMessage(`<i class="fas fa-exclamation-circle mr-2"></i> ${errorMsg}`, true);
                         // Reset player UI on error
                         if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
                         if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e){} youtubePlayer = null; }
                         const playerDiv = document.getElementById(youtubePlayerDivId);
                         if(playerDiv) playerDiv.innerHTML = '';
                         if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
                    }
                }
            });
            // Visually indicate playback has started (or is attempting to)
            if (videoPlayerContainer) videoPlayerContainer.classList.add('playing');
        } catch (error) {
             console.error("Error creating YouTube player instance (Anime):", error);
             showVideoMessage("Không thể khởi tạo trình phát YouTube.", true);
             if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
             if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
        }
    }

    /**
     * Starts video playback based on the provided URL.
     * Handles YouTube and Google Drive URLs.
     * @param {string} urlToPlay - The video URL.
     * @param {boolean} [shouldSkipIntro=false] - Whether to apply the skip intro time.
     */
    const startVideoPlayback = (urlToPlay, shouldSkipIntro = false) => {
        console.log(`startVideoPlayback (Anime): Requesting playback for: ${urlToPlay}, Skip Intro: ${shouldSkipIntro}`);

        // Reset existing player if any
        if (youtubePlayer) { try { youtubePlayer.destroy(); } catch(e){} youtubePlayer = null; }
        if (videoIframePlaceholder) {
            // Clear previous content and ensure the YT div is there for potential future use
            videoIframePlaceholder.innerHTML = `<div id="${youtubePlayerDivId}"></div>`;
            videoIframePlaceholder.classList.remove('active'); // Hide placeholder initially
        } else {
            console.error("startVideoPlayback (Anime): Video iframe placeholder not found!");
            return; // Cannot proceed without placeholder
        }

        // Validate URL
        if (!urlToPlay) {
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2"></i>Không có URL video hợp lệ để phát.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            return;
        }

        // Clear any previous messages
        hideVideoMessage();

        // Get potential IDs/URLs
        const youtubeId = getYouTubeVideoId(urlToPlay);
        const googleDriveEmbedUrl = getGoogleDriveEmbedUrl(urlToPlay);
        const skipSeconds = currentAnimeData?.skipIntroSeconds || 0;
        const effectiveStartSeconds = shouldSkipIntro ? skipSeconds : 0;

        // Determine Player Title
        let playerTitleText = currentAnimeData?.title || 'Không có tiêu đề';
        if (currentAnimeData?.itemType === 'anime-series') {
            const season = currentAnimeData.seasons?.[currentSelectedSeasonIndex];
            const episode = season?.episodes?.[currentSelectedEpisodeIndex];
            if (episode) {
                const seasonNumber = season?.seasonNumber;
                playerTitleText += ` - Mùa ${seasonNumber || '?'} Tập ${episode.episodeNumber}`;
            }
        }
        if (animeTitlePlayer) animeTitlePlayer.textContent = `Xem: ${playerTitleText}`;

        // --- Load the appropriate player ---
        if (youtubeId) {
            console.log(`startVideoPlayback (Anime): Preparing YouTube player: ${youtubeId}, Start: ${effectiveStartSeconds}s`);
            if (videoIframePlaceholder) videoIframePlaceholder.classList.add('active'); // Show placeholder for YT
            loadYouTubePlayer(youtubeId, effectiveStartSeconds);
        } else if (googleDriveEmbedUrl) {
            console.log("startVideoPlayback (Anime): Preparing Google Drive embed:", googleDriveEmbedUrl);
            if (videoIframePlaceholder) {
                 // Embed Google Drive directly
                 videoIframePlaceholder.innerHTML = `<iframe src="${googleDriveEmbedUrl}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen title="Trình phát video Google Drive cho ${playerTitleText}"></iframe>`;
                 videoIframePlaceholder.classList.add('active'); // Show the iframe
                 if (videoPlayerContainer) videoPlayerContainer.classList.add('playing'); // Visually indicate playing
                 showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Đang tải video từ Google Drive... (Có thể cần quyền truy cập)`, false, true);
            }
        } else {
            console.error("startVideoPlayback (Anime): Unsupported video URL format:", urlToPlay);
            showVideoMessage(`<i class="fas fa-exclamation-circle mr-2"></i>Định dạng video không được hỗ trợ hoặc URL không hợp lệ.`, true);
            if (videoPlayerContainer) videoPlayerContainer.classList.remove('playing');
            if (videoIframePlaceholder) videoIframePlaceholder.classList.remove('active');
        }
    };

    /**
     * Updates the visibility and data of the Skip Intro button.
     */
    const updateSkipIntroButtonVisibility = () => {
        if (!skipIntroButton || !currentAnimeData || currentActiveVersion === null) {
            if (skipIntroButton) skipIntroButton.classList.add('hidden');
            return;
        }

        const skipSeconds = currentAnimeData.skipIntroSeconds || 0;
        let activeUrl = null;

        // Get the URL for the currently active version and episode/movie
        if (currentAnimeData.itemType === 'anime-movie') {
            activeUrl = currentAnimeData.videoUrls?.[currentActiveVersion];
        } else if (currentAnimeData.itemType === 'anime-series') {
            const season = currentAnimeData.seasons?.[currentSelectedSeasonIndex];
            const episode = season?.episodes?.[currentSelectedEpisodeIndex];
            activeUrl = episode?.videoUrls?.[currentActiveVersion];
        }

        // Show button only if it's a YouTube video and skip time is > 0
        const isYouTube = !!getYouTubeVideoId(activeUrl);
        if (isYouTube && skipSeconds > 0) {
            skipIntroButton.dataset.skipSeconds = skipSeconds; // Store skip time
            skipIntroButton.classList.remove('hidden');
            console.log("Skip Intro button visible (Anime).");
        } else {
            skipIntroButton.classList.add('hidden');
            console.log("Skip Intro button hidden (Anime).");
        }
    };

    /**
     * Updates the state (enabled/disabled, active) of version buttons.
     * @param {object} availableUrls - Object containing available URLs for the current episode/movie.
     * @param {string|null} activeVersionKey - The key of the currently selected version.
     */
    const updateVersionButtonStates = (availableUrls, activeVersionKey) => {
        availableUrls = availableUrls || {}; // Ensure it's an object
        let hasAnyUrl = false;

        versionButtons.forEach(button => {
            const version = button.dataset.version;
            const hasUrl = !!availableUrls[version]; // Check if URL exists and is not null/empty

            button.disabled = !hasUrl;
            button.classList.toggle('active', version === activeVersionKey && hasUrl);
            button.setAttribute('aria-pressed', String(version === activeVersionKey && hasUrl));

            if (hasUrl) hasAnyUrl = true;
        });

        // Update the global state for the currently selected version and URL
        currentActiveVersion = availableUrls[activeVersionKey] ? activeVersionKey : null;
        currentVideoUrl = availableUrls[currentActiveVersion] || null; // Store the URL ready to play
        console.log(`updateVersionButtonStates (Anime): Active version: ${currentActiveVersion}, Ready URL: ${currentVideoUrl}`);

        // Show messages based on availability
        if (!hasAnyUrl) {
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Không có phiên bản video nào khả dụng.`, false, true);
            // Reset player poster if no versions available
            setPlayerPoster(currentAnimeData?.itemType === 'anime-series' ? currentAnimeData.seasons?.[currentSelectedSeasonIndex]?.episodes?.[currentSelectedEpisodeIndex] : null);
        } else if (currentActiveVersion === null && activeVersionKey && !availableUrls[activeVersionKey]) {
            // If the intended active version wasn't actually available
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${activeVersionKey}" không có sẵn.`, false, true);
        } else {
            hideVideoMessage(); // Hide message if a valid version is active or available
        }

        // Update skip intro button visibility based on the new active URL
        updateSkipIntroButtonVisibility();
    };

    // --- localStorage Functions ---

    /**
     * Saves the user's preferred version for a specific anime.
     * @param {number|string} animeId - The ID of the anime.
     * @param {string} versionKey - The selected version key (e.g., 'vietsub').
     */
    const saveVersionPreference = (animeId, versionKey) => {
        if (!animeId || !versionKey) return;
        try {
            localStorage.setItem(`animePref_${animeId}_version`, versionKey);
            console.log(`Saved version preference (Anime ID ${animeId}): ${versionKey}`);
        } catch (e) { console.error("Error saving preference to localStorage (Anime):", e); }
    };

    /**
     * Loads the user's preferred version for a specific anime.
     * @param {number|string} animeId - The ID of the anime.
     * @returns {string|null} The preferred version key or null.
     */
    const loadVersionPreference = (animeId) => {
        if (!animeId) return null;
        try {
            const pref = localStorage.getItem(`animePref_${animeId}_version`);
            console.log(`Loaded version preference (Anime ID ${animeId}): ${pref}`);
            return pref;
        } catch (e) { console.error("Error loading preference from localStorage (Anime):", e); return null; }
    };

    /**
     * Prepares the video player for a specific version without starting playback.
     * Updates button states and sets the player poster.
     * @param {string} versionKey - The version to prepare (e.g., 'vietsub').
     */
    const prepareVideoPlayback = (versionKey) => {
        if (!currentAnimeData) {
            console.error("prepareVideoPlayback: currentAnimeData is null.");
            updateVersionButtonStates({}, null);
            setPlayerPoster();
            currentVideoUrl = null;
            updateSkipIntroButtonVisibility();
            return;
        }

        let availableUrls = {};
        let episodeForPoster = null; // Used to get the correct thumbnail for series

        // Get available URLs based on whether it's a movie or series
        if (currentAnimeData.itemType === 'anime-movie') {
            availableUrls = currentAnimeData.videoUrls || {};
            console.log("prepareVideoPlayback (Anime Movie): Available URLs:", availableUrls);
        } else if (currentAnimeData.itemType === 'anime-series') {
            const season = currentAnimeData.seasons?.[currentSelectedSeasonIndex];
            const episode = season?.episodes?.[currentSelectedEpisodeIndex];
            if (!episode) {
                console.error("prepareVideoPlayback (Anime Series): Episode data not found for S", currentSelectedSeasonIndex, "E", currentSelectedEpisodeIndex);
                updateVersionButtonStates({}, null); // Disable all buttons
                setPlayerPoster(); // Reset poster
                currentVideoUrl = null;
                updateSkipIntroButtonVisibility();
                return;
            }
            availableUrls = episode.videoUrls || {};
            episodeForPoster = episode;
            console.log(`prepareVideoPlayback (Anime Series S${season?.seasonNumber || '?'} E${episode.episodeNumber}): Available URLs:`, availableUrls);
        } else {
             console.error("prepareVideoPlayback: Unknown itemType:", currentAnimeData.itemType);
             updateVersionButtonStates({}, null);
             setPlayerPoster();
             currentVideoUrl = null;
             updateSkipIntroButtonVisibility();
             return;
        }

        const url = availableUrls[versionKey];

        if (url) {
            console.log(`prepareVideoPlayback (Anime): Preparing version: ${versionKey}, URL: ${url}`);
            updateVersionButtonStates(availableUrls, versionKey); // Update buttons, sets currentActiveVersion & currentVideoUrl
            setPlayerPoster(episodeForPoster); // Set poster for the specific episode or movie

            // Only save preference if a valid URL was found for the requested version
            saveVersionPreference(currentAnimeData.id, versionKey); // Save user's choice

            // Update player title without starting playback
            let playerTitleText = currentAnimeData?.title || 'Không có tiêu đề';
            if (currentAnimeData.itemType === 'anime-series' && episodeForPoster) {
                const seasonNumber = currentAnimeData.seasons?.[currentSelectedSeasonIndex]?.seasonNumber;
                playerTitleText += ` - Mùa ${seasonNumber || '?'} Tập ${episodeForPoster.episodeNumber}`;
            }
            if (animeTitlePlayer) animeTitlePlayer.textContent = `Xem: ${playerTitleText}`;

        } else {
            // If the requested version URL doesn't exist
            console.warn(`prepareVideoPlayback (Anime): URL not found for version: ${versionKey}.`);
            updateVersionButtonStates(availableUrls, null); // Update buttons, setting active version to null
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Phiên bản "${versionKey}" không có sẵn.`, false, true);
            // Keep the current poster if the version wasn't found, don't reset unless no versions at all
            if (Object.keys(availableUrls).length === 0) {
                 setPlayerPoster(episodeForPoster); // Reset poster if no versions at all
            }
        }
    };


    // --- Event Handlers ---

    /**
     * Handles clicks on version selection buttons.
     * @param {Event} event - The click event.
     */
    const handleVersionClick = (event) => {
        const button = event.target.closest('.version-button');
        if (!button || button.disabled || !currentAnimeData) return; // Ignore disabled buttons or if data isn't loaded
        const versionKey = button.dataset.version;
        if (!versionKey) return;
        prepareVideoPlayback(versionKey); // Prepare the selected version (doesn't auto-play)
    };

    /**
     * Displays an error message on the page.
     * @param {string} [message="Rất tiếc, đã xảy ra lỗi."] - The error message to display.
     */
    const displayError = (message = "Rất tiếc, đã xảy ra lỗi.") => {
        console.error("Displaying Error:", message);
        if(loadingMessage) loadingMessage.classList.add('hidden');
        if(animeDetailsSkeleton) animeDetailsSkeleton.classList.add('hidden');
        if(animeDetailsContent) animeDetailsContent.classList.add('hidden');
        if(errorMessageContainer) errorMessageContainer.classList.remove('hidden');
        if (errorTextElement) errorTextElement.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i> ${message}`;

        // Update meta tags for error state
        const errorTitle = "Lỗi - Không tìm thấy Anime";
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
     * Formats array data (like genres, cast) into a string.
     * @param {Array|string|null} data - The data to format.
     * @param {string} [separator=', '] - The separator string.
     * @param {number} [limit=Infinity] - Max number of items to join.
     * @returns {string} Formatted string or 'N/A'.
     */
    const formatArrayData = (data, separator = ', ', limit = Infinity) => {
        if (Array.isArray(data)) {
            return data.filter(item => typeof item === 'string' && item.trim()) // Filter out empty strings
                       .slice(0, limit).join(separator) || 'N/A';
        }
        // Handle potential single string input
        const strData = (typeof data === 'string' && data.trim()) ? data : 'N/A';
        if (strData === 'N/A') return 'N/A';
        // Split string by separator (if needed) and apply limit
        return strData.split(separator).map(s => s.trim()).filter(Boolean).slice(0, limit).join(separator);
    };

    /**
     * Creates the HTML for a related content card (movie, series, or anime).
     * @param {object} item - Data object for the related item.
     * @param {string} type - 'movies', 'series', 'anime-movie', 'anime-series'.
     * @returns {string} HTML string for the card.
     */
    const createRelatedItemCard = (item, type) => {
        let detailPageUrl = '#';
        // Determine the correct detail page URL based on the item's type
        if (type === 'anime-series' || type === 'anime-movie') {
            detailPageUrl = `animeDetails.html?id=${item.id}&type=${type}`;
        } else if (type === 'series') {
            detailPageUrl = `filmDetails_phimBo.html?id=${item.id}&type=series`;
        } else { // movies
            detailPageUrl = `filmDetail.html?id=${item.id}&type=movies`;
        }

        const altText = `Poster ${type.includes('anime') ? 'Anime' : (type === 'movies' ? 'phim' : 'phim bộ')} liên quan: ${item.title || 'không có tiêu đề'}`;
        let typeBadge = '';
        // Add appropriate badge based on type
        if (type === 'anime-series' || type === 'series') {
            typeBadge = `<span class="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded shadow-md z-10">Bộ</span>`;
        } else if (type === 'anime-movie') {
            typeBadge = `<span class="absolute top-1 right-1 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded shadow-md z-10">Anime Movie</span>`;
        } else if (type === 'movies') {
             typeBadge = `<span class="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded shadow-md z-10">Lẻ</span>`; // Assuming 'Lẻ' for standard movies
        }

        const posterUrl = item.posterUrl || 'https://placehold.co/300x450/111111/eeeeee?text=No+Poster';
        const titleText = item.title || 'Không có tiêu đề';
        const yearText = item.releaseYear || 'N/A';

        return `
           <a href="${detailPageUrl}" class="related-item-card bg-light-gray rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition duration-300 cursor-pointer group relative block animate-on-scroll animate-slide-up" data-item-id="${item.id}" data-item-type="${type}" aria-label="Xem chi tiết ${titleText}">
               <img src="${posterUrl}" alt="${altText}" class="w-full h-auto object-cover related-item-poster" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/300x450/111111/eeeeee?text=Error'; this.alt='Lỗi tải ảnh poster liên quan ${titleText}';">
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
     * Loads and displays related content based on genre similarity.
     * Fetches from all data sources (movies, series, anime).
     * @param {object} currentItem - The data of the anime currently being viewed.
     */
    const loadRelatedItems = (currentItem) => {
        if (!currentItem || !relatedContentGrid) {
            if(relatedContentGrid) relatedContentGrid.innerHTML = '<p class="text-text-muted col-span-full text-center py-4">Không thể tải nội dung liên quan.</p>';
            return;
        }

        const currentGenres = Array.isArray(currentItem.genre) ? currentItem.genre : (typeof currentItem.genre === 'string' ? [currentItem.genre] : []);
        const currentItemId = currentItem.id;
        const currentItemType = currentItem.itemType; // 'anime-series' or 'anime-movie'

        if (observer) observer.disconnect(); // Disconnect previous observer if any
        if (currentGenres.length === 0) {
            relatedContentGrid.innerHTML = '<p class="text-text-muted col-span-full text-center py-4">Không có thông tin thể loại để tìm nội dung tương tự.</p>';
            return;
        }

        // Combine all potential related items from different sources
        // Add a 'sourceType' property to distinguish where they came from if needed,
        // but 'itemType' from the data itself is more reliable.
        const allPotentialRelated = [
            ...(allMoviesData || []).map(item => ({ ...item, itemType: item.itemType || 'movies' })), // Use itemType from data or default
            ...(allSeriesData || []).map(item => ({ ...item, itemType: item.itemType || 'series' })), // Use itemType from data or default
            ...(allAnimeItems || []).map(item => ({ ...item, itemType: item.itemType || (item.episodes === null ? 'anime-movie' : 'anime-series') })) // Ensure anime items have itemType
        ];

        // Filter based on genre similarity, excluding the current item
        const relatedItems = allPotentialRelated.filter(item => {
            // Exclude the exact same item (same ID and type)
            if (item.id === currentItemId && item.itemType === currentItemType) return false;

            // Check for genre overlap
            const itemGenres = Array.isArray(item.genre) ? item.genre : (typeof item.genre === 'string' ? [item.genre] : []);
            return itemGenres.some(g => currentGenres.includes(g));
        })
        .sort(() => 0.5 - Math.random()) // Shuffle the results
        .slice(0, 6); // Limit to 6 related items

        // Display the related items
        if (relatedItems.length > 0) {
            relatedContentGrid.innerHTML = relatedItems.map((itemData, index) => {
                 // Pass itemType to card creation
                 const cardHTML = createRelatedItemCard(itemData, itemData.itemType);
                 // Add index for animation delay
                 const cardWithIndex = cardHTML.replace('<a ', `<a data-index="${index}" `);
                 return cardWithIndex;
            }).join('');
            // Observe the newly added cards for animation
            observeElements(relatedContentGrid.querySelectorAll('.related-item-card.animate-on-scroll'));
        } else {
            relatedContentGrid.innerHTML = '<p class="text-text-muted col-span-full text-center py-4">Không tìm thấy nội dung nào tương tự.</p>';
        }
    };

    /**
     * Updates the page's meta tags for SEO and social sharing.
     * @param {object} anime - The anime data object.
     */
    const updateMetaTags = (anime) => {
        if (!anime) return;

        const pageUrl = window.location.href;
        const animeTitleText = anime.title || 'Anime không có tiêu đề';
        const animeYearText = anime.releaseYear ? `(${anime.releaseYear})` : '';
        const typeText = anime.itemType === 'anime-movie' ? 'Anime Movie' : 'Anime Series'; // More descriptive type for title
        const fullTitle = `${typeText}: ${animeTitleText} ${animeYearText} - Xem Online Vietsub, Thuyết Minh | Flick Tale`;

        // Create description (max 160 chars)
        let description = `Xem ${typeText.toLowerCase()} ${animeTitleText} ${animeYearText} online tại Flick Tale. `;
        if (anime.description) {
            const firstSentence = anime.description.split('.')[0];
            description += (firstSentence.length < 100 ? firstSentence + '.' : anime.description.substring(0, 100) + '...'); // Shorter description
        } else {
            description += `Thông tin chi tiết, các tập, phiên bản Vietsub, Thuyết minh.`;
        }
        description = description.substring(0, 160);

        const genresText = formatArrayData(anime.genre, ', ');
        // Use Studio and Cast/Seiyuu if available in data, otherwise fallback
        const studioText = anime.studio || anime.director || ''; // Assuming 'studio' might be added to JSON
        const castText = formatArrayData(anime.cast || anime.seiyuu, ', ', 3); // Assuming 'seiyuu' might be added

        // Create keywords
        const keywords = `xem anime ${animeTitleText}, ${animeTitleText} online, ${animeTitleText} vietsub, ${animeTitleText} thuyết minh, ${genresText}, anime ${anime.releaseYear || ''}, ${studioText}, ${castText}, Flick Tale`;

        // --- Update Meta Tags ---
        if (pageTitleElement) pageTitleElement.textContent = fullTitle;
        if (metaDescriptionTag) metaDescriptionTag.content = description;
        if (metaKeywordsTag) metaKeywordsTag.content = keywords;

        // Open Graph Tags
        if (ogUrlTag) ogUrlTag.content = pageUrl;
        if (ogTitleTag) ogTitleTag.content = fullTitle;
        if (ogDescriptionTag) ogDescriptionTag.content = description;
        if (ogImageTag) ogImageTag.content = anime.posterUrl || 'https://placehold.co/1200x630/101010/ffffff?text=Anime+Poster';
        if (ogTypeTag) ogTypeTag.content = anime.itemType === 'anime-movie' ? 'video.movie' : 'video.tv_show';
        if (ogSiteNameTag) ogSiteNameTag.content = "Flick Tale"; // Update Site Name
        // Optional: Add director/actor if relevant (using studio/cast as fallback)
        if (ogVideoDirectorTag) ogVideoDirectorTag.content = studioText;
        if (ogVideoActorTag) ogVideoActorTag.content = formatArrayData(anime.cast || anime.seiyuu, ', ', 4);
        if (ogVideoReleaseDateTag && anime.releaseYear) ogVideoReleaseDateTag.content = anime.releaseYear.toString();

        // Twitter Card Tags
        if (twitterCardTag) twitterCardTag.content = "summary_large_image";
        if (twitterUrlTag) twitterUrlTag.content = pageUrl;
        if (twitterTitleTag) twitterTitleTag.content = fullTitle;
        if (twitterDescriptionTag) twitterDescriptionTag.content = description;
        if (twitterImageTag) twitterImageTag.content = anime.posterUrl || 'https://placehold.co/1200x630/101010/ffffff?text=Anime+Poster';

        console.log("Updated meta tags for Anime:", animeTitleText);
    };

    // --- Anime Specific Functions (Series Only) ---

    /**
     * Populates the season selector dropdown.
     * @param {Array} seasons - Array of season objects.
     */
    const populateSeasonSelector = (seasons) => {
        if (!seasonSelect || !seasons || seasons.length === 0) {
            if (seasonSelectorContainer) seasonSelectorContainer.classList.add('hidden');
            if (skeletonAnimeContentSection) skeletonAnimeContentSection.classList.add('hidden'); // Hide skeleton too
            return;
        }
        if (seasonSelectorContainer) seasonSelectorContainer.classList.remove('hidden');
        if (skeletonAnimeContentSection) skeletonAnimeContentSection.classList.add('hidden'); // Hide skeleton

        seasonSelect.innerHTML = ''; // Clear previous options
        seasons.forEach((season, index) => {
            const option = document.createElement('option');
            option.value = index.toString(); // Use index as value
            option.textContent = `Mùa ${season.seasonNumber}`;
            if (index === currentSelectedSeasonIndex) option.selected = true;
            seasonSelect.appendChild(option);
        });
        handleSeasonChange(); // Load episodes for the initially selected season
    };

    /**
     * Populates the optional episode selector dropdown.
     * @param {Array} episodes - Array of episode objects for the current season.
     */
    const populateEpisodeSelector = (episodes) => {
        if (!episodeSelect || !episodes || episodes.length === 0) {
            if (episodeSelectorContainer) episodeSelectorContainer.classList.add('hidden');
            return;
        }
        // Decide whether to show the dropdown (e.g., if > 20 episodes)
        // if (episodes.length > 20) { // Example condition
        //     if (episodeSelectorContainer) episodeSelectorContainer.classList.remove('hidden');
        // } else {
        //     if (episodeSelectorContainer) episodeSelectorContainer.classList.add('hidden');
        // }
        if (episodeSelectorContainer) episodeSelectorContainer.classList.add('hidden'); // Keep hidden for now

        episodeSelect.innerHTML = ''; // Clear previous options
        episodes.forEach((episode, index) => {
            const option = document.createElement('option');
            option.value = index.toString(); // Use index as value
            option.textContent = `Tập ${episode.episodeNumber}: ${episode.title || 'Chưa có tên'}`;
            if (index === currentSelectedEpisodeIndex) option.selected = true;
            episodeSelect.appendChild(option);
        });
    };

    /**
     * Displays episode buttons for the current season.
     * @param {Array} episodes - Array of episode objects.
     */
    const displayEpisodeButtons = (episodes) => {
        if (!episodeListContainer) return;

        if (!episodes || episodes.length === 0) {
            episodeListContainer.innerHTML = '<p class="text-text-muted text-sm italic col-span-full">Không có tập nào cho mùa này.</p>';
            episodeListContainer.className = 'flex flex-wrap gap-2'; // Ensure class is set
            return;
        }

        episodeListContainer.className = 'flex flex-wrap gap-2'; // Ensure class is set
        episodeListContainer.innerHTML = episodes.map((episode, index) => {
            const isActive = index === currentSelectedEpisodeIndex;
            const activeClass = isActive ? 'active' : '';
            const episodeNumber = episode.episodeNumber || (index + 1); // Fallback episode number
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

        // Add event listeners to the newly created buttons
        episodeListContainer.querySelectorAll('.episode-button').forEach(button => {
            button.addEventListener('click', handleEpisodeSelection);
        });
    };

    /**
     * Handles the change event for the season selector.
     */
    const handleSeasonChange = () => {
        if (!seasonSelect || !currentAnimeData || currentAnimeData.itemType !== 'anime-series') return;

        currentSelectedSeasonIndex = parseInt(seasonSelect.value, 10);
        currentSelectedEpisodeIndex = 0; // Reset episode index when season changes

        const season = currentAnimeData.seasons?.[currentSelectedSeasonIndex];
        if (season) {
            populateEpisodeSelector(season.episodes); // Update optional dropdown
            displayEpisodeButtons(season.episodes); // Update button list
            loadEpisodeDataAndUpdateUI(currentSelectedEpisodeIndex); // Prepare first episode of new season
        } else {
            // Handle case where season data is missing
            console.error("handleSeasonChange: Season data not found for index", currentSelectedSeasonIndex);
            if (episodeSelectorContainer) episodeSelectorContainer.classList.add('hidden');
            if (episodeListContainer) {
                 episodeListContainer.innerHTML = '<p class="text-text-muted text-sm italic col-span-full">Lỗi tải dữ liệu mùa.</p>';
                 episodeListContainer.className = 'flex flex-wrap gap-2';
            }
            setPlayerPoster(); // Reset poster
            updateVersionButtonStates({}, null); // Disable version buttons
            currentVideoUrl = null;
            updateSkipIntroButtonVisibility();
        }
    };

    /**
     * Handles the selection of an episode (either from dropdown or button).
     * @param {Event} event - The event object (change or click).
     */
    const handleEpisodeSelection = (event) => {
        let selectedIndex;
        if (event.target.id === 'episode-select') { // From dropdown
            selectedIndex = parseInt(event.target.value, 10);
        } else { // From button click
            const button = event.target.closest('.episode-button');
            if (!button) return; // Ignore clicks outside buttons
            selectedIndex = parseInt(button.dataset.episodeIndex, 10);
        }

        // Validate index and check if it's different from the current one
        if (isNaN(selectedIndex)) {
             console.error("handleEpisodeSelection: Invalid episode index:", selectedIndex);
             return;
        }
        if (selectedIndex === currentSelectedEpisodeIndex) {
             console.log("handleEpisodeSelection: Episode index is the same, no change needed.");
             return; // No change needed
        }

        loadEpisodeDataAndUpdateUI(selectedIndex); // Load data, update UI, prepare player
    };

    /**
     * Loads data for the selected episode, updates UI elements, and prepares the player.
     * @param {number} episodeIndex - The index of the episode to load.
     */
    const loadEpisodeDataAndUpdateUI = (episodeIndex) => {
        if (!currentAnimeData || currentAnimeData.itemType !== 'anime-series') {
            console.warn("loadEpisodeDataAndUpdateUI: Not an anime series or data not loaded.");
            return; // Only applicable for series
        }

        const season = currentAnimeData.seasons?.[currentSelectedSeasonIndex];
        const episode = season?.episodes?.[episodeIndex];

        if (!episode) {
            console.error(`loadEpisodeDataAndUpdateUI: Episode data not found at index ${episodeIndex} for Season ${currentSelectedSeasonIndex}.`);
            setPlayerPoster(); // Reset poster
            updateVersionButtonStates({}, null); // Disable buttons
            currentVideoUrl = null;
            updateSkipIntroButtonVisibility();
            return;
        }

        // Update state
        currentSelectedEpisodeIndex = episodeIndex;

        // Update UI (dropdown and button highlights)
        if (episodeSelect) episodeSelect.value = episodeIndex.toString(); // Sync dropdown if visible
        // Re-render episode buttons to update active state
        displayEpisodeButtons(season.episodes);

        // Determine the version to prepare (load preference or find default)
        let versionToPrepare = loadVersionPreference(currentAnimeData.id);
        const availableUrls = episode.videoUrls || {};

        // If preference is invalid or unavailable, find the best available default
        if (!versionToPrepare || !availableUrls[versionToPrepare]) {
             versionToPrepare = null; // Reset preference
             const versionPriority = ['vietsub', 'dubbed', 'voiceover']; // Order of preference
             for (const key of versionPriority) {
                 if (availableUrls[key]) {
                     versionToPrepare = key;
                     break;
                 }
             }
             // Fallback: pick the first available version if none of the preferred ones exist
             if (!versionToPrepare) {
                 for (const key in availableUrls) {
                     if (availableUrls[key]) {
                         versionToPrepare = key;
                         break;
                     }
                 }
             }
        }

        // Prepare the determined version (or handle no available versions)
        if (versionToPrepare) {
             prepareVideoPlayback(versionToPrepare);
        } else {
             // No versions available for this episode
             console.warn(`loadEpisodeDataAndUpdateUI: No video versions available for episode ${episode.episodeNumber}`);
             setPlayerPoster(episode); // Show episode thumbnail if possible
             updateVersionButtonStates({}, null); // Disable all buttons
             currentVideoUrl = null;
             updateSkipIntroButtonVisibility();
        }
        console.log(`loadEpisodeDataAndUpdateUI: Loaded UI for Season ${season?.seasonNumber || '?'} - Episode ${episode.episodeNumber}. Prepared version: ${currentActiveVersion || 'None'}.`);
    };


    // --- Scroll & Lights Off ---
    /**
     * Handles scroll events to show/hide the scroll-to-top button.
     */
    const handleScroll = () => {
        if (!scrollToTopButton) return;
        const isVisible = window.scrollY > 300; // Show after scrolling 300px
        scrollToTopButton.classList.toggle('visible', isVisible);
        scrollToTopButton.classList.toggle('hidden', !isVisible);
        scrollToTopButton.setAttribute('aria-hidden', String(!isVisible));
    };
    /**
     * Smoothly scrolls the page to the top.
     */
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    /**
     * Toggles the "lights off" mode.
     */
    const toggleLights = () => {
        const isLightsOff = document.body.classList.toggle('lights-off');
        if (toggleLightsButton) toggleLightsButton.setAttribute('aria-pressed', String(isLightsOff));
        if (toggleLightsText) toggleLightsText.textContent = isLightsOff ? 'Bật đèn' : 'Tắt đèn';
        // Toggle icon class
        const icon = toggleLightsButton?.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-lightbulb', !isLightsOff);
            icon.classList.toggle('fa-solid', !isLightsOff); // Assuming FontAwesome 6 solid style
            icon.classList.toggle('fa-moon', isLightsOff);
            icon.classList.toggle('fa-regular', isLightsOff); // Assuming FontAwesome 6 regular style
        }
        console.log("Lights Toggled:", isLightsOff);
    };

    // --- Observer for Animations ---
    /**
     * Initializes the Intersection Observer for scroll animations.
     */
    const initObserver = () => {
        // Check if IntersectionObserver is supported
        if (!('IntersectionObserver' in window)) {
            console.warn("IntersectionObserver not supported, animations disabled.");
            // Fallback: Make all elements visible immediately
            document.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('is-visible'));
            return;
        }

        const options = {
            root: null, // Observe relative to viewport
            rootMargin: '0px',
            threshold: 0.1 // Trigger when 10% of the element is visible
        };

        observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    // Apply animation delay based on data-index attribute
                    const delayIndex = parseInt(target.dataset.index || '0', 10);
                    target.style.animationDelay = `${delayIndex * 100}ms`; // Stagger animation
                    target.classList.add('is-visible'); // Add class to trigger animation
                    observerInstance.unobserve(target); // Stop observing once animated
                }
            });
        }, options);

        // Start observing elements with the class
        observeElements(document.querySelectorAll('.animate-on-scroll'));
    };

    /**
     * Attaches the observer to a list of elements.
     * @param {NodeListOf<Element>} elements - Elements to observe.
     */
    const observeElements = (elements) => {
        if (!observer) return;
        elements.forEach((el) => {
            // Only observe if it has the class and hasn't been made visible yet
            if (el.classList.contains('animate-on-scroll') && !el.classList.contains('is-visible')) {
                 observer.observe(el);
            }
        });
    };

    // --- Main Initialization Logic ---

    // Get ID and Type from URL
    const animeId = getQueryParam('id');
    const typeParam = getQueryParam('type'); // 'anime-series' or 'anime-movie'

    // Validate URL parameters
    if (!animeId || isNaN(parseInt(animeId)) || !['anime-series', 'anime-movie'].includes(typeParam)) {
        displayError("ID hoặc loại Anime không hợp lệ trong URL.");
        if (animeDetailsSkeleton) animeDetailsSkeleton.classList.add('hidden'); // Hide skeleton on error
        if (loadingMessage) loadingMessage.classList.add('hidden');
        return; // Stop execution
    }

    const numericAnimeId = parseInt(animeId);
    if (loadingMessage) loadingMessage.classList.remove('hidden'); // Show loading initially
    if (animeDetailsSkeleton) animeDetailsSkeleton.classList.remove('hidden'); // Show skeleton
    loadYouTubeApiScript(); // Start loading YT API early

    // Fetch all necessary data
    Promise.all([
        fetch('../json/animeData.json').then(res => { // Fetch Anime data is crucial
             if (!res.ok) throw new Error(`HTTP error! status: ${res.status} fetching animeData.json`);
             return res.json();
        }),
        fetch('../json/filmData.json').then(res => { // Fetch movies (optional for related)
             if (!res.ok) { console.warn("Failed to fetch filmData.json, skipping related movies.", res.status); return []; }
             return res.json();
        }),
        fetch('../json/filmData_phimBo.json').then(res => { // Fetch series (optional for related)
             if (!res.ok) { console.warn("Failed to fetch filmData_phimBo.json, skipping related series.", res.status); return []; }
             return res.json();
        })
    ])
    .then(([animeData, movies, series]) => {
        allAnimeItems = animeData || [];
        allMoviesData = movies || [];
        allSeriesData = series || [];

        // Find the specific Anime based on ID and TYPE from URL
        currentAnimeData = allAnimeItems.find(a => a.id === numericAnimeId && a.itemType === typeParam);

        if (currentAnimeData) {
            // --- Populate UI with Anime Data ---
            updateMetaTags(currentAnimeData); // Update meta tags first

            if (animePoster) {
                animePoster.src = currentAnimeData.posterUrl || 'https://placehold.co/400x600/1f1f1f/888888?text=No+Poster';
                animePoster.alt = `Poster ${currentAnimeData.title || 'Anime'}`;
            }
            if (animeMainTitle) animeMainTitle.textContent = currentAnimeData.title || 'Không có tiêu đề';
            if (animeYear) animeYear.textContent = currentAnimeData.releaseYear || 'N/A';
            if (animeGenre) animeGenre.textContent = formatArrayData(currentAnimeData.genre);
            if (animeRating) animeRating.textContent = currentAnimeData.rating ? `${currentAnimeData.rating}` : 'N/A';
            if (animeStatus) animeStatus.textContent = currentAnimeData.status || 'N/A';
            if (animeDescription) animeDescription.textContent = currentAnimeData.description || 'Không có mô tả.';
            // Use Studio/Seiyuu if available, fallback to Director/Cast for structure
            if (animeStudio) animeStudio.textContent = currentAnimeData.studio || currentAnimeData.director || 'N/A';
            if (animeCast) animeCast.textContent = formatArrayData(currentAnimeData.cast || currentAnimeData.seiyuu);

            // --- Handle Series vs Movie Specific UI ---
            if (currentAnimeData.itemType === 'anime-series') {
                console.log("Loading as Anime Series:", currentAnimeData.title);
                if (animeSpecificInfo) animeSpecificInfo.classList.remove('hidden');
                if (animeContentSection) animeContentSection.classList.remove('hidden'); // Show season/episode section
                if (skeletonAnimeContentSection) skeletonAnimeContentSection.classList.add('hidden'); // Hide skeleton for this section
                if (animeSeasonsCount) animeSeasonsCount.textContent = currentAnimeData.numberOfSeasons || 'N/A';
                if (animeEpisodesCount) animeEpisodesCount.textContent = currentAnimeData.totalEpisodes || 'N/A';
                // Initialize season/episode state and populate selectors/buttons
                currentSelectedSeasonIndex = 0; // Start with the first season
                currentSelectedEpisodeIndex = 0; // Start with the first episode
                populateSeasonSelector(currentAnimeData.seasons); // This triggers episode load and player prep for S1 E1
            } else { // Anime Movie
                console.log("Loading as Anime Movie:", currentAnimeData.title);
                if (animeSpecificInfo) animeSpecificInfo.classList.add('hidden');
                if (animeContentSection) animeContentSection.classList.add('hidden'); // Hide season/episode section
                if (skeletonAnimeContentSection) skeletonAnimeContentSection.classList.add('hidden'); // Hide skeleton for this section

                // Prepare the movie player directly
                let versionToPrepare = loadVersionPreference(currentAnimeData.id);
                const availableUrls = currentAnimeData.videoUrls || {};
                // Find best available version if preference is invalid or unavailable
                if (!versionToPrepare || !availableUrls[versionToPrepare]) {
                    versionToPrepare = null;
                    const versionPriority = ['vietsub', 'dubbed', 'voiceover'];
                    for (const key of versionPriority) { if (availableUrls[key]) { versionToPrepare = key; break; } }
                    if (!versionToPrepare) { for (const key in availableUrls) { if (availableUrls[key]) { versionToPrepare = key; break; } } }
                }
                // Prepare the player if a version was found
                if (versionToPrepare) {
                    prepareVideoPlayback(versionToPrepare);
                } else {
                    console.warn(`No video versions available for Anime Movie ID ${numericAnimeId}`);
                    setPlayerPoster(); // Show poster
                    updateVersionButtonStates({}, null); // Disable buttons
                }
            }

            // Load related content (uses all fetched data)
            loadRelatedItems(currentAnimeData);

            // Hide Skeleton and Show Content
            setTimeout(() => {
                if(loadingMessage) loadingMessage.classList.add('hidden');
                if(animeDetailsSkeleton) animeDetailsSkeleton.classList.add('hidden');
                if(errorMessageContainer) errorMessageContainer.classList.add('hidden');
                if(animeDetailsContent) animeDetailsContent.classList.remove('hidden');
                console.log("Anime details content displayed.");
            }, 150); // Short delay to ensure skeleton shows briefly

            initObserver(); // Initialize animations

        } else {
            // Anime not found in animeData.json with the specified ID and type
            displayError(`Không tìm thấy Anime với ID: ${numericAnimeId} và loại: ${typeParam}.`);
        }
    })
    .catch(error => {
        // Handle fetch or processing errors
        console.error('Error loading or processing Anime data:', error);
        displayError(`Đã xảy ra lỗi khi tải dữ liệu: ${error.message || 'Lỗi không xác định'}`);
    });

    // --- Event Listeners Setup ---
    window.addEventListener('scroll', handleScroll);
    if (scrollToTopButton) scrollToTopButton.addEventListener('click', scrollToTop);
    if (versionSelectionContainer) versionSelectionContainer.addEventListener('click', handleVersionClick);
    if (toggleLightsButton) toggleLightsButton.addEventListener('click', toggleLights);
    // Season select listener is added directly because it's a single element
    if (seasonSelect) seasonSelect.addEventListener('change', handleSeasonChange);
    // Episode button listeners added dynamically in displayEpisodeButtons
    // Episode select listener (if enabled)
    if (episodeSelect) episodeSelect.addEventListener('change', handleEpisodeSelection);


    // Lights off overlay click listener
    const lightsOverlay = document.getElementById('lights-overlay');
    if (lightsOverlay) lightsOverlay.addEventListener('click', () => {
        if (document.body.classList.contains('lights-off')) toggleLights();
    });

    // Play video on poster/play button click
    if (videoPosterOverlay) videoPosterOverlay.addEventListener('click', () => {
        if (currentVideoUrl) {
            startVideoPlayback(currentVideoUrl, false); // Start playback without skipping intro
        } else {
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video.`, false, true);
        }
    });
    // Ensure play button click also works (and doesn't propagate if inside overlay)
    if (videoPlayButton) videoPlayButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent triggering overlay click again
        if (currentVideoUrl) {
            startVideoPlayback(currentVideoUrl, false);
        } else {
            showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video.`, false, true);
        }
    });

    // Skip Intro button listener
    if (skipIntroButton) {
        skipIntroButton.addEventListener('click', () => {
            if (currentVideoUrl && currentActiveVersion) {
                const isYouTube = !!getYouTubeVideoId(currentVideoUrl);
                if (isYouTube) {
                    startVideoPlayback(currentVideoUrl, true); // Start playback AND skip intro
                } else {
                    showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Bỏ qua giới thiệu chỉ khả dụng cho YouTube.`, false, true);
                }
            } else {
                showVideoMessage(`<i class="fas fa-info-circle mr-2"></i> Vui lòng chọn tập và phiên bản video trước.`, false, true);
            }
        });
    }

    console.log("Anime Details JS Initialized (v1.2)");

}); // End DOMContentLoaded
