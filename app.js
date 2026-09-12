(function () {
  'use strict';
  const content = window.INSTINCT_CONTENT;
  const imageManifest = window.INSTINCT_IMAGES;
  const imageRecordsBySrc = new Map(Object.values(imageManifest).map(record => [record.src, record]));
  const mobileMedia = window.matchMedia('(max-width: 720px)');
  const asset = name => imageManifest[name]?.src || `./assets/${name}.webp`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const url = value => {
    const text = String(value || '');
    if (text.startsWith('./') || text.startsWith('#')) return esc(text);
    try { return ['https:', 'http:', 'mailto:'].includes(new URL(text).protocol) ? esc(text) : '#'; }
    catch { return '#'; }
  };
  const routeFor = id => `./${encodeURIComponent(id)}.html`;
  const routes = {home:'./index.html',next:'./next-event.html',events:'./past-events.html',artists:'./artists.html',gallery:'./gallery.html'};
  const links = content.links;
  let archive;
  let cleanupPage = () => {};
  let statusKey = '';

  function imageTag(src, alt, options = {}) {
    const record = imageRecordsBySrc.get(src);
    const {className = '', sizes = '100vw', priority = false} = options;
    const responsive = record?.candidates?.length > 1
      ? ` srcset="${record.candidates.map(candidate => `${url(candidate.src)} ${candidate.width}w`).join(', ')}" sizes="${esc(sizes)}"` : '';
    const dimensions = record ? ` width="${record.width}" height="${record.height}"` : '';
    return `<img${className ? ` class="${esc(className)}"` : ''} src="${url(src)}"${responsive}${dimensions} loading="${priority ? 'eager' : 'lazy'}"${priority ? ' fetchpriority="high"' : ''} decoding="async" alt="${esc(alt)}">`;
  }
  function dateLabel(event) {
    return new Intl.DateTimeFormat('en-CA', {dateStyle:'long',timeZone:'UTC'}).format(new Date(`${event.date}T12:00:00Z`));
  }
  function eventDate(event) { return `<time datetime="${esc(event.date)}">${esc(dateLabel(event))}</time>`; }
  function textLink(href, label, external = false, className = 'archive-link') {
    return `<a class="${className}" href="${url(href)}"${external ? ' target="_blank" rel="noreferrer"' : ''}>${esc(label)}</a>`;
  }
  function pageHeading(kicker, title, copy = '') {
    return `<header class="archive-heading"><p class="archive-kicker">${esc(kicker)}</p><h1>${esc(title)}</h1>${copy ? `<p class="archive-intro">${esc(copy)}</p>` : ''}</header>`;
  }
  function getRoute() {return (window.location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');}
  function render() {
    cleanupPage();
    archive = window.INSTINCT_ARCHIVE.create(content);
    statusKey = archive.pastEvents.map(event => event.id).join('|');
    const route = getRoute();
    const event = archive.byId[route] || archive.byId[content.collaborations?.[route]?.eventId];
    let page;
    if (route === 'index') page = renderHome();
    else if (route === 'past-events') page = renderArchive();
    else if (route === 'artists') page = renderDirectory();
    else if (route === 'gallery') page = renderGallery();
    else if (route === 'next-event') page = renderNextEvent();
    else if (event) page = renderEvent(event);
    else if (content.artists[route]) page = renderArtist(content.artists[route]);
    else page = `<article class="archive-shell">${pageHeading('Instinct Groove','Page not found')}${textLink(routes.home,'Return home')}</article>`;
    document.getElementById('app').innerHTML = `${siteHeader(route)}${page}${siteFooter()}`;
    document.documentElement.dataset.route = route;
    const cleanupNav = setupNav();
    const cleanupViewer = setupViewer();
    const cleanupFilters = setupFilters(route);
    const cleanupGlow = setupHeroGlow();
    cleanupPage = () => { cleanupGlow(); cleanupViewer(); cleanupNav(); cleanupFilters(); };
  }
  function setupHeroGlow() {
    const hero = document.querySelector('.home-hero, .mobile-home-hero');
    if (!hero) return () => {};
    const glow = document.createElement('span');
    glow.className = 'hero-energy';
    glow.setAttribute('aria-hidden', 'true');
    // Fixed turbulence breaks up the light; movement deforms it without a noise loop.
    glow.innerHTML = `<svg class="hero-light-filter" width="0" height="0" aria-hidden="true"><defs><filter id="hero-refraction" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".009 .014" numOctaves="2" seed="17" result="flow"/><feDisplacementMap in="SourceGraphic" in2="flow" scale="42" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="9"/></filter></defs></svg>`;
    hero.append(glow);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0, visible = true, lastTime = 0, energy = 0;
    let bounds = hero.getBoundingClientRect();
    let target = {x: 50, y: 57}, green = {...target}, purple = {...target};
    const paint = () => {
      glow.style.setProperty('--glow-x', `${green.x * bounds.width / 100}px`);
      glow.style.setProperty('--glow-y', `${green.y * bounds.height / 100}px`);
      glow.style.setProperty('--echo-x', `${purple.x * bounds.width / 100}px`);
      glow.style.setProperty('--echo-y', `${purple.y * bounds.height / 100}px`);
      glow.style.setProperty('--light-energy', energy.toFixed(4));
      glow.style.setProperty('--light-spread', (1.24 - energy * .24).toFixed(4));
      glow.style.setProperty('--bend-x', `${Math.max(-12, Math.min(12, (green.x-purple.x)*.8))}deg`);
      glow.style.setProperty('--bend-y', `${Math.max(-9, Math.min(9, (green.y-purple.y)*.6))}deg`);
    };
    const tick = time => {
      frame = 0;
      // Time-based damping keeps the same feel on 60 Hz and 120 Hz displays.
      const elapsed = lastTime ? Math.min(time - lastTime, 50) : 16.67;
      lastTime = time;
      const follow = 1 - Math.exp(-elapsed / 85);
      const trail = 1 - Math.exp(-elapsed / 360);
      const impulse = Math.min(1, Math.hypot(target.x-green.x, target.y-green.y) / 12);
      energy += (impulse-energy) * (1-Math.exp(-elapsed/(impulse>energy?100:650)));
      for (const axis of ['x', 'y']) {
        green[axis] += (target[axis] - green[axis]) * follow;
        purple[axis] += (green[axis] - purple[axis]) * trail;
      }
      paint();
      if (Math.abs(target.x-purple.x)+Math.abs(target.y-purple.y) > .08 || energy > .002) frame = requestAnimationFrame(tick);
      else lastTime = 0;
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; lastTime = 0; };
    const reset = () => { stop(); energy = 0; target = {x:50,y:57}; green = {...target}; purple = {...target}; paint(); hero.classList.remove('is-tracking'); };
    const move = event => {
      if (motion.matches || !pointer.matches || !visible || document.hidden) return;
      bounds = hero.getBoundingClientRect();
      target = {x: (event.clientX-bounds.left)/bounds.width*100, y: (event.clientY-bounds.top)/bounds.height*100};
      hero.classList.add('is-tracking');
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const leave = () => {
      hero.classList.remove('is-tracking'); target = {x:50,y:57};
      if (!motion.matches && visible && !document.hidden && !frame) frame = requestAnimationFrame(tick);
    };
    const visibility = () => { hero.classList.toggle('energy-paused', !visible || document.hidden); if (!visible || document.hidden) reset(); };
    const observer = new IntersectionObserver(entries => {visible = entries[0].isIntersecting; visibility();});
    observer.observe(hero);
    const resize = new ResizeObserver(() => { bounds = hero.getBoundingClientRect(); paint(); });
    resize.observe(hero);
    paint();
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', leave);
    motion.addEventListener('change', reset);
    pointer.addEventListener('change', reset);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      stop(); observer.disconnect(); resize.disconnect(); glow.remove();
      hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave);
      motion.removeEventListener('change', reset); pointer.removeEventListener('change', reset);
      document.removeEventListener('visibilitychange', visibility);
    };
  }
  function siteHeader(route) {
    const active = (id, test = false) => route === id || test ? ' class="is-active" aria-current="page"' : '';
    const next = archive.upcomingEvents[0];
    return `<header class="site-header"><nav class="site-nav" aria-label="Primary navigation">
      <a class="site-brand" href="${routes.home}" aria-label="Instinct Groove — home"><span class="site-brand__mark" aria-hidden="true"></span><span class="site-brand__name">Instinct Groove</span></a>
      <button class="site-nav__toggle" type="button" aria-expanded="false" aria-controls="site-menu">Menu</button>
      <div class="site-nav__links" id="site-menu">
        <a${active('next-event')} href="${routes.next}">Next Event</a>
        <a${active('past-events',Boolean(archive.byId[route]?.past))} href="${routes.events}">Past Events</a>
        <a${active('artists',Boolean(content.artists[route]))} href="${routes.artists}">Artists</a>
        <a${active('gallery')} href="${routes.gallery}">Gallery</a>
        ${next?.ticketUrl ? `<a class="is-cta" href="${url(next.ticketUrl)}" target="_blank" rel="noreferrer">Tickets</a>` : ''}
        <a href="${url(links.instagram)}" target="_blank" rel="noreferrer">Instagram</a>
      </div></nav></header>`;
  }
  function setupNav() {
    const header = document.querySelector('.site-header');
    const toggle = header.querySelector('.site-nav__toggle');
    const close = () => {header.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');};
    toggle.addEventListener('click', () => {const open = header.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));});
    const escape = e => {if(e.key === 'Escape' && header.classList.contains('is-open')){close();toggle.focus();}};
    header.addEventListener('keydown', escape);
    const onScroll = () => header.classList.toggle('is-scrolled',window.scrollY > 24);
    onScroll(); window.addEventListener('scroll',onScroll,{passive:true});
    return () => {window.removeEventListener('scroll',onScroll);header.removeEventListener('keydown',escape);};
  }
  function eventCard(event) {
    const media = archive.mediaFor(event.id);
    const label = event.past ? (media.length ? `${media.filter(m=>m.type==='photo').length} photos` : 'Event details') : 'Upcoming';
    return `<a class="archive-card" href="${routeFor(event.id)}"><div class="archive-card-image">${imageTag(asset(event.cover),`${event.title} — ${event.posters.includes(event.cover) ? 'event poster' : 'event photograph'}`,{sizes:'(max-width: 720px) calc(100vw - 40px), (max-width: 1050px) 45vw, 390px'})}<span class="archive-badge">${esc(label)}</span></div><div class="archive-card-copy"><p>${eventDate(event)}</p><h3>${esc(event.title)}</h3><p>${esc(event.venue)}</p></div></a>`;
  }
  function renderArchive() {
    const years = [...new Set(archive.pastEvents.map(event=>event.date.slice(0,4)))];
    return `<article class="archive-shell">${pageHeading('The nights that brought us here','Past Events','Posters, lineups, photographs and memories. Every chapter stays here.')}${years.map(year=>`<section class="archive-section" aria-labelledby="year-${year}"><div class="archive-section-heading"><h2 id="year-${year}">${year}</h2><span>${archive.pastEvents.filter(event=>event.date.startsWith(year)).length} ${archive.pastEvents.filter(event=>event.date.startsWith(year)).length === 1 ? 'event' : 'events'}</span></div><div class="archive-card-grid">${archive.pastEvents.filter(event=>event.date.startsWith(year)).map(eventCard).join('')}</div></section>`).join('')||'<p>Our first event is still ahead. Watch this space.</p>'}</article>`;
  }
  function nextSpotlight() {
    const next = archive.upcomingEvents[0];
    return `<section class="archive-home-spotlight section-border"><div class="archive-shell"><p class="archive-kicker">Next Event</p>${next ? `<div class="archive-spotlight-grid"><div><h2>${esc(next.title)}</h2><p>${eventDate(next)} · ${esc(next.venue)}</p>${textLink(routeFor(next.id),'Explore the event')}${next.ticketUrl ? textLink(next.ticketUrl,'Tickets',true):''}</div><a class="archive-spotlight-poster" href="${routeFor(next.id)}">${imageTag(asset(next.posters[0]||next.cover),`${next.title} poster`,{sizes:'(max-width:720px) 100vw, 420px'})}</a></div>` : `<h2>See you at the next one.</h2><p>New event details will be announced here.</p><div class="archive-actions">${textLink(links.instagram,'Follow Instinct on Instagram',true)}${textLink(routes.events,'Explore past events')}</div>`}</div></section>`;
  }
  function homeArchive() {
    return `<section class="archive-shell archive-section"><div class="archive-section-heading"><h2>Past Events</h2>${textLink(routes.events,'View all past events →')}</div><div class="archive-card-grid">${archive.pastEvents.slice(0,3).map(eventCard).join('')}</div></section>`;
  }
  function homeGallery() {
    return `<section class="archive-shell archive-section archive-home-gallery"><p class="archive-kicker">Inside Instinct</p><h2>The room. The people. The groove.</h2><p>Explore photographs and film from the dance floor.</p>${textLink(routes.gallery,'Explore the Gallery →')}</section>`;
  }
  function renderNextEvent() {
    const next = archive.upcomingEvents[0];
    if(next) return renderEvent(next);
    return `<article class="archive-shell">${pageHeading('Next Event','More nights ahead.','New event details will be announced here. Until then, revisit the nights that brought us together.')}<div class="archive-actions">${textLink(links.instagram,'Follow Instinct on Instagram',true)}${textLink(routes.events,'All past events')}</div><section class="archive-section"><h2>Most recent event</h2><div class="archive-card-grid">${archive.pastEvents.slice(0,1).map(eventCard).join('')}</div></section></article>`;
  }
  function lineupCards(lineup) {
    return `<div class="archive-lineup-grid">${lineup.map(set=>{
      const lead = content.artists[set.profileId||set.artistIds[0]];
      return `<article class="archive-lineup-card"><span class="archive-lineup-image">${imageTag(asset(lead.portrait),lead.alt,{sizes:'(max-width:720px) 42vw, 260px'})}</span><div><h3>${esc(set.label)}</h3>${set.time?`<p>${esc(set.time)}</p>`:''}<div class="archive-actions">${set.profileId?textLink(routeFor(set.profileId),set.artistIds.length>1?'About this collaboration →':'Artist profile →'):''}${(!set.profileId||set.artistIds.length>1)?set.artistIds.map(id=>textLink(routeFor(id),content.artists[id].name+' →')).join(''):''}</div></div></article>`;
    }).join('')}</div>`;
  }
  function renderEvent(event) {
    const photos = archive.mediaFor(event.id);
    const neighbors = event.past ? archive.pastEvents : archive.upcomingEvents;
    const index = neighbors.findIndex(item=>item.id===event.id);
    const older = event.past ? neighbors[index+1] : null;
    const newer = event.past ? neighbors[index-1] : null;
    const announcement = event.announcements;
    const ticket = !event.past && event.ticketUrl;
    return `<article class="archive-shell archive-event"><a class="archive-back" href="${routes.events}">← All past events</a>
      ${pageHeading(event.past?'Event archive':'Upcoming event',event.title)}
      <p class="archive-event-meta">${eventDate(event)} · ${esc(event.venue)}${event.hours?`<br>${esc(event.hours)}`:''}${event.address?`<br>${esc(event.address)}`:''}</p>
      <div class="archive-actions">${photos.length?textLink(`./gallery.html?event=${event.id}`,'View event album →'):''}${ticket?textLink(ticket,'Get tickets',true):''}${event.sourceUrl?textLink(event.sourceUrl,'Original announcement',true):''}</div>
      ${event.intro?`<p class="archive-event-intro">${esc(event.intro)}</p>`:''}
      ${announcement.length?announcement.map(section=>`<section class="archive-section archive-event-chapter" id="${esc(section.id)}"><div class="archive-announcement-grid"><figure>${posterCard(section.poster,event,section.title)}</figure><div><p class="archive-kicker">${esc(section.id==='block-party'?'Outdoors':'After dark')}</p><h2>${esc(section.title)}</h2><p class="archive-event-meta">${esc(section.venue)}<br>${esc(section.hours)}</p>${!event.past&&section.ticketUrl?textLink(section.ticketUrl,'Get tickets',true):''}${section.copy.map(p=>`<p>${esc(p)}</p>`).join('')}${textLink(section.sourceUrl,'Original announcement',true)}</div></div><h3 class="archive-subheading">Lineup</h3>${lineupCards(section.lineup)}</section>`).join(''):`${event.posters.length?`<section class="archive-section archive-announcement-grid"><figure>${posterCard(event.posters[0],event)}</figure><div><p class="archive-kicker">The original flyer</p><h2>${event.past?'A night to remember.':'Join us on the dance floor.'}</h2><p>${eventDate(event)} · ${esc(event.venue)}</p>${event.age?`<p>${esc(event.age)}</p>`:''}${event.sourceUrl?textLink(event.sourceUrl,'Read the announcement',true):''}</div></section>`:''}<section class="archive-section"><h2>Lineup</h2>${lineupCards(event.lineup)}</section>`}
      ${photos.length?`<section class="archive-section" id="photos"><div class="archive-section-heading"><h2>From the night</h2>${textLink(`./gallery.html?event=${event.id}`,'Open album →')}</div><div class="archive-media-grid">${photos.map(mediaCard).join('')}</div>${creditLine(event)}${event.albumUrl?textLink(event.albumUrl,'Full photographer album ↗',true):''}</section>`:`<section class="archive-section archive-empty"><h2>The night stays here.</h2><p>The original event details and lineup are preserved here. Photos and videos can join them when available.</p></section>`}
      ${event.drinks?.length?`<details class="archive-details"><summary>From the original announcement: featured drinks</summary><div class="archive-lineup-grid">${event.drinks.map(drink=>`<article>${imageTag(asset(drink.image),drink.alt,{sizes:'(max-width:720px) 42vw, 280px'})}<h3>${esc(drink.name)}</h3>${drink.note?`<p>${esc(drink.note)}</p>`:''}</article>`).join('')}</div></details>`:''}
      <nav class="archive-pager" aria-label="Event navigation">${older?textLink(routeFor(older.id),`← ${older.title}`):'<span></span>'}${textLink(routes.events,'All events')}${newer?textLink(routeFor(newer.id),`${newer.title} →`):'<span></span>'}</nav>
    </article>`;
  }
  function posterCard(image,event,label=event.title) {
    return `<button type="button" class="archive-poster" data-poster="${esc(image)}" data-event="${esc(event.id)}" aria-label="Open ${esc(label)} poster">${imageTag(asset(image),`${label} original event poster`,{sizes:'(max-width:720px) calc(100vw - 40px), 480px'})}</button>`;
  }
  function creditLine(item) {return item.credit?`<p class="archive-credit">Photography: ${item.creditUrl?textLink(item.creditUrl,item.credit,true):esc(item.credit)}</p>`:'';}
  function renderDirectory() {
    const all = Object.values(content.artists).filter(artist=>!artist.memberIds).sort((a,b)=>a.name.localeCompare(b.name));
    return `<article class="archive-shell">${pageHeading('The people behind the sound','Artists','Every lineup is part of the story. Explore the artists and the nights they played.')}<label class="archive-search">Find an artist<input type="search" id="artist-search" placeholder="Search names" autocomplete="off"></label><p class="archive-result-count" id="artist-count" role="status">${all.length} artist profiles</p><section class="archive-section"><h2>All artists · A–Z</h2><div class="archive-artist-grid" id="artist-directory">${all.map(artistCard).join('')}</div><p id="artist-empty" hidden>No artists match that name. Try another spelling.</p></section></article>`;
  }
  function artistCard(artist) {
    const appearances = archive.appearancesFor(artist.id);
    const count = new Set(appearances.map(item=>item.event.id)).size;
    const portrait = imageTag(asset(artist.portrait),artist.alt,{sizes:'(max-width:720px) 42vw, 280px'});
    return `<a class="archive-artist-card" data-name="${esc(artist.name.toLowerCase())}" href="${routeFor(artist.id)}"><span class="archive-artist-image">${portrait}</span><div><h3>${esc(artist.name)}</h3><p>${artist.memberIds?'Collaboration · ':''}${count} ${count===1?'event':'events'}</p></div></a>`;
  }
  function renderArtist(artist) {
    const appearances = archive.appearancesFor(artist.id);
    const partners = [...new Set(appearances.filter(set=>set.b2b).flatMap(set=>set.artistIds).filter(id=>id!==artist.id))];
    return `<article class="archive-shell archive-artist"><a class="archive-back" href="${routes.artists}">← All artists</a><section class="archive-artist-hero"><figure>${imageTag(asset(artist.portrait),artist.alt,{sizes:'(max-width:720px) calc(100vw - 40px), 500px',priority:true})}${artist.imageCaption?`<figcaption>${esc(artist.imageCaption)}</figcaption>`:''}</figure><div>${pageHeading(artist.memberIds?'Instinct collaboration':'Instinct artist',artist.name)}<div class="archive-actions">${artist.socials.map(link=>textLink(link.href,link.label,true)).join('')}</div>${artist.memberIds?`<div class="archive-actions">${artist.memberIds.map(id=>textLink(routeFor(id),content.artists[id].name+' →')).join('')}</div>`:''}</div></section>${partners.length?`<section class="archive-section"><h2>B2B’d with</h2><div class="archive-actions">${partners.map(id=>textLink(routeFor(id),content.artists[id].name+' →')).join('')}</div></section>`:''}${artist.bio.length?`<section class="archive-section archive-bio"><h2>Bio</h2>${artist.bio.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`:''}<section class="archive-section"><h2>Played at Instinct</h2><div class="archive-appearances">${appearances.map(({event,time,section,venue,label})=>`<a class="archive-appearance" href="${routeFor(event.id)}"><div><p>${eventDate(event)}${!event.past?' · Upcoming':''}</p><h3>${esc(event.title)}</h3><p>${esc(section||venue||event.venue)}${section?` · ${esc(venue)}`:''}</p>${label!==artist.name?`<p>As ${esc(label)}</p>`:''}${time?`<p>Set: ${esc(time)}</p>`:''}</div><span aria-hidden="true">↗</span></a>`).join('')}</div></section>${artist.qas.length?`<section class="archive-section"><p class="archive-kicker">From the artist interview</p><h2>Quick questions</h2><div class="archive-qa-grid">${artist.qas.map(item=>`<article><h3>${esc(item.question)}</h3>${item.answer?`<p>${esc(item.answer)}</p>`:''}</article>`).join('')}</div></section>`:''}<div class="archive-actions">${textLink(routes.artists,'All artists')}${textLink(routes.events,'Explore past events')}</div></article>`;
  }
  function gallerySelection() {
    const params = new URLSearchParams(location.search);
    return {event:archive.byId[params.get('event')]?params.get('event'):'',type:['photo','video'].includes(params.get('type'))?params.get('type'):''};
  }
  function galleryItems(selection) {return archive.mediaFor(selection.event).filter(item=>!selection.type||item.type===selection.type);}
  function renderGallery() {
    const selection = gallerySelection();
    const items = galleryItems(selection);
    return `<article class="archive-shell">${pageHeading('Inside Instinct','Gallery','The room, the people and the moments in between. Photographs and film from Instinct.')}<section aria-label="Gallery filters" class="archive-filters"><div role="group" aria-label="Media type">${[['','All'],['photo','Photos'],['video','Videos']].map(([value,label])=>`<button type="button" data-type="${value}" aria-pressed="${selection.type===value}">${label}</button>`).join('')}</div><label>Event<select id="gallery-event"><option value="">All events</option>${archive.events.map(event=>`<option value="${esc(event.id)}"${selection.event===event.id?' selected':''}>${esc(event.title)} · ${esc(dateLabel(event))}</option>`).join('')}</select></label></section><p class="archive-result-count" id="gallery-count" role="status">${items.length} ${items.length===1?'item':'items'}</p><div id="gallery-results">${galleryResults(items,selection)}</div></article>`;
  }
  function galleryResults(items,selection,limits = {}) {
    if (!items.length) return '<div class="archive-empty"><h2>No media in this selection yet.</h2><p>Choose another event or switch back to All.</p></div>';
    const groups = new Map();
    for (const item of items) {
      const id = item.eventId || 'instinct-film';
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(item);
    }
    return [...groups].map(([id,media]) => {
      const event = archive.byId[id];
      const limit = limits[id] || 6;
      return `<section class="archive-section archive-gallery-group" data-gallery-group="${esc(id)}" aria-labelledby="album-${esc(id)}"><header class="archive-gallery-context"><h2 id="album-${esc(id)}">${esc(event?.title || 'Instinct film')}</h2>${event?`<p>${eventDate(event)} · ${esc(event.venue)}</p>${textLink(routeFor(event.id),'Explore this event →')}${creditLine(event)}`:''}</header><div class="archive-media-grid">${media.slice(0,limit).map(mediaCard).join('')}</div>${media.length>limit?`<button class="archive-more" type="button" data-gallery-more="${esc(id)}">Show more · ${media.length-limit} remaining<span class="visually-hidden"> in ${esc(event?.title || 'Instinct film')}</span></button>`:''}</section>`;
    }).join('');
  }
  function mediaCard(item) {
    return `<button type="button" class="archive-media-card ${item.type==='video'?'is-video':''}" data-media="${esc(item.id)}" aria-label="${esc(item.type==='video'?'Play '+item.title:'Open '+item.alt)}"><span class="archive-media-image">${imageTag(asset(item.image),item.alt,{sizes:'(max-width:720px) 42vw, (max-width:1050px) 45vw, 390px'})}${item.type==='video'?`<span class="archive-play">▶ Play · ${esc(item.duration)}</span>`:''}</span></button>`;
  }
  function setupFilters(route) {
    if(route==='artists') {
      const search = document.getElementById('artist-search');
      search.addEventListener('input',()=>{
        let count=0;
        document.querySelectorAll('#artist-directory .archive-artist-card').forEach(card=>{card.hidden=!card.dataset.name.includes(search.value.trim().toLowerCase());if(!card.hidden)count++;});
        document.getElementById('artist-count').textContent=`${count} artist ${count===1?'profile':'profiles'}`;
        document.getElementById('artist-empty').hidden=count>0;
      });
    }
    if(route==='gallery') {
      let selection=gallerySelection();
      let limits={};
      const update=(reset = true)=>{
        if(reset)limits={};
        const items=galleryItems(selection);
        document.querySelectorAll('[data-type]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.type===selection.type)));
        document.getElementById('gallery-results').innerHTML=galleryResults(items,selection,limits);
        document.getElementById('gallery-count').textContent=`${items.length} ${items.length===1?'item':'items'}`;
        const params=new URLSearchParams();if(selection.event)params.set('event',selection.event);if(selection.type)params.set('type',selection.type);
        history.replaceState(null,'',`./gallery.html${params.size?'?'+params:''}`);
      };
      document.getElementById('gallery-results').addEventListener('click',e=>{
        const button=e.target.closest('[data-gallery-more]');
        if(!button)return;
        const id=button.dataset.galleryMore;
        const previousLimit=limits[id]||6;
        limits[id]=previousLimit+12;
        update(false);
        document.querySelector(`[data-gallery-group="${id}"]`).querySelectorAll('[data-media]')[previousLimit]?.focus();
      });
      document.querySelectorAll('[data-type]').forEach(button=>button.addEventListener('click',()=>{selection.type=button.dataset.type;update();}));
      document.getElementById('gallery-event').addEventListener('change',e=>{selection.event=e.target.value;update();});
    }
    return ()=>{};
  }
  function setupViewer() {
    const dialog = document.getElementById('media-viewer');
    const stage = dialog.querySelector('.viewer-stage');
    const caption = dialog.querySelector('.viewer-caption');
    const previous = dialog.querySelector('[data-previous]');
    const next = dialog.querySelector('[data-next]');
    const close = dialog.querySelector('[data-close]');
    let items=[],index=0,trigger;
    const show=()=>{
      const item=items[index];const event=archive.byId[item.eventId];
      stage.innerHTML=item.type==='video'?`<video controls playsinline preload="metadata" poster="${url(asset(item.image))}" aria-label="${esc(item.title)}"><source src="${url(item.src)}" type="video/mp4">Your browser cannot play this video. ${textLink(item.src,'Open video',true)}</video>`:imageTag(asset(item.image),item.alt,{sizes:'90vw',priority:true});
      caption.innerHTML=`<p><span class="viewer-counter">${index+1} / ${items.length}</span></p>${item.credit?`<p>Photography: ${item.creditUrl?textLink(item.creditUrl,item.credit,true):esc(item.credit)}</p>`:''}${event?textLink(routeFor(event.id),'View event →'):''}`;
      previous.disabled=index===0;next.disabled=index===items.length-1;
      if(document.activeElement===previous&&previous.disabled)close.focus();if(document.activeElement===next&&next.disabled)close.focus();
    };
    const open=e=>{
      const button=e.target.closest('[data-media], [data-poster]');if(!button)return;
      trigger=button;
      if(button.dataset.poster){items=[{type:'photo',image:button.dataset.poster,eventId:button.dataset.event,caption:'Original event poster',alt:`${archive.byId[button.dataset.event].title} original event poster`}];index=0;}
      else {items=getRoute()==='gallery'?galleryItems(gallerySelection()):[...document.querySelectorAll('[data-media]')].map(el=>content.media[el.dataset.media]).filter(Boolean);index=items.findIndex(item=>item.id===button.dataset.media);}
      if(index<0)return;
      show();dialog.showModal();document.body.classList.add('no-scroll');close.focus();
    };
    const step=delta=>{const target=index+delta;if(target<0||target>=items.length)return;index=target;show();};
    const onClose=()=>{stage.innerHTML='';caption.innerHTML='';document.body.classList.remove('no-scroll');trigger?.focus();};
    const onKey=e=>{if(e.target.tagName==='VIDEO')return;if(e.key==='ArrowRight'){e.preventDefault();step(1);}if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}};
    const onBackdrop=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};
    const prevClick=()=>step(-1),nextClick=()=>step(1),closeClick=()=>dialog.close();
    document.getElementById('app').addEventListener('click',open);
    previous.addEventListener('click',prevClick);next.addEventListener('click',nextClick);close.addEventListener('click',closeClick);
    dialog.addEventListener('close',onClose);dialog.addEventListener('keydown',onKey);dialog.addEventListener('click',onBackdrop);
    return()=>{if(dialog.open)dialog.close();onClose();document.getElementById('app').removeEventListener('click',open);previous.removeEventListener('click',prevClick);next.removeEventListener('click',nextClick);close.removeEventListener('click',closeClick);dialog.removeEventListener('close',onClose);dialog.removeEventListener('keydown',onKey);dialog.removeEventListener('click',onBackdrop);};
  }
  function homePreviewMedia(posterName,alt) {
    return `<video autoplay muted loop playsinline preload="metadata" poster="${url(asset(posterName))}" aria-label="${esc(alt)}"><source src="./assets/home-preview.mp4" type="video/mp4">${imageTag(asset(posterName),alt,{sizes:'(max-width:720px) 342px, 420px'})}</video>`;
  }
  function siteFooter() {
    return `<footer class="site-footer"><div class="site-footer__inner"><a class="site-footer__brand" href="${routes.home}">Instinct Groove</a><nav class="archive-footer-links" aria-label="Footer navigation">${textLink(routes.events,'Past Events')}${textLink(routes.artists,'Artists')}${textLink(routes.gallery,'Gallery')}</nav><div class="site-footer__contacts"><a href="${url(links.instagram)}" target="_blank" rel="noreferrer">@Instinct.groove</a><a href="${url(links.email)}">Info@instinctgroove.net</a></div><p>Ottawa's Minimal Tech &amp; House Experience</p></div></footer>`;
  }
  function homeDefinition() {
    return `<section class="home-definition section-border" aria-label="The meaning of Instinct"><div class="home-definition__inner"><p class="home-definition__label">Instinct <span>/ noun</span></p><p class="home-definition__text">Instinct is a natural unlearned and innate drive to act in a certain way in response to specific stimuli, often without conscious thought.</p></div></section>`;
  }
  function renderHome() {
    if (mobileMedia.matches) return `<div class="with-mobile">${renderMobileHome()}</div>`;
    return `
      <div class="with-mobile">
        <div class="desktop-view">
          <h1 class="visually-hidden">Instinct Groove</h1>
          <div class="home-opening">
          <section class="home-hero">
            ${imageTag(asset('home-hero'), 'Instinct Groove artwork', { className: 'home-hero__image', sizes: '100vw', priority: true })}
          </section>

          ${homeDefinition()}
          </div>

          <section class="preview-panel section-border">
            <div class="preview-panel__inner">
              <h2><span>Inside</span> Instinct</h2>
              <div class="preview-panel__media">
                ${homePreviewMedia('home-preview', 'Event preview atmosphere')}
              </div>
            </div>
          </section>

          ${nextSpotlight()}

          <section class="about-section section-border">
            <div class="section-kicker"><span></span>About the Event</div>
            <div class="about-grid">
              <div>
                <h2>Behind the Sound</h2>
                <div class="green-line"></div>
                <p>Instinct is the product of three friends brought together by a shared love for minimal tech and house: genres they felt were missing from Ottawa nightlife. What started as a simple idea quickly grew into one of the city's first events dedicated to minimal sounds, opening the door for fresh energy and a new crowd.</p>
                <p>The concept was shaped by intimate European venues, stripped-back sounds, and immersive atmospheres. Each event transforms the space with cascading greenery and vine-covered details, turning the venue into a raw underground environment.</p>
                <p>At the centre of it all is Stinc, the octopus: Instinct's mascot and a symbol of instinct itself, fluid, adaptable, and deeply connected.</p>
              </div>
              <figure>
                ${imageTag(asset('home-team'), 'The Instinct Groove crew', { sizes: '(max-width: 1050px) calc(100vw - 48px), 576px' })}
                <figcaption>The Crew</figcaption>
              </figure>
            </div>
          </section>

          ${homeArchive()}
          ${homeGallery()}
        </div>
      </div>
    `;
  }

  function renderMobileHome() {
    return `
      <div class="mobile-view mobile-home">
        <h1 class="visually-hidden">Instinct Groove</h1>
        <div class="home-opening">
        <section class="mobile-home-hero">
          ${imageTag(asset('mobile-mcp-home-hero'), 'Instinct Groove artwork', { sizes: '390px', priority: true })}
          <p class="mobile-home-welcome">Welcome to.....</p>
        </section>
        ${homeDefinition()}
        </div>
        <section class="mobile-home-section mobile-home-preview">
          <div class="mobile-section-label"><span></span>Inside Instinct</div>
          <div class="mobile-home-video">
            ${homePreviewMedia('mobile-home-preview', 'Event preview')}
          </div>
        </section>
        ${nextSpotlight()}
        <section class="mobile-home-section mobile-home-about">
          <div class="mobile-section-label"><span></span>About the Event</div>
          <h2>Behind the Sound</h2>
          <i></i>
          <p>Instinct is the product of three friends brought together by a shared love for minimal tech and house—genres they felt were missing from Ottawa's nightlife. What started as a simple idea quickly grew into one of the city's first events dedicated to minimal sounds, opening the door for a fresh energy and a new kind of crowd.</p>
          <details>
            <summary>+ Read More</summary>
            <p>The concept was shaped by intimate European venues, stripped-back sounds, and immersive atmospheres. Each event transforms the space with cascading greenery and vine-covered details, turning the venue into a raw underground environment.</p>
          </details>
        </section>
        <section class="mobile-home-section mobile-home-crew">
          <h2>The Crew</h2>
          <div>
            ${imageTag(asset('mobile-mcp-home-crew'), 'The Instinct Groove crew', { sizes: '342px' })}
          </div>
        </section>
        ${homeArchive()}
        ${homeGallery()}
      </div>
    `;
  }


  mobileMedia.addEventListener('change',render);
  window.addEventListener('popstate',render);
  function refreshStatus(){const fresh=window.INSTINCT_ARCHIVE.create(content);if(fresh.pastEvents.map(event=>event.id).join('|')!==statusKey)render();}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshStatus();});
  window.setInterval(refreshStatus,60000);
  render();
}());
