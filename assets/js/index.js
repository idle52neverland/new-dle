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
   전역 변수
============================================================ */
let allCards = [];
let filteredCards = [];
let visibleCount = 0;
const CARDS_PER_LOAD = 40;

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


/* ============================================================
   카테고리 → 데이터변수 매핑
============================================================ */
function categoryToVarName(category) {
  const raw = category.trim();

// ★ 이 부분을 추가하세요: 트위터 카테고리 강제 매핑
  if (raw === "X(Twitter)") return "xTwitterCards";

  // 한글 포함 여부
  const hasHangul = /[가-힣]/.test(raw);

  if (hasHangul) {
    // 한글 카테고리는: 공백·특수문자 제거 후 Cards 붙이기
    // "콜라보·OST·참여곡" → "콜라보OST참여곡Cards"
    return raw
      .replace(/[^가-힣a-zA-Z0-9]/g, "")   // 한글/영문/숫자 이외 제거
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
    "페스티벌직캠Cards",
    "공식채널Cards",
    "자체예능Cards",
    "녹음비하인드Cards",
    "출연콘텐츠Cards",
    "퍼포먼스클립Cards",
    "매거진인터뷰Cards",
    "라디오오디오쇼Cards",
    "라이브방송Cards",
    "광고Cards",
    "기타Cards"
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
  const slice = filteredCards.slice(visibleCount, visibleCount + CARDS_PER_LOAD);

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
  cardCount.textContent = `총 ${filteredCards.length}개`;
  loadMoreBtn.style.display = (visibleCount >= filteredCards.length) ? "none" : "block";
}
/* ============================================================
   카테고리 변경
============================================================ */
function changeCategory(category, updateURL = true) {
  currentCategory.textContent = category;

  if (category === "All Videos") {
    allCards = buildAllVideos();
  } else {
    const varName = categoryToVarName(category);
    allCards = Array.isArray(window[varName]) ? [...window[varName]] : [];
  }

  // ======== ★ 여기부터 Shorts ,twitter 전용 활성화 ========
const container = document.getElementById("allCards"); // card-container 대신 id로 직접 타겟팅
  
  if (category === "Shorts") {
    container.classList.add("vertical-mode");
    container.classList.remove("twitter-mode");
  } else if (category === "X(Twitter)") {
    container.classList.add("twitter-mode");    // 트위터 모드 활성화
    container.classList.remove("vertical-mode");
  } else {
    container.classList.remove("vertical-mode");
    container.classList.remove("twitter-mode");
  }
  // ============================================

  activeFilters = { year: null, month: null, subtag: null };
  yearFilter.textContent = "연도";
  monthFilter.textContent = "월";
  subTagFilter.textContent = "서브태그";

  filteredCards = sortCards([...allCards]);

  renderCards(true);

  if (updateURL) {
    history.pushState({ category }, "", `?category=${category}`);
  }

  window.scrollTo({ top: 0, behavior: "auto" });
}


/* ============================================================
   검색/필터 적용
============================================================ */
function applySearch() {
  const kw = (searchInput.value || "").toLowerCase();

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


// ========== 서브태그 필터 ==========
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
  if (type === "subtag") subTagFilter.textContent = value === null ? "서브태그" : label;

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
    const years = ["전체","2025","2024","2023","2022","2021","2020","2019","2018","Pre-debut"];
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
      "OST·참여곡": ["전체","음악방송","쇼케이스","특집"],
      "음악방송·시상식": ["전체","음악방송","쇼케이스","특집"],
      "페스티벌 직캠": ["전체","음악방송","쇼케이스","특집"],
      "공식 채널": [
        "전체","아이톡 | I-TALK","해시톡 | HASHTALK","아이로그 | I-LOG",
        "라이브 H/L | I-LIVE H/L","비하인드 외전 | Extra Behind",
        "프로모션 | Comeback Promotion","퍼포먼스 | Performance",
        "커버곡 | Cover","스페셜컨텐츠 | Special Content",
        "응원법 | Fan Chant","기타 | Etc"
      ],
      "자체 예능": ["전체","음악방송","쇼케이스","특집"],
      "녹음 비하인드": ["전체","음악방송","쇼케이스","특집"],
      "출연 콘텐츠": ["전체","음악방송","쇼케이스","특집"],
      "퍼포먼스 클립": ["전체","음악방송","쇼케이스","특집"],
      "매거진·인터뷰": ["전체","음악방송","쇼케이스","특집"],
      "라디오·오디오쇼": ["전체","음악방송","쇼케이스","특집"],
      "라이브 방송": ["전체","음악방송","쇼케이스","특집"],
      "광고": ["전체","음악방송","쇼케이스","특집"],
      "기타": ["전체","음악방송","쇼케이스","특집"],
      "Shorts": ["전체","음악방송","쇼케이스","특집"]
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
   이벤트 연결
============================================================ */
searchBtn.addEventListener("click", applySearch);
searchInput.addEventListener("keyup", e => {
  if (e.key === "Enter") applySearch();
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

    searchInput.value = "";

    activeFilters = { year: null, month: null, subtag: null };
    yearFilter.textContent = "연도";
    monthFilter.textContent = "월";
    subTagFilter.textContent = "서브태그";

    sortOrder = "newest";
    toggleSortBtn.textContent = "최신순";

    window.scrollTo({ top: 0 });

    changeCategory(item.textContent.trim(), true);
  });
});

/* ============================================================
   최초 로딩
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const cat = params.get("category") || "All Videos";
  changeCategory(cat, false);
});

/* ============================================================
   popstate (뒤로가기)
============================================================ */
window.addEventListener("popstate", () => {
  const params = new URLSearchParams(location.search);
  const cat = params.get("category") || "All Videos";
  changeCategory(cat, false);
});

/* ============================================================
   홈버튼 → 초기화
============================================================ */
const homeBtn = document.getElementById("homeBtn");
if (homeBtn) {
  homeBtn.addEventListener("click", () => {
    window.location.href = "index.html";

    searchInput.value = "";

    activeFilters = { year: null, month: null, subtag: null };
    yearFilter.textContent = "연도";
    monthFilter.textContent = "월";
    subTagFilter.textContent = "서브태그";

    sortOrder = "newest";
    toggleSortBtn.textContent = "최신순";

    window.scrollTo({ top: 0 });

    changeCategory("All Videos", false);
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
  categoryDropdown.style.position = "fixed";   // ★ fixed 로 고정
  categoryDropdown.style.left = rect.left + "px";
  categoryDropdown.style.top  = (rect.bottom + 4) + "px";  // window.scrollY 필요 없음
}


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


