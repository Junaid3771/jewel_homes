import * as THREE from './vendor/three/three.module.min.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';

// Furnished spatial studies; source drawings remain the authoritative project layouts.
export function createApartmentViewer(host,{bedrooms=2,compact=false,onRoom=()=>{},onFrame=()=>{}}={}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xe6e0d5);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.setAttribute('aria-label','Furnished 3D apartment. Drag to look around. Use the room buttons to move between rooms.');renderer.domElement.tabIndex=0;host.append(renderer.domElement);
 const pmrem=new THREE.PMREMGenerator(renderer),roomEnv=new RoomEnvironment(),environment=pmrem.fromScene(roomEnv,.04);scene.environment=environment.texture;scene.environmentIntensity=.6;roomEnv.dispose();pmrem.dispose();
 const camera=new THREE.PerspectiveCamera(64,1,.04,180);
 const hemi=new THREE.HemisphereLight(0xfff1d7,0x91836b,1.0);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xffe6ba,2);sun.position.set(-9,13,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:40});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.025;sun.shadow.bias=-.0003;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xd1e4e8,.6);fill.position.set(10,7,-7);scene.add(fill);
 const world=new THREE.Group(),walls=new THREE.Group(),ceilings=new THREE.Group(),exterior=new THREE.Group();scene.add(world,walls,ceilings,exterior);
 const resources=[],materials=[],textures=[],barriers=[],roomLights=[];const geometries=new Map();const boxGeo=new THREE.BoxGeometry(1,1,1);resources.push(boxGeo);
 let model=null,rooms=[],mode=compact?'dollhouse':'inside',current='living',yaw=0,pitch=-.04,alive=true,visible=true,last=0,frame,tween=null,night=false,drag=null,pointers=new Map(),pinch=null;
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.075;orbit.enabled=mode==='dollhouse';orbit.autoRotate=compact&&!reduced;orbit.autoRotateSpeed=.35;orbit.minPolarAngle=.3;orbit.maxPolarAngle=1.35;orbit.minDistance=7;orbit.maxDistance=32;orbit.target.set(.5,0,0);orbit.enablePan=false;
 function mat(color,extra={}){const m=new THREE.MeshStandardMaterial({color,roughness:.78,...extra});materials.push(m);return m}
 function surfaceTexture(kind){
  const size=128,data=new Uint8Array(size*size*4),base=kind==='wood'?[139,103,72]:kind==='rug'?[196,184,158]:[217,205,183];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,noise=Math.sin(x*57.13+y*17.71)*Math.cos(x*13.1+y*83.3);let shade=kind==='wood'?Math.sin(x*.7+Math.sin(y*.035)*1.8)*9+noise*3:noise*3;if(kind==='stone'&&(x%64<1||y%64<1))shade-=22;if(kind==='rug')shade+=(x%3===0||y%3===0)?4:-2;for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,base[c]+shade));data[i+3]=255;}
  const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;textures.push(t);return t;
 }
 const oak=surfaceTexture('wood'),stoneTex=surfaceTexture('stone'),rugTex=surfaceTexture('rug');oak.repeat.set(2,1);stoneTex.repeat.set(4,4);rugTex.repeat.set(3,3);
 // Scenic backdrop uses an original Jewel website image, not an invented view from the unit.
 const scenery=new THREE.TextureLoader().load('media/3cc010e37815-sub-banner.jpg');scenery.colorSpace=THREE.SRGBColorSpace;scenery.wrapS=THREE.RepeatWrapping;scenery.repeat.set(3,1);textures.push(scenery);
 const scenicGeo=new THREE.CylinderGeometry(36,36,17,96,1,true);resources.push(scenicGeo);const scenicMat=new THREE.MeshBasicMaterial({map:scenery,side:THREE.BackSide,toneMapped:false,color:0xe8e9db});materials.push(scenicMat);const scenicMesh=new THREE.Mesh(scenicGeo,scenicMat);scenicMesh.position.y=5;exterior.add(scenicMesh);
 const M={wall:mat(0xe8e0d2),trim:mat(0xd8cdbb),ceiling:mat(0xf1eadd),stone:mat(0xffffff,{map:stoneTex,roughness:.42}),wood:mat(0xffffff,{map:oak,roughness:.55}),darkwood:mat(0x67452e,{roughness:.5}),cream:mat(0xe6ddc9,{roughness:.94}),linen:mat(0xc7bba2,{roughness:.97}),green:mat(0x324c42,{roughness:.95}),bronze:mat(0xb19967,{metalness:.75,roughness:.3}),black:mat(0x1d2522,{roughness:.3}),white:mat(0xf2eadb,{roughness:.35}),glass:mat(0x9db3ad,{transparent:true,opacity:.19,metalness:.25,roughness:.12,depthWrite:false}),rug:mat(0xffffff,{map:rugTex,roughness:1}),leaves:mat(0x4b6447,{side:THREE.DoubleSide,roughness:1}),light:mat(0xffe9bd,{emissive:0xffd69c,emissiveIntensity:1.7}),tile:mat(0xb5b3a6,{roughness:.45})};
 const roundCache=new Map();
 function roundGeometry(w,h,d,r=.06){const key=[w,h,d,r].join(':');if(roundCache.has(key))return roundCache.get(key);const shape=new THREE.Shape(),x=-w/2,y=-h/2;r=Math.min(r,w/4,h/4,d/4);shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);const g=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.01,d-r*2),bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r/2,bevelThickness:r,curveSegments:3});g.center();resources.push(g);roundCache.set(key,g);return g}
 function box(parent,x,y,z,w,h,d,material,rotation=0,rounded=false){const mesh=new THREE.Mesh(rounded?roundGeometry(w,h,d):boxGeo,material);mesh.position.set(x,y,z);if(!rounded)mesh.scale.set(w,h,d);mesh.rotation.y=rotation;mesh.castShadow=material!==M.glass;mesh.receiveShadow=true;parent.add(mesh);return mesh}
 function cylinder(parent,x,y,z,rTop,rBottom,h,material,sides=20){const key=`c${rTop}:${rBottom}:${h}:${sides}`;let g=geometries.get(key);if(!g){g=new THREE.CylinderGeometry(rTop,rBottom,h,sides);geometries.set(key,g);resources.push(g)}const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function plant(parent,x,z,size=1){cylinder(parent,x,.22*size,z,.18*size,.13*size,.44*size,M.cream);const pos=[];for(let i=0;i<13;i++){const a=i*2.4,sy=.4*size,ey=(.85+(i%4)*.15)*size,rad=(.25+(i%3)*.08)*size;const root=new THREE.Vector3(x,sy,z),tip=new THREE.Vector3(x+Math.sin(a)*rad,ey,z+Math.cos(a)*rad),side=new THREE.Vector3(Math.cos(a)*.13*size,0,-Math.sin(a)*.13*size),mid=root.clone().lerp(tip,.6);for(const v of [root,mid.clone().add(side),tip,tip,mid.clone().sub(side),root])pos.push(v.x,v.y,v.z)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();resources.push(g);parent.add(new THREE.Mesh(g,M.leaves))}
 function lamp(parent,x,z){cylinder(parent,x,.04,z,.2,.22,.07,M.bronze);cylinder(parent,x,.74,z,.016,.02,1.4,M.bronze);cylinder(parent,x,1.48,z,.22,.33,.32,M.cream);cylinder(parent,x,1.31,z,.25,.25,.014,M.light)}
 function chair(parent,x,z,rotation=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);box(g,0,.46,0,.48,.12,.5,M.cream,0,true);box(g,0,.75,.2,.5,.55,.1,M.green,0,true);for(const sx of [-1,1])for(const sz of [-1,1])cylinder(g,sx*.18,.22,sz*.18,.018,.014,.44,M.darkwood,8)}
 function sofa(parent,x,z,rotation=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);box(g,0,.22,0,2.3,.3,.86,M.linen,0,true);box(g,0,.68,-.36,2.36,.7,.2,M.cream,0,true);for(const side of [-1,1])box(g,side*1.12,.52,0,.19,.65,.96,M.cream,0,true);for(let i=-1;i<=1;i++){box(g,i*.69,.46,.06,.67,.2,.76,M.cream,0,true);const cushion=box(g,i*.69,.73,-.14,.52,.48,.14,i===0?M.linen:M.green,0,true);cushion.rotation.x=-.2}for(const sx of [-1,1])for(const sz of [-1,1])cylinder(g,sx*.96,.08,sz*.3,.025,.018,.16,M.darkwood,8)}
 function bed(parent,x,z,rotation=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);box(g,0,.23,0,1.68,.36,2.08,M.darkwood,0,true);box(g,0,.48,0,1.64,.25,2.04,M.white,0,true);box(g,0,.61,.25,1.65,.1,1.48,M.linen,0,true);box(g,0,.82,-1.03,1.9,1.2,.14,M.green,0,true);for(const sx of [-1,1]){box(g,sx*.43,.68,-.65,.62,.17,.42,M.cream,0,true);box(g,sx*1.22,.31,-.55,.48,.55,.52,M.wood);cylinder(g,sx*1.22,.7,-.55,.08,.11,.26,M.bronze);cylinder(g,sx*1.22,.91,-.55,.18,.2,.22,M.cream)}box(g,0,.69,.68,1.67,.06,.44,M.green);box(g,0,.03,.25,2.5,.025,2.4,M.rug)}
 function furniture(room){const {x,z,w,d,id}=room,cx=x+w/2,cz=z+d/2;
  if(id==='living'){
   sofa(model,x+.52,cz,Math.PI/2);box(model,cx+.25,.03,cz,1.7,.025,2.2,M.rug);cylinder(model,cx+.22,.38,cz,.48,.48,.06,M.wood);cylinder(model,cx+.22,.18,cz,.17,.22,.33,M.darkwood);cylinder(model,cx+.1,.45,cz,.12,.1,.1,M.white);box(model,cx+.35,.43,cz+.12,.24,.035,.18,M.green,.3);chair(model,cx+.45,z+.45,Math.PI);lamp(model,x+.35,z+.45);plant(model,x+w-.35,z+.4,.85);
   box(model,x+w-.13,1.4,cz,.08,.85,1.48,M.black);box(model,x+w-.2,1.4,cz,.015,.76,1.38,M.darkwood);box(model,x+w-.31,.5,cz,.45,.48,1.9,M.wood);for(let i=0;i<14;i++)box(model,x+w-.06,1.5,z+.2+i*(d-.4)/14,.035,2.5,.035,M.wood);
  } else if(id==='dining'){
   box(model,cx,.76,cz,1.1,.08,1.75,M.wood,0,true);for(const s of [-1,1]){box(model,cx+s*.32,.38,cz,.06,.72,1.2,M.darkwood);for(const k of [-1,1])chair(model,cx+s*.83,cz+k*.48,s===1?-Math.PI/2:Math.PI/2)}cylinder(model,cx,.9,cz,.13,.1,.22,M.cream);for(let i=0;i<4;i++){cylinder(model,cx+(i%2?-.32:.32),.818,cz+(i<2?-.5:.5),.17,.17,.02,M.white);cylinder(model,cx+(i%2?-.32:.32),.86,cz+(i<2?-.5:.5),.035,.035,.07,M.glass)}
   for(let i=0;i<3;i++){const xx=cx+(i-1)*.35;cylinder(model,xx,2.6,cz,.009,.009,.7,M.black,6);cylinder(model,xx,2.23,cz,.13,.24,.2,M.bronze);cylinder(model,xx,2.12,cz,.18,.18,.01,M.light)}
  } else if(id==='kitchen'){
   box(model,cx,.47,z+.3,w-.12,.9,.6,M.green);box(model,x+w-.3,.47,cz,.6,.9,d-.12,M.green);box(model,cx,.96,z+.3,w,.055,.65,M.cream);box(model,x+w-.3,.96,cz,.65,.055,d,M.cream);
   for(let i=0;i<Math.floor(w/.55);i++){const xx=x+.3+i*.55;box(model,xx,.5,z+.615,.52,.78,.025,M.green);box(model,xx,.79,z+.64,.26,.018,.018,M.bronze);box(model,xx,2.1,z+.18,.52,.8,.36,M.cream);box(model,xx,1.67,z+.35,.48,.02,.02,M.light)}
   box(model,x+w-.3,.994,z+d*.55,.4,.022,.55,M.metal||M.bronze);box(model,x+w-.3,1.01,z+d*.55,.31,.025,.42,M.black);cylinder(model,x+w-.14,1.13,z+d*.55,.014,.014,.25,M.bronze);box(model,x+.5,1.0,z+.3,.62,.035,.42,M.black);for(const dx of [-.16,.16])for(const dz of [-.1,.1])cylinder(model,x+.5+dx,1.024,z+.3+dz,.075,.075,.014,M.bronze);
   box(model,x+.42,.45,z+d-.4,.76,.86,.74,M.wood);plant(model,x+w-.32,z+d-.3,.65);
  } else if(id.startsWith('bed')){
   bed(model,cx,cz+.1,id==='bed1'?-Math.PI/2:Math.PI/2);const wz=id==='bed1'?x+.22:x+w-.22;box(model,wz,1.3,z+.45,.42,2.5,.8,M.wood);for(let i=0;i<4;i++)box(model,wz+(id==='bed1'?.225:-.225),1.3,z+.1+i*.22,.025,2.35,.014,M.bronze);plant(model,id==='bed1'?x+w-.3:x+.3,z+d-.3,.75);
  } else if(id==='balcony'){
   for(let i=0;i<Math.floor(w/.17);i++)box(model,x+.08+i*.17,.015,cz,.15,.035,d,M.wood);cylinder(model,cx,.48,cz,.32,.32,.035,M.wood);cylinder(model,cx,.25,cz,.04,.05,.46,M.bronze);chair(model,cx-.65,cz,Math.PI/2);chair(model,cx+.65,cz,-Math.PI/2);plant(model,x+.22,z+d-.22,.8);plant(model,x+w-.22,z+d-.22,.8);
  } else if(id==='utility'){
   box(model,cx,.45,cz,.62,.86,.65,M.white);const door=cylinder(model,cx,.49,cz+.34,.22,.22,.035,M.black);door.rotation.x=Math.PI/2;box(model,cx,.91,cz,.65,.06,.7,M.wood);box(model,cx,1.85,z+.2,w-.15,.6,.35,M.cream);
  } else if(id.startsWith('bath')){
   box(model,x+.45,.48,z+.25,.7,.6,.46,M.wood);box(model,x+.45,.81,z+.25,.75,.06,.5,M.cream);cylinder(model,x+.45,.86,z+.25,.19,.17,.09,M.white);box(model,x+.45,1.55,z+.04,.7,.9,.035,M.bronze);box(model,x+.45,1.55,z+.065,.63,.83,.015,M.glass);cylinder(model,x+w-.42,.25,z+.4,.2,.16,.45,M.white);box(model,x+w-.42,.58,z+.14,.42,.67,.18,M.white,0,true);box(model,cx,1.1,z+d-.5,w-.12,2.1,.018,M.glass);cylinder(model,x+.18,2.02,z+d-.35,.025,.025,.4,M.bronze);cylinder(model,x+.18,2.25,z+d-.35,.12,.12,.02,M.bronze);
  }
 }
 function configure(count){
  if(model){for(const root of [model,walls,ceilings])root.traverse(o=>{if(o.isInstancedMesh)o.dispose()});world.remove(model);walls.clear();ceilings.clear();roomLights.forEach(light=>scene.remove(light));roomLights.length=0}model=new THREE.Group();world.add(model);barriers.length=0;
  rooms=count>=3?[
   {id:'living',name:'Living room',x:0,z:-4.5,w:3.6,d:3.3}, {id:'dining',name:'Dining',x:-1.2,z:-1.2,w:3,d:4.2}, {id:'kitchen',name:'Kitchen',x:-4.2,z:-4.5,w:3,d:2.4},
   {id:'bed1',name:'Primary bedroom',x:1.8,z:1.5,w:3,d:3.6}, {id:'bed2',name:'Bedroom two',x:-4.2,z:-2.1,w:3,d:3}, {id:'bed3',name:'Bedroom three',x:-4.2,z:.9,w:3,d:3},
   {id:'balcony',name:'Balcony',x:-1,z:3,w:2.8,d:1.35}, {id:'bath1',name:'Primary bathroom',x:2.4,z:0,w:2.4,d:1.5}, {id:'bath2',name:'Bathroom two',x:-5.6,z:-.8,w:1.4,d:2.15}, {id:'bath3',name:'Bathroom three',x:-5.6,z:1.35,w:1.4,d:2.15}, {id:'utility',name:'Utility',x:-5.4,z:-4.5,w:1.2,d:1.85}
  ]:[
   {id:'living',name:'Living room',x:-1.5,z:-4.5,w:3,d:3.3},{id:'dining',name:'Dining',x:-.75,z:-1.2,w:3,d:3},{id:'kitchen',name:'Kitchen',x:1.5,z:-4.2,w:2.1,d:3},
   {id:'bed1',name:'Primary bedroom',x:2.25,z:.6,w:3,d:3},{id:'bed2',name:'Bedroom two',x:-3.75,z:0,w:3,d:3.6},{id:'balcony',name:'Balcony',x:-.55,z:1.8,w:2.8,d:1.35},{id:'bath1',name:'Bathroom',x:-3.75,z:-1.5,w:2.4,d:1.5},{id:'bath2',name:'Primary bathroom',x:2.25,z:-.8,w:2,d:1.4}
  ];
  if(count===1)rooms=rooms.filter(r=>!['bed2','bath1'].includes(r.id));
  const H=2.9;
  function wallSegment(x1,z1,x2,z2,{window=false,door=false,balcony=false}={}){
   const horizontal=Math.abs(z2-z1)<.01,L=Math.hypot(x2-x1,z2-z1),cx=(x1+x2)/2,cz=(z1+z2)/2;
   const wallBox=(at,yy,length,hh,mat=M.wall)=>box(walls,horizontal?cx+at:cx,yy,horizontal?cz:cz+at,horizontal?length:.13,hh,horizontal?.13:length,mat);
   const barrier=(at,len)=>barriers.push({x:horizontal?cx+at:cx,z:horizontal?cz:cz+at,w:horizontal?len:.15,d:horizontal?.15:len});
   if(balcony){wallBox(0,.57,L,1.04,M.glass);wallBox(0,1.12,L,.035,M.bronze);for(let a=-L/2+.1;a<L/2;a+=.7)wallBox(a,.58,.024,1.12,M.bronze);barrier(0,L);return}
   if(door&&L>1.05){const opening=Math.min(1.05,L*.65),side=(L-opening)/2;for(const s of [-1,1]){wallBox(s*(opening/2+side/2),H/2,side,H);barrier(s*(opening/2+side/2),side)}wallBox(0,2.68,opening,.44);for(const s of [-1,1])wallBox(s*(opening/2+.015),1.15,.045,2.3,M.wood);return}
   if(window&&L>1.1){const opening=Math.min(L-.4,2.2),side=(L-opening)/2;for(const s of [-1,1])wallBox(s*(opening/2+side/2),H/2,side,H);wallBox(0,.42,opening,.84);wallBox(0,2.73,opening,.34);wallBox(0,1.71,opening,1.7,M.glass);for(const s of [-1,0,1])wallBox(s*opening/2,1.7,.035,1.73,M.bronze);wallBox(0,.85,opening+.15,.065,M.wood);barrier(0,L);return}
   wallBox(0,H/2,L,H);wallBox(0,.065,L,.13,M.trim);barrier(0,L);
  }
  // Split room edges at neighbour boundaries; openings are real gaps in the geometry.
  const seen=new Set();for(const r of rooms){
   box(model,r.x+r.w/2,-.05,r.z+r.d/2,r.w,.1,r.d,r.id.startsWith('bath')?M.tile:M.stone);const ceiling=box(ceilings,r.x+r.w/2,H+.06,r.z+r.d/2,r.w,.1,r.d,M.ceiling);ceiling.castShadow=false;
   const edges=[[r.x,r.z,r.x+r.w,r.z],[r.x+r.w,r.z,r.x+r.w,r.z+r.d],[r.x+r.w,r.z+r.d,r.x,r.z+r.d],[r.x,r.z+r.d,r.x,r.z]];
   for(const [x1,z1,x2,z2] of edges){const hor=Math.abs(z1-z2)<.001,lo=hor?Math.min(x1,x2):Math.min(z1,z2),hi=hor?Math.max(x1,x2):Math.max(z1,z2),fixed=hor?z1:x1;let cuts=[lo,hi];for(const q of rooms)cuts.push(...(hor?[q.x,q.x+q.w]:[q.z,q.z+q.d]).filter(v=>v>lo+.01&&v<hi-.01));cuts=[...new Set(cuts.map(v=>+v.toFixed(3)))].sort((a,b)=>a-b);
    for(let j=0;j<cuts.length-1;j++){const a=cuts[j],b=cuts[j+1],mid=(a+b)/2,key=[hor?'h':'v',fixed.toFixed(3),a,b].join(':');if(seen.has(key))continue;seen.add(key);const sx=hor?mid:fixed,sz=hor?fixed:mid;
     const neighbours=rooms.filter(q=>q!==r&&sx>=q.x-.001&&sx<=q.x+q.w+.001&&sz>=q.z-.001&&sz<=q.z+q.d+.001);
     const neighbour=neighbours[0],open=neighbour&&(['living','dining'].includes(r.id)&&['living','dining'].includes(neighbour.id));if(open)continue;
     const outdoor=r.id==='balcony'&&!neighbour;
     wallSegment(hor?a:fixed,hor?fixed:a,hor?b:fixed,hor?fixed:b,{balcony:outdoor,door:!!neighbour,window:!neighbour&&!outdoor&&!r.id.startsWith('bath')});
    }
   }
   furniture(r);
   if(['living','dining','bed1'].includes(r.id)){const light=new THREE.PointLight(0xffd59d,.6,6,2);light.position.set(r.x+r.w/2,2.5,r.z+r.d/2);scene.add(light);roomLights.push(light)}
  }
  // A quiet exterior horizon and projecting balcony planting make windows feel spatial.
  const terrain=box(model,0,-.7,0,120,.2,120,mat(0xdeddd2));terrain.receiveShadow=true;
  // Batch matching static furniture/wall meshes so room navigation stays responsive.
  for(const root of [model,walls,ceilings]){
   root.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),batches=new Map();root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;const key=o.geometry.id+':'+o.material.id+':'+o.castShadow;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o)});
   for(const objects of batches.values()){if(objects.length<2)continue;const first=objects[0],mesh=new THREE.InstancedMesh(first.geometry,first.material,objects.length);objects.forEach((o,i)=>{mesh.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));o.removeFromParent()});mesh.castShadow=first.castShadow;mesh.receiveShadow=true;root.add(mesh)}
  }
  setMode(mode,false);goRoom('living',false);return rooms;
 }
 function pose(id){const r=rooms.find(r=>r.id===id)||rooms[0];let eye=new THREE.Vector3(r.x+r.w*.8,1.5,r.z+r.d*.83),target=new THREE.Vector3(r.x+r.w*.3,1.05,r.z+r.d*.36);if(id==='living'){eye.set(r.x+r.w*.75,1.48,r.z+r.d*.87);target.set(r.x+.45,1.0,r.z+r.d*.4)}if(id==='kitchen'){eye.set(r.x+.48,1.5,r.z+r.d-.42);target.set(r.x+r.w-.35,1.1,r.z+.4)}if(id.startsWith('bed')){eye.set(id==='bed1'?r.x+.35:r.x+r.w-.35,1.5,r.z+.38);target.set(id==='bed1'?r.x+r.w-.55:r.x+.55,.82,r.z+r.d*.59)}if(id==='balcony'){eye.set(r.x+r.w*.5,1.5,r.z+.25);target.set(r.x+r.w*.5,1.25,r.z+r.d+6)}const dir=target.clone().sub(eye).normalize();return {eye,yaw:Math.atan2(-dir.x,-dir.z),pitch:Math.asin(dir.y)}}
 function look(){camera.lookAt(camera.position.clone().add(new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch))))}
 function goRoom(id,animate=true){current=id;const p=pose(id);if(mode==='inside'){if(animate&&!reduced)tween={start:performance.now(),from:camera.position.clone(),to:p.eye,fromYaw:yaw,toYaw:p.yaw,fromPitch:pitch,toPitch:p.pitch};else{tween=null;host.style.setProperty('--travel-fade',0);camera.position.copy(p.eye);yaw=p.yaw;pitch=p.pitch;look()}}host.dataset.travel=tween?'moving':'idle';host.setAttribute('aria-busy',String(!!tween));onRoom(id,rooms.find(r=>r.id===id))}
 function fitOverview(){const fit=Math.max(1,1.25/camera.aspect);camera.position.set(9*fit,11*fit,12*fit);orbit.target.set(.4,0,.2);orbit.update()}
 function setMode(next,notify=true){tween=null;host.style.setProperty('--travel-fade',0);mode=next;orbit.enabled=next==='dollhouse';ceilings.visible=exterior.visible=next==='inside';walls.scale.y=next==='dollhouse'?.36:1;if(next==='dollhouse'){scene.background.set(0xd8d5c9);camera.fov=40;fitOverview()}else{scene.background.set(0xe6e0d5);camera.fov=64;goRoom(current,false)}camera.updateProjectionMatrix()}
 function setNight(value){night=value;hemi.intensity=value?.5:1.0;sun.intensity=value?.15:2;fill.intensity=value?.25:.6;renderer.toneMappingExposure=value?1.0:.85;M.light.emissiveIntensity=value?3:1.7;scene.environmentIntensity=value?.35:.6;scenicMat.color.set(value?0x536068:0xe8e9db);roomLights.forEach(light=>light.intensity=value?6:.6);}
 function move(forward,side){if(mode!=='inside'||tween)return;const step=.24,dir=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));const next=camera.position.clone().addScaledVector(dir,forward*step).addScaledVector(right,side*step);const inside=rooms.some(r=>next.x>r.x+.12&&next.x<r.x+r.w-.12&&next.z>r.z+.12&&next.z<r.z+r.d-.12);const blocked=barriers.some(b=>Math.abs(next.x-b.x)<b.w/2+.16&&Math.abs(next.z-b.z)<b.d/2+.16);if(inside&&!blocked){camera.position.copy(next);look()}}
 const canvas=renderer.domElement;
 function down(e){if(mode!=='inside')return;canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);if(pointers.size===2){const a=[...pointers.values()];pinch=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}}
 function pointerMove(e){if(mode!=='inside'||!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const a=[...pointers.values()],distance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch)camera.fov=THREE.MathUtils.clamp(camera.fov-(distance-pinch)*.1,40,85);pinch=distance;camera.updateProjectionMatrix();return}if(drag){yaw-=(e.clientX-drag.x)*.004;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag.y)*.003,-1.1,1.1);drag={x:e.clientX,y:e.clientY};tween=null;look()}}
 function up(e){pointers.delete(e.pointerId);drag=null;pinch=null}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 canvas.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();if(k==='w')move(1,0);if(k==='s')move(-1,0);if(k==='a')move(0,-1);if(k==='d')move(0,1);if(k==='arrowleft')yaw+=.08;if(k==='arrowright')yaw-=.08;if(k==='arrowup')pitch=Math.min(1.1,pitch+.05);if(k==='arrowdown')pitch=Math.max(-1.1,pitch-.05);look()}});
 function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;if(mode==='dollhouse')fitOverview();camera.updateProjectionMatrix()}
 const ro=new ResizeObserver(resize);ro.observe(host);const io=new IntersectionObserver(e=>visible=e[0].isIntersecting,{rootMargin:'100px'});io.observe(host);
 function unobstructed(x,z){const dx=x-camera.position.x,dz=z-camera.position.z;for(const b of barriers){const tx0=(b.x-b.w/2-camera.position.x)/(dx||.000001),tx1=(b.x+b.w/2-camera.position.x)/(dx||.000001),tz0=(b.z-b.d/2-camera.position.z)/(dz||.000001),tz1=(b.z+b.d/2-camera.position.z)/(dz||.000001);const enter=Math.max(0,Math.min(tx0,tx1),Math.min(tz0,tz1)),exit=Math.min(1,Math.max(tx0,tx1),Math.max(tz0,tz1));if(enter<exit&&enter>.025&&enter<.975)return false}return true}
 const projected=new THREE.Vector3();let measuredFrames=0,measurementStart=performance.now();
 function animate(t){
  if(!alive)return;frame=requestAnimationFrame(animate);
  if(!visible||document.hidden){last=t;measurementStart=t;measuredFrames=0;return}
  const delta=Math.min(.05,(t-last)/1000);last=t;
  if(tween){const k=Math.min(1,(t-tween.start)/900),s=k*k*(3-2*k);camera.position.lerpVectors(tween.from,tween.to,s);const diff=THREE.MathUtils.euclideanModulo(tween.toYaw-tween.fromYaw+Math.PI,Math.PI*2)-Math.PI;yaw=tween.fromYaw+diff*s;pitch=THREE.MathUtils.lerp(tween.fromPitch,tween.toPitch,s);look();host.style.setProperty('--travel-fade',Math.sin(k*Math.PI)*.35);if(k===1){tween=null;host.style.setProperty('--travel-fade',0)}}
  if(mode==='dollhouse')orbit.update(delta);renderer.render(scene,camera);
  measuredFrames++;if(t-measurementStart>1200){host.dataset.renderFps=String(Math.round(measuredFrames*1000/(t-measurementStart)));host.dataset.drawCalls=String(renderer.info.render.calls);measurementStart=t;measuredFrames=0}
  onFrame(rooms.map(r=>{const x=r.x+r.w/2,z=r.z+r.d/2;projected.set(x,.1,z).project(camera);return {id:r.id,x:(projected.x*.5+.5)*host.clientWidth,y:(-projected.y*.5+.5)*host.clientHeight,visible:projected.z<1&&projected.z>-1&&Math.abs(projected.x)<.9&&Math.abs(projected.y)<.9&&(mode==='dollhouse'||unobstructed(x,z))}}),{mode,current,transitioning:!!tween,pose:[camera.position.x,camera.position.z,yaw].map(v=>v.toFixed(3)).join(',')});
 }
 configure(bedrooms);resize();frame=requestAnimationFrame(animate);
 return {get rooms(){return rooms},setBedrooms:configure,goRoom,setMode,setNight,move,get mode(){return mode},get current(){return current},zoom(direction){if(mode==='inside'){camera.fov=THREE.MathUtils.clamp(camera.fov-direction*6,40,85);camera.updateProjectionMatrix()}else{const offset=camera.position.clone().sub(orbit.target).multiplyScalar(direction>0?.88:1.14);offset.clampLength(7,32);camera.position.copy(orbit.target).add(offset);orbit.update()}},reset(){if(mode==='inside')goRoom(current,false);else setMode('dollhouse')},destroy(){if(!alive)return;alive=false;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();orbit.dispose();scene.traverse(o=>{if(o.isInstancedMesh)o.dispose()});resources.forEach(r=>r.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();canvas.remove()}};
}
