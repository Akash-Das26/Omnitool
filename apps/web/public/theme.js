(() => {
  var key;
  var stored;
  var prefersDark;
  var theme;
  try {
    key = 'omnitool-theme';
    stored = window.localStorage.getItem(key);
    prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  } catch {
    /* Storage can be blocked; the CSS light theme is the safe default. */
  }
})();
