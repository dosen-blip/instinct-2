// Local-only (lab/mobile): the phone side of the site. A classic deferred script, so it runs after app.js has rendered
// the page and before any module (mobile-hero.js, world.js) evaluates. The world layer itself runs on phones on its own
// now (lab/world/world.js, with the phone patch from lab/MOBILE.md); what is left here is the home film.
// ?noworld: the phone site without the world layer, for comparisons (world.js reads it too).
(function () {
  const root = document.documentElement;
  const phone = matchMedia('(max-width: 720px)').matches;
  root.classList.toggle('is-phone', phone);
  if (!phone) return;
  const app = document.getElementById('app');
  const decorate = () => {
    const view = app.querySelector('.with-mobile > .mobile-view');
    if (!view) return;
    // the phone home's old flat artwork: the baked hero (mobile-hero.js) replaces it (app.js has already asked for it)
    view.querySelector('.mobile-home-hero > img')?.remove();
    // the film waits for the intro, and only loads near the screen (it is 9.4 MB): see the video note in MOBILE.md
    for (const v of view.querySelectorAll('.mobile-home-video video')) {
      if (v.dataset.deferred) continue;
      v.dataset.deferred = '1';
      v.autoplay = false; v.preload = 'none'; v.removeAttribute('autoplay'); v.pause();
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !root.classList.contains('intro-pending')) v.play().catch(() => {});
        else if (!e.isIntersecting) v.pause();
      }, { rootMargin: '300px 0px' });
      io.observe(v);
      document.addEventListener('hero:revealed', () => { io.unobserve(v); io.observe(v); });
    }
  };
  decorate();
  // app.js re-renders #app on breakpoint changes and status refreshes
  new MutationObserver(decorate).observe(app, { childList: true });
}());
