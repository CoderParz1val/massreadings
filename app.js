const DESTINATIONS_PATH = "./data/destinations.json";

function normalizeLanguageTag(value) {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}

function getBrowserLanguageFallback() {
  const raw = navigator.language || navigator.userLanguage || "";
  // prefer language subtag only (e.g. "en" from "en-US") for this v1
  return normalizeLanguageTag(raw.split("-")[0]);
}

function browserLangToDisplayLanguage(browserLang) {
  const code = normalizeLanguageTag(browserLang);
  const map = {
    en: "english",
    es: "spanish",
    it: "italian",
    fr: "french",
    de: "german",
    pt: "portuguese",
    ja: "japanese",
    ga: "irish (gaelic)",
  };
  return map[code] || "";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validateDestinations(list) {
  if (!Array.isArray(list)) {
    throw new Error("destinations.json must be an array");
  }

  for (const [i, item] of list.entries()) {
    if (!item || typeof item !== "object") throw new Error(`Entry #${i} must be an object`);
    if (!item.language || typeof item.language !== "string") throw new Error(`Entry #${i} missing 'language'`);
    if (!Array.isArray(item.sites) || item.sites.length === 0) throw new Error(`Entry #${i} missing 'sites[]'`);

    for (const [j, site] of item.sites.entries()) {
      if (!site || typeof site !== "object") throw new Error(`Entry #${i} site #${j} must be an object`);
      if (!site.name || typeof site.name !== "string") throw new Error(`Entry #${i} site #${j} missing 'name'`);
      if (!site.url || typeof site.url !== "string") throw new Error(`Entry #${i} site #${j} missing 'url'`);
      if (site.description && typeof site.description !== "string") throw new Error(`Entry #${i} site #${j} bad 'description'`);
      if (site.content && !Array.isArray(site.content)) throw new Error(`Entry #${i} site #${j} bad 'content'`);
    }
  }

  return list;
}

function pickBestDestination(destinations, languageDisplayName) {
  const lang = normalizeLanguageTag(languageDisplayName);
  if (!lang) return null;

  // exact language match (v1). Later we can add region/country scoring here.
  const exactLanguage = destinations.find((d) => normalizeLanguageTag(d.language) === lang);
  if (!exactLanguage) return null;

  const bestSite = exactLanguage.sites[0];
  const alternatives = exactLanguage.sites.slice(1);
  return {
    language: exactLanguage.language,
    notes: exactLanguage.notes || "",
    bestSite,
    alternatives,
    reason: `Matched language: ${exactLanguage.language}`,
  };

  return null;
}

async function loadDestinations() {
  const res = await fetch(DESTINATIONS_PATH, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load destinations: ${res.status}`);
  const json = await res.json();
  return validateDestinations(json);
}

function renderResult(el, match) {
  if (!match) {
    el.innerHTML = `<div><strong>No match yet.</strong> <span class="muted">Pick a language to see the recommended page.</span></div>`;
    return;
  }

  const altHtml =
    match.alternatives.length === 0
      ? ""
      : `
        <div style="margin-top:14px">
          <div class="muted" style="margin-bottom:8px"><strong>Other good options</strong></div>
          <div class="altList">
            ${match.alternatives
              .map(
                (s) => `
              <div class="altItem">
                <div class="altTop">
                  <div class="altName">${escapeHtml(s.name)}</div>
                  <a class="button small" href="${escapeHtml(s.url)}" rel="noopener noreferrer" target="_blank">Open</a>
                </div>
                ${s.description ? `<div class="muted" style="margin-top:6px">${escapeHtml(s.description)}</div>` : ""}
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;

  el.innerHTML = `
    <div>
      <div class="altTop">
        <div><strong>Recommended:</strong> ${escapeHtml(match.bestSite.name)}</div>
        <a class="button small" href="${escapeHtml(match.bestSite.url)}" rel="noopener noreferrer" target="_blank">Open</a>
      </div>
      <div class="muted" style="margin-top:6px">${escapeHtml(match.reason)}</div>
      ${match.notes ? `<div class="muted" style="margin-top:10px">${escapeHtml(match.notes)}</div>` : ""}
      ${match.bestSite.description ? `<div style="margin-top:10px" class="muted">${escapeHtml(match.bestSite.description)}</div>` : ""}
      <div style="margin-top:10px" class="muted">
        <a href="${escapeHtml(match.bestSite.url)}" rel="noopener noreferrer" target="_blank">${escapeHtml(match.bestSite.url)}</a>
      </div>
    </div>
    ${altHtml}
  `;
}

function setGoLink(goBtn, match) {
  if (!match) {
    goBtn.setAttribute("href", "#");
    goBtn.setAttribute("aria-disabled", "true");
    goBtn.classList.add("disabled");
    goBtn.style.pointerEvents = "none";
    goBtn.style.opacity = "0.6";
    return;
  }

  goBtn.setAttribute("href", match.bestSite.url);
  goBtn.setAttribute("aria-disabled", "false");
  goBtn.classList.remove("disabled");
  goBtn.style.pointerEvents = "auto";
  goBtn.style.opacity = "1";
}

function fillLanguageSelect(select, destinations, preferredLanguage) {
  select.innerHTML = "";
  const options = destinations.slice().sort((a, b) => a.language.localeCompare(b.language));
  for (const d of options) {
    const opt = document.createElement("option");
    opt.value = d.language;
    opt.textContent = d.language;
    select.appendChild(opt);
  }

  const preferred = normalizeLanguageTag(preferredLanguage);
  const preferredDisplay = browserLangToDisplayLanguage(preferred);
  const hasPreferred = options.some((d) => normalizeLanguageTag(d.language) === preferredDisplay);
  if (hasPreferred) {
    select.value = options.find((d) => normalizeLanguageTag(d.language) === preferredDisplay).language;
  }
}

async function main() {
  const languageSelect = document.getElementById("languageSelect");
  const result = document.getElementById("result");
  const goBtn = document.getElementById("goBtn");

  try {
    const destinations = await loadDestinations();
    fillLanguageSelect(languageSelect, destinations, getBrowserLanguageFallback());

    const update = () => {
      const match = pickBestDestination(destinations, languageSelect.value);
      renderResult(result, match);
      setGoLink(goBtn, match);
    };

    languageSelect.addEventListener("change", update);
    update();
  } catch (e) {
    console.error(e);
    result.innerHTML = `<div><strong>Setup error.</strong> <span class="muted">${escapeHtml(e.message || String(e))}</span></div>`;
    setGoLink(goBtn, null);
  }
}

main();

