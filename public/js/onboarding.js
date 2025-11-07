window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    preloader.classList.add('preloader--hide');
    setTimeout(() => preloader.remove(), 500);
  }
});
