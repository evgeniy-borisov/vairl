/*
 * Flocking Animation - Based on "The Nature of Code" by Daniel Shiffman
 * Original code: https://github.com/nature-of-code/noc-examples-p5.js
 * 
 * The Nature of Code examples are licensed under GNU LGPL v2.1 or later
 * https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * 
 * Copyright (c) Daniel Shiffman
 * Adapted for VAIRL website 2026
 */

let flock;

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('fish-canvas');
    
    flock = new Flock();
    // Add initial set of boids (fish) into the system
    for (let i = 0; i < 50; i++) {
        let b = new Boid(random(width), random(height));
        flock.addBoid(b);
    }
}

function draw() {
    clear(); // Transparent background
    flock.run();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

// Flock object
// Does very little, simply manages the array of all the boids
class Flock {
    constructor() {
        this.boids = [];
    }
    
    run() {
        for (let boid of this.boids) {
            boid.run(this.boids);
        }
    }
    
    addBoid(b) {
        this.boids.push(b);
    }
}

// Boid class
// Methods for Separation, Cohesion, Alignment added
class Boid {
    constructor(x, y) {
        this.acceleration = createVector(0, 0);
        this.velocity = createVector(random(-1, 1), random(-1, 1));
        this.position = createVector(x, y);
        this.r = 3.0;
        this.maxspeed = 2;    // Maximum speed
        this.maxforce = 0.05; // Maximum steering force
        this.size = random(15, 30);
        this.opacity = random(60, 120);
        
        // Color: mostly gray, occasionally red
        if (random(1) < 0.05) {
            this.color = color(220, 100, 100, this.opacity);
        } else {
            this.color = color(180, 180, 180, this.opacity);
        }
    }
    
    run(boids) {
        this.flock(boids);
        this.update();
        this.borders();
        this.render();
    }
    
    applyForce(force) {
        this.acceleration.add(force);
    }
    
    // Accumulate a new acceleration each time based on three rules
    flock(boids) {
        let sep = this.separate(boids);   // Separation
        let ali = this.align(boids);      // Alignment
        let coh = this.cohesion(boids);   // Cohesion
        
        // Arbitrarily weight these forces
        sep.mult(1.5);
        ali.mult(1.0);
        coh.mult(1.0);
        
        // Add the force vectors to acceleration
        this.applyForce(sep);
        this.applyForce(ali);
        this.applyForce(coh);
    }
    
    // Method to update position
    update() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxspeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0);
    }
    
    // A method that calculates and applies a steering force towards a target
    seek(target) {
        let desired = p5.Vector.sub(target, this.position);
        desired.normalize();
        desired.mult(this.maxspeed);
        
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxforce);
        return steer;
    }
    
    render() {
        let theta = this.velocity.heading() + radians(90);
        
        push();
        translate(this.position.x, this.position.y);
        rotate(theta);
        
        stroke(this.color);
        strokeWeight(1.5);
        noFill();
        
        // Draw simple triangle (airplane/rocket shape)
        triangle(
            0, -this.size * 0.5,           // Nose (top)
            -this.size * 0.3, this.size * 0.5,  // Left wing
            this.size * 0.3, this.size * 0.5    // Right wing
        );
        
        pop();
    }
    
    // Wraparound
    borders() {
        if (this.position.x < -this.r) this.position.x = width + this.r;
        if (this.position.y < -this.r) this.position.y = height + this.r;
        if (this.position.x > width + this.r) this.position.x = -this.r;
        if (this.position.y > height + this.r) this.position.y = -this.r;
    }
    
    // Separation - steer to avoid crowding local flockmates
    separate(boids) {
        let desiredseparation = 25.0;
        let steer = createVector(0, 0);
        let count = 0;
        
        for (let other of boids) {
            let d = p5.Vector.dist(this.position, other.position);
            if ((d > 0) && (d < desiredseparation)) {
                let diff = p5.Vector.sub(this.position, other.position);
                diff.normalize();
                diff.div(d);
                steer.add(diff);
                count++;
            }
        }
        
        if (count > 0) {
            steer.div(count);
        }
        
        if (steer.mag() > 0) {
            steer.normalize();
            steer.mult(this.maxspeed);
            steer.sub(this.velocity);
            steer.limit(this.maxforce);
        }
        return steer;
    }
    
    // Alignment - steer towards the average heading of local flockmates
    align(boids) {
        let neighbordist = 50;
        let sum = createVector(0, 0);
        let count = 0;
        
        for (let other of boids) {
            let d = p5.Vector.dist(this.position, other.position);
            if ((d > 0) && (d < neighbordist)) {
                sum.add(other.velocity);
                count++;
            }
        }
        
        if (count > 0) {
            sum.div(count);
            sum.normalize();
            sum.mult(this.maxspeed);
            let steer = p5.Vector.sub(sum, this.velocity);
            steer.limit(this.maxforce);
            return steer;
        } else {
            return createVector(0, 0);
        }
    }
    
    // Cohesion - steer to move toward the average position of local flockmates
    cohesion(boids) {
        let neighbordist = 50;
        let sum = createVector(0, 0);
        let count = 0;
        
        for (let other of boids) {
            let d = p5.Vector.dist(this.position, other.position);
            if ((d > 0) && (d < neighbordist)) {
                sum.add(other.position);
                count++;
            }
        }
        
        if (count > 0) {
            sum.div(count);
            return this.seek(sum);
        } else {
            return createVector(0, 0);
        }
    }
}
