// Scenery and sprites are cached once; no asset downloads or per-frame DOM work.
let scenery;
const sprites = new Map();
function gradient(ctx, x, y, x2, y2, colors) {
  const g = ctx.createLinearGradient(x,y,x2,y2);
  colors.forEach((color,i) => g.addColorStop(i/(colors.length-1),color)); return g;
}
function polygon(ctx, points, fill, stroke) {
  ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath();
  ctx.fillStyle=fill; ctx.fill(); if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
function background() {
  if(scenery) return scenery;
  scenery=document.createElement('canvas');scenery.width=scenery.height=720;
  const c=scenery.getContext('2d');c.scale(2,2);
  c.fillStyle=gradient(c,0,0,0,160,['#163d58','#669cad','#f3cca1']);c.fillRect(0,0,360,170);
  const glow=c.createRadialGradient(277,55,7,277,55,95);glow.addColorStop(0,'#ffe4a788');glow.addColorStop(1,'#ffe4a700');
  c.fillStyle=glow;c.fillRect(180,0,180,150);c.fillStyle='#ffe9b4';c.beginPath();c.arc(277,55,22,0,7);c.fill();
  polygon(c,[[0,125],[36,93],[55,102],[85,70],[137,122],[182,91],[233,127],[282,101],[360,130],[360,153],[0,153]],'#477c8c');
  polygon(c,[[0,134],[57,123],[114,135],[172,110],[253,136],[308,123],[360,140],[360,161],[0,161]],'#28576c');
  c.fillStyle=gradient(c,0,144,0,360,['#3c9f9f','#1d6c82','#12344d']);c.fillRect(0,144,360,216);
  c.fillStyle='#ffe4a136';for(let i=0;i<6;i++)c.fillRect(256-i*3,149+i*8,42+i*6,2);
  polygon(c,[[29,121],[33,72],[45,72],[49,121]],'#f2ddb4','#375365');
  c.fillStyle='#ba715d';c.fillRect(32,92,15,9);polygon(c,[[29,72],[39,61],[49,72]],'#263f51');
  c.fillStyle='#ffe49d';c.fillRect(35,74,8,6);c.fillStyle='#193f55';c.fillRect(23,119,35,5);
  polygon(c,[[212,147],[275,147],[262,159],[224,159]],'#d59660','#234d60');
  c.fillStyle='#eee0c0';c.fillRect(231,133,26,14);c.fillStyle='#215b70';c.fillRect(234,136,8,7);c.fillRect(246,136,8,7);
  c.strokeStyle='#dfcaaa';c.lineWidth=1.5;c.beginPath();c.moveTo(243,132);c.lineTo(243,103);c.lineTo(265,132);c.stroke();
  polygon(c,[[243,104],[260,104],[253,113],[243,113]],'#efac70');
  c.fillStyle='#182f41';c.fillRect(0,332,360,28);
  c.fillStyle=gradient(c,0,332,0,360,['#b1865d','#69503e']);c.fillRect(0,337,360,23);
  c.strokeStyle='#453e34';c.lineWidth=1;for(let i=0;i<360;i+=40){c.beginPath();c.moveTo(i,337);c.lineTo(i-10,360);c.stroke();}
  c.strokeStyle='#d5af7b';c.beginPath();c.moveTo(0,340);c.lineTo(360,340);c.stroke();
  for(const x of [10,340]){c.fillStyle='#583f32';c.fillRect(x,299,10,44);c.fillStyle='#ad8e65';c.fillRect(x-2,298,14,5);}
  return scenery;
}
function sprite(kind) {
  if(sprites.has(kind))return sprites.get(kind);
  const image=document.createElement('canvas');image.width=image.height=96;
  const c=image.getContext('2d');c.translate(48,48);c.lineJoin='round';c.lineCap='round';
  if(kind==='rock'){
    c.lineWidth=3;polygon(c,[[-29,11],[-20,-19],[3,-29],[29,-9],[25,20],[-4,29]],gradient(c,-20,-25,20,30,['#b1c4ca','#677b8b','#35465b']),'#293e52');
    polygon(c,[[-20,-19],[3,-29],[8,-4],[-29,11]],'#95a9b3');polygon(c,[[8,-4],[29,-9],[25,20],[-4,29]],'#455a70');
    c.strokeStyle='#c3d1d4';c.beginPath();c.moveTo(-16,-14);c.lineTo(0,-21);c.stroke();
  }else if(kind==='shield'||kind==='ice'){
    const blue=kind==='shield';c.lineWidth=3;
    polygon(c,[[0,-34],[29,-17],[29,17],[0,34],[-29,17],[-29,-17]],gradient(c,0,-35,0,35,blue?['#a3eeff','#218bdb','#2863b1']:['#e5ffff','#8ddfef','#369fbf']),'#e1faff');
    c.strokeStyle='#fff';c.lineWidth=4;
    if(blue){c.beginPath();c.moveTo(-15,-13);c.lineTo(0,-18);c.lineTo(15,-13);c.quadraticCurveTo(17,8,0,20);c.quadraticCurveTo(-17,8,-15,-13);c.stroke();}
    else for(let i=0;i<6;i++){c.save();c.rotate(i*Math.PI/3);c.beginPath();c.moveTo(0,0);c.lineTo(0,-22);c.moveTo(0,-14);c.lineTo(-6,-19);c.moveTo(0,-14);c.lineTo(6,-19);c.stroke();c.restore();}
  }else{
    const gold=kind==='gold';c.rotate(-.35);c.lineWidth=20;
    c.strokeStyle=gradient(c,-20,-25,25,30,gold?['#fff3b4','#ffc944','#bf772b']:['#ffdfae','#fcaa7b','#c8594a']);
    c.beginPath();c.arc(0,0,23,-Math.PI*.48,Math.PI*.93);c.stroke();
    c.lineWidth=2;c.strokeStyle=gold?'#a5752e':'#964e45';
    for(let i=0;i<5;i++){const a=i*.55;c.beginPath();c.moveTo(Math.cos(a)*14,Math.sin(a)*14);c.lineTo(Math.cos(a)*31,Math.sin(a)*31);c.stroke();}
    polygon(c,[[-20,12],[-36,15],[-29,30],[-15,22]],gold?'#e1a63d':'#e67b5d',c.strokeStyle);
    polygon(c,[[0,-31],[23,-30],[18,-15],[4,-14]],gold?'#ffd977':'#ffc09b',c.strokeStyle);
    c.fillStyle='#293e4a';c.beginPath();c.arc(14,-25,3,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(15,-26,1,0,7);c.fill();
    c.beginPath();c.moveTo(13,-31);c.quadraticCurveTo(26,-47,39,-30);c.stroke();
    c.strokeStyle='#fff9da';c.lineWidth=3;c.beginPath();c.arc(0,0,28,-.1,1);c.stroke();
  }
  sprites.set(kind,image);return image;
}
export function drawCatch(canvas,game) {
  if(!canvas||!game)return;
  const c=canvas.getContext('2d');if(!c)return;
  const pixels=Math.round(canvas.clientWidth*Math.min(window.devicePixelRatio||1,2));if(!pixels)return;
  if(canvas.width!==pixels||canvas.height!==pixels){canvas.width=pixels;canvas.height=pixels;}
  c.setTransform(pixels/360,0,0,pixels/360,0,0);c.drawImage(background(),0,0,360,360);
  c.lineWidth=1.4;
  for(let row=0;row<6;row++){c.strokeStyle='rgba(126,220,212,'+(.26-row*.025)+')';c.beginPath();for(let x=0;x<=360;x+=9){const y=169+row*28+Math.sin(x/32+game.elapsed*(.6+row*.12))*3;if(!x)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}
  if(game.frozen){c.fillStyle='#9feaff22';c.fillRect(0,0,360,333);}
  for(const drop of game.drops){
    c.save();c.translate(drop.x*360,drop.y*360);c.rotate(Math.sin(game.elapsed*3+drop.id)*.18);
    if(['gold','shield','ice'].includes(drop.kind)){c.fillStyle=drop.kind==='gold'?'#ffdc7526':'#8edcff26';c.beginPath();c.arc(0,0,24+Math.sin(game.elapsed*4)*2,0,7);c.fill();}
    c.drawImage(sprite(drop.kind),-23,-23,46,46);c.restore();
  }
  for(const p of game.particles){c.globalAlpha=p.life*2;c.fillStyle=p.color;c.beginPath();c.arc(p.x*360,p.y*360,2.5,0,7);c.fill();}c.globalAlpha=1;
  c.save();c.translate(game.basket*360,0);
  if(game.invincible>0)c.globalAlpha=.6+Math.sin(game.elapsed*20)*.2;
  if(game.shield){c.strokeStyle='#94ecff';c.lineWidth=2;c.fillStyle='#6ddaff22';c.beginPath();c.ellipse(0,307,45,34,0,0,7);c.fill();c.stroke();}
  c.fillStyle='#0c243d66';c.beginPath();c.ellipse(0,332,34,5,0,0,7);c.fill();
  c.lineWidth=2;polygon(c,[[-32,289],[32,289],[26,329],[-26,329]],'#287d85','#163f53');
  polygon(c,[[32,289],[38,285],[31,323],[26,329]],'#164052');
  c.strokeStyle='#8cdbcc';c.lineWidth=2;
  for(let i=-20;i<=20;i+=10){c.beginPath();c.moveTo(i,296);c.lineTo(i*.85,322);c.stroke();}
  for(const y of [304,315]){c.beginPath();c.moveTo(-29,y);c.lineTo(29,y);c.stroke();}
  c.fillStyle='#ecc47b';c.fillRect(-35,283,70,9);c.fillStyle='#ffe6b0';c.fillRect(-35,283,70,2);c.restore();
}
