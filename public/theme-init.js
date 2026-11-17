(function () {
  try {
    var saved = localStorage.getItem('samajh_theme');
    var theme = saved === 'light' ? 'light' : 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
