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
