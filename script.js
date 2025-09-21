(() => {
  "use strict";

  const el = {
    hours: document.querySelector("[data-hours]"),
    minutes: document.querySelector("[data-minutes]"),
    seconds: document.querySelector("[data-seconds]"),
    millis: document.querySelector("[data-milliseconds]"),
    btnStart: document.getElementById("btn-start"),
    btnPause: document.getElementById("btn-pause"),
    btnResume: document.getElementById("btn-resume"),
    btnReset: document.getElementById("btn-reset"),
    btnLap: document.getElementById("btn-lap"),
    btnClearLaps: document.getElementById("btn-clear-laps"),
    lapList: document.getElementById("lap-list"),
    lapTemplate: document.getElementById("lap-item-template"),
    stopwatchRoot: document.querySelector(".stopwatch"),
  };

  let running = false;
  let startTime = 0;
  let elapsedBeforePause = 0;
  let rafId = null;
  const laps = [];
  let lastLapTime = 0;
  let lastRendered = { h: "00", m: "00", s: "00", ms: "000" };

  const controlStates = {
    idle: () => {
      el.btnStart.disabled = false;
      el.btnPause.disabled = true;
      el.btnResume.hidden = true;
      el.btnResume.disabled = true;
      el.btnReset.disabled = true;
      el.btnLap.disabled = true;
      el.btnClearLaps.disabled = laps.length === 0;
    },
    running: () => {
      el.btnStart.disabled = true;
      el.btnPause.disabled = false;
      el.btnResume.hidden = true;
      el.btnResume.disabled = true;
      el.btnReset.disabled = false;
      el.btnLap.disabled = false;
      el.btnClearLaps.disabled = laps.length === 0;
    },
    paused: () => {
      el.btnStart.disabled = true;
      el.btnPause.disabled = true;
      el.btnResume.hidden = false;
      el.btnResume.disabled = false;
      el.btnReset.disabled = false;
      el.btnLap.disabled = true;
      el.btnClearLaps.disabled = laps.length === 0;
    },
  };

  function formatTime(msTotal) {
    const hours = Math.floor(msTotal / 3_600_000);
    const minutes = Math.floor((msTotal % 3_600_000) / 60_000);
    const seconds = Math.floor((msTotal % 60_000) / 1000);
    const milliseconds = Math.floor(msTotal % 1000);
    return {
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
      millis: String(milliseconds).padStart(3, "0"),
    };
  }

  function updateDisplay(msTotal) {
    const t = formatTime(msTotal);
    if (t.hours !== lastRendered.h) {
      el.hours.textContent = t.hours;
      lastRendered.h = t.hours;
    }
    if (t.minutes !== lastRendered.m) {
      el.minutes.textContent = t.minutes;
      lastRendered.m = t.minutes;
    }
    if (t.seconds !== lastRendered.s) {
      el.seconds.textContent = t.seconds;
      lastRendered.s = t.seconds;
    }
    if (t.millis !== lastRendered.ms) {
      el.millis.textContent = t.millis;
      lastRendered.ms = t.millis;
    }
  }

  function currentElapsed() {
    if (!running) return elapsedBeforePause;
    return elapsedBeforePause + (performance.now() - startTime);
  }

  function tick() {
    updateDisplay(currentElapsed());
    if (running) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function setControlsState(state) {
    controlStates[state] && controlStates[state]();
  }

  function renderLap(lap) {
    const node = el.lapTemplate.content.cloneNode(true);
    const li = node.querySelector(".lap-item");
    li.querySelector("[data-lap-index]").textContent = "#" + lap.index;
    li.querySelector("[data-lap-time]").textContent = formatLapTime(lap.total);
    li.querySelector("[data-lap-diff]").textContent =
      lap.index === 1 ? "—" : "+" + formatLapTime(lap.diff);
    li.classList.add("is-new");
    el.lapList.prepend(li);
    const removeNew = () => li.classList.remove("is-new");
    const fallbackId = setTimeout(removeNew, 700);
    li.addEventListener(
      "animationend",
      (e) => {
        if (e.target === li) {
          clearTimeout(fallbackId);
          removeNew();
        }
      },
      { once: true }
    );
  }

  function formatLapTime(ms) {
    const { hours, minutes, seconds, millis } = formatTime(ms);
    if (hours === "00") {
      return `${minutes}:${seconds}.${millis}`;
    }
    return `${hours}:${minutes}:${seconds}.${millis}`;
  }

  function addLap() {
    const total = currentElapsed();
    const diff = laps.length === 0 ? total : total - lastLapTime;
    const lap = { index: laps.length + 1, total, diff };
    laps.push(lap);
    lastLapTime = total;
    renderLap(lap);
    setControlsState(running ? "running" : "paused");
  }

  function clearLaps() {
    laps.length = 0;
    lastLapTime = 0;
    el.lapList.innerHTML = "";
    setControlsState(
      running ? "running" : elapsedBeforePause > 0 ? "paused" : "idle"
    );
  }

  function start() {
    if (running) return;
    running = true;
    startTime = performance.now();
    tick();
    setControlsState("running");
    setRunningVisual(true);
  }

  function pause() {
    if (!running) return;
    const nowElapsed = currentElapsed();
    running = false;
    elapsedBeforePause = nowElapsed;
    cancelAnimationFrame(rafId);
    setControlsState("paused");
    setRunningVisual(false);
  }

  function resume() {
    if (running) return;
    running = true;
    startTime = performance.now();
    tick();
    setControlsState("running");
    setRunningVisual(true);
  }

  function reset() {
    running = false;
    cancelAnimationFrame(rafId);
    startTime = 0;
    elapsedBeforePause = 0;
    updateDisplay(0);
    setControlsState("idle");
    setRunningVisual(false);
  }

  const root = el.stopwatchRoot;
  function setRunningVisual(on) {
    if (!root) return;
    root.classList.toggle("is-running", !!on);
  }

  document.addEventListener("click", (e) => {
    const target = e.target.closest("button[data-action]");
    if (!target) return;
    const action = target.getAttribute("data-action");
    if (action === "start") return start();
    if (action === "pause") return pause();
    if (action === "resume") return resume();
    if (action === "reset") return reset();
    if (action === "lap") return addLap();
    if (action === "clear-laps") return clearLaps();
  });

  window.addEventListener("keydown", (e) => {
    if (
      e.target &&
      (e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable)
    )
      return;
    if (e.code === "Space") {
      e.preventDefault();
      if (!running && elapsedBeforePause === 0) start();
      else if (running) pause();
      else resume();
    } else if (e.key.toLowerCase() === "l") {
      if (running) addLap();
    } else if (e.key.toLowerCase() === "r") {
      reset();
    } else if (e.key.toLowerCase() === "c") {
      clearLaps();
    }
  });

  updateDisplay(0);
  setControlsState("idle");
})();
