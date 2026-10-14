const THEMES = {
  snow: { name: 'Snow', accent: '#f4f4f5', background: '#f4f4f5', color: '#18181b', radius: 8 },
  indigo: { name: 'Indigo', accent: '#a5b4fc', background: '#5b5bf0', color: '#fff', radius: 10 },
  lime: { name: 'Lime', accent: '#bef264', background: '#bef264', color: '#1a2e05', radius: 999 },
  coral: { name: 'Coral', accent: '#fda4af', background: '#f43f5e', color: '#fff', radius: 4 },
  graphite: { name: 'Graphite', accent: '#a1a1aa', background: '#2c2c31', color: '#ededef', radius: 12 },
};

const FONT = '500 12px/16px Geist, system-ui, sans-serif';

const tooltip = new Tooltip({ theme: { ...THEMES.snow, font: FONT, duration: 220 } });

const query = (selector) => document.querySelector(selector);
const queryAll = (selector) => [...document.querySelectorAll(selector)];

const setTooltip = (element, text) => element.setAttribute('data-tooltip', text);

/* Theme swatches */

const swatches = queryAll('.swatch');

const getSwatchText = (key, isActive) => `${THEMES[key].name} theme${isActive ? ' ✓' : ''}`;

const applyTheme = (key) => {
  const { name, accent, ...theme } = THEMES[key];

  tooltip.configure({ theme });
  document.documentElement.style.setProperty('--accent', accent);

  swatches.forEach((swatch) => {
    const isActive = swatch.dataset.theme === key;

    swatch.setAttribute('aria-pressed', String(isActive));
    setTooltip(swatch, getSwatchText(swatch.dataset.theme, isActive));
  });
};

swatches.forEach((swatch) => {
  swatch.style.setProperty('--swatch', THEMES[swatch.dataset.theme].background);
  swatch.setAttribute('aria-label', `${THEMES[swatch.dataset.theme].name} theme`);
  swatch.addEventListener('click', () => applyTheme(swatch.dataset.theme));
});

applyTheme('snow');

/* Install command */

const command = query('.install__command');
const copyButton = query('.copy');

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(command.textContent);
    setTooltip(copyButton, 'Copied!');
  } catch {
    setTooltip(copyButton, 'Clipboard is blocked here');
  }

  copyButton.classList.add('is-done');
  copyButton.querySelector('use').setAttribute('href', '#i-check');

  setTimeout(() => {
    setTooltip(copyButton, 'Copy');
    copyButton.classList.remove('is-done');
    copyButton.querySelector('use').setAttribute('href', '#i-copy');
  }, 1600);
});

/* Dock */

const apps = Object.fromEntries(queryAll('.app').map((app) => [app.dataset.app, app]));

const launch = (app) => {
  app.classList.remove('is-launching');
  app.offsetWidth;
  app.classList.add('is-launching', 'is-running');
};

const today = new Date();

query('.calendar__weekday').textContent = today.toLocaleDateString('en-US', { weekday: 'short' });
query('.calendar__day').textContent = today.getDate();
setTooltip(apps.calendar, `Calendar\n${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - no meetings 🎉`);

const clearBadge = (app, text) => {
  app.querySelector('.badge')?.classList.add('is-hidden');
  setTooltip(app, text);
};

const music = { isPlaying: false };

const download = { progress: 0, timer: 0 };

const renderDownload = () => {
  const percent = Math.round(download.progress * 100);
  const file = Math.min(3, Math.floor(download.progress * 3) + 1);

  apps.downloads.style.setProperty('--progress', download.progress);
  setTooltip(apps.downloads, percent < 100 ? `Downloads\nfile ${file} of 3 - ${percent}%` : 'Downloads\nall done ✓');
};

const startDownload = () => {
  clearInterval(download.timer);
  download.progress = 0;
  renderDownload();

  download.timer = setInterval(() => {
    download.progress = Math.min(1, download.progress + 0.04 + Math.random() * 0.05);
    renderDownload();

    if (download.progress === 1) {
      clearInterval(download.timer);
    }
  }, 700);
};

const ACTIONS = {
  mail: (app) => clearBadge(app, 'Mail\ninbox zero'),
  messages: (app) => clearBadge(app, 'Messages'),
  music: (app) => {
    music.isPlaying = !music.isPlaying;
    app.querySelector('.icon').classList.toggle('is-playing', music.isPlaying);
    setTooltip(app, music.isPlaying ? 'Now playing\nNightcall - Kavinsky' : 'Music\nPaused');
  },
  downloads: startDownload,
  trash: (app) => setTooltip(app, app.dataset.tooltip.includes('items') ? 'Trash\nempty' : 'Trash\nstill empty'),
};

Object.entries(apps).forEach(([name, app]) => {
  app.setAttribute('aria-label', name[0].toUpperCase() + name.slice(1));
  app.addEventListener('click', () => {
    if (name !== 'trash') {
      launch(app);
    }

    ACTIONS[name]?.(app);
  });
  app.addEventListener('animationend', () => app.classList.remove('is-launching'));
});

query('.dock').addEventListener('keydown', (event) => {
  const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
  const list = Object.values(apps);
  const index = list.indexOf(document.activeElement);

  if (step && index !== -1) {
    event.preventDefault();
    list[(index + step + list.length) % list.length].focus();
  }
});

startDownload();
