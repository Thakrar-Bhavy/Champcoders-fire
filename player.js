/**
 * Player Character Class
 * Handles player movement, shooting, and state
 */

const AVATAR_LOOKUP = (() => {
    const meta = window.GAME_META || {};
    if (Array.isArray(meta.avatars)) {
        const map = {};
        meta.avatars.forEach(avatar => {
            map[avatar.id] = avatar;
        });
        return map;
    }
    return {};
})();

class Player {
    constructor(id, name, isLocal = false, avatarId = 'flame') {
        this.id = id;
        this.name = name;
        this.isLocal = isLocal;
        this.avatarId = avatarId;
        this.avatarStyle = this.getAvatarStyle(avatarId);
        
        // Position and movement
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.width = 30;
        this.height = 50;
        this.isOnGround = false;
        this.facing = 1; // 1 for right, -1 for left
        
        // Player state
        this.health = 100;
        this.maxHealth = 100;
        this.jetpackFuel = 100;
        this.maxFuel = 100;
        this.isUsingJetpack = false;
        this.isDead = false;
        
        // Weapons
        this.weapon = 'pistol';
        this.weapons = {
            pistol: { damage: 25, fireRate: 500, ammo: Infinity, bulletSpeed: 12 },
            rifle: { damage: 15, fireRate: 150, ammo: 30, bulletSpeed: 15 },
            shotgun: { damage: 10, fireRate: 800, ammo: 8, bulletSpeed: 10, spread: 0.3 }
        };
        this.lastShotTime = 0;
        
        // Network interpolation
        this.networkState = null;
        this.lastNetworkUpdate = 0;
        this.interpolationDelay = 100; // ms
        
        // Animation
        this.animationState = 'idle';
        this.animationFrame = 0;
        this.lastAnimationUpdate = 0;
        
        // Stats
        this.kills = 0;
        this.deaths = 0;
    }
    
    /**
     * Update player state
     */
    update(keys, mouse, config, map) {
        if (this.isDead) return;
        
        this.handleInput(keys, mouse, config);
        this.applyPhysics(config, map);
        this.updateWeapon();
        this.updateAnimation();
        
        // Clamp position to map bounds
        this.clampToMap(map);
    }
    
    /**
     * Handle player input
     */
    handleInput(keys, mouse, config) {
        if (!this.isLocal) return;
        
        // Horizontal movement
        this.vx = 0;
        if (keys['KeyA'] || keys['ArrowLeft']) {
            this.vx = -config.moveSpeed;
            this.facing = -1;
        }
        if (keys['KeyD'] || keys['ArrowRight']) {
            this.vx = config.moveSpeed;
            this.facing = 1;
        }
        
        // Jetpack
        this.isUsingJetpack = false;
        if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && this.jetpackFuel > 0) {
            this.vy += config.jetpackForce;
            this.jetpackFuel -= config.jetpackFuelConsumption;
            this.isUsingJetpack = true;
        }
        
        // Fuel regeneration when not using jetpack
        if (!this.isUsingJetpack && this.jetpackFuel < this.maxFuel) {
            this.jetpackFuel += config.jetpackFuelRegen;
        }
        
        // Clamp fuel
        this.jetpackFuel = Math.max(0, Math.min(this.maxFuel, this.jetpackFuel));
        
        // Update facing direction based on mouse
        if (mouse.x > this.x) {
            this.facing = 1;
        } else if (mouse.x < this.x) {
            this.facing = -1;
        }
    }
    
    /**
     * Apply physics to player
     */
    applyPhysics(config, map) {
        // Apply gravity
        if (!this.isOnGround) {
            this.vy += config.gravity;
        }
        
        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;
        
        // Check ground collision
        this.isOnGround = false;
        const feetY = this.y + this.height;
        
        for (const platform of map.platforms) {
            if (platform.type === 'ground' || platform.type === 'platform') {
                // Check if player is standing on platform
                if (feetY >= platform.y && 
                    feetY <= platform.y + 10 &&
                    this.x + this.width > platform.x &&
                    this.x < platform.x + platform.width &&
                    this.vy >= 0) {
                    
                    this.y = platform.y - this.height;
                    this.vy = 0;
                    this.isOnGround = true;
                    break;
                }
            }
        }
        
        // Check wall collisions
        for (const platform of map.platforms) {
            if (platform.type === 'wall') {
                if (this.x < platform.x + platform.width &&
                    this.x + this.width > platform.x &&
                    this.y + this.height > platform.y &&
                    this.y < platform.y + platform.height) {
                    
                    if (this.vx > 0) { // Moving right
                        this.x = platform.x - this.width;
                    } else if (this.vx < 0) { // Moving left
                        this.x = platform.x + platform.width;
                    }
                    this.vx = 0;
                }
            }
        }
        
        // Apply friction when on ground
        if (this.isOnGround) {
            this.vx *= 0.8; // Ground friction
        } else {
            this.vx *= 0.95; // Air resistance
        }
        
        // Clamp velocity
        this.vx = Math.max(-10, Math.min(10, this.vx));
        this.vy = Math.max(-15, Math.min(15, this.vy));
    }
    
    /**
     * Update weapon state and handle shooting
     */
    updateWeapon() {
        // Weapon switching
        // This would be implemented with number keys or weapon wheel
        
        // Auto-reload when out of ammo
        const weaponData = this.weapons[this.weapon];
        if (weaponData.ammo === 0) {
            // Implement reload logic here
        }
    }
    
    /**
     * Shoot weapon
     */
    shoot(targetX, targetY) {
        if (this.isDead) return;
        
        const currentTime = Date.now();
        const weaponData = this.weapons[this.weapon];
        
        // Check fire rate
        if (currentTime - this.lastShotTime < weaponData.fireRate) {
            return;
        }
        
        // Check ammo
        if (weaponData.ammo <= 0) {
            return;
        }
        
        // Calculate direction
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const directionX = dx / distance;
        const directionY = dy / distance;
        
        // Create bullet(s)
        if (this.weapon === 'shotgun') {
            // Shotgun spread
            for (let i = 0; i < 5; i++) {
                const spread = (Math.random() - 0.5) * weaponData.spread;
                const bullet = new Bullet(
                    this.x,
                    this.y,
                    (directionX + spread) * weaponData.bulletSpeed,
                    (directionY + spread) * weaponData.bulletSpeed,
                    this.id,
                    this.weapon
                );
                game.addBullet(bullet);
            }
        } else {
            // Single bullet
            const bullet = new Bullet(
                this.x,
                this.y,
                directionX * weaponData.bulletSpeed,
                directionY * weaponData.bulletSpeed,
                this.id,
                this.weapon
            );
            game.addBullet(bullet);
        }
        
        // Update weapon state
        this.lastShotTime = currentTime;
        if (weaponData.ammo !== Infinity) {
            weaponData.ammo--;
        }
        
        // Recoil effect
        this.vx -= directionX * 0.5;
        this.vy -= directionY * 0.2;
    }
    
    /**
     * Take damage from bullet or other source
     */
    takeDamage(amount, attackerId) {
        this.health -= amount;
        this.health = Math.max(0, this.health);
        
        // Visual feedback
        this.createDamageParticles();
        
        if (this.health <= 0 && !this.isDead) {
            this.die(attackerId);
        }
    }
    
    /**
     * Handle player death
     */
    die(killerId) {
        this.isDead = true;
        this.deaths++;
        
        // Award kill to attacker
        const attacker = game.players.get(killerId);
        if (attacker) {
            attacker.kills++;
        }
        
        // Respawn after delay
        setTimeout(() => {
            this.respawn(map);
        }, 3000);
    }
    
    /**
     * Respawn player at random location
     */
    respawn(map) {
        this.isDead = false;
        this.health = this.maxHealth;
        this.jetpackFuel = this.maxFuel;
        
        const spawnPoint = map.getRandomSpawnPoint();
        this.x = spawnPoint.x;
        this.y = spawnPoint.y;
        this.vx = 0;
        this.vy = 0;
        
        // Broadcast respawn
        if (this.isLocal) {
            network.broadcastPlayerState(this.getSyncData());
        }
    }
    
    /**
     * Create particle effect for damage
     */
    createDamageParticles() {
        for (let i = 0; i < 3; i++) {
            game.particles.push(new Particle(
                this.x + Math.random() * this.width - this.width / 2,
                this.y + Math.random() * this.height - this.height / 2,
                Math.random() * 4 - 2,
                Math.random() * 4 - 2,
                '#ff0000',
                20
            ));
        }
    }
    
    /**
     * Update player animation
     */
    updateAnimation() {
        const currentTime = Date.now();
        
        // Determine animation state
        let newState = 'idle';
        if (!this.isOnGround) {
            newState = this.isUsingJetpack ? 'jetpack' : 'jump';
        } else if (Math.abs(this.vx) > 0.1) {
            newState = 'run';
        }
        
        // Update animation frame
        if (newState !== this.animationState) {
            this.animationState = newState;
            this.animationFrame = 0;
        }
        
        // Advance animation frame
        if (currentTime - this.lastAnimationUpdate > 100) {
            this.animationFrame = (this.animationFrame + 1) % 4;
            this.lastAnimationUpdate = currentTime;
        }
    }
    
    /**
     * Render player
     */
    render(ctx, camera) {
        if (this.isDead) return;
        
        const screenX = this.x;
        const screenY = this.y;
        
        // Draw torso with avatar gradient
        const bodyX = screenX - this.width / 2;
        const bodyY = screenY - this.height / 2;
        if (this.avatarStyle.gradient) {
            const gradient = ctx.createLinearGradient(bodyX, bodyY, bodyX + this.width, bodyY + this.height);
            gradient.addColorStop(0, this.avatarStyle.primary);
            gradient.addColorStop(1, this.avatarStyle.accent);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = this.avatarStyle.primary;
        }
        ctx.fillRect(bodyX, bodyY, this.width, this.height);
        
        // Draw head
        ctx.fillStyle = this.avatarStyle.accent;
        ctx.beginPath();
        ctx.arc(screenX, screenY - this.height / 4, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Avatar emblem
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '14px Segoe UI';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.avatarStyle.emoji, screenX, screenY);
        
        // Weapon (simplified)
        const weaponLength = 20;
        const weaponX = screenX + (this.facing * weaponLength);
        ctx.strokeStyle = this.avatarStyle.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(weaponX, screenY);
        ctx.stroke();
        
        // Jetpack flame
        if (this.isUsingJetpack) {
            ctx.fillStyle = '#ff9500';
            ctx.beginPath();
            ctx.ellipse(screenX, screenY + this.height / 2, 5, 10, 0, 0, Math.PI);
            ctx.fill();
            
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.ellipse(screenX, screenY + this.height / 2 + 8, 3, 6, 0, 0, Math.PI);
            ctx.fill();
        }
        
        // Draw selection indicator for local player
        if (this.isLocal) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX - this.width / 2 - 2, screenY - this.height / 2 - 2, this.width + 4, this.height + 4);
        }
    }
    
    /**
     * Get data for network synchronization
     */
    getSyncData() {
        return {
            id: this.id,
            name: this.name,
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy,
            health: this.health,
            jetpackFuel: this.jetpackFuel,
            weapon: this.weapon,
            facing: this.facing,
            isUsingJetpack: this.isUsingJetpack,
            isOnGround: this.isOnGround,
            isDead: this.isDead,
            kills: this.kills,
            deaths: this.deaths,
            avatarId: this.avatarId
        };
    }
    
    /**
     * Update from network data
     */
    networkUpdate(state) {
        this.networkState = state;
        this.lastNetworkUpdate = Date.now();
    }
    
    /**
     * Interpolate position from network data
     */
    interpolate() {
        if (!this.networkState || Date.now() - this.lastNetworkUpdate > 1000) {
            return;
        }
        
        // Simple interpolation for smooth movement
        const alpha = 0.2; // Interpolation factor
        this.x += (this.networkState.x - this.x) * alpha;
        this.y += (this.networkState.y - this.y) * alpha;
        this.facing = this.networkState.facing;
        this.health = this.networkState.health;
        this.isUsingJetpack = this.networkState.isUsingJetpack;
        this.isOnGround = this.networkState.isOnGround;
        this.isDead = this.networkState.isDead;
        if (this.networkState.avatarId && this.networkState.avatarId !== this.avatarId) {
            this.avatarId = this.networkState.avatarId;
            this.avatarStyle = this.getAvatarStyle(this.avatarId);
        }
    }
    
    /**
     * Clamp player to map bounds
     */
    clampToMap(map) {
        this.x = Math.max(this.width / 2, Math.min(this.x, map.width - this.width / 2));
        this.y = Math.max(this.height / 2, Math.min(this.y, map.height - this.height / 2));
    }
    
    /**
     * Resolve avatar style
     */
    getAvatarStyle(avatarId) {
        const fallback = { primary: '#ff6b35', accent: '#ffe66d', emoji: '🔥' };
        if (!avatarId) return fallback;
        const avatar = AVATAR_LOOKUP[avatarId];
        if (!avatar) return fallback;
        return {
            primary: avatar.primary || fallback.primary,
            accent: avatar.accent || fallback.accent,
            emoji: avatar.emoji || fallback.emoji,
            gradient: avatar.gradient || null
        };
    }
}

/**
 * Bullet Class
 */
class Bullet {
    constructor(x, y, vx, vy, ownerId, weaponType) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.ownerId = ownerId;
        this.weaponType = weaponType;
        this.radius = 3;
        this.damage = this.getDamage();
        this.lifetime = 2000; // ms
        this.createdTime = Date.now();
    }
    
    /**
     * Get damage based on weapon type
     */
    getDamage() {
        const weaponDamages = {
            pistol: 25,
            rifle: 15,
            shotgun: 10
        };
        return weaponDamages[this.weaponType] || 10;
    }
    
    /**
     * Update bullet position
     */
    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Apply gravity to bullets (slight effect)
        this.vy += 0.05;
    }
    
    /**
     * Render bullet
     */
    render(ctx) {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add trail effect
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x - this.vx * 0.5, this.y - this.vy * 0.5);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
    }
    
    /**
     * Check if bullet is out of bounds or expired
     */
    isOutOfBounds(mapWidth, mapHeight) {
        return this.x < 0 || 
               this.x > mapWidth || 
               this.y < 0 || 
               this.y > mapHeight ||
               Date.now() - this.createdTime > this.lifetime;
    }
    
    /**
     * Get sync data for network
     */
    getSyncData() {
        return {
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy,
            ownerId: this.ownerId,
            weaponType: this.weaponType
        };
    }
}

/**
 * Particle Effect Class
 */
class Particle {
    constructor(x, y, vx, vy, color, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.radius = Math.random() * 3 + 1;
        this.isDead = false;
    }
    
    /**
     * Update particle
     */
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.lifetime--;
        this.isDead = this.lifetime <= 0;
    }
    
    /**
     * Render particle
     */
    render(ctx) {
        const alpha = this.lifetime / this.maxLifetime;
        ctx.fillStyle = this.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}