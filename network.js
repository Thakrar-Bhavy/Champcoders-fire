/**
 * Network Message Handler
 * Manages game state synchronization over WebRTC
 */

class NetworkManager {
    constructor() {
        this.messageQueue = [];
        this.lastPingTime = 0;
        this.ping = 0;
        this.packetLoss = 0;
        this.totalSent = 0;
        this.totalReceived = 0;
        
        this.startPingLoop();
    }
    
    /**
     * Start periodic ping to measure latency
     */
    startPingLoop() {
        setInterval(() => {
            this.sendPing();
        }, 1000);
    }
    
    /**
     * Send ping to all peers
     */
    sendPing() {
        this.lastPingTime = Date.now();
        network.broadcast({
            type: 'ping',
            timestamp: this.lastPingTime
        });
    }
    
    /**
     * Handle incoming ping
     */
    handlePing(timestamp, peerId) {
        // Respond with pong
        network.sendToPeer(peerId, {
            type: 'pong',
            timestamp: timestamp
        });
    }
    
    /**
     * Handle incoming pong
     */
    handlePong(timestamp) {
        this.ping = Date.now() - timestamp;
        ui.updatePing(this.ping);
    }
    
    /**
     * Calculate packet loss
     */
    calculatePacketLoss() {
        // This would track sent/received packets over time
        // For simplicity, we'll use a placeholder
        this.packetLoss = Math.random() * 5; // 0-5% simulated packet loss
    }
    
    /**
     * Compress game state for network transmission
     */
    compressGameState(state) {
        // Simple compression by removing unnecessary precision
        return {
            x: Math.round(state.x),
            y: Math.round(state.y),
            vx: Math.round(state.vx * 10) / 10,
            vy: Math.round(state.vy * 10) / 10,
            h: state.health,
            f: state.jetpackFuel,
            w: state.weapon,
            d: state.isDead ? 1 : 0
        };
    }
    
    /**
     * Decompress game state
     */
    decompressGameState(compressedState) {
        return {
            x: compressedState.x,
            y: compressedState.y,
            vx: compressedState.vx,
            vy: compressedState.vy,
            health: compressedState.h,
            jetpackFuel: compressedState.f,
            weapon: compressedState.w,
            isDead: compressedState.d === 1
        };
    }
    
    /**
     * Validate incoming network data
     */
    validateNetworkData(data, peerId) {
        // Basic validation to prevent cheating
        if (!data || typeof data !== 'object') return false;
        
        // Validate player state
        if (data.type === 'playerState') {
            const state = data.state;
            if (!state || 
                typeof state.x !== 'number' || 
                typeof state.y !== 'number' ||
                state.x < 0 || state.x > map.width ||
                state.y < 0 || state.y > map.height) {
                return false;
            }
        }
        
        // Validate bullet data
        if (data.type === 'bullet') {
            const bullet = data.bullet;
            if (!bullet || 
                typeof bullet.vx !== 'number' ||
                Math.abs(bullet.vx) > 20 ||
                Math.abs(bullet.vy) > 20) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Handle network error
     */
    handleNetworkError(error, peerId) {
        console.error(`Network error with peer ${peerId}:`, error);
        
        // Try to reconnect if this was an important peer
        setTimeout(() => {
            network.retryPeerConnection(peerId);
        }, 2000);
    }
    
    /**
     * Get network statistics
     */
    getNetworkStats() {
        return {
            ping: this.ping,
            packetLoss: this.packetLoss,
            peers: network.getPeerCount(),
            totalSent: this.totalSent,
            totalReceived: this.totalReceived
        };
    }
    
    /**
     * Simulate network conditions (for testing)
     */
    simulateNetworkConditions(latency = 0, loss = 0) {
        // This would be used to test under different network conditions
        console.log(`Simulating network: ${latency}ms latency, ${loss}% packet loss`);
    }
}

// Initialize network manager
const networkManager = new NetworkManager();