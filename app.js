(function () {
  const asset = (name) => `./assets/${name}.png`;
  const routes = {
    home: './index.html',
    next: './next-event.html',
    vol1: './vol-1.html',
    vol2: './vol-2.html',
    vol3: './vol-3.html',
    vol4: './vol-4.html',
    djCobb: './dj-cobb.html',
    sebBalla: './seb-b-balla.html',
    babyjake: './babyjake.html',
    ty: './ty-groove.html',
    seb: './seb-couture.html',
    dose: './dose.html'
  };

  const links = {
    tickets: 'https://simpli.events/e/Instinctgroove',
    mobileTickets: 'https://simpli.events/e/minimal-afterparty-instinct-annx',
    instagram: 'https://www.instagram.com/instinct.groove?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
    email: 'mailto:Info@instinctgroove.net',
    vol1Photos: 'https://www.amazon.ca/photos/share/hd6a0KdI2dAZxDCE4eaotcu17Nv4ZzNjFgM6xWcwHdU',
    vol3Photos: 'https://drive.google.com/drive/folders/1IrkD4W7mA4Zn4aVnKx7xN2WxENsm5GLd?usp=sharing',
    mystic: 'https://www.instagram.com/mysticdoesmedia?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
    curtis: 'https://www.instagram.com/_curtisperry?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=='
  };

  const lineupNext = [
    { name: 'Ty Groove', href: routes.ty, image: asset('next-ty') },
    { name: 'Seb Couture', href: routes.seb, image: asset('next-seb') },
    { name: 'D.O.S.E', href: routes.dose, image: asset('next-dose') }
  ];

  const mobileLineupNext = [
    { name: 'DJ Cobb', href: routes.djCobb, image: asset('mobile-mcp-next-dj-cobb'), position: 'center 36%' },
    { name: 'Seb B b2b Balla', href: routes.sebBalla, image: asset('mobile-mcp-next-seb-balla'), position: 'center 59%' },
    { name: 'Baby Jake', href: routes.babyjake, image: asset('mobile-mcp-next-babyjake'), position: 'center 50%' }
  ];

  const recaps = {
    'vol-1': {
      title: 'Vol. 1',
      eyebrow: 'Event Recap',
      date: 'November 21st, 2025 - ANNX',
      intro: 'The first Instinct event marked the moment everything became real. What started as an idea between three friends came to life in a packed room, filled with energy, movement, and a sound that felt new to the city. From the vine-covered space to the deep, rolling minimal grooves, every detail clicked, creating an atmosphere that was both intimate and electric.',
      layout: 'masonry',
      photoUrl: links.vol1Photos,
      photos: [
        asset('vol1-photo1'),
        asset('vol1-photo2'),
        asset('vol1-photo3'),
        asset('vol1-photo4'),
        asset('vol1-photo7'),
        asset('vol1-photo5'),
        asset('vol1-photo6')
      ],
      lineup: [
        { name: 'VIQ', image: asset('vol1-lineup-viq') },
        { name: 'Danford b2b Enko', image: asset('vol1-lineup-danford') },
        { name: 'Zaq Black', image: asset('vol1-lineup-zaq') }
      ],
      mobile: {
        title: 'Vol.1',
        date: 'November 2025 · ANNX',
        poster: asset('mobile-mcp-vol1-poster'),
        tags: ['VIQ', 'Danford b2b ENko', 'ZAKBLACK'],
        credit: 'Photos By: @Mysticdoesmedia',
        creditUrl: links.mystic,
        photos: [
          asset('mobile-mcp-vol1-photo1'),
          asset('mobile-mcp-vol1-photo2'),
          asset('mobile-mcp-vol1-photo3'),
          asset('mobile-mcp-vol1-photo4'),
          asset('mobile-mcp-vol1-photo5'),
          asset('mobile-mcp-vol1-photo6')
        ],
        previousLabel: 'Home',
        previousHref: routes.home,
        nextLabel: 'Vol. 2',
        nextHref: routes.vol2
      }
    },
    'vol-2': {
      title: 'Vol. 2',
      eyebrow: 'Event Recap',
      date: 'January 23rd, 2026 - ANNX',
      intro: 'The second Instinct event built on that momentum, elevating the atmosphere to another level. With the addition of deep purple lighting woven through the vine-covered space, the room took on a darker, more immersive energy that perfectly matched the sound. The vibe felt tighter, more intentional, and fully in sync with the vision.',
      layout: 'split',
      photos: [
        asset('vol2-photo1'),
        asset('vol2-photo4'),
        asset('vol2-photo2'),
        asset('vol2-photo3'),
        asset('vol2-photo6'),
        asset('vol2-photo7'),
        asset('vol2-photo5')
      ],
      lineup: [
        { name: 'MAC:D', image: asset('vol2-lineup-macd') },
        { name: 'Chefnier b2b Moose', image: asset('vol2-lineup-chefnier') },
        { name: 'Benvi', image: asset('vol2-lineup-benvi') }
      ],
      mobile: {
        title: 'Vol.2',
        date: 'January 2026 · ANNX',
        poster: asset('mobile-mcp-vol2-poster'),
        tags: ['Mac:D', 'Chefnier B2b Moose', 'Benvi'],
        credit: 'Photos By: THE DIGI',
        photos: [
          asset('mobile-mcp-vol2-photo1'),
          asset('mobile-mcp-vol2-photo2'),
          asset('mobile-mcp-vol2-photo3'),
          asset('mobile-mcp-vol2-photo4'),
          asset('mobile-mcp-vol2-photo5'),
          asset('mobile-mcp-vol2-photo6')
        ],
        previousLabel: 'Home',
        previousHref: routes.home,
        nextLabel: 'Vol. 3',
        nextHref: routes.vol3
      }
    },
    'vol-3': {
      title: 'Vol. 3',
      eyebrow: 'Event Recap',
      date: 'March 6th, 2026 - ANNX',
      intro: 'Vol. 3 proved that each event keeps leveling up. The vision felt sharper, the crowd more locked in, and the energy from start to finish was undeniable. Everything from the atmosphere to the sound hit harder and flowed smoother, with feature cocktails adding another layer to the experience: creative, unique, and just as dialed in as the music.',
      layout: 'centered',
      photoUrl: links.vol3Photos,
      photos: [
        asset('vol3-photo1'),
        asset('vol3-photo2'),
        asset('vol3-photo3'),
        asset('vol3-photo4'),
        asset('vol3-photo5'),
        asset('vol3-photo6'),
        asset('vol3-photo7'),
        asset('vol3-photo8'),
        asset('vol3-photo9')
      ],
      lineup: [
        { name: '50nic', image: asset('vol3-lineup-50nic') },
        { name: 'Comfort', image: asset('vol3-lineup-comfort') },
        { name: 'Babyjake', image: asset('vol3-lineup-babyjake') }
      ],
      mobile: {
        title: 'Vol.3',
        date: 'March 2026 · ANNX',
        poster: asset('mobile-mcp-vol3-poster'),
        tags: ['50nic', 'Comfort', 'Babyjake'],
        credit: 'Photos By: @Mysticdoesmedia',
        creditUrl: links.mystic,
        photos: [
          asset('mobile-mcp-vol3-photo1'),
          asset('mobile-mcp-vol3-photo2'),
          asset('mobile-mcp-vol3-photo3'),
          asset('mobile-mcp-vol3-photo4'),
          asset('mobile-mcp-vol3-photo5'),
          asset('mobile-mcp-vol3-photo6')
        ],
        previousLabel: 'Home',
        previousHref: routes.home,
        nextLabel: 'Vol. 4',
        nextHref: routes.vol4
      }
    },
    'vol-4': {
      title: 'Vol. 4',
      eyebrow: 'Event Recap',
      date: 'April 2026 - City at Night',
      intro: 'Vol. 4 carried Instinct into a new room with a sharper club feel, keeping the same minimal groove while letting the purple-lit City at Night energy take over. The night brought a focused lineup, a packed dance floor, and another chapter in the sound the crew is building.',
      layout: 'centered',
      photoUrl: links.curtis,
      photos: [
        asset('mobile-mcp-vol4-photo1'),
        asset('mobile-mcp-vol4-photo2'),
        asset('mobile-mcp-vol4-photo3'),
        asset('mobile-mcp-vol4-photo4'),
        asset('mobile-mcp-vol4-photo5'),
        asset('mobile-mcp-vol4-photo6')
      ],
      lineup: [
        { name: 'Tygroove', image: asset('next-ty') },
        { name: 'Seb Couture', image: asset('next-seb') },
        { name: 'D.O.S.E', image: asset('next-dose') }
      ],
      mobile: {
        title: 'Vol.4',
        date: 'April 2026 · City at Night',
        poster: asset('mobile-mcp-vol4-poster'),
        tags: ['Tygroove', 'Seb couture', 'd.o.s.e'],
        credit: 'Photos By: @_Curtisperry',
        creditUrl: links.curtis,
        photos: [
          asset('mobile-mcp-vol4-photo1'),
          asset('mobile-mcp-vol4-photo2'),
          asset('mobile-mcp-vol4-photo3'),
          asset('mobile-mcp-vol4-photo4'),
          asset('mobile-mcp-vol4-photo5'),
          asset('mobile-mcp-vol4-photo6')
        ],
        previousLabel: 'Home',
        previousHref: routes.home,
        nextLabel: 'Vol. 1',
        nextHref: routes.vol1
      }
    }
  };

  const artists = {
    'ty-groove': {
      name: 'Ty Groove',
      setTime: '10PM - 11:30pm',
      bio: 'I started to DJ back in 2022 after having found a love for House and Dance Music from attending multiple festivals and sets in Montreal with some great friends.',
      socials: [
        { label: 'Instagram', href: 'https://www.instagram.com/tyler_mitche11?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==' },
        { label: 'SoundCloud', href: 'https://on.soundcloud.com/uoigNFNPZ2Bue1Slur' }
      ],
      band: asset('ty-band'),
      portrait: asset('ty-portrait'),
      lower: asset('ty-lower'),
      qas: [
        { question: "What's a song that gets you lost in the groove?", answer: 'Oblivion by Kerri Chandler' },
        { question: 'What genres do you secretly enjoy but have never played in a set?', answer: 'Hard groove Techno and Trance Classics. Would totally play if the opportunity presented itself.' },
        { question: 'Favourite BPM?', answer: "Good Ol' 128 BPM. Can't go wrong." }
      ]
    },
    'seb-couture': {
      name: 'Seb Couture',
      setTime: '11:30pm - 1:00am',
      bio: 'Sebastian Couture is an Ottawa-based DJ and producer whose musical roots began behind the drums, growing up in a family immersed in music. Drawn to the energy of the dance floor, he transitioned from a career in sales to fully pursue music, studying production while developing his craft as a DJ. His sound is shaped by festivals, raves, and underground parties across Miami, Europe, and Tulum.',
      socials: [
        { label: 'Instagram', href: 'https://www.instagram.com/sebastian_couture?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==' },
        { label: 'SoundCloud', href: 'https://tr.ee/pckFnVF9bI' }
      ],
      band: asset('seb-band'),
      portrait: asset('seb-portrait'),
      lower: asset('seb-lower'),
      qas: [
        { question: 'What song would ignite the dance floor if you dropped at a dj set?', answer: 'Back & Forth - Fedde Le Grand, Mr V - Tony Romera 2025 rework' },
        { question: 'Which genre apart from Minimal are you really feeling these days?', answer: 'Lately I have been into the Breakbeat vibe: funky, swingy drums and refreshed retro sounds.' },
        { question: 'Favourite BPM?', answer: 'My sets usually range from 126 BPM into the mid 130s. I love controlling energy and creating dips and peaks.' }
      ]
    },
    dose: {
      name: 'D.O.S.E',
      setTime: '1:00am - 2:30am',
      bio: 'I am a house DJ and producer based out of Ottawa, recently making strides in the industry. Captivating audiences with underground house and deep minimal grooves, mixed with old-school disco and soul, D.O.S.E keeps each selection constantly moving.',
      socials: [
        { label: 'Instagram', href: 'https://www.instagram.com/d.o.s.e.music?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==' },
        { label: 'Youtube', href: 'https://www.youtube.com/watch?v=JTqPRcelXSs&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGntHhnA5lUeyjB5QxaOU9eQtpJYGM6kKJqk6KmtomrKV_ATGEwk3vgoh2gIgI_aem_diVbeksgRDlVhUG6FWVoig' }
      ],
      band: asset('dose-band'),
      portrait: asset('dose-portrait'),
      lower: asset('dose-lower'),
      qas: [
        { question: 'Favourite Dj?', answer: 'Ruze' },
        { question: 'What genres do you secretly enjoy but have never played in a set?', answer: 'UKG' },
        { question: 'Favourite BPM?', answer: '124-128' }
      ]
    },
    'dj-cobb': {
      name: 'DJ Cobb',
      setTime: '11:30pm - 1:00am',
      bio: 'DJ Cobb is a dance music DJ focusing on house, tech house, and minimal sounds, with a passion for creating groovy sets that keep people moving from start to finish.',
      socials: [
        { label: 'Instagram', href: 'https://www.instagram.com/j_francoeur13?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==' }
      ],
      band: asset('mobile-mcp-artist-dj-cobb-hero'),
      portrait: asset('mobile-mcp-artist-dj-cobb-photo'),
      lower: asset('mobile-mcp-artist-dj-cobb-hero'),
      qas: [
        { question: "Favourite DJ set you've been to?", answer: "Cloonee at a New City Gas afterparty - it's the set that pushed me to start DJing." },
        { question: 'What are you doing if the decks die mid-set?', answer: 'Have some shots.' },
        { question: 'Favorite drunk food?', answer: 'Shawarma and another beer.' }
      ],
      mobile: {
        hero: asset('mobile-mcp-artist-dj-cobb-hero'),
        feature: asset('mobile-mcp-artist-dj-cobb-photo'),
        accent: '#9900ff',
        bio: [
          'DJ Cobb is a dance music DJ focusing on house, tech house, and minimal sounds, with a passion for creating groovy sets that keep people moving from start to finish.',
          "After three years behind the decks and diving into music production, he's constantly exploring new sounds and finding new ways to build energy on the dance floor.",
          'Inspired by friends who DJ and a love for electronic music, DJ Cobb brings a groove-driven style that blends clean transitions, infectious rhythms, and good vibes.'
        ],
        nav: [
          { label: '← Seb B/Balla', href: routes.sebBalla },
          { label: '← BabyJake', href: routes.babyjake }
        ]
      }
    },
    'seb-b-balla': {
      name: 'Seb B b2b Balla',
      setTime: '11:30pm - 1:00am',
      bio: 'Seb B b2b Balla is a high-energy back-to-back pairing that blends deep, driving techno with euphoric peaks and hypnotic grooves.',
      socials: [
        { label: 'Seb B', href: 'https://www.instagram.com/seb.belanger?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==' },
        { label: 'Balla', href: 'https://www.instagram.com/gab.balladelli?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==' }
      ],
      band: asset('mobile-mcp-artist-seb-balla-hero'),
      portrait: asset('mobile-mcp-artist-seb-balla-photo'),
      lower: asset('mobile-mcp-artist-seb-balla-hero'),
      qas: [
        { question: 'Fun Fact', answer: "Founder of Frequency Shift- Ottawas largest emerging dance themed event company." },
        { question: 'Never pre planned a set, always go with the flow.', answer: '' },
        { question: 'Professional Drink and rallier', answer: 'Preferred drink of choice- jaggerbomb.' }
      ],
      mobile: {
        hero: asset('mobile-mcp-artist-seb-balla-hero'),
        feature: asset('mobile-mcp-artist-seb-balla-photo'),
        accent: '#9b5de5',
        bio: [
          'Seb B b2b Balla is a high-energy back-to-back pairing that blends deep, driving techno with euphoric peaks and hypnotic grooves. Together they craft a seamless sonic journey that moves effortlessly between pounding rhythms and melodic tension, building a dancefloor connection that only comes from two DJs in perfect sync. These two are the dumb and dumber duo of the century.'
        ],
        nav: [
          { label: '← Dj Cobb', href: routes.djCobb },
          { label: 'BabyJake →', href: routes.babyjake }
        ]
      }
    },
    babyjake: {
      name: 'BabyJake',
      setTime: '1:00am - 2:30am',
      bio: 'BabyJake is a 22 year old producer who has spent the last 5 years perfecting his craft of creating original house tracks.',
      socials: [
        { label: 'Instagram', href: 'https://www.instagram.com/jakee.hill?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==' },
        { label: 'Spotify', href: 'https://open.spotify.com/artist/62wwMykR0Wt6oaLkDVYlR1?si=8QfLLu4jSTKiE6B4Lsu79g' }
      ],
      band: asset('mobile-mcp-artist-babyjake-hero'),
      portrait: asset('mobile-mcp-artist-babyjake-photo'),
      lower: asset('mobile-mcp-artist-babyjake-hero'),
      qas: [
        { question: "Best set I've been to?", answer: 'Above and Beyond' },
        { question: 'What would you do if the decks die?', answer: 'AP at my place' },
        { question: 'Favourite drunk food?', answer: 'Gotta be the shawarma beside City at Night' }
      ],
      mobile: {
        hero: asset('mobile-mcp-artist-babyjake-hero'),
        feature: asset('mobile-mcp-artist-babyjake-photo'),
        accent: '#9900ff',
        bio: [
          'BabyJake is a 22 year old producer who has spent the last 5 years perfecting his craft of creating original house tracks. His deep love for electronic music is fueled by the unity and freedom that the dance floor offers.',
          'Having more years producing under his belt than DJing, his trained ear is focused on crystal clear mixes with influences from disco, minimal, and old school progressive house.'
        ],
        nav: [
          { label: '← Seb B/Balla', href: routes.sebBalla },
          { label: '← Dj Cobb', href: routes.djCobb }
        ]
      }
    }
  };

  function getRoute() {
    const file = window.location.pathname.split('/').pop() || 'index.html';
    return file.replace('.html', '') || 'index';
  }

  function render() {
    const app = document.getElementById('app');
    const route = getRoute();
    let page = '';

    if (route === 'index') {
      page = renderHome();
    } else if (route === 'next-event') {
      page = renderNextEvent();
    } else if (recaps[route]) {
      page = renderRecap(recaps[route]);
    } else if (artists[route]) {
      page = renderArtist(artists[route]);
    } else {
      page = renderMissing();
    }

    app.innerHTML = `${siteHeader(route)}${page}${siteFooter()}`;
    setupLightbox();
    document.documentElement.dataset.route = route;
  }

  function siteHeader(route) {
    const isRecap = Boolean(recaps[route]);
    const isArtist = Boolean(artists[route]);
    const linkClass = (name) => (route === name ? ' class="is-active"' : '');

    return `
      <header class="site-header">
        <nav class="site-nav" aria-label="Primary navigation">
          <a class="site-brand ${route === 'index' ? 'is-active' : ''}" href="${routes.home}">
            <span aria-hidden="true">IG</span>
            <strong>Instinct Groove</strong>
          </a>
          <div class="site-nav__links">
            <a${linkClass('next-event')} href="${routes.next}">Next Event</a>
            <details class="site-nav-menu ${isRecap ? 'is-active' : ''}">
              <summary>Recaps</summary>
              <div>
                <a${linkClass('vol-1')} href="${routes.vol1}">Vol. 1</a>
                <a${linkClass('vol-2')} href="${routes.vol2}">Vol. 2</a>
                <a${linkClass('vol-3')} href="${routes.vol3}">Vol. 3</a>
                <a${linkClass('vol-4')} href="${routes.vol4}">Vol. 4</a>
              </div>
            </details>
            <details class="site-nav-menu ${isArtist ? 'is-active' : ''}">
              <summary>Artists</summary>
              <div>
                <a${linkClass('dj-cobb')} href="${routes.djCobb}">DJ Cobb</a>
                <a${linkClass('seb-b-balla')} href="${routes.sebBalla}">Seb B/Balla</a>
                <a${linkClass('babyjake')} href="${routes.babyjake}">BabyJake</a>
                <a${linkClass('ty-groove')} href="${routes.ty}">Ty Groove</a>
                <a${linkClass('seb-couture')} href="${routes.seb}">Seb Couture</a>
                <a${linkClass('dose')} href="${routes.dose}">D.O.S.E</a>
              </div>
            </details>
            <a href="${links.mobileTickets}" target="_blank" rel="noreferrer">Tickets</a>
            <a href="${links.instagram}" target="_blank" rel="noreferrer">Instagram</a>
          </div>
        </nav>
      </header>
    `;
  }

  function renderHome() {
    return `
      <div class="with-mobile">
        <div class="desktop-view">
          <section class="home-hero section-border">
            <img class="home-hero__image" src="${asset('home-hero')}" alt="Instinct Groove artwork">
            <p class="home-hero__tagline">Instinct is a natural unlearned and innate drive to act in a certain way in response to specific stimuli, often without conscious thought.</p>
          </section>

          <section class="preview-panel section-border">
            <img src="${asset('home-preview')}" alt="Event preview atmosphere">
            <h2><span>Event</span> Preview</h2>
          </section>

          <section class="next-card section-border">
            <a class="next-card__poster" href="${routes.next}" aria-label="Open next event">
              <img src="${asset('home-next-poster')}" alt="Next event poster">
            </a>
            <a class="split-heading" href="${routes.next}"><span>Next</span> Event</a>
            <p>Click for more info......</p>
          </section>

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
                <img src="${asset('home-team')}" alt="The Instinct Groove crew">
                <figcaption>The Crew</figcaption>
              </figure>
            </div>
          </section>

          <section class="previous-events section-border">
            <h2>Previous Events</h2>
            <div class="event-tiles">
              ${eventTile(routes.vol1, asset('home-vol1-thumb'), 'Vol. 1')}
              ${eventTile(routes.vol2, asset('home-vol2-thumb'), 'Vol. 2')}
              ${eventTile(routes.vol3, asset('home-vol3-thumb'), 'Vol. 3')}
            </div>
          </section>

          <section class="tickets-strip">
            <img src="${asset('home-tickets')}" alt="">
            <div>
              <h2><span>Get</span> Tickets</h2>
              <p>Limited capacity - Early bird pricing available</p>
              <a class="button button--solid" href="${links.tickets}" target="_blank" rel="noreferrer">Buy Tickets</a>
            </div>
          </section>
        </div>
        ${renderMobileHome()}
      </div>
    `;
  }

  function renderMobileHome() {
    return `
      <div class="mobile-view mobile-home">
        <section class="mobile-home-hero">
          <img src="${asset('mobile-mcp-home-hero')}" alt="Instinct Groove artwork">
          <p class="mobile-home-welcome">Welcome to.....</p>
          <p class="mobile-home-tagline">Instinct is a natural unlearned and innate drive to act in a certain way in response to specific stimuli, often without conscious thought.</p>
        </section>
        <section class="mobile-home-section mobile-home-preview">
          <div class="mobile-section-label"><span></span>Event Preview</div>
          <div class="mobile-home-video">
            <img src="${asset('mobile-home-preview')}" alt="Event preview">
          </div>
        </section>
        <section class="mobile-home-section mobile-home-next-card">
          <h2><span>Next</span> Event</h2>
          <a href="${routes.next}" class="mobile-home-poster">
            <img src="${asset('mobile-mcp-home-next-poster')}" alt="Next event poster">
          </a>
          <p>Click for more info......</p>
        </section>
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
            <img src="${asset('mobile-mcp-home-crew')}" alt="The Instinct Groove crew">
          </div>
        </section>
        <section class="mobile-home-section mobile-home-events">
          <h2>Previous Events</h2>
          ${mobileHomeEvent(routes.vol1, asset('mobile-mcp-home-vol1'), 'Vol. 1')}
          ${mobileHomeEvent(routes.vol2, asset('mobile-mcp-home-vol2'), 'Vol. 2')}
          ${mobileHomeEvent(routes.vol3, asset('mobile-mcp-home-vol3'), 'Vol. 3')}
          ${mobileHomeEvent(routes.vol4, asset('mobile-mcp-home-vol4'), 'Vol. 4')}
        </section>
        <section class="mobile-home-section mobile-home-tickets">
          <h2><span>Get</span> Tickets</h2>
          <p>Limited capacity</p>
          <a href="${links.mobileTickets}" target="_blank" rel="noreferrer">Buy Tickets</a>
        </section>
      </div>
    `;
  }

  function mobileHomeEvent(href, image, label) {
    return `
      <a class="mobile-home-event" href="${href}">
        <img src="${image}" alt="${label} event recap">
        <span>${label}</span>
      </a>
    `;
  }

  function eventTile(href, image, label) {
    return `
      <a class="event-tile" href="${href}">
        <img src="${image}" alt="${label} event recap">
        <span>${label}</span>
      </a>
    `;
  }

  function renderNextEvent() {
    return `
      <div class="with-mobile">
        <div class="desktop-view">
          <section class="event-hero section-border">
            <img src="${asset('next-backdrop')}" alt="Instinct event backdrop">
            <div class="event-hero__shade"></div>
            <div class="event-hero__content">
              <h1>May 1st</h1>
              <span class="green-rule"></span>
              <div class="event-detail-card">
                <strong>10:00pm - 2:30am</strong>
                <span>City at Night</span>
                <span>222 Slater St</span>
              </div>
            </div>
          </section>

          <section class="lineup-section section-border">
            <h2>Lineup</h2>
            <div class="lineup-grid lineup-grid--linked">
              ${lineupNext.map((artist) => lineupCard(artist)).join('')}
            </div>
            <p class="lineup-note">Click to learn more about the DJs</p>
          </section>

          <section class="drinks-section">
            <h2>Feature Drinks</h2>
            <div class="drink-grid">
              ${drinkCard('Cocktail', 'Melon Lemonade', 'A refreshing mix of sweet melon and zesty lemonade, this cocktail is light, crisp, and perfect for any summer moment.', asset('drink-melon'))}
              ${drinkCard('Shot', 'Scooby Doo Shot', 'A quick hit of coconut, melon, and pineapple, this Scooby Doo shot is smooth, fruity, and goes down easy.', asset('drink-scooby'))}
            </div>
          </section>

          ${ticketCta('Limited capacity')}
        </div>
        ${renderMobileNextEvent()}
      </div>
    `;
  }

  function renderMobileNextEvent() {
    return `
      <article class="mobile-view mobile-next-page">
        <section class="mobile-next-hero">
          <img src="${asset('mobile-mcp-next-hero')}" alt="Instinct event atmosphere">
          <div class="mobile-next-glow mobile-next-glow--one"></div>
          <div class="mobile-next-glow mobile-next-glow--two"></div>
          <div class="mobile-next-hero-content">
            <p>10:00pm – 2:30am</p>
            <h1>June 26th</h1>
            <span></span>
            <div>
              <strong>ANNX</strong>
              <em>221 Rideau Street</em>
            </div>
          </div>
        </section>
        <section class="mobile-next-lineup">
          <h2>Lineup</h2>
          <div>
            ${mobileLineupNext.map((artist) => mobileLineupCard(artist)).join('')}
          </div>
          <p>Click to learn more about the DJs</p>
        </section>
        <section class="mobile-next-tickets">
          <h2><span>Get</span> Tickets</h2>
          <p>Limited capacity</p>
          <a href="${links.mobileTickets}" target="_blank" rel="noreferrer">Buy Tickets</a>
        </section>
        <section class="mobile-drinks">
          <h2>Feature Drinks</h2>
          ${mobileDrinkCard('COCKTAIL', 'Festival Fuel', 'Need that Post Festival boost? Well Vodka, curaçao, OJ, and redbull may be what you need.', asset('mobile-mcp-drink-festival-fuel'), 'pink', 'center 45%')}
          ${mobileDrinkCard('SHOT', 'Liquid Cocaine', 'Bold, sharp, and gone in a second. Not for the faint of heart.', asset('mobile-mcp-drink-liquid-cocaine'), 'purple', 'center 45%')}
        </section>
      </article>
    `;
  }

  function mobileLineupCard(artist) {
    return `
      <a class="mobile-lineup-card" href="${artist.href}">
        ${mediaImage(artist.image, artist.name, '', artist.position)}
        <span>${artist.name}</span>
      </a>
    `;
  }

  function mobileDrinkCard(type, title, text, image, tone, position) {
    return `
      <article class="mobile-drink-card mobile-drink-card--${tone}">
        <div>
          ${mediaImage(image, title, '', position)}
          <span>${type}</span>
        </div>
        <h3>${title}</h3>
        <p>${text}</p>
      </article>
    `;
  }

  function renderRecap(recap) {
    const currentSlug = Object.keys(recaps).find((slug) => recaps[slug] === recap);
    const photos = recap.photos.map((src, index) => `
      <button class="photo-card photo-card--${index + 1}" type="button" data-lightbox="${src}" aria-label="Open ${recap.title} photo ${index + 1}">
        <img src="${src}" alt="${recap.title} photo ${index + 1}">
      </button>
    `).join('');

    return `
      <div class="with-mobile">
        <article class="desktop-view recap-page recap-page--${recap.layout}">
          <section class="recap-intro">
            <div class="section-kicker ${recap.layout === 'centered' ? 'section-kicker--center' : ''}"><span></span>${recap.eyebrow}<span></span></div>
            <h1>${recap.title}</h1>
            <p class="recap-date">${recap.date}</p>
            <p class="recap-copy">${recap.intro}</p>
          </section>
          <section class="recap-gallery recap-gallery--${recap.layout}">
            ${photos}
          </section>
          ${recap.photoUrl ? `<div class="recap-photo-link"><a class="button" href="${recap.photoUrl}" target="_blank" rel="noreferrer">View All Photos</a></div>` : ''}
          <section class="recap-lineup section-border">
            <h2>Lineup</h2>
            <div class="lineup-grid">
              ${recap.lineup.map((artist) => lineupCard(artist)).join('')}
            </div>
          </section>
          ${recapPager(currentSlug)}
        </article>
        ${renderMobileRecap(recap)}
      </div>
    `;
  }

  function renderMobileRecap(recap) {
    const mobile = recap.mobile;
    return `
      <article class="mobile-view mobile-recap">
        <section class="mobile-recap-poster">
          <img src="${mobile.poster}" alt="${mobile.title} poster">
        </section>
        <section class="mobile-recap-info">
          <h1>${mobile.title}</h1>
          <p>${mobile.date}</p>
          <div>
            ${mobile.tags.map((tag) => `<span>${tag}</span>`).join('')}
          </div>
        </section>
        <section class="mobile-recap-photos">
          <div class="mobile-recap-label"><span></span>Photos</div>
          <div class="mobile-recap-grid">
            ${mobile.photos.map((src, index) => `
              <button type="button" data-lightbox="${src}" aria-label="Open ${mobile.title} photo ${index + 1}">
                <img src="${src}" alt="${mobile.title} photo ${index + 1}">
              </button>
            `).join('')}
          </div>
        </section>
        <section class="mobile-recap-actions">
          ${mobile.creditUrl ? `<a class="mobile-recap-credit" href="${mobile.creditUrl}" target="_blank" rel="noreferrer">${mobile.credit}</a>` : `<p class="mobile-recap-credit">${mobile.credit}</p>`}
          <nav aria-label="Recap navigation">
            <a href="${mobile.previousHref}">← ${mobile.previousLabel}</a>
            <a href="${mobile.nextHref}">${mobile.nextLabel} →</a>
          </nav>
        </section>
      </article>
    `;
  }

  function recapNav(currentSlug) {
    const items = [
      { label: 'Home', href: routes.home },
      { label: 'Vol. 1', href: routes.vol1, slug: 'vol-1' },
      { label: 'Vol. 2', href: routes.vol2, slug: 'vol-2' },
      { label: 'Vol. 3', href: routes.vol3, slug: 'vol-3' },
      { label: 'Vol. 4', href: routes.vol4, slug: 'vol-4' },
      { label: 'Next Event', href: routes.next }
    ];

    return `
      <nav class="recap-nav" aria-label="Event recap pages">
        ${items.map((item) => `
          <a class="${item.slug === currentSlug ? 'is-active' : ''}" href="${item.href}">${item.label}</a>
        `).join('')}
      </nav>
    `;
  }

  function recapPager(currentSlug) {
    const order = [
      { slug: 'vol-1', label: 'Vol. 1', href: routes.vol1 },
      { slug: 'vol-2', label: 'Vol. 2', href: routes.vol2 },
      { slug: 'vol-3', label: 'Vol. 3', href: routes.vol3 },
      { slug: 'vol-4', label: 'Vol. 4', href: routes.vol4 }
    ];
    const index = order.findIndex((item) => item.slug === currentSlug);
    const previous = order[(index + order.length - 1) % order.length];
    const next = order[(index + 1) % order.length];

    return `
      <nav class="recap-pager" aria-label="Previous and next event recaps">
        <a href="${previous.href}">
          <span>Previous</span>
          ${previous.label}
        </a>
        <a href="${routes.home}">
          <span>All Events</span>
          Home
        </a>
        <a href="${next.href}">
          <span>Next</span>
          ${next.label}
        </a>
      </nav>
    `;
  }

  function renderArtist(artist) {
    const desktop = `
      <article class="desktop-view artist-page">
        <section class="artist-hero">
          <div class="artist-hero__glow"></div>
          <h1>${artist.name}</h1>
          <div class="artist-socials">
            ${artist.socials.map((link) => `<a href="${link.href}" target="_blank" rel="noreferrer">${link.label}</a>`).join('')}
          </div>
        </section>

        <section class="artist-info">
          <div class="artist-bio">
            <div class="section-kicker"><span></span>Bio</div>
            <p>${artist.bio}</p>
          </div>
          <div class="set-card">
            <span>Set Time</span>
            <strong>${artist.setTime}</strong>
          </div>
        </section>

        <figure class="artist-band artist-band--top">
          <img src="${artist.band}" alt="${artist.name} event atmosphere">
        </figure>

        <section class="qa-block qa-block--left">
          ${qa(artist.qas[0])}
        </section>

        <section class="artist-feature">
          <button type="button" data-lightbox="${artist.portrait}">
            <img src="${artist.portrait}" alt="${artist.name}">
          </button>
        </section>

        <section class="qa-block qa-block--right">
          ${qa(artist.qas[1])}
        </section>

        <figure class="artist-band artist-band--lower">
          <img src="${artist.lower}" alt="${artist.name} event crowd">
        </figure>

        <section class="qa-block qa-block--left">
          ${qa(artist.qas[2])}
        </section>
      </article>
    `;

    if (!artist.mobile) {
      return desktop.replace(' class="desktop-view artist-page"', ' class="artist-page"');
    }

    return `
      <div class="with-mobile">
        ${desktop}
        ${renderMobileArtist(artist)}
      </div>
    `;
  }

  function renderMobileArtist(artist) {
    const mobile = artist.mobile;
    return `
      <article class="mobile-view mobile-artist" style="--artist-accent: ${mobile.accent}">
        <section class="mobile-artist-hero">
          <img src="${mobile.hero}" alt="${artist.name}">
          <div class="mobile-artist-gradient"></div>
          <div class="mobile-artist-glow mobile-artist-glow--one"></div>
          <div class="mobile-artist-glow mobile-artist-glow--two"></div>
          <div class="mobile-artist-title">
            <h1>${artist.name}</h1>
            <div>
              ${artist.socials.map((link) => `<a href="${link.href}" target="_blank" rel="noreferrer">${link.label}</a>`).join('')}
            </div>
          </div>
        </section>
        <section class="mobile-artist-bio">
          <div class="mobile-artist-label"><span></span>Bio</div>
          <div>
            ${mobile.bio.map((paragraph) => `<p>${paragraph}</p>`).join('')}
          </div>
          <aside>
            <span>Set Time</span>
            <strong>${artist.setTime}</strong>
          </aside>
        </section>
        <section class="mobile-artist-qa">
          ${mobileArtistQa(artist.qas[0], 'left')}
          <button type="button" class="mobile-artist-photo" data-lightbox="${mobile.feature}" aria-label="Open ${artist.name} photo">
            <img src="${mobile.feature}" alt="${artist.name}">
          </button>
          ${mobileArtistQa(artist.qas[1], 'right')}
          ${mobileArtistQa(artist.qas[2], 'left')}
        </section>
        <nav class="mobile-artist-nav" aria-label="Artist navigation">
          ${mobile.nav.map((item) => `<a href="${item.href}">${item.label}</a>`).join('')}
        </nav>
      </article>
    `;
  }

  function mobileArtistQa(item, side) {
    return `
      <div class="mobile-artist-question mobile-artist-question--${side}">
        <h2>${item.question}</h2>
        ${item.answer ? `<p>${item.answer}</p>` : ''}
      </div>
    `;
  }

  function qa(item) {
    return `
      <div>
        <h2>${item.question}</h2>
        <p>${item.answer}</p>
      </div>
    `;
  }

  function lineupCard(artist) {
    const tag = artist.href ? 'a' : 'div';
    const href = artist.href ? ` href="${artist.href}"` : '';
    return `
      <${tag} class="lineup-card"${href}>
        <img src="${artist.image}" alt="${artist.name}">
        <span>${artist.name}</span>
      </${tag}>
    `;
  }

  function drinkCard(type, title, text, image) {
    return `
      <article class="drink-card">
        <div class="drink-card__image">
          <img src="${image}" alt="${title}">
          <span>${type}</span>
        </div>
        <h3>${title}</h3>
        <p>${text}</p>
      </article>
    `;
  }

  function mediaImage(src, alt, className = '', position = '') {
    const classAttr = className ? ` class="${className}"` : '';
    const styleAttr = position ? ` style="--media-position: ${position}"` : '';
    return `<img${classAttr} src="${src}" alt="${alt}"${styleAttr}>`;
  }

  function ticketCta(copy) {
    return `
      <section class="ticket-cta">
        <h2><span>Get</span> Tickets</h2>
        <p>${copy}</p>
        <a class="button button--solid" href="${links.tickets}" target="_blank" rel="noreferrer">Buy Tickets</a>
      </section>
    `;
  }

  function siteFooter() {
    return `
      <footer class="site-footer">
        <a class="site-footer__brand" href="${routes.home}">Instinct Groove</a>
        <div>
          <a href="${links.instagram}" target="_blank" rel="noreferrer">@Instinct.groove</a>
          <a href="${links.email}">Info@instinctgroove.net</a>
        </div>
        <p>Ottawa's Minimal Tech & House Experience</p>
      </footer>
    `;
  }

  function renderMissing() {
    return `
      <section class="missing-page">
        <h1>Page not found</h1>
        <a class="button" href="${routes.home}">Return home</a>
      </section>
    `;
  }

  function setupLightbox() {
    const lightbox = document.getElementById('lightbox');
    const image = lightbox.querySelector('.lightbox__image');
    const close = lightbox.querySelector('.lightbox__close');

    document.querySelectorAll('[data-lightbox]').forEach((button) => {
      button.addEventListener('click', () => {
        image.src = button.dataset.lightbox;
        image.alt = button.querySelector('img')?.alt || 'Expanded event image';
        lightbox.classList.add('is-open');
        lightbox.setAttribute('aria-hidden', 'false');
        close.focus();
      });
    });

    const hide = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      image.removeAttribute('src');
    };

    close.addEventListener('click', hide);
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) hide();
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && lightbox.classList.contains('is-open')) hide();
    });
  }

  render();
}());
