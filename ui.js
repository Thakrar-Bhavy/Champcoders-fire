/**
 * User Interface Manager
 * Handles all UI screens and interactions
 */

class UIManager {
    constructor() {
        const META = window.GAME_META || {};
        this.mapOptions = Array.isArray(META.maps) && META.maps.length ? META.maps : [
            { id: 'ember', name: 'Ember Arena' }
        ];
        
        this.avatarOptions = Array.isArray(META.avatars) && META.avatars.length ? META.avatars : [
            { id: 'flame', emoji: '🔥', gradient: 'linear-gradient(135deg, #ff7e5f, #feb47b)' }
        ];
        
        this.selectedAvatars = {
            host: this.avatarOptions[0].id,
            join: this.avatarOptions[1].id
        };
        
        this.screens = {
            home: document.getElementById('homeScreen'),
            game: document.getElementById('gameScreen'),
            gameOver: document.getElementById('gameOverScreen')
        };
        
        this.elements = {
            createRoomBtn: document.getElementById('createRoomBtn'),
            hostNameInput: document.getElementById('hostNameInput'),
            matchDurationSelect: document.getElementById('matchDurationSelect'),
            mapSelect: document.getElementById('mapSelect'),
            hostAvatarPicker: document.getElementById('hostAvatarPicker'),
            joinNameInput: document.getElementById('joinNameInput'),
            roomCodeInput: document.getElementById('roomCodeInput'),
            joinAvatarPicker: document.getElementById('joinAvatarPicker'),
            joinRoomConfirm: document.getElementById('joinRoomConfirm'),
            roomCodeDisplay: document.getElementById('roomCodeDisplay'),
            playerCount: document.getElementById('playerCount'),
            voiceToggle: document.getElementById('voiceToggle'),
            mobileToggleBtn: document.getElementById('mobileToggleBtn'),
            pingIndicator: document.getElementById('pingIndicator'),
            matchTimer: document.getElementById('matchTimer'),
            healthFill: document.getElementById('healthFill'),
            healthText: document.getElementById('healthText'),
            jetpackFill: document.getElementById('jetpackFill'),
            jetpackText: document.getElementById('jetpackText'),
            weaponName: document.getElementById('weaponName'),
            ammoCount: document.getElementById('ammoCount'),
            gameOverTitle: document.getElementById('gameOverTitle'),
            winnerInfo: document.getElementById('winnerInfo'),
            finalKills: document.getElementById('finalKills'),
            finalDeaths: document.getElementById('finalDeaths'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            backToHomeBtn: document.getElementById('backToHomeBtn'),
            notification: document.getElementById('notification'),
            scoreboard: document.getElementById('scoreboardOverlay'),
            scoreboardList: document.getElementById('scoreboardList')
        };
        
        this.populateMapSelect();
        this.populateAvatars();
        this.initEventListeners();
    }
    
    /**
     * Initialize UI event listeners
     */
    initEventListeners() {
        // Home screen buttons
        this.elements.createRoomBtn.addEventListener('click', () => {
            const name = this.elements.hostNameInput.value.trim();
            if (!this.validateName(name)) {
                this.showNotification('Enter a username (3-16 chars).', 'kill-notification');
                return;
            }
            
            const duration = parseInt(this.elements.matchDurationSelect.value, 10) || 300;
            const mapId = this.elements.mapSelect.value || 'ember';
            const avatarId = this.selectedAvatars.host;
            
            network.createRoom({
                playerName: name,
                duration,
                mapId,
                avatarId
            });
        });
        
        this.elements.joinRoomConfirm.addEventListener('click', () => {
            const roomCode = this.elements.roomCodeInput.value.trim();
            const name = this.elements.joinNameInput.value.trim();
            if (!this.validateName(name)) {
                this.showNotification('Enter a username (3-16 chars).', 'kill-notification');
                return;
            }
            if (roomCode.length !== 6) {
                this.showNotification('Please enter a 6-character room code', 'kill-notification');
                return;
            }

            network.joinRoom(roomCode, {
                playerName: name,
                avatarId: this.selectedAvatars.join
            });
        });
        
        // Game over screen buttons
        this.elements.playAgainBtn.addEventListener('click', () => {
            this.showScreen('game');
            game.startGame();
        });
        
        this.elements.backToHomeBtn.addEventListener('click', () => {
            network.disconnect();
            this.showScreen('home');
        });
        
        // Voice toggle
        this.elements.voiceToggle.addEventListener('click', () => {
            audio.toggleMicrophone();
        });
        
        // Mobile controls toggle (visible in game header)
        this.elements.mobileToggleBtn.addEventListener('click', () => {
            game?.toggleMobileControls();
        });
        
        // Room code input formatting
        this.elements.roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });

        this.elements.roomCodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.elements.joinRoomConfirm.click();
            }
        });
    }
    
    /**
     * Show specific screen
     */
    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show requested screen
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }

        if (screenName === 'home') {
            this.elements.roomCodeInput.value = '';
            this.elements.joinNameInput.value = '';
            this.showScoreboard(false);
        }
    }
    
    /**
     * Update room code display
     */
    updateRoomCode(roomCode) {
        this.elements.roomCodeDisplay.textContent = roomCode;
    }
    
    /**
     * Update player count
     */
    updatePlayerCount(count) {
        this.elements.playerCount.textContent = `Players: ${count}`;
    }
    
    /**
     * Update voice button state
     */
    updateVoiceButton(isMuted) {
        this.elements.voiceToggle.textContent = isMuted ? '🎤 Mute' : '🎤 Live';
        this.elements.voiceToggle.style.background = isMuted ? 
            'rgba(255, 255, 255, 0.2)' : '#ff6b35';
    }

    /**
     * Update mobile toggle button
     */
    updateMobileToggle(isEnabled) {
        if (!this.elements.mobileToggleBtn) return;
        this.elements.mobileToggleBtn.textContent = isEnabled ? '📱 Mobile Buttons: ON' : '📱 Mobile Buttons: OFF';
        this.elements.mobileToggleBtn.classList.toggle('primary', isEnabled);
    }
    
    /**
     * Update ping display
     */
    updatePing(ping) {
        let color = '#00ff00'; // Good
        if (ping > 100) color = '#ffff00'; // Medium
        if (ping > 200) color = '#ff0000'; // Bad
        
        this.elements.pingIndicator.innerHTML = `Ping: <span style="color: ${color}">${Math.round(ping)}ms</span>`;
    }

    /**
     * Update match timer display
     */
    updateTimer(secondsLeft) {
        const clamped = Math.max(0, secondsLeft);
        const minutes = Math.floor(clamped / 60).toString().padStart(2, '0');
        const seconds = Math.floor(clamped % 60).toString().padStart(2, '0');
        this.elements.matchTimer.textContent = `${minutes}:${seconds}`;
    }
    
    /**
     * Update health bar
     */
    updateHealth(health) {
        const percentage = Math.max(0, health);
        this.elements.healthFill.style.width = `${percentage}%`;
        this.elements.healthText.textContent = Math.round(health);
        
        // Change color based on health
        if (health > 50) {
            this.elements.healthFill.style.background = 'linear-gradient(90deg, #00ff00, #00cc00)';
        } else if (health > 25) {
            this.elements.healthFill.style.background = 'linear-gradient(90deg, #ffff00, #ffcc00)';
        } else {
            this.elements.healthFill.style.background = 'linear-gradient(90deg, #ff0000, #cc0000)';
        }
    }
    
    /**
     * Update jetpack fuel bar
     */
    updateJetpack(fuel) {
        const percentage = Math.max(0, fuel);
        this.elements.jetpackFill.style.width = `${percentage}%`;
        this.elements.jetpackText.textContent = Math.round(fuel);
    }
    
    /**
     * Update weapon display
     */
    updateWeapon(weapon) {
        const weaponNames = {
            pistol: 'Pistol',
            rifle: 'Assault Rifle',
            shotgun: 'Shotgun'
        };
        
        const ammoCounts = {
            pistol: '∞',
            rifle: game?.localPlayer?.weapons.rifle.ammo || '30',
            shotgun: game?.localPlayer?.weapons.shotgun.ammo || '8'
        };
        
        this.elements.weaponName.textContent = weaponNames[weapon] || 'Weapon';
        this.elements.ammoCount.textContent = ammoCounts[weapon] || '∞';
    }
    
    /**
     * Show game over screen
     */
    showGameOver(winner, localPlayer) {
        if (winner && winner.id === localPlayer.id) {
            this.elements.gameOverTitle.textContent = 'Victory!';
            this.elements.winnerInfo.textContent = 'You are the champion!';
        } else if (winner) {
            this.elements.gameOverTitle.textContent = 'Defeat';
            this.elements.winnerInfo.textContent = `${winner.name} wins!`;
        } else {
            this.elements.gameOverTitle.textContent = 'Game Over';
            this.elements.winnerInfo.textContent = '';
        }
        
        this.elements.finalKills.textContent = localPlayer.kills;
        this.elements.finalDeaths.textContent = localPlayer.deaths;
        
        this.showScreen('gameOver');
    }
    
    /**
     * Show notification message
     */
    showNotification(message, type = '') {
        const notification = this.elements.notification;
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
    
    /**
     * Show chat message
     */
    showChatMessage(sender, message) {
        // Simple chat notification
        this.showNotification(`${sender}: ${message}`);
    }
    
    /**
     * Show connection status
     */
    showConnectionStatus(isConnected) {
        if (isConnected) {
            this.showNotification('Connected to peers', 'join-notification');
        } else {
            this.showNotification('Connection lost', 'leave-notification');
        }
    }
    
    /**
     * Show loading indicator
     */
    showLoading(message = 'Loading...') {
        // Could implement a proper loading screen
        console.log(message);
    }
    
    /**
     * Hide loading indicator
     */
    hideLoading() {
        console.log('Loading complete');
    }
    
    /**
     * Update game scoreboard
     */
    updateScoreboard(players) {
        if (!Array.isArray(players)) return;
        const list = this.elements.scoreboardList;
        list.innerHTML = '';
        
        players.forEach((player, index) => {
            const row = document.createElement('div');
            row.className = 'score-row';
            row.innerHTML = `<span>${index + 1}. ${player.name}</span><span>${player.kills}K / ${player.deaths}D</span>`;
            list.appendChild(row);
        });
    }

    /**
     * Toggle scoreboard visibility
     */
    showScoreboard(show) {
        this.elements.scoreboard.classList.toggle('hidden', !show);
    }

    /**
     * Populate map select options
     */
    populateMapSelect() {
        const select = this.elements.mapSelect;
        select.innerHTML = '';
        this.mapOptions.forEach(map => {
            const option = document.createElement('option');
            option.value = map.id;
            option.textContent = map.name;
            select.appendChild(option);
        });
    }

    /**
     * Populate avatar pickers
     */
    populateAvatars() {
        this.renderAvatarPicker(this.elements.hostAvatarPicker, 'host');
        this.renderAvatarPicker(this.elements.joinAvatarPicker, 'join');
    }

    renderAvatarPicker(container, target) {
        container.innerHTML = '';
        this.avatarOptions.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'avatar-option';
            button.style.background = option.gradient;
            button.dataset.avatar = option.id;
            button.innerHTML = `<span class="emoji">${option.emoji}</span>`;
            if (this.selectedAvatars[target] === option.id) {
                button.classList.add('selected');
            }
            
            button.addEventListener('click', () => {
                this.selectedAvatars[target] = option.id;
                Array.from(container.children).forEach(child => child.classList.remove('selected'));
                button.classList.add('selected');
            });
            
            container.appendChild(button);
        });
    }

    /**
     * Validate player name
     */
    validateName(name) {
        return name.length >= 3 && name.length <= 16;
    }
}

// Initialize UI manager
const ui = new UIManager();