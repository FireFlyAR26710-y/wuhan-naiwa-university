(() => {
  'use strict';
  const TARGET=window.NAIWA_CONFIG.targetUrl,DURATION=window.NAIWA_CONFIG.countdownSeconds;
  const params=new URLSearchParams(location.search),stay=params.get('stay')==='1';
  const reduce=params.get('motion')==='reduce'||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=id=>document.getElementById(id),stage=document.querySelector('.stage');
  $('go').href=TARGET;
  document.querySelector('.target-note span').textContent=new URL(TARGET).hostname;
  $('progress').setAttribute('aria-valuemax',String(DURATION));
  const frog=$('frog'),sprite=$('sprite'),shadow=$('frog-shadow'),halo=$('portal-halo'),shell=$('portal-shell');
  const ring1=$('ring-one'),ring2=$('ring-two'),bubble=$('bubble'),ripple=$('ripple'),flash=$('portal-flash');
  let t=0,last=0,raf=0,paused=false,stayPending=stay,ready=false;
  let width=900,base=1,gate=600,shadowWidth=130,lastFrame='',progressTick=-1;
  const clamp=v=>Math.min(1,Math.max(0,v)),segment=(v,a,b)=>clamp((v-a)/(b-a));
  const out=v=>1-Math.pow(1-v,4),ease=v=>v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2;
  const dialogOpen=()=>$('about').open||$('gallery').open;
  function measure(){width=stage.clientWidth;const small=matchMedia('(max-width:800px)').matches;base=small?.79:innerHeight<=810?.97:1.1;gate=width*(small?.70:.68);shadowWidth=shadow.offsetWidth;}
  addEventListener('resize',measure);measure();
  function frame(row,col){const key=`${row}:${col}`;if(key!==lastFrame){sprite.style.backgroundPosition=`${-col*192}px ${-row*208}px`;lastFrame=key;}}
  function updateButtons(){$('pause').setAttribute('aria-pressed',String(paused));$('pause-label').textContent=paused?'继续出发':'等等奶蛙';document.querySelector('.pause-icon').textContent=paused?'▷':'Ⅱ';$('replay').hidden=!paused;}
  function render(time,now){
    let row=1,col=Math.floor(time*11)%8;
    const enter=ease(segment(time,.3,2.25)),waveX=width*.35-96;
    let x=-210+(waveX+210)*enter,hop=reduce?0:Math.abs(Math.sin(time*8))*7*(1-segment(time,2,2.25));
    let scale=base,opacity=segment(time,.3,.75);
    if(time>=2.25&&time<3.65){row=3;col=Math.floor((time-2.25)*5)%4;hop=0;}
    if(time>=3.65&&time<4.9){row=3;col=time<4.5?1:2;x=waveX+(gate-167-waveX)*ease(segment(time,3.65,4.5));hop=0;}
    if(time>=4.9&&time<5.4){row=9;col=Math.min(7,Math.floor(segment(time,4.9,5.4)*8));x=gate-167;hop=0;}
    if(time>=5.4){const p=ease(segment(time,5.4,6.5));row=1;col=Math.floor(time*12)%8;x=gate-167+p*80;hop=reduce?0:Math.sin(p*Math.PI)*44;scale=base*(1-p*.48);opacity=1-segment(time,6,6.5);}
    if(paused&&!reduce){row=8;col=Math.floor(now/210)%6;hop=Math.sin(now/680)*2;}
    if(reduce){x=waveX;hop=0;scale=base;opacity=time<6.5?1:0;row=8;col=0;}
    frog.style.opacity=opacity;frog.style.transform=`translate3d(${x}px,${-hop}px,0) scale(${scale})`;frame(row,col);
    sprite.style.transform=row===3?'scaleX(-1)':'none';
    shadow.style.opacity=opacity*(1-hop/100);shadow.style.transform=`translateX(${x+96-shadowWidth/2}px) scale(${scale},${Math.max(.5,1-hop/100)})`;
    const greet=segment(time,2.25,2.7)*(1-segment(time,5,5.35));bubble.style.opacity=greet;bubble.style.transform=`translateY(${reduce?0:(1-greet)*8}px)`;
    const opening=out(segment(time,4,4.85));halo.style.opacity=opening*.9;halo.style.transform=`scale(${reduce?1:1+Math.sin(now/630)*.025*opening})`;
    ring1.style.transform=`scale(${1+opening*.08})`;ring2.style.transform=`rotate(${reduce?0:opening*20}deg) scale(${1+opening*.09})`;ring1.style.opacity=.4+opening*.4;shell.style.transform=`scale(${1+opening*.025})`;
    const land=segment(time,1.8,2.45);ripple.style.opacity=reduce?0:Math.sin(land*Math.PI)*.65;ripple.style.transform=`translateX(${waveX+96-65}px) scale(${.8+land*1.5},${.8+land*.5})`;
    const zoom=segment(time,6.55,7);stage.style.transform=`scale(${reduce?1:1+out(zoom)*.28})`;stage.style.opacity=1-zoom*.45;flash.style.opacity=reduce?0:zoom*.8;
    $('progress-fill').style.transform=`scaleX(${time/DURATION})`;
    if(Math.floor(time*10)!==progressTick){progressTick=Math.floor(time*10);$('seconds').textContent=Math.max(0,DURATION-time).toFixed(1);$('progress').setAttribute('aria-valuenow',time.toFixed(1));}
    const message=paused?'不着急，奶蛙陪你待一会儿':time<2.25?'奶蛙正在赶来接你':time<3.65?'奶蛙已就位，跟我走吧':time<5.4?'传送门已开启，准备去武城':'出发！武城见';
    if($('status').textContent!==message)$('status').textContent=message;
  }
  function tick(now){
    if(!last)last=now;const delta=Math.min((now-last)/1000,.08);last=now;
    const frozen=document.hidden||dialogOpen()||paused||!ready;
    if(!frozen)t=Math.min(DURATION,t+delta);
    if(stayPending&&t>=4.75){t=4.75;paused=true;stayPending=false;updateButtons();}
    render(t,now);
    if(t>=DURATION&&!frozen){window.naiwaEscort?.recordDeparture();location.replace(TARGET);return;}
    raf=requestAnimationFrame(tick);
  }
  $('pause').addEventListener('click',()=>{paused=!paused;stayPending=false;last=0;updateButtons();});
  $('replay').addEventListener('click',()=>{t=0;paused=false;stayPending=stay;last=0;progressTick=-1;updateButtons();});
  $('go').addEventListener('click',()=>{window.naiwaEscort?.recordDeparture();cancelAnimationFrame(raf);});
  const openDialog=id=>{$(id).showModal();last=0;};
  $('about-button').addEventListener('click',()=>openDialog('about'));$('gallery-button').addEventListener('click',()=>openDialog('gallery'));
  document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>$(el.dataset.close).close()));
  ['about','gallery'].forEach(id=>{const dialog=$(id);dialog.addEventListener('close',()=>{last=0;});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});
  document.addEventListener('visibilitychange',()=>{last=0;});
  const asset=new Image();asset.onload=()=>{ready=true;last=0;};asset.onerror=()=>{ready=true;last=0;};asset.src='assets/naiwa-sprites.webp';
  updateButtons();render(0,0);raf=requestAnimationFrame(tick);
})();
