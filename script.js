const form = document.querySelector("#farmForm");
const itemsContainer = document.querySelector("#itemsContainer");
const addItemBtn = document.querySelector("#addItemBtn");
const summaryBox = document.querySelector("#summaryBox");
const progressBar = document.querySelector("#progressBar");
const progressText = document.querySelector("#progressText");
const saveStatus = document.querySelector("#saveStatus");
const lastUpdated = document.querySelector("#lastUpdated");
const toast = document.querySelector("#toast");
const themeToggle = document.querySelector("#themeToggle");
const storageKey = "farm-deal-details-v1";
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

// Farmer data from backend
let farmerData = window.farmerData || {
  name: "",
  phone: "",
  email: ""
};

// Display farmer information
function displayFarmerInfo() {
  const farmerInfoDisplay = document.getElementById("farmerInfoDisplay");
  const displayFarmerName = document.getElementById("displayFarmerName");
  const displayPhone = document.getElementById("displayPhone");
  const displayEmail = document.getElementById("displayEmail");

  if (farmerData.name || farmerData.phone || farmerData.email) {
    farmerInfoDisplay.style.display = "block";
    displayFarmerName.textContent = farmerData.name || "Not provided";
    displayPhone.textContent = farmerData.phone || "Not provided";
    displayEmail.textContent = farmerData.email || "Not provided";
  }
}

const escapeHTML = (value = "") =>
  String(value).replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;",
      })[char],
  );
const valueOf = (name, root = form) =>
  root.querySelector(`[name="${name}"]`)?.value.trim() || "";

function appendVoiceText(targetId, transcript) {
  const field = document.getElementById(targetId);
  if (!field) return;
  const sentence = transcript.trim();
  if (!sentence) return;

  // Check if the transcript is very similar to the last added text to avoid duplicates
  const currentValue = field.value.trim();
  if (currentValue.length > 10) {
    const lastWords = currentValue.split(' ').slice(-3).join(' ').toLowerCase();
    const newWords = sentence.split(' ').slice(0, 3).join(' ').toLowerCase();
    if (lastWords === newWords) {
      return; // Skip if it looks like a duplicate
    }
  }

  const nextValue = currentValue
    ? `${currentValue} ${sentence}`
    : sentence;
  field.value = nextValue;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function setMicState(button, text, isListening = false) {
  // Find the mic icon img and span text
  const micIcon = button.querySelector('.mic-icon');
  const textSpan = button.lastChild;

  if (textSpan) {
    textSpan.textContent = ` ${text}`;
  }
  button.classList.toggle("listening", isListening);
  button.title = text;
}

const recognitionState = { active: null };

async function startVoiceInput(targetId) {
  const field = document.getElementById(targetId);
  const micButton = document.querySelector(
    `.mic-btn[data-target="${targetId}"]`,
  );
  const languageSelect = document.querySelector(
    `.voice-language[data-target="${targetId}"]`,
  );

  if (!field || !micButton || !languageSelect) return;

  if (
    recognitionState.active &&
    recognitionState.active.targetId === targetId
  ) {
    recognitionState.active.recognition.stop();
    recognitionState.active = null;
    setMicState(micButton, "Speak", false);
    return;
  }

  if (!SpeechRecognition) {
    setMicState(micButton, "Use Chrome/Edge", false);
    return;
  }

  if (
    window.location.protocol === "file:" &&
    !window.location.hostname.includes("localhost")
  ) {
    setMicState(micButton, "Use localhost", false);
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setMicState(micButton, "Mic blocked", false);
    return;
  }

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    setMicState(micButton, "Permission denied", false);
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = languageSelect.value;
  recognition.interimResults = true; // Changed to true for better responsiveness
  recognition.continuous = false; // Changed to false to prevent overlapping
  recognition.maxAlternatives = 1;

  recognitionState.active = { targetId, recognition };
  setMicState(micButton, "🎙 Listening…", true);

  let lastTranscript = "";

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript;

    // Only append if it's a final result and different from the last one
    if (result.isFinal && transcript !== lastTranscript) {
      lastTranscript = transcript;
      appendVoiceText(targetId, transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);

    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      setMicState(micButton, "Permission denied", false);
    } else if (event.error === "no-speech") {
      // Don't restart on no-speech, just stop
      setMicState(micButton, "Speak", false);
    } else if (event.error === "network") {
      setMicState(micButton, "Network error", false);
    } else {
      setMicState(micButton, "Try again", false);
    }

    if (
      recognitionState.active &&
      recognitionState.active.targetId === targetId
    ) {
      recognitionState.active = null;
    }
  };

  recognition.onend = () => {
    if (
      recognitionState.active &&
      recognitionState.active.targetId === targetId
    ) {
      recognitionState.active = null;
    }
    setMicState(micButton, "Speak", false);
    lastTranscript = ""; // Reset the last transcript
  };

  try {
    recognition.start();
  } catch (error) {
    recognitionState.active = null;
    setMicState(micButton, "Mic busy", false);
  }
}

function itemTemplate(item = {}) {
  return `<div class="produce-row">
    <div class="row-number"></div>
    <label><span>Vegetable / Crop</span><input type="text" name="cropName" placeholder="e.g. Tomato" value="${escapeHTML(item.cropName)}" /></label>
    <label><span>Available Quantity</span><input type="text" name="quantity" placeholder="e.g. 200 kg" value="${escapeHTML(item.quantity)}" /></label>
    <label><span>Quality</span><select name="quality"><option value="">Select</option>${["Excellent", "Good", "Average", "Fresh Harvest"].map((option) => `<option ${item.quality === option ? "selected" : ""}>${option}</option>`).join("")}</select></label>
    <label><span>Price / Unit</span><input type="text" name="price" placeholder="e.g. 40 / kg" value="${escapeHTML(item.price)}" /></label>
    <label><span>Availability</span><input type="text" name="availability" placeholder="e.g. Daily / Seasonal" value="${escapeHTML(item.availability)}" /></label>
    <button type="button" class="remove-btn" aria-label="Remove item">×</button>
  </div>`;
}

function renumberRows() {
  itemsContainer.querySelectorAll(".produce-row").forEach((row, index) => {
    row.querySelector(".row-number").textContent = String(index + 1).padStart(
      2,
      "0",
    );
  });
}

function getItems() {
  return [...itemsContainer.querySelectorAll(".produce-row")].map((row) =>
    Object.fromEntries(
      [...row.querySelectorAll("input, select")].map((field) => [
        field.name,
        field.value.trim(),
      ]),
    ),
  );
}

function getData() {
  return {
    farmName: valueOf("farmName"),
    location: valueOf("location"),
    landSize: valueOf("landSize"),
    farmType: valueOf("farmType"),
    farmConditions: valueOf("farmConditions"),
    notes: valueOf("notes"),
    items: getItems(),
  };
}

function updateProgress() {
  const fields = [...form.querySelectorAll("input, select, textarea")];
  const completed = fields.filter((field) => field.value.trim()).length;
  const percent = Math.round((completed / fields.length) * 100);
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;
}

function renderSummary(data = getData()) {
  const cropItems = data.items.filter(
    (item) =>
      item.cropName ||
      item.quantity ||
      item.quality ||
      item.price ||
      item.availability,
  );
  const heading = data.farmName || "Unnamed farm";
  const location =
    [data.location, data.farmType].filter(Boolean).join(" · ") ||
    "Add a location or farm type";
  const farmDetails = [
    data.landSize ? `<span><b>Land</b>${escapeHTML(data.landSize)}</span>` : "",
  ]
    .filter(Boolean)
    .join("");
  const crops = cropItems.length
    ? cropItems
        .map(
          (item) =>
            `<div class="crop-line"><strong class="crop-name">${escapeHTML(item.cropName || "Unnamed crop")}</strong><div class="crop-details"><span><b>Quantity</b>${escapeHTML(item.quantity || "—")}</span><span><b>Quality</b>${escapeHTML(item.quality || "—")}</span><span><b>Price</b>${escapeHTML(item.price || "—")}</span><span><b>Available</b>${escapeHTML(item.availability || "—")}</span></div></div>`,
        )
        .join("")
    : '<p class="summary-location">Add your first crop to see it listed here.</p>';
  summaryBox.innerHTML = `<div class="summary-content"><h3 class="summary-name">${escapeHTML(heading)}</h3><p class="summary-location">⌖ ${escapeHTML(location)}</p>${farmDetails ? `<div class="summary-meta">${farmDetails}</div>` : ""}<h4>Available produce · ${cropItems.length}</h4>${crops}${data.notes ? `<h4>Notes</h4><p class="summary-location">${escapeHTML(data.notes)}</p>` : ""}</div>`;
}

function saveDraft(showStatus = false) {
  const data = getData();
  localStorage.setItem(storageKey, JSON.stringify(data));
  updateProgress();
  renderSummary(data);
  saveStatus.innerHTML =
    '<span class="save-icon">✓</span><span>Draft saved just now</span>';
  if (showStatus) {
    toast.classList.add("show");
    window.clearTimeout(window.toastTimer);
    window.toastTimer = window.setTimeout(
      () => toast.classList.remove("show"),
      3000,
    );
  }
}

function loadDraft() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  if (!saved) return;
  [
    "farmName",
    "location",
    "landSize",
    "farmType",
    "farmConditions",
    "notes",
  ].forEach((name) => {
    const field = form.elements[name];
    if (field && saved[name]) field.value = saved[name];
  });
  if (saved.items?.length) {
    itemsContainer.innerHTML = saved.items.map(itemTemplate).join("");
  }
  renumberRows();
  renderSummary(saved);
  updateProgress();
  saveStatus.innerHTML =
    '<span class="save-icon">✓</span><span>Draft restored</span>';
  lastUpdated.textContent = "Restored from draft";
}

document.querySelectorAll(".mic-btn").forEach((button) => {
  button.addEventListener("click", () =>
    startVoiceInput(button.dataset.target),
  );
});

addItemBtn.addEventListener("click", () => {
  itemsContainer.insertAdjacentHTML("beforeend", itemTemplate());
  renumberRows();
  itemsContainer.lastElementChild.querySelector("input").focus();
  saveDraft();
});

itemsContainer.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-btn");
  if (!removeButton) return;
  const rows = itemsContainer.querySelectorAll(".produce-row");
  if (rows.length === 1) {
    rows[0].querySelectorAll("input, select").forEach((field) => {
      field.value = "";
    });
  } else {
    removeButton.closest(".produce-row").remove();
  }
  renumberRows();
  saveDraft();
});

form.addEventListener("input", () => {
  updateProgress();
  renderSummary();
  saveDraft();
});
form.addEventListener("change", () => {
  updateProgress();
  renderSummary();
  saveDraft();
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveDraft(true);
  lastUpdated.textContent = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  document
    .querySelector(".preview-card")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });

  // Save to backend
  saveToBackend();
});

async function saveToBackend() {
  try {
    const data = getData();
    const response = await fetch("/api/farm-details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (result.success) {
      console.log("Farm details saved to backend successfully");
    } else {
      console.error("Error saving to backend:", result.message);
    }
  } catch (error) {
    console.error("Error saving to backend:", error);
  }
}
form.addEventListener("reset", () => {
  window.setTimeout(() => {
    itemsContainer.innerHTML = itemTemplate();
    renumberRows();
    localStorage.removeItem(storageKey);
    saveStatus.innerHTML =
      '<span class="save-icon">✓</span><span>Drafts save automatically</span>';
    lastUpdated.textContent = "Not saved yet";
    updateProgress();
    renderSummary();
  }, 0);
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  themeToggle.innerHTML = `<span>${dark ? "☾" : "☼"}</span>`;
  themeToggle.setAttribute(
    "aria-label",
    dark ? "Switch to light mode" : "Switch to dark mode",
  );
  localStorage.setItem("farm-theme", dark ? "dark" : "light");
});

if (localStorage.getItem("farm-theme") === "dark") {
  document.body.classList.add("dark");
  themeToggle.innerHTML = "<span>☾</span>";
  themeToggle.setAttribute("aria-label", "Switch to light mode");
}
document.querySelector("#year").textContent = new Date().getFullYear();
renumberRows();
localStorage.removeItem(storageKey);
updateProgress();
displayFarmerInfo();
