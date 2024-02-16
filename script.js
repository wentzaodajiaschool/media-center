$(document).ready(function () {
  var allData = []; // 用於儲存從伺服器獲取的完整資料

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
		<div class="col-6 col-md-6 col-lg-4 col-xl-2 mb-4">
			<div class="card h-100 d-flex flex-column" data-school="${album.學校}" data-class="${album.班級}">
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
    $("#albums").on("click", ".card", function () {
      var playLink = $(this).data("playlink"); // 獲取卡片的播放鏈接

      // 檢查鏈接是否以特定YouTube鏈接開頭
      if (playLink.startsWith("https://www.youtube.com/embed/videoseries?")) {
        // 更新iframe的src為播放鏈接
        $("#youtubeEmbed").attr("src", playLink + "?autoplay=1"); // 添加自動播放參數
        // 顯示Bootstrap模態框
        var videoModal = new bootstrap.Modal(
          document.getElementById("videoModal"),
          {
            keyboard: true,
          }
        );
        videoModal.show();
      } else if (
        playLink.startsWith("https://drive.google.com/drive/folders")
      ) {
        // 如果鏈接符合條件，新標籤頁中打開
        window.open(playLink + "&openExternalBrowser=1", "_blank");
      }
    });

    // 監聽模態框關閉事件，清除iframe的src
    $("#videoModal").on("hidden.bs.modal", function (e) {
      $("#youtubeEmbed").attr("src", "");
    });

    // 添加動畫
    setTimeout(function () {
      $(".card-animate").addClass("show");
    }, 100);
  }

  // 函式：根據下拉選單選擇過濾專輯卡片
  function filterAlbumsBySelection(school, cls) {
    $("#albums .card").each(function () {
      var cardSchool = $(this).data("school");
      var cardClass = $(this).data("class");
      var cardOpen = $(this).data("open");

      var isSchoolMatch = school === cardSchool || school === "All"; // 如果選擇了特定學校或所有學校
      var isClassMatch =
        cls === "All" ||
        cardClass === cls ||
        (cls === "Others" && cardClass === "");

      if (isSchoolMatch && (isClassMatch || cls === "") && cardOpen === true) {
        // 僅當 cardOpen 為 true 時顯示
        $(this).parent().show(); // 顯示符合條件的卡片
      } else {
        $(this).parent().hide(); // 隱藏不符合條件的卡片
      }
    });
  }

  // 更新下拉選單的事件處理函式
  $("#school, #class").change(function () {
    var selectedSchool = $("#school").val();
    var selectedClass = $("#class").val();
    filterAlbumsBySelection(selectedSchool, selectedClass);
  });

  // 首字大寫
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

  // 函式：從指定 URL 獲取資料並填充下拉選單
  function fetchAndFillDropdowns() {
    $.ajax({
      url: "https://script.google.com/macros/s/AKfycbyKDtd2gD3GPRggKCaZ67uL3vHYPFfyS5zjZtuS83Li0Fes0cZv29dlF-bkTxFCs3DSpA/exec",
      type: "GET",
      success: function (data) {
        console.log("資料請求成功", data);
        allData = data; // 儲存完整資料

        // 檢查 URL 中的 school 參數
        var urlParams = new URLSearchParams(window.location.search);
        var schoolParam = capitalizeFirstLetter(urlParams.get("school"));

        if (schoolParam) {
          // 存在 school 參數時，直接設定下拉選單並禁用
          $("#school")
            .empty()
            .append(new Option(schoolParam, schoolParam))
            .prop("disabled", true);
            updateClassesDropdown(schoolParam);
            $("#school").val(schoolParam);
        } else {
          var schools = new Set();
          data.forEach(function (item) {
            schools.add(item["學校"]);
          });
          schools.forEach(function (school) {
            $("#school").append(new Option(school, school));
          });
          var firstSchool = Array.from(schools)[0];
          updateClassesDropdown(firstSchool);
          $("#school").val(firstSchool);
        }
        // 在這裡調用生成相簿卡片的函式
        generateAlbumCards(allData.filter(item => item["學校"] === $("#school").val())); // 假設相簿資料也在 allData 中
      },
      error: function () {
        console.error("資料請求失敗");
      },
    });
  }

  // 學校選單的事件處理函式
  $("#school").change(function () {
    var selectedSchool = $(this).val();
    updateClassesDropdown(selectedSchool);
  });

  // 呼叫函式以填充下拉選單和生成相簿卡片
  fetchAndFillDropdowns();
});
