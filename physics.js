/**
 * Physics and Collision Detection System
 */

class Physics {
    constructor() {}
    
    /**
     * Generic collision check between bullet/projectile and player rectangle
     */
    checkCollision(projectile, player) {
        if (!projectile || !player) return false;
        
        const playerRect = {
            x: player.x - player.width / 2,
            y: player.y - player.height / 2,
            width: player.width,
            height: player.height
        };
        
        if (projectile.radius !== undefined) {
            return this.checkCircleRectCollision(projectile, playerRect);
        }
        
        return this.checkRectRectCollision(projectile, playerRect);
    }
    
    /**
     * Check collision between two rectangles
     */
    checkRectRectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    /**
     * Check collision between circle and rectangle
     */
    checkCircleRectCollision(circle, rect) {
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
        
        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        
        return (distanceX * distanceX + distanceY * distanceY) < (circle.radius * circle.radius);
    }
    
    /**
     * Check collision between two circles
     */
    checkCircleCollision(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (circle1.radius + circle2.radius);
    }
    
    /**
     * Check if point is inside rectangle
     */
    pointInRect(point, rect) {
        return point.x >= rect.x &&
               point.x <= rect.x + rect.width &&
               point.y >= rect.y &&
               point.y <= rect.y + rect.height;
    }
    
    /**
     * Get collision response between moving circle and static rectangle
     */
    getCircleRectCollisionResponse(circle, rect, velocity) {
        const response = {
            collision: false,
            normalX: 0,
            normalY: 0,
            penetration: 0
        };
        
        // Find closest point on rectangle to circle
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
        
        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        
        if (distanceSquared < circle.radius * circle.radius) {
            response.collision = true;
            const distance = Math.sqrt(distanceSquared);
            
            if (distance !== 0) {
                response.normalX = distanceX / distance;
                response.normalY = distanceY / distance;
                response.penetration = circle.radius - distance;
            } else {
                // Circles are exactly on top of each other
                response.normalX = 1;
                response.normalY = 0;
                response.penetration = circle.radius;
            }
        }
        
        return response;
    }
    
    /**
     * Apply impulse-based collision response
     */
    applyCollisionResponse(body1, body2, normalX, normalY, restitution = 0.5) {
        const relativeVelocityX = body2.vx - body1.vx;
        const relativeVelocityY = body2.vy - body1.vy;
        
        const velocityAlongNormal = relativeVelocityX * normalX + relativeVelocityY * normalY;
        
        // Don't resolve if objects are moving apart
        if (velocityAlongNormal > 0) return;
        
        const impulseScalar = -(1 + restitution) * velocityAlongNormal;
        impulseScalar /= body1.invMass + body2.invMass;
        
        const impulseX = impulseScalar * normalX;
        const impulseY = impulseScalar * normalY;
        
        body1.vx -= body1.invMass * impulseX;
        body1.vy -= body1.invMass * impulseY;
        body2.vx += body2.invMass * impulseX;
        body2.vy += body2.invMass * impulseY;
    }
    
    /**
     * Simple raycast against rectangle
     */
    raycastRect(startX, startY, endX, endY, rect) {
        const t1 = (rect.x - startX) / (endX - startX);
        const t2 = (rect.x + rect.width - startX) / (endX - startX);
        const t3 = (rect.y - startY) / (endY - startY);
        const t4 = (rect.y + rect.height - startY) / (endY - startY);
        
        const tMin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
        const tMax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
        
        if (tMax < 0 || tMin > tMax || tMin > 1) {
            return null;
        }
        
        const hitX = startX + tMin * (endX - startX);
        const hitY = startY + tMin * (endY - startY);
        
        return {
            x: hitX,
            y: hitY,
            distance: tMin * Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2)
        };
    }
    
    /**
     * Check if moving object will collide with map
     */
    predictMapCollision(x, y, vx, vy, radius, map) {
        const nextX = x + vx;
        const nextY = y + vy;
        
        // Check collision at predicted position
        return map.checkCollision(nextX, nextY, radius);
    }
}

// Global physics instance
const physics = new Physics();