// RBGA kiosk engine: deals slide cards onto the felt on a timer, pulls live
// events and the games library when the network allows, and keeps the laptop
// screen awake at the stall. Unlinked from the rest of the site on purpose.

const slides = Array.from(document.querySelectorAll(".slide"));
const timerFill = document.getElementById("timer-fill");
const pausedBadge = document.getElementById("paused-badge");
const railHint = document.getElementById("rail-hint");

const DEAL_MS = 750;
let current = 0;
let paused = false;
let advanceTimer = null;
let slideStartedAt = 0;
let remainingMs = 0;

const visibleSlides = () => slides.filter((slide) => !slide.hidden);

const slideDuration = (slide) =>
  parseInt(slide.dataset.duration, 10) || 10000;

const startTimerBar = (duration) => {
  timerFill.classList.remove("is-running");
  // Force a reflow so re-adding the class restarts the animation
  void timerFill.offsetWidth;
  timerFill.style.animationDuration = `${duration}ms`;
  timerFill.classList.add("is-running");
  timerFill.style.animationPlayState = paused ? "paused" : "running";
};

const scheduleAdvance = (delay) => {
  clearTimeout(advanceTimer);
  slideStartedAt = performance.now();
  remainingMs = delay;
  advanceTimer = setTimeout(() => showNext(1), delay);
};

const showSlide = (slide, direction) => {
  const previous = slides[current];
  current = slides.indexOf(slide);

  if (previous && previous !== slide) {
    previous.classList.remove("is-active", "is-dealing");
    previous.classList.add("is-leaving");
    previous.addEventListener(
      "animationend",
      () => previous.classList.remove("is-leaving"),
      { once: true }
    );
  }

  slide.classList.add("is-active", "is-dealing");
  slide.addEventListener(
    "animationend",
    (event) => {
      if (event.target === slide) slide.classList.remove("is-dealing");
    },
    { once: true }
  );

  const duration = slideDuration(slide) + (direction === 0 ? 0 : DEAL_MS);
  startTimerBar(duration);
  if (!paused) scheduleAdvance(duration);
};

const showNext = (step) => {
  const pool = visibleSlides();
  if (!pool.length) return;
  const activeIndex = pool.indexOf(slides[current]);
  const nextIndex =
    (activeIndex + step + pool.length) % pool.length;
  showSlide(pool[nextIndex], step);
};

const setPaused = (value) => {
  paused = value;
  pausedBadge.hidden = !paused;
  if (paused) {
    clearTimeout(advanceTimer);
    remainingMs -= performance.now() - slideStartedAt;
    timerFill.style.animationPlayState = "paused";
  } else {
    timerFill.style.animationPlayState = "running";
    scheduleAdvance(Math.max(remainingMs, 500));
  }
};

// First card
showSlide(slides[0], 0);

// ---------- Controls ----------

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") showNext(1);
  if (event.key === "ArrowLeft") showNext(-1);
  if (event.key === " ") {
    event.preventDefault();
    setPaused(!paused);
  }
  if (event.key.toLowerCase() === "f") {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }
});

document.addEventListener("fullscreenchange", () => {
  railHint.classList.toggle("is-hidden", Boolean(document.fullscreenElement));
});
setTimeout(() => railHint.classList.add("is-hidden"), 20000);

// Hide the cursor while idle so the screen reads as a display, not a desktop
let cursorTimer = null;
const wakeCursor = () => {
  document.body.classList.remove("hide-cursor");
  clearTimeout(cursorTimer);
  cursorTimer = setTimeout(
    () => document.body.classList.add("hide-cursor"),
    3000
  );
};
document.addEventListener("mousemove", wakeCursor);
wakeCursor();

// Keep the laptop screen awake while the kiosk is visible
const requestWakeLock = async () => {
  try {
    if ("wakeLock" in navigator) {
      await navigator.wakeLock.request("screen");
    }
  } catch {
    // Battery saver or platform limits can refuse; the show goes on
  }
};
requestWakeLock();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") requestWakeLock();
});

// ---------- Live "What's on" slide (same Rubric API call as the landing page) ----------

const whatsOnSlide = document.getElementById("whats-on-slide");
const whatsOnList = document.getElementById("whats-on-list");
const MAX_EVENTS = 4;
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                 Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

const eventDate = (ev) => {
  const month = MONTHS[ev.month];
  const day = parseInt(ev.day, 10);
  if (month == null || isNaN(day)) return null;
  const year = /\b(20\d{2})\b/.exec(ev.formatteddate || "");
  return new Date(year ? +year[1] : new Date().getFullYear(), month, day);
};

const isUpcoming = (ev) => {
  if (ev.upcoming === 1) return true;
  const date = eventDate(ev);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

const makeEventCard = (ev) => {
  const card = document.createElement("div");
  card.className = "whats-on-card";

  const date = document.createElement("div");
  date.className = "whats-on-date";
  const month = document.createElement("span");
  month.className = "whats-on-month";
  month.textContent = ev.month || "";
  const day = document.createElement("span");
  day.className = "whats-on-day";
  day.textContent = ev.day || "";
  date.append(month, day);
  card.append(date);

  const body = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "whats-on-title";
  title.textContent = ev.title || "Event";
  body.append(title);
  if (ev.formatteddate) {
    const when = document.createElement("p");
    when.className = "whats-on-when";
    when.textContent = ev.formatteddate;
    body.append(when);
  }
  card.append(body);
  return card;
};

const details = {
  societyid: "10742",
  domain: "campus.hellorubric.com",
  device: "web_portal",
  version: 4,
  timestamp: Date.now(),
};
fetch("https://api.hellorubric.com/", {
  method: "POST",
  body: new URLSearchParams({
    details: JSON.stringify(details),
    endpoint: "getSocietyLandingPage",
  }),
})
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((data) => {
    const events = (data.sections || [])
      .filter((section) => section.sectionname === "Events")
      .flatMap((section) => section.array || [])
      .filter(isUpcoming)
      .sort((a, b) => (eventDate(a) || 0) - (eventDate(b) || 0));

    const seen = new Set();
    const deduped = events.filter((ev) => {
      if (seen.has(ev.title)) return false;
      seen.add(ev.title);
      return true;
    });
    if (!deduped.length) return;

    deduped.slice(0, MAX_EVENTS).forEach((ev) => {
      whatsOnList.append(makeEventCard(ev));
    });
    whatsOnSlide.hidden = false;
  })
  .catch(() => {});

// ---------- Live games-library slide ----------

const librarySlide = document.getElementById("library-slide");
const libraryTitle = document.getElementById("library-title");
const libraryMarquee = document.getElementById("library-marquee");
const MARQUEE_ROWS = 2;
const TILES_PER_ROW = 14;

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

fetch("https://rmitbga.duckdns.org/board-games")
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((games) => {
    const inLibrary = games.filter((game) => !game.missing);
    const withThumbs = shuffle(
      inLibrary.filter(
        (game) =>
          typeof game.thumbnail === "string" &&
          game.thumbnail.startsWith("http")
      )
    );
    if (withThumbs.length < TILES_PER_ROW) return;

    for (let row = 0; row < MARQUEE_ROWS; row += 1) {
      const strip = document.createElement("div");
      strip.className = `marquee-row ${row % 2 ? "drift-right" : "drift-left"}`;
      const picks = withThumbs.slice(
        row * TILES_PER_ROW,
        (row + 1) * TILES_PER_ROW
      );
      if (picks.length < TILES_PER_ROW) break;
      // Double the sequence so the -50% translate loops seamlessly
      [...picks, ...picks].forEach((game) => {
        const img = document.createElement("img");
        img.src = game.thumbnail;
        img.alt = "";
        img.decoding = "async";
        strip.append(img);
      });
      libraryMarquee.append(strip);
    }

    if (libraryMarquee.children.length) {
      libraryTitle.innerHTML = `${inLibrary.length} games.<br />All free to play.`;
      librarySlide.hidden = false;
    }
  })
  .catch(() => {});
