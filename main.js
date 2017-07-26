const THRESHOLD = 100;

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomPoints(min, max) {
    return {
        x: getRandom(min, max),
        y: getRandom(min, max)
    };
};

class World {
    constructor(canvasNode) {
        this.canvasNode = canvasNode;
        this.ctx = this.canvasNode.getContext('2d');
        this.canvasWidth = this.canvasNode.width = window.innerWidth;
        this.canvasHeight = this.canvasNode.height = window.innerHeight;

        this.objects = [];
        this.controllable = {};
        this.mouse = this.getCanvasCenter();

        this.tick = this.tick.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseWheel = this.handleMouseWheel.bind(this);
        this.handleWindowResize = this.handleWindowResize.bind(this);

        this.init();
    }

    init() {
        this.canvasNode.addEventListener('mousemove', this.handleMouseMove);
        this.canvasNode.addEventListener('mousewheel', this.handleMouseWheel);
        window.addEventListener('resize', this.handleWindowResize);
    }

    handleWindowResize() {
        this.canvasHeight = this.canvasNode.width =  window.innerHeight;
        this.canvasWidth = this.canvasNode.width = window.innerWidth;
    }

    handleMouseMove(event) {
        this.mouse.x = event.offsetX;
        this.mouse.y = event.offsetY;
    }

    handleMouseWheel(event) {
        event.preventDefault();

        switch (true) {
            case event.shiftKey:
                this.updateParticleScatter(event.wheelDelta);
                break;

            case event.ctrlKey:
                this.updateParticleSize(event.wheelDelta);
                break;

            default:
                this.updateParticleLife(event.wheelDelta);
        }
    }

    updateParticleScatter(delta) {
        this.controllable.scatter = Math.max(0, this.controllable.scatter - delta / 100);
    }

    updateParticleSize(delta) {
        this.controllable.particleSize = Math.max(0, this.controllable.particleSize - delta / 100);
    }

    updateParticleLife(delta) {
        this.controllable.particleLife = Math.max(1, this.controllable.particleLife - delta / 10);
    }

    getCanvasCenter() {
        return {
            x: this.canvasWidth / 2,
            y: this.canvasHeight / 2
        };
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
        this.location = config.location || world.getCanvasCenter();
        this.maxParticles = config.maxParticles || 300;
        this.particleLife = config.particleLife || 60;
        this.particleSize = config.particleSize || 24;
        this.creationRate = config.creationRate || 3;
        this.gravityRate = config.gravityRate || -0.5;
        this.scatter = config.scatter || 1.3;

        if (config.controllable) {
            this.world.controllable = this;
            this.location = this.world.mouse;
        }
    }

    addParticle(particle) {
        this.particles.push(particle);
    }

    update() {
        if (this.particles.length < this.maxParticles) {
            for (let i = 0; i < this.creationRate; i += 1) {
                this.addParticle({
                    location: this.location,
                    speed: getRandomPoints(-this.scatter, this.scatter),
                    life: this.particleLife,
                    size: this.particleSize
                });
            }
        }

        this.particles = this.particles
            .filter(particle => {
                // Removing not visible particles and dead particles
                return this.isVisible(particle) && this.isParticleAlive(particle);
            })
            .map(particle => {
                const life = particle.life - 1;
                const gravity = getRandomPoints(-this.gravityRate, this.gravityRate);
                const speed = {
                    x: particle.speed.x + gravity.x,
                    y: particle.speed.y + gravity.y
                };
                const size = Math.max(0, this.particleSize * (life / this.particleLife));
                const location = {
                    x: particle.location.x + speed.x,
                    y: particle.location.y + speed.y
                };

                return { speed, size, location, life };
            });
    }

    draw() {
        this.particles.forEach(particle => {
            this.drawParticle(particle);
        });
    }

    drawParticle(particle) {
        this.world.ctx.globalCompositeOperation = 'lighter';
        this.world.ctx.globalAlpha = particle.life / this.particleLife;

        const gradient = this.world.ctx.createRadialGradient(
            particle.location.x,
            particle.location.y,
            0,
            particle.location.x,
            particle.location.y,
            particle.size
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, .8');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, .5');
        gradient.addColorStop(1, 'transparent');

        this.world.ctx.fillStyle = gradient;

        this.world.ctx.beginPath();
        this.world.ctx.arc(
            particle.location.x,
            particle.location.y,
            particle.size,
            0,
            2 * Math.PI
        );
        this.world.ctx.fill();
    }

    isVisible(particle, threshold = THRESHOLD) {
        return (
            particle.location.y < this.world.canvasHeight + threshold &&
            particle.location.y > -threshold &&
            particle.location.x < this.world.canvasWidth + threshold &&
            particle.location.x > -threshold
        );
    }

    isParticleAlive(particle) {
        return particle.life >= 0;
    }
}

const world = new World(document.getElementById('canvas'));

world.addObject(new ParticleSystem({
    world,
    maxParticles: 1000,
    particleSize: 30,
    particleLife: 200,
    scatter: 3,
    gravityRate: -0.2,
    controllable: true
}));

world.start();
