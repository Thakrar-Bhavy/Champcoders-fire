/**
 * ChampCoder Fire - Main Game Engine
 * P2P 2D Shooter Game
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'menu'; // menu, playing, gameover
        this.players = new Map();
        this.bullets = [];
        this.particles = [];
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.camera = { x: 0, y: 0 };
        this.lastTime = 0;
        this.deltaTime = 0;
        this.mobileControls = null;
        this.mobileButtons = {};
        this.mobileShootInterval = null;
        this.mobileControlsEnabled = false;
        this.mobileControlsReady = false;
        this.autoMobilePreferred = this.detectTouchPreference();
        this.matchSettings = {
            duration: 300,
            mapId: map.currentMapId
        };
        this.matchEndTime = null;
        this.gameOverTriggered = false;
        this.scoreboardVisibleUntil = 0;
        
        // Game balance
        this.config = {
            gravity: 0.5,
            jetpackForce: -0.8,
            jetpackFuelConsumption: 2,
            jetpackFuelRegen: 0.5,
            moveSpeed: 3,
            bulletSpeed: 10,
            respawnTime: 3000
        };
        
        this.init();
    }
    
    /**
     * Initialize game
     */
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Input handlers
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyM') {
                audio.toggleMicrophone();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left + this.camera.x;
            this.mouse.y = e.clientY - rect.top + this.camera.y;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.down = true;
            if (this.gameState === 'playing') {
                this.localPlayer?.shoot(this.mouse.x, this.mouse.y);
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.down = false;
        });
        
        // Touch support for mobile
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left + this.camera.x;
            this.mouse.y = touch.clientY - rect.top + this.camera.y;
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.mouse.down = true;
            if (this.gameState === 'playing') {
                this.localPlayer?.shoot(this.mouse.x, this.mouse.y);
            }
        });
        
        this.canvas.addEventListener('touchend', () => {
            this.mouse.down = false;
        });

        this.setupMobileControls();
        
        // Start game loop
        this.gameLoop();
    }
    
    /**
     * Resize canvas to fit window
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    /**
     * Start a new game
     */
    startGame(options = {}) {
        this.gameState = 'playing';
        this.players.clear();
        this.bullets = [];
        this.particles = [];
        this.gameOverTriggered = false;
        this.scoreboardVisibleUntil = 0;
        ui.showScoreboard(false);
        
        const profile = options.profile || network.getLocalProfile();
        const playerName = profile?.name || `Player${Math.floor(Math.random() * 1000)}`;
        const avatarId = profile?.avatarId || 'flame';
        
        this.matchSettings = {
            duration: options.duration || this.matchSettings.duration,
            mapId: options.mapId || this.matchSettings.mapId,
            startTime: options.startTime || Date.now()
        };
        map.loadMap(this.matchSettings.mapId);
        this.matchEndTime = this.matchSettings.startTime + this.matchSettings.duration * 1000;
        ui.updateTimer((this.matchEndTime - Date.now()) / 1000);
        
        // Create local player
        this.localPlayer = new Player(
            network.getLocalPlayerId(),
            playerName,
            true,
            avatarId
        );
        this.players.set(this.localPlayer.id, this.localPlayer);
        this.refreshScoreboard();
        
        // Spawn player
        const spawnPoint = map.getRandomSpawnPoint();
        this.localPlayer.x = spawnPoint.x;
        this.localPlayer.y = spawnPoint.y;
        
        // Update camera
        this.updateCamera();
        ui.updatePlayerCount(this.players.size);
        ui.showScreen('game');
        ui.showNotification('Game Started!', 'join-notification');
        
        // Let peers know about our player once ready
        setTimeout(() => {
            network.announceLocalPlayer();
        }, 250);
    }
    
    /**
     * End game and show results
     */
    endGame(winner) {
        this.gameState = 'gameover';
        ui.showGameOver(winner, this.localPlayer);
    }
    
    /**
     * Add a new player to the game
     */
    addPlayer(playerData) {
        if (!this.players.has(playerData.id)) {
            const player = new Player(playerData.id, playerData.name, false, playerData.avatarId);
            player.x = playerData.x;
            player.y = playerData.y;
            player.health = playerData.health;
            player.weapon = playerData.weapon;
            this.players.set(player.id, player);
            
            ui.showNotification(`${playerData.name} joined`, 'join-notification');
            ui.updatePlayerCount(this.players.size);
            this.refreshScoreboard();
        }
    }
    
    /**
     * Remove a player from the game
     */
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            ui.showNotification(`${player.name} left`, 'leave-notification');
            this.players.delete(playerId);
            ui.updatePlayerCount(this.players.size);
            this.refreshScoreboard();
        }
    }
    
    /**
     * Update camera to follow local player
     */
    updateCamera() {
        if (this.localPlayer) {
            this.camera.x = this.localPlayer.x - this.canvas.width / 2;
            this.camera.y = this.localPlayer.y - this.canvas.height / 2;
            
            // Clamp camera to map bounds
            this.camera.x = Math.max(0, Math.min(this.camera.x, map.width - this.canvas.width));
            this.camera.y = Math.max(0, Math.min(this.camera.y, map.height - this.canvas.height));
        }
    }
    
    /**
     * Main game loop
     */
    gameLoop(currentTime = 0) {
        this.deltaTime = (currentTime - this.lastTime) / 16.67; // Normalized to 60fps
        this.lastTime = currentTime;
        
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'playing') {
            this.update();
            this.render();
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    /**
     * Update game state
     */
    update() {
        if (this.matchEndTime) {
            const secondsLeft = (this.matchEndTime - Date.now()) / 1000;
            ui.updateTimer(secondsLeft);
            if (!this.gameOverTriggered && secondsLeft <= 0) {
                this.finishMatch();
            }
        }
        
        if (this.scoreboardVisibleUntil && Date.now() > this.scoreboardVisibleUntil) {
            ui.showScoreboard(false);
            this.scoreboardVisibleUntil = 0;
        }
        
        // Update local player
        if (this.localPlayer) {
            this.localPlayer.update(this.keys, this.mouse, this.config, map);
            this.updateCamera();
            
            // Sync player state with peers
            network.broadcastPlayerState(this.localPlayer.getSyncData());
        }
        
        // Update other players (positions interpolated from network data)
        this.players.forEach(player => {
            if (!player.isLocal) {
                player.interpolate();
            }
        });
        
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            
            // Check collision with players
            this.players.forEach(player => {
                if (bullet.ownerId !== player.id && physics.checkCollision(bullet, player)) {
                    player.takeDamage(bullet.damage, bullet.ownerId);
                    this.createHitParticles(bullet.x, bullet.y);
                    this.bullets.splice(i, 1);
                    
                    // Broadcast damage event
                    network.broadcastDamage(player.id, bullet.damage, bullet.ownerId);
                    
                    // Check if player died
                    if (player.health <= 0) {
                        this.handlePlayerDeath(player, bullet.ownerId);
                    }
                }
            });
            
            // Check collision with map
            if (map.checkCollision(bullet.x, bullet.y)) {
                this.createHitParticles(bullet.x, bullet.y);
                this.bullets.splice(i, 1);
            }
            
            // Remove bullets that are out of bounds
            if (bullet.isOutOfBounds(map.width, map.height)) {
                this.bullets.splice(i, 1);
            }
        };
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].isDead) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Render game objects
     */
    render() {
        // Save context and apply camera transform
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw map
        map.render(this.ctx);
        
        // Draw players
        this.players.forEach(player => {
            player.render(this.ctx, this.camera);
        });
        
        // Draw bullets
        this.bullets.forEach(bullet => {
            bullet.render(this.ctx);
        });
        
        // Draw particles
        this.particles.forEach(particle => {
            particle.render(this.ctx);
        });
        
        this.ctx.restore();
        
        // Draw HUD (not affected by camera)
        this.renderHUD();
    }
    
    /**
     * Render Heads-Up Display
     */
    renderHUD() {
        // Health and jetpack bars are handled by UI class
        if (this.localPlayer) {
            ui.updateHealth(this.localPlayer.health);
            ui.updateJetpack(this.localPlayer.jetpackFuel);
            ui.updateWeapon(this.localPlayer.weapon);
        }
        
        // Draw player names and health above players
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        this.players.forEach(player => {
            const screenX = player.x;
            const screenY = player.y - 40;
            
            // Name tag
            this.ctx.fillStyle = player.isLocal ? '#ff6b35' : '#ffffff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, screenX, screenY);
            
            // Health bar background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(screenX - 25, screenY + 5, 50, 6);
            
            // Health bar fill
            this.ctx.fillStyle = player.health > 50 ? '#00ff00' : player.health > 25 ? '#ffff00' : '#ff0000';
            this.ctx.fillRect(screenX - 25, screenY + 5, 50 * (player.health / 100), 6);
        });
        
        this.ctx.restore();
    }
    
    /**
     * Create particle effect for hits
     */
    createHitParticles(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push(new Particle(
                x, y,
                Math.random() * 4 - 2,
                Math.random() * 4 - 2,
                '#ff6b35',
                30
            ));
        }
    }
    
    /**
     * Handle player death
     */
    handlePlayerDeath(player, killerId) {
        ui.showNotification(`${this.players.get(killerId)?.name || 'Someone'} eliminated ${player.name}`, 'kill-notification');
        
        if (player.isLocal) {
            // Local player takes a short respawn break; Player.die will handle respawn
            ui.showNotification('You were eliminated! Respawning in 3s...', 'leave-notification');
        } else {
            // Remote player died - they'll handle their own respawn
        }
        
        this.showScoreboardFor();
    }
    
    /**
     * Add bullet to game (called by Player class)
     */
    addBullet(bullet) {
        this.bullets.push(bullet);
        network.broadcastBullet(bullet);
    }
    
    /**
     * Handle network bullet
     */
    handleNetworkBullet(bulletData) {
        // Don't add bullets that we already created locally
        if (bulletData.ownerId !== network.getLocalPlayerId()) {
            const bullet = new Bullet(
                bulletData.x,
                bulletData.y,
                bulletData.vx,
                bulletData.vy,
                bulletData.ownerId,
                bulletData.weaponType
            );
            this.bullets.push(bullet);
        }
    }
    
    /**
     * Handle network damage
     */
    handleNetworkDamage(playerId, damage, attackerId) {
        const player = this.players.get(playerId);
        if (player && !player.isLocal) {
            player.takeDamage(damage, attackerId);
            if (player.health <= 0) {
                this.handlePlayerDeath(player, attackerId);
            }
        }
    }

    /**
     * Show scoreboard overlay for a short period
     */
    showScoreboardFor(duration = 4000) {
        this.refreshScoreboard();
        ui.showScoreboard(true);
        this.scoreboardVisibleUntil = Date.now() + duration;
    }

    /**
     * Recompute scoreboard ordering
     */
    refreshScoreboard() {
        const sorted = this.getSortedPlayers();
        ui.updateScoreboard(sorted);
    }

    /**
     * Return players sorted by kills then deaths
     */
    getSortedPlayers() {
        return Array.from(this.players.values())
            .sort((a, b) => {
                if (b.kills === a.kills) {
                    return a.deaths - b.deaths;
                }
                return b.kills - a.kills;
            })
            .map(player => ({
                id: player.id,
                name: player.name,
                kills: player.kills,
                deaths: player.deaths
            }));
    }

    /**
     * Finish the current match and show winner
     */
    finishMatch() {
        if (this.gameOverTriggered) return;
        this.gameOverTriggered = true;
        const sorted = this.getSortedPlayers();
        const winner = sorted[0];
        ui.updateScoreboard(sorted);
        ui.showScoreboard(true);
        this.endGame(winner);
    }

    /**
     * Detect if touch controls should be enabled by default
     */
    detectTouchPreference() {
        return ('ontouchstart' in window) ||
            (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0) ||
            window.matchMedia('(pointer: coarse)').matches;
    }

    /**
     * Initialize mobile on-screen controls
     */
    setupMobileControls() {
        this.mobileControls = document.getElementById('mobileControls');
        if (!this.mobileControls) return;

        this.mobileButtons = {
            left: document.getElementById('mobileLeft'),
            right: document.getElementById('mobileRight'),
            jetpack: document.getElementById('mobileJetpack'),
            shoot: document.getElementById('mobileShoot')
        };

        this.bindMobileButton(this.mobileButtons.left, 'KeyA');
        this.bindMobileButton(this.mobileButtons.right, 'KeyD');
        this.bindMobileButton(this.mobileButtons.jetpack, 'Space');
        this.bindShootButton(this.mobileButtons.shoot);

        this.mobileControlsReady = true;
        this.setMobileControlsActive(this.autoMobilePreferred);
    }

    bindMobileButton(button, key) {
        if (!button) return;

        const press = (e) => {
            e.preventDefault();
            this.keys[key] = true;
            button.classList.add('active');
        };

        const release = (e) => {
            if (e) e.preventDefault();
            this.keys[key] = false;
            button.classList.remove('active');
        };

        ['touchstart', 'mousedown'].forEach(evt => button.addEventListener(evt, press));
        ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(evt => button.addEventListener(evt, release));
    }

    bindShootButton(button) {
        if (!button) return;

        const start = (e) => {
            e.preventDefault();
            this.tryMobileShoot();
            if (this.mobileShootInterval) clearInterval(this.mobileShootInterval);
            this.mobileShootInterval = setInterval(() => this.tryMobileShoot(), 140);
            button.classList.add('active');
        };

        const stop = (e) => {
            if (e) e.preventDefault();
            if (this.mobileShootInterval) {
                clearInterval(this.mobileShootInterval);
                this.mobileShootInterval = null;
            }
            button.classList.remove('active');
        };

        ['touchstart', 'mousedown'].forEach(evt => button.addEventListener(evt, start));
        ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(evt => button.addEventListener(evt, stop));
    }

    /**
     * Enable or disable the on-screen controls
     */
    setMobileControlsActive(isEnabled) {
        if (!this.mobileControls || !this.mobileControlsReady) return;

        this.mobileControlsEnabled = isEnabled;
        this.mobileControls.classList.toggle('hidden', !isEnabled);

        if (!isEnabled) {
            // Release held keys and stop auto fire
            ['KeyA', 'KeyD', 'Space'].forEach(code => this.keys[code] = false);
            if (this.mobileShootInterval) {
                clearInterval(this.mobileShootInterval);
                this.mobileShootInterval = null;
            }
        }

        ui.updateMobileToggle(isEnabled);
    }

    /**
     * Toggle mobile controls manually from UI
     */
    toggleMobileControls(forceState) {
        const nextState = typeof forceState === 'boolean' ? forceState : !this.mobileControlsEnabled;
        if (!this.mobileControlsReady) {
            this.autoMobilePreferred = nextState;
            this.setupMobileControls();
        } else {
            this.setMobileControlsActive(nextState);
        }
    }

    /**
     * Attempt to shoot using the last known aim direction
     */
    tryMobileShoot() {
        if (this.gameState !== 'playing' || !this.localPlayer) {
            return;
        }

        const aimX = this.mouse.x || (this.localPlayer.x + this.localPlayer.facing * 150);
        const aimY = this.mouse.y || this.localPlayer.y;
        this.localPlayer.shoot(aimX, aimY);
    }
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new Game();
});