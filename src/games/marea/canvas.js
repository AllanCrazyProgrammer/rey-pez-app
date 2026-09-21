// No textures, downloads or per-frame DOM nodes. Canvas backing size is capped at 2×.
export function drawCatch(canvas, game) {
  if (!canvas || !game) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = canvas.clientWidth;
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const pixels = Math.round(width * scale);
  if (canvas.width !== pixels || canvas.height !== pixels) { canvas.width = pixels; canvas.height = pixels; }
  ctx.setTransform(pixels / 360, 0, 0, pixels / 360, 0, 0);
  ctx.clearRect(0, 0, 360, 360);
  ctx.fillStyle = '#e1f1e9'; ctx.fillRect(0, 0, 360, 360);
  ctx.strokeStyle = '#c5dfd4'; ctx.lineWidth = 2;
  for (let row = 0; row < 7; row++) {
    ctx.beginPath();
    for (let x = 0; x <= 360; x += 6) {
      const y = row * 56 + 20 + Math.sin(x / 28 + row) * 5;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (const drop of game.drops) {
    ctx.save(); ctx.translate(drop.x * 360, drop.y * 360);
    if (drop.kind === 'rock') {
      ctx.fillStyle = '#62736e'; ctx.strokeStyle = '#364f48'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(-8, -11); ctx.lineTo(5, -14); ctx.lineTo(15, -1); ctx.lineTo(10, 12); ctx.lineTo(-7, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#93a49a'; ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(4, -7); ctx.stroke();
    } else {
      ctx.rotate(-0.3);
      ctx.strokeStyle = drop.kind === 'gold' ? '#e6b13d' : '#ef8d6a'; ctx.lineWidth = 11; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, 12, -Math.PI / 2, Math.PI * 0.9); ctx.stroke();
      ctx.fillStyle = drop.kind === 'gold' ? '#d09926' : '#df6c50';
      ctx.beginPath(); ctx.moveTo(-11, 4); ctx.lineTo(-21, 9); ctx.lineTo(-15, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#354c42'; ctx.beginPath(); ctx.arc(3, -12, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9d6245'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(6, -12); ctx.quadraticCurveTo(20, -28, 24, -16); ctx.stroke();
      if (drop.kind === 'gold') { ctx.fillStyle = '#fff7ce'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('★', -18, -18); }
    }
    ctx.restore();
  }
  const x = game.basket * 360;
  ctx.save();
  if (game.invincible > 0) ctx.globalAlpha = 0.55 + Math.sin(game.elapsed * 20) * 0.2;
  ctx.fillStyle = '#277d6c'; ctx.strokeStyle = '#204e43'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 34, 291); ctx.lineTo(x + 34, 291); ctx.lineTo(x + 27, 329); ctx.lineTo(x - 27, 329); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#a4d9bc'; ctx.lineWidth = 3;
  for (let i = -18; i <= 18; i += 18) { ctx.beginPath(); ctx.moveTo(x + i, 300); ctx.lineTo(x + i, 320); ctx.stroke(); }
  ctx.fillStyle = '#f2c568'; ctx.fillRect(x - 37, 285, 74, 9);
  ctx.restore();
  ctx.fillStyle = '#3c685b'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('← Mueve tu tara →', x, 350);
}
