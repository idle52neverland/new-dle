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
    "TV방송": "10",
    "노래 클립": "11",
    "매거진·인터뷰": "12",
    "라디오·오디오쇼": "13",
    "라이브 방송": "14",
    "광고": "15",
    "기타": "16",
    "Shorts": "17",
    "X(Twitter)": "18"
};

const SLUG_MAP = Object.fromEntries(
    Object.entries(CATEGORY_MAP).map(([name, slug]) => [slug, name])
);

// 현재 파일이 index.html인지 video.html인지 확인하는 플래그
const IS_VIDEO_PAGE = location.pathname.endsWith("/video.html");


/* ============================================================
   전역 변수 & DOM 캐시
============================================================ */
let allCards = [];
let filteredCards = [];
let visibleCount = 0;
let sortOrder = "newest";

let activeFilters = {
  year: null,
  month: null,
  subtag: null,
  startDate: null, 
  endDate: null
};

// DOM Elements Caching
const searchInput = document.getElementById("searchInput");
const categoryDropdownBtn = document.getElementById("categoryDropdownBtn");
const categoryDropdown    = document.getElementById("categoryDropdown");
const currentCategory     = document.getElementById("currentCategory");
const homeBtn = document.getElementById("homeBtn");

// video.html에서만 존재하는 요소들 (존재하지 않으면 null)
const searchBtn = document.getElementById("searchBtn");
const yearFilter = document.getElementById("yearFilter");
const monthFilter = document.getElementById("monthFilter");
const subTagFilter = document.getElementById("subTagFilter");
const dateRangeIconBtn = document.getElementById("dateRangeIconBtn"); 
const toggleSortBtn = document.getElementById("toggleSortBtn");
const cardCount = document.getElementById("cardCount");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const scrollTopBtn = document.getElementById("scrollTopBtn");
const filterMenu = document.getElementById("filterMenu");
const allCardsContainer = document.getElementById("allCards");


/* ============================================================
   유틸리티 함수
============================================================ */
function getCardsPerLoad() {
  if (!allCardsContainer) return 0; // video.html이 아니면 0 반환
  
  const width = window.innerWidth;
  const isMobile = width < 768;
  const isVertical = allCardsContainer.classList.contains("vertical-mode");

  // 모바일 환경은 고정 개수, PC 환경은 화면 너비에 따라 계산
  if (isMobile) {
    return 40; 
  } else {
    const containerWidth = Math.min(width, 1284);
    
    // 세로형 (Shorts) 모드 처리
    if (isVertical) {
      const cardsPerRow = Math.floor(containerWidth / 192);
      return cardsPerRow * 15; 
    } else {
      const cardsPerRow = Math.floor(containerWidth / 276);
      return cardsPerRow * 15; 
    }
  }
}

function categoryToVarName(category) {
  const raw = category.trim();

  if (raw === "X(Twitter)") return "xTwitterCards";

  const hasHangul = /[가-힣]/.test(raw);

  if (hasHangul) {
    return raw.replace(/[^가-힣a-zA-Z0-9]/g, "") + "Cards";
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

function buildAllVideos() {
  const vars = [
    "발매곡Cards", "OST참여곡Cards", "음악방송시상식Cards", "공연축제Cards",
    "공식채널Cards", "자체예능Cards", "녹음비하인드Cards", "출연콘텐츠Cards",
    "TV방송Cards","노래클립Cards", "매거진인터뷰Cards", "라디오오디오쇼Cards", 
    "라이브방송Cards","광고Cards", "기타Cards" 
  ];

  let arr = [];
  vars.forEach(v => {
    // window[v]는 video.html에서만 정의됨. index.html에서는 이 로직이 실행되지 않습니다.
    if (Array.isArray(window[v])) arr = arr.concat(window[v]);
  });

  return arr;
}

function sortCards(list) {
  return list.sort((a, b) => {
    const da = new Date(a.date);
    const db = new Date(b.date);
    return sortOrder === "newest" ? db - da : da - db;
  });
}

function applyIosScrollTrick() {
    // iOS 스크롤 복원 방지 및 최상단 이동 로직 통합
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    
    const fixedHeader = document.querySelector('.fixed-top-wrapper'); 

    if (fixedHeader) {
        fixedHeader.style.transform = 'translate3d(0, 0, 0.1px)'; 
    }

    window.scrollTo({ top: 0, behavior: "instant" });
    
    setTimeout(() => {
        if (fixedHeader) {
            fixedHeader.style.transform = ''; 
        }
        window.scrollTo(0, 1); 
        window.scrollTo(0, 0); 
    }, 10);
}


/* ============================================================
   UI 제어
============================================================ */
// 파일 분리 후, 이 함수는 video.html의 컨테이너 모드만 업데이트하는 역할만 남음.
function updateCardContainerMode(categoryName) {
    if (!allCardsContainer) return;

    const container = allCardsContainer; 
    
    container.classList.remove("vertical-mode");
    container.classList.remove("twitter-mode");
    
    if (categoryName === "Shorts") {
        container.classList.add("vertical-mode");
    } else if (categoryName === "X(Twitter)") {
        container.classList.add("twitter-mode");
    }
}

function resetFilters() {
    // video.html에서만 필터 관련 DOM 조작을 수행
    if (IS_VIDEO_PAGE) {
        // 필터 데이터 초기화
        activeFilters = { 
            year: null, 
            month: null, 
            subtag: null, 
            startDate: null, 
            endDate: null 
        };
        // 필터 UI 텍스트 초기화
        if(yearFilter) yearFilter.textContent = "연도";
        if(monthFilter) monthFilter.textContent = "월";
        if(subTagFilter) subTagFilter.textContent = "서브필터";
        
        // 기간 설정 버튼 UI 초기화
        if (dateRangeIconBtn) {
            dateRangeIconBtn.textContent = "🗓️"; 
            dateRangeIconBtn.classList.remove('active');
        }

        // 정렬 초기화
        sortOrder = "newest";
        if(toggleSortBtn) toggleSortBtn.textContent = "최신순";
    }
}

function closeDropdownsAndMenus() {
    if (categoryDropdown) categoryDropdown.classList.add("hidden");
    if (filterMenu) filterMenu.classList.add("hidden");
}


/* ============================================================
   카드 렌더링 (핵심)
   -> video.html에서만 작동하도록 조건부 로직 추가
============================================================ */
function renderCards(reset = false) {
  if (!IS_VIDEO_PAGE) return; // video.html이 아니면 실행 중지

  const cat = currentCategory.textContent.trim(); 

  if (reset) {
    allCardsContainer.innerHTML = "";
    visibleCount = 0;
  }
  
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

  // 트위터 위젯 로드
  if (cat === "X(Twitter)") {
    setTimeout(() => {
        if (window.twttr && window.twttr.widgets) {
            window.twttr.widgets.load(allCardsContainer);
        }
    }, 50); 
  }

  visibleCount += slice.length;
  if(cardCount) cardCount.textContent = `총 ${filteredCards.length}건`;
  
  // 더보기 버튼 가시성 로직
  if (loadMoreBtn) {
      if (visibleCount >= filteredCards.length) {
          loadMoreBtn.classList.add("hidden");
      } else {
          loadMoreBtn.classList.remove("hidden");
      }
  }
}

/* ============================================================
   검색/필터 적용 (메인 로직)
   -> video.html에서만 작동하도록 조건부 로직 추가
============================================================ */
function applySearch() {
  if (!IS_VIDEO_PAGE) return; // video.html이 아니면 실행 중지
  
  // 검색어는 searchInput.value를 사용합니다.
  let kw = (searchInput.value || "").toLowerCase(); 

  // 1. 필터링
  filteredCards = allCards.filter(c => {
    let ok = true;

    // 기간 직접 설정 필터
    if (activeFilters.startDate && activeFilters.endDate) {
        const cardDateStr = c.date.split('T')[0];
        const cardDate = new Date(cardDateStr + 'T00:00:00');
        const start = new Date(activeFilters.startDate + 'T00:00:00');
        const endDay = new Date(activeFilters.endDate + 'T00:00:00');
        endDay.setDate(endDay.getDate() + 1);
        
        if (cardDate < start || cardDate >= endDay) return false;
        
    } else {
        // 기존 연도/월 필터
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
        if (activeFilters.month !== null) {
            const m = new Date(c.date).getMonth() + 1;
            if (m !== activeFilters.month) return false;
        }
    }

    // 서브필터
    if (activeFilters.subtag !== null) {
        const sub = String(c.subtag || c.note || "").toLowerCase();
        if (!sub.includes(String(activeFilters.subtag).toLowerCase())) return false;
    }

    // 단어 AND 검색 (최종 검색 필터링)
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

  // 2. 정렬 및 렌더링
  filteredCards = sortCards(filteredCards);
  renderCards(true);
  
  // 3. 스크롤 위치 초기화
  applyIosScrollTrick();
}

/* ============================================================
   카테고리 변경 (메인 로직)
   -> video.html에서만 작동하도록 조건부 로직 추가
============================================================ */
function changeCategory(categoryName, updateURL = true) {
  if (!IS_VIDEO_PAGE) return; // video.html이 아니면 실행 중지
  
  // 1. 상태 및 UI 업데이트
  currentCategory.textContent = categoryName;

  // 2. 카드 데이터 로드
  if (categoryName === "All Videos") {
    allCards = buildAllVideos();
  } else {
    const varName = categoryToVarName(categoryName);
    allCards = Array.isArray(window[varName]) ? [...window[varName]] : [];
  }

  // 3. 카드 컨테이너 모드 설정
  updateCardContainerMode(categoryName);

  // 4. 필터 초기화
  resetFilters();
  
  // ★★★ [수정] 카테고리 이동 시 (changeCategory 호출 시), 검색창을 무조건 비웁니다. ★★★
  if (searchInput) searchInput.value = ""; 
  

  // 5. 검색 적용 (검색창이 비워진 상태에서 applySearch가 실행됨)
  applySearch();

  // 6. URL 업데이트 (video.html에서만 실행)
  if (updateURL) {
    const categorySlug = CATEGORY_MAP[categoryName] || categoryName;
    
    // 카테고리 이동 시, 검색어는 비워졌으므로 URL에 q= 파라미터를 남기지 않습니다.
    let url = `?category=${categorySlug}`;
    
    // State에도 비어있는 검색어('')를 저장하여 뒤로가기 시 이 상태로 돌아오도록 합니다.
    history.pushState({ category: categorySlug, q: "" }, "", url);
  }
  
  // 7. 스크롤 초기화
  applyIosScrollTrick();
}

/* ============================================================
   페이지 이동 유틸리티
============================================================ */

/**
 * URL을 생성하여 video.html로 이동합니다.
 * @param {string} categorySlug - 이동할 카테고리 슬러그 (e.g., "1" for All Videos)
 * @param {string} [query=""] - 검색어
 */
function navigateToVideoPage(categorySlug, query = "") {
    let url = "video.html";
    const params = [];
    if (categorySlug) {
        params.push(`category=${categorySlug}`);
    }
    // ★★★ [수정] 홈 검색 예외 처리를 위해 검색어가 있다면 q를 URL에 붙여서 video.html로 전달합니다. ★★★
    if (query) {
        params.push(`q=${encodeURIComponent(query)}`);
    }
    
    if (params.length > 0) {
        url += `?${params.join("&")}`;
    }
    window.location.href = url;
}


/* ============================================================
   이벤트 핸들러 함수
============================================================ */
// index.html에서 검색 시, 'All Videos'로 이동하도록 보장
function handleSearchAction(e) { 
  if (e) {
    e.preventDefault();     
    e.stopPropagation(); 
  }
  searchInput.blur(); // 키보드 닫기
  
  const kw = (searchInput.value || "").trim();
  
  if (IS_VIDEO_PAGE) {
    // video.html에서는 검색 로직 실행
    applySearch();
    
    // 검색 실행 후 URL 업데이트: q 파라미터는 제거하고 state에만 저장 (URL은 category만 남깁니다)
    const params = new URLSearchParams(location.search);
    const slug = params.get("category");
    
    let url = location.pathname;
    const newParams = [];
    if (slug) newParams.push(`category=${slug}`);
    
    if (newParams.length > 0) {
        url += `?${newParams.join("&")}`;
    } else {
        // 현재 카테고리 정보가 없는 경우
        url += `?category=${CATEGORY_MAP[currentCategory.textContent] || CATEGORY_MAP["All Videos"]}`; 
    }

    // history.pushState에는 검색어(kw)를 저장하여 검색창의 값을 유지 (뒤로가기 시 복원)
    history.pushState({ category: slug, q: kw }, "", url);
    
  } else {
    // ★★★ index.html에서는 video.html로 이동 (홈 검색 예외 처리) ★★★
    const categorySlug = CATEGORY_MAP["All Videos"]; 
    navigateToVideoPage(categorySlug, kw); 
  }
}

// 필터 선택 로직 (video.html에서만 실행)
function applyFilterSelection(type, label, value) {
    if (!IS_VIDEO_PAGE) return;
    
    if (type === "year" || type === "month") {
        activeFilters.startDate = null;
        activeFilters.endDate = null;
        if (dateRangeIconBtn) {
            dateRangeIconBtn.textContent = "🗓️";
            dateRangeIconBtn.classList.remove('active');
        }
    }

    activeFilters[type] = value;

    if (type === "year" && yearFilter)  yearFilter.textContent  = value === null ? "연도" : label;
    if (type === "month" && monthFilter) monthFilter.textContent = value === null ? "월"   : label;
    if (type === "subtag" && subTagFilter) subTagFilter.textContent = value === null ? "서브필터" : label;

    applySearch();
}

// 필터 메뉴 열기 (video.html에서만 실행)
function openFilterMenu(type, btn) {
  if (!IS_VIDEO_PAGE) return;
  closeDropdownsAndMenus(); 
  if(!filterMenu) return; // DOM이 없을 경우 방지

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
  
  // 연도, 월, 서브필터 메뉴 항목 생성 로직 (이전 코드 유지)
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
      "TV방송": ["전체"],
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


  // 위치 설정
  const rect = btn.getBoundingClientRect();
  filterMenu.style.position = "absolute";
  filterMenu.style.left = rect.left + "px";
  filterMenu.style.top  = window.scrollY + rect.bottom + 4 + "px";
}

// 날짜 범위 메뉴 열기 (video.html에서만 실행)
function openDateRangeMenu(btn) {
    if (!IS_VIDEO_PAGE) return;
    closeDropdownsAndMenus(); 
    if(!filterMenu) return;

    filterMenu.innerHTML = "";
    filterMenu.classList.remove("hidden");

    // HTML 구조 생성 (이전 코드와 동일)
    const menuContent = document.createElement("div");
    menuContent.className = "date-range-menu";
    menuContent.style.padding = "10px";
    
    const startInput = document.createElement("input");
    startInput.type = "date";
    startInput.value = activeFilters.startDate || "";
    startInput.id = "dateStartInput";
    startInput.style.marginBottom = "5px";
    startInput.style.color = "#000"; 

    const endInput = document.createElement("input");
    endInput.type = "date";
    endInput.value = activeFilters.endDate || "";
    endInput.id = "dateEndInput";
    endInput.style.marginBottom = "10px";
    endInput.style.color = "#000"; 

    const applyBtn = document.createElement("button");
    applyBtn.textContent = "기간 적용";
    applyBtn.style.marginRight = "8px";
    applyBtn.style.backgroundColor = "#ff0000"; 
    applyBtn.style.color = "#fff"; 

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "초기화";
    resetBtn.style.backgroundColor = "#ccc"; 
    resetBtn.style.color = "#000"; 
    
    menuContent.appendChild(startInput);
    
    const wave = document.createElement("div");
    wave.textContent = "~";
    wave.style.textAlign = "center";
    wave.style.marginBottom = "5px";
    menuContent.appendChild(wave);
    
    menuContent.appendChild(endInput);
    
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "center";
    buttonContainer.style.gap = "8px"; 
    buttonContainer.appendChild(applyBtn);
    buttonContainer.appendChild(resetBtn);
    menuContent.appendChild(buttonContainer);


    filterMenu.appendChild(menuContent);


    // 위치 설정
    const rect = btn.getBoundingClientRect();
    filterMenu.style.position = "absolute";
    filterMenu.style.right = (window.innerWidth - rect.right) + "px";
    filterMenu.style.left = "auto";
    filterMenu.style.top  = window.scrollY + rect.bottom + 4 + "px";
    filterMenu.style.width = "auto"; 


    // 이벤트 리스너
    applyBtn.addEventListener("click", () => {
        const start = startInput.value;
        const end = endInput.value;

        if (!start || !end) {
            alert("시작일과 종료일을 모두 선택해 주세요.");
            return;
        }

        const startDate = new Date(start);
        const endDate = new Date(end);

        if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
            alert("유효하지 않은 날짜 형식이거나 시작일이 종료일보다 늦습니다.");
            return;
        }

        applyDateRangeFilter(start, end);
        filterMenu.classList.add("hidden");
    });
    
    resetBtn.addEventListener("click", () => {
        activeFilters.startDate = null;
        activeFilters.endDate = null;
        
        if (dateRangeIconBtn) {
            dateRangeIconBtn.textContent = "🗓️"; 
            dateRangeIconBtn.classList.remove('active');
        }
        
        applySearch();
        filterMenu.classList.add("hidden");
    });
}

// 날짜 범위 필터 적용 (video.html에서만 실행)
function applyDateRangeFilter(start, end) {
    if (!IS_VIDEO_PAGE) return;

    activeFilters.year = null;
    activeFilters.month = null;
    if(yearFilter) yearFilter.textContent = "연도";
    if(monthFilter) monthFilter.textContent = "월";
    
    activeFilters.startDate = start;
    activeFilters.endDate = end;

    if (dateRangeIconBtn) {
        dateRangeIconBtn.textContent = `🗓️`; 
        dateRangeIconBtn.classList.add('active'); 
    }

    applySearch();
}


function positionCategoryDropdown() {
  const rect = categoryDropdownBtn.getBoundingClientRect();
  
  categoryDropdown.style.position = "fixed";   
  categoryDropdown.style.right = (window.innerWidth - rect.right) + "px";
  categoryDropdown.style.left = "auto"; 
  categoryDropdown.style.top  = (rect.bottom + 4) + "px";
}

/* ============================================================
   초기화 및 이벤트 리스너 설정
============================================================ */
function initializeEventListeners() {
    
    // 1. 검색 버튼 및 입력 (모든 페이지 공통)
    if (searchBtn) {
        searchBtn.addEventListener("click", handleSearchAction);
    }

    searchInput.addEventListener("keyup", e => {
      if (e.key === "Enter") {
        handleSearchAction(e); 
      }
    });

    // 2. 필터 버튼 (video.html에서만)
    if (IS_VIDEO_PAGE) {
        if(yearFilter) yearFilter.addEventListener("click", e => openFilterMenu("year", e.target));
        if(monthFilter) monthFilter.addEventListener("click", e => openFilterMenu("month", e.target));
        if(subTagFilter) subTagFilter.addEventListener("click", e => openFilterMenu("subtag", e.target));
        if (dateRangeIconBtn) {
            dateRangeIconBtn.addEventListener("click", e => openDateRangeMenu(e.target));
        }

        // 3. 정렬 버튼 (video.html에서만)
        if (toggleSortBtn) {
            toggleSortBtn.addEventListener("click", () => {
              sortOrder = (sortOrder === "newest" ? "oldest" : "newest");
              toggleSortBtn.textContent = (sortOrder === "newest" ? "최신순" : "오래된순");
              filteredCards = sortCards(filteredCards);
              renderCards(true);
            });
        }

        // 4. 더보기 버튼 (video.html에서만)
        if (loadMoreBtn) loadMoreBtn.addEventListener("click", () => renderCards(false));

        // 5. 스크롤 상단 버튼 (video.html에서만)
        if (scrollTopBtn) {
            scrollTopBtn.addEventListener("click", () =>
              window.scrollTo({ top: 0, behavior: "auto" })
            );
        }
    }


    // 6. 카테고리 드롭다운 토글 버튼 (모든 페이지 공통)
    categoryDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      categoryDropdown.classList.toggle("hidden");
      if (filterMenu) filterMenu.classList.add("hidden"); // 필터 메뉴 닫기 (video.html)

      if (!categoryDropdown.classList.contains("hidden")) {
        positionCategoryDropdown(); 
      }
    });

    // 7. 카테고리 항목 클릭 (모든 페이지 공통: 페이지 이동/카테고리 변경)
    categoryDropdown.querySelectorAll(".cat-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDropdownsAndMenus();
        
        const categoryName = item.textContent.trim();
        const categorySlug = CATEGORY_MAP[categoryName] || categoryName;
        
        if (IS_VIDEO_PAGE) {
            // video.html에서는 카테고리 변경
            currentCategory.textContent = categoryName; 
            
            // ★★★ 카테고리 변경 시, changeCategory 호출 전에 이미 검색창을 비우게 됩니다.
            // changeCategory(categoryName, true)에서 다시 한 번 비우는 로직이 있지만, 이중으로 확실히 처리됩니다.
            if (searchInput) {
                searchInput.value = ""; 
            }
            
            resetFilters();
            
            // 카테고리 변경 시 URL 업데이트 (검색어는 URL/State에 남기지 않음)
            changeCategory(categoryName, true); 
        } else {
            // index.html에서는 video.html로 이동
            navigateToVideoPage(categorySlug);
        }
      });
    });
    
    // 8. 홈 버튼 (모든 페이지 공통)
    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        if (IS_VIDEO_PAGE) {
            // video.html에서 index.html로 이동
            window.location.href = "index.html";
        } else {
            // index.html에서는 최상단으로 이동
            applyIosScrollTrick();
        }
      });
    }

    // 9. 외부 클릭 메뉴 닫기 (모든 페이지 공통, 필터 메뉴는 video.html에서만 처리)
    document.addEventListener("click", (e) => {
      // 필터 메뉴 닫기 (video.html에서만)
      if (IS_VIDEO_PAGE && filterMenu && !filterMenu.classList.contains("hidden")) {
        const isFilterBtn = 
            (yearFilter && yearFilter.contains(e.target)) ||
            (monthFilter && monthFilter.contains(e.target)) ||
            (subTagFilter && subTagFilter.contains(e.target)) ||
            (dateRangeIconBtn && dateRangeIconBtn.contains(e.target)); 
            
        if (
          !filterMenu.contains(e.target) && !isFilterBtn
        ) {
          filterMenu.classList.add("hidden");
        }
      }
      
      // 카테고리 드롭다운 닫기 (모든 페이지 공통)
      if (categoryDropdown && !categoryDropdown.classList.contains("hidden")) {
        if (
          !categoryDropdown.contains(e.target) &&
          !categoryDropdownBtn.contains(e.target)
        ) {
          categoryDropdown.classList.add("hidden");
        }
      }
    });
    
    // 10. 스크롤 이벤트 (스크롤 버튼 제어, video.html에서만)
    if (IS_VIDEO_PAGE) {
        window.addEventListener("scroll", function() {
            if (window.scrollY > 300) {
                if(scrollTopBtn) scrollTopBtn.classList.remove("hidden");
            } else {
                if(scrollTopBtn) scrollTopBtn.classList.add("hidden");
            }
        });
    }
}


/* ============================================================
   최초 로딩
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  
  initializeEventListeners();
    
  const params = new URLSearchParams(location.search);
  const slug = params.get("category"); 
  let queryFromUrl = params.get("q"); // URL에 임시로 존재하는 검색어
  
  // video.html 초기 로딩 로직
  if (IS_VIDEO_PAGE) {
    
    let initialCategory = SLUG_MAP[slug] || "All Videos";
    
    // 1. 초기 검색창 값 설정
    if (searchInput && queryFromUrl) {
        // ★★★ 홈 검색 예외 처리 (검색어 유지) ★★★
        searchInput.value = decodeURIComponent(queryFromUrl);
        currentCategory.textContent = "All Videos"; // 카테고리를 'All Videos'로 설정
        allCards = buildAllVideos();              // All Videos 데이터 로드
        resetFilters();                           // 필터 초기화
        applySearch();                            // 검색어에 따른 검색 실행 (검색 결과 나옴)
        
        // 검색 적용 후 URL에서 q 파라미터 제거 (State에는 검색어 유지)
        const newParams = new URLSearchParams(location.search);
        newParams.delete('q');
        let newUrl = location.pathname;
        if (newParams.toString()) {
            newUrl += `?${newParams.toString()}`;
        }
        // history.replaceState를 사용하여 주소창의 URL을 깨끗하게 대체
        history.replaceState({ category: slug, q: queryFromUrl }, "", newUrl); 

    } else {
        // ★★★ 일반 로딩 (카테고리 이동, 직접 접속 등) ★★★
        // 검색어가 없으므로 changeCategory 호출하여 검색어를 비우고 로딩 시작
        changeCategory(initialCategory, false);
    }
  } else {
    // index.html 초기 로딩 로직
    currentCategory.textContent = "카테고리 선택"; 
    resetFilters();
  }

  // 스크롤 초기화 (모든 로직 후)
  applyIosScrollTrick();
});


/* ============================================================
   popstate (뒤로가기)
   -> video.html에서만 작동하도록 조건부 로직 추가
============================================================ */
window.addEventListener("popstate", (e) => {
  if (!IS_VIDEO_PAGE) {
      // index.html에서는 popstate로직 없음 (실행되지 않음)
      applyIosScrollTrick();
      return;
  }
    
  const params = new URLSearchParams(location.search);
  const slug = params.get("category"); 
  
  // State에서 저장된 검색어를 복원합니다.
  // URL에 q 파라미터가 없더라도, State에 q 값이 남아있으면 복원됩니다.
  const queryToRestore = e.state && e.state.q ? e.state.q : "";
  
  // changeCategory 호출 전에 검색창에 값을 미리 복원하여 changeCategory 내부의 applySearch가 올바른 검색어로 필터링하도록 합니다.
  if (searchInput) searchInput.value = queryToRestore ? decodeURIComponent(queryToRestore) : "";


  const cat = SLUG_MAP[slug] || "All Videos";
  
  // changeCategory 함수가 검색어(복원된 값)와 필터를 새로 적용하게 됩니다. 
  // changeCategory는 내부적으로 검색창을 초기화하는 로직이 있으나, popstate에서는 이미 searchInput에 복원된 값이 들어있고,
  // changeCategory 내의 applySearch가 실행되어 검색 결과가 올바르게 표시됩니다.
  // **잠깐**: changeCategory는 무조건 searchInput.value를 비우므로, popstate에서 검색어가 남는 문제가 발생합니다.
  
  // ★★★ [수정] popstate 시에는 changeCategory 대신 수동으로 검색 적용을 해야 합니다. ★★★

  // 1. 카테고리 업데이트
  currentCategory.textContent = cat; 
  
  // 2. 카드 데이터 로드
  if (cat === "All Videos") {
    allCards = buildAllVideos();
  } else {
    const varName = categoryToVarName(cat);
    allCards = Array.isArray(window[varName]) ? [...window[varName]] : [];
  }
  
  // 3. 필터 초기화
  resetFilters();
  
  // 4. 검색 적용 (searchInput.value에 이미 복원된 검색어가 들어있음)
  applySearch();
  
  // 5. 컨테이너 모드 업데이트
  updateCardContainerMode(cat);

  applyIosScrollTrick();
});

/* ============================================================
   이미지 복사 / 드래그 / 우클릭 방지 (기존 로직 유지)
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

// 모달 로직 (기존 코드 유지)
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('no-scroll');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
}