export function initPreloader() {
  const preloader = document.getElementById('preloader');
  
  // Disable and hide preloader immediately on admin routes
  if (window.location.pathname.startsWith('/admin')) {
    if (preloader) {
      preloader.style.display = 'none';
      preloader.classList.add('fade-out');
    }
    return;
  }

  const canvas = document.getElementById('yarn-loader');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const FLOOR_Y = 140;
  const R0 = 32;
  const START_X = 100;
  const END_X = 600;
  const DURATION = 5500; // Slower speed (5.5 seconds)
  let start = null;
  const STROKE_COLOR = '#4a3e3d'; // Brand brown color

  window.preloaderAnimationFinished = false;
  window.canHidePreloader = false;

  function ease(t) {
    return t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
  }

  function drawYarnBall(cx, cy, r, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.rotate(angle);
    const lines = 5;
    for (let i = -lines; i <= lines; i++) {
      const y = (i / lines) * r * 0.88;
      const hw = Math.sqrt(Math.max(0, r * r - y * y)) * 0.95;
      if (hw < 2) continue;
      const sag = hw * 0.18 * Math.sign(i + 0.1);
      ctx.beginPath();
      ctx.moveTo(-hw, y);
      ctx.quadraticCurveTo(0, y + sag, hw, y);
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    const vlines = 4;
    for (let i = -vlines; i <= vlines; i++) {
      const x = (i / vlines) * r * 0.88;
      const hh = Math.sqrt(Math.max(0, r * r - x * x)) * 0.95;
      if (hh < 2) continue;
      const sag = hh * 0.18 * Math.sign(i + 0.1);
      ctx.beginPath();
      ctx.moveTo(x, -hh);
      ctx.quadraticCurveTo(x + sag, 0, x, hh);
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(ts) {
    const preloader = document.getElementById('preloader');
    if (preloader && preloader.classList.contains('fade-out')) {
      return; // Stop animating when preloader fades out
    }
    
    if (!start) start = ts;
    const raw = Math.min((ts - start) / DURATION, 1);
    const t = ease(raw);
    ctx.clearRect(0, 0, 700, 200);
    
    const r = R0 * (1 - t * 0.92);
    const ballX = START_X + (END_X - START_X) * t;
    
    // Add minor organic bobbing motion to make the ball feel soft and hand-wound
    const wobble = Math.abs(Math.sin(t * Math.PI * 16)) * 1.5;
    const ballY = FLOOR_Y - r + wobble;
    
    const dist = (END_X - START_X) * t;
    const angle = dist / R0;
    
    ctx.beginPath();
    ctx.moveTo(START_X - R0, FLOOR_Y);
    let x = START_X - R0;
    const targetX = ballX - r * 0.2;
    while (x < targetX - 1) {
      const next = Math.min(x + 42, targetX);
      const mid = (x + next) / 2;
      const wave = Math.sin((x / 55)) * 4;
      ctx.quadraticCurveTo(mid, FLOOR_Y - wave, next, FLOOR_Y);
      x = next;
    }
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    if (r > 2) {
      drawYarnBall(ballX, ballY, r, angle);
      ctx.beginPath();
      ctx.moveTo(ballX - r * 0.2, ballY + r * 0.96);
      ctx.lineTo(ballX - r * 0.2, FLOOR_Y);
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    
    if (raw < 1) {
      requestAnimationFrame(draw);
    } else {
      window.preloaderAnimationFinished = true;
      if (window.canHidePreloader) {
        const p = document.getElementById('preloader');
        if (p && !p.classList.contains('fade-out')) {
          setTimeout(() => {
            p.classList.add('fade-out');
          }, 450);
        }
      } else {
        // If DOM not ready yet, delay before looping back
        start = null;
        setTimeout(() => {
          const p = document.getElementById('preloader');
          if (p && !p.classList.contains('fade-out')) {
            requestAnimationFrame(draw);
          }
        }, 800);
      }
    }
  }

  requestAnimationFrame(draw);
}

export function hidePreloader(force = false) {
  const preloader = document.getElementById('preloader');
  if (force || window.location.pathname.startsWith('/admin')) {
    if (preloader) {
      preloader.style.display = 'none';
      preloader.classList.add('fade-out');
    }
    return;
  }

  window.canHidePreloader = true;
  if (window.preloaderAnimationFinished) {
    if (preloader && !preloader.classList.contains('fade-out')) {
      setTimeout(() => {
        preloader.classList.add('fade-out');
      }, 450);
    }
  }
}
window.hidePreloader = hidePreloader;
