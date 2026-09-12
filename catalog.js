/* Pure archive relationships shared by the website and its integrity checks. */
(function (root) {
  function create(content, now = new Date()) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: content.timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(now);
    const events = Object.values(content.events).map(event => ({
      ...event,
      lineup: event.announcements.length ? event.announcements.flatMap(section => section.lineup) : event.lineup,
      past: event.endsAt ? Date.parse(event.endsAt) <= now.getTime() : event.date < today
    })).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
    const byId = Object.fromEntries(events.map(event => [event.id, event]));
    const orderedMedia = [
      ...events.flatMap(event => event.mediaIds.map(id => content.media[id])),
      ...Object.values(content.media).filter(item => !item.eventId)
    ];
    const mediaFor = eventId => orderedMedia.filter(item => item.curated && (!eventId || item.eventId === eventId));
    const appearancesFor = artistId => events.flatMap(event => {
      const sets = event.announcements.length
        ? event.announcements.flatMap(section => section.lineup.map(set => ({ ...set, section: section.title, venue: section.venue })))
        : event.lineup;
      return sets.filter(set => set.artistIds.includes(artistId) || set.profileId === artistId)
        .map(set => ({ event, ...set }));
    });
    const pastEvents = events.filter(event => event.past);
    const upcomingEvents = events.filter(event => !event.past).reverse();
    return { events, byId, pastEvents, upcomingEvents, mediaFor, appearancesFor, today };
  }
  root.INSTINCT_ARCHIVE = { create };
}(typeof window === 'undefined' ? globalThis : window));
