// Games library page: fetch the inventory once, then search/filter in memory.
// API reference: API.md (GET /board-games, public, no pagination).
const gamesGrid = document.getElementById("games-grid");

if (gamesGrid) {
  const API_URL = "https://rmitbga.duckdns.org/board-games";
  const searchInput = document.getElementById("games-search");
  const tagSelect = document.getElementById("games-tag");
  const countEl = document.getElementById("games-count");
  const errorEl = document.getElementById("games-error");
  const emptyEl = document.getElementById("games-empty");
  const retryButton = document.getElementById("games-retry");
  const toolbar = document.querySelector(".games-toolbar");

  let allGames = [];

  const isHttpUrl = (value) =>
    typeof value === "string" && value.startsWith("http");

  // Every field except id, title and missing can be null, so render defensively.
  const playersLabel = (game) => {
    const min = game.min_players;
    const max = game.max_players;
    if (min && max) {
      return min === max ? `${min} players` : `${min}–${max} players`;
    }
    if (min) return `${min}+ players`;
    if (max) return `Up to ${max} players`;
    return null;
  };

  const buildThumb = (game) => {
    const thumb = document.createElement("div");
    thumb.className = "game-thumb";

    const showFallback = () => {
      thumb.textContent = "";
      const fallback = document.createElement("span");
      fallback.className = "game-thumb-fallback";
      fallback.setAttribute("aria-hidden", "true");
      fallback.textContent = "\u{1F3B2}";
      thumb.append(fallback);
    };

    // Legacy CSV rows hold bare filenames here, so only trust real URLs.
    if (isHttpUrl(game.thumbnail)) {
      const img = document.createElement("img");
      img.src = game.thumbnail;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", showFallback, { once: true });
      thumb.append(img);
    } else {
      showFallback();
    }

    return thumb;
  };

  const buildCard = (game) => {
    const card = document.createElement("article");
    card.className = "game-card";
    card.append(buildThumb(game));

    const body = document.createElement("div");
    body.className = "game-body";

    const title = document.createElement("h3");
    title.className = "game-title";
    title.textContent = game.title;
    body.append(title);

    const metaParts = [game.publisher, playersLabel(game)].filter(Boolean);
    if (metaParts.length) {
      const meta = document.createElement("p");
      meta.className = "game-meta";
      meta.textContent = metaParts.join(" · ");
      body.append(meta);
    }

    const tags = Array.isArray(game.tags) ? game.tags.filter(Boolean) : [];
    if (tags.length) {
      const tagList = document.createElement("div");
      tagList.className = "game-tags";
      tags.forEach((tag) => {
        const chip = document.createElement("span");
        chip.className = "game-tag";
        chip.textContent = tag;
        tagList.append(chip);
      });
      body.append(tagList);
    }

    if (isHttpUrl(game.bgg_link)) {
      const bgg = document.createElement("a");
      bgg.className = "game-bgg";
      bgg.href = game.bgg_link;
      bgg.target = "_blank";
      bgg.rel = "noreferrer";
      bgg.textContent = "View on BGG";
      body.append(bgg);
    }

    card.append(body);
    return card;
  };

  const populateTagSelect = () => {
    // Keep only the "All categories" option (retry after a failed load re-runs this).
    while (tagSelect.options.length > 1) tagSelect.remove(1);
    const tagSet = new Set();
    allGames.forEach((game) => {
      (Array.isArray(game.tags) ? game.tags : []).forEach((tag) => {
        if (tag) tagSet.add(tag);
      });
    });
    [...tagSet]
      .sort((a, b) => a.localeCompare(b))
      .forEach((tag) => {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        tagSelect.append(option);
      });
  };

  const filteredGames = () => {
    const query = searchInput.value.trim().toLowerCase();
    const tag = tagSelect.value;
    return allGames.filter((game) => {
      if (tag && !(Array.isArray(game.tags) && game.tags.includes(tag))) {
        return false;
      }
      if (!query) return true;
      const haystack = `${game.title} ${game.publisher || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  };

  const render = () => {
    const games = filteredGames();
    gamesGrid.textContent = "";
    games.forEach((game) => gamesGrid.append(buildCard(game)));
    emptyEl.hidden = games.length > 0;
    countEl.textContent =
      games.length === allGames.length
        ? `${allGames.length} games in the library`
        : `Showing ${games.length} of ${allGames.length} games`;
  };

  const showError = () => {
    gamesGrid.textContent = "";
    countEl.textContent = "";
    errorEl.hidden = false;
  };

  const load = () => {
    errorEl.hidden = true;
    fetch(API_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((games) => {
        // Hide games the last stocktake couldn't find.
        allGames = games.filter((game) => !game.missing);
        populateTagSelect();
        render();
      })
      .catch(showError);
  };

  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 150);
  });
  tagSelect.addEventListener("change", render);
  toolbar.addEventListener("submit", (event) => event.preventDefault());
  retryButton.addEventListener("click", load);

  load();
}
