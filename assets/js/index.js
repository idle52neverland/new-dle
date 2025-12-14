/* ============================================================
   날짜 / 재생시간 유틸
============================================================ */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function simplifyDuration(d) {
  if (!d) return "";
  if (/^00:\d{2}:\d{2}/.test(d)) return d.slice(3);
  return d;
}

/* ============================================================
   ★ 카테고리 매핑 (URL slug 사용을 위해 추가)
============================================================ */
const CATEGORY_MAP = {
    "All Videos": "1",
    "공식 채널": "2",
    "발매곡": "3",
    "OST·참여곡": "4",
    "음악방송·시상식": "5",
    "공연·축제": "6",
    "자체 예능": "7",
    "녹음 비하인드": "8",
    "출연 콘텐츠": "9",
    "노래 클립": "10",
    "매거진·인터뷰": "11",
    "라디오·오디오쇼": "12",
    "라이브 방송": "13",
    "광고": "14",
    "기타": "15",
    "Shorts": "16",
    "X(Twitter)": "17"
};

const SLUG_MAP = Object.fromEntries(
    Object.entries(CATEGORY_MAP).map(([name, slug]) => [slug, name])
);


/* ============================================================
   전역 변수
============================================================ */
let allCards = [];
let filteredCards = [];
let visibleCount = 0;

function getCardsPerLoad() {
  const width = window.innerWidth;
  const isMobile = width < 768;
  const container = document.getElementById("allCards");
  const isVertical = container.classList.contains("vertical-mode");

  if (isMobile) {
    return 40; 
  } else {
    const containerWidth = Math.min(width, 1284);
    
    if (isVertical) {
      const cardsPerRow = Math.floor(containerWidth / 192);
      return cardsPerRow * 15; 
    } else {
      const cardsPerRow = Math.floor(containerWidth / 276);
      return cardsPerRow * 15; 
    }
  }
}

let sortOrder = "newest";

let activeFilters = {
  year: null,
  month: null,
  subtag: null,
  // ★★★ [NEW] 기간 설정 필터 변수 추가 ★★★
  startDate: null, 
  endDate: null
};

/* DOM */
const searchInput = document.getElementById("searchInput");
const searchBtn   = document.getElementById("searchBtn");

const yearFilter  = document.getElementById("yearFilter");
const monthFilter = document.getElementById("monthFilter");
const subTagFilter = document.getElementById("subTagFilter");
// ★★★ [NEW] 기간 설정 버튼 DOM 변수 추가 ★★★
const dateRangeIconBtn = document.getElementById("dateRangeIconBtn"); 

const toggleSortBtn = document.getElementById("toggleSortBtn");
const cardCount      = document.getElementById("cardCount");

const loadMoreBtn    = document.getElementById("loadMoreBtn");
const scrollTopBtn   = document.getElementById("scrollTopBtn");

const categoryDropdownBtn = document.getElementById("categoryDropdownBtn");
const categoryDropdown    = document.getElementById("categoryDropdown");
const currentCategory     = document.getElementById("currentCategory");

const filterMenu     = document.getElementById("filterMenu");
const allCardsContainer = document.getElementById("allCards");

// 화면 전환용
const mainHomePage = document.getElementById("mainHomePage");
const filterBar = document.querySelector(".filter-bar");
const videoCountRow = document.querySelector(".video-count-row");
const footer = document.querySelector(".footer");
const homeBtn = document.getElementById("homeBtn");


/* ============================================================
   카테고리 → 데이터변수 매핑
============================================================ */
function categoryToVarName(category) {
  const raw = category.trim();

  if (raw === "X(Twitter)") return "xTwitterCards";

  const hasHangul = /[가-힣]/.test(raw);

  if (hasHangul) {
    return raw
      .replace(/[^가-힣a-zA-Z0-9]/g, "") 
      + "Cards";
  } else {
    return (
      raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, " ")
        .split(" ")
        .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
        .join("") + "Cards"
    );
  }
}



/* ============================================================
   All Videos = 모든 카테고리를 합친 배열 생성
============================================================ */
function buildAllVideos() {
  const vars = [
    "발매곡Cards", "OST참여곡Cards", "음악방송시상식Cards", "공연축제Cards",
    "공식채널Cards", "자체예능Cards", "녹음비하인드Cards", "출연콘텐츠Cards",
    "노래클립Cards", "매거진인터뷰Cards", "라디오오디오쇼Cards", "라이브방송Cards",
    "광고Cards", "기타Cards", "ShortsCards", "xTwitterCards"  
  ];

  let arr = [];
  vars.forEach(v => {
    if (Array.isArray(window[v])) arr = arr.concat(window[v]);
  });

  return arr;
}

/* ============================================================
   카드 정렬
============================================================ */
function sortCards(list) {
  return list.sort((a, b) => {
    const da = new Date(a.date);
    const db = new Date(b.date);
    return sortOrder === "newest" ? db - da : da - db;
  });
}

/* ============================================================
   카드 렌더링
============================================================ */
function renderCards(reset = false) {
  if (reset) {
    allCardsContainer.innerHTML = "";
    visibleCount = 0;
  }

  const cat = currentCategory.textContent.trim(); 

  const cardsPerLoad = getCardsPerLoad();
  const slice = filteredCards.slice(visibleCount, visibleCount + cardsPerLoad);

  slice.forEach(item => {
  const card = document.createElement("div");

  if (cat === "X(Twitter)") {
    card.className = "tweet-card";
    
    const compatUrl = item.url.replace("https://x.com", "https://twitter.com");

    card.innerHTML = `
      <blockquote class="twitter-tweet" data-lang="ko" data-dnt="true">
        <a href="${compatUrl}"></a> </blockquote>
    `;
  }
    else {
      card.className = "card";
      const displayThumb = item.thumbnail || "";
      const displayTitle = item.title || "";
      
      card.innerHTML = `
        <div class="thumb-wrap">
          <img src="${displayThumb}">
          <div class="thumb-duration">${simplifyDuration(item.duration)}</div>
        </div>
        <div class="card-title">${displayTitle}</div>
        <div class="card-info">${
          [
            (item.date ? String(item.date).split("T")[0] : ""),
            (item.member || ""),
            (item.note || "")
          ].filter(Boolean).join(" ")
        }</div>
      `;

      card.addEventListener("click", () => {
        if (item.link) window.open(item.link, "_blank");
      });
    }

    allCardsContainer.appendChild(card);

    if (cat !== "X(Twitter)") {
      requestAnimationFrame(() => {
        card.classList.add("show");
      });
    }
  }); 

if (cat === "X(Twitter)") {
    setTimeout(() => {
        if (window.twttr && window.twttr.widgets) {
            window.twttr.widgets.load(allCardsContainer);
        }
    }, 50); 
}

  visibleCount += slice.length;
  cardCount.textContent = `총 ${filteredCards.length}건`;
  loadMoreBtn.style.display = (visibleCount >= filteredCards.length) ? "none" : "block";
}

/* ============================================================
   ★ 메인 페이지 / 카드 뷰 전환 함수 
============================================================ */
function toggleMainView(showCards) {
  if (showCards) {
    // 카드 뷰 보이기: 메인 페이지 숨김, 카드 관련 요소 보임
    mainHomePage.classList.add("hidden");
    filterBar.classList.remove("hidden");
    videoCountRow.classList.remove("hidden");
    allCardsContainer.classList.remove("hidden");
    footer.classList.remove("hidden");
    scrollTopBtn.classList.remove("hidden");
  } else {
    // 메인 페이지 보이기: 메인 페이지 보임, 카드 관련 요소 숨김
    mainHomePage.classList.remove("hidden");
    filterBar.classList.add("hidden");
    videoCountRow.classList.add("hidden");
    allCardsContainer.classList.add("hidden");
    footer.classList.add("hidden");
    scrollTopBtn.classList.add("hidden");
  }
}

/* ============================================================
   카테고리 변경 
============================================================ */
function changeCategory(categoryName, updateURL = true) {
  currentCategory.textContent = categoryName;

  // 1. 카드 데이터 로드
  if (categoryName === "All Videos") {
    allCards = buildAllVideos().filter(card => {
        return card.category !== "Shorts" && card.category !== "X(Twitter)";
    });
  } else {
    const varName = categoryToVarName(categoryName);
    allCards = Array.isArray(window[varName]) ? [...window[varName]] : [];
  }

  // 2. 화면 전환 
  toggleMainView(true);

  // 3. 카드 컨테이너 모드 설정 
  const container = document.getElementById("allCards"); 
  
  if (categoryName === "Shorts") {
    container.classList.add("vertical-mode");
    container.classList.remove("twitter-mode");
  } else if (categoryName === "X(Twitter)") {
    container.classList.add("twitter-mode");
    container.classList.remove("vertical-mode");
  } else {
    container.classList.remove("vertical-mode");
    container.classList.remove("twitter-mode");
  }

  // 4. 필터 초기화 (기간 필터 포함)
  activeFilters = { 
    year: null, 
    month: null, 
    subtag: null, 
    startDate: null, // 기간 필터 초기화
    endDate: null 
  };
  yearFilter.textContent = "연도";
  monthFilter.textContent = "월";
  subTagFilter.textContent = "서브필터";
  
  // ★ 달력 버튼 UI 초기화 및 비활성 스타일 제거
  if (dateRangeIconBtn) {
    dateRangeIconBtn.textContent = "🗓️"; 
    dateRangeIconBtn.classList.remove('active');
  }


  // 5. 카드 필터링 및 정렬
  filteredCards = sortCards([...allCards]);

  // 6. 카드 렌더링
  renderCards(true);

  // 7. URL 업데이트
  if (updateURL) {
    const categorySlug = CATEGORY_MAP[categoryName] || categoryName;
    
    const params = new URLSearchParams(location.search);
    const query = params.get("q"); 
    
    let url = `?category=${categorySlug}`;
    if (query) {
      url += `&q=${encodeURIComponent(query)}`;
    }
    
    history.pushState({ category: categorySlug }, "", url);
  }

// 8. Shorts 특별 처리 
if (categoryName === "Shorts") { 
  filterBar.classList.add("hidden");
  toggleSortBtn.classList.add("hidden");
  videoCountRow.classList.add("hidden");
  if (dateRangeIconBtn) dateRangeIconBtn.classList.add("hidden"); 
} else {
  filterBar.classList.remove("hidden");
  toggleSortBtn.classList.remove("hidden");
  videoCountRow.classList.remove("hidden");
  if (dateRangeIconBtn) dateRangeIconBtn.classList.remove("hidden");
}
}


/* ============================================================
   기간 직접 설정 로직 (HTML 메뉴 UI) - [NEW]
============================================================ */
function openDateRangeMenu(btn) {
    filterMenu.innerHTML = "";
    filterMenu.classList.remove("hidden");

    // HTML 구조 생성
    const menuContent = document.createElement("div");
    menuContent.className = "date-range-menu";
    menuContent.style.padding = "10px";
    
    // 시작일 입력
    const startInput = document.createElement("input");
    startInput.type = "date";
    startInput.value = activeFilters.startDate || "";
    startInput.id = "dateStartInput";
    startInput.style.marginBottom = "5px";

    // 종료일 입력
    const endInput = document.createElement("input");
    endInput.type = "date";
    endInput.value = activeFilters.endDate || "";
    endInput.id = "dateEndInput";
    endInput.style.marginBottom = "10px";

    // 적용 버튼
    const applyBtn = document.createElement("button");
    applyBtn.textContent = "기간 적용";
    applyBtn.style.marginRight = "8px";

    // 초기화 버튼
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "초기화";
    
    // UI 구성
    menuContent.appendChild(startInput);
    
    const wave = document.createElement("div");
    wave.textContent = "~";
    wave.style.textAlign = "center";
    wave.style.marginBottom = "5px";
    menuContent.appendChild(wave);
    
    menuContent.appendChild(endInput);
    menuContent.appendChild(applyBtn);
    menuContent.appendChild(resetBtn);

    filterMenu.appendChild(menuContent);


    // ====== 버튼 아래로 정확히 위치시키기 ======
    const rect = btn.getBoundingClientRect();
    filterMenu.style.position = "absolute";
    filterMenu.style.right = (window.innerWidth - rect.right) + "px";
    filterMenu.style.left = "auto";
    filterMenu.style.top  = window.scrollY + rect.bottom + 4 + "px";
    filterMenu.style.width = "auto"; 


    // ====== 이벤트 리스너 ======
    applyBtn.addEventListener("click", () => {
        const start = startInput.value;
        const end = endInput.value;

        if (!start || !end) {
            alert("시작일과 종료일을 모두 선택해 주세요.");
            return;
        }

        const startDate = new Date(start);
        const endDate = new Date(end);

        // Date 객체를 사용한 유효성 검사
        if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
            alert("유효하지 않은 날짜 형식이거나 시작일이 종료일보다 늦습니다.");
            return;
        }

        applyDateRangeFilter(start, end);
        filterMenu.classList.add("hidden");
    });
    
    resetBtn.addEventListener("click", () => {
        // 기간 필터만 초기화하고 UI 업데이트 후 검색 적용
        activeFilters.startDate = null;
        activeFilters.endDate = null;
        
        // UI를 아이콘과 비활성 상태로 초기화
        dateRangeIconBtn.textContent = "🗓️"; 
        dateRangeIconBtn.classList.remove('active');
        
        applySearch();
        filterMenu.classList.add("hidden");
    });
}

function applyDateRangeFilter(start, end) {
    // 1. 기존 연도/월 필터 초기화 (가장 중요)
    activeFilters.year = null;
    activeFilters.month = null;
    yearFilter.textContent = "연도";
    monthFilter.textContent = "월";
    
    // 2. 새로운 기간 필터 적용
    activeFilters.startDate = start;
    activeFilters.endDate = end;

    // 3. 필터 바 UI 업데이트 (모바일 레이아웃 유지를 위해 텍스트는 🗓️로 고정)
    dateRangeIconBtn.textContent = `🗓️`; 
    // 활성 상태 표시용 CSS 클래스 추가 (사용자 선택 색상 #007BFF 적용 유도)
    dateRangeIconBtn.classList.add('active'); 

    // 4. 검색/필터 적용
    applySearch();
}

/* ============================================================
   검색/필터 적용 (기간 필터링 버그 수정 완료)
============================================================ */
function applySearch() {
  if ((searchInput.value || "").trim() !== "") {
    toggleMainView(true);
  }

  const kw = (searchInput.value || "").toLowerCase();

  // 검색/필터 로직...
  filteredCards = allCards.filter(c => {
    let ok = true;

    // ★★★ 기간 직접 설정 필터 (버그 수정 로직) ★★★
    if (activeFilters.startDate && activeFilters.endDate) {
        
        // 1. 카드 날짜 (시간대 문제 해결을 위해 날짜 문자열에 T00:00:00를 붙여 Date 객체 생성)
        // c.date는 YYYY-MM-DDTHH:MM:SS 형식이므로, 날짜만 분리하여 사용
        const cardDateStr = c.date.split('T')[0];
        const cardDate = new Date(cardDateStr + 'T00:00:00');
        
        // 2. 시작일 (사용자 입력 날짜 + T00:00:00)
        const start = new Date(activeFilters.startDate + 'T00:00:00');
        
        // 3. 종료일 (종료일 다음 날의 00:00:00을 계산하여 경계 포함)
        const endDay = new Date(activeFilters.endDate + 'T00:00:00');
        endDay.setDate(endDay.getDate() + 1); // 종료일의 다음 날 00시 
        
        // [Start <= Card Date < Next Day of End] 로 비교 (정확한 범위 포함)
        // 종료일의 다음 날 00시보다 작으므로 종료일 하루 전체를 포함함.
        if (cardDate < start || cardDate >= endDay) return false;
        
    } else {
        // ★★★ 기간 설정이 없을 때만 기존 연도/월 필터 작동 ★★★

        // ========== 연도 필터 ==========
        if (activeFilters.year !== null) {

            if (activeFilters.year === "predebut") {

                const itemDate = new Date(c.date);
                const debutDate = new Date("2018-04-25T00:00:00");

                if (!(itemDate < debutDate)) return false;

            } else {
                const y = new Date(c.date).getFullYear();
                if (y !== activeFilters.year) return false;
            }
        }


        // ========== 월 필터 ==========
        if (activeFilters.month !== null) {
            const m = new Date(c.date).getMonth() + 1;
            if (m !== activeFilters.month) return false;
        }
    }


    // ========== 서브필터 ==========
    if (activeFilters.subtag !== null) {
        const sub = String(c.subtag || c.note || "").toLowerCase();
        if (!sub.includes(String(activeFilters.subtag).toLowerCase())) return false;
    }


    // ====== 단어 AND 검색 ======
    if (kw !== "") {
        const words = kw.split(/\s+/).filter(w => w.length > 0);

        const combined = (
        (c.title || "") +
        (c.member || "") +
        (c.note || "") +
        (c.date || "")
        ).toLowerCase();

        for (const w of words) {
            if (!combined.includes(w)) return false;
        }
    }

    return ok;
  });

  filteredCards = sortCards(filteredCards);
  renderCards(true);

applyIosScrollTrick(); 
}

/* ============================================================
   필터 선택 (기간 필터 초기화 연동)
============================================================ */
function applyFilterSelection(type, label, value) {
    
    // ★★★ 연도 또는 월 필터를 선택하면 기간 필터를 초기화 ★★★
    if (type === "year" || type === "month") {
        activeFilters.startDate = null;
        activeFilters.endDate = null;
        if (dateRangeIconBtn) {
            dateRangeIconBtn.textContent = "🗓️";
            dateRangeIconBtn.classList.remove('active');
        }
    }

    activeFilters[type] = value;

    if (type === "year")  yearFilter.textContent  = value === null ? "연도" : label;
    if (type === "month") monthFilter.textContent = value === null ? "월"   : label;
    if (type === "subtag") subTagFilter.textContent = value === null ? "서브필터" : label;

    applySearch();
}

/* ============================================================
   필터 메뉴 띄우기
============================================================ */
function openFilterMenu(type, btn) {
  filterMenu.innerHTML = "";
  filterMenu.classList.remove("hidden");
  
  filterMenu.style.width = "auto"; 
  filterMenu.style.left = "auto"; 
  filterMenu.style.right = "auto";

  function makeItem(label, value) {
    const div = document.createElement("div");
    div.className = "filter-item";
    div.textContent = label;

    div.addEventListener("click", () => {
      applyFilterSelection(type, label, value);
      filterMenu.classList.add("hidden");
    });

    return div;
  }

  if (type === "year") {
    const years = ["전체","2026","2025","2024","2023","2022","2021","2020","2019","2018","Pre-debut"];
    years.forEach(y => {
      let v = null;
      if (y === "전체") v = null;
      else if (y === "Pre-debut") v = "predebut";
      else v = parseInt(y, 10);
      filterMenu.appendChild(makeItem(y, v));
    });
  }

  if (type === "month") {
    const months = ["전체",1,2,3,4,5,6,7,8,9,10,11,12];
    months.forEach(m => {
      filterMenu.appendChild(makeItem(String(m), m === "전체" ? null : m));
    });
  }

  if (type === "subtag") {
    const cat = currentCategory.textContent.trim();
    const subtagMap = {
      "발매곡": ["전체","MV","Special Clip","Audio Track"],
      "OST·참여곡": ["전체"],
      "음악방송·시상식": ["전체","음악 방송","시상식","음방 인터뷰","앵콜 무대","그 외"],
      "공연·축제": ["전체","대학 축제","페스티벌","그 외"],
      "공식 채널": [
        "전체","I-TALK","SOLO TALK","HASHTALK",
        "I-LOG","TOUR BEHIND",
        "SPECIAL CONTENT","PERFORMANCE",
        "CHOREOGRAPHY","TEASER VIDEOS",
        "I-LIVE HL","FAN CHANT","ETC"
      ],
      "자체 예능": ["전체"],
      "녹음 비하인드": ["전체"],
      "출연 콘텐츠": ["전체"],
      "노래 클립": ["전체"],
      "매거진·인터뷰": ["전체"],
      "라디오·오디오쇼": ["전체","라디오","네이버NOW","오디오","그 외"],
      "라이브 방송": ["전체","베리즈 라이브","브이앱·위버스 라이브","인스타 라이브","컴백 라이브","기념일 라이브","그 외 라이브"],
      "광고": ["전체"],
      "기타": ["전체"],
      "Shorts": ["전체"]
    };
    const list = subtagMap[cat] || ["전체"];
    list.forEach(tag => {
      filterMenu.appendChild(makeItem(tag, tag === "전체" ? null : tag));
    });
  }


  // ====== 버튼 아래로 정확히 위치시키기 ======
  const rect = btn.getBoundingClientRect();
  filterMenu.style.position = "absolute";
  filterMenu.style.left = rect.left + "px";
  filterMenu.style.top  = window.scrollY + rect.bottom + 4 + "px";
}


/* ============================================================
   ★ iOS 스크롤 복원 방지 및 상단 초기화 트릭 
============================================================ */
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

function applyIosScrollTrick() {
    const fixedHeader = document.querySelector('.fixed-top-wrapper'); 

    if (fixedHeader) {
        fixedHeader.style.transform = 'translate3d(0, 0, 0.1px)'; 
    }

    window.scrollTo({ top: 0, behavior: "instant" });
    
    setTimeout(() => {
        if (fixedHeader) {
            fixedHeader.style.transform = ''; 
        }
    }, 10);
    
    setTimeout(() => {
        window.scrollTo(0, 1); 
        window.scrollTo(0, 0); 
    }, 50); 
    
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 100);
}

/* ============================================================
   이벤트 연결 (기간 설정 이벤트 추가)
============================================================ */

function handleSearchAction() {
  const kw = (searchInput.value || "").trim();
  
  if (currentCategory.textContent === "카테고리 선택" && kw.length > 0) {
    window.location.href = `?category=${CATEGORY_MAP["All Videos"]}&q=${encodeURIComponent(kw)}`;
  } 
  else {
    applySearch(); 
  }
}

searchBtn.addEventListener("click", handleSearchAction);
searchInput.addEventListener("keyup", e => {
  if (e.key === "Enter") {
    handleSearchAction();
  }
});


yearFilter.addEventListener("click", e => openFilterMenu("year", e.target));
monthFilter.addEventListener("click", e => openFilterMenu("month", e.target));
subTagFilter.addEventListener("click", e => openFilterMenu("subtag", e.target));

// ★★★ [NEW] 기간 설정 버튼 이벤트 연결 ★★★
if (dateRangeIconBtn) {
    dateRangeIconBtn.addEventListener("click", e => openDateRangeMenu(e.target));
}

toggleSortBtn.addEventListener("click", () => {
  sortOrder = (sortOrder === "newest" ? "oldest" : "newest");
  toggleSortBtn.textContent = (sortOrder === "newest" ? "최신순" : "오래된순");
  filteredCards = sortCards(filteredCards);
  renderCards(true);
});

loadMoreBtn.addEventListener("click", () => renderCards(false));

scrollTopBtn.addEventListener("click", () =>
  window.scrollTo({ top: 0, behavior: "auto" })
);

categoryDropdownBtn.addEventListener("click", () => {
  categoryDropdown.classList.toggle("hidden");

  if (!categoryDropdown.classList.contains("hidden")) {
    positionCategoryDropdown(); 
  }
});


categoryDropdown.querySelectorAll(".cat-item").forEach(item => {
  item.addEventListener("click", () => {
    categoryDropdown.classList.add("hidden");

    // 필터 초기화
    searchInput.value = "";
    activeFilters = { 
        year: null, 
        month: null, 
        subtag: null, 
        startDate: null,
        endDate: null 
    };
    yearFilter.textContent = "연도";
    monthFilter.textContent = "월";
    subTagFilter.textContent = "서브필터";
    
    if (dateRangeIconBtn) {
        dateRangeIconBtn.textContent = "🗓️"; // 달력 초기화
        dateRangeIconBtn.classList.remove('active'); // CSS 클래스 제거
    }

    sortOrder = "newest";
    toggleSortBtn.textContent = "최신순";

    changeCategory(item.textContent.trim(), true);

    applyIosScrollTrick();
  });
});

/* ============================================================
   최초 로딩 
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const slug = params.get("category"); 
  const query = params.get("q");      

  if (query) {
    searchInput.value = decodeURIComponent(query);
  }
  
  if (!slug) {
    if (query) {
      changeCategory("All Videos", false); 
      applySearch(); 
    } else {
      toggleMainView(false); 
      currentCategory.textContent = "카테고리 선택"; 
    }
  } else {
    const cat = slug ? (SLUG_MAP[slug] || "All Videos") : "All Videos";

    toggleMainView(true); 
    changeCategory(cat, false);
    
    if (query) {
        applySearch();
    }
  }

  applyIosScrollTrick();
});

/* ============================================================
   popstate (뒤로가기)
============================================================ */
window.addEventListener("popstate", () => {
  const params = new URLSearchParams(location.search);
  const slug = params.get("category"); 

  if (!slug) {
    toggleMainView(false); 
    currentCategory.textContent = "All Videos"; 
  } else {
    const cat = SLUG_MAP[slug] || "All Videos";
    changeCategory(cat, false); 
  }

  applyIosScrollTrick();
});

/* ============================================================
   홈버튼 → 초기화
============================================================ */
if (homeBtn) {
  homeBtn.addEventListener("click", () => {
    // 필터 초기화
    searchInput.value = "";
    activeFilters = { 
        year: null, 
        month: null, 
        subtag: null,
        startDate: null, // 기간 필터 초기화
        endDate: null 
    };
    yearFilter.textContent = "연도";
    monthFilter.textContent = "월";
    subTagFilter.textContent = "서브필터";
    
    if (dateRangeIconBtn) {
        dateRangeIconBtn.textContent = "🗓️"; // 달력 초기화
        dateRangeIconBtn.classList.remove('active'); 
    }

    sortOrder = "newest";
    toggleSortBtn.textContent = "최신순";

    history.pushState(null, "", location.pathname); 

    currentCategory.textContent = "카테고리 선택"; 
    toggleMainView(false); 

    applyIosScrollTrick();
  });
}

/* ============================================================
   필터 메뉴(filterMenu) 외부 클릭 자동 닫힘
============================================================ */
document.addEventListener("click", (e) => {
  if (!filterMenu.classList.contains("hidden")) {
    
    const isFilterBtn = 
        yearFilter.contains(e.target) ||
        monthFilter.contains(e.target) ||
        subTagFilter.contains(e.target) ||
        (dateRangeIconBtn && dateRangeIconBtn.contains(e.target)); // 달력 버튼 추가
        
    if (
      !filterMenu.contains(e.target) && !isFilterBtn
    ) {
      filterMenu.classList.add("hidden");
    }
  }
});


/* ============================================================
   카테고리 드롭다운(categoryDropdown) 외부 클릭 자동 닫힘
============================================================ */
document.addEventListener("click", (e) => {
  if (!categoryDropdown.classList.contains("hidden")) {
    if (
      !categoryDropdown.contains(e.target) &&
      !categoryDropdownBtn.contains(e.target)
    ) {
      categoryDropdown.classList.add("hidden");
    }
  }
});

/* ============================================================
   이미지 복사 / 드래그 / 우클릭 방지
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("img").forEach(img => {
    img.setAttribute("draggable", "false");
  });
});

document.addEventListener("mousedown", (e) => {
  if (e.target.tagName === "IMG") {
    e.preventDefault();
  }
});

document.addEventListener("contextmenu", (e) => {
  if (e.target.tagName === "IMG") {
    e.preventDefault();
  }
});

function positionCategoryDropdown() {
  const rect = categoryDropdownBtn.getBoundingClientRect();
  
  categoryDropdown.style.position = "fixed";   

  categoryDropdown.style.right = (window.innerWidth - rect.right) + "px";
  
  categoryDropdown.style.left = "auto"; 
  
  categoryDropdown.style.top  = (rect.bottom + 4) + "px";
}