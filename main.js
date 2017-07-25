const THRESHOLD = 100;

class Vec2 {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    add(vec) {
        this.x += vec.x;
        this.y += vec.y;

        return this;
    }

    copy() {
        return new Vec2(this.x, this.y);
    }
}

Vec2.getRandom = (min, max) => {
    return new Vec2(
        Math.random() * (max - min) + min,
        Math.random() * (max - min) + min
    );
};

class World {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.canvasWidth = this.canvas.width = 400;
        this.canvasHeight = this.canvas.height = 500;

        this.objects = [];
        this.controllable = {};
        this.mouse = new Vec2(this.canvasWidth / 2, this.canvasHeight / 2);

        this.params = {
            gravity: new Vec2(0, -0.2)
        };

        this.tick = this.tick.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseWheel = this.handleMouseWheel.bind(this);

        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mousewheel', this.handleMouseWheel);
    }

    handleMouseMove(event) {
        this.mouse.x = event.offsetX;
        this.mouse.y = event.offsetY;
    }

    handleMouseWheel(event) {
        event.preventDefault();

        switch (true) {
            case event.shiftKey:
                this.controllable.scatter = Math.max(0, this.controllable.scatter - event.wheelDelta / 100);
                break;

            case event.altKey:
                this.controllable.particleSize = Math.max(0, this.controllable.particleSize - event.wheelDelta / 100);
                break;

            default:
                this.controllable.particleLife = Math.max(1, this.controllable.particleLife - event.wheelDelta / 10);
        }
    }

    addObject(object) {
        this.objects.push(object);
    }

    removeObject(index) {
        this.objects.splice(index, 1);
    }

    start() {
        this.tick();
    }

    tick() {
        this.update();
        this.draw();

        window.requestAnimationFrame(this.tick);
    }

    update() {
        this.objects.forEach((object, index) => {
            object.update(index);
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.ctx.globalAlpha = 1;

        this.objects.forEach(object => {
            object.draw();
        });
    }
}

class ParticleSystem {
    constructor(config) {
        this.particles = [];

        this.world = config.world;
        this.loc = config.loc || new Vec2();
        this.maxParticles = config.maxParticles || 300;
        this.particleLife = config.particleLife || 60;
        this.particleSize = config.particleSize || 24;
        this.creationRate = config.creationRate || 3;
        this.scatter = config.scatter || 1.3;

        if (config.controllable) {
            this.world.controllable = this;
            this.loc = this.world.mouse;
        }
    }

    addParticle(config) {
        config.system = this;
        config.world = this.world;
        this.particles.push(new Particle(config));
    }

    removeParticle(index) {
        this.particles.splice(index, 1);
    }

    update() {
        if (this.particles.length < this.maxParticles) {
            for (let i = 0; i < this.creationRate; i += 1) {
                this.addParticle({
                    loc: this.loc.copy(),
                    speed: Vec2.getRandom(-this.scatter, this.scatter)
                });
            }
        }

        this.particles.forEach(particle => {
            particle.update();
        });
    }

    draw() {
        this.particles.forEach(particle => {
            particle.draw();
        });
    }
}

class Particle {
    constructor(config) {
        this.world = config.world;
        this.loc = config.loc || new Vec2();
        this.speed = config.speed || new Vec2();
        this.system = config.system;
        this.initialLife = this.system.particleLife;
        this.life = this.initialLife;
        this.size = this.system.particleSize;
    }

    update(index) {
        this.speed.add(this.world.params.gravity);
        this.loc.add(this.speed);

        this.size = Math.max(0, this.system.particleSize = (this.life -= 1 / this.initialLife));

        if (this.notVisible(THRESHOLD) || this.life < 0) {
            this.system.removeParticle(index);
        }
    }

    draw() {
        this.world.ctx.globalCompositeOperation = 'lighter';
        this.world.ctx.globalAlpha = this.life / this.initialLife;

        const gradient = this.world.ctx.createRadialGradient(
            this.loc.x,
            this.loc.y,
            0,
            this.loc.x,
            this.loc.y,
            this.size
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, .5');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, .3');
        gradient.addColorStop(1, 'transparent');

        this.world.ctx.fillStyle = gradient;

        this.world.ctx.beginPath();
        this.world.ctx.arc(
            this.loc.x,
            this.loc.y,
            this.size,
            0,
            2 * Math.PI
        );
        this.world.ctx.fill();
    }


    notVisible(threshold) {
        return (
            this.loc.y > this.world.canvasHeight + threshold ||
            this.loc.y < -threshold ||
            this.loc.y > this.world.canvasWidth + threshold ||
            this.loc.x < -threshold
        );
    }
}

const world = new World(document.getElementById('canvas'));

world.addObject(new ParticleSystem({
    loc: new Vec2(200, 400),
    particleSize: 30,
    particleLife: 20,
    scatter: 0.4,
    world: world,
    controllable: true
}));

world.start();
