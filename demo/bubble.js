const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let W, H, DPR;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = cv.clientWidth;
  H = cv.clientHeight;
  cv.width = W * DPR;
  cv.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ---------- 色板 ----------
const IRIDESCENT_STOPS = [
  '#ff9ed8', '#c77dff', '#7ed7ff', '#ffd89e', '#ff9ed8'
];

// ---------- 工具 ----------
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Bubble ----------
class Bubble {
  constructor() {
    this.reset(true);
  }
  reset(initial = false) {
    this.r = rand(40, 90);
    this.x = rand(this.r, W - this.r);
    this.y = initial ? rand(this.r, H - this.r) : H + this.r;
    this.vx = rand(-0.15, 0.15);
    this.vy = rand(-0.5, -0.2);
    this.phase = rand(0, Math.PI * 2);
    this.spin = rand(0.0003, 0.0008);
    this.alpha = 0;          // 淡入
    this.targetAlpha = rand(0.7, 0.95);
    this.dead = false;
    this.popping = false;
    this.popT = 0;
  }

  update(dt, mouse) {
    // 淡入
    this.alpha += (this.targetAlpha - this.alpha) * 0.05;

    // 漂浮
    this.phase += dt * 0.001;
    this.x += this.vx + Math.sin(this.phase) * 0.15;
    this.y += this.vy;

    // 鼠标吹动：距离越近推力越大
    if (mouse.active) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const d = Math.hypot(dx, dy);
      const R = 180;
      if (d < R && d > 0.1) {
        const f = (1 - d / R) * 1.5;
        this.x += (dx / d) * f;
        this.y += (dy / d) * f;
      }
    }

    // 边界回绕
    if (this.x < -this.r) this.x = W + this.r;
    if (this.x > W + this.r) this.x = -this.r;
    if (this.y < -this.r * 2) this.reset();

    if (this.popping) {
      this.popT += dt;
      this.alpha *= 0.9;
      if (this.alpha < 0.02) this.dead = true;
    }
  }

  hitTest(x, y) {
    return !this.popping && Math.hypot(x - this.x, y - this.y) < this.r;
  }

  pop() {
    this.popping = true;
    this.popT = 0;
    // 生成飞溅粒子
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
      const sp = rand(1.5, 4);
      splashes.push({
        x: this.x, y: this.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rand(2, 5), life: 1, color: IRIDESCENT_STOPS[i % IRIDESCENT_STOPS.length]
      });
    }
  }

  draw(ctx, t) {
    if (this.dead) return;
    const r = this.r * (1 + Math.sin(this.phase * 1.3) * 0.02);  // 呼吸
    // 椭圆形变（轻微抖动，不是完美圆）
    const rx = r * (1 + Math.sin(t * 0.0007 + this.phase) * 0.04);
    const ry = r * (1 - Math.sin(t * 0.0007 + this.phase) * 0.04);

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);

    // 1. 底层：径向渐变主体（半透明，透出背景）
    const g1 = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, rx);
    g1.addColorStop(0, 'rgba(255,255,255,0.04)');
    g1.addColorStop(0.7, 'rgba(200,160,255,0.06)');
    g1.addColorStop(1, 'rgba(255,158,216,0.10)');
    ctx.fillStyle = g1;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 虹彩环：conic gradient 叠加（粉紫为主，带彩虹）
    if (typeof ctx.createConicGradient === 'function') {
      const cg = ctx.createConicGradient(t * this.spin, 0, 0);
      const n = IRIDESCENT_STOPS.length;
      for (let i = 0; i < n; i++) {
        cg.addColorStop(i / (n - 1), IRIDESCENT_STOPS[i]);
      }
      ctx.globalAlpha = this.alpha * 0.55;
      ctx.fillStyle = cg;
      // 只画边缘环：用 evenodd 抠掉中心
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.ellipse(0, 0, rx * 0.82, ry * 0.82, 0, 0, Math.PI * 2);
      ctx.fill('evenodd');
    } else {
      // 降级：描边模拟
      ctx.globalAlpha = this.alpha * 0.5;
      ctx.strokeStyle = IRIDESCENT_STOPS[0];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. 高光斑点（左上）
    ctx.globalAlpha = this.alpha * 0.8;
    const hx = -rx * 0.35, hy = -ry * 0.4, hr = r * 0.22;
    const g2 = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
    g2.addColorStop(0, 'rgba(255,255,255,0.85)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();

    // 4. 底部反射弧（碗底反光）
    ctx.globalAlpha = this.alpha * 0.35;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(1, r * 0.015);
    ctx.beginPath();
    ctx.ellipse(0, ry * 0.35, rx * 0.55, ry * 0.25, 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();

    // 5. 外缘柔光（让边缘不那么硬）
    ctx.globalAlpha = this.alpha * 0.3;
    const g3 = ctx.createRadialGradient(0, 0, rx * 0.9, 0, 0, rx * 1.15);
    g3.addColorStop(0, 'rgba(255,158,216,0)');
    g3.addColorStop(0.5, 'rgba(199,125,255,0.15)');
    g3.addColorStop(1, 'rgba(255,158,216,0)');
    ctx.fillStyle = g3;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ---------- 飞溅粒子 ----------
const splashes = [];
function updateSplashes(dt) {
  for (let i = splashes.length - 1; i >= 0; i--) {
    const p = splashes[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.05;     // 轻微重力
    p.vx *= 0.98; p.vy *= 0.98;
    p.life -= 0.02;
    if (p.life <= 0) splashes.splice(i, 1);
  }
}
function drawSplashes() {
  for (const p of splashes) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------- 初始化 ----------
const BUBBLE_COUNT = 7;
const bubbles = Array.from({ length: BUBBLE_COUNT }, () => new Bubble());

const mouse = { x: 0, y: 0, active: false };
cv.addEventListener('mousemove', e => {
  const rect = cv.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  mouse.active = true;
});
cv.addEventListener('mouseleave', () => mouse.active = false);
cv.addEventListener('click', e => {
  const rect = cv.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  for (const b of bubbles) if (b.hitTest(x, y)) { b.pop(); break; }
});

// ---------- 主循环 ----------
let last = performance.now();
function loop(now) {
  const dt = now - last; last = now;
  ctx.clearRect(0, 0, W, H);

  for (const b of bubbles) b.update(dt, mouse);
  updateSplashes(dt);

  // 死掉的气泡重生
  for (let i = 0; i < bubbles.length; i++) {
    if (bubbles[i].dead) bubbles[i] = new Bubble();
  }

  // 先画飞溅（在气泡下层更有层次感，按需调整）
  drawSplashes();
  for (const b of bubbles) b.draw(ctx, now);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);