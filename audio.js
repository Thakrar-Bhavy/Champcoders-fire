/**
 * WebRTC Audio Manager
 * Handles voice chat functionality
 */

class AudioManager {
    constructor() {
        this.localStream = null;
        this.remoteStreams = new Map();
        this.audioContext = null;
        this.isMuted = true;
        this.audioElements = new Map();
        
        this.init();
    }
    
    /**
     * Initialize audio system
     */
    async init() {
        try {
            // Create audio context for processing
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Request microphone permission
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            
            ui.updateVoiceButton(false);
            console.log('Microphone access granted');
            document.dispatchEvent(new CustomEvent('champcoder:audio-ready'));
            
        } catch (error) {
            console.error('Microphone access denied:', error);
            ui.updateVoiceButton(true);
            ui.showNotification('Microphone access denied', 'kill-notification');
        }
    }
    
    /**
     * Toggle microphone on/off
     */
    toggleMicrophone() {
        if (!this.localStream) {
            ui.showNotification('Microphone not available', 'kill-notification');
            return;
        }
        
        this.isMuted = !this.isMuted;
        
        // Enable/disable audio tracks
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = !this.isMuted;
        });
        
        ui.updateVoiceButton(this.isMuted);
        ui.showNotification(this.isMuted ? 'Microphone muted' : 'Microphone active', 'join-notification');
    }
    
    /**
     * Add remote audio stream
     */
    addRemoteStream(peerId, stream) {
        try {
            // Create audio element for remote stream
            const audioElement = new Audio();
            audioElement.srcObject = stream;
            audioElement.autoplay = true;
            audioElement.volume = 0.7; // Prevent loud surprises
            
            this.remoteStreams.set(peerId, stream);
            this.audioElements.set(peerId, audioElement);
            
            console.log(`Added audio stream for peer ${peerId}`);
            
        } catch (error) {
            console.error('Error adding remote audio stream:', error);
        }
    }
    
    /**
     * Remove remote audio stream
     */
    removeRemoteStream(peerId) {
        const audioElement = this.audioElements.get(peerId);
        if (audioElement) {
            audioElement.pause();
            audioElement.srcObject = null;
        }
        
        this.remoteStreams.delete(peerId);
        this.audioElements.delete(peerId);
    }
    
    /**
     * Get local audio stream for WebRTC
     */
    getLocalAudioStream() {
        return this.localStream;
    }
    
    /**
     * Clean up audio resources
     */
    cleanup() {
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        // Clean up remote streams
        this.audioElements.forEach((audioElement, peerId) => {
            audioElement.pause();
            audioElement.srcObject = null;
        });
        
        this.remoteStreams.clear();
        this.audioElements.clear();
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
    
    /**
     * Set volume for specific peer
     */
    setVolume(peerId, volume) {
        const audioElement = this.audioElements.get(peerId);
        if (audioElement) {
            audioElement.volume = Math.max(0, Math.min(1, volume));
        }
    }
    
    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        this.audioElements.forEach(audioElement => {
            audioElement.volume = Math.max(0, Math.min(1, volume));
        });
    }
    
    /**
     * Check if audio is working
     */
    isAudioWorking() {
        return this.localStream !== null;
    }
}

// Initialize audio manager
const audio = new AudioManager();