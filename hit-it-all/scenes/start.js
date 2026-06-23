class Start extends Phaser.Scene {
    constructor() {
        super('Start');

        this.LAYOUT_PORTRAIT = {
            cricket_pitch: { x: 538, y: 1335, scale: 0.9, depth: 4 },
            hit_it_logo: { x: 147, y: 1638, scale: 0.7, depth: 4 },
            australia_flag: { x: 811, y: 140, scale: 1, depth: 3 },
            austrialian_plyer: { x: 872, y: 1196, scale: 0.62, depth: 4 },
            ball: { x: 747, y: 1207, scale: 1, depth: 5 },
            boom: { x: 546, y: 946, scale: 1.2, depth: 4 },
            cricket_wicket__l: { x: 984, y: 1253, scale: 1.45, angle: 2.704, depth: 5 },
            cricket_wicket__r: { x: 100, y: 1239, scale: 1.45, angle: -0.161, depth: 5 },
            ground_a: { x: 526, y: 108, scale: 3.35, depth: 1 },
            hand_pointer: { x: 152, y: 1333, scale: 1, depth: 6 },
            india_vs_austrila_panel: { x: 545, y: 1814, scale: 0.75, depth: 3 },
            india_flag: { x: 263, y: 136, scale: 1, depth: 3 },
            indian_plyer: { x: 188, y: 1190, scale: 0.81, depth: 5 },
            play_now: { x: 913, y: 1685, scale: 0.75, depth: 3 },
            scoreboard_with_text: { x: 524, y: 635, scale: 1.25, depth: 3 },
            skay_a: { x: 577, y: 745, scale: 1.95, depth: 1 },
            stadium_a: { x: 554, y: 680, scale: 1.5, depth: 1 },
            swipe_to_play: { x: 532, y: 1405, scale: 0.7, depth: 3 },
        };

        this.LAYOUT_LANDSCAPE = {
            cricket_pitch: { x: 1046, y: 750, scale: 1.35, depth: 4 },
            hit_it_logo: { x: 138, y: 781, scale: 0.6, depth: 4 },
            australia_flag: { x: 1264, y: 110, scale: 0.85, depth: 3 },
            austrialian_plyer: { x: 1584, y: 599, scale: 0.65, depth: 4 },
            ball: { x: 1339, y: 657, scale: 1, depth: 5 },
            boom: { x: 1019, y: 614, scale: 1, depth: 4 },
            cricket_wicket__l: { x: 1703, y: 662, scale: 1.45, angle: 2.704, depth: 5 },
            cricket_wicket__r: { x: 391, y: 651, scale: 1.45, angle: -3.025, depth: 5 },
            ground_a: { x: 1087, y: 26, scale: 2, depth: 1 },
            hand_pointer: { x: 442, y: 767, scale: 1, depth: 6 },
            india_vs_austrila_panel: { x: 1009, y: 974, scale: 0.75, depth: 3 },
            india_flag: { x: 767, y: 110, scale: 0.85, depth: 3 },
            indian_plyer: { x: 489, y: 605, scale: 0.85, depth: 5 },
            play_now: { x: 1728, y: 916, scale: 0.75, depth: 3 },
            scoreboard_with_text: { x: 1022, y: 380, scale: 1.05, depth: 3 },
            skay_a: { x: 1012, y: 343, scale: 1.1, depth: 1 },
            stadium_a: { x: 1015, y: 336, scale: 1.05, depth: 1 },
            swipe_to_play: { x: 987, y: 828, scale: 0.75, depth: 3 },
        };
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
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.reflowForResize, this);
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
        this.scoreboard_with_text = this.add.image(0, 0, 'scoreboard_with_text').setOrigin(0.5);

        this.stadiumContainer.add([
            this.stadium_a,
            this.scoreboard_with_text
        ]);

        // Flag container
        this.india_flag = this.add.image(0, 0, 'india_flag').setOrigin(0.5);
        this.australia_flag = this.add.image(0, 0, 'australia_flag').setOrigin(0.5);

        this.flagContainer.add([
            this.india_flag,
            this.australia_flag
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
        this.boom = this.add.image(0, 0, 'boom').setOrigin(0.5);
        this.hand_pointer = this.add.image(0, 0, 'hand_pointer').setOrigin(0.5);
        this.ball = this.add.image(0, 0, 'ball').setOrigin(0.5);
        this.swipe_to_play = this.add.image(0, 0, 'swipe_to_play').setOrigin(0.5);
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
            this.boom,
            this.hand_pointer,
            this.ball,
            this.swipe_to_play,
            this.play_now,
            this.hit_it_logo,
            this.india_vs_austrila_panel
        ]);
    }

    setupStartActions() {
        this.swipe_to_play
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.scene.start('Game');
            });
    }

    reflowForResize(gameSize = { width: this.scale.width, height: this.scale.height }) {
        const W = gameSize.width;
        const H = gameSize.height;

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
        this.stadiumContainer.setScale(1);

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

        this.sortContainerDepths();
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
            'india_flag',
            'australia_flag',

            'stadium_a',
            'scoreboard_with_text',
            'boom',

            'ground_a',
            'cricket_pitch',
            'cricket_wicket__l',
            'cricket_wicket__r',
            'austrialian_plyer',
            'indian_plyer',
            'hand_pointer',
            'ball',
            'swipe_to_play',
            'play_now',
            'hit_it_logo',
            'india_vs_austrila_panel',
        ];
    }

    loadAllTheAssets() {
        const assets = [
            { key: 'cricket_pitch', path: 'assets/CRICKET-PITCH.png' },
            { key: 'hit_it_logo', path: 'assets/Hit-It-logo.png' },
            { key: 'australia_flag', path: 'assets/australia_flag.png' },
            { key: 'austrialian_plyer', path: 'assets/Hit_It_All_BatandBall/Baller_Sprite/standing-with-cricket-ball.png' },
            { key: 'ball', path: 'assets/ball.png' },
            { key: 'boom', path: 'assets/boom.png' },
            { key: 'cricket_wicket__l', path: 'assets/cricket-wicket-_L.png' },
            { key: 'cricket_wicket__r', path: 'assets/cricket-wicket-_r.png' },
            { key: 'ground_a', path: 'assets/ground_a.png' },
            { key: 'hand_pointer', path: 'assets/hand-pointer.png' },
            { key: 'india_vs_austrila_panel', path: 'assets/india-Vs-Austrila-panel.png' },
            { key: 'india_flag', path: 'assets/india-flag.png' },
            { key: 'indian_plyer', path: 'assets/Hit_It_All_BatandBall/Batting Sprite/bat01_standing.png' },
            { key: 'play_now', path: 'assets/play-now.png' },
            { key: 'scoreboard_with_text', path: 'assets/scoreboard_with-text.png' },
            { key: 'skay_a', path: 'assets/skay_a.png' },
            { key: 'stadium_a', path: 'assets/stadium_a.png' },
            { key: 'swipe_to_play', path: 'assets/swipe-to-play.png' },
        ];

        for (const asset of assets) {
            this.load.image(asset.key, asset.path);
        }
    }
}
