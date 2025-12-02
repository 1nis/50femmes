import './style.css';

// State
const state = {
  foundWomen: [], // Array of { name, category, wiki }
  currentCategory: 'all',
  total: 50,
  isLoading: false,
  startTime: null,
  timerInterval: null,
  isTimerRunning: false
};

// DOM Elements
const elements = {
  input: document.getElementById('guess-input'),
  submitBtn: document.getElementById('submit-btn'),
  message: document.getElementById('message'),
  score: document.getElementById('score'),
  grid: document.getElementById('results-grid'),
  progressCircle: document.querySelector('.progress-ring__circle'),
  categoriesContainer: document.querySelector('.categories-nav'),
  timer: document.getElementById('timer')
};

// Constants
const CIRCLE_RADIUS = 52;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// Initialization
function init() {
  elements.progressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
  elements.progressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;

  setupEventListeners();
  renderCategories();
  renderGrid();
  updateProgress();
}

// Event Listeners
function setupEventListeners() {
  elements.submitBtn.addEventListener('click', handleGuess);

  elements.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleGuess();
    }
  });
}

function setupCategoryListeners() {
  const chips = document.querySelectorAll('.category-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.currentCategory = chip.dataset.category;
      renderGrid();
    });
  });
}

// Timer Logic
function startTimer() {
  if (state.isTimerRunning) return;

  state.isTimerRunning = true;
  state.startTime = Date.now();

  state.timerInterval = setInterval(() => {
    const elapsed = Date.now() - state.startTime;
    updateTimerDisplay(elapsed);
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.isTimerRunning = false;
  }
}

function updateTimerDisplay(elapsedMs) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (elements.timer) {
    elements.timer.textContent = `${pad(minutes)}:${pad(seconds)}`;
  }
}

function pad(num) {
  return num.toString().padStart(2, '0');
}

// Levenshtein Distance for fuzzy matching
function levenshtein(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// API Logic
async function searchWikipedia(query) {
  const endpoint = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data.query.search[0]; // Return top result
}

async function getWikidataId(pageId) {
  const endpoint = `https://fr.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&pageids=${pageId}&format=json&origin=*`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data.query.pages[pageId].pageprops?.wikibase_item;
}

async function validateWoman(qId) {
  const endpoint = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qId}&property=P21&format=json&origin=*`;
  const response = await fetch(endpoint);
  const data = await response.json();

  const claims = data.claims.P21;
  if (!claims) return false;

  // Q6581072 = female, Q1052281 = transgender female
  return claims.some(claim => {
    const id = claim.mainsnak.datavalue.value.id;
    return id === 'Q6581072' || id === 'Q1052281';
  });
}

async function getOccupation(qId) {
  // 1. Get occupation ID (P106)
  const claimsEndpoint = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qId}&property=P106&format=json&origin=*`;
  const claimsResponse = await fetch(claimsEndpoint);
  const claimsData = await claimsResponse.json();

  const claims = claimsData.claims.P106;
  if (!claims) return 'Inconnu';

  // Get the first occupation ID
  const occupationId = claims[0].mainsnak.datavalue.value.id;

  // 2. Get details for this occupation (Label + Female form P2521)
  const detailsEndpoint = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${occupationId}&props=labels|claims&languages=fr&format=json&origin=*`;
  const detailsResponse = await fetch(detailsEndpoint);
  const detailsData = await detailsResponse.json();

  const entity = detailsData.entities[occupationId];

  // Try to find female form (P2521)
  let label = null;
  const femaleFormClaims = entity.claims?.P2521;

  if (femaleFormClaims) {
    // P2521 is a monolingual text, find the French one
    const frClaim = femaleFormClaims.find(c => c.mainsnak.datavalue.value.language === 'fr');
    if (frClaim) {
      label = frClaim.mainsnak.datavalue.value.text;
    }
  }

  // Fallback to standard label if no female form found
  if (!label) {
    label = entity.labels.fr?.value;
  }

  return label ? capitalize(label) : 'Inconnu';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function handleGuess() {
  if (state.isLoading) return;

  const guess = elements.input.value.trim();
  if (!guess) return;

  // Start timer on first attempt
  if (!state.isTimerRunning && state.foundWomen.length < state.total) {
    startTimer();
  }

  state.isLoading = true;
  elements.submitBtn.disabled = true;
  elements.input.disabled = true;
  showMessage("Recherche...", "info");

  try {
    // 1. Search Wikipedia
    const wikiResult = await searchWikipedia(guess);
    if (!wikiResult) {
      throw new Error("Introuvable sur Wikipédia");
    }

    // 2. Stricter Validation (Word-by-Word)
    const normalizedGuess = guess.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/);
    const normalizedTitle = wikiResult.title.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/);

    // Check if word counts match (or close enough? User said "Nom + Prénom exact")
    // If user types "Marie" and title is "Marie Curie", we should probably reject if we want "Nom + Prénom".
    // But user also said "Pseudo si elle en a 1".
    // Let's check if EVERY word in the guess matches a word in the title with max distance 1.
    // AND if the number of words is roughly the same?

    // Actually, user said: "tape soit le nom + prénom exact ou que le pseudo"
    // So if title is "Marie Curie", "Marie" is NOT enough.
    // If title is "Madonna", "Madonna" is enough.

    // Strategy:
    // 1. The number of words must match (or be very close, e.g. ignoring "de", "le"... but let's keep it simple first).
    // 2. Each word must match with distance <= 1.

    if (normalizedGuess.length !== normalizedTitle.length) {
      // Special case: maybe user typed "Marie Curie" and title is "Marie Skłodowska-Curie" (3 words vs 2).
      // Or title has parentheses "Madonna (chanteuse)".
      // Let's try to match words.

      // If guess has fewer words than title, it might be incomplete.
      // If guess has more, it might be wrong.

      // Let's be strict on count unless title has parentheses (which we usually strip or ignore).
      // Wikipedia titles often have disambiguation in parens.

      // Simple approach:
      // Check if we can map every word of guess to a word of title with dist <= 1.
      // AND check if we cover 'significant' parts of the title.

      // Given the user's strictness ("Marie Cur" -> No), let's enforce strict word matching.

      // Let's try to match the full string first with a higher tolerance? No, user said "1 lettre en moins ou en plus PAR MOT".

      // So:
      // 1. Clean title of parentheses " (actrice)".
      const cleanTitle = wikiResult.title.replace(/\s*\(.*?\)\s*/g, '').toLowerCase();
      const titleWords = cleanTitle.split(/\s+/);

      if (normalizedGuess.length !== titleWords.length) {
        throw new Error("Soyez plus précis !"); // No hint
      }

      // Compare word by word
      for (let i = 0; i < normalizedGuess.length; i++) {
        const dist = levenshtein(normalizedGuess[i], titleWords[i]);
        if (dist > 1) {
          throw new Error("Orthographe incorrecte.");
        }
      }
    } else {
      // Same word count, compare word by word
      for (let i = 0; i < normalizedGuess.length; i++) {
        const dist = levenshtein(normalizedGuess[i], normalizedTitle[i]);
        if (dist > 1) {
          throw new Error("Orthographe incorrecte.");
        }
      }
    }

    // CHECK DUPLICATES HERE using the REAL title found
    if (state.foundWomen.some(w => w.name.toLowerCase() === wikiResult.title.toLowerCase())) {
      throw new Error("Déjà trouvé !");
    }

    // 3. Get Wikidata ID
    const qId = await getWikidataId(wikiResult.pageid);
    if (!qId) {
      throw new Error("Pas de données Wikidata");
    }

    // 4. Validate Gender
    const isWoman = await validateWoman(qId);
    if (!isWoman) {
      throw new Error("Ce n'est pas une femme (selon Wikidata)");
    }

    // 5. Get Category (Real Occupation)
    const category = await getOccupation(qId);

    // Success
    const newWoman = {
      name: wikiResult.title,
      category: category,
      wiki: `https://fr.wikipedia.org/wiki/${encodeURIComponent(wikiResult.title)}`
    };

    state.foundWomen.push(newWoman);
    showMessage(`Trouvé ! ${newWoman.name}`, "success");
    elements.input.value = '';

    updateProgress();
    renderCategories(); // Update chips
    renderGrid();

    if (state.foundWomen.length === state.total) {
      celebrateWin();
    }

  } catch (error) {
    // Generic error message if it's our custom error, or pass through
    // User said "Ne propose pas de solutions... Juste si c'est juste ou non."
    // So we keep our custom errors "Soyez plus précis" / "Orthographe incorrecte" / "Déjà trouvé".
    // But for API errors or "Introuvable", we keep them.
    showMessage(error.message || "Erreur", "error");
    shakeInput();
  } finally {
    state.isLoading = false;
    elements.submitBtn.disabled = false;
    elements.input.disabled = false;
    elements.input.focus();
  }
}

function showMessage(text, type) {
  elements.message.textContent = text;
  elements.message.className = `message ${type}`;
  elements.message.style.opacity = '1';

  setTimeout(() => {
    elements.message.style.opacity = '0';
  }, 3000);
}

function shakeInput() {
  elements.input.style.transform = 'translateX(10px)';
  setTimeout(() => {
    elements.input.style.transform = 'translateX(-10px)';
    setTimeout(() => {
      elements.input.style.transform = 'translateX(0)';
    }, 100);
  }, 100);
}

function updateProgress() {
  const count = state.foundWomen.length;
  elements.score.textContent = count;

  const offset = CIRCLE_CIRCUMFERENCE - (count / state.total) * CIRCLE_CIRCUMFERENCE;
  elements.progressCircle.style.strokeDashoffset = offset;
}

function renderCategories() {
  // Get unique categories
  const categories = new Set(state.foundWomen.map(w => w.category));

  let html = `<button class="category-chip ${state.currentCategory === 'all' ? 'active' : ''}" data-category="all">Toutes</button>`;

  categories.forEach(cat => {
    html += `<button class="category-chip ${state.currentCategory === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>`;
  });

  elements.categoriesContainer.innerHTML = html;
  setupCategoryListeners();
}

function renderGrid() {
  elements.grid.innerHTML = '';

  const filtered = state.currentCategory === 'all'
    ? state.foundWomen
    : state.foundWomen.filter(w => w.category === state.currentCategory);

  filtered.slice().reverse().forEach(woman => {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = woman.wiki;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    card.innerHTML = `
      <span class="card-icon">✨</span>
      <span class="card-name">${woman.name}</span>
      <span class="card-category">${woman.category}</span>
    `;

    elements.grid.appendChild(card);
  });
}

function celebrateWin() {
  stopTimer();
  const time = elements.timer ? elements.timer.textContent : 'un temps record';
  showMessage(`FÉLICITATIONS ! 50 FEMMES EN ${time} !`, "success");
}

// Start
init();
