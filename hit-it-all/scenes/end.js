class End extends Phaser.Scene {
    constructor() {
        super('End');

        this.gameSettings = window.HIT_IT_ALL_SETTINGS || {};

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


    getSettingsSection(name) {
        this.gameSettings = window.HIT_IT_ALL_SETTINGS || {};
        return this.gameSettings[name] || {};
    }

    getBoolConfig(sectionName, key, fallback = true) {
        const section = this.getSettingsSection(sectionName);
        return section[key] === undefined ? fallback : !!section[key];
    }

    getNumberConfig(sectionName, key, fallback, min = null, max = null) {
        const section = this.getSettingsSection(sectionName);
        const raw = Number(section[key] === undefined || section[key] === null ? fallback : section[key]);
        const value = Number.isFinite(raw) ? raw : fallback;
        if (min !== null && value < min) return min;
        if (max !== null && value > max) return max;
        return value;
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
        this.load.image('end_hit_it_logo', 'assets/hit it updated asset/hit-it-logo_02.png');
        this.load.image('end_win', 'assets/hit it updated asset/hit-it_win_01.png');
        this.load.image('end_lose', 'assets/hit it updated asset/hit-it_lose_01.png');
        this.load.image('end_download_button', 'assets/hit it updated asset/hit-it_download-btn_01.png');
        this.load.audio('sfx_game_win', 'assets/sfx/game win.mp3');
        this.load.audio('sfx_game_lose', 'assets/sfx/game lose.mp3');
    }

    create() {
        this.cameras.main.fadeIn(650, 0, 0, 0);
        this.createBackground();
        this.createEndContent();
        this.reflowForResize();
        this.time.delayedCall(100, () => this.playResultSfx());

        this.scale.on('resize', this.reflowForResize, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.reflowForResize, this);
        });
    }

    playResultSfx() {
        if (!this.getBoolConfig('audio', 'enabled', true)) return;

        const won = this.result === 'win';
        const audioKey = won ? 'win' : 'lose';
        if (!this.getBoolConfig('audio', audioKey, true)) return;

        const sfxKey = won ? 'sfx_game_win' : 'sfx_game_lose';
        if (!this.sound || !this.cache.audio.exists(sfxKey)) return;

        this.sound.play(sfxKey, {
            volume: this.getNumberConfig('audio', 'resultVolume', 1, 0, 1)
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

        this.resultImage = this.add.image(0, 0, won ? 'end_win' : 'end_lose')
            .setOrigin(0.5)
            .setDepth(10);

        this.downloadButton = this.add.image(0, 0, 'end_download_button')
            .setOrigin(0.5)
            .setDepth(10);
        if (this.getBoolConfig('endScene', 'restartOnDownloadButton', true)) {
            this.downloadButton.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('Game'));
        }
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

        const logoWidth = Math.min(W * (isLandscape ? 0.21 : 0.45), 360 * Math.max(uiScale, 0.75));
        const logoScale = logoWidth / this.hit_it_logo.width;

        this.hit_it_logo
            .setPosition(W / 2, H * (isLandscape ? 0.15 : 0.13))
            .setScale(logoScale);

        const resultWidth = Math.min(W * (isLandscape ? 0.22 : 0.62), 440 * Math.max(uiScale, 0.8));
        const resultScale = resultWidth / this.resultImage.width;
        this.resultImage
            .setPosition(W / 2, H * (isLandscape ? 0.52 : 0.48))
            .setScale(resultScale);

        const buttonWidth = Math.min(W * (isLandscape ? 0.28 : 0.66), 460 * Math.max(uiScale, 0.8));
        const buttonScale = buttonWidth / this.downloadButton.width;
        this.downloadButton
            .setPosition(W / 2, H * (isLandscape ? 0.84 : 0.85))
            .setScale(buttonScale);

        this.startDownloadButtonScalePulse();
    }

    startDownloadButtonScalePulse() {
        if (!this.downloadButton || !this.getBoolConfig('effects', 'endButtonPulse', true)) return;

        this.tweens.killTweensOf(this.downloadButton);

        const baseScale = this.downloadButton.scaleX || 1;
        this.tweens.add({
            targets: this.downloadButton,
            scaleX: baseScale * 1.07,
            scaleY: baseScale * 1.07,
            alpha: this.getNumberConfig('endScene', 'buttonPulseAlpha', 0.82, 0, 1),
            duration: this.getNumberConfig('endScene', 'buttonPulseDuration', 1100, 0),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}
