
(() => {
  'use strict';

  // --------- DOM ELEMENTS ---------
  const el = {
    hours: document.querySelector('[data-hours]'),
    minutes: document.querySelector('[data-minutes]'),
    seconds: document.querySelector('[data-seconds]'),
    millis: document.querySelector('[data-milliseconds]'),
    btnStart: document.getElementById('btn-start'),
    btnPause: document.getElementById('btn-pause'),
    btnResume: document.getElementById('btn-resume'),
    btnReset: document.getElementById('btn-reset'),
    btnLap: document.getElementById('btn-lap'),
    btnClearLaps: document.getElementById('btn-clear-laps'),
    lapList: document.getElementById('lap-list'),
    lapTemplate: document.getElementById('lap-item-template')
  };

  // --------- STATE ---------
  let running = false;
  let startTime = 0;          // timestamp when started/resumed (performance.now)
  let elapsedBeforePause = 0; // accumulated time before current run (ms)
  let rafId = null;           // requestAnimationFrame id
  const laps = [];            // stores lap objects { index, total, diff }
  let lastLapTime = 0;        // total ms at previous lap (for diff)

  // --------- HELPERS ---------
  function formatTime(msTotal) {
    const hours = Math.floor(msTotal / 3_600_000);
    const minutes = Math.floor((msTotal % 3_600_000) / 60_000);
    const seconds = Math.floor((msTotal % 60_000) / 1000);
    const milliseconds = Math.floor(msTotal % 1000);
    return {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
      millis: String(milliseconds).padStart(3, '0')
    };
  }

  function updateDisplay(msTotal) {
    const t = formatTime(msTotal);
    el.hours.textContent = t.hours;
    el.minutes.textContent = t.minutes;
    el.seconds.textContent = t.seconds;
    el.millis.textContent = t.millis;
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
    // states: 'idle', 'running', 'paused'
    switch (state) {
      case 'idle':
        el.btnStart.disabled = false;
        el.btnPause.disabled = true;
        el.btnResume.hidden = true;
        el.btnResume.disabled = true;
        el.btnReset.disabled = true;
        el.btnLap.disabled = true;
        el.btnClearLaps.disabled = laps.length === 0;
        break;
      case 'running':
        el.btnStart.disabled = true;
        el.btnPause.disabled = false;
        el.btnResume.hidden = true;
        el.btnResume.disabled = true;
        el.btnReset.disabled = false;
        el.btnLap.disabled = false;
        el.btnClearLaps.disabled = laps.length === 0;
        break;
      case 'paused':
        el.btnStart.disabled = true;
        el.btnPause.disabled = true;
        el.btnResume.hidden = false;
        el.btnResume.disabled = false;
        el.btnReset.disabled = false;
        el.btnLap.disabled = true; // disable lap while paused
        el.btnClearLaps.disabled = laps.length === 0;
        break;
    }
  }

  // --------- LAP RENDERING ---------
  function renderLap(lap) {
    const node = el.lapTemplate.content.cloneNode(true);
    const li = node.querySelector('.lap-item');
    li.querySelector('[data-lap-index]').textContent = '#' + lap.index;
    li.querySelector('[data-lap-time]').textContent = formatLapTime(lap.total);
    li.querySelector('[data-lap-diff]').textContent = lap.index === 1 ? '—' : '+' + formatLapTime(lap.diff);
    el.lapList.prepend(li); // newest on top
  }

  function formatLapTime(ms) {
    // Show mm:ss.mmm if < 1h, else HH:MM:SS.mmm
    const { hours, minutes, seconds, millis } = formatTime(ms);
    if (hours === '00') {
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
    setControlsState(running ? 'running' : 'paused');
  }

  function clearLaps() {
    laps.length = 0;
    lastLapTime = 0;
    el.lapList.innerHTML = '';
    setControlsState(running ? 'running' : (elapsedBeforePause > 0 ? 'paused' : 'idle'));
  }

  // --------- ACTIONS ---------
  function start() {
    if (running) return;
    running = true;
    startTime = performance.now();
    tick();
    setControlsState('running');
  }

  function pause() {
    if (!running) return;
    running = false;
    elapsedBeforePause = currentElapsed();
    cancelAnimationFrame(rafId);
    setControlsState('paused');
  }

  function resume() {
    if (running) return;
    running = true;
    startTime = performance.now();
    tick();
    setControlsState('running');
  }

  function reset() {
    running = false;
    cancelAnimationFrame(rafId);
    startTime = 0;
    elapsedBeforePause = 0;
    updateDisplay(0);
    // keep laps but user can clear them manually
    setControlsState('idle');
  }

  // --------- EVENT LISTENERS ---------
  el.btnStart.addEventListener('click', start);
  el.btnPause.addEventListener('click', pause);
  el.btnResume.addEventListener('click', resume);
  el.btnReset.addEventListener('click', reset);
  el.btnLap.addEventListener('click', addLap);
  el.btnClearLaps.addEventListener('click', clearLaps);

  // Keyboard shortcuts (basic)
  // Space: start/pause/resume, L: lap, R: reset
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!running && elapsedBeforePause === 0) start();
      else if (running) pause();
      else resume();
    } else if (e.key.toLowerCase() === 'l') {
      if (running) addLap();
    } else if (e.key.toLowerCase() === 'r') {
      reset();
    } else if (e.key.toLowerCase() === 'c') {
      clearLaps();
    }
  });

  // Initialize display
  updateDisplay(0);
  setControlsState('idle');
})();
