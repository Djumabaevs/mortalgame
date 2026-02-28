// MORTAL FURY — 2D Fighting Game
// Canvas-based, no external assets

// ============ CONSTANTS ============
const GRAVITY = 1800;
const GROUND_Y = 0.75; // % of canvas height
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
        colors: { body: '#ffcc00', pants: '#444', skin: '#d4a574', glow: '#ff6600' },
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
        colors: { body: '#0088ff', pants: '#003366', skin: '#c4a882', glow: '#00ccff' },
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
        colors: { body: '#cc0000', pants: '#222', skin: '#d4a574', glow: '#ff0000' },
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
    state: 'select', // select, intro, fighting, roundEnd, gameOver
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
    comboTexts: []
};

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

        this.state = 'idle'; // idle, walk, jump, crouch, attack, hit, block, ko
        this.attackType = null;
        this.attackFrame = 0;
        this.attackTotalFrames = 0;
        this.stun = 0;
        this.frozen = 0;
        this.blocking = false;

        this.animFrame = 0;
        this.animTimer = 0;

        // AI
        this.aiTimer = 0;
        this.aiAction = null;
    }

    get groundY() {
        return canvas.height * GROUND_Y - this.height;
    }

    get onGround() {
        return this.y >= this.groundY;
    }

    get hitbox() {
        return {
            x: this.x - this.width / 2,
            y: this.y,
            w: this.width,
            h: this.height
        };
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
                        life: 60
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
            spawnParticles(this.x, this.y + this.height * 0.4, '#fff', 3);
            this.stun = 5;
            return;
        }

        const finalDamage = damage * (2 - this.stats.defense);
        this.health -= finalDamage;
        this.state = 'hit';
        this.stun = 15;

        // Combo
        attacker.combo++;
        attacker.comboTimer = 60;
        attacker.special = Math.min(MAX_SPECIAL, attacker.special + 8);

        if (attacker.combo >= 3) {
            showCombo(attacker.combo, attacker.facingRight);
        }

        // Knockback
        const dir = attacker.facingRight ? 1 : -1;
        this.vx = dir * 200;
        if (launcher) {
            this.vy = -400;
        }

        if (freeze) {
            this.frozen = 90;
        }

        // Effects
        game.screenShake = 8;
        if (finalDamage > 15) game.slowmo = 6;
        playSound(launcher ? 'kick' : 'punch');
        spawnParticles(this.x, this.y + this.height * 0.4, '#ff0', 8);
        hitFlash();

        if (this.health <= 0) {
            this.health = 0;
            this.state = 'ko';
            game.screenShake = 15;
            game.slowmo = 20;
            playSound('ko');
        }
    }

    update(dt, opponent) {
        if (game.state !== 'fighting') return;

        // Stun / frozen
        if (this.frozen > 0) {
            this.frozen--;
            return;
        }
        if (this.stun > 0) {
            this.stun--;
            if (this.stun === 0 && this.state === 'hit') this.state = 'idle';
        }

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) this.combo = 0;
        }

        // AI
        if (this.isAI && this.state !== 'ko') {
            this.updateAI(dt, opponent);
        }

        // Attack frames
        if (this.state === 'attack') {
            this.attackFrame++;
            if (this.attackFrame >= this.attackTotalFrames) {
                this.state = 'idle';
                this.attackType = null;
            }
        }

        // Face opponent
        if (this.state !== 'attack' && this.state !== 'hit' && this.state !== 'ko') {
            this.facingRight = opponent.x > this.x;
        }

        // Physics
        if (!this.onGround) {
            this.vy += GRAVITY * dt;
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Ground
        if (this.y >= this.groundY) {
            this.y = this.groundY;
            this.vy = 0;
            if (this.state === 'jump') this.state = 'idle';
        }

        // Friction
        this.vx *= 0.85;

        // Bounds
        this.x = Math.max(this.width / 2 + 10, Math.min(canvas.width - this.width / 2 - 10, this.x));

        // Animation
        this.animTimer += dt;
        if (this.animTimer > 0.1) {
            this.animTimer = 0;
            this.animFrame++;
        }

        // Special regen
        if (this.state === 'idle' || this.state === 'walk') {
            this.special = Math.min(MAX_SPECIAL, this.special + 2 * dt);
        }
    }

    updateAI(dt, player) {
        this.aiTimer -= dt;
        if (this.aiTimer > 0) return;

        const dist = Math.abs(this.x - player.x);
        const r = Math.random();

        if (this.state === 'hit' || this.stun > 0) {
            this.aiTimer = 0.1;
            return;
        }

        // Block incoming attacks
        if (player.state === 'attack' && dist < 100) {
            if (r < 0.5) {
                this.blocking = true;
                this.aiTimer = 0.3;
                setTimeout(() => { this.blocking = false; }, 300);
                return;
            }
        }

        if (dist < 80) {
            // Close range - attack
            if (r < 0.35) {
                this.startAttack('punch');
                this.aiTimer = 0.4;
            } else if (r < 0.6) {
                this.startAttack('kick');
                this.aiTimer = 0.5;
            } else if (r < 0.75 && this.special >= 50) {
                this.startAttack('special');
                this.aiTimer = 0.7;
            } else if (r < 0.85) {
                this.startAttack('uppercut');
                this.aiTimer = 0.5;
            } else {
                // Jump back
                if (this.onGround) {
                    this.vy = JUMP_FORCE * 0.7;
                    this.vx = (this.facingRight ? -1 : 1) * 200;
                    this.state = 'jump';
                }
                this.aiTimer = 0.5;
            }
        } else if (dist < 250) {
            // Mid range
            if (r < 0.4) {
                // Approach
                const dir = this.facingRight ? 1 : -1;
                this.vx = dir * WALK_SPEED * this.stats.speed;
                this.state = 'walk';
                this.aiTimer = 0.3;
            } else if (r < 0.6 && this.special >= 50) {
                this.startAttack('special');
                this.aiTimer = 0.7;
            } else if (r < 0.75) {
                // Jump in
                if (this.onGround) {
                    this.vy = JUMP_FORCE;
                    this.vx = (this.facingRight ? 1 : -1) * 250;
                    this.state = 'jump';
                }
                this.aiTimer = 0.5;
            } else {
                this.aiTimer = 0.2;
            }
        } else {
            // Far - approach or projectile
            if (r < 0.5 && this.special >= 50) {
                this.startAttack('special');
                this.aiTimer = 0.8;
            } else {
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

        // Frozen effect
        if (this.frozen > 0) {
            ctx.globalAlpha = 0.7;
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur = 20;
        }

        // Hit flash
        const isHit = this.state === 'hit' && this.stun > 10;

        // Body bob
        const bob = this.state === 'idle' ? Math.sin(this.animFrame * 0.5) * 2 : 0;
        const attackReach = this.state === 'attack' ? dir * 15 : 0;

        // ---- LEGS ----
        ctx.fillStyle = isHit ? '#fff' : this.colors.pants;
        // Left leg
        const legSpread = this.state === 'walk' ? Math.sin(this.animFrame) * 10 : 5;
        ctx.fillRect(x - 15 * dir - 8 + attackReach, y + 75 + bob, 14, 45);
        // Right leg
        ctx.fillRect(x + 5 * dir - 8 + attackReach + legSpread * dir, y + 75 + bob, 14, 45);

        // Kick leg
        if (this.state === 'attack' && (this.attackType === 'kick' || this.attackType === 'uppercut')) {
            const kickProgress = this.attackFrame / this.attackTotalFrames;
            if (kickProgress > 0.2 && kickProgress < 0.7) {
                ctx.fillStyle = isHit ? '#fff' : this.colors.pants;
                const kickX = x + dir * (30 + kickProgress * 40);
                const kickY = this.attackType === 'uppercut' ? y + 40 : y + 65;
                ctx.fillRect(kickX - 7, kickY + bob, 30 * dir, 12);
            }
        }

        // ---- TORSO ----
        ctx.fillStyle = isHit ? '#fff' : this.colors.body;
        ctx.fillRect(x - 18 + attackReach, y + 30 + bob, 36, 48);

        // Belt
        ctx.fillStyle = '#222';
        ctx.fillRect(x - 18 + attackReach, y + 72 + bob, 36, 5);

        // ---- ARMS ----
        ctx.fillStyle = isHit ? '#fff' : this.colors.skin;

        // Back arm
        ctx.fillRect(x - 22 * dir + attackReach, y + 35 + bob, 12, 35);

        // Front arm / punch
        if (this.state === 'attack' && this.attackType === 'punch') {
            const punchProgress = this.attackFrame / this.attackTotalFrames;
            if (punchProgress > 0.15 && punchProgress < 0.6) {
                const punchX = x + dir * (20 + punchProgress * 50);
                ctx.fillRect(punchX + attackReach, y + 38 + bob, 25 * dir, 10);
                // Fist
                ctx.fillStyle = isHit ? '#fff' : '#ff0';
                ctx.fillRect(punchX + 25 * dir + attackReach, y + 35 + bob, 12 * dir, 16);
            }
        } else {
            ctx.fillRect(x + 12 * dir + attackReach, y + 35 + bob, 12, 30);
        }

        // ---- HEAD ----
        ctx.fillStyle = isHit ? '#fff' : this.colors.skin;
        ctx.beginPath();
        ctx.arc(x + attackReach, y + 20 + bob, 18, 0, Math.PI * 2);
        ctx.fill();

        // Mask/headband
        ctx.fillStyle = isHit ? '#fff' : this.colors.body;
        ctx.fillRect(x - 18 + attackReach, y + 14 + bob, 36, 10);

        // Eyes
        if (this.state !== 'ko') {
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + dir * 5 - 3 + attackReach, y + 15 + bob, 6, 5);
            ctx.fillRect(x + dir * 12 - 3 + attackReach, y + 15 + bob, 6, 5);
            // Pupils
            ctx.fillStyle = this.state === 'hit' ? '#f00' : '#000';
            ctx.fillRect(x + dir * 5 + attackReach, y + 16 + bob, 3, 3);
            ctx.fillRect(x + dir * 12 + attackReach, y + 16 + bob, 3, 3);
        } else {
            // KO eyes (X_X)
            ctx.strokeStyle = '#f00';
            ctx.lineWidth = 2;
            [-1, 1].forEach(side => {
                const ex = x + side * 8 + attackReach;
                const ey = y + 17 + bob;
                ctx.beginPath(); ctx.moveTo(ex - 3, ey - 3); ctx.lineTo(ex + 3, ey + 3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(ex + 3, ey - 3); ctx.lineTo(ex - 3, ey + 3); ctx.stroke();
            });
        }

        // Block shield
        if (this.blocking) {
            ctx.strokeStyle = '#0af';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
            ctx.beginPath();
            ctx.arc(x + attackReach, y + 50 + bob, 40, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Special glow when charged
        if (this.special >= 50) {
            ctx.shadowColor = this.colors.glow;
            ctx.shadowBlur = 15 + Math.sin(Date.now() * 0.005) * 10;
            ctx.strokeStyle = this.colors.glow;
            ctx.globalAlpha = 0.3;
            ctx.strokeRect(x - 25 + attackReach, y + bob, 50, this.height);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }
}

// ============ PARTICLES ============
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        game.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 400,
            vy: (Math.random() - 1) * 300,
            life: 30 + Math.random() * 20,
            color,
            size: 2 + Math.random() * 4
        });
    }
}

function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 500 * dt;
        p.life--;
        if (p.life <= 0) game.particles.splice(i, 1);
    }
}

function drawParticles(ctx) {
    game.particles.forEach(p => {
        ctx.globalAlpha = p.life / 50;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
}

// ============ PROJECTILES ============
function updateProjectiles(dt, p1, p2) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const proj = game.projectiles[i];
        proj.x += proj.vx * dt;
        proj.life--;

        if (proj.life <= 0 || proj.x < 0 || proj.x > canvas.width) {
            game.projectiles.splice(i, 1);
            continue;
        }

        // Hit detection
        const target = proj.owner === p1 ? p2 : p1;
        const hb = target.hitbox;
        if (proj.x > hb.x && proj.x < hb.x + hb.w &&
            proj.y > hb.y && proj.y < hb.y + hb.h) {
            target.takeHit(proj.damage, proj.owner, false, proj.freeze);
            spawnParticles(proj.x, proj.y, proj.color, 12);
            game.projectiles.splice(i, 1);
        }
    }
}

function drawProjectiles(ctx) {
    game.projectiles.forEach(proj => {
        ctx.fillStyle = proj.color;
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 10, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(proj.x - proj.vx * 0.02, proj.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
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
    el.textContent = `${count} HIT COMBO!`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// ============ ANNOUNCER ============
function announce(text, duration = 2000) {
    const el = document.getElementById('announcer');
    el.textContent = text;
    el.style.display = 'block';
    playSound('announcer');
    setTimeout(() => el.style.display = 'none', duration);
}

// ============ BACKGROUND ============
function drawBackground(ctx) {
    const w = canvas.width;
    const h = canvas.height;
    const groundY = h * GROUND_Y;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, '#0a0015');
    skyGrad.addColorStop(0.5, '#1a0030');
    skyGrad.addColorStop(1, '#2a0020');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, groundY);

    // Moon
    ctx.fillStyle = '#ddd';
    ctx.shadowColor = '#aaf';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.15, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Mountains
    ctx.fillStyle = '#150020';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w; x += 60) {
        ctx.lineTo(x, groundY - 80 - Math.sin(x * 0.01) * 50 - Math.sin(x * 0.03) * 30);
    }
    ctx.lineTo(w, groundY);
    ctx.fill();

    // Ground
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
    groundGrad.addColorStop(0, '#2a1a0a');
    groundGrad.addColorStop(1, '#1a0a00');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Ground line
    ctx.strokeStyle = '#4a2a0a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // Pillars
    [0.15, 0.85].forEach(px => {
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(w * px - 15, groundY - 200, 30, 200);
        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(w * px - 20, groundY - 210, 40, 15);
        ctx.fillRect(w * px - 20, groundY - 5, 40, 10);
        // Torch
        ctx.fillStyle = '#ff6600';
        ctx.shadowColor = '#f60';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(w * px, groundY - 150 + Math.sin(Date.now() * 0.01) * 3, 8 + Math.sin(Date.now() * 0.02) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

// ============ HUD UPDATE ============
function updateHUD(p1, p2) {
    document.getElementById('p1-health').style.width = `${p1.health}%`;
    document.getElementById('p2-health').style.width = `${p2.health}%`;
    document.getElementById('p1-special').style.width = `${p1.special}%`;
    document.getElementById('p2-special').style.width = `${p2.special}%`;
    document.getElementById('p1-name').textContent = p1.name;
    document.getElementById('p2-name').textContent = p2.name;
    document.getElementById('timer').textContent = Math.ceil(game.timer);
    document.getElementById('round-text').textContent = `ROUND ${game.round}`;
}

// ============ INPUT ============
const keys = {};
document.addEventListener('keydown', e => {
    keys[e.code] = true;
    initAudio();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

function handleInput(player) {
    if (player.state === 'ko' || player.state === 'hit' || player.frozen > 0) return;

    // Movement
    if (keys['KeyA'] || keys['ArrowLeft']) {
        player.vx = -WALK_SPEED * player.stats.speed;
        if (player.state !== 'attack' && player.state !== 'jump') player.state = 'walk';
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        player.vx = WALK_SPEED * player.stats.speed;
        if (player.state !== 'attack' && player.state !== 'jump') player.state = 'walk';
    }

    // Jump
    if ((keys['KeyW'] || keys['ArrowUp'] || keys['Space']) && player.onGround && player.state !== 'attack') {
        player.vy = JUMP_FORCE;
        player.state = 'jump';
    }

    // Block
    player.blocking = keys['KeyS'] || keys['ArrowDown'];

    // Attacks
    if (keys['KeyJ'] || keys['KeyZ']) { player.startAttack('punch'); keys['KeyJ'] = false; keys['KeyZ'] = false; }
    if (keys['KeyK'] || keys['KeyX']) { player.startAttack('kick'); keys['KeyK'] = false; keys['KeyX'] = false; }
    if (keys['KeyL'] || keys['KeyC']) { player.startAttack('special'); keys['KeyL'] = false; keys['KeyC'] = false; }
    if (keys['KeyU'] || keys['KeyV']) { player.startAttack('uppercut'); keys['KeyU'] = false; keys['KeyV'] = false; }

    // Reset hit connected
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
    // Random AI character
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

    // Intro sequence
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
        if (game.timer <= 0) {
            game.timer = 0;
            endRound();
        }
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
            // Show round result
            document.getElementById('round-end').style.display = 'flex';
            document.getElementById('round-result').textContent = winner === 'p1' ? `${player1.name} WINS!` : winner === 'p2' ? `${player2.name} WINS!` : 'DRAW!';
            document.getElementById('p1-wins').textContent = `🏆 ${game.p1Wins}`;
            document.getElementById('p2-wins').textContent = `${game.p2Wins} 🏆`;

            setTimeout(() => {
                game.round++;
                startRound();
            }, 3000);
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

// Play Again
document.getElementById('play-again').addEventListener('click', () => {
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('title-screen').style.display = 'flex';
});

// ============ MAIN LOOP ============
let lastTime = 0;

function gameLoop(time) {
    requestAnimationFrame(gameLoop);

    let dt = (time - lastTime) / 1000;
    lastTime = time;
    if (dt > 0.05) dt = 0.05;

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

            // Hit detection
            checkHits(player1, player2);
            checkHits(player2, player1);

            // Projectiles
            updateProjectiles(dt, player1, player2);
            updateParticles(dt);

            // KO check
            if (game.state === 'fighting') {
                if (player1.state === 'ko' || player2.state === 'ko') {
                    setTimeout(() => endRound(), 1500);
                    game.state = 'roundEnd';
                }
            }

            // HUD
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

    ctx.restore();
}

requestAnimationFrame(gameLoop);
