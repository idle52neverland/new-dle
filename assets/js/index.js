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
   전역 변수 (수정)
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
  subtag: null
};

/* DOM */
const searchInput = document.getElementById("searchInput");
const searchBtn   = document.getElementById("searchBtn");

const yearFilter  = document.getElementById("yearFilter");
const monthFilter = document.getElementById("monthFilter");
const subTagFilter = document.getElementById("subTagFilter");

const toggleSortBtn = document.getElementById("toggleSortBtn");
const cardCount      = document.getElementById("cardCount");

const loadMoreBtn    = document.getElementById("loadMoreBtn");
const scrollTopBtn   = document.getElementById("scrollTopBtn");

const categoryDropdownBtn = document.getElementById("categoryDropdownBtn");
const categoryDropdown    = document.getElementById("categoryDropdown");
const currentCategory     = document.getElementById("currentCategory");

const filterMenu     = document.getElementById("filterMenu");
const allCardsContainer = document.getElementById("allCards");

// ★★★ 새로 추가된 DOM 변수들 (화면 전환용) ★★★
const mainHomePage = document.getElementById("mainHomePage");
const filterBar = document.querySelector(".filter-bar");
const videoCountRow = document.querySelector(".video-count-row");
const footer = document.querySelector(".footer");
const homeBtn = document.getElementById("homeBtn");
// ★★★ 새로 추가된 DOM 변수들 끝 ★★★


/* ============================================================
   카테고리 → 데이터변수 매핑
============================================================ */
function categoryToVarName(category) {
  const raw = category.trim();

  if (raw === "X(Twitter)") return "xTwitterCards";

  // 한글 포함 여부
  const hasHangul = /[가-힣]/.test(raw);

  if (hasHangul) {
    // 한글 카테고리는: 공백·특수문자 제거 후 Cards 붙이기
    return raw
      .replace(/[^가-힣a-zA-Z0-9]/g, "") 
      + "Cards";
  } else {
    // 영어는 기존 방식
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
    "발매곡Cards",
    "OST참여곡Cards",
    "음악방송시상식Cards",
    "공연축제Cards",
    "공식채널Cards",
    "자체예능Cards",
    "녹음비하인드Cards",
    "출연콘텐츠Cards",
    "노래클립Cards",
    "매거진인터뷰Cards",
    "라디오오디오쇼Cards",
    "라이브방송Cards",
    "광고Cards",
    "기타Cards",
    "ShortsCards", // Shorts와 X(Twitter)는 buildAllVideos에 포함시켜서
    "xTwitterCards"  // changeCategory에서 필터링 하도록 합니다.
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
   카드 렌더링 (최종 수정 버전)
============================================================ */
function renderCards(reset = false) {
  if (reset) {
    allCardsContainer.innerHTML = "";
    visibleCount = 0;
  }

  const cat = currentCategory.textContent.trim(); 

  // ★ 정의된 함수를 호출하여 현재 상황에 맞는 개수를 가져옵니다.
  const cardsPerLoad = getCardsPerLoad();
  const slice = filteredCards.slice(visibleCount, visibleCount + cardsPerLoad);

  slice.forEach(item => {
  const card = document.createElement("div");

  // 1. 트위터 카테고리일 경우 (임베드 형식)
  if (cat === "X(Twitter)") {
    card.className = "tweet-card";
    
    // ★ 테스트 파일(twitter.js)에서 사용한 치환 로직 적용
    // x.com 주소를 twitter.com으로 실시간 변환하여 스크립트 인식률 향상
    const compatUrl = item.url.replace("https://x.com", "https://twitter.com");

    card.innerHTML = `
      <blockquote class="twitter-tweet" data-lang="ko" data-dnt="true">
        <a href="${compatUrl}"></a> </blockquote>
    `;
  }
    // 2. 일반 카테고리일 경우
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
  }); // slice.forEach 끝

if (cat === "X(Twitter)") {
    // 500ms(0.5초) -> 50ms(0.05초)로 대폭 단축
    // 카드가 생성되자마자 거의 즉시 트위터 스크립트에게 변환 명령을 내립니다.
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
   ★ 메인 페이지 / 카드 뷰 전환 함수 (새로 추가)
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
   카테고리 변경 (수정 버전)
============================================================ */
function changeCategory(categoryName, updateURL = true) {
  currentCategory.textContent = categoryName;

  // 1. 카드 데이터 로드
  if (categoryName === "All Videos") {
    // ★★★ 핵심 수정: All Videos일 때 Shorts와 X(Twitter)를 제외하도록 필터링 ★★★
    allCards = buildAllVideos().filter(card => {
        return card.category !== "Shorts" && card.category !== "X(Twitter)";
    });
  } else {
    const varName = categoryToVarName(categoryName);
    allCards = Array.isArray(window[varName]) ? [...window[varName]] : [];
  }

  // 2. 화면 전환 (카테고리를 클릭하면 무조건 카드 뷰를 표시)
  toggleMainView(true);

  // 3. 카드 컨테이너 모드 설정 (기존 로직 유지)
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

  // 4. 필터 초기화
  activeFilters = { year: null, month: null, subtag: null };
  yearFilter.textContent = "연도";
  monthFilter.textContent = "월";
  subTagFilter.textContent = "서브필터 선택";

  // 5. 카드 필터링 및 정렬
  filteredCards = sortCards([...allCards]);

  // 6. 카드 렌더링
  renderCards(true);

  // 7. URL 업데이트
  if (updateURL) {
    const categorySlug = CATEGORY_MAP[categoryName] || categoryName;
    
    // URL에 검색어 쿼리가 있다면 함께 유지합니다.
    const params = new URLSearchParams(location.search);
    const query = params.get("q"); 
    
    let url = `?category=${categorySlug}`;
    if (query) {
      url += `&q=${encodeURIComponent(query)}`;
    }
    
    history.pushState({ category: categorySlug }, "", url);
  }

// 8. Shorts 특별 처리 (필터 숨김) // ★ 주석 수정
if (categoryName === "Shorts") { 
  filterBar.classList.add("hidden");
  toggleSortBtn.classList.add("hidden");
  videoCountRow.classList.add("hidden");
} else {
  filterBar.classList.remove("hidden");
  toggleSortBtn.classList.remove("hidden");
  videoCountRow.classList.remove("hidden");
}
}

/* ============================================================
   검색/필터 적용
============================================================ */
function applySearch() {
  // ★ 검색을 시작하면 홈 화면을 숨기고 카드 뷰를 표시합니다.
  if ((searchInput.value || "").trim() !== "") {
    toggleMainView(true);
  }

  const kw = (searchInput.value || "").toLowerCase();

  // 검색/필터 로직... (기존 로직 유지)
  filteredCards = allCards.filter(c => {
    let ok = true;

// ========== 연도 필터 ==========
if (activeFilters.year !== null) {

    if (activeFilters.year === "predebut") {

        const itemDate = new Date(c.date);
        const debutDate = new Date("2018-04-25T00:00:00");

        // 데뷔일 이전만 통과
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


// ========== 서브필터 선택 필터 ==========
if (activeFilters.subtag !== null) {
    const sub = String(c.subtag || c.note || "").toLowerCase();
    if (!sub.includes(String(activeFilters.subtag).toLowerCase())) return false;
}


// ====== 단어 AND 검색 ======
if (kw !== "") {
    // 검색어를 띄어쓰기 기준으로 나누기
    const words = kw.split(/\s+/).filter(w => w.length > 0);

    // 제목 + 멤버 + 노트 + 날짜 통합 문자열
    const combined = (
      (c.title || "") +
      (c.member || "") +
      (c.note || "") +
      (c.date || "")
    ).toLowerCase();

    // 모든 단어가 포함되어야 통과 (AND 방식)
    for (const w of words) {
        if (!combined.includes(w)) return false;
    }
}

    return ok;
  });

  filteredCards = sortCards(filteredCards);
  renderCards(true);
}

/* ============================================================
   필터 선택
============================================================ */
function applyFilterSelection(type, label, value) {
  activeFilters[type] = value;

  if (type === "year")  yearFilter.textContent  = value === null ? "연도" : label;
  if (type === "month") monthFilter.textContent = value === null ? "월"   : label;
  if (type === "subtag") subTagFilter.textContent = value === null ? "서브필터 선택" : label;

  applySearch();
}

/* ============================================================
   필터 메뉴 띄우기 (버튼 아래 정확히 생성)
============================================================ */
function openFilterMenu(type, btn) {
  filterMenu.innerHTML = "";
  filterMenu.classList.remove("hidden");

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

  // ====== ★ 버튼 아래로 정확히 위치시키기 ======
  const rect = btn.getBoundingClientRect();
  filterMenu.style.position = "absolute";
  filterMenu.style.left = rect.left + "px";
  filterMenu.style.top  = window.scrollY + rect.bottom + 4 + "px";
}


/* ============================================================
   ★ iOS 스크롤 복원 방지 및 상단 초기화 트릭 (핵심 함수) - 최종 수정
============================================================ */
// 1. 스크롤 복원 방지 (있다면 그대로 유지)
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// 2. ★★★ iOS 스크롤 버그 회피 함수 정의 (Final Version) ★★★
function applyIosScrollTrick() {
    // 상단바 DOM 요소 찾기 (.fixed-top-wrapper가 상단바 클래스라고 가정)
    const fixedHeader = document.querySelector('.fixed-top-wrapper'); 

    // iOS Fixed Header 버그 회피 (핵심: 렌더링 강제 업데이트)
    if (fixedHeader) {
        // 눈에 띄지 않는 미세한 3D 변형을 강제하여 뷰포트 재계산을 유도합니다.
        fixedHeader.style.transform = 'translate3d(0, 0, 0.1px)'; 
    }

    // 초기 스크롤을 즉시 맨 위로 이동
    window.scrollTo({ top: 0, behavior: "instant" });
    
    // 10ms 후 3D 변형 제거 (시각적 변화 없음)
    setTimeout(() => {
        if (fixedHeader) {
            fixedHeader.style.transform = ''; // 변형 제거
        }
    }, 10);
    
    // 50ms 후, 미세한 스크롤 이동(0 -> 1 -> 0)으로 뷰포트 재계산 최종 유도
    setTimeout(() => {
        window.scrollTo(0, 1); 
        window.scrollTo(0, 0); 
    }, 50); 
    
    // 100ms 후 최종 안전장치
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 100);
}

/* ============================================================
   이벤트 연결 (수정)
============================================================ */

function handleSearchAction() {
  const kw = (searchInput.value || "").trim();
  
  // 현재 카테고리가 '카테고리 선택' (홈 화면) 상태이며, 검색어가 있을 때
  if (currentCategory.textContent === "카테고리 선택" && kw.length > 0) {
    
    // All Videos (코드 1)로 이동하며 검색어 쿼리(q)를 URL에 추가합니다.
    // CATEGORY_MAP["All Videos"]는 "1" 입니다.
    window.location.href = `?category=${CATEGORY_MAP["All Videos"]}&q=${encodeURIComponent(kw)}`;
    
  } 
  // 일반 카테고리 페이지이거나, 검색어가 없는 경우
  else {
    applySearch(); // 기존 검색 로직 실행
  }
}

// 1. 검색 버튼 클릭 시 (기존 코드를 handleSearchAction 호출로 교체)
searchBtn.addEventListener("click", handleSearchAction);

// 2. Enter 키 입력 시 (기존 코드를 handleSearchAction 호출로 교체)
searchInput.addEventListener("keyup", e => {
  if (e.key === "Enter") {
    handleSearchAction();
  }
});


yearFilter.addEventListener("click", e => openFilterMenu("year", e.target));
monthFilter.addEventListener("click", e => openFilterMenu("month", e.target));
subTagFilter.addEventListener("click", e => openFilterMenu("subtag", e.target));

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
    positionCategoryDropdown(); // ★ 버튼 바로 아래로 위치
  }
});


categoryDropdown.querySelectorAll(".cat-item").forEach(item => {
  item.addEventListener("click", () => {
    categoryDropdown.classList.add("hidden");

    // 카테고리를 이동하면 검색어/필터 초기화
    searchInput.value = "";
    activeFilters = { year: null, month: null, subtag: null };
    yearFilter.textContent = "연도";
    monthFilter.textContent = "월";
    subTagFilter.textContent = "서브필터 선택";
    sortOrder = "newest";
    toggleSortBtn.textContent = "최신순";

    // 1. 카테고리 먼저 변경 (한글 이름 사용)
    changeCategory(item.textContent.trim(), true);

    // 2. 통합된 iOS 스크롤 트릭 함수 호출
    applyIosScrollTrick();
  });
});

/* ============================================================
   최초 로딩 (수정)
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const slug = params.get("category"); // URL에서 숫자 코드(slug)를 가져옵니다.
  const query = params.get("q");      // ★★★ 추가: URL에서 검색어(q)를 가져옵니다. ★★★

  // ★★★ 추가: 검색어가 있다면 검색창에 채워넣습니다. ★★★
  if (query) {
    searchInput.value = decodeURIComponent(query);
  }
  
  // URL에 category=slug가 없는 경우 (Pure Home)
  if (!slug) {
    // 검색어가 있다면 All Videos로 강제 이동 및 검색 실행
    if (query) {
      // URL에는 category가 없지만 검색을 위해 All Videos로 로드하고 검색 실행
      changeCategory("All Videos", false); 
      applySearch(); 
    } else {
      // 검색어가 없다면 홈 뷰 유지
      toggleMainView(false); 
      currentCategory.textContent = "카테고리 선택"; 
    }
  } else {
    // URL에 카테고리가 있는 경우 (일반 카테고리 페이지)
    const cat = slug ? (SLUG_MAP[slug] || "All Videos") : "All Videos";

    toggleMainView(true); // 카드 뷰 보여주기
    changeCategory(cat, false);
    
    // ★★★ 추가: 카테고리가 로드된 후 검색어가 있다면 검색을 실행합니다. ★★★
    if (query) {
        applySearch();
    }
  }

  // 최초 로딩 시 iOS 스크롤 트릭 적용
  applyIosScrollTrick();
});

/* ============================================================
   popstate (뒤로가기)
============================================================ */
window.addEventListener("popstate", () => {
  const params = new URLSearchParams(location.search);
  const slug = params.get("category"); // URL에서 숫자 코드(slug)를 가져옵니다.

  // URL에 category=slug가 없는 경우 (Pure Home)
  if (!slug) {
    toggleMainView(false); // 새 메인 페이지 표시
    currentCategory.textContent = "All Videos"; // UI 초기화
  } else {
    // slug를 한글 카테고리 이름으로 변환합니다.
    const cat = SLUG_MAP[slug] || "All Videos";
    changeCategory(cat, false); // URL 업데이트 없이 카테고리 로드
  }

  // 뒤로가기/앞으로가기 시 iOS 스크롤 트릭 적용
  applyIosScrollTrick();
});

/* ============================================================
   홈버튼 → 초기화 (수정)
============================================================ */
if (homeBtn) {
  homeBtn.addEventListener("click", () => {
    // 검색어/필터 초기화
    searchInput.value = "";
    activeFilters = { year: null, month: null, subtag: null };
    yearFilter.textContent = "연도";
    monthFilter.textContent = "월";
    subTagFilter.textContent = "서브필터 선택";
    sortOrder = "newest";
    toggleSortBtn.textContent = "최신순";

    // 1. URL에서 category와 q 매개변수 완전히 제거 (Pure Home 상태로 만듦)
    // location.pathname은 "?" 이전의 URL만 남김
    history.pushState(null, "", location.pathname); 

    // 2. 신규 홈 화면 표시
    currentCategory.textContent = "카테고리 선택"; // UI 초기화
    toggleMainView(false); // 신규 홈 화면 표시

    // 스크롤 초기화 및 iOS 트릭 적용
    applyIosScrollTrick();
  });
}

/* ============================================================
   필터 메뉴(filterMenu) 외부 클릭 자동 닫힘
============================================================ */
document.addEventListener("click", (e) => {
  // 필터 메뉴가 열려 있을 때만 처리
  if (!filterMenu.classList.contains("hidden")) {
    if (
      !filterMenu.contains(e.target) &&
      !yearFilter.contains(e.target) &&
      !monthFilter.contains(e.target) &&
      !subTagFilter.contains(e.target)
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

// 이미지 드래그 금지
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("img").forEach(img => {
    img.setAttribute("draggable", "false");
  });
});

// 이미지 선택(블록 드래그) 금지
document.addEventListener("mousedown", (e) => {
  if (e.target.tagName === "IMG") {
    e.preventDefault();
  }
});

// 이미지 우클릭 금지
document.addEventListener("contextmenu", (e) => {
  if (e.target.tagName === "IMG") {
    e.preventDefault();
  }
});

function positionCategoryDropdown() {
  const rect = categoryDropdownBtn.getBoundingClientRect();
  
  categoryDropdown.style.position = "fixed";   // 뷰포트 기준 고정

  // ★ 드롭다운 메뉴의 오른쪽 끝을 버튼의 오른쪽 끝에 맞춥니다.
  categoryDropdown.style.right = (window.innerWidth - rect.right) + "px";
  
  // 왼쪽 속성은 적용되지 않도록 "auto"로 설정
  categoryDropdown.style.left = "auto"; 
  
  // 버튼 바로 아래에 위치
  categoryDropdown.style.top  = (rect.bottom + 4) + "px";
}