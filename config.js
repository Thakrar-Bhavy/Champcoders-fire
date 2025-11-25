/**
 * Global metadata for ChampCoder Fire
 * Defines avatars, maps, and shared visual themes
 */

(function() {
    const WIDTH = 2000;
    const HEIGHT = 1200;
    
    const createPlatforms = (segments) => segments.map(segment => ({
        ...segment
    }));
    
    const MAPS = [
        {
            id: 'ember',
            name: 'Ember Arena',
            theme: {
                background: '#1a1a2e',
                ground: '#4a4e69',
                platform: '#22223b',
                accent: '#ff6b35'
            },
            platforms: createPlatforms([
                { x: 0, y: HEIGHT - 100, width: WIDTH, height: 100, type: 'ground' },
                { x: WIDTH / 2 - 150, y: HEIGHT - 300, width: 300, height: 20, type: 'platform' },
                { x: 200, y: HEIGHT - 250, width: 200, height: 20, type: 'platform' },
                { x: 100, y: HEIGHT - 400, width: 150, height: 20, type: 'platform' },
                { x: WIDTH - 400, y: HEIGHT - 250, width: 200, height: 20, type: 'platform' },
                { x: WIDTH - 250, y: HEIGHT - 400, width: 150, height: 20, type: 'platform' },
                { x: WIDTH / 2 - 100, y: HEIGHT - 600, width: 200, height: 20, type: 'platform' },
                { x: 0, y: 0, width: 50, height: HEIGHT, type: 'wall' },
                { x: WIDTH - 50, y: 0, width: 50, height: HEIGHT, type: 'wall' },
                { x: 0, y: 0, width: WIDTH, height: 50, type: 'ceiling' }
            ]),
            spawnPoints: [
                { x: 100, y: HEIGHT - 150 },
                { x: WIDTH - 100, y: HEIGHT - 150 },
                { x: WIDTH / 2, y: HEIGHT - 150 },
                { x: 200, y: HEIGHT - 450 },
                { x: WIDTH - 200, y: HEIGHT - 450 }
            ]
        },
        {
            id: 'frost',
            name: 'Frostbite Ridge',
            theme: {
                background: '#0f2027',
                ground: '#203a43',
                platform: '#2c5364',
                accent: '#8ef6ff'
            },
            platforms: createPlatforms([
                { x: 0, y: HEIGHT - 80, width: WIDTH, height: 80, type: 'ground' },
                { x: WIDTH / 2 - 100, y: HEIGHT - 260, width: 220, height: 20, type: 'platform' },
                { x: WIDTH / 2 - 400, y: HEIGHT - 360, width: 160, height: 20, type: 'platform' },
                { x: WIDTH / 2 + 250, y: HEIGHT - 360, width: 140, height: 20, type: 'platform' },
                { x: WIDTH / 2 - 50, y: HEIGHT - 520, width: 280, height: 20, type: 'platform' },
                { x: 50, y: HEIGHT - 250, width: 150, height: 20, type: 'platform' },
                { x: WIDTH - 200, y: HEIGHT - 250, width: 150, height: 20, type: 'platform' },
                { x: 0, y: 0, width: WIDTH, height: 50, type: 'ceiling' }
            ]),
            spawnPoints: [
                { x: 150, y: HEIGHT - 150 },
                { x: WIDTH - 150, y: HEIGHT - 150 },
                { x: WIDTH / 2 - 450, y: HEIGHT - 320 },
                { x: WIDTH / 2 + 450, y: HEIGHT - 320 },
                { x: WIDTH / 2, y: HEIGHT - 550 }
            ]
        },
        {
            id: 'vault',
            name: 'Neon Vault',
            theme: {
                background: '#090909',
                ground: '#161b33',
                platform: '#2d3250',
                accent: '#ff33a6'
            },
            platforms: createPlatforms([
                { x: 0, y: HEIGHT - 120, width: WIDTH, height: 120, type: 'ground' },
                { x: 150, y: HEIGHT - 320, width: 220, height: 20, type: 'platform' },
                { x: WIDTH - 370, y: HEIGHT - 320, width: 220, height: 20, type: 'platform' },
                { x: WIDTH / 2 - 250, y: HEIGHT - 450, width: 500, height: 20, type: 'platform' },
                { x: WIDTH / 2 - 80, y: HEIGHT - 700, width: 160, height: 20, type: 'platform' },
                { x: WIDTH / 2 - 30, y: HEIGHT - 900, width: 60, height: 20, type: 'platform' },
                { x: WIDTH / 2 - 600, y: HEIGHT - 500, width: 120, height: 20, type: 'platform' },
                { x: WIDTH / 2 + 480, y: HEIGHT - 500, width: 120, height: 20, type: 'platform' },
                { x: 0, y: 0, width: WIDTH, height: 50, type: 'ceiling' }
            ]),
            spawnPoints: [
                { x: 120, y: HEIGHT - 200 },
                { x: WIDTH - 120, y: HEIGHT - 200 },
                { x: WIDTH / 2 - 300, y: HEIGHT - 400 },
                { x: WIDTH / 2 + 300, y: HEIGHT - 400 },
                { x: WIDTH / 2, y: HEIGHT - 750 },
                { x: WIDTH / 2, y: HEIGHT - 1000 }
            ]
        }
    ];
    
    const AVATARS = [
        { id: 'flame', name: 'Flame Trooper', emoji: '🔥', gradient: 'linear-gradient(135deg, #ff7e5f, #feb47b)', primary: '#ff6b35', accent: '#ffe66d' },
        { id: 'bolt', name: 'Voltage', emoji: '⚡', gradient: 'linear-gradient(135deg, #f6d365, #fda085)', primary: '#f6d365', accent: '#ffb347' },
        { id: 'wave', name: 'Wave Rider', emoji: '🌊', gradient: 'linear-gradient(135deg, #36d1dc, #5b86e5)', primary: '#43cea2', accent: '#185a9d' },
        { id: 'skull', name: 'Shadow Skull', emoji: '💀', gradient: 'linear-gradient(135deg, #614385, #516395)', primary: '#8360c3', accent: '#2ebf91' },
        { id: 'bot', name: 'Cyber Bot', emoji: '🤖', gradient: 'linear-gradient(135deg, #36d1dc, #5b86e5)', primary: '#5b86e5', accent: '#b9fffc' },
        { id: 'ninja', name: 'Neon Ninja', emoji: '🥷', gradient: 'linear-gradient(135deg, #141e30, #243b55)', primary: '#243b55', accent: '#d4145a' }
    ];
    
    window.GAME_META = {
        dimensions: { width: WIDTH, height: HEIGHT },
        maps: MAPS,
        avatars: AVATARS
    };
})();

