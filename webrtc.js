/**
 * WebRTC P2P Connection Manager
 * Handles peer connections and data channels
 */

class WebRTCManager {
    constructor() {
        this.localPlayerId = this.generateId();
        this.peers = new Map();
        this.roomCode = null;
        this.isHost = false;
        this.signalChannel = this.createSignalChannel();
        this.pendingReconnects = new Set();
        this.playerProfile = {
            name: `Player${Math.floor(Math.random() * 1000)}`,
            avatarId: 'flame'
        };
        this.roomSettings = null;
        
        // WebRTC configuration
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }
    
    /**
     * Generate unique player ID
     */
    generateId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    
    /**
     * Generate room code
     */
    generateRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    /**
     * Get local player ID
     */
    getLocalPlayerId() {
        return this.localPlayerId;
    }
    
    /**
     * Create a new room as host
     */
    async createRoom(options = {}) {
        this.roomCode = this.generateRoomCode();
        this.isHost = true;
        this.playerProfile = {
            name: options.playerName || `Host${Math.floor(Math.random() * 1000)}`,
            avatarId: options.avatarId || 'flame'
        };
        this.roomSettings = {
            duration: options.duration || 300,
            mapId: options.mapId || 'ember',
            startTime: Date.now()
        };
        
        ui.showNotification(`Room created: ${this.roomCode}`, 'join-notification');
        ui.updateRoomCode(this.roomCode);
        try {
            await navigator.clipboard.writeText(this.roomCode);
            ui.showNotification('Room code copied to clipboard 👍', 'join-notification');
        } catch (err) {
            console.warn('Clipboard copy failed', err);
        }

        this.sendSignal('host-ready');
        game.startGame({
            duration: this.roomSettings.duration,
            mapId: this.roomSettings.mapId,
            startTime: this.roomSettings.startTime,
            profile: this.playerProfile
        });
    }
    
    /**
     * Join an existing room
     */
    async joinRoom(roomCode, options = {}) {
        this.roomCode = roomCode.toUpperCase();
        this.isHost = false;
        this.playerProfile = {
            name: options.playerName || `Agent${Math.floor(Math.random() * 1000)}`,
            avatarId: options.avatarId || 'bolt'
        };
        this.roomSettings = null;
        
        ui.showNotification(`Joining room: ${this.roomCode}`, 'join-notification');
        ui.updateRoomCode(this.roomCode);
        
        this.sendSignal('join-request');
    }
    
    /**
     * Start hosting a peer by sending an offer
     */
    async initiateOffer(peerId) {
        if (!this.roomCode) return;
        if (this.peers.has(peerId)) {
            this.peers.get(peerId)?.connection?.close();
            this.peers.delete(peerId);
        }
        
        const peerConnection = this.createPeerConnection(peerId);
        const dataChannel = peerConnection.createDataChannel('gameData', { ordered: true });
        this.setupDataChannel(dataChannel, peerId);
        
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            this.sendSignal('offer', {
                toId: peerId,
                offer: {
                    type: offer.type,
                    sdp: offer.sdp
                }
            });
        } catch (error) {
            console.error('Failed to create offer:', error);
        }
    }
    
    /**
     * Handle remote offer (joiner side)
     */
    async handleRemoteOffer(peerId, offer) {
        const peerConnection = this.createPeerConnection(peerId);
        peerConnection.ondatachannel = (event) => {
            this.setupDataChannel(event.channel, peerId);
        };
        
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            this.sendSignal('answer', {
                toId: peerId,
                answer: {
                    type: answer.type,
                    sdp: answer.sdp
                }
            });
        } catch (error) {
            console.error('Failed to handle offer:', error);
        }
    }
    
    /**
     * Handle remote answer (host side)
     */
    async handleRemoteAnswer(peerId, answer) {
        const peerData = this.peers.get(peerId);
        if (!peerData) return;
        
        try {
            await peerData.connection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error('Failed to handle answer:', error);
        }
    }
    
    /**
     * Create signaling channel (BroadcastChannel fallback to storage events)
     */
    createSignalChannel() {
        if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('champcoder-fire-signal');
            channel.onmessage = (event) => this.handleSignal(event.data);
            return channel;
        }
        
        window.addEventListener('storage', (event) => {
            if (event.key !== 'champcoder-fire-signal' || !event.newValue) return;
            const message = JSON.parse(event.newValue);
            if (message.timestamp <= Date.now() - 1000) return;
            this.handleSignal(message.payload);
        });
        
        return {
            postMessage: (payload) => {
                localStorage.setItem('champcoder-fire-signal', JSON.stringify({
                    timestamp: Date.now(),
                    payload
                }));
            },
            close: () => {}
        };
    }
    
    /**
     * Handle signaling messages
     */
    handleSignal(message) {
        if (!message || message.fromId === this.localPlayerId) return;
        if (!message.roomCode || message.roomCode !== this.roomCode) return;
        
        switch (message.type) {
            case 'host-ready':
                if (!this.isHost) {
                    ui.showNotification('Host is ready. Establishing secure link...', 'join-notification');
                }
                break;
            
            case 'join-request':
                if (this.isHost) {
                    this.initiateOffer(message.fromId);
                }
                break;
            
            case 'offer':
                if (message.toId === this.localPlayerId) {
                    this.handleRemoteOffer(message.fromId, message.offer);
                }
                break;
            
            case 'answer':
                if (message.toId === this.localPlayerId) {
                    this.handleRemoteAnswer(message.fromId, message.answer);
                }
                break;
            
            case 'ice-candidate':
                if (message.toId === this.localPlayerId) {
                    this.handleRemoteCandidate(message.fromId, message.candidate);
                }
                break;
            
            case 'leave-room':
                if (this.isHost && message.fromId !== this.localPlayerId) {
                    this.removePeer(message.fromId);
                }
                break;
        }
    }
    
    /**
     * Send signaling payload
     */
    sendSignal(type, extra = {}) {
        if (!this.roomCode || !this.signalChannel) return;
        
        this.signalChannel.postMessage({
            type,
            roomCode: this.roomCode,
            fromId: this.localPlayerId,
            ...extra
        });
    }
    
    /**
     * Create PeerConnection with ICE handlers
     */
    createPeerConnection(peerId) {
        const peerConnection = new RTCPeerConnection(this.config);
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal('ice-candidate', {
                    toId: peerId,
                    candidate: event.candidate.toJSON()
                });
            }
        };
        
        peerConnection.onconnectionstatechange = () => {
            if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
                ui.showNotification('Peer disconnected', 'leave-notification');
                this.removePeer(peerId);
            }
        };

        // Attach remote audio tracks
        peerConnection.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                audio?.addRemoteStream(peerId, event.streams[0]);
            }
        };
        
        // Attach local microphone if available
        this.attachLocalAudio(peerConnection);
        
        this.peers.set(peerId, {
            connection: peerConnection,
            dataChannel: null
        });
        
        return peerConnection;
    }
    
    /**
     * Attach local microphone stream to a peer connection
     */
    attachLocalAudio(peerConnection) {
        if (!peerConnection || !audio?.getLocalAudioStream) return;
        const stream = audio.getLocalAudioStream();
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                try {
                    peerConnection.addTrack(track, stream);
                } catch (err) {
                    console.warn('Failed to add local audio track', err);
                }
            });
            return;
        }
        
        // Wait for microphone permission if not ready yet
        const handler = () => {
            document.removeEventListener('champcoder:audio-ready', handler);
            this.attachLocalAudio(peerConnection);
        };
        document.addEventListener('champcoder:audio-ready', handler, { once: true });
    }
    
    /**
     * Handle remote ICE candidate
     */
    async handleRemoteCandidate(peerId, candidate) {
        const peerData = this.peers.get(peerId);
        if (!peerData || !candidate) return;
        
        try {
            await peerData.connection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Failed to add ICE candidate:', error);
        }
    }
    
    /**
     * Retry peer connection (used after network hiccups)
     */
    retryPeerConnection(peerId) {
        if (!this.roomCode) return;
        
        if (this.isHost) {
            this.initiateOffer(peerId);
        } else {
            this.sendSignal('join-request');
        }
    }
    
    /**
     * Remove peer and clean up
     */
    removePeer(peerId) {
        const peerData = this.peers.get(peerId);
        if (peerData) {
            peerData.dataChannel?.close();
            peerData.connection?.close();
            this.peers.delete(peerId);
            game?.removePlayer(peerId);
            audio?.removeRemoteStream(peerId);
        }
    }
    
    /**
     * Set up data channel event handlers
     */
    setupDataChannel(dataChannel, peerId) {
        const peerData = this.peers.get(peerId);
        if (peerData) {
            peerData.dataChannel = dataChannel;
        }
        
        dataChannel.onopen = () => {
            console.log(`Data channel connected to ${peerId}`);
            ui.showNotification('Player connected!', 'join-notification');
            
            if (this.isHost && this.roomSettings) {
                this.sendMatchSettings(peerId);
            }
            
            // Request sync so both sides share their player data
            this.sendToPeer(peerId, { type: 'requestPlayerSync' });
            this.announceLocalPlayer(peerId);
        };
        
        dataChannel.onmessage = (event) => {
            this.handleMessage(JSON.parse(event.data), peerId);
        };
        
        dataChannel.onclose = () => {
            console.log(`Data channel closed with ${peerId}`);
            this.peers.delete(peerId);
            game?.removePlayer(peerId);
        };
        
        dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
        };
    }
    
    /**
     * Handle incoming messages
     */
    handleMessage(message, peerId) {
        switch (message.type) {
            case 'playerJoin':
                game.addPlayer(message.player);
                break;
                
            case 'playerState':
                const targetId = message.state?.id;
                if (!targetId) return;
                const player = game.players.get(targetId);
                if (player && !player.isLocal) {
                    player.networkUpdate(message.state);
                }
                break;
                
            case 'bullet':
                game.handleNetworkBullet(message.bullet);
                break;
                
            case 'damage':
                game.handleNetworkDamage(message.playerId, message.damage, message.attackerId);
                break;
                
            case 'chat':
                ui.showChatMessage(message.sender, message.text);
                break;
            
            case 'matchSettings':
                this.applyMatchSettings(message.settings);
                break;
            
            case 'requestPlayerSync':
                this.announceLocalPlayer(peerId);
                break;
        }
    }
    
    /**
     * Send message to specific peer
     */
    sendToPeer(peerId, message) {
        const peerData = this.peers.get(peerId);
        if (peerData && peerData.dataChannel && peerData.dataChannel.readyState === 'open') {
            peerData.dataChannel.send(JSON.stringify(message));
        }
    }
    
    /**
     * Broadcast message to all peers
     */
    broadcast(message) {
        this.peers.forEach((peerData, peerId) => {
            this.sendToPeer(peerId, message);
        });
    }
    
    /**
     * Broadcast player state to all peers
     */
    broadcastPlayerState(playerState) {
        this.broadcast({
            type: 'playerState',
            state: playerState
        });
    }
    
    /**
     * Broadcast bullet to all peers
     */
    broadcastBullet(bullet) {
        this.broadcast({
            type: 'bullet',
            bullet: bullet.getSyncData()
        });
    }
    
    /**
     * Broadcast damage event to all peers
     */
    broadcastDamage(playerId, damage, attackerId) {
        this.broadcast({
            type: 'damage',
            playerId: playerId,
            damage: damage,
            attackerId: attackerId
        });
    }
    
    /**
     * Broadcast current match settings
     */
    sendMatchSettings(peerId) {
        if (!this.roomSettings) return;
        const payload = {
            type: 'matchSettings',
            settings: this.roomSettings
        };
        if (peerId) {
            this.sendToPeer(peerId, payload);
        } else {
            this.broadcast(payload);
        }
    }
    
    /**
     * Apply incoming match settings (joiners)
     */
    applyMatchSettings(settings) {
        if (!settings) return;
        this.roomSettings = settings;
        if (game && (!game.localPlayer || game.gameState !== 'playing')) {
            game.startGame({
                duration: settings.duration,
                mapId: settings.mapId,
                startTime: settings.startTime || Date.now(),
                profile: this.playerProfile
            });
        } else if (game) {
            map.loadMap(settings.mapId);
        }
    }
    
    /**
     * Share local player snapshot with peers
     */
    announceLocalPlayer(targetPeerId = null) {
        if (!game || !game.localPlayer) return;
        const payload = {
            type: 'playerJoin',
            player: game.localPlayer.getSyncData()
        };
        if (targetPeerId) {
            this.sendToPeer(targetPeerId, payload);
        } else {
            this.broadcast(payload);
        }
    }
    
    /**
     * Get stored local profile
     */
    getLocalProfile() {
        return this.playerProfile;
    }
    
    /**
     * Get peer count
     */
    getPeerCount() {
        return this.peers.size;
    }
    
    /**
     * Close all connections
     */
    disconnect() {
        this.peers.forEach((peerData, peerId) => {
            if (peerData.dataChannel) {
                peerData.dataChannel.close();
            }
            if (peerData.connection) {
                peerData.connection.close();
            }
        });
        this.peers.clear();
        this.sendSignal('leave-room');
        this.roomCode = null;
        this.isHost = false;
        this.roomSettings = null;
    }
}

// Initialize WebRTC manager
const network = new WebRTCManager();