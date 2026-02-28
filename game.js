// MORTAL FURY — Premium Visual Edition
// Canvas-based 2D fighting game with detailed visuals

// ============ CONSTANTS ============
const GRAVITY = 1800;
const GROUND_Y = 0.78;
const WALK_SPEED = 300;
const JUMP_FORCE = -700;
const MAX_HEALTH = 100;
const MAX_SPECIAL = 100;
const ROUND_TIME = 60;
const WINS_NEEDED = 2;

// ============ CHARACTER DEFINITIONS ============
const CHARACTERS = {
    scorpion: {
        name: 'SHADOW',
        colors: {
            body: '#ffcc00', pants: '#1a1a1a', skin: '#d4a574', glow: '#ff6600',
            accent: '#ff8800', armor: '#b8960c', dark: '#8a6b00', mask: '#222',
            hair: '#111', eyeGlow: '#ffaa00'
        },
        stats: { speed: 1.2, power: 0.9, defense: 0.8 },
        attacks: {
            punch: { damage: 8, range: 60, startup: 3, active: 4, recovery: 6, hitstun: 12 },
            kick: { damage: 12, range: 70, startup: 5, active: 5, recovery: 8, hitstun: 15 },
            special: { damage: 20, range: 300, startup: 10, active: 20, recovery: 15, hitstun: 25, type: 'projectile', color: '#ff6600' },
            uppercut: { damage: 18, range: 55, startup: 4, active: 4, recovery: 10, hitstun: 20, launcher: true }
        }
    },
    subzero: {
        name: 'FROST',
        colors: {
            body: '#0077dd', pants: '#002244', skin: '#c4b8a0', glow: '#00ccff',
            accent: '#00aaff', armor: '#004488', dark: '#002255', mask: '#003366',
            hair: '#aaddff', eyeGlow: '#00eeff'
        },
        stats: { speed: 0.9, power: 1.1, defense: 1.1 },
        attacks: {
            punch: { damage: 9, range: 55, startup: 4, active: 4, recovery: 6, hitstun: 12 },
            kick: { damage: 14, range: 65, startup: 6, active: 5, recovery: 9, hitstun: 16 },
            special: { damage: 18, range: 280, startup: 12, active: 25, recovery: 18, hitstun: 30, type: 'projectile', color: '#00ccff', freeze: true },
            uppercut: { damage: 20, range: 50, startup: 5, active: 4, recovery: 12, hitstun: 22, launcher: true }
        }
    },
    liu: {
        name: 'DRAGON',
        colors: {
            body: '#cc0000', pants: '#1a1a1a', skin: '#d4a574', glow: '#ff0000',
            accent: '#ff3300', armor: '#880000', dark: '#550000', mask: '#cc0000',
            hair: '#0a0a0a', eyeGlow: '#ff4400'
        },
        stats: { speed: 1.0, power: 1.0, defense: 1.0 },
        attacks: {
            punch: { damage: 8, range: 58, startup: 3, active: 4, recovery: 5, hitstun: 11 },
            kick: { damage: 13, range: 75, startup: 5, active: 5, recovery: 7, hitstun: 14 },
            special: { damage: 22, range: 250, startup: 8, active: 18, recovery: 12, hitstun: 20, type: 'projectile', color: '#ff3300' },
            uppercut: { damage: 16, range: 55, startup: 3, active: 5, recovery: 9, hitstun: 18, launcher: true }
        }
    }
};

// ============ GAME STATE ============
const game = {
    state: 'select',
    round: 1,
    timer: ROUND_TIME,
    timerInterval: null,
    p1Wins: 0,
    p2Wins: 0,
    isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    slowmo: 0,
    screenShake: 0,
    particles: [],
    projectiles: [],
    comboTexts: [],
    bgOffset: 0,
    frameCount: 0,
    stars: [],
    clouds: [],
    embers: []
};

// Generate background stars
for (let i = 0; i < 80; i++) {
    game.stars.push({
        x: Math.random(),
        y: Math.random() * 0.6,
        size: 0.5 + Math.random() * 2,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 2
    });
}

// Generate clouds
for (let i = 0; i < 6; i++) {
    game.clouds.push({
        x: Math.random(),
        y: 0.05 + Math.random() * 0.35,
        w: 0.1 + Math.random() * 0.15,
        h: 0.02 + Math.random() * 0.03,
        speed: 0.002 + Math.random() * 0.004,
        opacity: 0.05 + Math.random() * 0.1
    });
}

// ============ CANVAS SETUP ============
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============ AUDIO ============
let audioCtx;
function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    switch(type) {
        case 'punch':
            osc.type = 'square'; osc.frequency.value = 150;
            gain.gain.value = 0.3;
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
            osc.start(); osc.stop(audioCtx.currentTime + 0.08);
            break;
        case 'kick':
            osc.type = 'sawtooth'; osc.frequency.value = 100;
            gain.gain.value = 0.4;
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
            osc.start(); osc.stop(audioCtx.currentTime + 0.12);
            break;
        case 'special':
            osc.type = 'sawtooth'; osc.frequency.value = 400;
            gain.gain.value = 0.3;
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            osc.start(); osc.stop(audioCtx.currentTime + 0.5);
            break;
        case 'block':
            osc.type = 'triangle'; osc.frequency.value = 300;
            gain.gain.value = 0.2;
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            osc.start(); osc.stop(audioCtx.currentTime + 0.05);
            break;
        case 'ko':
            osc.type = 'sawtooth'; osc.frequency.value = 200;
            gain.gain.value = 0.5;
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 1);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
            osc.start(); osc.stop(audioCtx.currentTime + 1);
            break;
        case 'announcer':
            osc.type = 'square'; osc.frequency.value = 600;
            gain.gain.value = 0.2;
            osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.start(); osc.stop(audioCtx.currentTime + 0.3);
            break;
    }
}

// ============ VISUAL HELPERS ============
function drawLimbSegment(ctx, x1, y1, x2, y2, w1, w2, color, highlightColor) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perp = angle + Math.PI / 2;
    const cos = Math.cos(perp);
    const sin = Math.sin(perp);

    const grad = ctx.createLinearGradient(
        x1 + cos * w1, y1 + sin * w1,
        x1 - cos * w1, y1 - sin * w1
    );
    grad.addColorStop(0, highlightColor || color);
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, darkenColor(color, 0.6));

    ctx.beginPath();
    ctx.moveTo(x1 + cos * w1, y1 + sin * w1);
    ctx.quadraticCurveTo(
        (x1 + x2) / 2 + cos * (w1 + w2) / 2 * 1.15,
        (y1 + y2) / 2 + sin * (w1 + w2) / 2 * 1.15,
        x2 + cos * w2, y2 + sin * w2
    );
    ctx.lineTo(x2 - cos * w2, y2 - sin * w2);
    ctx.quadraticCurveTo(
        (x1 + x2) / 2 - cos * (w1 + w2) / 2 * 1.15,
        (y1 + y2) / 2 - sin * (w1 + w2) / 2 * 1.15,
        x1 - cos * w1, y1 - sin * w1
    );
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
}

function drawJointCircle(ctx, x, y, r, color) {
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    grad.addColorStop(0, lightenColor(color, 1.3));
    grad.addColorStop(1, color);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
}

function darkenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
}

function lightenColor(hex, factor) {
    let r, g, b;
    if (hex.startsWith('#')) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    } else if (hex.startsWith('rgb')) {
        const m = hex.match(/(\d+)/g);
        r = parseInt(m[0]); g = parseInt(m[1]); b = parseInt(m[2]);
    } else {
        return hex;
    }
    return `rgb(${Math.min(255, Math.floor(r * factor))},${Math.min(255, Math.floor(g * factor))},${Math.min(255, Math.floor(b * factor))})`;
}

function drawGroundShadow(ctx, x, groundY, w, h) {
    const grad = ctx.createRadialGradient(x, groundY, 0, x, groundY, w);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.scale(1, h / w);
    ctx.beginPath();
    ctx.arc(x, groundY * (w / h), w, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
}

function drawRimLight(ctx, x, y, w, h, color, intensity) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = intensity;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(x, y + h * 0.4, w * 0.55, h * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

// ============ BACKGROUND RENDERER ============
function drawBackground(ctx) {
    const w = canvas.width;
    const h = canvas.height;
    const groundY = h * GROUND_Y;
    const t = game.frameCount;

    // Deep sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, '#020010');
    skyGrad.addColorStop(0.2, '#0a0025');
    skyGrad.addColorStop(0.5, '#150030');
    skyGrad.addColorStop(0.8, '#1a0020');
    skyGrad.addColorStop(1, '#200015');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, groundY);

    // Stars with twinkling
    game.stars.forEach(star => {
        const twinkle = Math.sin(t * 0.02 * star.speed + star.twinkle) * 0.5 + 0.5;
        ctx.globalAlpha = twinkle * 0.8 + 0.2;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Moon with halo
    const moonX = w * 0.78;
    const moonY = h * 0.12;
    const moonR = Math.min(w, h) * 0.045;
    // Outer halo
    const haloGrad = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 5);
    haloGrad.addColorStop(0, 'rgba(150,160,255,0.15)');
    haloGrad.addColorStop(0.5, 'rgba(100,120,200,0.05)');
    haloGrad.addColorStop(1, 'rgba(50,50,100,0)');
    ctx.fillStyle = haloGrad;
    ctx.fillRect(moonX - moonR * 5, moonY - moonR * 5, moonR * 10, moonR * 10);
    // Moon body
    const moonGrad = ctx.createRadialGradient(moonX - moonR * 0.3, moonY - moonR * 0.3, 0, moonX, moonY, moonR);
    moonGrad.addColorStop(0, '#f0f0ff');
    moonGrad.addColorStop(0.7, '#c8c8e0');
    moonGrad.addColorStop(1, '#9898b0');
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fillStyle = moonGrad;
    ctx.fill();
    // Moon craters
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.arc(moonX - moonR * 0.2, moonY + moonR * 0.1, moonR * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(moonX + moonR * 0.3, moonY - moonR * 0.25, moonR * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(moonX + moonR * 0.1, moonY + moonR * 0.35, moonR * 0.15, 0, Math.PI * 2); ctx.fill();

    // Distant clouds
    game.clouds.forEach(cloud => {
        cloud.x += cloud.speed * 0.016;
        if (cloud.x > 1.2) cloud.x = -0.2;
        ctx.globalAlpha = cloud.opacity;
        const cx = cloud.x * w;
        const cy = cloud.y * h;
        const cw = cloud.w * w;
        const ch = cloud.h * h;
        const cloudGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw);
        cloudGrad.addColorStop(0, 'rgba(60,30,80,0.8)');
        cloudGrad.addColorStop(0.5, 'rgba(40,20,60,0.4)');
        cloudGrad.addColorStop(1, 'rgba(20,10,30,0)');
        ctx.fillStyle = cloudGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
        ctx.fill();
        // Secondary blob
        ctx.beginPath();
        ctx.ellipse(cx + cw * 0.5, cy + ch * 0.2, cw * 0.6, ch * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Far mountains with mist
    drawMountainLayer(ctx, w, groundY, 0.3, '#0a0018', 120, 0.008, 40);
    drawMountainLayer(ctx, w, groundY, 0.5, '#0f001f', 90, 0.012, 30);
    drawMountainLayer(ctx, w, groundY, 0.7, '#140025', 60, 0.02, 20);

    // Mist layer
    ctx.globalAlpha = 0.15;
    const mistGrad = ctx.createLinearGradient(0, groundY - 100, 0, groundY);
    mistGrad.addColorStop(0, 'rgba(100,80,120,0)');
    mistGrad.addColorStop(1, 'rgba(100,80,120,1)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, groundY - 100, w, 100);
    ctx.globalAlpha = 1;

    // Temple background structure
    drawTemple(ctx, w, h, groundY, t);

    // Ground
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
    groundGrad.addColorStop(0, '#2a1a0e');
    groundGrad.addColorStop(0.1, '#231508');
    groundGrad.addColorStop(0.4, '#1a0e04');
    groundGrad.addColorStop(1, '#0a0500');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Ground stone pattern
    ctx.strokeStyle = 'rgba(80,50,20,0.3)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 60) {
        ctx.beginPath();
        ctx.moveTo(gx, groundY);
        ctx.lineTo(gx, h);
        ctx.stroke();
    }
    for (let gy = groundY; gy < h; gy += 30) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
    }

    // Ground line with glow
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();
    // Ground line glow
    ctx.strokeStyle = 'rgba(180,100,30,0.3)';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(180,100,30,0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Atmospheric embers floating up
    if (Math.random() < 0.3) {
        game.embers.push({
            x: Math.random() * w,
            y: groundY + Math.random() * 20,
            vx: (Math.random() - 0.5) * 30,
            vy: -20 - Math.random() * 40,
            life: 120 + Math.random() * 120,
            maxLife: 120 + Math.random() * 120,
            size: 1 + Math.random() * 2
        });
    }
    for (let i = game.embers.length - 1; i >= 0; i--) {
        const e = game.embers[i];
        e.x += e.vx * 0.016;
        e.y += e.vy * 0.016;
        e.vx += (Math.random() - 0.5) * 2;
        e.life--;
        if (e.life <= 0) { game.embers.splice(i, 1); continue; }
        const alpha = (e.life / e.maxLife) * 0.8;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${200 + Math.random() * 55},${80 + Math.random() * 80},${10 + Math.random() * 20})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawMountainLayer(ctx, w, groundY, parallax, color, maxH, freq, segments) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w; x += segments) {
        const nx = x * freq;
        const mh = maxH * (Math.sin(nx) * 0.4 + Math.sin(nx * 2.3 + 1) * 0.3 + Math.sin(nx * 4.1 + 2) * 0.15 + 0.5);
        ctx.lineTo(x, groundY - mh);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();
}

function drawTemple(ctx, w, h, groundY, t) {
    // Temple pillars
    const pillarPositions = [0.08, 0.18, 0.82, 0.92];
    pillarPositions.forEach((px, idx) => {
        const pillarX = w * px;
        const pillarH = 180 + (idx % 2) * 30;
        const pillarW = 22;
        const pillarTop = groundY - pillarH;

        // Pillar body gradient
        const pGrad = ctx.createLinearGradient(pillarX - pillarW / 2, 0, pillarX + pillarW / 2, 0);
        pGrad.addColorStop(0, '#1a1a2a');
        pGrad.addColorStop(0.3, '#2a2a3f');
        pGrad.addColorStop(0.7, '#2a2a3f');
        pGrad.addColorStop(1, '#121220');
        ctx.fillStyle = pGrad;
        ctx.fillRect(pillarX - pillarW / 2, pillarTop, pillarW, pillarH);

        // Capital (top decoration)
        ctx.fillStyle = '#2a2a3f';
        ctx.fillRect(pillarX - pillarW / 2 - 6, pillarTop - 8, pillarW + 12, 12);
        ctx.fillRect(pillarX - pillarW / 2 - 3, pillarTop - 4, pillarW + 6, 6);

        // Base
        ctx.fillRect(pillarX - pillarW / 2 - 6, groundY - 8, pillarW + 12, 10);

        // Pillar groove lines
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        for (let gy = pillarTop + 15; gy < groundY - 10; gy += 20) {
            ctx.beginPath();
            ctx.moveTo(pillarX - pillarW / 4, gy);
            ctx.lineTo(pillarX - pillarW / 4, gy + 12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pillarX + pillarW / 4, gy);
            ctx.lineTo(pillarX + pillarW / 4, gy + 12);
            ctx.stroke();
        }
    });

    // Torch brackets on inner pillars
    [0.18, 0.82].forEach((px, idx) => {
        const torchX = w * px + (idx === 0 ? 20 : -20);
        const torchY = groundY - 140;

        // Bracket
        ctx.fillStyle = '#333';
        ctx.fillRect(w * px + (idx === 0 ? 8 : -14), torchY + 5, 6, 15);

        // Fire glow
        const fireFlicker = Math.sin(t * 0.15 + idx * 3) * 4;
        const fireSize = 10 + Math.sin(t * 0.2 + idx) * 3;

        // Glow on surroundings
        const glowGrad = ctx.createRadialGradient(torchX, torchY, 0, torchX, torchY, 80);
        glowGrad.addColorStop(0, 'rgba(255,120,20,0.15)');
        glowGrad.addColorStop(0.5, 'rgba(255,80,10,0.05)');
        glowGrad.addColorStop(1, 'rgba(255,50,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(torchX - 80, torchY - 80, 160, 160);

        // Fire layers
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // Outer flame
        ctx.fillStyle = 'rgba(255,80,0,0.6)';
        ctx.beginPath();
        ctx.ellipse(torchX, torchY + fireFlicker, fireSize * 0.8, fireSize * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Mid flame
        ctx.fillStyle = 'rgba(255,150,0,0.7)';
        ctx.beginPath();
        ctx.ellipse(torchX, torchY + fireFlicker * 0.5, fireSize * 0.5, fireSize * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        // Inner flame
        ctx.fillStyle = 'rgba(255,230,100,0.9)';
        ctx.beginPath();
        ctx.ellipse(torchX, torchY + fireFlicker * 0.3, fireSize * 0.2, fireSize * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Temple top beam between inner pillars
    const beamLeft = w * 0.18 - 14;
    const beamRight = w * 0.82 + 14;
    const beamTop = groundY - 215;
    const beamGrad = ctx.createLinearGradient(0, beamTop, 0, beamTop + 18);
    beamGrad.addColorStop(0, '#2a2a3f');
    beamGrad.addColorStop(1, '#1a1a2a');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(beamLeft, beamTop, beamRight - beamLeft, 18);
    // Decorative triangles along the beam
    ctx.fillStyle = '#333345';
    for (let bx = beamLeft + 20; bx < beamRight - 20; bx += 40) {
        ctx.beginPath();
        ctx.moveTo(bx, beamTop);
        ctx.lineTo(bx + 10, beamTop - 12);
        ctx.lineTo(bx + 20, beamTop);
        ctx.closePath();
        ctx.fill();
    }

    // Dragon/skull emblem in center of beam
    const emblemX = w * 0.5;
    const emblemY = beamTop - 5;
    ctx.fillStyle = '#ff3300';
    ctx.shadowColor = '#ff3300';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(emblemX, emblemY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(emblemX, emblemY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

// ============ CHARACTER SELECT CANVAS ============
function drawCharSelectPortrait(ctx, charId, x, y, w, h, selected, hovered) {
    const colors = CHARACTERS[charId].colors;
    ctx.save();

    // Card background
    const cardGrad = ctx.createLinearGradient(x, y, x, y + h);
    cardGrad.addColorStop(0, 'rgba(30,20,40,0.9)');
    cardGrad.addColorStop(1, 'rgba(10,5,15,0.9)');
    ctx.fillStyle = cardGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();

    // Border glow if selected
    if (selected || hovered) {
        ctx.strokeStyle = selected ? colors.glow : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = selected ? 3 : 1;
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = selected ? 20 : 5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Draw character silhouette
    const cx = x + w / 2;
    const cy = y + h * 0.45;
    const scale = Math.min(w, h) / 160;

    drawPortraitCharacter(ctx, charId, cx, cy, scale);

    ctx.restore();
}

function drawPortraitCharacter(ctx, charId, cx, cy, scale) {
    const c = CHARACTERS[charId].colors;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Aura glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const auraGrad = ctx.createRadialGradient(0, 10, 10, 0, 10, 60);
    auraGrad.addColorStop(0, c.glow + '33');
    auraGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = auraGrad;
    ctx.fillRect(-60, -50, 120, 120);
    ctx.restore();

    // Torso
    const torsoGrad = ctx.createLinearGradient(-20, -10, 20, -10);
    torsoGrad.addColorStop(0, darkenColor(c.body, 0.7));
    torsoGrad.addColorStop(0.5, c.body);
    torsoGrad.addColorStop(1, darkenColor(c.body, 0.6));
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.moveTo(-22, -10);
    ctx.quadraticCurveTo(-24, 15, -16, 38);
    ctx.lineTo(16, 38);
    ctx.quadraticCurveTo(24, 15, 22, -10);
    ctx.closePath();
    ctx.fill();

    // Shoulders
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(-22, -8, 10, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(22, -8, 10, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    drawLimbSegment(ctx, -28, -2, -32, 28, 7, 5, c.skin, lightenColor(c.skin, 1.2));
    drawLimbSegment(ctx, 28, -2, 32, 28, 7, 5, c.skin, lightenColor(c.skin, 1.2));

    // Belt
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-17, 35, 34, 5);
    ctx.fillStyle = c.accent;
    ctx.fillRect(-4, 35, 8, 5);

    // Head
    const headGrad = ctx.createRadialGradient(-3, -28, 0, 0, -25, 18);
    headGrad.addColorStop(0, lightenColor(c.skin, 1.1));
    headGrad.addColorStop(1, darkenColor(c.skin, 0.85));
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, -28, 17, 0, Math.PI * 2);
    ctx.fill();

    // Character-specific head details
    if (charId === 'scorpion') {
        // Ninja mask
        ctx.fillStyle = c.mask;
        ctx.beginPath();
        ctx.moveTo(-15, -25);
        ctx.lineTo(15, -25);
        ctx.lineTo(15, -14);
        ctx.quadraticCurveTo(0, -8, -15, -14);
        ctx.closePath();
        ctx.fill();
        // Headband
        ctx.fillStyle = c.body;
        ctx.fillRect(-17, -36, 34, 7);
        // Glowing eyes
        ctx.fillStyle = c.eyeGlow;
        ctx.shadowColor = c.eyeGlow;
        ctx.shadowBlur = 8;
        ctx.fillRect(-9, -30, 5, 3);
        ctx.fillRect(4, -30, 5, 3);
        ctx.shadowBlur = 0;
    } else if (charId === 'subzero') {
        // Ice hood
        ctx.fillStyle = c.armor;
        ctx.beginPath();
        ctx.arc(0, -30, 18, -Math.PI, 0);
        ctx.lineTo(16, -22);
        ctx.lineTo(-16, -22);
        ctx.closePath();
        ctx.fill();
        // Face mask
        ctx.fillStyle = c.mask;
        ctx.beginPath();
        ctx.moveTo(-13, -23);
        ctx.lineTo(13, -23);
        ctx.lineTo(12, -14);
        ctx.quadraticCurveTo(0, -10, -12, -14);
        ctx.closePath();
        ctx.fill();
        // Glowing eyes
        ctx.fillStyle = c.eyeGlow;
        ctx.shadowColor = c.eyeGlow;
        ctx.shadowBlur = 10;
        ctx.fillRect(-8, -28, 4, 3);
        ctx.fillRect(4, -28, 4, 3);
        ctx.shadowBlur = 0;
    } else {
        // Dragon - headband
        ctx.fillStyle = c.body;
        ctx.fillRect(-18, -36, 36, 6);
        // Headband tails
        ctx.beginPath();
        ctx.moveTo(-17, -36);
        ctx.quadraticCurveTo(-25, -30, -30, -38);
        ctx.lineWidth = 3;
        ctx.strokeStyle = c.body;
        ctx.stroke();
        // Hair
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        ctx.arc(0, -33, 16, -Math.PI, -0.2);
        ctx.lineTo(12, -28);
        ctx.lineTo(14, -38);
        ctx.closePath();
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(-8, -28, 5, 4);
        ctx.fillRect(4, -28, 5, 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(-6, -27, 3, 3);
        ctx.fillRect(6, -27, 3, 3);
        // Determined expression
        ctx.strokeStyle = c.skin;
        ctx.lineWidth = 1;
    }

    ctx.restore();
}

// ============ FIGHTER CLASS ============
class Fighter {
    constructor(charId, x, facingRight, isAI = false) {
        const charData = CHARACTERS[charId];
        this.charId = charId;
        this.name = charData.name;
        this.colors = charData.colors;
        this.stats = charData.stats;
        this.attackData = charData.attacks;
        this.isAI = isAI;

        this.x = x;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.facingRight = facingRight;
        this.width = 50;
        this.height = 120;

        this.health = MAX_HEALTH;
        this.special = 0;
        this.combo = 0;
        this.comboTimer = 0;

        this.state = 'idle';
        this.attackType = null;
        this.attackFrame = 0;
        this.attackTotalFrames = 0;
        this.stun = 0;
        this.frozen = 0;
        this.blocking = false;

        this.animFrame = 0;
        this.animTimer = 0;

        this.aiTimer = 0;
        this.aiAction = null;

        this.prevHealth = MAX_HEALTH;
        this.damageFlash = 0;
    }

    get groundY() { return canvas.height * GROUND_Y - this.height; }
    get onGround() { return this.y >= this.groundY; }

    get hitbox() {
        return { x: this.x - this.width / 2, y: this.y, w: this.width, h: this.height };
    }

    get attackHitbox() {
        if (this.state !== 'attack' || !this.attackType) return null;
        const atk = this.attackData[this.attackType];
        if (atk.type === 'projectile') return null;
        const startFrame = atk.startup;
        const endFrame = atk.startup + atk.active;
        if (this.attackFrame < startFrame || this.attackFrame > endFrame) return null;
        const dir = this.facingRight ? 1 : -1;
        const offsetX = this.attackType === 'kick' ? 30 : 20;
        const offsetY = this.attackType === 'uppercut' ? -20 : 20;
        return {
            x: this.x + dir * offsetX,
            y: this.y + this.height * 0.3 + offsetY,
            w: atk.range,
            h: 30
        };
    }

    startAttack(type) {
        if (this.state === 'attack' || this.state === 'hit' || this.state === 'ko' || this.frozen > 0) return;
        if (type === 'special' && this.special < 50) return;
        this.state = 'attack';
        this.attackType = type;
        this.attackFrame = 0;
        const atk = this.attackData[type];
        this.attackTotalFrames = atk.startup + atk.active + atk.recovery;
        if (type === 'special') {
            this.special -= 50;
            if (atk.type === 'projectile') {
                setTimeout(() => {
                    const dir = this.facingRight ? 1 : -1;
                    game.projectiles.push({
                        x: this.x + dir * 40,
                        y: this.y + this.height * 0.4,
                        vx: dir * 500,
                        damage: atk.damage,
                        color: atk.color,
                        owner: this,
                        freeze: atk.freeze || false,
                        life: 60,
                        charId: this.charId
                    });
                }, atk.startup * 16);
            }
            playSound('special');
        }
    }

    takeHit(damage, attacker, launcher = false, freeze = false) {
        if (this.state === 'ko') return;
        if (this.blocking) {
            const reduced = damage * 0.15;
            this.health -= reduced;
            playSound('block');
            spawnBlockParticles(this.x, this.y + this.height * 0.4);
            this.stun = 5;
            return;
        }
        const finalDamage = damage * (2 - this.stats.defense);
        this.health -= finalDamage;
        this.state = 'hit';
        this.stun = 15;
        this.damageFlash = 12;
        attacker.combo++;
        attacker.comboTimer = 60;
        attacker.special = Math.min(MAX_SPECIAL, attacker.special + 8);
        if (attacker.combo >= 3) {
            showCombo(attacker.combo, attacker.facingRight);
        }
        const dir = attacker.facingRight ? 1 : -1;
        this.vx = dir * 200;
        if (launcher) this.vy = -400;
        if (freeze) this.frozen = 90;

        game.screenShake = 8;
        if (finalDamage > 15) game.slowmo = 6;
        playSound(launcher ? 'kick' : 'punch');
        spawnHitParticles(this.x, this.y + this.height * 0.4, attacker.colors.glow);
        hitFlash();

        if (this.health <= 0) {
            this.health = 0;
            this.state = 'ko';
            game.screenShake = 15;
            game.slowmo = 20;
            playSound('ko');
            spawnKOParticles(this.x, this.y + this.height * 0.3);
        }
    }

    update(dt, opponent) {
        if (game.state !== 'fighting') return;
        if (this.damageFlash > 0) this.damageFlash--;
        if (this.frozen > 0) { this.frozen--; return; }
        if (this.stun > 0) {
            this.stun--;
            if (this.stun === 0 && this.state === 'hit') this.state = 'idle';
        }
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) this.combo = 0;
        }
        if (this.isAI && this.state !== 'ko') this.updateAI(dt, opponent);
        if (this.state === 'attack') {
            this.attackFrame++;
            if (this.attackFrame >= this.attackTotalFrames) {
                this.state = 'idle';
                this.attackType = null;
            }
        }
        if (this.state !== 'attack' && this.state !== 'hit' && this.state !== 'ko') {
            this.facingRight = opponent.x > this.x;
        }
        if (!this.onGround) this.vy += GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y >= this.groundY) {
            this.y = this.groundY;
            this.vy = 0;
            if (this.state === 'jump') this.state = 'idle';
        }
        this.vx *= 0.85;
        this.x = Math.max(this.width / 2 + 10, Math.min(canvas.width - this.width / 2 - 10, this.x));
        this.animTimer += dt;
        if (this.animTimer > 0.08) {
            this.animTimer = 0;
            this.animFrame++;
        }
        if (this.state === 'idle' || this.state === 'walk') {
            this.special = Math.min(MAX_SPECIAL, this.special + 2 * dt);
        }
    }

    updateAI(dt, player) {
        this.aiTimer -= dt;
        if (this.aiTimer > 0) return;
        const dist = Math.abs(this.x - player.x);
        const r = Math.random();
        if (this.state === 'hit' || this.stun > 0) { this.aiTimer = 0.1; return; }
        if (player.state === 'attack' && dist < 100) {
            if (r < 0.5) {
                this.blocking = true;
                this.aiTimer = 0.3;
                setTimeout(() => { this.blocking = false; }, 300);
                return;
            }
        }
        if (dist < 80) {
            if (r < 0.35) { this.startAttack('punch'); this.aiTimer = 0.4; }
            else if (r < 0.6) { this.startAttack('kick'); this.aiTimer = 0.5; }
            else if (r < 0.75 && this.special >= 50) { this.startAttack('special'); this.aiTimer = 0.7; }
            else if (r < 0.85) { this.startAttack('uppercut'); this.aiTimer = 0.5; }
            else {
                if (this.onGround) {
                    this.vy = JUMP_FORCE * 0.7;
                    this.vx = (this.facingRight ? -1 : 1) * 200;
                    this.state = 'jump';
                }
                this.aiTimer = 0.5;
            }
        } else if (dist < 250) {
            if (r < 0.4) {
                const dir = this.facingRight ? 1 : -1;
                this.vx = dir * WALK_SPEED * this.stats.speed;
                this.state = 'walk';
                this.aiTimer = 0.3;
            } else if (r < 0.6 && this.special >= 50) { this.startAttack('special'); this.aiTimer = 0.7; }
            else if (r < 0.75) {
                if (this.onGround) {
                    this.vy = JUMP_FORCE;
                    this.vx = (this.facingRight ? 1 : -1) * 250;
                    this.state = 'jump';
                }
                this.aiTimer = 0.5;
            } else { this.aiTimer = 0.2; }
        } else {
            if (r < 0.5 && this.special >= 50) { this.startAttack('special'); this.aiTimer = 0.8; }
            else {
                const dir = this.facingRight ? 1 : -1;
                this.vx = dir * WALK_SPEED * this.stats.speed;
                this.state = 'walk';
                this.aiTimer = 0.4;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        const x = this.x;
        const y = this.y;
        const dir = this.facingRight ? 1 : -1;
        const c = this.colors;
        const t = this.animFrame;

        // Frozen overlay
        if (this.frozen > 0) {
            ctx.globalAlpha = 0.8;
        }

        const isHit = this.damageFlash > 0 && this.damageFlash % 3 === 0;

        // Idle breathing
        const breathe = this.state === 'idle' ? Math.sin(t * 0.35) * 2.5 : 0;
        const sway = this.state === 'idle' ? Math.sin(t * 0.18) * 1.5 : 0;
        const walkCycle = this.state === 'walk' ? Math.sin(t * 0.8) : 0;

        // Attack progress
        const atkProgress = this.state === 'attack' ? this.attackFrame / Math.max(1, this.attackTotalFrames) : 0;
        const atkLean = this.state === 'attack' ? Math.sin(atkProgress * Math.PI) * 8 : 0;

        // Ground shadow
        const shadowW = this.state === 'jump' ? 25 : 35;
        const shadowAlpha = this.state === 'jump' ? 0.2 : 0.4;
        drawGroundShadow(ctx, x, canvas.height * GROUND_Y, shadowW, 6);

        // Body origin point
        const bx = x + sway;
        const by = y + breathe;

        // ========== COMPUTE JOINT POSITIONS ==========
        const hipY = by + 72;
        const shoulderY = by + 30;
        const neckY = by + 22;
        const headY = by + 8;

        // Leg angles based on state
        let frontLegAngle = 0.1;
        let backLegAngle = -0.1;
        let frontKneeAngle = 0.15;
        let backKneeAngle = 0.15;
        let frontArmAngle = 0.4;
        let backArmAngle = -0.3;
        let frontForearmAngle = 0.8;
        let backForearmAngle = -0.5;

        if (this.state === 'walk') {
            frontLegAngle = 0.1 + walkCycle * 0.4;
            backLegAngle = -0.1 - walkCycle * 0.4;
            frontKneeAngle = 0.2 + Math.max(0, walkCycle) * 0.3;
            backKneeAngle = 0.2 + Math.max(0, -walkCycle) * 0.3;
            frontArmAngle = 0.3 - walkCycle * 0.3;
            backArmAngle = -0.3 + walkCycle * 0.3;
        }
        if (this.state === 'jump') {
            frontLegAngle = -0.5;
            backLegAngle = 0.3;
            frontKneeAngle = 0.8;
            backKneeAngle = 0.5;
            frontArmAngle = -0.8;
            backArmAngle = 0.6;
        }
        if (this.state === 'hit') {
            frontLegAngle = 0.3;
            backLegAngle = -0.5;
            frontKneeAngle = 0.1;
            backKneeAngle = 0.4;
            frontArmAngle = 1.0;
            backArmAngle = 0.8;
        }
        if (this.state === 'ko') {
            frontLegAngle = 0.8;
            backLegAngle = -0.8;
            frontKneeAngle = 0;
            backKneeAngle = 0;
            frontArmAngle = 1.2;
            backArmAngle = -1.2;
        }
        if (this.state === 'attack' && this.attackType === 'kick') {
            if (atkProgress > 0.2 && atkProgress < 0.7) {
                frontLegAngle = -0.8 - atkProgress * 0.5;
                frontKneeAngle = 0.1;
            }
        }
        if (this.state === 'attack' && this.attackType === 'uppercut') {
            if (atkProgress > 0.15 && atkProgress < 0.65) {
                frontLegAngle = -0.3;
                frontKneeAngle = 0.4;
                backLegAngle = 0.3;
            }
        }

        // Leg dimensions
        const thighLen = 22;
        const shinLen = 24;
        const thighW = 9;
        const shinW = 7;
        const armLen = 20;
        const forearmLen = 18;
        const armW = 7;
        const forearmW = 5.5;

        ctx.save();
        ctx.translate(bx, 0);
        ctx.scale(dir, 1);
        const relHipY = hipY;
        const relShoulderY = shoulderY;

        // ========== BACK LEG ==========
        if (!isHit) {
            const bHipX = -8;
            const bKneeX = bHipX + Math.sin(backLegAngle) * thighLen;
            const bKneeY = relHipY + Math.cos(backLegAngle) * thighLen;
            const bAnkleX = bKneeX + Math.sin(backLegAngle + backKneeAngle) * shinLen;
            const bAnkleY = bKneeY + Math.cos(backLegAngle + backKneeAngle) * shinLen;
            drawLimbSegment(ctx, bHipX, relHipY, bKneeX, bKneeY, thighW, thighW * 0.8,
                darkenColor(c.pants, 0.7), darkenColor(c.pants, 0.9));
            drawJointCircle(ctx, bKneeX, bKneeY, thighW * 0.6, darkenColor(c.pants, 0.75));
            drawLimbSegment(ctx, bKneeX, bKneeY, bAnkleX, bAnkleY, shinW, shinW * 0.7,
                darkenColor(c.pants, 0.7), darkenColor(c.pants, 0.85));
            // Foot
            ctx.fillStyle = darkenColor(c.pants, 0.5);
            ctx.beginPath();
            ctx.ellipse(bAnkleX + 4, bAnkleY + 3, 8, 4, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // ========== BACK ARM ==========
        if (!isHit) {
            const bShoulderX = -16;
            const bElbowX = bShoulderX + Math.sin(backArmAngle) * armLen;
            const bElbowY = relShoulderY + Math.cos(backArmAngle) * armLen;
            const bHandX = bElbowX + Math.sin(backArmAngle + backForearmAngle) * forearmLen;
            const bHandY = bElbowY + Math.cos(backArmAngle + backForearmAngle) * forearmLen;
            drawLimbSegment(ctx, bShoulderX, relShoulderY, bElbowX, bElbowY, armW, armW * 0.75,
                darkenColor(c.skin, 0.75), darkenColor(c.skin, 0.9));
            drawJointCircle(ctx, bElbowX, bElbowY, armW * 0.55, darkenColor(c.skin, 0.8));
            drawLimbSegment(ctx, bElbowX, bElbowY, bHandX, bHandY, forearmW, forearmW * 0.7,
                darkenColor(c.skin, 0.75), darkenColor(c.skin, 0.85));
            // Fist
            ctx.fillStyle = darkenColor(c.skin, 0.8);
            ctx.beginPath();
            ctx.arc(bHandX, bHandY, forearmW * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // ========== TORSO ==========
        {
            const torsoW = 20;
            const shoulderW = 24;
            const waistW = 16;

            // Apply hit flash
            let bodyColor = isHit ? '#fff' : c.body;
            let skinColor = isHit ? '#fff' : c.skin;

            // Torso shape with gradient
            const tGrad = ctx.createLinearGradient(-shoulderW, relShoulderY, shoulderW, relShoulderY);
            tGrad.addColorStop(0, darkenColor(bodyColor, 0.6));
            tGrad.addColorStop(0.3, bodyColor);
            tGrad.addColorStop(0.7, bodyColor);
            tGrad.addColorStop(1, darkenColor(bodyColor, 0.5));

            ctx.fillStyle = tGrad;
            ctx.beginPath();
            ctx.moveTo(-shoulderW, relShoulderY - 2);
            ctx.quadraticCurveTo(-shoulderW - 2, relShoulderY + 20, -waistW, relHipY);
            ctx.lineTo(waistW, relHipY);
            ctx.quadraticCurveTo(shoulderW + 2, relShoulderY + 20, shoulderW, relShoulderY - 2);
            ctx.closePath();
            ctx.fill();

            // Chest muscle definition
            if (!isHit) {
                ctx.strokeStyle = darkenColor(c.body, 0.7);
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.3;
                // Pec line
                ctx.beginPath();
                ctx.moveTo(-2, relShoulderY + 5);
                ctx.quadraticCurveTo(-12, relShoulderY + 12, -18, relShoulderY + 5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(2, relShoulderY + 5);
                ctx.quadraticCurveTo(12, relShoulderY + 12, 18, relShoulderY + 5);
                ctx.stroke();
                // Ab lines
                ctx.beginPath();
                ctx.moveTo(0, relShoulderY + 16);
                ctx.lineTo(0, relHipY - 5);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Character-specific torso details
            if (this.charId === 'scorpion' && !isHit) {
                // Gold trim V-neck
                ctx.strokeStyle = c.accent;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-16, relShoulderY);
                ctx.lineTo(0, relShoulderY + 18);
                ctx.lineTo(16, relShoulderY);
                ctx.stroke();
            } else if (this.charId === 'subzero' && !isHit) {
                // Armor plating lines
                ctx.strokeStyle = c.accent;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-20, relShoulderY + 8);
                ctx.lineTo(20, relShoulderY + 8);
                ctx.stroke();
                // Ice crystal emblem
                ctx.fillStyle = c.eyeGlow;
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.moveTo(0, relShoulderY + 10);
                ctx.lineTo(-5, relShoulderY + 16);
                ctx.lineTo(0, relShoulderY + 22);
                ctx.lineTo(5, relShoulderY + 16);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
            } else if (this.charId === 'liu' && !isHit) {
                // Open gi showing chest
                ctx.fillStyle = c.skin;
                ctx.beginPath();
                ctx.moveTo(-10, relShoulderY);
                ctx.lineTo(0, relShoulderY + 15);
                ctx.lineTo(10, relShoulderY);
                ctx.closePath();
                ctx.fill();
            }

            // Belt
            ctx.fillStyle = isHit ? '#ddd' : '#1a1a1a';
            ctx.fillRect(-waistW - 1, relHipY - 2, (waistW + 1) * 2, 5);
            if (!isHit) {
                ctx.fillStyle = c.accent;
                ctx.fillRect(-4, relHipY - 2, 8, 5);
            }

            // Shoulder pads/caps
            const shoulderGrad = ctx.createRadialGradient(-shoulderW, relShoulderY - 2, 0, -shoulderW, relShoulderY - 2, 12);
            shoulderGrad.addColorStop(0, isHit ? '#fff' : lightenColor(c.body, 1.2));
            shoulderGrad.addColorStop(1, isHit ? '#ddd' : c.body);
            ctx.fillStyle = shoulderGrad;
            ctx.beginPath();
            ctx.ellipse(-shoulderW, relShoulderY - 2, 12, 9, -0.2, 0, Math.PI * 2);
            ctx.fill();

            const shoulderGrad2 = ctx.createRadialGradient(shoulderW, relShoulderY - 2, 0, shoulderW, relShoulderY - 2, 12);
            shoulderGrad2.addColorStop(0, isHit ? '#fff' : lightenColor(c.body, 1.2));
            shoulderGrad2.addColorStop(1, isHit ? '#ddd' : c.body);
            ctx.fillStyle = shoulderGrad2;
            ctx.beginPath();
            ctx.ellipse(shoulderW, relShoulderY - 2, 12, 9, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Frost: ice crystal shoulder pads
            if (this.charId === 'subzero' && !isHit) {
                ctx.fillStyle = 'rgba(0,200,255,0.3)';
                ctx.shadowColor = c.eyeGlow;
                ctx.shadowBlur = 5;
                // Left crystal
                ctx.beginPath();
                ctx.moveTo(-shoulderW, relShoulderY - 12);
                ctx.lineTo(-shoulderW - 8, relShoulderY - 2);
                ctx.lineTo(-shoulderW, relShoulderY + 4);
                ctx.lineTo(-shoulderW + 5, relShoulderY - 2);
                ctx.closePath();
                ctx.fill();
                // Right crystal
                ctx.beginPath();
                ctx.moveTo(shoulderW, relShoulderY - 12);
                ctx.lineTo(shoulderW + 8, relShoulderY - 2);
                ctx.lineTo(shoulderW, relShoulderY + 4);
                ctx.lineTo(shoulderW - 5, relShoulderY - 2);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        // ========== FRONT LEG ==========
        {
            const fHipX = 8;
            let fLegAng = frontLegAngle;
            let fKneeAng = frontKneeAngle;

            // Kick override
            let kickExtended = false;
            if (this.state === 'attack' && (this.attackType === 'kick') && atkProgress > 0.2 && atkProgress < 0.7) {
                fLegAng = -1.2 * Math.sin(atkProgress * Math.PI);
                fKneeAng = 0.05;
                kickExtended = true;
            }

            const fKneeX = fHipX + Math.sin(fLegAng) * thighLen;
            const fKneeY = relHipY + Math.cos(fLegAng) * thighLen;
            const fAnkleX = fKneeX + Math.sin(fLegAng + fKneeAng) * shinLen;
            const fAnkleY = fKneeY + Math.cos(fLegAng + fKneeAng) * shinLen;

            drawLimbSegment(ctx, fHipX, relHipY, fKneeX, fKneeY, thighW + 1, thighW * 0.85,
                isHit ? '#fff' : c.pants, isHit ? '#eee' : lightenColor(c.pants, 1.3));
            drawJointCircle(ctx, fKneeX, fKneeY, thighW * 0.65, isHit ? '#eee' : c.pants);
            drawLimbSegment(ctx, fKneeX, fKneeY, fAnkleX, fAnkleY, shinW + 0.5, shinW * 0.7,
                isHit ? '#fff' : c.pants, isHit ? '#eee' : lightenColor(c.pants, 1.2));
            // Foot
            ctx.fillStyle = isHit ? '#eee' : darkenColor(c.pants, 0.6);
            ctx.beginPath();
            ctx.ellipse(fAnkleX + (kickExtended ? 6 : 4), fAnkleY + 3, kickExtended ? 10 : 8, 4, kickExtended ? fLegAng * 0.3 : 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Kick impact effect
            if (kickExtended && atkProgress > 0.35 && atkProgress < 0.55) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = c.glow;
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.arc(fAnkleX + 8, fAnkleY, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // ========== FRONT ARM ==========
        {
            const fShoulderX = 16;
            let fArmAng = frontArmAngle;
            let fForearmAng = frontForearmAngle;
            let punchExtended = false;
            let uppercutExtended = false;

            if (this.state === 'attack' && this.attackType === 'punch' && atkProgress > 0.15 && atkProgress < 0.6) {
                fArmAng = -0.2 - atkProgress * 1.0;
                fForearmAng = 0.1;
                punchExtended = true;
            }
            if (this.state === 'attack' && this.attackType === 'uppercut' && atkProgress > 0.15 && atkProgress < 0.65) {
                fArmAng = -1.8 * Math.sin(atkProgress * Math.PI);
                fForearmAng = -0.3;
                uppercutExtended = true;
            }

            const fElbowX = fShoulderX + Math.sin(fArmAng) * armLen;
            const fElbowY = relShoulderY + Math.cos(fArmAng) * armLen;
            const fHandX = fElbowX + Math.sin(fArmAng + fForearmAng) * forearmLen;
            const fHandY = fElbowY + Math.cos(fArmAng + fForearmAng) * forearmLen;

            drawLimbSegment(ctx, fShoulderX, relShoulderY, fElbowX, fElbowY, armW + 1, armW * 0.8,
                isHit ? '#fff' : c.skin, isHit ? '#eee' : lightenColor(c.skin, 1.15));
            drawJointCircle(ctx, fElbowX, fElbowY, armW * 0.6, isHit ? '#eee' : c.skin);
            drawLimbSegment(ctx, fElbowX, fElbowY, fHandX, fHandY, forearmW + 0.5, forearmW * 0.7,
                isHit ? '#fff' : c.skin, isHit ? '#eee' : lightenColor(c.skin, 1.1));

            // Hand/Fist
            if (punchExtended || uppercutExtended) {
                // Glowing fist
                ctx.fillStyle = isHit ? '#fff' : c.accent;
                ctx.shadowColor = c.glow;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(fHandX, fHandY, forearmW + 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Impact trail
                if (punchExtended && atkProgress > 0.3 && atkProgress < 0.5) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.3;
                    ctx.fillStyle = c.glow;
                    for (let ti = 1; ti <= 3; ti++) {
                        ctx.globalAlpha = 0.3 - ti * 0.08;
                        ctx.beginPath();
                        ctx.arc(fHandX - ti * 8, fHandY, forearmW + 1 - ti, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                }
            } else {
                ctx.fillStyle = isHit ? '#eee' : c.skin;
                ctx.beginPath();
                ctx.arc(fHandX, fHandY, forearmW * 0.85, 0, Math.PI * 2);
                ctx.fill();
            }

            // Arm wraps/bracers for specific characters
            if (!isHit) {
                if (this.charId === 'scorpion') {
                    ctx.strokeStyle = c.accent;
                    ctx.lineWidth = 1.5;
                    for (let wi = 0; wi < 3; wi++) {
                        const wt = wi / 3;
                        const wx = fElbowX + (fHandX - fElbowX) * wt;
                        const wy = fElbowY + (fHandY - fElbowY) * wt;
                        ctx.beginPath();
                        ctx.arc(wx, wy, forearmW * 0.9, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } else if (this.charId === 'liu') {
                    ctx.fillStyle = c.body;
                    const wrX = (fElbowX + fHandX) / 2;
                    const wrY = (fElbowY + fHandY) / 2;
                    ctx.beginPath();
                    ctx.arc(wrX, wrY, forearmW + 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // ========== HEAD ==========
        {
            const headCX = sway * 0.5;
            const headCY = headY;
            const headR = 16;

            // Neck
            ctx.fillStyle = isHit ? '#fff' : c.skin;
            ctx.fillRect(-5, neckY, 10, relShoulderY - neckY + 4);

            // Head shape with gradient
            const headGrad = ctx.createRadialGradient(headCX - 3, headCY - 2, 0, headCX, headCY, headR);
            headGrad.addColorStop(0, isHit ? '#fff' : lightenColor(c.skin, 1.15));
            headGrad.addColorStop(0.7, isHit ? '#eee' : c.skin);
            headGrad.addColorStop(1, isHit ? '#ddd' : darkenColor(c.skin, 0.8));
            ctx.fillStyle = headGrad;
            ctx.beginPath();
            ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
            ctx.fill();

            if (!isHit) {
                // Character-specific head
                if (this.charId === 'scorpion') {
                    // Ninja hood/mask
                    ctx.fillStyle = c.mask;
                    // Hood top
                    ctx.beginPath();
                    ctx.arc(headCX, headCY - 2, headR + 1, -Math.PI, 0);
                    ctx.lineTo(headCX + headR + 1, headCY + 2);
                    ctx.lineTo(headCX - headR - 1, headCY + 2);
                    ctx.closePath();
                    ctx.fill();
                    // Mask (covers lower face)
                    ctx.fillStyle = c.mask;
                    ctx.beginPath();
                    ctx.moveTo(headCX - headR + 2, headCY + 1);
                    ctx.lineTo(headCX + headR - 2, headCY + 1);
                    ctx.lineTo(headCX + headR - 4, headCY + headR - 2);
                    ctx.quadraticCurveTo(headCX, headCY + headR + 2, headCX - headR + 4, headCY + headR - 2);
                    ctx.closePath();
                    ctx.fill();
                    // Gold headband
                    ctx.fillStyle = c.body;
                    ctx.fillRect(headCX - headR - 1, headCY - 4, (headR + 1) * 2, 7);
                    // Headband emblem
                    ctx.fillStyle = c.accent;
                    ctx.beginPath();
                    ctx.arc(headCX, headCY - 0.5, 3, 0, Math.PI * 2);
                    ctx.fill();
                    // Glowing eyes
                    ctx.fillStyle = c.eyeGlow;
                    ctx.shadowColor = c.eyeGlow;
                    ctx.shadowBlur = 8;
                    ctx.fillRect(headCX - 8, headCY - 3, 5, 3);
                    ctx.fillRect(headCX + 3, headCY - 3, 5, 3);
                    ctx.shadowBlur = 0;

                } else if (this.charId === 'subzero') {
                    // Ice hood
                    ctx.fillStyle = c.armor;
                    ctx.beginPath();
                    ctx.arc(headCX, headCY - 3, headR + 2, -Math.PI, 0);
                    ctx.lineTo(headCX + headR + 2, headCY + 3);
                    ctx.lineTo(headCX - headR - 2, headCY + 3);
                    ctx.closePath();
                    ctx.fill();
                    // Face plate
                    ctx.fillStyle = c.mask;
                    ctx.beginPath();
                    ctx.moveTo(headCX - headR + 3, headCY + 2);
                    ctx.lineTo(headCX + headR - 3, headCY + 2);
                    ctx.lineTo(headCX + headR - 5, headCY + headR - 2);
                    ctx.quadraticCurveTo(headCX, headCY + headR + 1, headCX - headR + 5, headCY + headR - 2);
                    ctx.closePath();
                    ctx.fill();
                    // Ice pattern on hood
                    ctx.strokeStyle = 'rgba(100,200,255,0.4)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(headCX, headCY - headR);
                    ctx.lineTo(headCX - 6, headCY - 5);
                    ctx.moveTo(headCX, headCY - headR);
                    ctx.lineTo(headCX + 6, headCY - 5);
                    ctx.moveTo(headCX, headCY - headR);
                    ctx.lineTo(headCX, headCY - 3);
                    ctx.stroke();
                    // Glowing eyes
                    ctx.fillStyle = c.eyeGlow;
                    ctx.shadowColor = c.eyeGlow;
                    ctx.shadowBlur = 12;
                    ctx.fillRect(headCX - 8, headCY - 2, 4, 3);
                    ctx.fillRect(headCX + 4, headCY - 2, 4, 3);
                    ctx.shadowBlur = 0;

                } else if (this.charId === 'liu') {
                    // Spiky hair
                    ctx.fillStyle = c.hair;
                    ctx.beginPath();
                    ctx.moveTo(headCX - headR + 2, headCY);
                    ctx.lineTo(headCX - headR - 2, headCY - 8);
                    ctx.lineTo(headCX - 8, headCY - headR + 2);
                    ctx.lineTo(headCX - 4, headCY - headR - 6);
                    ctx.lineTo(headCX + 2, headCY - headR + 1);
                    ctx.lineTo(headCX + 6, headCY - headR - 4);
                    ctx.lineTo(headCX + 10, headCY - headR + 3);
                    ctx.lineTo(headCX + headR, headCY - 6);
                    ctx.lineTo(headCX + headR - 1, headCY);
                    ctx.closePath();
                    ctx.fill();
                    // Red headband
                    ctx.fillStyle = c.body;
                    ctx.fillRect(headCX - headR, headCY - 5, headR * 2, 5);
                    // Headband tails flowing back
                    ctx.strokeStyle = c.body;
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    const tailWave = Math.sin(t * 0.3) * 5;
                    ctx.beginPath();
                    ctx.moveTo(headCX - headR, headCY - 3);
                    ctx.quadraticCurveTo(headCX - headR - 10, headCY - 8 + tailWave, headCX - headR - 18, headCY - 3 + tailWave * 1.5);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(headCX - headR, headCY - 1);
                    ctx.quadraticCurveTo(headCX - headR - 8, headCY - 4 + tailWave * 0.7, headCX - headR - 14, headCY + 2 + tailWave);
                    ctx.stroke();
                    ctx.lineCap = 'butt';
                    // Eyes
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(headCX - 7, headCY + 1, 5, 4);
                    ctx.fillRect(headCX + 3, headCY + 1, 5, 4);
                    // Pupils
                    ctx.fillStyle = '#211';
                    ctx.fillRect(headCX - 5, headCY + 2, 3, 3);
                    ctx.fillRect(headCX + 5, headCY + 2, 3, 3);
                    // Determined brow
                    ctx.strokeStyle = c.skin;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(headCX - 8, headCY);
                    ctx.lineTo(headCX - 3, headCY - 1);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(headCX + 8, headCY);
                    ctx.lineTo(headCX + 3, headCY - 1);
                    ctx.stroke();
                }
            }

            // KO eyes
            if (this.state === 'ko') {
                ctx.strokeStyle = '#f00';
                ctx.lineWidth = 2;
                [-6, 6].forEach(ox => {
                    const ex = headCX + ox;
                    const ey = headCY + 1;
                    ctx.beginPath(); ctx.moveTo(ex - 3, ey - 3); ctx.lineTo(ex + 3, ey + 3); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(ex + 3, ey - 3); ctx.lineTo(ex - 3, ey + 3); ctx.stroke();
                });
            }
        }

        ctx.restore();

        // ========== BLOCK SHIELD ==========
        if (this.blocking) {
            ctx.save();
            const shieldPhase = Date.now() * 0.008;
            ctx.strokeStyle = '#0af';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#0af';
            ctx.shadowBlur = 15;
            ctx.globalAlpha = 0.4 + Math.sin(shieldPhase) * 0.2;

            // Hexagonal shield pattern
            const shieldR = 40;
            const shieldCX = bx;
            const shieldCY = by + 50;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const px = shieldCX + Math.cos(angle) * shieldR;
                const py = shieldCY + Math.sin(angle) * shieldR * 0.8;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            // Inner glow
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#0af';
            ctx.fill();

            ctx.restore();
        }

        // ========== SPECIAL CHARGE GLOW ==========
        if (this.special >= 50) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const glowIntensity = 0.15 + Math.sin(Date.now() * 0.005) * 0.1;
            ctx.globalAlpha = glowIntensity;

            const auraGrad = ctx.createRadialGradient(bx, by + 50, 10, bx, by + 50, 55);
            auraGrad.addColorStop(0, c.glow);
            auraGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = auraGrad;
            ctx.fillRect(bx - 55, by - 5, 110, 130);

            // Energy particles around body
            for (let i = 0; i < 4; i++) {
                const angle = Date.now() * 0.003 + i * Math.PI / 2;
                const px = bx + Math.cos(angle) * 30;
                const py = by + 50 + Math.sin(angle) * 40;
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = c.glow;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // ========== FROZEN EFFECT ==========
        if (this.frozen > 0) {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#00ccff';
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.roundRect(bx - 28, by + 2, 56, this.height - 4, 5);
            ctx.fill();
            // Ice crystals
            ctx.fillStyle = '#aaeeff';
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < 5; i++) {
                const cx = bx - 20 + i * 10;
                const cy = by + 10 + ((i * 17) % 30);
                drawIceCrystal(ctx, cx, cy, 6 + (i % 3) * 2);
            }
            ctx.restore();
        }

        // ========== RIM LIGHTING ==========
        if (!isHit) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.12;
            ctx.strokeStyle = '#aaccff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(bx, by + 50, 28, 58, 0, -0.5, 0.5);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }
}

function drawIceCrystal(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.4, y - size * 0.3);
    ctx.lineTo(x + size * 0.7, y);
    ctx.lineTo(x + size * 0.4, y + size * 0.3);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.4, y + size * 0.3);
    ctx.lineTo(x - size * 0.7, y);
    ctx.lineTo(x - size * 0.4, y - size * 0.3);
    ctx.closePath();
    ctx.fill();
}

// ============ ENHANCED PARTICLES ============
function spawnHitParticles(x, y, color) {
    // Sparks
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 150 + Math.random() * 350;
        game.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 100,
            life: 15 + Math.random() * 15,
            maxLife: 30,
            color,
            size: 1.5 + Math.random() * 3,
            type: 'spark'
        });
    }
    // Impact flash
    game.particles.push({
        x, y,
        vx: 0, vy: 0,
        life: 8,
        maxLife: 8,
        color: '#fff',
        size: 25,
        type: 'flash'
    });
    // Blood/sweat drops
    for (let i = 0; i < 5; i++) {
        game.particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 200,
            vy: -100 - Math.random() * 200,
            life: 25 + Math.random() * 20,
            maxLife: 45,
            color: '#c00',
            size: 2 + Math.random() * 2,
            type: 'drop'
        });
    }
}

function spawnBlockParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 200;
        game.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 10 + Math.random() * 10,
            maxLife: 20,
            color: '#0af',
            size: 2 + Math.random() * 2,
            type: 'spark'
        });
    }
}

function spawnKOParticles(x, y) {
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 400;
        game.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 150,
            life: 30 + Math.random() * 30,
            maxLife: 60,
            color: ['#ff0', '#f80', '#f00', '#fff'][Math.floor(Math.random() * 4)],
            size: 2 + Math.random() * 5,
            type: 'spark'
        });
    }
    // Big flash
    game.particles.push({
        x, y,
        vx: 0, vy: 0,
        life: 15,
        maxLife: 15,
        color: '#fff',
        size: 60,
        type: 'flash'
    });
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        game.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 400,
            vy: (Math.random() - 1) * 300,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            color,
            size: 2 + Math.random() * 4,
            type: 'spark'
        });
    }
}

function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.type === 'drop' || p.type === 'spark') {
            p.vy += 600 * dt;
        }
        p.life--;
        if (p.life <= 0) game.particles.splice(i, 1);
    }
}

function drawParticles(ctx) {
    game.particles.forEach(p => {
        const alpha = Math.min(1, p.life / (p.maxLife * 0.5));
        ctx.globalAlpha = alpha;

        if (p.type === 'flash') {
            const flashGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            flashGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
            flashGrad.addColorStop(0.5, 'rgba(255,200,100,0.3)');
            flashGrad.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = flashGrad;
            ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        } else if (p.type === 'spark') {
            // Draw as a streak
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const len = Math.min(speed * 0.01, 8);
            const angle = Math.atan2(p.vy, p.vx);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(angle);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size + len, p.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        } else if (p.type === 'drop') {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
    });
    ctx.globalAlpha = 1;
}

// ============ ENHANCED PROJECTILES ============
function updateProjectiles(dt, p1, p2) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const proj = game.projectiles[i];
        proj.x += proj.vx * dt;
        proj.life--;

        // Spawn trail particles
        if (game.frameCount % 2 === 0) {
            game.particles.push({
                x: proj.x + (Math.random() - 0.5) * 10,
                y: proj.y + (Math.random() - 0.5) * 10,
                vx: -proj.vx * 0.1 + (Math.random() - 0.5) * 50,
                vy: (Math.random() - 0.5) * 50,
                life: 10 + Math.random() * 10,
                maxLife: 20,
                color: proj.color,
                size: 2 + Math.random() * 3,
                type: 'spark'
            });
        }

        if (proj.life <= 0 || proj.x < 0 || proj.x > canvas.width) {
            game.projectiles.splice(i, 1);
            continue;
        }

        const target = proj.owner === p1 ? p2 : p1;
        const hb = target.hitbox;
        if (proj.x > hb.x && proj.x < hb.x + hb.w &&
            proj.y > hb.y && proj.y < hb.y + hb.h) {
            target.takeHit(proj.damage, proj.owner, false, proj.freeze);
            spawnHitParticles(proj.x, proj.y, proj.color);
            game.projectiles.splice(i, 1);
        }
    }
}

function drawProjectiles(ctx) {
    game.projectiles.forEach(proj => {
        ctx.save();

        if (proj.charId === 'subzero') {
            // Ice shard projectile
            ctx.translate(proj.x, proj.y);
            ctx.rotate(Date.now() * 0.01);
            // Glow
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur = 20;
            // Crystal shape
            ctx.fillStyle = 'rgba(150,220,255,0.9)';
            drawIceCrystal(ctx, 0, 0, 14);
            // Inner glow
            ctx.fillStyle = 'rgba(200,240,255,0.7)';
            drawIceCrystal(ctx, 0, 0, 8);
            ctx.shadowBlur = 0;
        } else if (proj.charId === 'scorpion') {
            // Fire ball
            const fireGrad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 16);
            fireGrad.addColorStop(0, '#ffffaa');
            fireGrad.addColorStop(0.3, '#ffaa00');
            fireGrad.addColorStop(0.6, '#ff6600');
            fireGrad.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.fillStyle = fireGrad;
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 14, 0, Math.PI * 2);
            ctx.fill();
            // Flame wisps
            ctx.globalCompositeOperation = 'lighter';
            for (let fi = 0; fi < 3; fi++) {
                const fAngle = Date.now() * 0.01 + fi * 2;
                const fx = proj.x + Math.cos(fAngle) * 8;
                const fy = proj.y + Math.sin(fAngle) * 6;
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#ff8800';
                ctx.beginPath();
                ctx.arc(fx, fy, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
        } else {
            // Dragon energy ball
            const energyGrad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 16);
            energyGrad.addColorStop(0, '#ffffff');
            energyGrad.addColorStop(0.2, '#ffaa44');
            energyGrad.addColorStop(0.5, '#ff3300');
            energyGrad.addColorStop(1, 'rgba(255,0,0,0)');
            ctx.fillStyle = energyGrad;
            ctx.shadowColor = '#ff3300';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 14, 0, Math.PI * 2);
            ctx.fill();
            // Dragon shape hint
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#ff6600';
            const dir = proj.vx > 0 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(proj.x + dir * 18, proj.y);
            ctx.lineTo(proj.x - dir * 5, proj.y - 8);
            ctx.lineTo(proj.x - dir * 5, proj.y + 8);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Trail
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.2;
        for (let ti = 1; ti <= 4; ti++) {
            ctx.fillStyle = proj.color;
            ctx.beginPath();
            ctx.arc(proj.x - proj.vx * 0.008 * ti, proj.y, 10 - ti * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
}

// ============ HIT DETECTION ============
function checkHits(attacker, defender) {
    const atkBox = attacker.attackHitbox;
    if (!atkBox) return;
    if (attacker._hitConnected) return;
    const defBox = defender.hitbox;
    const dir = attacker.facingRight ? 1 : -1;
    const ax = dir > 0 ? atkBox.x : atkBox.x - atkBox.w;
    if (ax < defBox.x + defBox.w && ax + Math.abs(atkBox.w) > defBox.x &&
        atkBox.y < defBox.y + defBox.h && atkBox.y + atkBox.h > defBox.y) {
        const atk = attacker.attackData[attacker.attackType];
        defender.takeHit(atk.damage * attacker.stats.power, attacker, atk.launcher, atk.freeze);
        attacker._hitConnected = true;
    }
}

// ============ HIT FLASH ============
function hitFlash() {
    const el = document.createElement('div');
    el.className = 'hit-flash';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 100);
}

// ============ COMBO TEXT ============
function showCombo(count, isRight) {
    const el = document.createElement('div');
    el.id = 'combo-display';
    el.className = isRight ? 'left' : 'right';
    el.innerHTML = `<span class="combo-count">${count}</span><span class="combo-text">HIT COMBO!</span>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

// ============ ANNOUNCER ============
function announce(text, duration = 2000) {
    const el = document.getElementById('announcer');
    el.textContent = text;
    el.style.display = 'block';
    playSound('announcer');
    setTimeout(() => el.style.display = 'none', duration);
}

// ============ HUD UPDATE ============
function updateHUD(p1, p2) {
    // Smooth health bar transitions
    const p1Bar = document.getElementById('p1-health');
    const p2Bar = document.getElementById('p2-health');
    p1Bar.style.width = `${p1.health}%`;
    p2Bar.style.width = `${p2.health}%`;

    // Health bar color changes
    if (p1.health < 25) p1Bar.classList.add('critical');
    else p1Bar.classList.remove('critical');
    if (p2.health < 25) p2Bar.classList.add('critical');
    else p2Bar.classList.remove('critical');

    // Damage flash on health bars
    if (p1.damageFlash > 8) p1Bar.parentElement.classList.add('damage-flash');
    else p1Bar.parentElement.classList.remove('damage-flash');
    if (p2.damageFlash > 8) p2Bar.parentElement.classList.add('damage-flash');
    else p2Bar.parentElement.classList.remove('damage-flash');

    document.getElementById('p1-special').style.width = `${p1.special}%`;
    document.getElementById('p2-special').style.width = `${p2.special}%`;
    document.getElementById('p1-name').textContent = p1.name;
    document.getElementById('p2-name').textContent = p2.name;
    document.getElementById('timer').textContent = Math.ceil(game.timer);
    document.getElementById('round-text').textContent = `ROUND ${game.round}`;

    // Update round indicators
    const p1Dots = document.getElementById('p1-round-dots');
    const p2Dots = document.getElementById('p2-round-dots');
    if (p1Dots) {
        p1Dots.innerHTML = '';
        for (let i = 0; i < WINS_NEEDED; i++) {
            const dot = document.createElement('span');
            dot.className = 'round-dot' + (i < game.p1Wins ? ' won' : '');
            p1Dots.appendChild(dot);
        }
    }
    if (p2Dots) {
        p2Dots.innerHTML = '';
        for (let i = 0; i < WINS_NEEDED; i++) {
            const dot = document.createElement('span');
            dot.className = 'round-dot' + (i < game.p2Wins ? ' won' : '');
            p2Dots.appendChild(dot);
        }
    }
}

// ============ INPUT ============
const keys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; initAudio(); });
document.addEventListener('keyup', e => { keys[e.code] = false; });

function handleInput(player) {
    if (player.state === 'ko' || player.state === 'hit' || player.frozen > 0) return;
    if (keys['KeyA'] || keys['ArrowLeft']) {
        player.vx = -WALK_SPEED * player.stats.speed;
        if (player.state !== 'attack' && player.state !== 'jump') player.state = 'walk';
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        player.vx = WALK_SPEED * player.stats.speed;
        if (player.state !== 'attack' && player.state !== 'jump') player.state = 'walk';
    }
    if ((keys['KeyW'] || keys['ArrowUp'] || keys['Space']) && player.onGround && player.state !== 'attack') {
        player.vy = JUMP_FORCE;
        player.state = 'jump';
    }
    player.blocking = keys['KeyS'] || keys['ArrowDown'];
    if (keys['KeyJ'] || keys['KeyZ']) { player.startAttack('punch'); keys['KeyJ'] = false; keys['KeyZ'] = false; }
    if (keys['KeyK'] || keys['KeyX']) { player.startAttack('kick'); keys['KeyK'] = false; keys['KeyX'] = false; }
    if (keys['KeyL'] || keys['KeyC']) { player.startAttack('special'); keys['KeyL'] = false; keys['KeyC'] = false; }
    if (keys['KeyU'] || keys['KeyV']) { player.startAttack('uppercut'); keys['KeyU'] = false; keys['KeyV'] = false; }
    if (player.state !== 'attack') player._hitConnected = false;
}

// ============ MOBILE CONTROLS ============
function setupMobileControls(player) {
    if (!game.isMobile) return;
    document.getElementById('mobile-controls').style.display = 'flex';
    const setBtn = (id, downFn, upFn) => {
        const el = document.getElementById(id);
        el.addEventListener('touchstart', e => { e.preventDefault(); initAudio(); downFn(); });
        if (upFn) el.addEventListener('touchend', e => { e.preventDefault(); upFn(); });
    };
    setBtn('btn-left', () => keys['ArrowLeft'] = true, () => keys['ArrowLeft'] = false);
    setBtn('btn-right', () => keys['ArrowRight'] = true, () => keys['ArrowRight'] = false);
    setBtn('btn-up', () => keys['ArrowUp'] = true, () => keys['ArrowUp'] = false);
    setBtn('btn-down', () => keys['ArrowDown'] = true, () => keys['ArrowDown'] = false);
    setBtn('btn-punch', () => { keys['KeyJ'] = true; });
    setBtn('btn-kick', () => { keys['KeyK'] = true; });
    setBtn('btn-special', () => { keys['KeyL'] = true; });
    setBtn('btn-block', () => keys['ArrowDown'] = true, () => keys['ArrowDown'] = false);
}

// ============ ROUND MANAGEMENT ============
let player1, player2;

function startRound() {
    const p1Char = game.p1Char || 'scorpion';
    const chars = Object.keys(CHARACTERS).filter(c => c !== p1Char);
    const p2Char = chars[Math.floor(Math.random() * chars.length)];
    player1 = new Fighter(p1Char, canvas.width * 0.3, true, false);
    player2 = new Fighter(p2Char, canvas.width * 0.7, false, true);
    game.state = 'intro';
    game.timer = ROUND_TIME;
    game.particles = [];
    game.projectiles = [];
    document.getElementById('fight-screen').style.display = 'block';
    document.getElementById('round-end').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    setupMobileControls(player1);
    announce(`ROUND ${game.round}`, 1500);
    setTimeout(() => {
        announce('FIGHT!', 1000);
        game.state = 'fighting';
        startTimer();
    }, 2000);
}

function startTimer() {
    if (game.timerInterval) clearInterval(game.timerInterval);
    game.timerInterval = setInterval(() => {
        if (game.state !== 'fighting') return;
        game.timer -= 1;
        if (game.timer <= 0) { game.timer = 0; endRound(); }
    }, 1000);
}

function endRound() {
    game.state = 'roundEnd';
    clearInterval(game.timerInterval);
    let winner;
    if (player1.health > player2.health) {
        winner = 'p1';
        game.p1Wins++;
        announce(`${player1.name} WINS!`, 2000);
    } else if (player2.health > player1.health) {
        winner = 'p2';
        game.p2Wins++;
        announce(`${player2.name} WINS!`, 2000);
    } else {
        announce('DRAW!', 2000);
    }
    setTimeout(() => {
        if (game.p1Wins >= WINS_NEEDED) {
            gameOverScreen(player1.name);
        } else if (game.p2Wins >= WINS_NEEDED) {
            gameOverScreen(player2.name);
        } else {
            document.getElementById('round-end').style.display = 'flex';
            document.getElementById('round-result').textContent = winner === 'p1' ? `${player1.name} WINS!` : winner === 'p2' ? `${player2.name} WINS!` : 'DRAW!';
            document.getElementById('p1-wins').textContent = `${game.p1Wins}`;
            document.getElementById('p2-wins').textContent = `${game.p2Wins}`;
            setTimeout(() => { game.round++; startRound(); }, 3000);
        }
    }, 2500);
}

function gameOverScreen(winnerName) {
    document.getElementById('fight-screen').style.display = 'none';
    document.getElementById('round-end').style.display = 'none';
    document.getElementById('game-over').style.display = 'flex';
    const fatalities = ['FLAWLESS VICTORY', 'FATALITY', 'BRUTALITY', 'FINISH HIM', 'SUPREME VICTORY'];
    document.getElementById('winner-text').textContent = `${winnerName} WINS!`;
    document.getElementById('fatality-text').textContent = fatalities[Math.floor(Math.random() * fatalities.length)];
    playSound('ko');
}

// ============ CHARACTER SELECT ============
document.querySelectorAll('.char-option').forEach(el => {
    el.addEventListener('click', () => {
        initAudio();
        document.querySelectorAll('.char-option').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        game.p1Char = el.dataset.char;
        playSound('announcer');
        setTimeout(() => {
            document.getElementById('title-screen').style.display = 'none';
            game.round = 1;
            game.p1Wins = 0;
            game.p2Wins = 0;
            startRound();
        }, 500);
    });
});

// Draw character select portraits on canvas
const selectCanvas = document.getElementById('select-canvas');
if (selectCanvas) {
    const sctx = selectCanvas.getContext('2d');
    function drawSelectScreen() {
        selectCanvas.width = window.innerWidth;
        selectCanvas.height = window.innerHeight;
        // Character cards are drawn via CSS positioning, but we add effects
        requestAnimationFrame(drawSelectScreen);
    }
    drawSelectScreen();
}

// Play Again
document.getElementById('play-again').addEventListener('click', () => {
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('title-screen').style.display = 'flex';
});

// ============ POST PROCESSING ============
function drawVignette(ctx) {
    const w = canvas.width;
    const h = canvas.height;
    const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);
}

function drawComboOnCanvas(ctx) {
    // Draw active combo counters on canvas for flashier effect
    // (HTML combo display still works as fallback)
}

// ============ MAIN LOOP ============
let lastTime = 0;

function gameLoop(time) {
    requestAnimationFrame(gameLoop);

    let dt = (time - lastTime) / 1000;
    lastTime = time;
    if (dt > 0.05) dt = 0.05;

    game.frameCount++;

    // Slow-mo
    if (game.slowmo > 0) {
        dt *= 0.3;
        game.slowmo--;
    }

    // Update
    if (game.state === 'fighting' || game.state === 'intro') {
        if (player1 && player2) {
            handleInput(player1);
            player1.update(dt, player2);
            player2.update(dt, player1);
            checkHits(player1, player2);
            checkHits(player2, player1);
            updateProjectiles(dt, player1, player2);
            updateParticles(dt);

            if (game.state === 'fighting') {
                if (player1.state === 'ko' || player2.state === 'ko') {
                    setTimeout(() => endRound(), 1500);
                    game.state = 'roundEnd';
                }
            }
            updateHUD(player1, player2);
        }
    }

    // Render
    resizeCanvas();
    ctx.save();

    // Screen shake
    if (game.screenShake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * game.screenShake * 2,
            (Math.random() - 0.5) * game.screenShake * 2
        );
        game.screenShake *= 0.85;
        if (game.screenShake < 0.5) game.screenShake = 0;
    }

    drawBackground(ctx);

    if (player1 && player2) {
        // Draw ground shadows first
        ctx.save();
        ctx.globalAlpha = 0.3;
        const groundLevel = canvas.height * GROUND_Y;
        // Player 1 shadow
        drawGroundShadow(ctx, player1.x, groundLevel, player1.state === 'jump' ? 20 : 30, 5);
        // Player 2 shadow
        drawGroundShadow(ctx, player2.x, groundLevel, player2.state === 'jump' ? 20 : 30, 5);
        ctx.restore();

        // Draw fighters (back one first)
        if (player1.x < player2.x) {
            player1.draw(ctx);
            player2.draw(ctx);
        } else {
            player2.draw(ctx);
            player1.draw(ctx);
        }

        drawProjectiles(ctx);
        drawParticles(ctx);
    }

    // Post-processing
    drawVignette(ctx);

    // Slow-mo visual effect
    if (game.slowmo > 0) {
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Dramatic bars
        ctx.globalAlpha = Math.min(0.5, game.slowmo * 0.03);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height * 0.06);
        ctx.fillRect(0, canvas.height * 0.94, canvas.width, canvas.height * 0.06);
        ctx.restore();
    }

    ctx.restore();
}

requestAnimationFrame(gameLoop);
