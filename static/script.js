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


// ============================================================
// BACKEND DATA
// ============================================================

let farmerData = window.farmerData || {
  name: "",
  phone: "",
  email: ""
};

/*
 * initialFarmDetails comes directly from Flask/SQLite.
 *
 * Example:
 *
 * {
 *   farmName: "Himan Farm",
 *   location: "Near C Block",
 *   landSize: "7 acres",
 *   farmType: "Vegetable Farm",
 *   farmConditions: "Good soil",
 *   notes: "",
 *   items: [
 *     {
 *       cropName: "LadyFinger",
 *       quantity: "40kg",
 *       quality: "Good",
 *       price: "30/kg",
 *       availability: "Daily"
 *     }
 *   ],
 *   updated_at: "2026-09-25 06:45:47"
 * }
 */

const initialFarmDetails =
  window.initialFarmDetails || null;


// ============================================================
// DISPLAY FARMER INFORMATION
// ============================================================

function displayFarmerInfo() {

  const farmerInfoDisplay =
    document.getElementById("farmerInfoDisplay");

  const displayFarmerName =
    document.getElementById("displayFarmerName");

  const displayPhone =
    document.getElementById("displayPhone");

  const displayEmail =
    document.getElementById("displayEmail");


  if (!farmerInfoDisplay) {
    return;
  }


  if (
    farmerData.name ||
    farmerData.phone ||
    farmerData.email
  ) {

    farmerInfoDisplay.style.display = "block";


    if (displayFarmerName) {
      displayFarmerName.textContent =
        farmerData.name || "Not provided";
    }


    if (displayPhone) {
      displayPhone.textContent =
        farmerData.phone || "Not provided";
    }


    if (displayEmail) {
      displayEmail.textContent =
        farmerData.email || "Not provided";
    }
  }
}


// ============================================================
// SECURITY
// ============================================================

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


// ============================================================
// GET FORM VALUE
// ============================================================

const valueOf = (name, root = form) => {

  if (!root) {
    return "";
  }

  return (
    root
      .querySelector(`[name="${name}"]`)
      ?.value
      .trim() || ""
  );
};


// ============================================================
// VOICE INPUT
// ============================================================

function appendVoiceText(targetId, transcript) {

  const field =
    document.getElementById(targetId);


  if (!field) {
    return;
  }


  const sentence =
    transcript.trim();


  if (!sentence) {
    return;
  }


  const currentValue =
    field.value.trim();


  if (currentValue.length > 10) {

    const lastWords =
      currentValue
        .split(" ")
        .slice(-3)
        .join(" ")
        .toLowerCase();


    const newWords =
      sentence
        .split(" ")
        .slice(0, 3)
        .join(" ")
        .toLowerCase();


    if (lastWords === newWords) {
      return;
    }
  }


  const nextValue =
    currentValue
      ? `${currentValue} ${sentence}`
      : sentence;


  field.value = nextValue;


  field.dispatchEvent(
    new Event("input", {
      bubbles: true
    })
  );
}


// ============================================================
// MICROPHONE BUTTON STATE
// ============================================================

function setMicState(
  button,
  text,
  isListening = false
) {

  if (!button) {
    return;
  }


  const textSpan =
    button.lastChild;


  if (textSpan) {
    textSpan.textContent =
      ` ${text}`;
  }


  button.classList.toggle(
    "listening",
    isListening
  );


  button.title = text;
}


// ============================================================
// SPEECH RECOGNITION
// ============================================================

const recognitionState = {
  active: null
};


async function startVoiceInput(targetId) {

  const field =
    document.getElementById(targetId);


  const micButton =
    document.querySelector(
      `.mic-btn[data-target="${targetId}"]`
    );


  const languageSelect =
    document.querySelector(
      `.voice-language[data-target="${targetId}"]`
    );


  if (
    !field ||
    !micButton ||
    !languageSelect
  ) {
    return;
  }


  if (
    recognitionState.active &&
    recognitionState.active.targetId === targetId
  ) {

    recognitionState.active.recognition.stop();

    recognitionState.active = null;

    setMicState(
      micButton,
      "Speak",
      false
    );

    return;
  }


  if (!SpeechRecognition) {

    setMicState(
      micButton,
      "Use Chrome/Edge",
      false
    );

    return;
  }


  if (
    window.location.protocol === "file:" &&
    !window.location.hostname.includes("localhost")
  ) {

    setMicState(
      micButton,
      "Use localhost",
      false
    );

    return;
  }


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    setMicState(
      micButton,
      "Mic blocked",
      false
    );

    return;
  }


  try {

    await navigator.mediaDevices.getUserMedia({
      audio: true
    });

  } catch (error) {

    setMicState(
      micButton,
      "Permission denied",
      false
    );

    return;
  }


  const recognition =
    new SpeechRecognition();


  recognition.lang =
    languageSelect.value;


  recognition.interimResults =
    true;


  recognition.continuous =
    false;


  recognition.maxAlternatives =
    1;


  recognitionState.active = {
    targetId,
    recognition
  };


  setMicState(
    micButton,
    "🎙 Listening…",
    true
  );


  let lastTranscript = "";


  recognition.onresult =
    (event) => {

      const result =
        event.results[
          event.results.length - 1
        ];


      const transcript =
        result[0].transcript;


      if (
        result.isFinal &&
        transcript !== lastTranscript
      ) {

        lastTranscript =
          transcript;


        appendVoiceText(
          targetId,
          transcript
        );
      }
    };


  recognition.onerror =
    (event) => {

      console.error(
        "Speech recognition error:",
        event.error
      );


      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {

        setMicState(
          micButton,
          "Permission denied",
          false
        );

      } else if (
        event.error === "no-speech"
      ) {

        setMicState(
          micButton,
          "Speak",
          false
        );

      } else if (
        event.error === "network"
      ) {

        setMicState(
          micButton,
          "Network error",
          false
        );

      } else {

        setMicState(
          micButton,
          "Try again",
          false
        );
      }


      if (
        recognitionState.active &&
        recognitionState.active.targetId === targetId
      ) {

        recognitionState.active = null;
      }
    };


  recognition.onend =
    () => {

      if (
        recognitionState.active &&
        recognitionState.active.targetId === targetId
      ) {

        recognitionState.active = null;
      }


      setMicState(
        micButton,
        "Speak",
        false
      );


      lastTranscript = "";
    };


  try {

    recognition.start();

  } catch (error) {

    recognitionState.active = null;

    setMicState(
      micButton,
      "Mic busy",
      false
    );
  }
}


// ============================================================
// PRODUCE ITEM TEMPLATE
// ============================================================

function itemTemplate(item = {}) {

  return `
    <div class="produce-row">

      <div class="row-number"></div>

      <label>
        <span>Vegetable / Crop</span>

        <input
          type="text"
          name="cropName"
          placeholder="e.g. Tomato"
          value="${escapeHTML(item.cropName || "")}"
        />
      </label>


      <label>
        <span>Available Quantity</span>

        <input
          type="text"
          name="quantity"
          placeholder="e.g. 200 kg"
          value="${escapeHTML(item.quantity || "")}"
        />
      </label>


      <label>
        <span>Quality</span>

        <select name="quality">

          <option value="">
            Select
          </option>

          <option
            value="Excellent"
            ${item.quality === "Excellent" ? "selected" : ""}
          >
            Excellent
          </option>

          <option
            value="Good"
            ${item.quality === "Good" ? "selected" : ""}
          >
            Good
          </option>

          <option
            value="Average"
            ${item.quality === "Average" ? "selected" : ""}
          >
            Average
          </option>

          <option
            value="Fresh Harvest"
            ${item.quality === "Fresh Harvest" ? "selected" : ""}
          >
            Fresh Harvest
          </option>

        </select>
      </label>


      <label>
        <span>Price / Unit</span>

        <input
          type="text"
          name="price"
          placeholder="e.g. 40 / kg"
          value="${escapeHTML(item.price || "")}"
        />
      </label>


      <label>
        <span>Availability</span>

        <input
          type="text"
          name="availability"
          placeholder="e.g. Daily / Seasonal"
          value="${escapeHTML(item.availability || "")}"
        />
      </label>


      <button
        type="button"
        class="remove-btn"
        aria-label="Remove item"
      >
        ×
      </button>

    </div>
  `;
}


// ============================================================
// NUMBER PRODUCE ROWS
// ============================================================

function renumberRows() {

  if (!itemsContainer) {
    return;
  }


  itemsContainer
    .querySelectorAll(".produce-row")
    .forEach(
      (row, index) => {

        const rowNumber =
          row.querySelector(".row-number");


        if (rowNumber) {

          rowNumber.textContent =
            String(index + 1)
              .padStart(2, "0");
        }
      }
    );
}


// ============================================================
// GET PRODUCE ITEMS
// ============================================================

function getItems() {

  if (!itemsContainer) {
    return [];
  }


  return [
    ...itemsContainer.querySelectorAll(".produce-row")
  ].map(
    (row) =>
      Object.fromEntries(
        [
          ...row.querySelectorAll(
            "input, select"
          )
        ].map(
          (field) => [
            field.name,
            field.value.trim()
          ]
        )
      )
  );
}


// ============================================================
// GET COMPLETE FORM DATA
// ============================================================

function getData() {

  return {

    farmName:
      valueOf("farmName"),

    location:
      valueOf("location"),

    landSize:
      valueOf("landSize"),

    farmType:
      valueOf("farmType"),

    farmConditions:
      valueOf("farmConditions"),

    notes:
      valueOf("notes"),

    items:
      getItems()
  };
}


// ============================================================
// UPDATE PROFILE COMPLETION
// ============================================================

function updateProgress() {

  if (
    !form ||
    !progressBar ||
    !progressText
  ) {
    return;
  }


  const fields =
    [
      ...form.querySelectorAll(
        "input, select, textarea"
      )
    ];


  if (!fields.length) {
    return;
  }


  const completed =
    fields.filter(
      (field) =>
        field.value.trim()
    ).length;


  const percent =
    Math.round(
      (completed / fields.length) *
      100
    );


  progressBar.style.width =
    `${percent}%`;


  progressText.textContent =
    `${percent}%`;
}


// ============================================================
// RENDER FARM SUMMARY
// ============================================================

function renderSummary(
  data = getData()
) {

  if (!summaryBox) {
    return;
  }


  const cropItems =
    (data.items || []).filter(
      (item) =>
        item.cropName ||
        item.quantity ||
        item.quality ||
        item.price ||
        item.availability
    );


  const heading =
    data.farmName ||
    "Unnamed farm";


  const location =
    [
      data.location,
      data.farmType
    ]
      .filter(Boolean)
      .join(" · ") ||
    "Add a location or farm type";


  const farmDetails =
    data.landSize
      ? `
          <span>
            <b>Land</b>
            ${escapeHTML(data.landSize)}
          </span>
        `
      : "";


  const crops =
    cropItems.length

      ? cropItems
          .map(
            (item) =>
              `
                <div class="crop-line">

                  <strong class="crop-name">
                    ${escapeHTML(
                      item.cropName ||
                      "Unnamed crop"
                    )}
                  </strong>

                  <div class="crop-details">

                    <span>
                      <b>Quantity</b>
                      ${escapeHTML(
                        item.quantity || "—"
                      )}
                    </span>

                    <span>
                      <b>Quality</b>
                      ${escapeHTML(
                        item.quality || "—"
                      )}
                    </span>

                    <span>
                      <b>Price</b>
                      ${escapeHTML(
                        item.price || "—"
                      )}
                    </span>

                    <span>
                      <b>Available</b>
                      ${escapeHTML(
                        item.availability || "—"
                      )}
                    </span>

                  </div>

                </div>
              `
          )
          .join("")

      : `
          <p class="summary-location">
            Add your first crop to see it listed here.
          </p>
        `;


  summaryBox.innerHTML = `

    <div class="summary-content">

      <h3 class="summary-name">
        ${escapeHTML(heading)}
      </h3>

      <p class="summary-location">
        ⌖ ${escapeHTML(location)}
      </p>

      ${
        farmDetails
          ? `
              <div class="summary-meta">
                ${farmDetails}
              </div>
            `
          : ""
      }

      <h4>
        Available produce · ${cropItems.length}
      </h4>

      ${crops}

      ${
        data.notes
          ? `
              <h4>Notes</h4>

              <p class="summary-location">
                ${escapeHTML(data.notes)}
              </p>
            `
          : ""
      }

    </div>
  `;
}


// ============================================================
// SAVE LOCAL DRAFT
// ============================================================

function saveDraft(showStatus = false) {

  const data =
    getData();


  /*
   * LocalStorage is only a temporary browser draft.
   *
   * SQLite remains the real source of saved farm details.
   */

  localStorage.setItem(
    storageKey,
    JSON.stringify(data)
  );


  updateProgress();

  renderSummary(data);


  if (
    showStatus &&
    saveStatus
  ) {

    saveStatus.innerHTML =
      `
        <span class="save-icon">✓</span>
        <span>Draft saved just now</span>
      `;
  }


  if (showStatus && toast) {

    toast.classList.add("show");


    window.clearTimeout(
      window.toastTimer
    );


    window.toastTimer =
      window.setTimeout(
        () =>
          toast.classList.remove(
            "show"
          ),
        3000
      );
  }
}


// ============================================================
// LOAD DATABASE FARM DETAILS
// ============================================================

function loadDatabaseFarmDetails(saved) {

  if (!form || !saved) {
    return;
  }


  /*
   * These values come directly from SQLite through Flask.
   *
   * Always populate the actual form fields.
   */

  const farmFields = [
    "farmName",
    "location",
    "landSize",
    "farmType",
    "farmConditions",
    "notes"
  ];


  farmFields.forEach(
    (name) => {

      const field =
        form.elements[name];


      if (!field) {
        return;
      }


      const value =
        saved[name];


      if (
        value !== undefined &&
        value !== null
      ) {

        field.value =
          String(value);
      }
    }
  );


  /*
   * Load saved produce items.
   */

  let savedItems =
    Array.isArray(saved.items)
      ? saved.items
      : [];


  /*
   * Compatibility with older records that may
   * have used `crops`.
   */

  if (
    !savedItems.length &&
    Array.isArray(saved.crops)
  ) {

    savedItems =
      saved.crops;
  }


  if (
    itemsContainer &&
    savedItems.length > 0
  ) {

    itemsContainer.innerHTML =
      savedItems
        .map(itemTemplate)
        .join("");

  } else if (itemsContainer) {

    itemsContainer.innerHTML =
      itemTemplate();
  }


  renumberRows();


  /*
   * Render the summary using the values that
   * are now actually inside the form.
   */

  renderSummary(
    getData()
  );


  updateProgress();


  /*
   * Show the user that the information came
   * from the server/database.
   */

  if (saveStatus) {

    saveStatus.innerHTML =
      `
        <span class="save-icon">✓</span>
        <span>Saved details loaded</span>
      `;
  }


  if (lastUpdated) {

    lastUpdated.textContent =
      saved.updated_at ||
      "Saved on server";
  }
}


// ============================================================
// LOAD SAVED FARM DETAILS
// ============================================================

function loadDraft() {

  /*
   * IMPORTANT:
   *
   * If Flask supplied farm details from SQLite,
   * those details ALWAYS win.
   *
   * Old localStorage data must never overwrite
   * the database values.
   */

  if (initialFarmDetails) {

    /*
     * Clear any stale browser draft before loading
     * the server data.
     */

    localStorage.removeItem(
      storageKey
    );


    loadDatabaseFarmDetails(
      initialFarmDetails
    );


    return;
  }


  // ----------------------------------------------------------
  // NO DATABASE DATA
  // ----------------------------------------------------------

  let saved = null;


  const localDraftRaw =
    localStorage.getItem(
      storageKey
    );


  if (localDraftRaw) {

    try {

      saved =
        JSON.parse(
          localDraftRaw
        );

    } catch (error) {

      console.warn(
        "Invalid local draft found. Clearing it."
      );


      localStorage.removeItem(
        storageKey
      );
    }
  }


  // ----------------------------------------------------------
  // NO SAVED DATA AT ALL
  // ----------------------------------------------------------

  if (!saved) {

    if (itemsContainer) {

      if (
        !itemsContainer.querySelector(
          ".produce-row"
        )
      ) {

        itemsContainer.innerHTML =
          itemTemplate();
      }
    }


    renumberRows();

    updateProgress();

    renderSummary();

    return;
  }


  // ----------------------------------------------------------
  // LOAD LOCAL DRAFT
  // ----------------------------------------------------------

  if (form) {

    const farmFields = [
      "farmName",
      "location",
      "landSize",
      "farmType",
      "farmConditions",
      "notes"
    ];


    farmFields.forEach(
      (name) => {

        const field =
          form.elements[name];


        if (
          field &&
          saved[name] !== undefined &&
          saved[name] !== null
        ) {

          field.value =
            saved[name];
        }
      }
    );
  }


  let savedItems =
    Array.isArray(saved.items)
      ? saved.items
      : [];


  if (
    !savedItems.length &&
    Array.isArray(saved.crops)
  ) {

    savedItems =
      saved.crops;
  }


  if (
    itemsContainer &&
    savedItems.length > 0
  ) {

    itemsContainer.innerHTML =
      savedItems
        .map(itemTemplate)
        .join("");

  } else if (itemsContainer) {

    itemsContainer.innerHTML =
      itemTemplate();
  }


  renumberRows();

  renderSummary(
    getData()
  );

  updateProgress();


  if (saveStatus) {

    saveStatus.innerHTML =
      `
        <span class="save-icon">✓</span>
        <span>Draft restored</span>
      `;
  }


  if (lastUpdated) {

    lastUpdated.textContent =
      "Restored from draft";
  }
}


// ============================================================
// SCROLL TO PRODUCE SECTION
// ============================================================

function scrollToProduceSection() {

  /*
   * Dashboard Add Harvest button points to:
   *
   * /farmer-details#produce-section
   */

  if (
    window.location.hash !==
    "#produce-section"
  ) {
    return;
  }


  const produceSection =
    document.getElementById(
      "produce-section"
    );


  if (!produceSection) {
    return;
  }


  /*
   * Wait until the database values have been
   * loaded into the form before scrolling.
   */

  setTimeout(
    () => {

      const headerOffset = 90;


      const sectionPosition =
        produceSection.getBoundingClientRect().top +
        window.scrollY -
        headerOffset;


      window.scrollTo({
        top: sectionPosition,
        behavior: "smooth"
      });


      /*
       * Focus the first crop field so Add Harvest
       * immediately feels like an add-crop action.
       */

      setTimeout(
        () => {

          const firstCropInput =
            produceSection.querySelector(
              'input[name="cropName"]'
            );


          if (firstCropInput) {
            firstCropInput.focus();
          }

        },
        600
      );

    },
    350
  );
}


// ============================================================
// MICROPHONE BUTTONS
// ============================================================

document
  .querySelectorAll(".mic-btn")
  .forEach(
    (button) => {

      button.addEventListener(
        "click",
        () =>
          startVoiceInput(
            button.dataset.target
          )
      );
    }
  );


// ============================================================
// ADD PRODUCE ITEM
// ============================================================

if (addItemBtn) {

  addItemBtn.addEventListener(
    "click",
    () => {

      if (!itemsContainer) {
        return;
      }


      itemsContainer.insertAdjacentHTML(
        "beforeend",
        itemTemplate()
      );


      renumberRows();


      const lastRow =
        itemsContainer.lastElementChild;


      const firstInput =
        lastRow?.querySelector(
          'input[name="cropName"]'
        );


      if (firstInput) {
        firstInput.focus();
      }


      saveDraft();
    }
  );
}


// ============================================================
// REMOVE PRODUCE ITEM
// ============================================================

if (itemsContainer) {

  itemsContainer.addEventListener(
    "click",
    (event) => {

      const removeButton =
        event.target.closest(
          ".remove-btn"
        );


      if (!removeButton) {
        return;
      }


      const rows =
        itemsContainer.querySelectorAll(
          ".produce-row"
        );


      if (rows.length === 1) {

        rows[0]
          .querySelectorAll(
            "input, select"
          )
          .forEach(
            (field) => {
              field.value = "";
            }
          );

      } else {

        removeButton
          .closest(".produce-row")
          .remove();
      }


      renumberRows();

      saveDraft();
    }
  );
}


// ============================================================
// FORM INPUT
// ============================================================

if (form) {

  form.addEventListener(
    "input",
    () => {

      updateProgress();

      renderSummary();

      saveDraft();
    }
  );


  form.addEventListener(
    "change",
    () => {

      updateProgress();

      renderSummary();

      saveDraft();
    }
  );
}


// ============================================================
// FORM SUBMIT
// ============================================================

if (form) {

  form.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();


      saveDraft(true);


      if (lastUpdated) {

        lastUpdated.textContent =
          new Intl.DateTimeFormat(
            undefined,
            {
              dateStyle: "medium",
              timeStyle: "short"
            }
          ).format(
            new Date()
          );
      }


      const previewCard =
        document.querySelector(
          ".preview-card"
        );


      if (previewCard) {

        previewCard.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }


      saveToBackend();
    }
  );
}


// ============================================================
// SAVE TO FLASK BACKEND
// ============================================================

async function saveToBackend() {

  try {

    const data =
      getData();


    const response =
      await fetch(
        "/api/farm-details",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(data)
        }
      );


    if (!response.ok) {

      throw new Error(
        `Server returned ${response.status}`
      );
    }


    const result =
      await response.json();


    if (result.success) {

      console.log(
        "Farm details saved to backend successfully."
      );


      /*
       * Database is now the source of truth.
       */

      localStorage.removeItem(
        storageKey
      );


      if (saveStatus) {

        saveStatus.innerHTML =
          `
            <span class="save-icon">✓</span>
            <span>Saved successfully</span>
          `;
      }

    } else {

      console.error(
        "Error saving to backend:",
        result.message
      );
    }

  } catch (error) {

    console.error(
      "Error saving to backend:",
      error
    );


    if (saveStatus) {

      saveStatus.innerHTML =
        `
          <span class="save-icon">!</span>
          <span>Could not save to server</span>
        `;
    }
  }
}


// ============================================================
// FORM RESET
// ============================================================

if (form) {

  form.addEventListener(
    "reset",
    () => {

      window.setTimeout(
        () => {

          /*
           * Reset only resets the browser form.
           * It does NOT delete SQLite data.
           */

          if (itemsContainer) {

            itemsContainer.innerHTML =
              itemTemplate();
          }


          renumberRows();


          localStorage.removeItem(
            storageKey
          );


          if (saveStatus) {

            saveStatus.innerHTML =
              `
                <span class="save-icon">✓</span>
                <span>Drafts save automatically</span>
              `;
          }


          if (lastUpdated) {

            lastUpdated.textContent =
              "Not saved yet";
          }


          updateProgress();

          renderSummary();

        },
        0
      );
    }
  );
}


// ============================================================
// DARK MODE
// ============================================================

if (themeToggle) {

  themeToggle.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "dark"
      );


      const dark =
        document.body.classList.contains(
          "dark"
        );


      themeToggle.innerHTML =
        `<span>${dark ? "☾" : "☼"}</span>`;


      themeToggle.setAttribute(
        "aria-label",
        dark
          ? "Switch to light mode"
          : "Switch to dark mode"
      );


      localStorage.setItem(
        "farm-theme",
        dark
          ? "dark"
          : "light"
      );
    }
  );


  if (
    localStorage.getItem(
      "farm-theme"
    ) === "dark"
  ) {

    document.body.classList.add(
      "dark"
    );


    themeToggle.innerHTML =
      "<span>☾</span>";


    themeToggle.setAttribute(
      "aria-label",
      "Switch to light mode"
    );
  }
}


// ============================================================
// FOOTER YEAR
// ============================================================

const yearElement =
  document.querySelector("#year");


if (yearElement) {

  yearElement.textContent =
    new Date().getFullYear();
}


// ============================================================
// INITIALIZE PAGE
// ============================================================

/*
 * IMPORTANT INITIALIZATION ORDER
 *
 * 1. Number existing rows.
 * 2. Load database data / local draft.
 * 3. Display logged-in farmer information.
 * 4. Scroll to produce section if Add Harvest was clicked.
 */

renumberRows();

loadDraft();

displayFarmerInfo();


// ============================================================
// HANDLE ADD HARVEST HASH
// ============================================================

scrollToProduceSection();