const $=(q,root=document)=>root.querySelector(q),$$=(q,root=document)=>[...root.querySelectorAll(q)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let engine;
const load=()=>engine ||= import('./apartment3d.js?v=20261026-interior-2');
const params=new URLSearchParams(location.search);
function bedroomCount(plan){return /3\s*(?:Bedroom|BHK)/i.test(plan.label)?3:/1\s*(?:Bedroom|BHK)/i.test(plan.label)?1:2}
async function start(host){
 if(host.dataset.initialized)return;host.dataset.initialized='true';
 const full=host.id==='apartment-viewer';let viewer=null,properties,p,plan,index=1,night=false;
 try{
  const {createApartmentViewer}=await load();
  if(!full){viewer=createApartmentViewer(host,{compact:true,bedrooms:2});host.dataset.renderer='webgl';$('.interior-loading',host)?.remove();addEventListener('pagehide',e=>{if(!e.persisted)viewer.destroy()});return}
  properties=await fetch('properties.json').then(r=>{if(!r.ok)throw Error('Unable to load apartment data');return r.json()});
  function roomChanged(id,room){$('#current-room-name').textContent=room?.name||'Your apartment';$$('.room-navigator button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.room===id)));$$('.interior-room-hotspot').forEach(b=>b.classList.toggle('current',b.dataset.room===id))}
  let positionTime=0;
  function updateHotspots(points,state){const now=performance.now();if(now-positionTime<40)return;positionTime=now;for(const point of points){const b=$(`.interior-room-hotspot[data-room="${point.id}"]`);if(!b)continue;b.hidden=!point.visible||(state.mode==='inside'&&point.id===state.current);b.style.transform=`translate(${point.x}px,${point.y}px) translate(-50%,-50%)`}host.dataset.viewMode=state.mode;host.dataset.travel=state.transitioning?'moving':'idle';host.dataset.pose=state.pose;host.setAttribute('aria-busy',String(state.transitioning))}
  function mount(){
   $('#interior-hotspots').innerHTML='';
   if(viewer)viewer.setBedrooms(bedroomCount(plan));else viewer=createApartmentViewer(host,{bedrooms:bedroomCount(plan),onRoom:roomChanged,onFrame:updateHotspots});
   host.dataset.renderer='webgl';host.dataset.layout=String(index);$('.interior-loading',host)?.remove();
   $('#room-navigator').innerHTML=viewer.rooms.map((r,i)=>`<button data-room="${r.id}" aria-pressed="${r.id==='living'}"><small>${String(i+1).padStart(2,'0')}</small>${esc(r.name)}<span>↗</span></button>`).join('');
   $('#interior-hotspots').innerHTML=viewer.rooms.map(r=>`<button class="interior-room-hotspot" data-room="${r.id}" aria-label="Move to ${esc(r.name)}"><i>↗</i><span>${esc(r.name)}</span></button>`).join('');
   $$('[data-room]').forEach(b=>b.addEventListener('click',()=>{viewer.goRoom(b.dataset.room);if(viewer.mode==='dollhouse')setMode('inside')}));
   $('#apartment-heading').innerHTML=`${esc(p.name)} <span>/</span> ${esc(plan.label.match(/TYPE\s*-?\s*[^ ]+(?:\s*&\s*[^ ]+)?/i)?.[0]||'Apartment layout')}`;
   $('#apartment-layout-summary').textContent=`${bedroomCount(plan)} bedroom interior study${params.get('level')?' · Selected study level '+params.get('level'):''}`;
   $('#interior-layout-title').textContent=plan.label;
   $('#back-to-building').href='property-explorer.html?project='+p.prefix;
   $('#interior-enquire').href='enquiry.html?project='+encodeURIComponent(p.name);
   setMode('inside');viewer.setNight(night);roomChanged('living',viewer.rooms[0]);
  }
  function setMode(mode){viewer.setMode(mode);$('#mode-inside').setAttribute('aria-pressed',String(mode==='inside'));$('#mode-dollhouse').setAttribute('aria-pressed',String(mode==='dollhouse'));$('#interior-stage').classList.toggle('dollhouse-mode',mode==='dollhouse');$('#current-room-name').textContent=mode==='dollhouse'?'Your apartment, in perspective.':viewer.rooms.find(r=>r.id===viewer.current)?.name||'Living room'}
  function chooseProject(prefix,initial=false){p=properties.find(q=>q.prefix===prefix&&q.category!=='Completed')||properties.find(q=>q.prefix==='capital'&&q.category!=='Completed');$('#interior-project').value=p.prefix;const requested=Number(params.get('layout')??1);index=initial&&Number.isInteger(requested)?Math.max(0,Math.min(p.plans.length-1,requested)):0;$('#interior-layout').innerHTML=p.plans.map((pl,i)=>`<option value="${i}">${esc(pl.label)}</option>`).join('');$('#interior-layout').value=String(index);plan=p.plans[index];mount()}
  chooseProject(params.get('project')||'capital',true);
  $('#interior-project').addEventListener('change',e=>{params.delete('level');chooseProject(e.target.value);updateURL(true)});
  $('#interior-layout').addEventListener('change',e=>{index=+e.target.value;plan=p.plans[index];mount();updateURL()});
  function updateURL(clearLevel=false){const url=new URL(location.href);url.searchParams.set('project',p.prefix);url.searchParams.set('layout',String(index));if(clearLevel)url.searchParams.delete('level');history.replaceState(null,'',url)}
  $('#mode-inside').addEventListener('click',()=>setMode('inside'));$('#mode-dollhouse').addEventListener('click',()=>setMode('dollhouse'));
  $('#interior-light').addEventListener('click',e=>{night=!night;viewer.setNight(night);e.currentTarget.textContent=night?'☾':'☀';e.currentTarget.setAttribute('aria-pressed',String(night));e.currentTarget.setAttribute('aria-label',night?'Switch interior to daylight':'Switch interior to evening')});
  $('#interior-zoom-in').addEventListener('click',()=>viewer.zoom(1));$('#interior-zoom-out').addEventListener('click',()=>viewer.zoom(-1));$('#interior-reset').addEventListener('click',()=>viewer.reset());
  $('#interior-fullscreen').addEventListener('click',async()=>{const stage=$('#interior-stage');try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else stage.classList.toggle('interior-expanded')}catch{stage.classList.toggle('interior-expanded')}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#interior-stage').classList.remove('interior-expanded')});
  $('#open-source-plan').addEventListener('click',()=>{const dialog=$('#lightbox');$('img',dialog).src=plan.image;$('img',dialog).alt=plan.label;$('p',dialog).textContent=p.name+' · '+plan.label;dialog.showModal()});
  $('#interior-references').innerHTML=['media/20842b0d89e5-interior-2.jpg','media/820e39119201-interior-7.jpg','media/61b48a0c5415-interior-12.jpg'].map((src,i)=>`<a href="${src}" data-lightbox><img loading="lazy" src="${src}" alt="Original Jewel Homes ${['living room','interior','bedroom'][i]} photograph"><span>JEWEL HOMES / ORIGINAL INTERIORS <b>↗</b></span></a>`).join('');
  addEventListener('pagehide',e=>{if(!e.persisted)viewer?.destroy()});
 }catch(error){console.error('Apartment interior:',error);host.innerHTML='<div class="model-error"><p class="eyebrow">APARTMENT INTERIOR</p><h2>Explore the original drawings.</h2><p>The 3D interior could not start on this device. Please use a browser with hardware acceleration enabled.</p><a class="btn btn-gold" href="capital-apts-floorplans.html">View original floor plans ↗</a></div>'}
}
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){observer.unobserve(e.target);start(e.target)}}),{rootMargin:'250px'});
$$('[data-apartment-viewer]').forEach(host=>host.id==='apartment-viewer'?start(host):observer.observe(host));
