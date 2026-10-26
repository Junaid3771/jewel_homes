const $=(q,root=document)=>root.querySelector(q),$$=(q,root=document)=>[...root.querySelectorAll(q)];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let enginePromise;
const loadEngine=()=>enginePromise ||= import('./building3d.js?v=20261026-2');

async function boot(host){
  if(host.dataset.initialized)return;host.dataset.initialized='true';
  const full=host.id==='property-building-viewer';
  try {
    const {createBuildingViewer,modelProfiles}=await loadEngine();
    let viewer,selected=null,tab='overview',p=null,night=false;
    let properties=full?await fetch('properties.json').then(r=>{if(!r.ok)throw Error('Project data unavailable');return r.json()}):null;
    const requested=new URLSearchParams(location.search).get('project');
    const initial=full&&modelProfiles[requested]?requested:(host.dataset.buildingViewer||'capital');
    const panel=$('#spatial-panel-content');
    function onInteract(){if(full){$('#spatial-rotate').textContent='▷';$('#spatial-rotate').setAttribute('aria-label','Start automatic rotation');$('#spatial-rotate').setAttribute('aria-pressed','false');$('#spatial-hint').classList.add('hint-dismissed')}}
    function select(level){
      selected=level;
      if(!full)return;
      $('#selected-level-bar').hidden=level===null;
      $('#selected-level-label').textContent=level===null?'':`LEVEL ${String(level).padStart(2,'0')} / ARCHITECTURAL STUDY`;
      if(level!==null){tab='plans';onInteract()}
      render();
      if(level!==null&&innerWidth<700)document.querySelector('.spatial-panel').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
    }
    let lastCompassAngle=Infinity;
    viewer=createBuildingViewer(host,{prefix:initial,compact:!full,onSelect:select,onInteract,onFrame(angle){if(full&&Math.abs(angle-lastCompassAngle)>.002){$('#spatial-compass-needle').style.transform=`rotate(${-angle*180/Math.PI}deg)`;lastCompassAngle=angle}}});
    host.classList.add('model-ready');$('.model-loading',host)?.remove();
    host.dataset.renderer='webgl';
    if(!full){
      $('.home-model-toggle',host.parentElement)?.addEventListener('click',e=>{const running=viewer.rotate();e.currentTarget.textContent=running?'Ⅱ':'▷';e.currentTarget.setAttribute('aria-label',running?'Pause 3D preview rotation':'Start 3D preview rotation')});
      addEventListener('pagehide',e=>{if(!e.persisted)viewer.destroy()});return;
    }
    function render(){
      $$('.spatial-tabs button').forEach(b=>{const active=b.dataset.spatialTab===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1});
      panel.setAttribute('aria-labelledby','tab-'+tab);
      if(tab==='overview')panel.innerHTML=`<p class="eyebrow">${escape(p.category)} RESIDENCE</p><h2>${escape(p.caption||p.name)}</h2><div class="spatial-facts">${p.facts.map(f=>`<div><span>${escape(f.split(':')[0])}</span><p>${escape(f.split(':').slice(1).join(':').trim())}</p></div>`).join('')}</div><p class="spatial-description">${escape(p.paragraphs[0]||'Explore Jewel Homes.')}</p><div class="level-picker"><label for="level-select">EXPLORE A LEVEL</label><select id="level-select"><option value="">Select a level in the study</option>${Array.from({length:viewer.profile.floors},(_,i)=>`<option value="${i+1}">Level ${String(i+1).padStart(2,'0')}${i<viewer.profile.parking?' · Podium study':''}</option>`).reverse().join('')}</select><p>Select directly on the model or choose a level above.</p></div>`;
      else if(tab==='plans')panel.innerHTML=`<p class="eyebrow">ORIGINAL JEWEL FLOOR PLANS</p><h2>${selected!==null?'Level '+String(selected).padStart(2,'0')+'<br><em>Explore the layouts.</em>':'A plan for<br><em>your way of living.</em>'}</h2><p class="plan-context">${selected!==null?'The highlighted level is an illustrative selection. These original project layouts are not assigned to that specific floor.':'Select any plan to open the original drawing at full size.'}</p><div class="spatial-plan-filter"><label>LAYOUT TYPE<select id="layout-filter"><option value="">All layouts</option><option value="1">1 bedroom</option><option value="2">2 bedrooms</option><option value="3">3 bedrooms</option></select></label></div><div class="spatial-plan-list">${p.plans.map((plan,i)=>`<div class="apartment-choice" data-plan-label="${escape(plan.label)}"><a class="spatial-plan-card" data-lightbox href="${escape(plan.image)}"><div><img loading="lazy" src="${escape(plan.thumb)}" alt="${escape(plan.label)}"><span>+</span></div><p>${escape(plan.label)}</p></a><a class="enter-apartment" href="apartment-interior.html?project=${encodeURIComponent(p.prefix)}&layout=${i}${selected!==null?'&level='+selected:''}">Enter this apartment in 3D <span>↗</span></a></div>`).join('')}</div><p id="no-plan-results" hidden>No layouts match this filter. Choose all layouts to see the available drawings.</p>`;
      else panel.innerHTML=`<p class="eyebrow">THE JEWEL WAY OF LIVING</p><h2>Everyday life.<br><em>Well considered.</em></h2><ul class="spatial-amenities">${p.amenities.map(a=>`<li><span>✦</span>${escape(a)}</li>`).join('')}</ul><a class="text-link" href="${escape(p.route)}">All specifications & details ↗</a>`;
      const levelSelect=$('#level-select');levelSelect?.addEventListener('change',e=>viewer.selectLevel(e.target.value?+e.target.value:null));
      $('#layout-filter')?.addEventListener('change',e=>{
        let count=0;const value=e.target.value;
        $$('.apartment-choice').forEach(card=>{const label=card.dataset.planLabel;const match=!value||new RegExp(`\\b${value}\\s*(?:Bedroom|BHK)\\b`,'i').test(label);card.hidden=!match;if(match)count++});$('#no-plan-results').hidden=count!==0;
      });
      $('#spatial-enquire').href='enquiry.html?project='+encodeURIComponent(p.name);$('#spatial-interior-link').href='apartment-interior.html?project='+encodeURIComponent(p.prefix)+'&layout=1'+(selected!==null?'&level='+selected:'');$('#spatial-details').href=p.route;
    }
    function choose(prefix,build=true){
      p=properties.find(q=>q.prefix===prefix&&q.category!=='Completed')||properties.find(q=>q.prefix==='capital'&&q.category!=='Completed');
      if(build)viewer.setProject(p.prefix);
      selected=null;tab='overview';$('#selected-level-bar').hidden=true;
      $('#residence3d-title').textContent=p.name;$('#residence3d-select').value=p.prefix;$('#spatial-reference').href=p.image;$('#spatial-reference').title=p.name+' — original Jewel elevation';
      render();host.dataset.project=p.prefix;
    }
    choose(initial,false);
    $('#residence3d-select').addEventListener('change',e=>{choose(e.target.value);history.replaceState(null,'','?project='+encodeURIComponent(p.prefix))});
    $$('.spatial-tabs button').forEach(b=>{
      b.addEventListener('click',()=>{tab=b.dataset.spatialTab;render()});
      b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=$$('.spatial-tabs button'),i=tabs.indexOf(b),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tab=tabs[next].dataset.spatialTab;render();tabs[next].focus()});
    });
    $('#clear-level').addEventListener('click',()=>viewer.selectLevel(null));
    $('#spatial-rotate').addEventListener('click',e=>{const active=viewer.rotate();e.currentTarget.textContent=active?'Ⅱ':'▷';e.currentTarget.setAttribute('aria-label',active?'Pause automatic rotation':'Start automatic rotation');e.currentTarget.setAttribute('aria-pressed',String(active))});
    if(reduced){$('#spatial-rotate').textContent='▷';$('#spatial-rotate').setAttribute('aria-pressed','false');$('#spatial-rotate').setAttribute('aria-label','Start automatic rotation')}
    $('#spatial-zoom-in').addEventListener('click',()=>viewer.zoom(1));$('#spatial-zoom-out').addEventListener('click',()=>viewer.zoom(-1));
    $('#spatial-reset').addEventListener('click',()=>{viewer.reset();viewer.selectLevel(null)});
    $('#spatial-daylight').addEventListener('click',e=>{night=!night;viewer.setNight(night);e.currentTarget.innerHTML=night?'☾ <span>Evening</span>':'☀ <span>Daylight</span>';e.currentTarget.setAttribute('aria-pressed',String(night));e.currentTarget.setAttribute('aria-label',night?'Switch to daylight':'Switch to evening')});
    $('#spatial-fullscreen').addEventListener('click',async()=>{const stage=$('#spatial-stage');try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else stage.classList.toggle('spatial-expanded')}catch{stage.classList.toggle('spatial-expanded')}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#spatial-stage').classList.remove('spatial-expanded')});
    addEventListener('pagehide',e=>{if(!e.persisted)viewer.destroy()});
  }catch(error){
    console.error('Jewel 3D viewer:',error);
    host.classList.add('model-failed');host.innerHTML='<div class="model-error"><p class="eyebrow">3D VIEWER UNAVAILABLE</p><h2>Explore the<br>original details.</h2><p>This device could not start the 3D viewer. Try a current browser with hardware acceleration, or view the original project imagery and plans.</p><a class="btn btn-gold" href="capital-apartments-deshabhimani.html">View Jewel Capital ↗</a></div>';
    if(full){$('#spatial-hint').hidden=true;$('#spatial-panel-content').innerHTML='<p class="spatial-description">The original elevations, floor plans and project details remain available.</p><a class="text-link" href="capital-apartments-deshabhimani.html">Explore Jewel Capital ↗</a>'}
  }
}

const hosts=$$('[data-building-viewer]');
const lazy=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){lazy.unobserve(e.target);boot(e.target)}}),{rootMargin:'300px'});
hosts.forEach(host=>{if(host.id==='property-building-viewer')boot(host);else lazy.observe(host)});
