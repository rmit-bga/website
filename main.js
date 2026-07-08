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

