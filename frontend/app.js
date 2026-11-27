let currentStage = 1;
let autoPlayInterval = null;
let isAutoPlaying = true;
let currentBaseTz = "Europe/Berlin";

// =========================================================
// 0. PROTECTED ROUTE GUARD FOR room.html
// =========================================================
(function enforceRoomProtection() {
  const isRoomPage = window.location.pathname.endsWith("room.html");
  if (isRoomPage) {
    const isAuthorized = sessionStorage.getItem("voxbridge-room-authorized") === "true";
    if (!isAuthorized) {
      window.location.replace("dashboard.html");
    }
  }
})();

// Helper to authorize and redirect into the protected Live Room
window.enterProtectedRoom = function (customBooking = null) {
  if (customBooking) {
    localStorage.setItem("voxbridge-active-booking", JSON.stringify(customBooking));
  }
  sessionStorage.setItem("voxbridge-room-authorized", "true");
  window.location.href = "room.html";
};

window.leaveProtectedRoom = function () {
  sessionStorage.removeItem("voxbridge-room-authorized");
  window.location.href = "dashboard.html";
};

// =========================================================
// 1. THEME SWITCHER (60/30/10 Light <-> Dark)
// =========================================================
window.applyTheme = function (theme) {
  const root = document.documentElement;
  const icon = document.getElementById("themeToggleIcon");
  if (theme === "light") {
    root.classList.remove("dark");
    if (icon) icon.innerText = "dark_mode";
  } else {
    root.classList.add("dark");
    if (icon) icon.innerText = "light_mode";
  }
  document.querySelectorAll("[data-brand-logo]").forEach((img) => {
  img.src = theme === "light" ? "assets/logo-light.png" : "assets/logo-dark.png";
  });
  localStorage.setItem("voxbridge-theme", theme);
};

window.toggleTheme = function () {
  const isDark = document.documentElement.classList.contains("dark");
  window.applyTheme(isDark ? "light" : "dark");
};

// =========================================================
// 2. PARALLAX & SCROLL REVEAL ENGINE
// =========================================================
function initParallaxAndReveals() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const parallaxElements = document.querySelectorAll("[data-parallax-speed]");

  if (!prefersReducedMotion && parallaxElements.length > 0) {
    let ticking = false;
    const updateParallax = () => {
      const scrollY = window.scrollY;
      parallaxElements.forEach((el) => {
        const speed = parseFloat(el.getAttribute("data-parallax-speed")) || 0;
        const rect = el.getBoundingClientRect();
        const elementCenter = rect.top + scrollY + rect.height / 2;
        const viewportCenter = scrollY + window.innerHeight / 2;
        const offset = Math.max(-70, Math.min(70, (viewportCenter - elementCenter) * speed));
        el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      });
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(updateParallax);
          ticking = true;
        }
      },
      { passive: true }
    );
    updateParallax();
  }

  const revealElements = document.querySelectorAll(".reveal-on-scroll");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    revealElements.forEach((el) => observer.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add("is-visible"));
  }
}

// =========================================================
// 3. SINGLE DROPDOWN TOGGLE FOR SAME-LANGUAGE MODE
// =========================================================
window.selectModalType = function (type, prefix = "modal") {
  const exchangeBtn = document.getElementById(`${prefix}BtnExchange`);
  const peerBtn = document.getElementById(`${prefix}BtnPeer`);
  const dualContainer = document.getElementById(`${prefix}DualLangGroup`);
  const singleContainer = document.getElementById(`${prefix}SingleLangGroup`);

  const active =
    "py-2.5 px-3 rounded-lg text-label-sm font-semibold bg-primary-container text-white flex items-center justify-center gap-1.5 shadow-sm cursor-pointer";
  const inactive =
    "py-2.5 px-3 rounded-lg text-label-sm font-semibold bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1.5 transition-all cursor-pointer";

  if (exchangeBtn && peerBtn) {
    exchangeBtn.className = type === "exchange" ? active : inactive;
    peerBtn.className = type === "peer" ? active : inactive;
  }

  if (dualContainer && singleContainer) {
    if (type === "peer") {
      dualContainer.classList.add("hidden");
      singleContainer.classList.remove("hidden");
    } else {
      dualContainer.classList.remove("hidden");
      singleContainer.classList.add("hidden");
    }
  }

  const modeInput = document.getElementById(`${prefix}ModeInput`);
  if (modeInput) modeInput.value = type;
};

// =========================================================
// 4. MOCK BOOKING & PROTECTED ROOM REDIRECT
// =========================================================
window.handleMatcherSubmit = function (e, prefix = "modal") {
  e.preventDefault();
  const mode = document.getElementById(`${prefix}ModeInput`)?.value || "exchange";
  const knownLang = document.getElementById(`${prefix}KnownLang`)?.value || "English";
  const targetLang =
    mode === "peer"
      ? document.getElementById(`${prefix}SingleLang`)?.value || "German (Deutsch)"
      : document.getElementById(`${prefix}TargetLang`)?.value || "German (Deutsch)";
  const tz = document.getElementById(`${prefix}Timezone`)?.value || "Europe/Berlin (CET)";
  const slot = document.getElementById(`${prefix}Slot`)?.value || "15:00 - 15:30";

  const booking = {
    id: "VB-" + Math.floor(100 + Math.random() * 900),
    mode: mode === "peer" ? "Same-Language Duo" : "Tandem Exchange",
    knownLang,
    targetLang,
    tz,
    slot,
    partnerName: mode === "peer" ? "Elena Rostova (B1 Peer)" : "Lukas Weber (Native)",
    partnerCity: mode === "peer" ? "New York • 9:00 AM EST" : "Berlin • 3:00 PM CET",
    createdAt: new Date().toLocaleDateString(),
  };

  window.closeMatcherModal();
  window.enterProtectedRoom(booking);
};

// =========================================================
// 5. HOMEPAGE DEMO STAGE
// =========================================================
window.setLiveStage = function (stageNum) {
  currentStage = stageNum;
  const liveCallStage = document.getElementById("liveCallStage");
  const postSummaryStage = document.getElementById("postSessionSummaryStage");
  const stageHeaderTitle = document.getElementById("stageHeaderTitle");
  const turnButtonText = document.getElementById("turnButtonText");

  if (!liveCallStage || !postSummaryStage) return;

  const b1 = document.getElementById("stepBtn1");
  const b2 = document.getElementById("stepBtn2");
  const b3 = document.getElementById("stepBtn3");

  const activeClass =
    "px-2.5 py-1 rounded text-label-sm font-semibold transition-all bg-primary-container text-white flex items-center gap-1 shadow-sm cursor-pointer";
  const inactiveClass =
    "px-2.5 py-1 rounded text-label-sm font-medium transition-all text-on-surface-variant hover:text-on-surface flex items-center gap-1 cursor-pointer";

  if (b1) b1.className = stageNum === 1 ? activeClass : inactiveClass;
  if (b2) b2.className = stageNum === 2 ? activeClass : inactiveClass;
  if (b3) b3.className = stageNum === 3 ? activeClass : inactiveClass;

  const lukasCard = document.getElementById("lukasCard");
  const elenaCard = document.getElementById("elenaCard");
  const lukasStatusBadge = document.getElementById("lukasStatusBadge");
  const elenaStatusBadge = document.getElementById("elenaStatusBadge");
  const lukasWave = document.getElementById("lukasWaveform");
  const elenaWave = document.getElementById("elenaWaveform");
  const lukasTranscript = document.getElementById("lukasTranscriptText");
  const elenaSpeechBox = document.getElementById("elenaSpeechBox");
  const elenaTranscript = document.getElementById("elenaTranscriptText");
  const elenaMicIcon = document.getElementById("elenaMicIcon");
  const hudPromptText = document.getElementById("hudPromptText");
  const hudLatencyBadge = document.getElementById("hudLatencyBadge");

  if (stageNum === 1) {
    if (stageHeaderTitle) stageHeaderTitle.innerText = "Live Call (Lukas Speaking)";
    if (turnButtonText) turnButtonText.innerText = "Switch to Elena";
    postSummaryStage.classList.add("hidden", "opacity-0");
    liveCallStage.classList.remove("hidden", "opacity-0");
    liveCallStage.classList.add("opacity-100");

    lukasCard.className =
      "md:col-span-6 bg-surface-container-low rounded-lg p-space-md flex flex-col justify-between gap-4 ring-2 ring-primary-container shadow-lg transition-all duration-300";
    lukasStatusBadge.innerHTML = `<span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container text-white font-label-sm text-label-sm font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>Speaking</span>`;
    lukasWave.className = "my-5 flex items-end gap-1.5 h-14 px-4 justify-center opacity-100";
    lukasWave.innerHTML = `<div class="w-1.5 bg-primary-container rounded-full animate-bounce h-7"></div><div class="w-1.5 bg-primary-container rounded-full animate-bounce h-12" style="animation-delay:.15s"></div><div class="w-1.5 bg-primary-container rounded-full animate-bounce h-14" style="animation-delay:.05s"></div><div class="w-1.5 bg-primary-container rounded-full animate-bounce h-9" style="animation-delay:.3s"></div><div class="w-1.5 bg-primary-container rounded-full animate-bounce h-11" style="animation-delay:.2s"></div>`;
    lukasTranscript.innerHTML = `“Genau, <span class="text-primary font-semibold underline decoration-primary-container underline-offset-4">Feierabend</span> means logging off after work to unwind.”`;

    elenaCard.className =
      "md:col-span-6 bg-surface-container-low rounded-lg p-space-md flex flex-col justify-between gap-4 border border-theme transition-all duration-300";
    elenaStatusBadge.innerHTML = `<span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm"><span class="w-1.5 h-1.5 rounded-full bg-outline"></span>Listening</span>`;
    elenaWave.className = "my-5 flex items-end gap-1.5 h-14 px-4 justify-center opacity-40";
    elenaWave.innerHTML = `<div class="w-1.5 bg-outline-variant rounded-full h-3"></div><div class="w-1.5 bg-outline-variant rounded-full h-4"></div><div class="w-1.5 bg-outline-variant rounded-full h-3"></div><div class="w-1.5 bg-outline-variant rounded-full h-5"></div><div class="w-1.5 bg-outline-variant rounded-full h-3"></div>`;
    elenaSpeechBox.className = "bg-surface-container rounded-lg p-space-sm border border-theme flex items-center justify-between min-h-[52px]";
    elenaTranscript.innerHTML = `Ready to reply: <span class="text-on-surface font-medium">“In New York we just call that happy hour.”</span>`;
    elenaMicIcon.className = "material-symbols-outlined text-outline text-[18px]";
    hudPromptText.innerText = "Listening to Lukas. Ready to whisper a phrase if Elena gets stuck.";
    hudLatencyBadge.innerText = "18ms";
  } else if (stageNum === 2) {
    if (stageHeaderTitle) stageHeaderTitle.innerText = "Live Call (Elena Speaking)";
    if (turnButtonText) turnButtonText.innerText = "View Call Summary";
    postSummaryStage.classList.add("hidden", "opacity-0");
    liveCallStage.classList.remove("hidden", "opacity-0");
    liveCallStage.classList.add("opacity-100");

    lukasCard.className =
      "md:col-span-6 bg-surface-container-low rounded-lg p-space-md flex flex-col justify-between gap-4 border border-theme transition-all duration-300";
    lukasStatusBadge.innerHTML = `<span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm"><span class="w-1.5 h-1.5 rounded-full bg-outline"></span>Listening</span>`;
    lukasWave.className = "my-5 flex items-end gap-1.5 h-14 px-4 justify-center opacity-40";
    lukasWave.innerHTML = `<div class="w-1.5 bg-outline-variant rounded-full h-3"></div><div class="w-1.5 bg-outline-variant rounded-full h-5"></div><div class="w-1.5 bg-outline-variant rounded-full h-3"></div><div class="w-1.5 bg-outline-variant rounded-full h-4"></div><div class="w-1.5 bg-outline-variant rounded-full h-3"></div>`;
    lukasTranscript.innerHTML = `<span class="text-on-surface-variant italic">“Verstehe! Wie läuft das nach der Arbeit in New York?”</span>`;

    elenaCard.className =
      "md:col-span-6 bg-surface-container-low rounded-lg p-space-md flex flex-col justify-between gap-4 ring-2 ring-primary-container shadow-lg transition-all duration-300";
    elenaStatusBadge.innerHTML = `<span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container text-white font-label-sm text-label-sm font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>Speaking</span>`;
    elenaWave.className = "my-5 flex items-end gap-1.5 h-14 px-4 justify-center opacity-100";
    elenaWave.innerHTML = `<div class="w-1.5 bg-primary-container rounded-full animate-bounce h-10"></div><div class="w-1.5 bg-primary-container rounded-full animate-bounce h-14" style="animation-delay:.2s"></div><div class="w-1.5 bg-primary-container rounded-full animate-bounce h-11" style="animation-delay:.1s"></div><div class="w-1.5 bg-primary-container rounded-full animate-bounce h-13" style="animation-delay:.3s"></div><div class="w-1.5 bg-primary-container rounded-full animate-bounce h-9" style="animation-delay:.15s"></div>`;
    elenaSpeechBox.className = "bg-primary-container/10 border border-primary-container/50 rounded-lg p-space-sm flex items-center justify-between min-h-[52px]";
    elenaTranscript.innerHTML = `<span class="text-on-surface font-medium">“Genau, nach Feierabend treffen wir uns oft auf einen Drink.”</span>`;
    elenaMicIcon.className = "material-symbols-outlined text-primary text-[20px] animate-pulse";
    hudPromptText.innerText = "Whispered cue to Elena: ‘nach Feierabend’ (after work).";
    hudLatencyBadge.innerText = "118ms";
  } else if (stageNum === 3) {
    if (stageHeaderTitle) stageHeaderTitle.innerText = "Post-Call Notes & Mistake Recap";
    liveCallStage.classList.add("hidden", "opacity-0");
    postSummaryStage.classList.remove("hidden", "opacity-0");
    postSummaryStage.classList.add("opacity-100");
  }
};

window.advanceSpeakerTurn = function () {
  if (currentStage === 1) window.setLiveStage(2);
  else if (currentStage === 2) window.setLiveStage(3);
  else window.setLiveStage(1);
};

window.toggleAutoPlay = function () {
  const icon = document.getElementById("autoPlayIcon");
  if (isAutoPlaying) {
    clearInterval(autoPlayInterval);
    autoPlayInterval = null;
    isAutoPlaying = false;
    if (icon) icon.innerText = "play_arrow";
  } else {
    isAutoPlaying = true;
    if (icon) icon.innerText = "pause";
    startAutoPlayLoop();
  }
};

function startAutoPlayLoop() {
  if (autoPlayInterval) clearInterval(autoPlayInterval);
  autoPlayInterval = setInterval(() => {
    if (!isAutoPlaying) return;
    const nextStage = currentStage >= 3 ? 1 : currentStage + 1;
    window.setLiveStage(nextStage);
  }, 5500);
}

// =========================================================
// 6. ROOM PAGE SIMULATION + CSV & PDF EXPORT
// =========================================================
const ROOM_SCRIPT = [
  {
    speaker: "partner",
    partnerLine: "“Hallo! Bist du bereit für unsere 30-Minuten-Session? Worüber möchtest du heute sprechen?”",
    userLine: "Thinking of reply...",
    whisper: "Tip: Start with ‘Ich möchte heute über meinen Alltag sprechen.’",
  },
  {
    speaker: "user",
    partnerLine: "Listening closely...",
    userLine: "“Hallo Lukas! Ich möchte heute über meinen Alltag und mein Studium in Dortmund sprechen.”",
    whisper: "Great sentence structure! Keep going.",
  },
  {
    speaker: "partner",
    partnerLine: "“Klingt super! Was machst du normalerweise nach der Uni, wenn du Feierabend hast?”",
    userLine: "Paused for 2.4s — AI Bridge cue sent...",
    whisper: "Whispered phrase: ‘Nach der Uni treffe ich mich oft mit Freunden.’",
  },
  {
    speaker: "user",
    partnerLine: "Nodding & listening...",
    userLine: "“Nach der Uni treffe ich mich oft mit Freunden auf einen Kaffee.”",
    whisper: "Natural phrasing used: ‘auf einen Kaffee treffen’.",
  },
];

let roomStepIndex = 0;
let roomTimerSeconds = 0;
let roomSimInterval = null;
let roomClockInterval = null;

window.initRoomPage = function () {
  const roomStage = document.getElementById("roomSimulationStage");
  if (!roomStage) return;

  const saved = JSON.parse(localStorage.getItem("voxbridge-active-booking") || "null");
  if (saved) {
    const titleEl = document.getElementById("roomSessionTitle");
    const metaEl = document.getElementById("roomSessionMeta");
    const partnerNameEl = document.getElementById("roomPartnerName");
    const partnerCityEl = document.getElementById("roomPartnerCity");
    if (titleEl) titleEl.innerText = `${saved.targetLang} — ${saved.mode}`;
    if (metaEl) metaEl.innerText = `Room #${saved.id} • Slot: ${saved.slot} (${saved.tz})`;
    if (partnerNameEl) partnerNameEl.innerText = saved.partnerName;
    if (partnerCityEl) partnerCityEl.innerText = saved.partnerCity;
  }

  window.renderRoomStep(0);

  roomSimInterval = setInterval(() => {
    roomStepIndex = (roomStepIndex + 1) % ROOM_SCRIPT.length;
    window.renderRoomStep(roomStepIndex);
  }, 4200);

  roomClockInterval = setInterval(() => {
    roomTimerSeconds++;
    const mins = String(Math.floor(roomTimerSeconds / 60)).padStart(2, "0");
    const secs = String(roomTimerSeconds % 60).padStart(2, "0");
    const clockEl = document.getElementById("roomCallTimer");
    if (clockEl) clockEl.innerText = `${mins}:${secs}`;
  }, 1000);
};

window.renderRoomStep = function (idx) {
  const step = ROOM_SCRIPT[idx];
  if (!step) return;

  const partnerBox = document.getElementById("roomPartnerCard");
  const userBox = document.getElementById("roomUserCard");
  const partnerBadge = document.getElementById("roomPartnerBadge");
  const userBadge = document.getElementById("roomUserBadge");
  const partnerWave = document.getElementById("roomPartnerWave");
  const userWave = document.getElementById("roomUserWave");
  const partnerSpeech = document.getElementById("roomPartnerSpeech");
  const userSpeech = document.getElementById("roomUserSpeech");
  const whisperText = document.getElementById("roomWhisperText");

  if (!partnerBox || !userBox) return;

  const isPartner = step.speaker === "partner";

  partnerBox.className = isPartner
    ? "bg-surface-container-low rounded-2xl p-6 flex flex-col justify-between gap-5 ring-2 ring-primary-container shadow-xl transition-all duration-300"
    : "bg-surface-container-low rounded-2xl p-6 flex flex-col justify-between gap-5 border border-theme transition-all duration-300";

  userBox.className = !isPartner
    ? "bg-surface-container-low rounded-2xl p-6 flex flex-col justify-between gap-5 ring-2 ring-primary-container shadow-xl transition-all duration-300"
    : "bg-surface-container-low rounded-2xl p-6 flex flex-col justify-between gap-5 border border-theme transition-all duration-300";

  partnerBadge.innerHTML = isPartner
    ? `<span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-white text-xs font-semibold"><span class="w-2 h-2 rounded-full bg-white animate-ping"></span>Speaking</span>`
    : `<span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs">Listening</span>`;

  userBadge.innerHTML = !isPartner
    ? `<span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-white text-xs font-semibold"><span class="w-2 h-2 rounded-full bg-white animate-ping"></span>Speaking</span>`
    : `<span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs">Listening</span>`;

  partnerWave.style.opacity = isPartner ? "1" : "0.25";
  userWave.style.opacity = !isPartner ? "1" : "0.25";

  partnerSpeech.innerText = step.partnerLine;
  userSpeech.innerText = step.userLine;
  whisperText.innerText = step.whisper;
};

window.endRoomSession = function () {
  clearInterval(roomSimInterval);
  clearInterval(roomClockInterval);
  sessionStorage.removeItem("voxbridge-room-authorized");

  const liveView = document.getElementById("roomSimulationStage");
  const summaryView = document.getElementById("roomSummaryView");
  if (liveView) liveView.classList.add("hidden");
  if (summaryView) summaryView.classList.remove("hidden");
};

window.restartRoomSession = function () {
  sessionStorage.setItem("voxbridge-room-authorized", "true");
  const liveView = document.getElementById("roomSimulationStage");
  const summaryView = document.getElementById("roomSummaryView");
  if (summaryView) summaryView.classList.add("hidden");
  if (liveView) liveView.classList.remove("hidden");
  roomTimerSeconds = 0;
  window.initRoomPage();
};

// Download Session Recap as .CSV
window.downloadSessionCSV = function () {
  const saved = JSON.parse(localStorage.getItem("voxbridge-active-booking") || "{}");
  const lang = saved.targetLang || "German (Deutsch)";
  const rows = [
    ["Category", "Spoken / Original", "Improved / Target Phrase", "Notes"],
    ["Word Order", "Gestern ich habe gelernt", "Gestern habe ich gelernt", "Verb stays in 2nd position after time adverb"],
    ["Vocabulary Cue", "after university classes", "nach der Uni / Feierabend", "Used naturally after AI Bridge whisper"],
    ["Conversation Phrase", "meet for a coffee", "sich auf einen Kaffee treffen", "Preposition 'auf' + accusative"],
    ["Session Metadata", `Language: ${lang}`, `Talk Ratio: 51% / 49%`, `Date: ${new Date().toLocaleDateString()}`],
  ];

  const csvContent =
    "data:text/csv;charset=utf-8," +
    rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `VoxBridge_Session_Recap_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Download Session Recap as PDF (Clean Printable Summary View)
window.downloadSessionPDF = function () {
  const saved = JSON.parse(localStorage.getItem("voxbridge-active-booking") || "{}");
  const lang = saved.targetLang || "German (Deutsch)";
  const partner = saved.partnerName || "Lukas Weber (Native)";
  const dateStr = new Date().toLocaleDateString();

  const printWindow = window.open("", "_blank", "width=850,height=900");
  if (!printWindow) {
    alert("Please allow pop-ups to generate the PDF summary.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>VoxBridge Session Summary - ${dateStr}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif; color: #09090b; padding: 40px; max-width: 760px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
        .brand { font-size: 22px; font-weight: 800; color: #09090b; }
        .badge { background: #2563eb; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
        .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 10px; margin-bottom: 24px; font-size: 13px; }
        h2 { font-size: 16px; margin: 24px 0 12px; color: #09090b; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
        th { background: #f1f5f9; font-weight: 600; }
        .highlight { color: #2563eb; font-weight: 600; }
        .footer { margin-top: 36px; font-size: 11px; color: #52525b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">VoxBridge — Speaking Session Recap</div>
        <span class="badge">${lang}</span>
      </div>
      <div class="meta">
        <div><strong>Partner:</strong><br/>${partner}</div>
        <div><strong>Date:</strong><br/>${dateStr}</div>
        <div><strong>Talk Balance:</strong><br/>51% You / 49% Partner</div>
      </div>
      <h2>Key Corrections & AI Bridge Cues</h2>
      <table>
        <thead>
          <tr>
            <th>Topic</th>
            <th>What Was Said</th>
            <th>Natural Phrasing</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Word Order</td>
            <td>“Gestern ich habe gelernt...”</td>
            <td class="highlight">“Gestern habe ich gelernt...”</td>
          </tr>
          <tr>
            <td>AI Whisper Cue</td>
            <td>Paused after “after work”</td>
            <td class="highlight">“Feierabend machen”</td>
          </tr>
          <tr>
            <td>Idiom / Preposition</td>
            <td>“meet for a coffee”</td>
            <td class="highlight">“sich auf einen Kaffee treffen”</td>
          </tr>
        </tbody>
      </table>
      <div class="footer">Generated by VoxBridge • Stop Texting. Start Speaking.</div>
      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

// =========================================================
// 7. MODAL & TIMEZONE CALCULATOR HELPERS
// =========================================================
window.openMatcherModal = function () {
  const modal = document.getElementById("matcherModal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
};

window.closeMatcherModal = function () {
  const modal = document.getElementById("matcherModal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
};

window.switchDuoMode = function (mode) {
  const exchangeBtn = document.getElementById("modeExchangeBtn");
  const sameBtn = document.getElementById("modeSameTargetBtn");
  const active =
    "px-4 py-2 rounded-md font-label-md text-label-md font-semibold transition-all bg-primary-container text-white shadow-sm cursor-pointer";
  const inactive =
    "px-4 py-2 rounded-md font-label-md text-label-md font-semibold text-on-surface-variant hover:text-on-surface transition-all cursor-pointer";

  if (exchangeBtn && sameBtn) {
    exchangeBtn.className = mode === "exchange" ? active : inactive;
    sameBtn.className = mode === "same" ? active : inactive;
  }
};

const TZ_OFFSETS = {
  "Europe/Berlin": { label: "CET", utcOffset: 1 },
  "America/New_York": { label: "EST", utcOffset: -5 },
  "Asia/Tokyo": { label: "JST", utcOffset: 9 },
};

function formatHour12(hour24) {
  const h = ((hour24 % 24) + 24) % 24;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12 < 10 ? "0" + h12 : h12}:00 ${period}`;
}

window.setTimezoneBase = function (tz) {
  currentBaseTz = tz;
  const btnBerlin = document.getElementById("btnTzBerlin");
  const btnNYC = document.getElementById("btnTzNYC");
  const btnTokyo = document.getElementById("btnTzTokyo");

  const active =
    "px-3 py-1.5 rounded-full text-label-sm font-medium bg-primary-container text-white transition-all cursor-pointer hover-btn";
  const inactive =
    "px-3 py-1.5 rounded-full text-label-sm font-medium bg-surface-container-high text-on-surface transition-all cursor-pointer hover-btn";

  if (btnBerlin) btnBerlin.className = tz === "Europe/Berlin" ? active : inactive;
  if (btnNYC) btnNYC.className = tz === "America/New_York" ? active : inactive;
  if (btnTokyo) btnTokyo.className = tz === "Asia/Tokyo" ? active : inactive;

  const slider = document.getElementById("timeSlider");
  if (slider) window.updateTimeCalculator(slider.value);
};

window.updateTimeCalculator = function (hourVal) {
  const hour = parseInt(hourVal, 10);
  const baseInfo = TZ_OFFSETS[currentBaseTz];
  const utcHour = hour - baseInfo.utcOffset;

  const timeDisplay = document.getElementById("displaySelectedTime");
  const nycDisplay = document.getElementById("convertedNycTime");
  const spDisplay = document.getElementById("convertedSaoPauloTime");
  const tokyoDisplay = document.getElementById("convertedTokyoTime");
  const convenienceBadge = document.getElementById("convenienceScoreBadge");
  const countDisplay = document.getElementById("activeDuoCount");

  if (!timeDisplay) return;

  const pad = (n) => (n < 10 ? "0" + n : n);
  timeDisplay.innerText = `${pad(hour)}:00 (${formatHour12(hour)} ${baseInfo.label})`;
  nycDisplay.innerText = formatHour12(utcHour - 5);
  spDisplay.innerText = formatHour12(utcHour - 3);
  tokyoDisplay.innerText = formatHour12(utcHour + 9);

  if (hour >= 14 && hour <= 19) {
    convenienceBadge.innerText = "Good Overlap";
    countDisplay.innerText = "48 Speakers";
  } else if (hour >= 9 && hour < 14) {
    convenienceBadge.innerText = "Fair Overlap";
    countDisplay.innerText = "31 Speakers";
  } else {
    convenienceBadge.innerText = "Fewer Matches";
    countDisplay.innerText = "16 Speakers";
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("voxbridge-theme") || "light";
  window.applyTheme(savedTheme);

  initParallaxAndReveals();

  if (document.getElementById("liveCallStage")) {
    startAutoPlayLoop();
  }
  if (document.getElementById("roomSimulationStage")) {
    window.initRoomPage();
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.closeMatcherModal();
  });
});