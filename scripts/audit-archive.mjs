#!/usr/bin/env node
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={window:{}};
for(const file of ['image-manifest.js','content.js','catalog.js'])vm.runInNewContext(readFileSync(file,'utf8'),context,{filename:file});
const data=context.window.INSTINCT_CONTENT, create=context.window.INSTINCT_ARCHIVE.create, images=context.window.INSTINCT_IMAGES;
const state=create(data,new Date());
const check=(condition,message)=>assert.ok(condition,message);
const image=(name,where)=>check(Boolean(images[name]),`${where}: unknown image ${name}`);
const safeLink=(href,where)=>check(/^(https?:\/\/|mailto:|\.\/)/.test(href),`${where}: unsafe or incomplete link ${href}`);
for(const [id,event] of Object.entries(data.events)){
 check(id===event.id,`Event key mismatch: ${id}`);
 check(/^\d{4}-\d{2}-\d{2}$/.test(event.date)&&new Date(event.date).toISOString().startsWith(event.date),`Invalid date: ${id}`);
 check(Boolean(event.title&&event.venue&&event.sources?.length),`Event needs title, venue and evidence: ${id}`);
 check(existsSync(`${id}.html`),`No permanent event page: ${id}`);
 image(event.cover,id);event.posters.forEach(p=>image(p,id));
 if(event.endsAt)check(Number.isFinite(Date.parse(event.endsAt))&&Date.parse(event.endsAt)>Date.parse(event.date),`Invalid end time: ${id}`);
 for(const key of ['ticketUrl','albumUrl','creditUrl','sourceUrl'])if(event[key])safeLink(event[key],id);
 if(event.albumUrl)check(!event.albumUrl.includes('instagram.com'),`${id}: album link points to a social profile`);
 check(new Set(event.mediaIds).size===event.mediaIds.length,`Duplicate media in ${id}`);
 for(const mediaId of event.mediaIds)check(data.media[mediaId]?.eventId===id,`Missing/misassigned media: ${id}/${mediaId}`);
 const validateSet=set=>{check(set.artistIds?.length,`${id}: empty lineup entry`);for(const artistId of set.artistIds)check(Boolean(data.artists[artistId]),`${id}: missing artist ${artistId}`);if(set.profileId)check(Boolean(data.artists[set.profileId]),`${id}: missing group profile ${set.profileId}`);};
 (event.lineup||[]).forEach(validateSet);
 event.announcements.forEach(section=>{image(section.poster,id);section.lineup.forEach(validateSet);safeLink(section.sourceUrl,id);});
 if(event.announcements.length)check(!event.lineup,`${id}: derive the combined lineup from announcements`);
}
for(const [id,artist] of Object.entries(data.artists)){
 check(id===artist.id,`Artist key mismatch: ${id}`);image(artist.portrait,id);
 check(existsSync(`${id}.html`),`Missing artist page: ${id}`);
 check(state.appearancesFor(id).length>0,`Artist has no event connection: ${id}`);
 check(!('setTime' in artist)&&!('currentEvent' in artist),`${id}: event details belong to appearances`);
 artist.socials.forEach(link=>safeLink(link.href,id));
}
const selectedImages=new Set();
for(const [id,item] of Object.entries(data.media)){
 check(id===item.id,`Media key mismatch: ${id}`);check(['photo','video'].includes(item.type),`Unknown media type: ${id}`);image(item.image,id);
 check(Boolean(item.alt&&item.caption),`Missing media description: ${id}`);
 if(item.eventId)check(data.events[item.eventId]?.mediaIds.includes(id),`Media missing from its event: ${id}`);
 if(item.type==='photo'&&item.curated){const src=images[item.image].src;check(!selectedImages.has(src),`Duplicate selected photograph: ${id}`);selectedImages.add(src);}
 if(!item.curated)check(Boolean(item.reviewNote),`Excluded media needs a reason: ${id}`);
 if(item.type==='video')check(existsSync(item.src),`Missing video: ${id}`);
}
const shellFiles=readdirSync('.').filter(file=>file.endsWith('.html'));
for(const file of shellFiles){
 const text=readFileSync(file,'utf8');const scripts=['image-manifest.js','content.js','catalog.js','app.js'];
 check(scripts.every((script,index)=>text.includes(script)&&(!index||text.indexOf(scripts[index-1])<text.indexOf(script))),`Script order incorrect: ${file}`);
 check(text.includes('id="media-viewer"')&&text.includes('archive.css'),`Incomplete shared shell: ${file}`);
 const slug=file.replace('.html','');check(['index','next-event','past-events','artists','gallery'].includes(slug)||data.events[slug]||data.artists[slug]||data.collaborations?.[slug],`Unreachable shell: ${file}`);
}
const original=['index','next-event','escapade-afterparty','vol-1','vol-2','vol-3','vol-4','vol-6','dj-cobb','seb-b-balla','babyjake','ty-groove','seb-couture','dose','dosen','tone-a','comfort','g3lio','ooj','niko-couture-b2b-balla','artur-exists','ott-krishhh','caploch','zak-mtl'];
for(const slug of original)check(existsSync(`${slug}.html`),`Legacy URL lost: ${slug}`);
// Date boundaries cover the overnight event and date-only events in Ottawa, independent of the test machine's timezone.
for(const [instant,id,past] of [
 ['2026-08-15T06:29:59Z','vol-6',false],['2026-08-15T06:30:00Z','vol-6',true],
 ['2026-09-12T03:59:59Z','vol-7',false],['2026-09-12T04:00:00Z','vol-7',true]
])check(create(data,new Date(instant)).byId[id].past===past,`Incorrect event transition: ${id} at ${instant}`);
for(const instant of ['2025-01-01T12:00:00Z','2026-09-12T12:00:00Z','2030-01-01T12:00:00Z']){
 const snapshot=create(data,new Date(instant));
 check(snapshot.pastEvents.length+snapshot.upcomingEvents.length===Object.keys(data.events).length,'Event vanished during status transition');
 check(new Set([...snapshot.pastEvents,...snapshot.upcomingEvents].map(e=>e.id)).size===Object.keys(data.events).length,'Duplicate event across status lists');
}
console.log(`Archive audit passed: ${Object.keys(data.events).length} events, ${Object.keys(data.artists).length} artists, ${Object.values(data.media).filter(m=>m.curated).length} selected media, ${shellFiles.length} routes.`);
console.log('Verified permanent routes, artist appearances, media ownership, duplicate selections, script order, link types and event expiry boundaries.');

for(const artist of Object.values(data.artists))check(!artist.memberIds&&!/b2b/i.test(artist.name),`Joint artist entry remains: ${artist.id}`);
for(const group of Object.values(data.collaborations)){check(Boolean(data.events[group.eventId]),`Missing legacy event: ${group.id}`);for(const id of group.memberIds){check(Boolean(data.artists[id]),`Missing solo artist: ${id}`);check(state.appearancesFor(id).some(set=>set.b2b&&set.collaborationId===group.id),`Missing B2B credit: ${id}`);}}
