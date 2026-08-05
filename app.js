(function () {
  const imageManifest = window.INSTINCT_IMAGES || {};
  const imageRecordsBySrc = new Map(Object.values(imageManifest).map((record) => [record.src, record]));
  const mobileMedia = window.matchMedia('(max-width: 720px)');
  let cleanupPage = () => {};
  const asset = (name) => imageManifest[name]?.src || `./assets/${name}.webp`;

  function imageRecord(src) {
    return imageRecordsBySrc.get(src);
  }

  function imageTag(src, alt, options = {}) {
    const record = imageRecord(src);
    const {
      className = '',
      sizes = '100vw',
      priority = false
    } = options;
    const classAttribute = className ? ` class="${className}"` : '';
    const responsive = record?.candidates?.length > 1
      ? ` srcset="${record.candidates.map((candidate) => `${candidate.src} ${candidate.width}w`).join(', ')}" sizes="${sizes}"`
      : '';
    const dimensions = record ? ` width="${record.width}" height="${record.height}"` : '';
    const loading = priority ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"';
    return `<img${classAttribute} src="${src}"${responsive}${dimensions}${loading} decoding="async" alt="${alt}">`;
  }
  const routes = {
    home: './index.html',
    next: './next-event.html',
    escapade: './escapade-afterparty.html',
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
    instagram: 'https://www.instagram.com/instinct.groove?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
    email: 'mailto:Info@instinctgroove.net',
    cityAtNight: 'https://www.cityatnight.ca/',
    blockPartyTickets: 'https://simpli.events/e/a2999c',
    blockAfterPartyTickets: 'https://simpli.events/e/40fff6',
    vol1Photos: 'https://www.amazon.ca/photos/share/hd6a0KdI2dAZxDCE4eaotcu17Nv4ZzNjFgM6xWcwHdU',
    vol3Photos: 'https://drive.google.com/drive/folders/1IrkD4W7mA4Zn4aVnKx7xN2WxENsm5GLd?usp=sharing',
    mystic: 'https://www.instagram.com/mysticdoesmedia?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
    curtis: 'https://www.instagram.com/_curtisperry?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=='
  };

  const nextEvent = {
    eyebrow: 'Next Event',
    title: 'Instinct x Block Party',
    date: 'August 14th',
    datetime: '2026-08-14',
    venue: 'Snider Park · 140 Bank St',
    hours: '7 PM–11 PM · 19+',
    bio: ['Instinct x Block Party brings the minimal tech sound you love to an outdoor setting, featuring Dosen, Tone A, Comfort, and G3lio on sax—along with the same energy and greenery that make Instinct, Instinct.'],
    poster: asset('block-party-poster')
  };

  const afterPartyEvent = {
    eyebrow: 'After Party',
    title: 'Instinct Vol. 6 Block AP',
    date: 'August 14th',
    datetime: '2026-08-14',
    venue: 'City At Night · 222 Slater St',
    hours: '10 PM–2:30 AM · 19+',
    bio: [
      'Instinct Vol. 6 continues the block party inside City At Night, featuring OOJ, Niko Couture B2B Balla, and Artur.Exists.',
      'More dancing, more greenery, and deeper cuts all night long.'
    ],
    poster: asset('vol6-block-ap-poster')
  };

  const nextEvents = [nextEvent, afterPartyEvent];

  const featuredDrinks = [
    {
      name: 'Sex on the Beach',
      image: asset('featured-drink-sex-on-the-beach'),
      alt: 'Featured Sex on the Beach cocktail with orange and cherry garnish'
    },
    {
      name: 'Peach, Please',
      image: asset('featured-drink-peach-please'),
      alt: 'Featured Peach, Please shot',
      note: 'Served exclusively at the after party inside City At Night.'
    }
  ];

  // Recap clip shown in the mobile home "Event Preview" window. Desktop keeps the poster image.
  const homePreviewVideo = './assets/home-preview.mp4';

  const recaps = {
    'escapade-afterparty': {
      title: 'Escapade Afterparty',
      eyebrow: 'Event Recap',
      date: 'June 26th, 2026 - ANNX',
      intro: 'The Escapade Afterparty brought festival weekend into ANNX for one more late-night session. DJ Cobb, Seb B b2b Balla, and Baby Jake carried the room through a packed night of minimal tech and house, surrounded by the lighting, greenery, and close-quarters energy that define Instinct.',
      layout: 'centered',
      photoUrl: links.curtis,
      photos: [
        asset('escapade-photo1'),
        asset('escapade-photo2'),
        asset('escapade-photo3'),
        asset('escapade-photo4'),
        asset('escapade-photo5'),
        asset('escapade-photo6'),
        asset('escapade-photo7'),
        asset('escapade-photo8')
      ],
      lineup: [
        { name: 'DJ Cobb', href: routes.djCobb, image: asset('mobile-mcp-artist-dj-cobb-photo') },
        { name: 'Seb B b2b Balla', href: routes.sebBalla, image: asset('mobile-mcp-artist-seb-balla-photo') },
        { name: 'Baby Jake', href: routes.babyjake, image: asset('mobile-mcp-artist-babyjake-photo') }
      ],
      mobile: {
        title: 'Escapade Afterparty',
        date: 'June 2026 · ANNX',
        poster: asset('escapade-photo2'),
        tags: ['DJ Cobb', 'Seb B b2b Balla', 'Baby Jake'],
        credit: 'Photos By: @_Curtisperry',
        creditUrl: links.curtis,
        photos: [
          asset('escapade-photo1'),
          asset('escapade-photo2'),
          asset('escapade-photo3'),
          asset('escapade-photo4'),
          asset('escapade-photo5'),
          asset('escapade-photo6'),
          asset('escapade-photo7'),
          asset('escapade-photo8')
        ]
      }
    },
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
        ]
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
        ]
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
        ]
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
        ]
      }
    }
  };

  const pastEvents = [
    { slug: 'escapade-afterparty', href: routes.escapade, title: 'Escapade Afterparty', date: 'June 26, 2026', venue: 'ANNX', image: asset('escapade-photo2') },
    { slug: 'vol-4', href: routes.vol4, title: 'Vol. 4', date: 'April 2026', venue: 'City at Night', image: asset('home-vol4-card') },
    { slug: 'vol-3', href: routes.vol3, title: 'Vol. 3', date: 'March 6, 2026', venue: 'ANNX', image: asset('home-vol3-card') },
    { slug: 'vol-2', href: routes.vol2, title: 'Vol. 2', date: 'January 23, 2026', venue: 'ANNX', image: asset('home-vol2-card') },
    { slug: 'vol-1', href: routes.vol1, title: 'Vol. 1', date: 'November 21, 2025', venue: 'ANNX', image: asset('home-vol1-card') }
  ];

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
    cleanupPage();
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
    const cleanupLightbox = setupLightbox();
    const cleanupNav = setupNav();
    cleanupPage = () => {
      cleanupLightbox();
      cleanupNav();
    };
    document.documentElement.dataset.route = route;
  }

  function siteHeader(route) {
    const isRecap = Boolean(recaps[route]);
    const isArtist = Boolean(artists[route]);
    const linkClass = (name) => (route === name ? ' class="is-active"' : '');

    return `
      <header class="site-header">
        <nav class="site-nav" aria-label="Primary navigation">
          <a class="site-brand ${route === 'index' ? 'is-active' : ''}" href="${routes.home}" aria-label="Instinct Groove — home">
            <span class="site-brand__mark" aria-hidden="true"></span>
            <span class="site-brand__name">Instinct Groove</span>
          </a>
          <button class="site-nav__toggle" type="button" aria-expanded="false" aria-controls="site-menu">Menu</button>
          <div class="site-nav__links" id="site-menu">
            <a${linkClass('next-event')} href="${routes.next}">Next Event</a>
            <details class="site-nav-menu ${isRecap ? 'is-active' : ''}">
              <summary>Past Events</summary>
              <div>
                ${pastEvents.map((event) => `<a${linkClass(event.slug)} href="${event.href}">${event.title}</a>`).join('')}
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
            <a href="${links.instagram}" target="_blank" rel="noreferrer">Instagram</a>
            <details class="site-nav-menu site-nav-tickets">
              <summary>August 14th Tickets</summary>
              <div>
                <a href="${links.blockPartyTickets}" target="_blank" rel="noreferrer">Instinct x Block Party</a>
                <a href="${links.blockAfterPartyTickets}" target="_blank" rel="noreferrer">Instinct Vol. 6 Block AP Tickets</a>
              </div>
            </details>
          </div>
        </nav>
      </header>
    `;
  }

  function setupNav() {
    const header = document.querySelector('.site-header');
    if (!header) return () => {};
    const toggle = header.querySelector('.site-nav__toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const open = header.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      header.querySelectorAll('.site-nav__links a').forEach((a) => {
        a.addEventListener('click', () => {
          header.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }

  function renderHome() {
    if (mobileMedia.matches) return `<div class="with-mobile">${renderMobileHome()}</div>`;
    return `
      <div class="with-mobile">
        <div class="desktop-view">
          <section class="home-hero section-border">
            ${imageTag(asset('home-hero'), 'Instinct Groove artwork', { className: 'home-hero__image', sizes: '100vw', priority: true })}
            <p class="home-hero__tagline">Instinct is a natural unlearned and innate drive to act in a certain way in response to specific stimuli, often without conscious thought.</p>
          </section>

          <section class="preview-panel section-border">
            <div class="preview-panel__inner">
              <h2><span>Event</span> Preview</h2>
              <div class="preview-panel__media">
                ${homePreviewMedia('home-preview', 'Event preview atmosphere', homePreviewVideo)}
              </div>
            </div>
          </section>

          <section class="next-card next-card--poster section-border">
            <p class="next-card__eyebrow">Next Event</p>
            <div class="next-card__events">
              ${nextEvents.map((event) => `
                <article class="next-card__event">
                  <a class="next-card__poster" href="${routes.next}" aria-label="Open ${event.title} event details">
                    ${imageTag(event.poster, `${event.title} poster for ${event.date}`, { sizes: 'min(544px, 70vw)' })}
                  </a>
                  <h2>${event.title}</h2>
                  <p><time datetime="${event.datetime}">${event.date}</time> · ${event.venue.split(' · ')[0]}</p>
                </article>
              `).join('')}
            </div>
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
                ${imageTag(asset('home-team'), 'The Instinct Groove crew', { sizes: '(max-width: 1050px) calc(100vw - 48px), 576px' })}
                <figcaption>The Crew</figcaption>
              </figure>
            </div>
          </section>

          <section class="previous-events section-border">
            <h2>Past Events</h2>
            <div class="event-tiles">
              ${pastEvents.map((event) => eventTile(event)).join('')}
            </div>
          </section>

          <section class="tickets-strip tickets-strip--soon">
            ${imageTag(asset('home-tickets'), '', { sizes: '100vw' })}
            <div>
              <h2><span>Event</span> Details</h2>
              <div class="tickets-strip__details">
                <p>${nextEvent.date} · ${nextEvent.venue} · ${nextEvent.hours}</p>
                <p>${afterPartyEvent.date} · ${afterPartyEvent.venue} · ${afterPartyEvent.hours}</p>
              </div>
              <a class="details-status" href="${links.cityAtNight}" target="_blank" rel="noreferrer">Tickets &amp; info via City at Night</a>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function renderMobileHome() {
    return `
      <div class="mobile-view mobile-home">
        <section class="mobile-home-hero">
          ${imageTag(asset('mobile-mcp-home-hero'), 'Instinct Groove artwork', { sizes: '390px', priority: true })}
          <p class="mobile-home-welcome">Welcome to.....</p>
          <p class="mobile-home-tagline">Instinct is a natural unlearned and innate drive to act in a certain way in response to specific stimuli, often without conscious thought.</p>
        </section>
        <section class="mobile-home-section mobile-home-preview">
          <div class="mobile-section-label"><span></span>Event Preview</div>
          <div class="mobile-home-video">
            ${homePreviewMedia('mobile-home-preview', 'Event preview', homePreviewVideo)}
          </div>
        </section>
        <section class="mobile-home-section mobile-home-next-card">
          <h2><span>Next</span> Event</h2>
          <div class="mobile-home-next-events">
            ${nextEvents.map((event) => `
              <article class="mobile-home-next-event">
                <a href="${routes.next}" class="mobile-home-poster" aria-label="Open ${event.title} event details">
                  ${imageTag(event.poster, `${event.title} poster for ${event.date}`, { sizes: '342px' })}
                </a>
                <p>${event.title} · <time datetime="${event.datetime}">${event.date}</time></p>
              </article>
            `).join('')}
          </div>
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
            ${imageTag(asset('mobile-mcp-home-crew'), 'The Instinct Groove crew', { sizes: '342px' })}
          </div>
        </section>
        <section class="mobile-home-section mobile-home-events">
          <h2>Past Events</h2>
          ${pastEvents.map((event) => mobileHomeEvent(event)).join('')}
        </section>
        <section class="mobile-home-section mobile-home-tickets">
          <h2><span>Event</span> Details</h2>
          <div class="mobile-home-ticket-details">
            <p>${nextEvent.date} · ${nextEvent.venue} · ${nextEvent.hours}</p>
            <p>${afterPartyEvent.date} · ${afterPartyEvent.venue} · ${afterPartyEvent.hours}</p>
          </div>
          <a class="mobile-home-ticket-status" href="${links.cityAtNight}" target="_blank" rel="noreferrer">Tickets &amp; info via City at Night</a>
        </section>
      </div>
    `;
  }

  function mobileHomeEvent(event) {
    return `
      <a class="mobile-home-event" href="${event.href}">
        ${imageTag(event.image, `${event.title} event recap`, { sizes: '342px' })}
        <span class="mobile-home-event__meta">
          <strong>${event.title}</strong>
          <small>${event.date} · ${event.venue}</small>
        </span>
      </a>
    `;
  }

  function eventTile(event) {
    return `
      <a class="event-tile" href="${event.href}">
        ${imageTag(event.image, `${event.title} event recap`, { sizes: '(max-width: 1050px) 45vw, 230px' })}
        <span class="event-tile__meta">
          <strong>${event.title}</strong>
          <small>${event.date}</small>
          <small>${event.venue}</small>
        </span>
      </a>
    `;
  }

  function renderNextEvent() {
    if (mobileMedia.matches) return `<div class="with-mobile">${renderMobileNextEvent()}</div>`;
    return `
      <div class="with-mobile">
        <div class="desktop-view">
          ${nextEvents.map((event, index) => renderDesktopNextEvent(event, index)).join('')}
          ${renderFeaturedDrinks('desktop')}
        </div>
      </div>
    `;
  }

  function renderDesktopNextEvent(event, index) {
    return `
      <section class="next-event-page section-border">
        <figure class="next-event-page__poster">
          ${imageTag(event.poster, `${event.title} poster for ${event.date} at ${event.venue.split(' · ')[0]}`, { sizes: '(max-width: 1050px) 46vw, 560px', priority: index === 0 })}
        </figure>
        <div class="next-event-page__content">
          <p class="event-teaser__eyebrow">${event.eyebrow}</p>
          <h1>${event.title}</h1>
          <p class="next-event-page__meta"><time datetime="${event.datetime}">${event.date}</time><br>${event.venue}<br>${event.hours}</p>
          <span class="green-rule"></span>
          ${event.bio.map((paragraph) => `<p class="next-event-page__bio">${paragraph}</p>`).join('')}
          <a class="next-event-page__tickets" href="${links.cityAtNight}" target="_blank" rel="noreferrer">Tickets &amp; info via City at Night</a>
        </div>
      </section>
    `;
  }

  function renderMobileNextEvent() {
    return `
      <article class="mobile-view mobile-next-page">
        ${nextEvents.map((event, index) => renderMobileNextEventCard(event, index)).join('')}
        ${renderFeaturedDrinks('mobile')}
      </article>
    `;
  }

  function renderFeaturedDrinks(view) {
    const isMobile = view === 'mobile';
    const sizes = isMobile ? '342px' : '(max-width: 1050px) 70vw, 520px';
    return `
      <section class="featured-drinks featured-drinks--${view} section-border" aria-labelledby="featured-drinks-${view}">
        <div class="featured-drinks__heading">
          <p>At the bar</p>
          <h2 id="featured-drinks-${view}">Featured Drink</h2>
        </div>
        <div class="featured-drinks__grid">
          ${featuredDrinks.map((drink) => `
            <article class="featured-drink-card">
              <figure>
                ${imageTag(drink.image, drink.alt, { sizes })}
              </figure>
              <h3>${drink.name}</h3>
              ${drink.note ? `<p>${drink.note}</p>` : ''}
            </article>
          `).join('')}
        </div>
        <p class="featured-drinks__notice">Alcohol service is 19+. Please enjoy responsibly.</p>
      </section>
    `;
  }

  function renderMobileNextEventCard(event, index) {
    return `
      <section class="mobile-next-event">
        <p class="mobile-next-event__eyebrow">${event.eyebrow}</p>
        <figure>
          ${imageTag(event.poster, `${event.title} poster for ${event.date} at ${event.venue.split(' · ')[0]}`, { sizes: '342px', priority: index === 0 })}
        </figure>
        <div class="mobile-next-event__content">
          <h1>${event.title}</h1>
          <p class="mobile-next-event__meta"><time datetime="${event.datetime}">${event.date}</time><br>${event.venue}<br>${event.hours}</p>
          <span></span>
          ${event.bio.map((paragraph) => `<p class="mobile-next-event__bio">${paragraph}</p>`).join('')}
          <a class="mobile-next-event__tickets" href="${links.cityAtNight}" target="_blank" rel="noreferrer">Tickets &amp; info via City at Night</a>
        </div>
      </section>
    `;
  }

  function renderRecap(recap) {
    const currentSlug = Object.keys(recaps).find((slug) => recaps[slug] === recap);
    if (mobileMedia.matches) return `<div class="with-mobile">${renderMobileRecap(recap, currentSlug)}</div>`;
    const photos = recap.photos.map((src, index) => `
      <button class="photo-card photo-card--${index + 1}" type="button" data-lightbox="${src}" aria-label="Open ${recap.title} photo ${index + 1}">
        ${imageTag(src, `${recap.title} photo ${index + 1}`, { sizes: recapPhotoSizes(recap.layout, index) })}
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
      </div>
    `;
  }

  function recapPhotoSizes(layout, index) {
    if (layout === 'centered' && index === 0) return '(max-width: 1050px) calc(100vw - 48px), 1152px';
    if (layout === 'split') return '(max-width: 1050px) calc(100vw - 48px), 610px';
    return '(max-width: 1050px) calc(100vw - 48px), 384px';
  }

  function renderMobileRecap(recap, currentSlug) {
    const mobile = recap.mobile;
    const { older, newer } = recapNeighbors(currentSlug);
    return `
      <article class="mobile-view mobile-recap">
        <section class="mobile-recap-poster">
          ${imageTag(mobile.poster, `${mobile.title} poster`, { sizes: '390px', priority: true })}
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
                ${imageTag(src, `${mobile.title} photo ${index + 1}`, { sizes: '342px' })}
              </button>
            `).join('')}
          </div>
        </section>
        <section class="mobile-recap-actions">
          ${mobile.creditUrl ? `<a class="mobile-recap-credit" href="${mobile.creditUrl}" target="_blank" rel="noreferrer">${mobile.credit}</a>` : `<p class="mobile-recap-credit">${mobile.credit}</p>`}
          <nav aria-label="Recap navigation">
            <a href="${older ? older.href : routes.home}">← ${older ? older.title : 'All Events'}</a>
            <a href="${newer ? newer.href : routes.home}">${newer ? newer.title : 'All Events'} →</a>
          </nav>
        </section>
      </article>
    `;
  }

  function recapNeighbors(currentSlug) {
    const index = pastEvents.findIndex((event) => event.slug === currentSlug);
    return {
      older: pastEvents[index + 1] || null,
      newer: pastEvents[index - 1] || null
    };
  }

  function recapPager(currentSlug) {
    const { older, newer } = recapNeighbors(currentSlug);

    return `
      <nav class="recap-pager" aria-label="Previous and next event recaps">
        <a href="${older ? older.href : routes.home}">
          <span>Older</span>
          ${older ? older.title : 'Archive Home'}
        </a>
        <a href="${routes.home}">
          <span>All Events</span>
          Home
        </a>
        <a href="${newer ? newer.href : routes.home}">
          <span>Newer</span>
          ${newer ? newer.title : 'Archive Home'}
        </a>
      </nav>
    `;
  }

  function renderArtist(artist) {
    if (mobileMedia.matches && artist.mobile) {
      return `<div class="with-mobile">${renderMobileArtist(artist)}</div>`;
    }
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
          ${imageTag(artist.band, `${artist.name} event atmosphere`, { sizes: '100vw' })}
        </figure>

        <section class="qa-block qa-block--left">
          ${qa(artist.qas[0])}
        </section>

        <section class="artist-feature">
          <button type="button" data-lightbox="${artist.portrait}">
            ${imageTag(artist.portrait, artist.name, { sizes: '1024px' })}
          </button>
        </section>

        <section class="qa-block qa-block--right">
          ${qa(artist.qas[1])}
        </section>

        <figure class="artist-band artist-band--lower">
          ${imageTag(artist.lower, `${artist.name} event crowd`, { sizes: '100vw' })}
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
      </div>
    `;
  }

  function renderMobileArtist(artist) {
    const mobile = artist.mobile;
    return `
      <article class="mobile-view mobile-artist" style="--artist-accent: ${mobile.accent}">
        <section class="mobile-artist-hero">
          ${imageTag(mobile.hero, artist.name, { sizes: '390px', priority: true })}
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
            ${imageTag(mobile.feature, artist.name, { sizes: '342px' })}
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
        ${imageTag(artist.image, artist.name, { sizes: '(max-width: 720px) 342px, 400px' })}
        <span>${artist.name}</span>
      </${tag}>
    `;
  }

  function homePreviewMedia(posterName, alt, video = '') {
    const poster = asset(posterName);

    if (!video) {
      return imageTag(poster, alt, { sizes: '342px' });
    }

    const type = video.endsWith('.webm') ? 'video/webm' : 'video/mp4';
    return `
      <video autoplay muted loop playsinline preload="metadata" poster="${poster}" aria-label="${alt}">
        <source src="${video}" type="${type}">
        ${imageTag(poster, alt, { sizes: '342px' })}
      </video>
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
    let trigger = null;

    document.querySelectorAll('[data-lightbox]').forEach((button) => {
      button.addEventListener('click', () => {
        trigger = button;
        image.src = button.dataset.lightbox;
        image.alt = button.querySelector('img')?.alt || 'Expanded event image';
        lightbox.classList.add('is-open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('no-scroll');
        close.focus();
      });
    });

    const hide = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      image.removeAttribute('src');
      document.body.classList.remove('no-scroll');
      trigger?.focus();
      trigger = null;
    };

    close.addEventListener('click', hide);
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) hide();
    });
    const onKeydown = (event) => {
      if (event.key === 'Escape' && lightbox.classList.contains('is-open')) hide();
    };
    window.addEventListener('keydown', onKeydown);
    return () => {
      hide();
      window.removeEventListener('keydown', onKeydown);
    };
  }

  mobileMedia.addEventListener('change', render);
  render();
}());
