/**
 * Game Map and Environment System with multiple layouts
 */

class GameMap {
    constructor() {
        const meta = window.GAME_META || {};
        this.width = meta.dimensions?.width || 2000;
        this.height = meta.dimensions?.height || 1200;
        this.maps = this.loadDefinitions(meta.maps);
        this.platforms = [];
        this.spawnPoints = [];
        this.currentTheme = {
            background: '#1a1a2e',
            ground: '#4a4e69',
            platform: '#22223b',
            accent: '#ff6b35'
        };
        this.currentMapId = this.maps[0]?.id || 'ember';
        this.loadMap(this.currentMapId);
    }
    
    loadDefinitions(mapDefs) {
        if (Array.isArray(mapDefs) && mapDefs.length) {
            return mapDefs;
        }
        
        // Fallback map definition
        return [{
            id: 'ember',
            name: 'Ember Arena',
            theme: {
                background: '#1a1a2e',
                ground: '#4a4e69',
                platform: '#22223b',
                accent: '#ff6b35'
            },
            platforms: [
                { x: 0, y: this.height - 100, width: this.width, height: 100, type: 'ground' },
                { x: this.width / 2 - 150, y: this.height - 300, width: 300, height: 20, type: 'platform' }
            ],
            spawnPoints: [
                { x: this.width / 2, y: this.height - 150 }
            ]
        }];
    }
    
    /**
     * Load a specific map layout
     */
    loadMap(mapId) {
        const definition = this.maps.find(map => map.id === mapId) || this.maps[0];
        if (!definition) return;
        
        this.platforms = definition.platforms.map(platform => ({ ...platform }));
        this.spawnPoints = definition.spawnPoints.map(point => ({ ...point }));
        this.currentTheme = definition.theme || this.currentTheme;
        this.currentMapId = definition.id;
    }
    
    /**
     * Get random spawn point
     */
    getRandomSpawnPoint() {
        const randomIndex = Math.floor(Math.random() * this.spawnPoints.length);
        return this.spawnPoints[randomIndex];
    }
    
    /**
     * Check collision at position
     */
    checkCollision(x, y, radius = 0) {
        for (const platform of this.platforms) {
            if (this.pointInPlatform(x, y, platform, radius)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Check if point is inside platform with optional radius
     */
    pointInPlatform(x, y, platform, radius = 0) {
        return x + radius > platform.x &&
               x - radius < platform.x + platform.width &&
               y + radius > platform.y &&
               y - radius < platform.y + platform.height;
    }
    
    /**
     * Get platform at position
     */
    getPlatformAt(x, y) {
        for (const platform of this.platforms) {
            if (this.pointInPlatform(x, y, platform)) {
                return platform;
            }
        }
        return null;
    }
    
    /**
     * Render map
     */
    render(ctx) {
        // Draw background
        ctx.fillStyle = this.currentTheme.background || '#2d3047';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw platforms
        this.platforms.forEach(platform => {
            ctx.fillStyle = this.getPlatformColor(platform.type);
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Add some texture
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 2;
            ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        });
    }
    
    /**
     * Get color for platform type
     */
    getPlatformColor(type) {
        switch (type) {
            case 'ground': return this.currentTheme.ground || '#4a4e69';
            case 'platform': return this.currentTheme.platform || '#22223b';
            case 'wall':
            case 'ceiling':
                return '#1b1b2f';
            default: return this.currentTheme.platform || '#333333';
        }
    }
    
    /**
     * Get map bounds
     */
    getBounds() {
        return {
            x: 0,
            y: 0,
            width: this.width,
            height: this.height
        };
    }
}

// Initialize game map
const map = new GameMap();

