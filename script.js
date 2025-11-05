var player;
var videoModal;
var YOUTUBE_API_KEY = "AIzaSyDHjDjcHs4Hc9zRO09l1S63OzC5QLC5DXM"; // WARNING: Insecure for production
var progressUpdateInterval;
var isDraggingProgressBar = false;

// This function creates an <iframe> (and YouTube player)
// after the API code downloads.
function onYouTubeIframeAPIReady() {
  console.log("YouTube API Ready");
}

function onPlayerReady(event) {
  event.target.playVideo();
  updatePlayPauseIcon(true);

  if (progressUpdateInterval) clearInterval(progressUpdateInterval);
  progressUpdateInterval = setInterval(updateProgressBar, 250);
}

function onPlayerStateChange(event) {
    let isPlaying = event.data == YT.PlayerState.PLAYING;
    updatePlayPauseIcon(isPlaying);

    if (event.data === YT.PlayerState.PLAYING) {
        if (progressUpdateInterval) clearInterval(progressUpdateInterval);
        progressUpdateInterval = setInterval(updateProgressBar, 250);
    } else {
        clearInterval(progressUpdateInterval);
    }

    // Highlight the currently playing video in the custom playlist
    if (event.data === YT.PlayerState.PLAYING) {
        const videoUrl = event.target.getVideoUrl();
        const videoIdMatch = videoUrl.match(/v=([^&]+)/);
        if (videoIdMatch && videoIdMatch[1]) {
            const currentVideoId = videoIdMatch[1];
            $('.playlist-item').removeClass('active');
            $(`.playlist-item[data-video-id="${currentVideoId}"]`).addClass('active');
        }
    }
}

function updatePlayPauseIcon(isPlaying) {
    const icon = isPlaying ? 'fa-pause' : 'fa-play';
    $('#play-pause-btn').find('i').removeClass('fa-play fa-pause').addClass(icon);
}

function stopVideo() {
    if (player && typeof player.stopVideo === 'function') {
        player.stopVideo();
    }
}

function destroyPlayer() {
    if (player && typeof player.destroy === 'function') {
        player.destroy();
    }
    player = null;
}

function formatTime(seconds) {
    seconds = Math.round(seconds);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateProgressBar() {
    if (player && player.getDuration && !isDraggingProgressBar) {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        if (duration > 0) {
            const progressPercent = (currentTime / duration) * 100;
            $('#custom-progress-bar').css('width', progressPercent + '%');
            $('#progress-bar-thumb').css('left', progressPercent + '%');
            $('#current-time').text(formatTime(currentTime));
            $('#total-duration').text(formatTime(duration));
        }
    }
}

// Fetches playlist items from YouTube Data API and displays them
function fetchAndDisplayPlaylist(listId) {
    const playlistContainer = $('#custom-playlist');
    playlistContainer.empty();

    function fetchPage(pageToken) {
        let apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${listId}&key=${YOUTUBE_API_KEY}`;
        if (pageToken) {
            apiUrl += `&pageToken=${pageToken}`;
        }

        $.ajax({
            url: apiUrl,
            type: "GET",
            success: function(response) {
                response.items.forEach(function(item) {
                    const snippet = item.snippet;
                    const title = snippet.title;
                    const thumbnail = snippet.thumbnails.default.url;
                    const videoId = snippet.resourceId.videoId;

                    if (title !== "Private video" && title !== "Deleted video") {
                        const playlistItemHtml = `
                            <div class="playlist-item" data-video-id="${videoId}">
                                <img src="${thumbnail}" alt="${title}">
                                <div class="title">${title}</div>
                            </div>
                        `;
                        playlistContainer.append(playlistItemHtml);
                    }
                });

                // If there is a next page, recursively fetch it
                if (response.nextPageToken) {
                    fetchPage(response.nextPageToken);
                }
            },
            error: function() {
                console.error("Failed to fetch playlist data from YouTube API.");
                playlistContainer.html('<p class="text-white">無法載入播放清單。</p>');
            }
        });
    }

    fetchPage(null); // Start fetching the first page
}

$(document).ready(function () {
  var allData = []; // 用於儲存從伺服器獲取的完整資料
  videoModal = new bootstrap.Modal(document.getElementById('videoModal'));

  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').then(function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }, function(err) {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }

  window.onscroll = function () {
    scrollFunction();
  };

  function scrollFunction() {
    var scrollTopBtn = document.getElementById("scrollTopBtn");
    if (
      document.body.scrollTop > 20 ||
      document.documentElement.scrollTop > 20
    ) {
      scrollTopBtn.style.display = "block";
    } else {
      scrollTopBtn.style.display = "none";
    }
  }

  document
    .getElementById("scrollTopBtn")
    .addEventListener("click", function () {
      document.body.scrollTop = 0; // 對於 Safari
      document.documentElement.scrollTop = 0; // 對於 Chrome, Firefox, IE 和 Opera
    });

  // 函式：根據選擇的學校更新班級選單
  function updateClassesDropdown(selectedSchool) {
    var classes = new Set(); // 使用 Set 來確保不重複
    allData.forEach(function (item) {
      if (item["學校"] === selectedSchool) {
        var className = item["班級"].trim(); // 移除前後空白
        if (className === "") {
          classes.add("Others"); // 如果是空白，則使用 "Others"
        } else {
          classes.add(className);
        }
      }
    });
    var sortedClasses = Array.from(classes).sort(); // 轉換為陣列並排序
    if (sortedClasses.includes("Others")) {
      sortedClasses = sortedClasses.filter((cls) => cls !== "Others"); // 移除 "Others"
      sortedClasses.push("Others"); // 將 "Others" 添加到最後
    }
    $("#class").empty(); // 清空班級選單
    $("#class").append(new Option("All", "")); // 添加預設選項
    sortedClasses.forEach(function (cls) {
      $("#class").append(new Option(cls, cls));
    });
  }

  // 函式：生成相簿卡片
  function generateAlbumCards(albumData) {
    var albumsContainer = $("#albums");
    albumsContainer.empty(); // 清空先前的內容

    // 按專輯名稱排序
    albumData.sort(function (a, b) {
      return a.標題.localeCompare(b.標題);
    });

    albumData.forEach(function (album) {
      var albumHtml = `
		<div class="col-6 col-md-6 col-lg-4 col-xl-3 mb-4">
			<div class="card h-100 d-flex flex-column card-animate" data-school="${album.學校}" data-class="${album.班級}" data-open="${album.開放}" data-playlink="${album.播放連結}">
				<img src="${album.封面連結}" class="card-img-top" alt="${album.標題}">
				<div class="card-body d-flex flex-column">
					<h5 class="card-title mb-3">${album.標題}</h5>
					<!-- 如有其他按鈕或資訊，可在這裡添加 -->
				</div>
			</div>
		</div>
	  `;
      albumsContainer.append(albumHtml);
    });

    // 為卡片添加點擊事件
    $("#albums").off("click", ".card").on("click", ".card", function () {
      var playLink = $(this).data("playlink"); // 獲取卡片的播放鏈接

      if (playLink.startsWith("https://www.youtube.com/embed/videoseries?")) {
        const listMatch = playLink.match(/list=([^&]+)/);
        if (listMatch && listMatch[1]) {
          const listId = listMatch[1];
          
          fetchAndDisplayPlaylist(listId); // Fetch and build our custom playlist UI

          destroyPlayer(); // Destroy previous player instance if it exists

          player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            playerVars: {
              'playsinline': 1,
              'autoplay': 1,
              'listType': 'playlist',
              'list': listId,
              'controls': 0, // Show YouTube default controls
              'showinfo': 0,
              'rel': 0,
              'iv_load_policy': 3, // Hide annotations
              'modestbranding': 1  // Minimize YouTube logo
            },
            events: {
              'onReady': onPlayerReady,
              'onStateChange': onPlayerStateChange
            }
          });
          videoModal.show();
        }
      } else if (
        playLink.startsWith("https://drive.google.com/drive/folders")
      ) {
        // 如果鏈接符合條件，新標籤頁中打開
        window.open(playLink + "&openExternalBrowser=1", "_blank");
      }
    });

    // 監聽模態框關閉事件，清除iframe的src
    $("#videoModal").on("hidden.bs.modal", function (e) {
        destroyPlayer();
        updatePlayPauseIcon(false);
        $('#custom-playlist').empty(); // Clear the custom playlist
        clearInterval(progressUpdateInterval);
        $('#current-time').text('0:00');
        $('#total-duration').text('0:00');
    });

    // Custom controls
    $('#play-pause-btn').on('click', function () {
        if (player && typeof player.getPlayerState === 'function') {
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
                player.pauseVideo();
            } else {
                player.playVideo();
            }
        }
    });

    $('#next-btn').on('click', function () {
        if (player && typeof player.nextVideo === 'function') {
            player.nextVideo();
        }
    });

    $('#prev-btn').on('click', function () {
        if (player && typeof player.previousVideo === 'function') {
            player.previousVideo();
        }
    });

    // Click handler for custom playlist items
    $('#custom-playlist').on('click', '.playlist-item', function() {
        if (player && typeof player.loadVideoById === 'function') {
            const videoId = $(this).data('video-id');
            player.loadVideoById(videoId);
        }
    });

    // 添加動畫
    setTimeout(function () {
      $(".card-animate").addClass("show");
    }, 100);
  }

  // 函式：根據下拉選單選擇過濾專輯卡片
  function filterAlbumsBySelection() {
    var selectedSchool = $("#school").val();
    var selectedClass = $("#class").val();

    $("#albums .card").each(function () {
      var cardSchool = $(this).data("school");
      var cardClass = $(this).data("class");
      var cardOpen = $(this).data("open");

      var isSchoolMatch = selectedSchool === cardSchool || selectedSchool === "All"; // 如果選擇了特定學校或所有學校
      var isClassMatch =
        selectedClass === "All" ||
        cardClass === selectedClass ||
        (selectedClass === "Others" && cardClass === "");

      if (isSchoolMatch && (isClassMatch || selectedClass === "") && cardOpen === true) {
        // 僅當 cardOpen 為 true 時顯示
        $(this).parent().show(); // 顯示符合條件的卡片
      } else {
        $(this).parent().hide(); // 隱藏不符合條件的卡片
      }
    });
  }

  // 首字大寫
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

  // 函式：從本地 data.json 獲取資料並填充下拉選單
  function fetchAndFillDropdownsFromLocal() {
    $.ajax({
      url: "https://rainbowstudent.wentzao.com/mediacenter/api/data", // 從本地 JSON 檔案變更
      type: "GET",
      dataType: "json", // 需要 JSON 回應
      success: function (data) {
        console.log("本地資料請求成功", data);
        allData = data; // 儲存完整資料

        // 僅排序一次資料
        allData.sort(function (a, b) {
            return a.標題.localeCompare(b.標題);
        });

        // 一次性生成所有卡片
        generateAlbumCards(allData);

        // 填充學校下拉選單
        var schools = new Set();
        allData.forEach(function (item) {
            schools.add(item["學校"]);
        });
        
        var schoolSelect = $("#school");
        schoolSelect.empty();
        schools.forEach(function (school) {
            schoolSelect.append(new Option(school, school));
        });

        // 處理 URL 參數或設定預設值
        var urlParams = new URLSearchParams(window.location.search);
        var schoolParam = urlParams.get("school");

        if (schoolParam) {
            schoolParam = capitalizeFirstLetter(schoolParam);
            if (Array.from(schools).includes(schoolParam)) {
                schoolSelect.val(schoolParam).prop("disabled", true);
            }
        }
        
        // 以程式化方式觸發 change 事件以設定初始狀態
        schoolSelect.trigger("change");
      },
      error: function () {
        console.error("本地資料請求失敗");
      },
    });
  }

  // 函式：從遠端 URL 獲取資料並填充下拉選單
  function fetchAndFillDropdownsFromRemote() {
    $.ajax({
      url: "https://script.google.com/macros/s/AKfycbyKDtd2gD3GPRggKCaZ67uL3vHYPFfyS5zjZtuS83Li0Fes0cZv29dlF-bkTxFCs3DSpA/exec",
      type: "GET",
      success: function (data) {
        console.log("遠端資料請求成功", data);
        allData = data; // 儲存完整資料

        // 後續邏輯與本地版本相同，可以考慮合併
        // 僅排序一次資料
        allData.sort(function (a, b) {
            return a.標題.localeCompare(b.標題);
        });

        // 一次性生成所有卡片
        generateAlbumCards(allData);

        // 填充學校下拉選單
        var schools = new Set();
        allData.forEach(function (item) {
            schools.add(item["學校"]);
        });

        var schoolSelect = $("#school");
        schoolSelect.empty();
        schools.forEach(function (school) {
            schoolSelect.append(new Option(school, school));
        });

        // 處理 URL 參數或設定預設值
        var urlParams = new URLSearchParams(window.location.search);
        var schoolParam = urlParams.get("school");

        if (schoolParam) {
            schoolParam = capitalizeFirstLetter(schoolParam);
            if (Array.from(schools).includes(schoolParam)) {
                schoolSelect.val(schoolParam).prop("disabled", true);
            }
        }

        // 以程式化方式觸發 change 事件以設定初始狀態
        schoolSelect.trigger("change");
      },
      error: function () {
        console.error("遠端資料請求失敗");
      },
    });
  }

  // 分離的事件處理程序
  $("#school").change(function () {
    var selectedSchool = $(this).val();
    updateClassesDropdown(selectedSchool);
    filterAlbumsBySelection();
  });

  $("#class").change(function () {
    filterAlbumsBySelection();
  });

  // 呼叫函式以填充下拉選單和生成相簿卡片
  fetchAndFillDropdownsFromLocal();

  function setupProgressBarHandlers() {
    const progressBarContainer = $('#custom-progress-bar-container');
    const thumb = $('#progress-bar-thumb');
    const tooltip = $('#progress-tooltip');

    const seekFromEvent = (e) => {
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        if (clientX === undefined) return;

        const rect = progressBarContainer[0].getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const width = progressBarContainer.width();
        let progressPercent = (offsetX / width) * 100;

        progressPercent = Math.max(0, Math.min(100, progressPercent));
        
        const duration = player.getDuration();
        if (duration > 0) {
            const seekTime = (duration * progressPercent) / 100;
            
            // Only seek if the user is not just hovering
            if (isDraggingProgressBar) {
                player.seekTo(seekTime, true);
            }
            
            $('#custom-progress-bar').css('width', progressPercent + '%');
            $('#progress-bar-thumb').css('left', progressPercent + '%');

            // Update tooltip
            tooltip.text(formatTime(seekTime));
            tooltip.css('left', progressPercent + '%');
        }
    };

    thumb.on('mousedown touchstart', function(e) {
        e.preventDefault();
        isDraggingProgressBar = true;
        tooltip.css('opacity', '1');
    });

    $(window).on('mousemove touchmove', function(e) {
        if (!isDraggingProgressBar) return;
        e.preventDefault();
        seekFromEvent(e);
    }).on('mouseup touchend', function(e) {
        if (isDraggingProgressBar) {
            isDraggingProgressBar = false;
            tooltip.css('opacity', '0');
            // We need to call seek one last time on release
            player.seekTo( (player.getDuration() * parseFloat(thumb.css('left')) / progressBarContainer.width()), true);
        }
    });

    progressBarContainer.on('click', function(e) {
        if (e.target.id === 'progress-bar-thumb') return;
        seekFromEvent(e);
    });
  }

  setupProgressBarHandlers();
});
