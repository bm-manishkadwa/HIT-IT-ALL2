class Start extends Phaser.Scene {
    constructor() {
        super('Start');

        this.LAYOUT_PORTRAIT = {
            cricket_pitch: { x: 538, y: 1335, scale: 0.9, depth: 4 },
            hit_it_logo: { x: 540, y: 820, scale: 1, depth: 8 },
            austrialian_plyer: { x: 872, y: 1196, scale: 0.53, depth: 4 },
            cricket_wicket__l: { x: 984, y: 1253, scale: 1.45, angle: 2.704, depth: 5 },
            cricket_wicket__r: { x: 100, y: 1239, scale: 1.45, angle: -0.161, depth: 5 },
            ground_a: { x: 526, y: 108, scale: 3.35, depth: 1 },
            hand_pointer: { x: 565, y: 1760, scale: 0.95, depth: 10 },
            india_vs_austrila_panel: { x: 540, y: 250, scale: 0.85, depth: 8 },
            indian_plyer: { x: 188, y: 1190, scale: 0.69, depth: 5 },
            play_now: { x: 540, y: 1675, scale: 0.95, depth: 9 },
            skay_a: { x: 577, y: 745, scale: 1.95, depth: 1 },
            stadium_a: { x: 554, y: 680, scale: 1.5, depth: 1 },
        };

        this.gameSettings = window.HIT_IT_ALL_SETTINGS || {};

        this.LAYOUT_LANDSCAPE = {
            cricket_pitch: { x: 1046, y: 750, scale: 1.35, depth: 4 },
            hit_it_logo: { x: 960, y: 450, scale: 0.85, depth: 8 },
            austrialian_plyer: { x: 1584, y: 599, scale: 0.56, depth: 4 },
            cricket_wicket__l: { x: 1703, y: 662, scale: 1.45, angle: 2.704, depth: 5 },
            cricket_wicket__r: { x: 391, y: 651, scale: 1.45, angle: -3.025, depth: 5 },
            ground_a: { x: 1087, y: 26, scale: 2, depth: 1 },
            hand_pointer: { x: 985, y: 970, scale: 0.85, depth: 10 },
            india_vs_austrila_panel: { x: 960, y: 135, scale: 0.75, depth: 8 },
            indian_plyer: { x: 489, y: 605, scale: 0.73, depth: 5 },
            play_now: { x: 960, y: 890, scale: 0.8, depth: 9 },
            skay_a: { x: 1012, y: 343, scale: 1.1, depth: 1 },
            stadium_a: { x: 1015, y: 336, scale: 1.05, depth: 1 },
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

    preload() {
        this.loadAllTheAssets();
    }

    create() {
        const batsmanTexture = this.textures.get('indian_plyer');
        // Crop the transparent sprite canvas to the visible player. The layout
        // scales below then match the height of the previous 218x300 preview.
        if (!batsmanTexture.has('standing')) {
            batsmanTexture.add('standing', 0, 8, 74, 238, 370);
        }

        this.createUI();
        this.setupStartActions();
        this.reflowForResize();

        this.scale.on('resize', this.reflowForResize, this);
        this.scale.on('orientationchange', this.reflowForResize, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.reflowForResize, this);
            this.scale.off('orientationchange', this.reflowForResize, this);
            this.tweens.killTweensOf([this.play_now, this.hand_pointer]);
        });

        // this.uiEditor = new UIEditor(this, {
        //     enabled: true,
        //     keys: this.getEditorKeys(),
        //     gridSize: 10,
        //     fileName: 'start.js',
        //     restoreFromLocalStorage: false
        // });
    }

    createUI() {
        this.mainContainer = this.add.container(0, 0);

        this.skyContainer = this.add.container(0, 0);
        this.stadiumContainer = this.add.container(0, 0);
        this.groundContainer = this.add.container(0, 0);
        this.playContainer = this.add.container(0, 0);
        this.flagContainer = this.add.container(0, 0);

        this.mainContainer.add([
            this.stadiumContainer,
            this.groundContainer,
            this.playContainer
        ]);

        // Sky container
        this.skay_a = this.add.image(0, 0, 'skay_a').setOrigin(0.5);

        this.skyContainer.add([
            this.skay_a
        ]);

        // Stadium container
        this.stadium_a = this.add.image(0, 0, 'stadium_a').setOrigin(0.5);

        this.stadiumContainer.add([
            this.stadium_a
        ]);

        // Ground container
        this.ground_a = this.add.image(0, 0, 'ground_a').setOrigin(0.5);
        this.cricket_pitch = this.add.image(0, 0, 'cricket_pitch').setOrigin(0.5);
        this.cricket_wicket__l = this.add.image(0, 0, 'cricket_wicket__l').setOrigin(0.5);
        this.cricket_wicket__r = this.add.image(0, 0, 'cricket_wicket__r').setOrigin(0.5);
        this.austrialian_plyer = this.add.image(0, 0, 'austrialian_plyer')
            .setOrigin(0.5)
            .setFlipX(true);
        this.indian_plyer = this.add.image(0, 0, 'indian_plyer', 'standing').setOrigin(0.5);
        this.hand_pointer = this.add.image(0, 0, 'hand_pointer').setOrigin(0.5);
        this.play_now = this.add.image(0, 0, 'play_now').setOrigin(0.5);
        this.hit_it_logo = this.add.image(0, 0, 'hit_it_logo').setOrigin(0.5);
        this.india_vs_austrila_panel = this.add.image(0, 0, 'india_vs_austrila_panel').setOrigin(0.5);

        this.groundContainer.add(this.ground_a);

        this.playContainer.add([
            this.cricket_pitch,
            this.cricket_wicket__l,
            this.cricket_wicket__r,
            this.austrialian_plyer,
            this.indian_plyer,
            this.hand_pointer,
            this.play_now,
            this.hit_it_logo,
            this.india_vs_austrila_panel
        ]);
    }

    setupStartActions() {
        const startGame = () => {
            if (this.startingGame) return;

            this.startingGame = true;
            if (this.sound && this.cache.audio.exists('sfx_play_click')) {
                this.sound.play('sfx_play_click', { volume: 0.9 });
            }

            this.time.delayedCall(120, () => this.scene.start('Game'));
        };

        if (this.play_now) this.play_now.setInteractive({ useHandCursor: true }).on('pointerdown', startGame);
        if (this.getBoolConfig('startScene', 'tapToStart', true)) this.input.once('pointerdown', startGame);
    }

    reflowForResize(gameSize) {
        const W = (gameSize && typeof gameSize.width === 'number') ? gameSize.width : this.scale.width;
        const H = (gameSize && typeof gameSize.height === 'number') ? gameSize.height : this.scale.height;

        const isLandscape = W > H;
        const layout = isLandscape ? this.LAYOUT_LANDSCAPE : this.LAYOUT_PORTRAIT;

        const BASE_W = isLandscape ? 1920 : 1080;
        const BASE_H = isLandscape ? 1080 : 1920;

        const fitScale = Math.min(W / BASE_W, H / BASE_H);
        const groundScale = Math.max(W / BASE_W, H / BASE_H);
        const skyWidth = this.skay_a.width || 1920;
        const skyHeight = this.skay_a.height || 1080;
        const coverScale = Math.max(W / skyWidth, H / skyHeight);
        const contentCenterY = H / 2;

        this.mainContainer.setPosition(W / 2, contentCenterY);
        this.mainContainer.setScale(fitScale);

        this.skyContainer.setPosition(W / 2, H / 2);
        this.skyContainer.setScale(coverScale);

        this.flagContainer.setPosition(W / 2, contentCenterY);
        this.flagContainer.setScale(fitScale);

        this.stadiumContainer.setPosition(0, 0);
        this.stadiumContainer.setScale(groundScale / fitScale);

        this.groundContainer.setPosition(0, 0);
        this.groundContainer.setScale(groundScale / fitScale);

        this.playContainer.setPosition(0, 0);
        this.playContainer.setScale(1);

        for (const key in layout) {
            if (!this[key]) continue;

            const item = layout[key];

            const localX = item.x - BASE_W / 2;
            const localY = item.y - BASE_H / 2;

            if (key === 'skay_a') {
                this[key]
                    .setPosition(0, 0)
                    .setScale(1)
                    .setAngle(item.angle ?? 0)
                    .setAlpha(item.alpha ?? 1);
                continue;
            }

            this[key]
                .setPosition(localX, localY)
                .setScale(item.scale ?? 1)
                .setAngle(item.angle ?? 0)
                .setAlpha(item.alpha ?? 1);

            if (item.depth !== undefined) {
                this[key].setDepth(item.depth);
            }
        }

        this.startPlayNowPulse();
        this.startHandPointerTap();
        this.sortContainerDepths();
    }

    startPlayNowPulse() {
        if (!this.play_now) return;

        this.tweens.killTweensOf(this.play_now);

        const baseScale = this.play_now.scaleX || 1;
        this.tweens.add({
            targets: this.play_now,
            scaleX: baseScale * 1.07,
            scaleY: baseScale * 1.07,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    startHandPointerTap() {
        if (!this.hand_pointer) return;

        this.tweens.killTweensOf(this.hand_pointer);

        const baseX = this.hand_pointer.x;
        const baseY = this.hand_pointer.y;
        const baseScale = this.hand_pointer.scaleX || 1;

        this.hand_pointer
            .setPosition(baseX, baseY)
            .setScale(baseScale)
            .setAlpha(1);

        this.tweens.add({
            targets: this.hand_pointer,
            y: baseY + 18,
            scaleX: baseScale * 0.9,
            scaleY: baseScale * 0.9,
            alpha: 0.78,
            duration: 360,
            hold: 120,
            yoyo: true,
            repeat: -1,
            repeatDelay: 420,
            ease: 'Sine.easeInOut'
        });
    }

    sortContainerDepths() {
        this.skyContainer.sort('depth');
        this.stadiumContainer.sort('depth');
        this.groundContainer.sort('depth');
        this.playContainer.sort('depth');
        this.flagContainer.sort('depth');

        this.skyContainer.setDepth(1);
        this.mainContainer.setDepth(2);
        this.flagContainer.setDepth(3);
        this.stadiumContainer.setDepth(1);
        this.groundContainer.setDepth(2);
        this.playContainer.setDepth(3);
    }

    getEditorKeys() {
        return [
            'skay_a',

            'stadium_a',

            'ground_a',
            'cricket_pitch',
            'cricket_wicket__l',
            'cricket_wicket__r',
            'austrialian_plyer',
            'indian_plyer',
            'hand_pointer',
            'play_now',
            'hit_it_logo',
            'india_vs_austrila_panel',
        ];
    }

    loadAllTheAssets() {
        const assets = [
            { key: 'cricket_pitch', path: 'assets/CRICKET-PITCH.png' },
            { key: 'hit_it_logo', path: 'assets/Hit-It-logo.png' },
            { key: 'austrialian_plyer', path: 'assets/Hit_It_All_BatandBall/Baller_Sprite/standing-with-cricket-ball.png' },
            { key: 'cricket_wicket__l', path: 'assets/cricket-wicket-_L.png' },
            { key: 'cricket_wicket__r', path: 'assets/cricket-wicket-_r.png' },
            { key: 'ground_a', path: 'assets/ground_a.png' },
            { key: 'hand_pointer', path: 'assets/hand-pointer.png' },
            { key: 'india_vs_austrila_panel', path: 'assets/india-Vs-Austrila-panel.png' },
            { key: 'indian_plyer', path: 'assets/Hit_It_All_BatandBall/Batting Sprite/bat01_standing.png' },
            { key: 'play_now', path: 'assets/play-now.png' },
            { key: 'skay_a', path: 'assets/skay_a.png' },
            { key: 'stadium_a', path: 'assets/stadium_a.png' },
        ];

        for (const asset of assets) {
            this.load.image(asset.key, asset.path);
        }

        this.load.audio('sfx_play_click', 'assets/sfx/matthewvakaliuk73627-mouse-click-290204.mp3');
    }
}
