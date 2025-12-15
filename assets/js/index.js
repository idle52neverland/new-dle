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
   전역 변수 & DOM 캐시 (Refactoring: 한 곳에 모음)
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
const searchBtn   = document.getElementById("searchBtn");

const yearFilter  = document.getElementById("yearFilter");
const monthFilter = document.getElementById("monthFilter");
const subTagFilter = document.getElementById("subTagFilter");
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

const mainHomePage = document.getElementById("mainHomePage");
const filterBar = document.querySelector(".filter-bar");
const videoCountRow = document.querySelector(".video-count-row");
const footer = document.querySelector(".footer");
const homeBtn = document.getElementById("homeBtn");

/* ============================================================
   유틸리티 함수
============================================================ */
function getCardsPerLoad() {
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
    "노래클립Cards", "매거진인터뷰Cards", "라디오오디오쇼Cards", "라이브방송Cards",
    "광고Cards", "기타Cards" 
  ];

  let arr = [];
  vars.forEach(v => {
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
   화면 전환 및 UI 제어 (Refactoring: 함수 분리)
============================================================ */
function toggleMainView(showCards) {
  if (showCards) {
    // 카드 뷰 보이기
    mainHomePage.classList.add("hidden");
    filterBar.classList.remove("hidden");
    videoCountRow.classList.remove("hidden");
    allCardsContainer.classList.remove("hidden");
    footer.classList.remove("hidden");
    // ★★★ 스크롤 잠금 해제: 카드 뷰에서는 스크롤이 필요하므로 클래스 제거
    document.body.classList.remove("home-no-scroll");
  } else {
    // 메인 페이지 보이기 (홈)
    mainHomePage.classList.remove("hidden");
    filterBar.classList.add("hidden");
    videoCountRow.classList.add("hidden");
    allCardsContainer.classList.add("hidden");
    footer.classList.add("hidden");
    scrollTopBtn.classList.add("hidden"); 
    // ★★★ 스크롤 잠금: 홈 화면에서는 스크롤이 발생하지 않도록 클래스 추가
    document.body.classList.add("home-no-scroll");
  }
}

function updateCardContainerMode(categoryName) {
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
    // 필터 데이터 초기화
    activeFilters = { 
        year: null, 
        month: null, 
        subtag: null, 
        startDate: null, 
        endDate: null 
    };
    // 필터 UI 텍스트 초기화
    yearFilter.textContent = "연도";
    monthFilter.textContent = "월";
    subTagFilter.textContent = "서브필터";
    
    // 기간 설정 버튼 UI 초기화
    if (dateRangeIconBtn) {
        dateRangeIconBtn.textContent = "🗓️"; 
        dateRangeIconBtn.classList.remove('active');
    }

    // 정렬 초기화
    sortOrder = "newest";
    toggleSortBtn.textContent = "최신순";
    
    // 검색창 초기화
    searchInput.value = "";
}

function closeDropdownsAndMenus() {
    categoryDropdown.classList.add("hidden");
    filterMenu.classList.add("hidden");
}


/* ============================================================
   카드 렌더링 (핵심)
============================================================ */
function renderCards(reset = false) {
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
  cardCount.textContent = `총 ${filteredCards.length}건`;
  
  // ★★★ FIX 2: 더보기 버튼 가시성 로직 수정 (클래스 제어) ★★★
  if (loadMoreBtn) {
      if (visibleCount >= filteredCards.length) {
          // 렌더링된 카드가 전체 카드 수보다 많거나 같으면 버튼 숨김
          loadMoreBtn.classList.add("hidden");
      } else {
          // 아직 더 로드할 카드가 남아있다면 버튼 표시
          loadMoreBtn.classList.remove("hidden");
      }
  }
}

/* ============================================================
   검색/필터 적용 (메인 로직)
============================================================ */
function applySearch() {
  const kw = (searchInput.value || "").toLowerCase();

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

    // 단어 AND 검색
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
============================================================ */
function changeCategory(categoryName, updateURL = true) {
  
  // 1. 상태 및 UI 업데이트
  currentCategory.textContent = categoryName;

  // 2. 카드 데이터 로드
  if (categoryName === "All Videos") {
    allCards = buildAllVideos();
  } else {
    const varName = categoryToVarName(categoryName);
    allCards = Array.isArray(window[varName]) ? [...window[varName]] : [];
  }

  // 3. 화면 전환
  toggleMainView(true);
  
  // ★★★ FIX: 여기서 스크롤 초기화 로직(applyIosScrollTrick)은 제거했습니다. ★★★
  
  // 4. 카드 컨테이너 모드 설정
  updateCardContainerMode(categoryName);

  // 5. 필터 초기화 (resetFilters는 검색창도 초기화함)
  resetFilters();
  
  // 6. 검색 적용 (필터링 및 정렬 후 렌더링)
  applySearch();

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
}

/* ============================================================
   이벤트 핸들러 함수
============================================================ */
// ★★★ FIX 1: 모바일 검색 버튼 이슈 해결을 위해 로직 단순화 ★★★
function handleSearchAction(e) { 
  if (e) {
    e.preventDefault();     
    e.stopPropagation(); 
  }
  searchInput.blur(); // 키보드 닫기
  
  const kw = (searchInput.value || "").trim(); // ★★★ 사용자가 입력한 검색어(kw)를 저장

  // 현재 카테고리가 '카테고리 선택' (첫 화면)이고, 검색어가 있다면
  if (currentCategory.textContent === "카테고리 선택" && kw.length > 0) {
    const categorySlug = CATEGORY_MAP["All Videos"];
    const url = `?category=${categorySlug}&q=${encodeURIComponent(kw)}`;
    
    history.pushState({ category: categorySlug, query: kw }, "", url);
    
    // 1. All Videos로 카테고리 전환 (이 과정에서 resetFilters 호출로 검색어가 지워짐)
    changeCategory("All Videos", false); 
    
    // 2. ★★★ 핵심 수정: 전환 후, 지워진 검색어를 다시 입력 필드에 복원
    searchInput.value = kw;
    
    // 3. 복원된 검색어를 기준으로 검색 로직을 다시 실행하여 필터링
    applySearch(); 
  } 
  else {
    // 이미 카테고리가 선택된 상태이거나 검색어가 없는 경우
    applySearch(); 
  }
}

// 필터 선택 로직
function applyFilterSelection(type, label, value) {
    
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

function openFilterMenu(type, btn) {
  closeDropdownsAndMenus(); 
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

function openDateRangeMenu(btn) {
    closeDropdownsAndMenus(); 
    filterMenu.innerHTML = "";
    filterMenu.classList.remove("hidden");

    // HTML 구조 생성
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
        
        dateRangeIconBtn.textContent = "🗓️"; 
        dateRangeIconBtn.classList.remove('active');
        
        applySearch();
        filterMenu.classList.add("hidden");
    });
}

function applyDateRangeFilter(start, end) {
    activeFilters.year = null;
    activeFilters.month = null;
    yearFilter.textContent = "연도";
    monthFilter.textContent = "월";
    
    activeFilters.startDate = start;
    activeFilters.endDate = end;

    dateRangeIconBtn.textContent = `🗓️`; 
    dateRangeIconBtn.classList.add('active'); 

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
   초기화 및 이벤트 리스너 설정 (Refactoring: 함수 분리)
============================================================ */
function initializeEventListeners() {
    
    // 1. 검색 버튼 및 입력 (모바일 클릭 문제 최종 해결)

// ★★★ 돋보기 버튼 클릭 리스너 재정의: 터치 간섭을 막고 검색을 강제 실행
searchBtn.addEventListener("click", e => {
    e.preventDefault();     // 클릭 시 기본 동작 방지
    e.stopPropagation(); // 이벤트 전파 방지 (다른 요소 간섭 차단)
    searchInput.blur(); // 모바일 키보드 강제 종료
    
    handleSearchAction(e); 
});

// 검색창 입력 이벤트는 기존과 동일하게 유지
searchInput.addEventListener("keyup", e => {
  if (e.key === "Enter") {
    handleSearchAction(e); 
  }
});

    // 2. 필터 버튼
    yearFilter.addEventListener("click", e => openFilterMenu("year", e.target));
    monthFilter.addEventListener("click", e => openFilterMenu("month", e.target));
    subTagFilter.addEventListener("click", e => openFilterMenu("subtag", e.target));
    if (dateRangeIconBtn) {
        dateRangeIconBtn.addEventListener("click", e => openDateRangeMenu(e.target));
    }

    // 3. 정렬 버튼
    toggleSortBtn.addEventListener("click", () => {
      sortOrder = (sortOrder === "newest" ? "oldest" : "newest");
      toggleSortBtn.textContent = (sortOrder === "newest" ? "최신순" : "오래된순");
      filteredCards = sortCards(filteredCards);
      renderCards(true);
    });

    // 4. 더보기 버튼
    loadMoreBtn.addEventListener("click", () => renderCards(false));

    // 5. 스크롤 상단 버튼
    scrollTopBtn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "auto" })
    );

    // 6. 카테고리 드롭다운 토글 버튼
    categoryDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      categoryDropdown.classList.toggle("hidden");
      filterMenu.classList.add("hidden"); // 필터 메뉴 닫기

      if (!categoryDropdown.classList.contains("hidden")) {
        positionCategoryDropdown(); 
      }
    });

    // 7. 카테고리 항목 클릭
categoryDropdown.querySelectorAll(".cat-item").forEach(item => {
  item.addEventListener("click", (e) => {
    e.stopPropagation();
    closeDropdownsAndMenus();
    
    applyIosScrollTrick(); 
    
    resetFilters(); 

    changeCategory(item.textContent.trim(), true);
  });
});
    
    // 8. 홈 버튼
    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        resetFilters();
        history.pushState(null, "", location.pathname); 
        currentCategory.textContent = "카테고리 선택"; 
        toggleMainView(false); 
        applyIosScrollTrick();
      });
    }

    // 9. 외부 클릭 메뉴 닫기 (이전 로직 유지)
    document.addEventListener("click", (e) => {
      // 필터 메뉴 닫기
      if (!filterMenu.classList.contains("hidden")) {
        const isFilterBtn = 
            yearFilter.contains(e.target) ||
            monthFilter.contains(e.target) ||
            subTagFilter.contains(e.target) ||
            (dateRangeIconBtn && dateRangeIconBtn.contains(e.target)); 
            
        if (
          !filterMenu.contains(e.target) && !isFilterBtn
        ) {
          filterMenu.classList.add("hidden");
        }
      }
      
      // 카테고리 드롭다운 닫기
      if (!categoryDropdown.classList.contains("hidden")) {
        if (
          !categoryDropdown.contains(e.target) &&
          !categoryDropdownBtn.contains(e.target)
        ) {
          categoryDropdown.classList.add("hidden");
        }
      }
    });
    
    // 10. 스크롤 이벤트 (스크롤 버튼 제어)
    window.addEventListener("scroll", function() {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.remove("hidden");
        } else {
            scrollTopBtn.classList.add("hidden");
        }
    });
}


/* ============================================================
   최초 로딩 (Refactoring: 초기 상태 제어)
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  
  initializeEventListeners();
    
  const params = new URLSearchParams(location.search);
  const slug = params.get("category"); 
  const query = params.get("q");      

  if (query) {
    searchInput.value = decodeURIComponent(query);
  }
  
  // ★★★ FIX 3: 초기 화면 깜빡임/겹침 방지 로직 강화 ★★★
  toggleMainView(false); // 모든 콘텐츠를 일단 숨기고 시작
  
  if (!slug) {
    if (query) {
      changeCategory("All Videos", false); 
    } else {
      currentCategory.textContent = "카테고리 선택"; 
    }
  } else {
    const cat = SLUG_MAP[slug] || "All Videos";
    changeCategory(cat, false); 
  }

  // 4. 스크롤 초기화 (모든 로직 후)
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
    currentCategory.textContent = "카테고리 선택"; 
    resetFilters();
  } else {
    const cat = SLUG_MAP[slug] || "All Videos";
    changeCategory(cat, false); 
  }

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