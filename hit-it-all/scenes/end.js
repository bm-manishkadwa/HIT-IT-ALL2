class End extends Phaser.Scene {
    constructor() {
        super('End');

        // These values mirror the background placement used by the Game scene.
        this.BACKGROUND_PORTRAIT = {
            skay_a: { x: 562, y: 753, scale: 2.1, depth: 1 },
            stadium_a: { x: 543, y: 707, scale: 1.45, depth: 2 },
            ground_a: { x: 349, y: 270, scale: 3.05, depth: 3 }
        };

        this.BACKGROUND_LANDSCAPE = {
            skay_a: { x: 986, y: 371, scale: 1.45, depth: 1 },
            stadium_a: { x: 984, y: 342, scale: 1.1, depth: 2 },
            ground_a: { x: 929, y: 36, scale: 1.95, depth: 3 }
        };
    }

    init(data = {}) {
        this.result = data.reason || 'lose';
        this.runs = data.runs ?? 0;
        this.target = data.target ?? 0;
    }

    preload() {
        this.load.image('end_skay_a', 'assets/skay_a.png');
        this.load.image('end_stadium_a', 'assets/stadium_a.png');
        this.load.image('end_ground_a', 'assets/ground_a.png');
        this.load.image('end_hit_it_logo', 'assets/Hit-It-logo.png');
        this.load.image('end_play_now', 'assets/play-now.png');
    }

    create() {
        this.createBackground();
        this.createEndContent();
        this.reflowForResize();

        this.scale.on('resize', this.reflowForResize, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.reflowForResize, this);
        });
    }

    createBackground() {
        this.backgroundContainer = this.add.container(0, 0).setDepth(1);
        this.skay_a = this.add.image(0, 0, 'end_skay_a').setOrigin(0.5);
        this.stadium_a = this.add.image(0, 0, 'end_stadium_a').setOrigin(0.5);
        this.ground_a = this.add.image(0, 0, 'end_ground_a').setOrigin(0.5);

        this.backgroundContainer.add([
            this.skay_a,
            this.stadium_a,
            this.ground_a
        ]);
    }

    createEndContent() {
        const won = this.result === 'win';

        this.hit_it_logo = this.add.image(0, 0, 'end_hit_it_logo')
            .setOrigin(0.5)
            .setDepth(10);

        this.resultText = this.add.text(0, 0, won ? 'YOU WIN!' : 'GAME OVER', {
            fontFamily: 'Arial Black, Arial',
            fontSize: '86px',
            color: won ? '#FFD700' : '#ffffff',
            stroke: '#071d48',
            strokeThickness: 14,
            align: 'center'
        }).setOrigin(0.5).setDepth(10);

        this.scoreText = this.add.text(0, 0, `SCORE  ${this.runs}  /  TARGET  ${this.target}`, {
            fontFamily: 'Arial Black, Arial',
            fontSize: '42px',
            color: '#ffffff',
            stroke: '#071d48',
            strokeThickness: 9,
            align: 'center'
        }).setOrigin(0.5).setDepth(10);

        this.play_now = this.add.image(0, 0, 'end_play_now')
            .setOrigin(0.5)
            .setDepth(10)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.start('Game'));

        this.tweens.add({
            targets: this.play_now,
            alpha: 0.82,
            duration: 650,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    reflowForResize() {
        const W = this.scale.width;
        const H = this.scale.height;
        const isLandscape = W / H >= 1.18;
        const baseWidth = isLandscape ? 1920 : 1080;
        const baseHeight = isLandscape ? 1080 : 1920;
        const layout = isLandscape ? this.BACKGROUND_LANDSCAPE : this.BACKGROUND_PORTRAIT;
        const coverScale = Math.max(W / baseWidth, H / baseHeight);
        const uiScale = Math.min(W / baseWidth, H / baseHeight);

        this.backgroundContainer
            .setPosition(W / 2, H / 2)
            .setScale(coverScale);

        Object.entries(layout).forEach(([key, item]) => {
            this[key]
                .setPosition(item.x - baseWidth / 2, item.y - baseHeight / 2)
                .setScale(item.scale)
                .setDepth(item.depth);
        });
        this.backgroundContainer.sort('depth');

        const logoWidth = Math.min(
            W * (isLandscape ? 0.25 : 0.58),
            520 * Math.max(uiScale, 0.65)
        );
        const logoScale = logoWidth / this.hit_it_logo.width;

        this.hit_it_logo
            .setPosition(W / 2, H * (isLandscape ? 0.16 : 0.14))
            .setScale(logoScale);

        this.resultText
            .setPosition(W / 2, H * (isLandscape ? 0.48 : 0.45))
            .setFontSize(Math.max(40, 86 * uiScale));

        this.scoreText
            .setPosition(W / 2, H * (isLandscape ? 0.60 : 0.55))
            .setFontSize(Math.max(22, 42 * uiScale));

        const buttonScale = Math.max(0.55, Math.min(1, uiScale));
        this.play_now
            .setPosition(W / 2, H * (isLandscape ? 0.82 : 0.82))
            .setScale(buttonScale);
    }
}
