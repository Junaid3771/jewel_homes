import * as THREE from './vendor/three/three.module.min.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';

export const modelProfiles = {
  capital: { floors:14, width:26, depth:18, storey:3.05, parking:3, accent:0xb68b52, type:'capital' },
  pristine: { floors:17, width:22, depth:16, storey:2.9, parking:2, accent:0x8d9b58, type:'pristine' },
  radius: { floors:12, width:24, depth:17, storey:3.05, parking:2, accent:0x8d725a, type:'radius' }
};

// Geometry is reconstructed from the published exterior references, not survey/CAD data.
export function createBuildingViewer(host, options = {}) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact=options.compact || false;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0xe7e9e2);
  scene.fog=new THREE.Fog(0xe7e9e2,150,300);
  const camera=new THREE.PerspectiveCamera(33,1,.5,500);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.35:1.7));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.9;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label','Interactive three-dimensional Jewel Homes building. Drag to rotate, pinch or use controls to zoom.');
  renderer.domElement.setAttribute('role','img');
  host.append(renderer.domElement);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.04);
  scene.environment=environment.texture;
  room.dispose();pmrem.dispose();
  const ambient=new THREE.HemisphereLight(0xdce8f2,0x909276,1.5);scene.add(ambient);
  const sun=new THREE.DirectionalLight(0xfff2d5,3.1);
  sun.position.set(-42,85,40);sun.castShadow=true;
  sun.shadow.mapSize.set(innerWidth<700?1024:2048,innerWidth<700?1024:2048);
  Object.assign(sun.shadow.camera,{left:-55,right:55,top:75,bottom:-45,near:1,far:180});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-.0003;sun.shadow.normalBias=.06;sun.shadow.radius=3;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xc1d4e2,1.1);fill.position.set(35,35,-40);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(1200,1200),new THREE.MeshStandardMaterial({color:0xe1e3db,roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.18;ground.receiveShadow=true;scene.add(ground);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.065;
  controls.enablePan=!compact;controls.panSpeed=.55;controls.rotateSpeed=.55;controls.zoomSpeed=.7;
  controls.minPolarAngle=.35;controls.maxPolarAngle=Math.PI/2-.03;
  controls.autoRotate=!reduced;controls.autoRotateSpeed=.38;
  controls.minDistance=40;controls.maxDistance=160;
  controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  let group=null,profile=null,proxies=[],highlight=null,edges=null,night=false,alive=true,inView=true,lastTime=0,userDragging=false;
  let pointerStart=null,selectedLevel=null,frame=0,materials=[],geometries=[];
  const baseGeo=new THREE.BoxGeometry(1,1,1);
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),quaternion=new THREE.Quaternion();
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const windowMaterials=[];
  function material(color,extra={}){const m=new THREE.MeshStandardMaterial({color,roughness:.75,metalness:0,...extra});materials.push(m);return m}
  function build(prefix='capital'){
    if(group){scene.remove(group);group.traverse(o=>{if(o.isInstancedMesh){o.dispose();}});materials.forEach(m=>{m.map?.dispose();m.dispose()});geometries.forEach(g=>g.dispose());}
    materials=[];geometries=[];windowMaterials.length=0;proxies=[];selectedLevel=null;highlight=null;edges=null;
    profile=modelProfiles[prefix]||modelProfiles.capital;
    const {floors,width:W,depth:D,storey:S,parking:parking,accent,type}=profile;
    const H=floors*S;
    group=new THREE.Group();scene.add(group);
    const batches=new Map();
    const white=material(0xe7e5dc),chalk=material(0xf4f1e7),concrete=material(0xc4c3b7),dark=material(0x383d3e),black=material(0x242d30),gold=material(accent,{roughness:.58}),stone=material(0x999b8e),metal=material(0x69716e,{metalness:.7,roughness:.3}),glass=material(0x48646a,{metalness:.58,roughness:.18,envMapIntensity:1.8}),glass2=material(0x6d8588,{metalness:.7,roughness:.2,envMapIntensity:1.7}),curtain=material(0xc8c0aa),lawn=material(0x75816b,{roughness:1}),asphalt=material(0x797d78,{roughness:.98}),paving=material(0xc7c7b8),leaves=material(0x425c48,{roughness:1}),leaflight=material(0x718068,{roughness:1});
    windowMaterials.push(glass,glass2);
    function box(x,y,z,w,h,d,mat,ry=0){
      if(!batches.has(mat))batches.set(mat,[]);
      position.set(x,y,z);scale.set(w,h,d);quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),ry);matrix.compose(position,quaternion,scale);batches.get(mat).push(matrix.clone());
    }
    // Raised site, kerb, circulation and planting courts.
    box(0,.0,0,W+22,.5,D+23,stone);
    box(0,.28,0,W+21,.14,D+22,paving);
    box(0,.4,-D/2-5,W+19,.07,5,asphalt);
    box(-W/2-6,.4,0,4,.07,D+17,asphalt);
    box(0,.42,D/2+5,W+16,.1,5,asphalt);
    for(let x=-W/2-5;x<W/2+6;x+=5)box(x,.49,D/2+5,2,.015,.08,chalk);
    box(0,.48,D/2+9,W+18,.15,3,lawn);
    box(W/2+6,.48,0,4,.15,D+10,lawn);
    box(-W/2-3,.5,D/2+1,1.5,.15,3,lawn);
    // Continuous structure and deeply recessed façade bays.
    box(0,H/2+.7,0,W-.7,H,D-.8,type==='radius'?gold:white);
    for(let level=0;level<floors;level++){
      const y=.7+level*S;
      const podium=level<parking;
      box(0,y+.12,0,W+.7,.23,D+.7,podium?concrete:chalk);
      box(0,y+S-.12,0,W+.75,.15,D+.75,chalk);
      // Both long façades, composed of glazing, balcony recesses and slender piers.
      for(const side of [-1,1]){
        const z=side*(D/2+.03);
        if(podium){
          box(0,y+S*.5,z,W-.2,S-.38,.1,black);
          for(let k=0;k<=6;k++)box(-W/2+k*W/6,y+S/2,z+side*.25,.4,S,.8,level===0?concrete:dark);
          for(let j=0;j<13;j++)box(-W/2+.7+j*(W-1.4)/12,y+S*.7,z+side*.33,.08,S*.4,.07,metal);
          box(0,y+S*.52,z+side*.34,W,.07,.09,metal);
        }else{
          for(let bay=0;bay<6;bay++){
            const bw=W/6,x=-W/2+bw*(bay+.5),recess=bay===1||bay===4;
            const bayZ=z-side*(recess?.5:.0);
            const windowWidth=type==='capital'&&!recess?bw*.5:bw-.46;
            box(x,y+S*.51,bayZ,windowWidth,S-.42,.16,dark);
            box(x-.04,y+S*.54,bayZ+side*.12,windowWidth-.49,S-1.0,.1,(bay+level)%4===0?glass2:glass);
            // Window mullions, sills and optional curtain backing.
            box(x,y+S*.56,bayZ+side*.18,.065,S-.9,.075,metal);
            box(x,y+S*.54,bayZ+side*.19,windowWidth-.44,.055,.07,metal);
            box(x,y+.52,bayZ+side*.2,windowWidth-.34,.12,.25,white);
            if((bay+level)%5===0)box(x-.75,y+S*.52,bayZ+side*.2,.48,S-1.05,.03,curtain);
            if(recess){
              box(x,y+.22,z+side*.4,bw-.15,.18,1.45,chalk);
              for(let r=0;r<5;r++)box(x-bw/2+.4+r*(bw-.8)/4,y+.75,z+side*1.03,.045,1,.05,metal);
              box(x,y+1.24,z+side*1.03,bw-.5,.06,.06,metal);
              box(x,y+.7,z+side*.98,bw-.55,.6,.03,glass2);
            }
            const pierColor=type==='pristine'&&bay%2===0?gold:white;
            box(-W/2+bay*bw,y+S*.5,z+side*.3,.48,S+.05,.72,pierColor);
          }
          box(W/2,y+S*.5,z+side*.3,.48,S+.05,.72,white);
          if(type==='pristine')box(0,y+.48,z+side*.48,W+.2,.42,.5,gold);
        }
      }
      // Short elevations also have true geometry, so a complete orbit reveals depth.
      for(const side of [-1,1]){
        const x=side*(W/2+.1);
        for(let bay=0;bay<3;bay++){
          const z=-D/2+(bay+.5)*D/3;
          box(x,y+S*.52,z,.12,S-.65,D/3-1,podium?black:dark);
          if(!podium){
            box(x+side*.09,y+S*.55,z,.09,S-1.0,D/3-1.55,(level+bay)%3===0?glass2:glass);
            box(x+side*.13,y+S*.55,z,.07,S-.95,.06,metal);
          }
          box(x+side*.2,y+S*.5,-D/2+bay*D/3,.6,S,.5,white);
        }
        if(type==='radius')for(let r=0;r<6;r++)box(x+side*.4,y+S*.5,-D/2+.2+r*.22,.2,S,.07,gold);
      }
      // Invisible floor volumes are used only for picking, never as claimed apartment units.
      const proxy=new THREE.Mesh(new THREE.BoxGeometry(W+1,S,D+1),new THREE.MeshBasicMaterial({visible:false}));
      proxy.position.set(0,y+S/2,0);proxy.userData.level=level+1;group.add(proxy);proxies.push(proxy);geometries.push(proxy.geometry);materials.push(proxy.material);
    }
    // Tall charcoal architectural panels and the signature ochre framed accents.
    if(type==='capital'){
      for(const side of [-1,1]){
        const z=side*(D/2+.6);
        for(const x of [-W*.36,W*.36]){
          box(x,H*.66,z,1.9,H*.63,.3,dark);
          for(let level=parking;level<floors;level++)box(x,.7+level*S+S*.56,z+side*.22,.64,1.48,.1,glass);
        }
        for(const [x,base] of [[-W*.13,S*8+.7],[W*.17,S*4+.7]]){
          const fh=S*3.0,fw=4.0;
          box(x-fw/2,base+fh/2,z+side*.25,.38,fh,.45,gold);
          box(x+fw/2,base+fh/2,z+side*.25,.38,fh,.45,gold);
          box(x,base,z+side*.25,fw+.38,.38,.45,gold);
          box(x,base+fh,z+side*.25,fw+.38,.38,.45,gold);
        }
      }
    }
    // Roof terrace, parapet, lift cores, pergola beams and upper canopies.
    box(0,H+.82,0,W+1,.35,D+1,chalk);
    for(const s of [-1,1]){
      box(0,H+1.45,s*D/2,W+.4,1.0,.28,white);
      box(s*W/2,H+1.45,0,.28,1,D,white);
    }
    box(-W*.29,H+2.3,-D*.23,5.5,3.0,4.5,white);
    box(W*.29,H+2.3,-D*.23,5.5,3.0,4.5,white);
    box(-W*.29,H+3.85,-D*.23,6,.16,5.0,dark);
    box(W*.29,H+3.85,-D*.23,6,.16,5.0,dark);
    for(const side of [-1,1]){
      box(side*3.6,H+2.45,D*.18,.28,3.2,.28,chalk);
      box(side*3.6,H+2.45,-D*.1,.28,3.2,.28,chalk);
    }
    for(let i=0;i<7;i++)box(-4+i*1.33,H+4.0,D*.05,.22,.22,7.4,chalk);
    // Ground floor porte-cochère and entrance, with slim structural supports.
    box(0,4.1,D/2+2.1,8,.32,4.0,white);
    for(const x of [-3.6,3.6])box(x,2.2,D/2+3.55,.25,3.8,.25,dark);
    box(0,.65,D/2+2,8,.22,4,paving);
    for(let step=0;step<3;step++)box(0,.5+step*.12,D/2+3.8-step*.32,8,.12,.6,concrete);
    // Structured planting, low boundary walls, parking linework and lamp posts.
    for(const side of [-1,1]){
      box(side*(W/2+9),1.1,0,.2,1.3,D+19,concrete);
      for(let z=-D/2-5;z<D/2+7;z+=4.5){
        box(side*(W/2+5.6),.9,z,1.1,.65,2.5,stone);
        box(side*(W/2+5.6),1.35,z,1.0,.6,2.4,leaves);
      }
    }
    for(let i=0;i<7;i++){
      const x=-W/2+1+i*(W-2)/6;
      box(x,.53,-D/2-5,.07,.03,3.4,chalk);
    }
    for(const x of [-W/2-5,W/2+6]){
      for(const z of [-D/2-5,D/2+7]){
        box(x,2.3,z,.1,4,.1,metal);box(x+.35,4.3,z,.85,.07,.5,dark);
      }
    }
    for(const [mat,transforms] of batches){
      const mesh=new THREE.InstancedMesh(baseGeo,mat,transforms.length);
      transforms.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mat!==glass&&mat!==glass2;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
    }
    // Slender palms with curved, tapered fronds; no rounded toy-like tree crowns.
    const bark=material(0x7c7967,{roughness:1});
    const trees=[[-W/2-7,-D/2-6],[W/2+7,-D/2-6],[W/2+7,D/2+8]];
    const leafPositions=[];
    for(const [x,z] of trees){
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,.6,z),new THREE.Vector3(x+.18,3,z),new THREE.Vector3(x+.45,6,z+.15),new THREE.Vector3(x+.65,8.3,z+.25)]);
      const trunkgeo=new THREE.TubeGeometry(curve,10,.11,5,false);geometries.push(trunkgeo);const trunk=new THREE.Mesh(trunkgeo,bark);trunk.castShadow=true;group.add(trunk);
      for(let frond=0;frond<10;frond++){
        const a=frond*Math.PI*2/10,length=3.4+(frond%3)*.4;
        const center=t=>new THREE.Vector3(x+.65+Math.cos(a)*length*t,8.3+Math.sin(t*Math.PI)*.75-t*t*2.1,z+.25+Math.sin(a)*length*t);
        for(let segment=0;segment<9;segment++){
          const t0=segment/9,t1=(segment+1)/9,p0=center(t0),p1=center(t1),w0=Math.sin(t0*Math.PI)*.29,w1=Math.sin(t1*Math.PI)*.29;
          const side=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));
          const l0=p0.clone().addScaledVector(side,w0),r0=p0.clone().addScaledVector(side,-w0),l1=p1.clone().addScaledVector(side,w1),r1=p1.clone().addScaledVector(side,-w1);
          for(const v of [l0,r0,l1,l1,r0,r1])leafPositions.push(v.x,v.y,v.z);
        }
      }
    }
    const palmgeo=new THREE.BufferGeometry();palmgeo.setAttribute('position',new THREE.Float32BufferAttribute(leafPositions,3));palmgeo.computeVertexNormals();geometries.push(palmgeo);
    const palmmat=material(0x526849,{roughness:.95,side:THREE.DoubleSide});const palms=new THREE.Mesh(palmgeo,palmmat);palms.castShadow=true;group.add(palms);
    // Contact shadow is a procedural lighting effect, not an external photo asset.
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
    const ctx=shadowCanvas.getContext('2d'),grad=ctx.createRadialGradient(64,64,2,64,64,64);grad.addColorStop(0,'rgba(24,35,30,.45)');grad.addColorStop(1,'rgba(24,35,30,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
    const texture=new THREE.CanvasTexture(shadowCanvas),shadowmat=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});materials.push(shadowmat);
    const shadowplane=new THREE.Mesh(new THREE.PlaneGeometry(W*2,D*2.4),shadowmat);geometries.push(shadowplane.geometry);shadowplane.rotation.x=-Math.PI/2;shadowplane.position.y=.56;group.add(shadowplane);
    const selectGeo=new THREE.BoxGeometry(W+1.1,S+.03,D+1.1);geometries.push(selectGeo);
    const selectMat=new THREE.MeshBasicMaterial({color:0xd6b771,transparent:true,opacity:.18,depthWrite:false});materials.push(selectMat);
    highlight=new THREE.Mesh(selectGeo,selectMat);highlight.visible=false;group.add(highlight);
    const edgeGeo=new THREE.EdgesGeometry(selectGeo);geometries.push(edgeGeo);const edgeMat=new THREE.LineBasicMaterial({color:0xbd9355,transparent:true,opacity:.9});materials.push(edgeMat);edges=new THREE.LineSegments(edgeGeo,edgeMat);edges.visible=false;group.add(edges);
    reset();setNight(night);return profile;
  }
  function reset(){
    const H=profile.floors*profile.storey;
    controls.target.set(0,H*.48,0);
    const distance=H*1.65;
    camera.position.set(distance*.82,H*.91,distance*1.12);
    controls.minDistance=H*.85;controls.maxDistance=H*4;
    camera.updateProjectionMatrix();controls.update();
  }
  function selectLevel(level,notify=true){
    level=level==null?null:Math.max(1,Math.min(profile.floors,Number(level)));
    selectedLevel=level;highlight.visible=edges.visible=level!==null;
    if(level!==null){const y=.7+(level-.5)*profile.storey;highlight.position.y=edges.position.y=y;}
    if(notify)options.onSelect?.(level);
  }
  function setNight(value){
    night=value;scene.background.set(night?0x172d39:0xe7e9e2);scene.fog.color.copy(scene.background);
    ground.material.color.set(night?0x536363:0xe1e3db);
    ambient.intensity=night?.7:1.5;sun.intensity=night?.55:3.1;fill.intensity=night?.8:1.1;
    renderer.toneMappingExposure=night?1.05:.9;
    windowMaterials.forEach(m=>{m.emissive.set(night?0xffd28d:0x000000);m.emissiveIntensity=night?.55:0});
  }
  function pick(e){
    if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>7)return;
    const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(proxies,false)[0];
    if(hit){controls.autoRotate=false;selectLevel(hit.object.userData.level);}
  }
  renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY}});
  renderer.domElement.addEventListener('pointerup',pick);
  controls.addEventListener('start',()=>{userDragging=true;controls.autoRotate=false;options.onInteract?.()});
  controls.addEventListener('end',()=>userDragging=false);
  function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  const visibilityObserver=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting},{rootMargin:'100px'});visibilityObserver.observe(host);
  function animate(t){
    if(!alive)return;frame=requestAnimationFrame(animate);
    if(!inView||document.hidden){lastTime=t;return}
    const delta=Math.min((t-lastTime)/1000,.05);lastTime=t;controls.update(delta);renderer.render(scene,camera);options.onFrame?.(controls.getAzimuthalAngle());
  }
  build(options.prefix||'capital');resize();frame=requestAnimationFrame(animate);
  return {
    renderer,camera,controls,
    setProject:build,selectLevel,reset,setNight,
    get level(){return selectedLevel},get profile(){return profile},
    rotate(){controls.autoRotate=!controls.autoRotate;return controls.autoRotate},
    zoom(direction){const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(direction>0?.86:1.16);offset.clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset);controls.update()},
    destroy(){if(!alive)return;alive=false;cancelAnimationFrame(frame);resizeObserver.disconnect();visibilityObserver.disconnect();controls.dispose();group?.traverse(o=>{if(o.isInstancedMesh)o.dispose()});materials.forEach(m=>{m.map?.dispose();m.dispose()});geometries.forEach(g=>g.dispose());baseGeo.dispose();ground.geometry.dispose();ground.material.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove()}
  };
}
