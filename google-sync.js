/* Tempo V3: Google Calendar incremental prototype. Tokens only in memory. */
let googleToken = null;
let googleTokenClient = null;
let googleCalendars = [];
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly';
const G_MAP_KEY = 'tempo-google-links-v3';
const G_CAL_KEY = 'tempo-google-calendar-v3';
const G_CLIENT_KEY = 'tempo-google-client-v3';
let googleLinks = JSON.parse(localStorage.getItem(G_MAP_KEY) || '{}');
function gStatus(s){document.getElementById('googleStatus').textContent=s;}
function saveGoogleLinks(){localStorage.setItem(G_MAP_KEY,JSON.stringify(googleLinks));}
function googleReady(){return !!(window.google && google.accounts && google.accounts.oauth2);}
function connectGoogle(){
 const clientId=document.getElementById('googleClientId').value.trim();
 if(!clientId.endsWith('.apps.googleusercontent.com')){gStatus('Renseigne un ID client OAuth Google valide.');return;}
 if(location.protocol!=='https:' && location.hostname!=='localhost'){gStatus('Héberge cette application en HTTPS avant de connecter Google.');return;}
 if(!googleReady()){gStatus('La bibliothèque Google n’est pas encore chargée. Vérifie ta connexion Internet.');return;}
 localStorage.setItem(G_CLIENT_KEY,clientId);
 googleTokenClient=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:GOOGLE_SCOPE,callback:async response=>{
   if(response.error){gStatus('Connexion refusée : '+response.error);return;}
   googleToken=response.access_token;gStatus('Google connecté pour cette session. Chargement des calendriers…');await loadGoogleCalendars();
 }});
 googleTokenClient.requestAccessToken({prompt:'consent'});
}
async function gFetch(path,opts={}){
 if(!googleToken)throw Error('Reconnecte Google : la session a expiré ou n’est pas ouverte.');
 const r=await fetch('https://www.googleapis.com/calendar/v3'+path,{...opts,headers:{Authorization:'Bearer '+googleToken,'Content-Type':'application/json',...(opts.headers||{})}});
 if(r.status===401){googleToken=null;throw Error('Session Google expirée. Reconnecte-toi.');}
 const body=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(body.error?.message||'Erreur Google '+r.status);
 return body;
}
async function loadGoogleCalendars(){
 try{
  const result=await gFetch('/users/me/calendarList?maxResults=250');
  googleCalendars=(result.items||[]).filter(c=>['owner','writer'].includes(c.accessRole));
  const select=document.getElementById('googleCalendar');
  select.replaceChildren();
  for(const c of googleCalendars){const opt=document.createElement('option');opt.value=c.id;opt.textContent=c.summary+(c.primary?' (principal)':'');select.appendChild(opt);}
  select.value=googleCalendars.some(c=>c.id===localStorage.getItem(G_CAL_KEY))?localStorage.getItem(G_CAL_KEY):googleCalendars[0]?.id||'';
  gStatus(googleCalendars.length+' calendrier(s) modifiable(s) trouvé(s). Sélectionne un calendrier, puis lance la synchronisation.');
 }catch(e){gStatus('Impossible de charger les calendriers : '+e.message);}
}
function googleEventFromItem(i){
 const start=new Date(i.date+'T'+i.start+':00');
 const end=new Date(start.getTime()+Number(i.duration)*60000);
 const cat=getCategory(i);
 return {summary:i.title,description:(i.notes||'')+'\n\n[Tempo ID: '+i.id+']',start:{dateTime:start.toISOString()},end:{dateTime:end.toISOString()},colorId:cat.googleColorId||closestGoogle(cat.color)};
}
function localFromGoogle(e,calendarId){
 const start=e.start?.dateTime;
 if(!start||e.status==='cancelled')return null;
 const d=new Date(start),end=new Date(e.end?.dateTime||start);
 if(!Number.isFinite(d.getTime()))return null;
 return {id:crypto.randomUUID(),title:e.summary||'Sans titre',destination:'google-personal',category:'pers',date:localDate(d),start:String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),duration:Math.max(5,Math.round((end-d)/60000)),priority:'Normale',notes:(e.description||'').replace(/\n\n\[Tempo ID: [^\]]+\]/g,''),photo:'',reminder:0};
}
async function syncGoogle(){
 const cal=document.getElementById('googleCalendar').value;
 if(!googleToken){gStatus('Connecte Google avant de synchroniser.');return;}
 if(!cal){gStatus('Sélectionne un calendrier Google.');return;}
 localStorage.setItem(G_CAL_KEY,cal);
 gStatus('Synchronisation en cours…');
 let created=0,updated=0,imported=0,conflicts=0;
 try{
  // Import a limited rolling window; do not delete local events based on missing remote results.
  const lower=new Date();lower.setMonth(lower.getMonth()-3);
  const upper=new Date();upper.setMonth(upper.getMonth()+12);
  let page='',remote=[];
  do{
   const q=new URLSearchParams({timeMin:lower.toISOString(),timeMax:upper.toISOString(),singleEvents:'true',maxResults:'250',...(page?{pageToken:page}:{})});
   const r=await gFetch('/calendars/'+encodeURIComponent(cal)+'/events?'+q);
   remote.push(...(r.items||[]));page=r.nextPageToken||'';
  }while(page&&remote.length<3000);
  const byId=new Map(remote.map(e=>[e.id,e]));
  const tracked=new Set(Object.values(googleLinks).filter(x=>x.calendarId===cal).map(x=>x.eventId));
  for(const e of remote){
   if(tracked.has(e.id)||e.status==='cancelled')continue;
   const newItem=localFromGoogle(e,cal);if(!newItem)continue;
   items.push(newItem);
   googleLinks[newItem.id]={calendarId:cal,eventId:e.id,etag:e.etag,localHash:JSON.stringify(googleEventFromItem(newItem))};
   imported++;
  }
  // Publish only items explicitly targeted to Google; do not upload internal tasks.
  for(const i of items.filter(x=>x.destination==='google-personal'||x.destination==='google-work')){
   const link=googleLinks[i.id];
   if(link&&link.calendarId!==cal)continue;
   const payload=googleEventFromItem(i),hash=JSON.stringify(payload);
   if(link){
    if(hash===link.localHash)continue;
    const server=byId.get(link.eventId)||await gFetch('/calendars/'+encodeURIComponent(cal)+'/events/'+encodeURIComponent(link.eventId));
    if(server.etag!==link.etag){conflicts++;continue;}
    const result=await gFetch('/calendars/'+encodeURIComponent(cal)+'/events/'+encodeURIComponent(link.eventId),{method:'PATCH',headers:{'If-Match':link.etag},body:JSON.stringify(payload)});
    googleLinks[i.id]={calendarId:cal,eventId:result.id,etag:result.etag,localHash:hash};updated++;
   }else{
    const result=await gFetch('/calendars/'+encodeURIComponent(cal)+'/events',{method:'POST',body:JSON.stringify(payload)});
    googleLinks[i.id]={calendarId:cal,eventId:result.id,etag:result.etag,localHash:hash};created++;
   }
  }
  saveGoogleLinks();persist();render();
  gStatus(`Synchronisation terminée : ${created} créé(s), ${updated} modifié(s), ${imported} importé(s), ${conflicts} conflit(s) non écrasé(s). Les changements effectués dans Google sur des éléments déjà importés ne sont pas encore rapatriés automatiquement.`);
 }catch(e){saveGoogleLinks();persist();render();gStatus('Synchronisation interrompue : '+e.message+' — Les opérations déjà effectuées peuvent avoir été enregistrées.');}
}
function disconnectGoogle(){googleToken=null;googleTokenClient=null;googleCalendars=[];document.getElementById('googleCalendar').replaceChildren();gStatus('Déconnecté de Google pour cette session. Les événements locaux sont conservés.');}
document.getElementById('googleClientId').value=localStorage.getItem(G_CLIENT_KEY)||'';
