/* Fashion Outfit Generator
   - Typ A: spodek + tričko + sako
   - Typ B: spodek + košile (bez saka)
   - Filtr swatches: zamkne kus z šatníku a vygeneruje 2 outfity.
   - Historie + Favority do localStorage
*/

const STORAGE_KEYS = {
  history: "fog_history_v1",
  favorites: "fog_favorites_v1",
};

const NEUTRALS = new Set(["white", "black", "beige", "navy"]);

const COLORS = {
  pants: ["blue", "lightPink", "black"],
  skirts: ["lightPink", "blue", "black"], // potvrzeno: růžová, modrá, černá
  tshirts: ["blue", "white", "lightApricot"],
  shirts: ["lightBlue", "apricot", "burgundy"],
  blazers: ["beige", "black", "navy"],
};

const LABELS = {
  categories: {
    pants: "Kalhoty",
    skirts: "Sukně",
    tshirts: "Tričko",
    shirts: "Košile",
    blazers: "Sako",
  },
  colors: {
    blue: "modré",
    lightPink: "růžové",
    black: "černé",
    white: "bílé",
    lightApricot: "světle meruňkové",
    lightBlue: "světle modrá",
    apricot: "meruňková",
    burgundy: "vínová",
    beige: "béžové",
    navy: "tmavě modré",
  },
};

// Pro swatches + badge (ručně zvolené hezké odstíny)
const COLOR_HEX = {
  blue: "#2f6fed",
  lightPink: "#f3a6c7",
  black: "#111111",
  white: "#ffffff",
  lightApricot: "#ffd3b0",
  lightBlue: "#8bbcff",
  apricot: "#ffb88a",
  burgundy: "#7a1f3d",
  beige: "#e8d6bb",
  navy: "#142a56",
};

// Obrázkové varianty
const IMG_VARIANTS = ["01", "02"];

function imgPath(category, color) {
  const variant = IMG_VARIANTS[Math.floor(Math.random() * IMG_VARIANTS.length)];
  const fileBase = {
    pants: `pants_${color}_${variant}.jpg`,
    skirts: `skirt_${color}_${variant}.jpg`,
    tshirts: `tshirt_${color}_${variant}.jpg`,
    shirts: `shirt_${color}_${variant}.jpg`,
    blazers: `blazer_${color}_${variant}.jpg`,
  }[category];

  return `assets/${category}/${fileBase}`;
}

/* --- Pravidla ladění --- */

// Sako podle spodku
const ALLOWED_BLAZER_BY_BOTTOM = {
  black: ["black", "beige", "navy"],
  blue: ["navy", "beige"],
  lightPink: ["beige", "navy"],
};

// Košile podle spodku (safe elegant)
const ALLOWED_BOTTOM_BY_SHIRT = {
  burgundy: ["black", "blue"],
  apricot: ["black", "blue"],
  lightBlue: ["black", "blue"],
};

// Tričko podle spodku (safe)
const ALLOWED_BOTTOM_BY_TSHIRT = {
  white: ["black", "blue", "lightPink"],
  blue: ["black", "blue"],
  lightApricot: ["black", "blue"],
};

function passesColorLimit(items) {
  const colors = items.map(i => i.color);
  const unique = [...new Set(colors)];

  if (unique.every(c => NEUTRALS.has(c))) return true;

  const accents = unique.filter(c => !NEUTRALS.has(c));
  if (accents.length <= 1) return true;

  return unique.length <= 3;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function item(category, color) {
  return {
    category,
    color,
    label: `${LABELS.categories[category]} – ${LABELS.colors[color]}`,
    img: imgPath(category, color),
  };
}

function randomBottom() {
  const bottomCat = Math.random() < 0.5 ? "pants" : "skirts";
  const color = randomFrom(COLORS[bottomCat]);
  return item(bottomCat, color);
}

/* --- Outfit key (pro historii/favority) --- */
function outfitKey(outfit) {
  // stabilní klíč (nezávislý na náhodné variantě obrázku)
  const parts = outfit.items
    .map(i => `${i.category}:${i.color}`)
    .sort()
    .join("|");
  return `${outfit.typeKey}__${parts}`;
}

function formatNow() {
  const d = new Date();
  return d.toLocaleString("cs-CZ", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}

function generateOutfit(locked = null) {
  const MAX_TRIES = 50;

  for (let t = 0; t < MAX_TRIES; t++) {
    let bottom = null;
    let top = null;
    let blazer = null;
    let type = null; // "A" or "B"

    // Zamčený kus určuje typ
    if (locked?.category) {
      if (locked.category === "pants" || locked.category === "skirts") {
        bottom = item(locked.category, locked.color);
      }
      if (locked.category === "tshirts") type = "A";
      if (locked.category === "shirts") type = "B";
      if (locked.category === "blazers") type = "A";
    }

    if (!bottom) bottom = randomBottom();
    if (!type) type = Math.random() < 0.5 ? "A" : "B";

    if (type === "A") {
      // Tričko
      if (locked?.category === "tshirts") {
        top = item("tshirts", locked.color);
        const ok = (ALLOWED_BOTTOM_BY_TSHIRT[top.color] ?? COLORS.pants).includes(bottom.color);
        if (!ok) continue;
      } else {
        const allowedT = Object.entries(ALLOWED_BOTTOM_BY_TSHIRT)
          .filter(([, bottoms]) => bottoms.includes(bottom.color))
          .map(([c]) => c);
        const tshirtColor = randomFrom(allowedT.length ? allowedT : COLORS.tshirts);
        top = item("tshirts", tshirtColor);
      }

      // Sako
      if (locked?.category === "blazers") {
        blazer = item("blazers", locked.color);
        const ok = (ALLOWED_BLAZER_BY_BOTTOM[bottom.color] ?? COLORS.blazers).includes(blazer.color);
        if (!ok) continue;
      } else {
        const allowedBlazers = ALLOWED_BLAZER_BY_BOTTOM[bottom.color] ?? COLORS.blazers;
        blazer = item("blazers", randomFrom(allowedBlazers));
      }

      const items = [bottom, top, blazer];
      if (!passesColorLimit(items)) continue;

      return { type: "Tričko + sako", typeKey: "A", items };
    }

    if (type === "B") {
      // Košile
      if (locked?.category === "shirts") {
        top = item("shirts", locked.color);
        const allowedBottoms = ALLOWED_BOTTOM_BY_SHIRT[top.color];
        if (allowedBottoms && !allowedBottoms.includes(bottom.color)) continue;
      } else {
        const allowedS = Object.entries(ALLOWED_BOTTOM_BY_SHIRT)
          .filter(([, bottoms]) => bottoms.includes(bottom.color))
          .map(([c]) => c);
        const shirtColor = randomFrom(allowedS.length ? allowedS : COLORS.shirts);
        top = item("shirts", shirtColor);
      }

      const items = [bottom, top];
      if (!passesColorLimit(items)) continue;

      return { type: "Jen košile", typeKey: "B", items };
    }
  }

  // fallback
  return {
    type: "Fallback",
    typeKey: "X",
    items: [randomBottom(), item("tshirts", "white"), item("blazers", "black")]
  };
}

function outfitsAreDifferent(a, b) {
  return outfitKey(a) !== outfitKey(b);
}

function generateOutfits(count, locked = null) {
  const result = [];
  let guard = 0;

  while (result.length < count && guard < 120) {
    const o = generateOutfit(locked);
    if (result.length === 0 || outfitsAreDifferent(result[result.length - 1], o)) {
      result.push(o);
    }
    guard++;
  }
  return result;
}

/* --- localStorage helpers --- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* --- State --- */
let selectedOwnedColor = ""; // swatch selection
let lastRenderedOutfits = [];

let history = loadJSON(STORAGE_KEYS.history, []);     // [{key, outfit, at}]
let favorites = loadJSON(STORAGE_KEYS.favorites, []); // [{key, outfit, at}]

function isFavorite(key) {
  return favorites.some(f => f.key === key);
}

function upsertHistory(outfits) {
  // uloží každý vygenerovaný outfit do historie, de-dup podle key, nejnovější nahoře
  outfits.forEach(outfit => {
    const key = outfitKey(outfit);
    const entry = { key, outfit, at: Date.now() };
    history = history.filter(h => h.key !== key);
    history.unshift(entry);
  });

  // limit historie (např. 50)
  history = history.slice(0, 50);
  saveJSON(STORAGE_KEYS.history, history);
}

function toggleFavorite(outfit) {
  const key = outfitKey(outfit);

  if (isFavorite(key)) {
    favorites = favorites.filter(f => f.key !== key);
  } else {
    favorites.unshift({ key, outfit, at: Date.now() });
    favorites = favorites.slice(0, 50);
  }

  saveJSON(STORAGE_KEYS.favorites, favorites);
}

/* --- UI refs --- */
const outfitsEl = document.getElementById("outfits");
const emptyStateEl = document.getElementById("emptyState");
const statusPillsEl = document.getElementById("statusPills");

const btnGenerate = document.getElementById("btnGenerate");
const btnReset = document.getElementById("btnReset");

const ownedCategoryEl = document.getElementById("ownedCategory");
const ownedSwatchesEl = document.getElementById("ownedSwatches");

const btnHistory = document.getElementById("btnHistory");
const btnFavorites = document.getElementById("btnFavorites");

const drawer = document.getElementById("drawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const drawerTitle = document.getElementById("drawerTitle");
const drawerContent = document.getElementById("drawerContent");
const btnCloseDrawer = document.getElementById("btnCloseDrawer");
const btnClearHistory = document.getElementById("btnClearHistory");
const btnClearFavorites = document.getElementById("btnClearFavorites");

/* --- Placeholder SVG --- */
function fallbackSvg(text) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f1f1f1"/>
        <stop offset="100%" stop-color="#e8e8e8"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" font-family="Arial" font-size="40" fill="#666" text-anchor="middle">
      ${escapeXml(text)}
    </text>
    <text x="50%" y="56%" font-family="Arial" font-size="24" fill="#888" text-anchor="middle">
      (chybí obrázek v /assets)
    </text>
  </svg>`;
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, c => ({
    "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '"':"&quot;"
  }[c]));
}

/* --- Render swatches --- */
function renderSwatches() {
  ownedSwatchesEl.innerHTML = "";
  selectedOwnedColor = "";

  const cat = ownedCategoryEl.value;
  if (!cat) {
    ownedSwatchesEl.innerHTML = `<div class="pill">Vyber kategorii pro aktivaci filtru</div>`;
    renderStatusPills();
    return;
  }

  COLORS[cat].forEach(color => {
    const btn = document.createElement("button");
    btn.className = "swatch";
    btn.type = "button";
    btn.title = LABELS.colors[color];
    btn.setAttribute("aria-label", LABELS.colors[color]);
    btn.style.background = COLOR_HEX[color] || "#ddd";

    // pro bílou přidej jemný okraj
    if (color === "white") btn.style.boxShadow = "inset 0 0 0 2px rgba(0,0,0,.08)";

    btn.addEventListener("click", () => {
      // toggle selection
      const wasSelected = selectedOwnedColor === color;
      selectedOwnedColor = wasSelected ? "" : color;

      [...ownedSwatchesEl.querySelectorAll(".swatch")].forEach(s => s.classList.remove("selected"));
      if (!wasSelected) btn.classList.add("selected");

      renderStatusPills();
    });

    ownedSwatchesEl.appendChild(btn);
  });

  renderStatusPills();
}

/* --- Status pills (malé info) --- */
function renderStatusPills() {
  const cat = ownedCategoryEl.value;
  const pills = [];

  if (cat && selectedOwnedColor) {
    pills.push(`Filtr: ${LABELS.categories[cat]} – ${LABELS.colors[selectedOwnedColor]}`);
    pills.push("Výstup: 2 outfity");
  } else {
    pills.push("Filtr: vypnuto");
    pills.push("Výstup: 1 outfit");
  }

  pills.push(`Historie: ${history.length}`);
  pills.push(`Favority: ${favorites.length}`);

  statusPillsEl.innerHTML = pills.map(p => `<span class="pill">${p}</span>`).join("");
}

/* --- Render outfits --- */
function renderOutfits(outfits) {
  lastRenderedOutfits = outfits;

  outfitsEl.innerHTML = "";
  emptyStateEl.style.display = outfits.length ? "none" : "block";

  outfits.forEach((o, idx) => {
    const key = outfitKey(o);
    const saved = isFavorite(key);

    const colorsText = [...new Set(o.items.map(i => i.color))]
      .map(c => LABELS.colors[c]).join(", ");

    const card = document.createElement("div");
    card.className = "outfitCard";

    card.innerHTML = `
      <div class="outfitHeader">
        <div>
          <div class="title">Outfit ${idx + 1} <span class="meta">(${o.type})</span></div>
          <div class="meta">Barvy: ${colorsText}</div>
        </div>
        <div class="headerActions">
          <button class="heartBtn ${saved ? "saved" : ""}" data-key="${key}" aria-label="Uložit outfit do favoritů">
            ${saved ? "❤️" : "🤍"} Uložit
          </button>
        </div>
      </div>

      <div class="itemsGrid">
        ${o.items.map(i => `
          <div class="item">
            <img class="thumb" src="${i.img}" alt="${i.label}"
              onerror="this.src='data:image/svg+xml;charset=UTF-ss="badge" style="background: rgba(0,0,0,.03)">
                ${LABELS.colors[i.color]}
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    outfitsEl.appendChild(card);

    const heartBtn = card.querySelector(".heartBtn");
    heartBtn.addEventListener("click", () => {
      toggleFavorite(o);
      renderStatusPills();
      // překresli jen stav srdíčka
      const nowSaved = isFavorite(key);
      heartBtn.classList.toggle("saved", nowSaved);
      heartBtn.textContent = `${nowSaved ? "❤️" : "🤍"} Uložit`;
    });
  });
}

/* --- Drawer (Historie / Favority) --- */
function openDrawer(mode) {
  drawer.classList.remove("hidden");
  drawerBackdrop.classList.remove("hidden");
  drawer.setAttribute("aria-hidden", "false");

  btnClearHistory.classList.toggle("hidden", mode !== "history");
  btnClearFavorites.classList.toggle("hidden", mode !== "favorites");

  if (mode === "history") {
    drawerTitle.textContent = "Historie";
    renderDrawerList(history, "history");
  } else {
    drawerTitle.textContent = "Favority";
    renderDrawerList(favorites, "favorites");
  }
}

function closeDrawer() {
  drawer.classList.add("hidden");
  drawerBackdrop.classList.add("hidden");
  drawer.setAttribute("aria-hidden", "true");
}

function renderDrawerList(list, mode) {
  if (!list.length) {
    drawerContent.innerHTML = `<div class="pill">Zatím prázdné.</div>`;
    return;
  }

  drawerContent.innerHTML = `
    <div class="list">
      ${list.map((entry, idx) => {
        const o = entry.outfit;
        const key = entry.key;
        const time = new Date(entry.at).toLocaleString("cs-CZ", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
        const colorsText = [...new Set(o.items.map(i => i.color))].map(c => LABELS.colors[c]).join(", ");

        return `
          <div class="listItem">
            <div class="listItemTop">
              <div>
                <div class="listTitle">${mode === "history" ? "Outfit" : "Favorit"} #${idx + 1}</div>
                <div class="listMeta">${o.type} • ${colorsText} • ${time}</div>
              </div>
              <div class="listActions">
                showZobrazit</button>
                ${mode === "history"
                  ? `fav${isFavorite(key) ? "❤️" : "🤍"}</button>`
                  : `removeOdebrat</button>`
                }
              </div>
            </div>

            <div class="miniGrid">
              ${o.items.map(i => `
                ${i.img}
              `).join("")}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  drawerContent.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const key = btn.dataset.key;

      const source = (mode === "history") ? history : favorites;
      const entry = source.find(e => e.key === key);
      if (!entry) return;

      if (action === "show") {
        renderOutfits([entry.outfit]);
        closeDrawer();
      }

      if (action === "fav") {
        toggleFavorite(entry.outfit);
        renderStatusPills();
        renderDrawerList(history, "history");
      }

      if (action === "remove") {
        favorites = favorites.filter(f => f.key !== key);
        saveJSON(STORAGE_KEYS.favorites, favorites);
        renderStatusPills();
        renderDrawerList(favorites, "favorites");
      }
    });
  });
}

/* --- Events --- */
ownedCategoryEl.addEventListener("change", renderSwatches);

btnGenerate.addEventListener("click", () => {
  const cat = ownedCategoryEl.value;
  const locked = (cat && selectedOwnedColor) ? { category: cat, color: selectedOwnedColor } : null;

  const count = locked ? 2 : 1;
  const outfits = generateOutfits(count, locked);

  upsertHistory(outfits);
  renderStatusPills();
  renderOutfits(outfits);
});

btnReset.addEventListener("click", () => {
  ownedCategoryEl.value = "";
  selectedOwnedColor = "";
  renderSwatches();
  renderOutfits([]);
  renderStatusPills();
});

btnHistory.addEventListener("click", () => openDrawer("history"));
btnFavorites.addEventListener("click", () => openDrawer("favorites"));
btnCloseDrawer.addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);

btnClearHistory.addEventListener("click", () => {
  history = [];
  saveJSON(STORAGE_KEYS.history, history);
  renderStatusPills();
  renderDrawerList(history, "history");
});

btnClearFavorites.addEventListener("click", () => {
  favorites = [];
  saveJSON(STORAGE_KEYS.favorites, favorites);
  renderStatusPills();
  renderDrawerList(favorites, "favorites");
});

/* --- Init --- */
renderSwatches();
renderStatusPills();
renderOutfits([]);
