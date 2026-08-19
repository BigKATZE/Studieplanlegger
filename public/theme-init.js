(function () {
  var t = localStorage.getItem('planner-theme')
  if (t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark')
  }
})()