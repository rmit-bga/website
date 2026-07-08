// Keep footer year up to date
document.getElementById("year").textContent = new Date().getFullYear();
document.documentElement.classList.add("js");

// Sticky nav state on scroll
const nav = document.querySelector(".nav");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const updateNavState = () => {
  if (!nav) return;
  if (window.scrollY > 8) {
    nav.classList.add("is-sticky");
  } else {
    nav.classList.remove("is-sticky");
  }
};

// Mobile nav toggle
if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Close menu when a link is tapped
  navLinks.addEventListener("click", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLAnchorElement &&
      nav.classList.contains("is-open")
    ) {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

// Swap blurred placeholders with full-resolution images
const revealItems = document.querySelectorAll(".reveal, .reveal-fade");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);
const lazyImages = document.querySelectorAll("img.lazy-image");
const markImageLoaded = (img) => img.classList.add("is-loaded");
const getDeferredSources = (img) => {
  const picture = img.closest("picture");
  if (!picture) return [];
  return picture.querySelectorAll("source[data-srcset]");
};
const hasDeferredImage = (img) =>
  Boolean(
    img.dataset.src || img.dataset.srcset || getDeferredSources(img).length
  );
const swapInFullImage = (img) => {
  getDeferredSources(img).forEach((source) => {
    const fullSrcset = source.dataset.srcset;
    if (!fullSrcset) return;
    source.srcset = fullSrcset;
    source.removeAttribute("data-srcset");
  });

  if (img.dataset.srcset) {
    img.srcset = img.dataset.srcset;
    img.removeAttribute("data-srcset");
  }

  if (img.dataset.src) {
    img.src = img.dataset.src;
    img.removeAttribute("data-src");
  }
};
lazyImages.forEach((img) => {
  if (hasDeferredImage(img)) {
    img.addEventListener("load", () => markImageLoaded(img), {
      once: true,
    });
    img.addEventListener("error", () => markImageLoaded(img), {
      once: true,
    });
    swapInFullImage(img);
    if (img.complete) markImageLoaded(img);
    return;
  }

  if (img.complete) {
    markImageLoaded(img);
  } else {
    img.addEventListener("load", () => markImageLoaded(img), {
      once: true,
    });
    img.addEventListener("error", () => markImageLoaded(img), {
      once: true,
    });
  }
});
const revealNow = () => {
  revealItems.forEach((item) => item.classList.add("is-visible"));
};

// Reveal elements as they enter the viewport
if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
  revealNow();
} else {
  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
  );

  revealItems.forEach((item) => observer.observe(item));
}

window.addEventListener("scroll", updateNavState, { passive: true });
window.addEventListener("load", updateNavState);
updateNavState();

// Landing page "What's on" list: upcoming events from hellorubric's JSON API
// (the same call their site makes; CORS-open). Cards link to the event's
// ticketing page. Fails silently — the static session cards still describe
// the regular schedule.
const whatsOn = document.getElementById("whats-on");
if (whatsOn) {
  const whatsOnList = document.getElementById("whats-on-list");
  const MAX_EVENTS = 6;
  const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                   Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

  // Reconstruct a Date from month/day + the year in formatteddate ("…, 8 Jun 2026, …").
  const eventDate = (ev) => {
    const month = MONTHS[ev.month];
    const day = parseInt(ev.day, 10);
    if (month == null || isNaN(day)) return null;
    const year = /\b(20\d{2})\b/.exec(ev.formatteddate || "");
    return new Date(year ? +year[1] : new Date().getFullYear(), month, day);
  };

  // Trust hellorubric's flag, but also treat anything dated today-or-later as upcoming.
  const isUpcoming = (ev) => {
    if (ev.upcoming === 1) return true;
    const date = eventDate(ev);
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const makeEventCard = (ev) => {
    const card = document.createElement("a");
    card.className = "whats-on-card";
    card.href = ev.destination;
    card.target = "_blank";
    card.rel = "noreferrer";

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
    body.className = "whats-on-body";
    const title = document.createElement("h4");
    title.className = "whats-on-event-title";
    title.textContent = ev.title || "Event";
    body.append(title);
    if (ev.formatteddate) {
      const when = document.createElement("p");
      when.className = "whats-on-when";
      when.textContent = ev.formatteddate;
      body.append(when);
    }
    if (ev.subtitle) {
      const where = document.createElement("p");
      where.className = "whats-on-where";
      where.textContent = ev.subtitle;
      body.append(where);
    }
    if (ev.info) {
      const info = document.createElement("span");
      info.className = "whats-on-info";
      info.textContent = ev.info;
      body.append(info);
    }
    card.append(body);
    return card;
  };

  // URLSearchParams keeps this a "simple" CORS request (no preflight).
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
      // Only the "Events" section — others hold memberships, committee, etc.
      const events = (data.sections || [])
        .filter((section) => section.sectionname === "Events")
        .flatMap((section) => section.array || [])
        .filter((ev) => isUpcoming(ev) && typeof ev.destination === "string" &&
          ev.destination.startsWith("http"))
        .sort((a, b) => (eventDate(a) || 0) - (eventDate(b) || 0));

      // One card per series: keep the earliest occurrence of each title.
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
      whatsOn.hidden = false;
    })
    .catch(() => {});
}

// Landing page featured-games strip: pick a random tag every load and show a
// handful of games from it. Fails silently — the static copy + CTA still work.
const featuredGames = document.getElementById("featured-games");
if (featuredGames) {
  const featuredTag = document.getElementById("featured-tag");
  const featuredStrip = document.getElementById("featured-strip");
  const browseCta = document.getElementById("browse-games-cta");
  const TILE_COUNT = 5;

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
      // Only feature games with a real thumbnail URL (legacy rows hold bare filenames).
      const withThumbs = inLibrary.filter(
        (game) =>
          typeof game.thumbnail === "string" &&
          game.thumbnail.startsWith("http")
      );

      const byTag = new Map();
      withThumbs.forEach((game) => {
        (Array.isArray(game.tags) ? game.tags : []).forEach((tag) => {
          if (!tag) return;
          if (!byTag.has(tag)) byTag.set(tag, []);
          byTag.get(tag).push(game);
        });
      });

      const candidates = [...byTag.entries()].filter(
        ([, tagged]) => tagged.length >= 4
      );
      if (!candidates.length) return;

      const [tag, tagged] =
        candidates[Math.floor(Math.random() * candidates.length)];
      featuredTag.textContent = tag;

      shuffle(tagged)
        .slice(0, TILE_COUNT)
        .forEach((game) => {
          const tile = document.createElement("a");
          tile.className = "featured-game";
          tile.href = "games.html";

          const img = document.createElement("img");
          img.src = game.thumbnail;
          img.alt = "";
          img.loading = "lazy";
          img.decoding = "async";
          tile.append(img);

          const label = document.createElement("span");
          label.className = "featured-game-title";
          label.textContent = game.title;
          tile.append(label);

          featuredStrip.append(tile);
        });

      if (browseCta) {
        browseCta.textContent = `Browse all ${inLibrary.length} games`;
      }
      featuredGames.hidden = false;
    })
    .catch(() => {});
}

