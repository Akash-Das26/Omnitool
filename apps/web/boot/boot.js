(() => {
  const root = document.documentElement;
  let theme = 'light';
  let rail = 'expanded';
  try {
    const storedTheme = localStorage.getItem('omnitool-theme');
    theme =
      storedTheme === 'light' || storedTheme === 'dark'
        ? storedTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    const storedUi = localStorage.getItem('omnitool-ui');
    if (storedUi) {
      const parsed = JSON.parse(storedUi);
      if (parsed?.state?.railCollapsed === true) rail = 'collapsed';
    }
  } catch {
    /* Storage can be blocked or hold junk: light and an expanded rail are the defaults. */
  }
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.setAttribute('data-rail', rail);
})();
