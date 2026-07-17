class Game extends Phaser.Scene {
    constructor() {
        super('Game');

        this.targetScore = 0;
        this.indiaRuns = 0;
        this.indiaWickets = 0;
        this.ballsBowled = 0;
        this.timeLeft = 60;
        this.gameActive = false;
        this.timerEvent = null;
        this.deliveryEvent = null;
        this.crowdSound = null;
        this.isHandPointerActive = false;

        this.ballInMotion = false;
        this.waitingForShot = false;
        this.waitingForDeliveryTap = false;
        this.currentDelivery = null;
        this.deliveryFrameEvent = null;
        this.maxWickets = 1;
        this.nextBallDelay = 3000;

        this.ballTypes = ['FULL_TOSS', 'BOUNCER', 'YORKER', 'GOOD_LENGTH', 'SLOWER', 'SWING'];
        this.currentBallType = 'GOOD_LENGTH';

        this.BOWLER_HAND = 'LEFT';

        this.selectedShot = 'MISS';
        this.swipeStartX = 0;
        this.swipeStartY = 0;
        this.pointerDownTime = 0;

        this.PLAYER_SIZE = {
            portrait: { width: 164, height: 255 },
            landscape: { width: 174, height: 270 }
        };

        this.BOWLER_SIZE = {
            portrait: { width: 72, height: 258 },
            landscape: { width: 76, height: 273 }
        };

        this.currentFitScale = 1;
        this.shotFeedbackHideEvent = null;
        this.bowlerSpriteFacesLeft = true;
        this.BATSMAN_SHOT_SPRITESHEET_SCALE = 1.18;
        this.gameSettings = window.HIT_IT_ALL_SETTINGS || {};

        this.LAYOUT_PORTRAIT = {
            cricket_pitch: { x: 538, y: 1335, scale: 0.9, depth: 4 },
            hit_it_logo: { x: 160, y: 1719, scale: 0.55, depth: 4 },
            australia_flag: { x: 822, y: 134, scale: 1, depth: 3 },
            austrialian_plyer: { x: 872, y: 1213, scale: 1, depth: 4 },
            ball: { x: 746, y: 1225, scale: 0.55, alpha: 0, depth: 30 },
            cricket_wicket__l: { x: 984, y: 1253, scale: 1.45, angle: 2.704, depth: 5 },
            cricket_wicket__r: { x: 100, y: 1239, scale: 1.45, angle: -0.161, depth: 5 },
            ground_a: { x: 526, y: 108, scale: 3.35, depth: 1 },
            hand_pointer: { x: 188, y: 1202, scale: 1, alpha: 0, depth: 6 },
            india_flag: { x: 301, y: 127, scale: 1, depth: 3 },
            indian_plyer: { x: 188, y: 1213, scale: 1, depth: 5 },
            scoreboard_with_text: { x: 527, y: 639, scale: 1.4, depth: 3 },
            skay_a: { x: 577, y: 745, scale: 1.95, depth: 1 },
            stadium_a: { x: 554, y: 680, scale: 1.5, depth: 1 }
        };

        this.LAYOUT_LANDSCAPE = {
            cricket_pitch: { x: 1046, y: 750, scale: 1.35, depth: 4 },
            hit_it_logo: { x: 136, y: 980, scale: 0.55, depth: 4 },
            australia_flag: { x: 1197, y: 71, scale: 0.5, depth: 3 },
            austrialian_plyer: { x: 1584, y: 614, scale: 1, depth: 4 },
            ball: { x: 1210, y: 620, scale: 0.55, alpha: 0, depth: 30 },
            cricket_wicket__l: { x: 1703, y: 662, scale: 1.45, angle: 2.704, depth: 5 },
            cricket_wicket__r: { x: 391, y: 651, scale: 1.45, angle: -3.025, depth: 5 },
            ground_a: { x: 1087, y: 26, scale: 2, depth: 1 },
            hand_pointer: { x: 489, y: 612, scale: 1, alpha: 0, depth: 6 },
            india_flag: { x: 784, y: 64, scale: 0.5, depth: 3 },
            indian_plyer: { x: 489, y: 614, scale: 1, depth: 5 },
            scoreboard_with_text: { x: 980, y: 295, scale: 0.95, depth: 3 },
            skay_a: { x: 1012, y: 343, scale: 1.1, depth: 1 },
            stadium_a: { x: 1015, y: 336, scale: 1.05, depth: 1 }
        };
    }


    getSettingsSection(name) {
        return (this.gameSettings && this.gameSettings[name]) || {};
    }

    getConfigValue(sectionName, key, fallback) {
        const section = this.getSettingsSection(sectionName);
        return section[key] === undefined || section[key] === null ? fallback : section[key];
    }

    getNumberConfig(sectionName, key, fallback, min = null, max = null) {
        const raw = Number(this.getConfigValue(sectionName, key, fallback));
        const value = Number.isFinite(raw) ? raw : fallback;
        if (min !== null && value < min) return min;
        if (max !== null && value > max) return max;
        return value;
    }

    getBoolConfig(sectionName, key, fallback = true) {
        const value = this.getConfigValue(sectionName, key, fallback);
        return value === undefined ? fallback : !!value;
    }

    getNestedConfig(sectionName, key, fallback) {
        const section = this.getSettingsSection(sectionName);
        return section[key] === undefined || section[key] === null ? fallback : section[key];
    }

    refreshDynamicSettings() {
        this.gameSettings = window.HIT_IT_ALL_SETTINGS || {};
        const gameplay = this.getSettingsSection('gameplay');
        const players = this.getSettingsSection('players');
        const batsman = players.batsman || {};
        const bowler = players.bowler || {};
        this.maxWickets = this.getNumberConfig('gameplay', 'maxWickets', 3, 1);
        this.nextBallDelay = this.getNumberConfig('gameplay', 'nextBallDelay', 3000, 0);
        this.ballTypes = Array.isArray(gameplay.ballTypes) && gameplay.ballTypes.length ? gameplay.ballTypes : ['FULL_TOSS', 'BOUNCER', 'YORKER', 'GOOD_LENGTH', 'SLOWER', 'SWING'];
        this.BOWLER_HAND = players.bowlerHand || 'LEFT';
        this.PLAYER_SIZE = {
            portrait: { ...(this.PLAYER_SIZE?.portrait || { width: 260, height: 390 }), ...(batsman.portrait || {}) },
            landscape: { ...(this.PLAYER_SIZE?.landscape || { width: 230, height: 340 }), ...(batsman.landscape || {}) }
        };
        this.BOWLER_SIZE = {
            portrait: { ...(this.BOWLER_SIZE?.portrait || { width: 240, height: 360 }), ...(bowler.portrait || {}) },
            landscape: { ...(this.BOWLER_SIZE?.landscape || { width: 230, height: 340 }), ...(bowler.landscape || {}) }
        };
    }

    getTargetScoreFromConfig() {
        const fixed = Number(this.getConfigValue('gameplay', 'targetScore', NaN));
        if (Number.isFinite(fixed) && fixed > 0) return Math.floor(fixed);
        const min = Math.floor(this.getNumberConfig('gameplay', 'targetScoreMin', 10, 1));
        const max = Math.max(min, Math.floor(this.getNumberConfig('gameplay', 'targetScoreMax', 40, min)));
        return Phaser.Math.Between(min, max);
    }

    preload() {
        this.loadAllTheAssets();
    }

    create() {
        this.refreshDynamicSettings();
        this.cameras.main.setBackgroundColor('#1b69d8');

        this.createBattingFrames();
        this.createBowlingFrames();
        this.createGameUI();
        this.createBatsmanAnimations();
        this.createBowlerAnimations();
        this.setupShotControls();

        this.reflowForResize();

        this.scale.off('resize', this.reflowForResize, this);
        this.scale.on('resize', this.reflowForResize, this);
        this.scale.off('orientationchange', this.reflowForResize, this);
        this.scale.on('orientationchange', this.reflowForResize, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.reflowForResize, this);
            this.scale.off('orientationchange', this.reflowForResize, this);
            this._stopTimer();
            this._stopDeliveryLoop();
            this.stopCrowdSound();
        });

        this.setupGame();

        if (typeof UIEditor !== 'undefined') {
            this.uiEditor = new UIEditor(this, {
                enabled: !!this.getSettingsSection('editor').uiEditorEnabled,
                keys: this.getEditorKeys(),
                gridSize: 10,
                fileName: 'game.js',
                restoreFromLocalStorage: false
            });
        }
    }

    getEditorKeys() {
        return [
            'cricket_pitch',
            'hit_it_logo',
            'australia_flag',
            'austrialian_plyer',
            'ball',
            'cricket_wicket__l',
            'cricket_wicket__r',
            'ground_a',
            'hand_pointer',
            'india_flag',
            'indian_plyer',
            'scoreboard_with_text',
            'skay_a',
            'stadium_a'
        ];
    }

    createGameUI() {
        this.backgroundContainer = this.add.container(0, 0).setDepth(1);
        this.mainContainer = this.add.container(0, 0).setDepth(2);
        this.fieldContainer = this.add.container(0, 0).setDepth(1);
        this.flagContainer = this.add.container(0, 0).setDepth(10);
        this.scoreboardContainer = this.add.container(0, 0).setDepth(20);
        this.logoContainer = this.add.container(0, 0).setDepth(40);
        this.overlayContainer = this.add.container(0, 0).setDepth(80);

        this.mainContainer.add([
            this.fieldContainer,
            this.flagContainer,
            this.scoreboardContainer,
            this.logoContainer,
            this.overlayContainer
        ]);

        this.cricket_pitch = this.add.image(0, 0, 'cricket_pitch').setOrigin(0.5).setAlpha(0);
        this.hit_it_logo = this.add.image(0, 0, 'hit_it_logo').setOrigin(0.5).setAlpha(0);
        this.australia_flag = this.add.image(0, 0, 'australia_flag').setOrigin(0.5).setAlpha(0);

        this.austrialian_plyer = this.add.sprite(0, 0, 'austrialian_plyer')
            .setOrigin(0.5)
            .setAlpha(0);

        this.ball = this.add.image(0, 0, 'ball')
            .setOrigin(0.5)
            .setAlpha(0)
            .setDepth(30);

        this.cricket_wicket__l = this.add.image(0, 0, 'cricket_wicket__l').setOrigin(0.5).setAlpha(0);
        this.cricket_wicket__r = this.add.image(0, 0, 'cricket_wicket__r').setOrigin(0.5).setAlpha(0);
        this.ground_a = this.add.image(0, 0, 'ground_a').setOrigin(0.5).setAlpha(0);
        this.hand_pointer = this.add.image(0, 0, 'hand_pointer').setOrigin(0.5).setAlpha(0);
        this.india_flag = this.add.image(0, 0, 'india_flag').setOrigin(0.5).setAlpha(0);

        this.indian_plyer = this.add.sprite(0, 0, 'batsman_standing', 'standing')
            .setOrigin(0.5)
            .setAlpha(0);

        this.scoreboard_with_text = this.add.image(0, 0, 'scoreboard_with_text').setOrigin(0.5).setAlpha(0);
        this.skay_a = this.add.image(0, 0, 'skay_a').setOrigin(0.5).setAlpha(0);
        this.stadium_a = this.add.image(0, 0, 'stadium_a').setOrigin(0.5).setAlpha(0);

        this.timerText = this.add.text(0, 0, '60', {
            fontSize: '66px',
            fontFamily: 'Arial Black, Arial',
            color: '#7CFF4D',
            stroke: '#000000',
            strokeThickness: 12
        }).setOrigin(0.5).setDepth(30).setAlpha(1);

        this.chaseText = this.add.text(0, 0, '0', {
            fontSize: '58px',
            fontFamily: 'Arial Black, Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 9
        }).setOrigin(0.5).setShadow(3, 3, '#000000', 4, true, true).setDepth(30).setAlpha(1);

        this.runsText = this.add.text(0, 0, '0', {
            fontSize: '58px',
            fontFamily: 'Arial Black, Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 9
        }).setOrigin(0.5).setShadow(3, 3, '#000000', 4, true, true).setDepth(30).setAlpha(1);

        this.countdownText = this.add.text(0, 0, '', {
            fontSize: '160px',
            fontFamily: 'Arial Black, Arial',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 10
        }).setOrigin(0.5).setAlpha(0).setDepth(70);

        this.shotFeedbackText = this.add.text(0, 0, '', {
            fontSize: '66px',
            fontFamily: 'Arial Black, Arial',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 12,
            align: 'center'
        }).setOrigin(0.5).setAlpha(0).setDepth(90);

        this.impactFlash = this.add.circle(0, 0, 24, 0xffffff, 0.85)
            .setAlpha(0)
            .setDepth(95);

        this.backgroundContainer.add([
            this.skay_a,
            this.ground_a,
            this.stadium_a
        ]);

        this.fieldContainer.add([
            this.cricket_pitch,
            this.cricket_wicket__l,
            this.cricket_wicket__r,
            this.austrialian_plyer,
            this.indian_plyer,
            this.ball,
            this.hand_pointer
        ]);

        this.flagContainer.add([this.india_flag, this.australia_flag]);

        this.scoreboardContainer.add([
            this.scoreboard_with_text,
            this.timerText,
            this.chaseText,
            this.runsText
        ]);

        this.logoContainer.add(this.hit_it_logo);
        this.overlayContainer.add([this.countdownText, this.shotFeedbackText, this.impactFlash]);
    }

    createBattingFrames() {
        const tex = this.textures.get('batting_sheet');
        const standingTex = this.textures.get('batsman_standing');

        // The source image has a wide transparent canvas. Use the visible player
        // bounds so the existing layout sizes the batsman consistently.
        if (!standingTex.has('standing')) {
            standingTex.add('standing', 0, 8, 74, 238, 370);
        }

        // Eight 548px-wide cells make up the supplied horizontal hit sequence.
        // Keep enough of each cell to include the widest leg and bat poses,
        // while still removing the unused transparent area on the right.
        const frameNames = [
            'idle',
            'backlift',
            'stride',
            'swing',
            'contact',
            'follow',
            'finish',
            'power'
        ];
        const frames = frameNames.map((name, index) => ({
            name,
            x: index * 548,
            y: 0,
            w: 400,
            h: 458
        }));

        frames.forEach(f => {
            if (!tex.has(f.name)) {
                tex.add(f.name, 0, f.x, f.y, f.w, f.h);
            }
        });
    }

    createBowlingFrames() {
        const tex = this.textures.get('bowling_sheet');

        const frames = [
            { name: 'bowl_wind_up', x: 0, y: 0, w: 404, h: 487 },
            { name: 'bowl_jump', x: 404, y: 0, w: 404, h: 487 },
            { name: 'bowl_release', x: 808, y: 0, w: 404, h: 487 },
            { name: 'bowl_follow_through', x: 1212, y: 0, w: 404, h: 487 }
        ];

        frames.forEach(f => {
            if (!tex.has(f.name)) {
                tex.add(f.name, 0, f.x, f.y, f.w, f.h);
            }
        });
    }

    createBatsmanAnimations() {
        const key = 'batting_sheet';

        this.anims.create({
            key: 'bat_idle',
            frames: [{ key: 'batsman_standing', frame: 'standing' }],
            frameRate: 1,
            repeat: 0
        });

        this.anims.create({
            key: 'bat_normal',
            frames: [
                { key, frame: 'idle' },
                { key, frame: 'backlift' },
                { key, frame: 'stride' },
                { key, frame: 'swing' },
                { key, frame: 'contact' },
                { key, frame: 'follow' },
                { key, frame: 'finish' },
                { key, frame: 'power' }
            ],
            frameRate: 14,
            repeat: 0
        });

        this.anims.create({
            key: 'bat_power',
            frames: [
                { key, frame: 'idle' },
                { key, frame: 'backlift' },
                { key, frame: 'stride' },
                { key, frame: 'swing' },
                { key, frame: 'contact' },
                { key, frame: 'power' },
                { key, frame: 'finish' },
                { key, frame: 'power' }
            ],
            frameRate: 16,
            repeat: 0
        });

        this.anims.create({
            key: 'bat_defence',
            frames: [
                { key, frame: 'idle' },
                { key, frame: 'backlift' },
                { key, frame: 'stride' },
                { key, frame: 'contact' },
                { key, frame: 'idle' }
            ],
            frameRate: 12,
            repeat: 0
        });

        this.anims.create({
            key: 'bat_miss',
            frames: [
                { key, frame: 'idle' },
                { key, frame: 'backlift' },
                { key, frame: 'stride' },
                { key, frame: 'swing' },
                { key, frame: 'follow' },
                { key, frame: 'finish' },
                { key, frame: 'idle' }
            ],
            frameRate: 12,
            repeat: 0
        });

        this.indian_plyer.on('animationcomplete', animation => {
            if (animation.key === 'bat_idle') return;

            this.indian_plyer.setTexture('batsman_standing', 'standing');
            this.fixIndianPlayerSize();
        });
        this.indian_plyer.on('animationstart', () => this.fixIndianPlayerSize());
        this.indian_plyer.on('animationupdate', () => this.fixIndianPlayerSize());

        this.indian_plyer.play('bat_idle');
    }

    createBowlerAnimations() {
        this.anims.create({
            key: 'bowl_idle',
            frames: [{ key: 'austrialian_plyer' }],
            frameRate: 1,
            repeat: 0
        });

        this.anims.create({
            key: 'bowl_action',
            frames: [
                { key: 'bowling_sheet', frame: 'bowl_wind_up' },
                { key: 'bowling_sheet', frame: 'bowl_jump' },
                { key: 'bowling_sheet', frame: 'bowl_release' },
                { key: 'bowling_sheet', frame: 'bowl_follow_through' }
            ],
            frameRate: 6,
            repeat: 0
        });

        this.austrialian_plyer.on('animationcomplete', animation => {
            if (animation.key === 'bowl_idle') return;

            this.austrialian_plyer.play('bowl_idle');
            this.fixBowlerSize();
        });

        this.austrialian_plyer.play('bowl_idle');
    }

    setupShotControls() {
        this.input.on('pointerdown', pointer => {
            this.swipeStartX = pointer.x;
            this.swipeStartY = pointer.y;
            this.pointerDownTime = this.time.now;
        });

        this.input.on('pointerup', pointer => {
            if (this.waitingForDeliveryTap) {
                this.waitingForDeliveryTap = false;
                this.hideHandPointer();
                this.playSfx('sfx_play_click', { volume: 0.9 });
                this.startNextDelivery();
                return;
            }

            if (!this.gameActive || !this.ballInMotion || !this.waitingForShot) return;

            const dx = pointer.x - this.swipeStartX;
            const dy = pointer.y - this.swipeStartY;
            const holdMs = this.time.now - this.pointerDownTime;
            const swipeDistance = Math.sqrt(dx * dx + dy * dy);

            let inputType = 'TAP';

            if (dy < -80) inputType = 'POWER';
            else if (Math.abs(dx) > 80) inputType = 'NORMAL';
            else if (holdMs > 230) inputType = 'DEFENCE';

            this.resolveDeliveryWithShot(inputType, swipeDistance, holdMs);
        });
    }

    playBowlingAnimation(onRelease) {
        if (!this.austrialian_plyer) return;

        let ballReleased = false;
        const releaseBall = () => {
            if (ballReleased) return;
            ballReleased = true;
            this.austrialian_plyer.off('animationupdate', handleAnimationUpdate);
            if (onRelease) onRelease();
        };
        const handleAnimationUpdate = (animation, frame) => {
            if (animation.key === 'bowl_action' && frame.textureFrame === 'bowl_release') {
                releaseBall();
            }
        };

        this.austrialian_plyer.on('animationupdate', handleAnimationUpdate);
        // Fallback for interrupted or skipped frames; normally the ball is
        // released by the exact bowl_release frame above.
        this.austrialian_plyer.once('animationcomplete-bowl_action', releaseBall);

        this.forceLeftHandBowlerFacing();
        this.austrialian_plyer.play('bowl_action', true);
        this.fixBowlerSize();
        this.forceLeftHandBowlerFacing();
    }

    playSelectedShot(type = 'NORMAL') {
        if (!this.gameActive || !this.indian_plyer) return;

        this.selectedShot = type;

        if (type === 'POWER') this.indian_plyer.play('bat_power', true);
        else if (type === 'DEFENCE') this.indian_plyer.play('bat_defence', true);
        else if (type === 'MISS') this.indian_plyer.play('bat_miss', true);
        else this.indian_plyer.play('bat_normal', true);

        this.fixIndianPlayerSize();
        this.fixBowlerSize();
    }

    startNextDelivery() {
        if (!this.gameActive || this.ballInMotion) return;

        this.waitingForDeliveryTap = false;
        this.ballInMotion = true;
        this.waitingForShot = false;
        this.selectedShot = 'MISS';
        this.ballsBowled++;

        this.currentBallType = Phaser.Utils.Array.GetRandom(this.ballTypes);

        this.currentDelivery = null;
        this.tweens.killTweensOf(this.ball);
        this.ball.setAlpha(0);

        this.playBowlingAnimation(() => this.releaseDeliveryBall());
        this.forceLeftHandBowlerFacing();
    }

    releaseDeliveryBall() {
        if (!this.gameActive || !this.ballInMotion || this.currentDelivery) return;

        const start = this.getBowlerReleasePoint();
        const bounce = this.getPitchBouncePointByType(this.currentBallType);
        const contact = this.getBatsmanContactPointByType(this.currentBallType);

        this.currentDelivery = {
            type: this.currentBallType,
            start,
            bounce,
            contact,
            duration: this.getDeliverySpeedByType(this.currentBallType),
            startTime: this.time.now,
            resolved: false,
            pitchTapped: false,
            idealHitT: this.getIdealHitTimeByType(this.currentBallType)
        };

        this.tweens.killTweensOf(this.ball);

        this.ball
            .setPosition(start.x, start.y)
            .setScale(this.getBallLayoutScale())
            .setAngle(0)
            .setAlpha(1)
            .setDepth(30);

        if (this.deliveryFrameEvent) this.deliveryFrameEvent.remove(false);

        this.deliveryFrameEvent = this.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => this.updateDeliveryFrame()
        });
    }

    updateDeliveryFrame() {
        if (!this.currentDelivery || !this.ballInMotion) return;

        const d = this.currentDelivery;
        const t = Phaser.Math.Clamp((this.time.now - d.startTime) / d.duration, 0, 1);
        const p = this.getSmoothBallPoint(d.start, d.bounce, d.contact, t);

        this.ball.setPosition(p.x, p.y);
        this.ball.setAngle(t * 900);
        this.ball.setScale(this.getBallLayoutScale() * (1 + t * 0.08));

        if (t >= 0.52 && !d.pitchTapped && this.currentBallType !== 'FULL_TOSS') {
            d.pitchTapped = true;
            this.showPitchTapEffect(d.bounce);
        }

        if (t >= 0.62) {
            this.waitingForShot = true;
        }

        if (t >= 1 && !d.resolved) {
            d.resolved = true;
            this.waitingForShot = false;
            this.playSelectedShot('MISS');
            this.handleMissBall();
            this.stopDeliveryFrameOnly();
        }
    }

    getSmoothBallPoint(start, bounce, contact, t) {
        const type = this.currentBallType;

        const x1 = Phaser.Math.Linear(start.x, bounce.x, t);
        const y1 = Phaser.Math.Linear(start.y, bounce.y, t);
        const x2 = Phaser.Math.Linear(bounce.x, contact.x, t);
        const y2 = Phaser.Math.Linear(bounce.y, contact.y, t);

        let x = Phaser.Math.Linear(x1, x2, t);
        let y = Phaser.Math.Linear(y1, y2, t);

        if (type === 'FULL_TOSS') {
            y -= Math.sin(Math.PI * t) * 70;
            return { x, y };
        }

        if (type === 'BOUNCER') {
            const lift = Math.sin(Math.PI * Phaser.Math.Clamp((t - 0.45) / 0.55, 0, 1)) * this.getBallBounceHeight();
            y -= lift;
            return { x, y };
        }

        if (type === 'YORKER') {
            y += Math.sin(Math.PI * t) * 25;
            return { x, y };
        }

        if (type === 'SWING') {
            x += Math.sin(Math.PI * t) * 55;
        }

        const bounceLift = Math.sin(Math.PI * Phaser.Math.Clamp((t - 0.48) / 0.42, 0, 1)) * this.getBallBounceHeight();
        y -= bounceLift;

        return { x, y };
    }

    getPitchBouncePointByType(type) {
        const isLandscape = this.getLayoutMode().isLandscape;
        const pitchX = this.cricket_pitch.x;
        const pitchY = this.cricket_pitch.y;

        const values = {
            FULL_TOSS: {
                x: pitchX + Phaser.Math.Between(isLandscape ? -30 : -20, isLandscape ? 40 : 35),
                y: pitchY - (isLandscape ? 180 : 240)
            },
            BOUNCER: {
                x: pitchX + Phaser.Math.Between(isLandscape ? 40 : 25, isLandscape ? 130 : 95),
                y: pitchY - (isLandscape ? 60 : 90)
            },
            YORKER: {
                x: this.indian_plyer.x + (isLandscape ? 95 : 75),
                y: this.indian_plyer.y + (isLandscape ? 95 : 135)
            },
            GOOD_LENGTH: {
                x: pitchX + Phaser.Math.Between(isLandscape ? -120 : -80, isLandscape ? 70 : 55),
                y: pitchY + Phaser.Math.Between(isLandscape ? -30 : -45, isLandscape ? 34 : 45)
            },
            SLOWER: {
                x: pitchX + Phaser.Math.Between(isLandscape ? -90 : -60, isLandscape ? 40 : 35),
                y: pitchY + Phaser.Math.Between(isLandscape ? -20 : -30, isLandscape ? 25 : 35)
            },
            SWING: {
                x: pitchX + Phaser.Math.Between(isLandscape ? -110 : -70, isLandscape ? 80 : 60),
                y: pitchY + Phaser.Math.Between(isLandscape ? -40 : -55, isLandscape ? 25 : 40)
            }
        };

        let bounce = values[type] || values.GOOD_LENGTH;

        if (type !== 'FULL_TOSS' && this.cricket_pitch) {
            const halfW = (this.cricket_pitch.displayWidth || (1157 * this.cricket_pitch.scale)) / 2;
            const halfH = (this.cricket_pitch.displayHeight || (63 * this.cricket_pitch.scale)) / 2;

            bounce.x = Phaser.Math.Clamp(bounce.x, pitchX - halfW + 15, pitchX + halfW - 15);
            bounce.y = Phaser.Math.Clamp(bounce.y, pitchY - halfH + 8, pitchY + halfH - 8);
        }

        return bounce;
    }

    getBatsmanContactPointByType(type) {
        const isLandscape = this.getLayoutMode().isLandscape;

        const baseX = this.indian_plyer.x + (isLandscape ? 60 : 48);
        const baseY = this.indian_plyer.y + (isLandscape ? 12 : 32);

        if (type === 'BOUNCER') return { x: baseX, y: baseY - (isLandscape ? 95 : 130) };
        if (type === 'YORKER') return { x: baseX + (isLandscape ? 15 : 10), y: baseY + (isLandscape ? 80 : 105) };
        if (type === 'FULL_TOSS') return { x: baseX, y: baseY - (isLandscape ? 55 : 80) };
        if (type === 'SWING') return { x: baseX + Phaser.Math.Between(-35, 35), y: baseY };

        return { x: baseX, y: baseY };
    }

    getDeliverySpeedByType(type) {
        const speeds = this.getNestedConfig('delivery', 'speeds', {});
        const value = Number(speeds[type]);
        return Number.isFinite(value) && value > 0 ? value : ({ FULL_TOSS: 720, BOUNCER: 680, YORKER: 620, GOOD_LENGTH: 760, SLOWER: 980, SWING: 820 }[type] || 760);
    }

    getIdealHitTimeByType(type) {
        const idealTimes = this.getNestedConfig('delivery', 'idealHitTimes', {});
        const value = Number(idealTimes[type]);
        return Number.isFinite(value) ? value : ({ FULL_TOSS: 0.72, BOUNCER: 0.86, YORKER: 0.90, GOOD_LENGTH: 0.82, SLOWER: 0.84, SWING: 0.83 }[type] || 0.82);
    }

    showPitchTapEffect(bounce) {
        const baseScale = this.getBallLayoutScale();

        this.tweens.add({
            targets: this.ball,
            scaleX: baseScale * 1.25,
            scaleY: baseScale * 0.72,
            duration: 70,
            yoyo: true,
            ease: 'Sine.easeOut',
            onComplete: () => {
                if (this.ball) this.ball.setScale(baseScale);
            }
        });

        this.impactFlash
            .setPosition(bounce.x, bounce.y)
            .setScale(0.3)
            .setAlpha(0.55);

        this.tweens.add({
            targets: this.impactFlash,
            scale: 1,
            alpha: 0,
            duration: 220,
            ease: 'Power2'
        });
    }

    resolveDeliveryWithShot(inputType, swipeDistance = 0, holdMs = 0) {
        if (!this.currentDelivery || this.currentDelivery.resolved) return;
        const d = this.currentDelivery;
        const t = Phaser.Math.Clamp((this.time.now - d.startTime) / d.duration, 0, 1);
        const timingError = Math.abs(t - d.idealHitT);
        const perfectWindow = this.getNumberConfig('scoring', 'perfectTimingWindow', 0.075, 0);
        const goodWindow = this.getNumberConfig('scoring', 'goodTimingWindow', 0.15, perfectWindow);
        const okayWindow = this.getNumberConfig('scoring', 'okayTimingWindow', 0.24, goodWindow);
        const powerRun = Math.floor(this.getNumberConfig('scoring', 'powerRun', 6, 1));
        const normalRun = Math.floor(this.getNumberConfig('scoring', 'normalRun', 4, 1));
        const defenceRun = Math.floor(this.getNumberConfig('scoring', 'defenceRun', 1, 1));
        d.resolved = true;
        this.waitingForShot = false;
        let runs = 0;
        let animType = 'MISS';
        if (timingError <= perfectWindow) {
            if (inputType === 'POWER' || swipeDistance > 120 || holdMs < 160) { runs = powerRun; animType = 'POWER'; }
            else if (inputType === 'NORMAL' || inputType === 'TAP') { runs = normalRun; animType = 'NORMAL'; }
            else { runs = defenceRun; animType = 'DEFENCE'; }
        } else if (timingError <= goodWindow) {
            runs = inputType === 'DEFENCE' ? defenceRun : normalRun;
            animType = inputType === 'DEFENCE' ? 'DEFENCE' : 'NORMAL';
        } else if (timingError <= okayWindow) {
            runs = defenceRun;
            animType = 'DEFENCE';
        }
        this.playSelectedShot(animType);
        if (runs > 0) this.handleHitBall(runs);
        else this.handleMissBall();
        this.stopDeliveryFrameOnly();
    }

    showBatBallInteraction() {
        const contact = this.getBatsmanContactPointByType(this.currentBallType);

        this.playSfx('sfx_ball_hit_bat', { volume: 0.9 });

        this.impactFlash
            .setPosition(contact.x, contact.y)
            .setScale(0.4)
            .setAlpha(0.85)
            .setDepth(95);

        this.tweens.add({
            targets: this.impactFlash,
            scale: 1.35,
            alpha: 0,
            duration: 180,
            ease: 'Power2'
        });

        if (this.getBoolConfig('effects', 'cameraShake', true)) this.cameras.main.shake(70, 0.002);
    }

    handleHitBall(runs) {
        const contact = this.getBatsmanContactPointByType(this.currentBallType);
        const isLandscape = this.getLayoutMode().isLandscape;
        const bowlerDirection = Math.sign(this.austrialian_plyer.x - contact.x) || 1;

        let targetX;
        let targetY;
        let duration;

        if (runs === 6) {
            targetX = this.austrialian_plyer.x + bowlerDirection * (isLandscape ? 260 : 170);
            targetY = this.austrialian_plyer.y - (isLandscape ? 430 : 560);
            duration = 560;
        } else if (runs === 4) {
            targetX = this.austrialian_plyer.x + bowlerDirection * (isLandscape ? 360 : 230);
            targetY = this.austrialian_plyer.y + (isLandscape ? 70 : 90);
            duration = 480;
        } else {
            targetX = this.austrialian_plyer.x + bowlerDirection * (isLandscape ? 90 : 60);
            targetY = this.austrialian_plyer.y + (isLandscape ? 55 : 75);
            duration = 330;
        }

        this.tweens.killTweensOf(this.ball);
        this.ball
            .setAlpha(1)
            .setDepth(100);

        // Finish the incoming delivery at the bat. This duration lines up with
        // the contact pose in the batting animation, making the hit readable.
        this.tweens.add({
            targets: this.ball,
            x: contact.x,
            y: contact.y,
            angle: this.ball.angle + 220,
            scale: this.getBallLayoutScale() * 1.18,
            duration: 240,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.ball.setPosition(contact.x, contact.y);
                this.showBatBallInteraction();

                // Hold the contact for a few frames, then send the ball past
                // the bowler instead of back toward the wicketkeeper.
                this.time.delayedCall(55, () => {
                    this.tweens.add({
                        targets: this.ball,
                        x: targetX,
                        y: targetY,
                        angle: this.ball.angle + 850,
                        scale: this.getBallLayoutScale() * (runs === 6 ? 0.75 : 0.95),
                        duration,
                        ease: runs === 6 ? 'Cubic.easeOut' : 'Quad.easeOut',
                        onComplete: () => {
                            this.ball.setAlpha(0);
                            this.waitForNextBall();
                        }
                    });
                });
            }
        });

        this.addRuns(runs, { showFeedback: false, checkEnd: false });
        this.waitForBatsmanShotComplete(() => {
            if (!this.gameActive) return;

            this.showShotFeedback(runs);

            if (this.indiaRuns >= this.targetScore) {
                this._endGame('win');
            }
        });
    }

    handleMissBall() {
        const wicketData = this.getWicketHitData();

        if (wicketData.hit) {
            this.playClearBallHitWicket(wicketData);
        } else {
            const cross = this.getBallCrossWicketPoint();

            this.tweens.add({
                targets: this.ball,
                x: cross.x,
                y: cross.y,
                angle: this.ball.angle + 420,
                duration: 420,
                ease: 'Linear',
                onComplete: () => {
                    this.ball.setAlpha(0);
                    this.addDotBallWithoutText();
                    this.waitForNextBall();
                }
            });
        }
    }

    playClearBallHitWicket(wicketData) {
        if (!this.ball || !this.cricket_wicket__r) return;

        this.tweens.killTweensOf(this.ball);

        this.ball
            .setAlpha(1)
            .setDepth(100)
            .setScale(this.getBallLayoutScale() * 1.25);

        this.tweens.add({
            targets: this.ball,
            x: wicketData.targetX,
            y: wicketData.targetY,
            angle: this.ball.angle + 360,
            duration: 520,
            ease: 'Sine.easeIn',
            onComplete: () => {
                this.ball.setPosition(wicketData.targetX, wicketData.targetY);
                this.ball.setAlpha(1);
                this.showWicketImpactEffect(wicketData.targetX, wicketData.targetY);

                this.time.delayedCall(180, () => {
                    this.waitForBatsmanShotComplete(() => {
                        this.ball.setAlpha(0);
                        this.playWicketFallingAnimation();
                        this.addWicket();
                        this.waitForNextBall();
                    });
                });
            }
        });
    }

    waitForBatsmanShotComplete(onComplete) {
        if (!this.indian_plyer?.anims) {
            if (onComplete) onComplete();
            return;
        }

        const currentAnim = this.indian_plyer.anims.currentAnim;
        const isShotPlaying = this.indian_plyer.anims.isPlaying && currentAnim?.key !== 'bat_idle';

        if (!isShotPlaying) {
            if (onComplete) onComplete();
            return;
        }

        const fallback = this.time.delayedCall(900, () => {
            this.indian_plyer.off('animationcomplete', finish);
            if (onComplete) onComplete();
        });

        const finish = () => {
            fallback.remove(false);
            if (onComplete) onComplete();
        };

        this.indian_plyer.once('animationcomplete', finish);
    }

    showWicketImpactEffect(x, y) {
        if (!this.impactFlash) return;

        this.playSfx('sfx_wicket_down', { volume: 0.9 });

        this.impactFlash
            .setPosition(x, y)
            .setScale(0.45)
            .setAlpha(1)
            .setDepth(110);

        this.tweens.add({
            targets: this.impactFlash,
            scale: 1.6,
            alpha: 0,
            duration: 260,
            ease: 'Power2'
        });

        if (this.getBoolConfig('effects', 'cameraShake', true)) this.cameras.main.shake(220, 0.008);
    }

    playWicketFallingAnimation() {
        if (!this.cricket_wicket__r) return;

        const isLandscape = this.getLayoutMode().isLandscape;

        this.tweens.killTweensOf(this.cricket_wicket__r);
        this.cricket_wicket__r.setOrigin(0.5, 1);
        this.cricket_wicket__r.setDepth(90);

        this.tweens.add({
            targets: this.cricket_wicket__r,
            angle: isLandscape ? -72 : -78,
            x: this.cricket_wicket__r.x - (isLandscape ? 18 : 14),
            y: this.cricket_wicket__r.y + (isLandscape ? 28 : 34),
            duration: 520,
            ease: 'Back.easeIn'
        });
    }

    resetWicketAfterFall() {
        if (!this.cricket_wicket__r) return;

        const mode = this.getLayoutMode();
        const layout = mode.layout.cricket_wicket__r;

        this.cricket_wicket__r.setOrigin(0.5);
        this.cricket_wicket__r.setAngle(layout.angle || 0);
        this.cricket_wicket__r.setPosition(
            layout.x - mode.baseWidth / 2,
            layout.y - mode.baseHeight / 2
        );
        this.cricket_wicket__r.setScale(layout.scale || 1);
        this.cricket_wicket__r.setAlpha(layout.alpha ?? 1);
        this.cricket_wicket__r.setDepth(layout.depth || 5);
    }

    getBatsmanHomePoint() {
        const mode = this.getLayoutMode();
        const layout = mode.layout.indian_plyer;

        return {
            x: layout.x - mode.baseWidth / 2,
            y: layout.y - mode.baseHeight / 2
        };
    }

    resetBatsmanAfterRun() {
        if (!this.indian_plyer) return;

        const home = this.getBatsmanHomePoint();
        this.tweens.killTweensOf(this.indian_plyer);
        this.indian_plyer.setPosition(home.x, home.y);
        this.indian_plyer.setFlipX(false);
        this.indian_plyer.setTexture('batsman_standing', 'standing');
        this.indian_plyer.play('bat_idle', true);
        this.fixIndianPlayerSize();
    }

    waitForNextBall() {
        this.ballInMotion = true;
        this.waitingForShot = false;
        this.currentDelivery = null;

        if (this.deliveryFrameEvent) {
            this.deliveryFrameEvent.remove(false);
            this.deliveryFrameEvent = null;
        }

        this.time.delayedCall(this.nextBallDelay, () => {
            if (!this.gameActive) return;

            this.resetWicketAfterFall();
            this.resetBatsmanAfterRun();

            this.ballInMotion = false;
            this.waitForDeliveryTap();
        });
    }

    waitForDeliveryTap() {
        if (!this.gameActive || this.ballInMotion) return;

        this.waitingForShot = false;
        this.waitingForDeliveryTap = false;
        this.currentDelivery = null;

        this.startNextDelivery();
    }

    stopDeliveryFrameOnly() {
        if (this.deliveryFrameEvent) {
            this.deliveryFrameEvent.remove(false);
            this.deliveryFrameEvent = null;
        }
    }

    getLayoutMode(W, H) {
        if (W !== undefined && H !== undefined) {
            this._lastW = W;
            this._lastH = H;
        } else {
            W = this._lastW !== undefined ? this._lastW : this.scale.width;
            H = this._lastH !== undefined ? this._lastH : this.scale.height;
        }

        const ratio = W / H;

        const isLandscape = ratio >= 1.18;
        const layout = isLandscape ? this.LAYOUT_LANDSCAPE : this.LAYOUT_PORTRAIT;
        const baseWidth = isLandscape ? 1920 : 1080;
        const baseHeight = isLandscape ? 1080 : 1920;

        return { isLandscape, layout, baseWidth, baseHeight };
    }

    getBallLayoutScale() {
        const mode = this.getLayoutMode();
        return mode.layout.ball?.scale || 0.55;
    }

    forceLeftHandBowlerFacing() {
        if (!this.austrialian_plyer || !this.indian_plyer) return;

        const batsmanIsLeft = this.indian_plyer.x < this.austrialian_plyer.x;

        if (batsmanIsLeft) {
            this.austrialian_plyer.setFlipX(true);
        } else {
            this.austrialian_plyer.setFlipX(false);
        }
    }

    getBowlerReleasePoint() {
        const isLandscape = this.getLayoutMode().isLandscape;

        return {
            x: this.austrialian_plyer.x - (isLandscape ? 72 : 62),
            y: this.austrialian_plyer.y - (isLandscape ? 78 : 100)
        };
    }

    getBallBounceHeight() {
        const type = this.currentBallType;
        const isLandscape = this.getLayoutMode().isLandscape;
        const bounceCfg = this.getNestedConfig('delivery', 'bounceHeight', {});
        const orientationCfg = isLandscape ? (bounceCfg.landscape || {}) : (bounceCfg.portrait || {});
        const configured = Number(orientationCfg[type]);
        if (Number.isFinite(configured)) return configured;
        if (type === 'FULL_TOSS') return 0;
        if (type === 'BOUNCER') return isLandscape ? 130 : 170;
        if (type === 'YORKER') return isLandscape ? 15 : 22;
        if (type === 'SLOWER') return isLandscape ? 36 : 48;
        if (type === 'SWING') return isLandscape ? 58 : 72;
        return isLandscape ? 46 : 62;
    }

    getWicketHitData() {
        const wicket = this.cricket_wicket__r;
        const wicketW = Math.max(30, wicket.displayWidth || wicket.width || 50);
        const wicketH = Math.max(80, wicket.displayHeight || wicket.height || 120);

        const targetX = wicket.x;
        const targetY = wicket.y - wicketH * 0.25;

        return {
            hit: Phaser.Math.Between(1, 100) <= this.getNumberConfig('gameplay', 'wicketHitChance', 45, 0, 100),
            targetX,
            targetY,
            wicketW,
            wicketH
        };
    }

    getBallCrossWicketPoint() {
        const wicket = this.cricket_wicket__r;
        const isLandscape = this.getLayoutMode().isLandscape;

        return {
            x: wicket.x + (isLandscape ? -220 : -150),
            y: wicket.y + Phaser.Math.Between(-35, 45)
        };
    }

    addDotBallWithoutText() { }

    addWicket() {
        if (!this.gameActive) return;

        this.indiaWickets++;
        this.showWicketFeedback();

        if (this.indiaWickets >= this.maxWickets) {
            this._endGame('wicket');
        }
    }

    addRuns(run, options = {}) {
        if (!this.gameActive) return;

        const showFeedback = options.showFeedback !== false;
        const checkEnd = options.checkEnd !== false;

        if (showFeedback) this.showShotFeedback(run);
        this.indiaRuns += run;
        this.updateBatsmanRuns();

        if (checkEnd && this.indiaRuns >= this.targetScore) {
            this._endGame('win');
        }
    }

    getShotFeedback(run) {
        const powerRun = Math.floor(this.getNumberConfig('scoring', 'powerRun', 6, 1));
        const normalRun = Math.floor(this.getNumberConfig('scoring', 'normalRun', 4, 1));
        const defenceRun = Math.floor(this.getNumberConfig('scoring', 'defenceRun', 1, 1));
        if (run === powerRun) return 'Into the stands!';
        if (run === normalRun) return 'What a hit!';
        if (run === defenceRun) return 'Clean!';
        return '';
    }

    showWicketFeedback() {
        this.showCustomFeedback('Boom!');
    }

    showShotFeedback(run) {
        const label = this.getShotFeedback(run);
        if (label) this.showCustomFeedback(label);
    }

    showCustomFeedback(label) {
        if (!this.shotFeedbackText || !this.getBoolConfig('effects', 'showShotFeedback', true)) return;

        this.tweens.killTweensOf(this.shotFeedbackText);

        if (this.shotFeedbackHideEvent) {
            this.shotFeedbackHideEvent.remove(false);
            this.shotFeedbackHideEvent = null;
        }

        this.positionShotFeedback();

        this.shotFeedbackText
            .setText(label)
            .setScale(0.85)
            .setAlpha(1)
            .setDepth(90);

        this.tweens.add({
            targets: this.shotFeedbackText,
            scale: 1,
            duration: 160,
            ease: 'Back.Out',
            onComplete: () => {
                this.shotFeedbackHideEvent = this.time.delayedCall(650, () => {
                    this.tweens.add({
                        targets: this.shotFeedbackText,
                        alpha: 0,
                        y: this.shotFeedbackText.y - 24,
                        duration: 300,
                        ease: 'Power2'
                    });
                });
            }
        });
    }

    fixIndianPlayerSize() {
        if (!this.indian_plyer) return;

        const isLandscape = this.getLayoutMode().isLandscape;
        const size = isLandscape ? this.PLAYER_SIZE.landscape : this.PLAYER_SIZE.portrait;
        const layoutScale = this.getActiveLayoutValue('indian_plyer', 'scale') || 1;
        const spriteSheetScale = this.indian_plyer.texture.key === 'batting_sheet'
            ? this.BATSMAN_SHOT_SPRITESHEET_SCALE
            : 1;

        this.indian_plyer.setDisplaySize(
            size.width * layoutScale * spriteSheetScale,
            size.height * layoutScale * spriteSheetScale
        );
    }

    fixBowlerSize() {
        if (!this.austrialian_plyer) return;

        const isLandscape = this.getLayoutMode().isLandscape;
        const size = isLandscape ? this.BOWLER_SIZE.landscape : this.BOWLER_SIZE.portrait;
        const layoutScale = this.getActiveLayoutValue('austrialian_plyer', 'scale') || 1;

        const frameHeight = this.austrialian_plyer.frame.realHeight || this.austrialian_plyer.height;
        const uniformScale = (size.height * layoutScale) / frameHeight;
        this.austrialian_plyer.setScale(uniformScale);
        this.faceBowlerToBatsman();
    }

    faceBowlerToBatsman() {
        this.forceLeftHandBowlerFacing();
    }

    setupGame() {
        this.refreshDynamicSettings();
        this.gameActive = false;
        this.targetScore = this.getTargetScoreFromConfig();
        this.indiaRuns = 0;
        this.indiaWickets = 0;
        this.ballsBowled = 0;
        this.timeLeft = Math.floor(this.getNumberConfig('gameplay', 'timerDuration', 60, 1));
        this.ballInMotion = false;
        this.waitingForShot = false;
        this.waitingForDeliveryTap = false;
        this.selectedShot = 'MISS';
        this.currentBallType = this.ballTypes.includes('GOOD_LENGTH') ? 'GOOD_LENGTH' : this.ballTypes[0];

        this.hideHandPointer();
        this.resetBatsmanAfterRun();

        this.timerText.setText(String(this.timeLeft));
        this.timerText.setColor('#00FF00');

        this.updateChaseTarget();
        this.updateBatsmanRuns();

        const delay = this.getNumberConfig('countdown', 'firstDelay', 300, 0);
        this.time.delayedCall(delay, () => this._showCountdown());
    }

    updateChaseTarget() {
        this.chaseText.setText(String(this.targetScore)).setAlpha(1).setDepth(30);
    }

    updateBatsmanRuns() {
        this.runsText.setText(String(this.indiaRuns)).setAlpha(1).setDepth(30);
    }

    _showCountdown() {
        if (!this.getBoolConfig('countdown', 'enabled', true)) {
            this.countdownText.setAlpha(0);
            this._startGame();
            return;
        }
        const configuredSteps = this.getNestedConfig('countdown', 'steps', ['3', '2', '1', 'GO!']);
        const steps = Array.isArray(configuredSteps) && configuredSteps.length ? configuredSteps.map(String) : ['3', '2', '1', 'GO!'];
        const stepDuration = this.getNumberConfig('countdown', 'stepDuration', 700, 50);
        const goHold = this.getNumberConfig('countdown', 'goHold', 400, 0);
        let i = 0;
        const next = () => {
            if (i >= steps.length) {
                this.countdownText.setAlpha(0);
                this._startGame();
                return;
            }
            const label = steps[i++];
            const isGo = label.toUpperCase() === 'GO!';
            this.countdownText.setText(label).setColor(isGo ? '#52b788' : '#FFD700').setScale(1.6).setAlpha(1).setDepth(70);
            this.tweens.add({
                targets: this.countdownText,
                scale: 1,
                alpha: isGo ? 1 : 0,
                duration: stepDuration,
                ease: 'Power2',
                onComplete: () => this.time.delayedCall(isGo ? goHold : 100, next)
            });
        };
        next();
    }

    _startGame() {
        this.showHandPointerForThreeSeconds(() => {
            this.gameActive = true;
            if (this.getBoolConfig('audio', 'crowd', true)) this.startCrowdSound();
            this._startTimer();
            this._startDeliveryLoop();
        });
    }

    _startDeliveryLoop() {
        this._stopDeliveryLoop();
        this.waitForDeliveryTap();
    }

    _stopDeliveryLoop() {
        if (this.deliveryEvent) {
            this.deliveryEvent.remove(false);
            this.deliveryEvent = null;
        }

        if (this.deliveryFrameEvent) {
            this.deliveryFrameEvent.remove(false);
            this.deliveryFrameEvent = null;
        }

        this.ballInMotion = false;
        this.waitingForShot = false;
        this.waitingForDeliveryTap = false;
        this.currentDelivery = null;

        if (this.ball) {
            this.tweens.killTweensOf(this.ball);
            this.ball.setAlpha(0);
        }
    }

    showHandPointerForThreeSeconds(onComplete) {
        if (!this.hand_pointer || !this.indian_plyer) {
            if (onComplete) onComplete();
            return;
        }

        this.isHandPointerActive = true;
        this.repositionHandPointer();

        this.time.delayedCall(this.getNumberConfig('gameplay', 'handPointerDuration', 3000, 0), () => {
            if (this.hand_pointer) {
                this.hideHandPointer();
            }
            if (onComplete) onComplete();
        });
    }

    repositionHandPointer() {
        if (!this.hand_pointer || !this.isHandPointerActive) return;

        const isLandscape = this.getLayoutMode().isLandscape;
        const tapX = this.indian_plyer.x + (isLandscape ? 62 : 54);
        const tapY = this.indian_plyer.y - (isLandscape ? 16 : 8);
        const baseScale = this.getActiveLayoutValue('hand_pointer', 'scale') || 1;
        const tapOffsetY = isLandscape ? 18 : 24;

        this.tweens.killTweensOf(this.hand_pointer);

        this.hand_pointer
            .setPosition(tapX, tapY)
            .setScale(baseScale)
            .setAlpha(1)
            .setDepth(75);

        this.tweens.add({
            targets: this.hand_pointer,
            y: tapY + tapOffsetY,
            scaleX: baseScale * 0.82,
            scaleY: baseScale * 0.82,
            alpha: 0.6,
            repeat: -1,
            yoyo: true,
            duration: 360,
            hold: 90,
            repeatDelay: 160,
            ease: 'Sine.easeInOut',
        });
    }

    hideHandPointer() {
        this.isHandPointerActive = false;
        if (!this.hand_pointer) return;

        this.tweens.killTweensOf(this.hand_pointer);
        this.hand_pointer
            .setScale(this.getActiveLayoutValue('hand_pointer', 'scale') || 1)
            .setAlpha(0);
    }

    getActiveLayoutValue(key, prop) {
        return this.getLayoutMode().layout[key]?.[prop];
    }

    _startTimer() {
        if (this.timerEvent) this.timerEvent.remove();

        this.timerEvent = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                this.timeLeft = Math.max(0, this.timeLeft - 1);
                this.timerText.setText(String(this.timeLeft));

                if (this.timeLeft <= 10) this.timerText.setColor('#e63946');
                else if (this.timeLeft <= 20) this.timerText.setColor('#f4a261');

                if (this.timeLeft <= 0) this._endGame('timeout');
            }
        });
    }

    _stopTimer() {
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }
    }

    positionTimer() {
        const centerBoxYOffset = this.scoreboard_with_text.displayHeight * 0.13;
        this.timerText.setPosition(this.scoreboard_with_text.x, this.scoreboard_with_text.y + centerBoxYOffset);
        this.timerText.setScale(1).setDepth(30).setAlpha(1);
    }

    positionChaseTarget() {
        const rightBoxXOffset = this.scoreboard_with_text.displayWidth * 0.29;
        const boxYOffset = this.scoreboard_with_text.displayHeight * 0.13;

        this.chaseText.setPosition(
            this.scoreboard_with_text.x + rightBoxXOffset,
            this.scoreboard_with_text.y + boxYOffset
        );

        this.chaseText.setScale(1).setDepth(30).setAlpha(1);
    }

    positionBatsmanRuns() {
        const leftBoxXOffset = this.scoreboard_with_text.displayWidth * -0.29;
        const boxYOffset = this.scoreboard_with_text.displayHeight * 0.13;

        this.runsText.setPosition(
            this.scoreboard_with_text.x + leftBoxXOffset,
            this.scoreboard_with_text.y + boxYOffset
        );

        this.runsText.setScale(1).setDepth(30).setAlpha(1);
    }

    positionCountdown() {
        const midX = (this.scoreboard_with_text.x + this.cricket_pitch.x) / 2;
        const midY = (this.scoreboard_with_text.y + this.cricket_pitch.y) / 2;

        this.countdownText.setPosition(midX, midY);
        this.countdownText.setScale(1);
        this.countdownText.setDepth(70);
    }

    positionShotFeedback() {
        const midX = (this.scoreboard_with_text.x + this.cricket_pitch.x) / 2;
        const midY = (this.scoreboard_with_text.y + this.cricket_pitch.y) / 2;

        this.shotFeedbackText
            .setPosition(midX, midY + 70)
            .setDepth(90);
    }

    loadAllTheAssets() {
        const assets = [
            { key: 'cricket_pitch', path: 'assets/CRICKET-PITCH.png' },
            { key: 'hit_it_mockup', path: 'assets/Hit it mockup.jpg' },
            { key: 'hit_it_logo', path: 'assets/Hit-It-logo.png' },
            { key: 'australia_flag', path: 'assets/australia_flag.png' },
            { key: 'austrialian_plyer', path: 'assets/Hit_It_All_BatandBall/Baller_Sprite/standing-with-cricket-ball.png' },
            { key: 'ball', path: 'assets/ball.png' },
            { key: 'boom', path: 'assets/boom.png' },
            { key: 'clean', path: 'assets/clean.png' },
            { key: 'cricket_stadium', path: 'assets/cricket-stadium.png' },
            { key: 'cricket_wicket__l', path: 'assets/cricket-wicket-_L.png' },
            { key: 'cricket_wicket__r', path: 'assets/cricket-wicket-_r.png' },
            { key: 'ground_a', path: 'assets/ground_a.png' },
            { key: 'hand_pointer', path: 'assets/hand-pointer.png' },
            { key: 'india_vs_austrila_panel', path: 'assets/india-Vs-Austrila-panel.png' },
            { key: 'india_flag', path: 'assets/india-flag.png' },
            { key: 'play_now', path: 'assets/play-now.png' },
            { key: 'scoreboard', path: 'assets/scoreboard.png' },
            { key: 'scoreboard_with_text', path: 'assets/scoreboard_with-text.png' },
            { key: 'skay_a', path: 'assets/skay_a.png' },
            { key: 'stadium_a', path: 'assets/stadium_a.png' },
            { key: 'swipe_to_play', path: 'assets/swipe-to-play.png' },
            { key: 'what_a_hit', path: 'assets/what-a-hit.png' }
        ];

        for (const asset of assets) {
            this.load.image(asset.key, asset.path);
        }

        this.load.image(
            'batsman_standing',
            'assets/Hit_It_All_BatandBall/Batting Sprite/bat01_standing.png'
        );
        this.load.image(
            'batting_sheet',
            'assets/Hit_It_All_BatandBall/Batting Sprite/batting Sprite Image.png'
        );
        this.load.image(
            'bowling_sheet',
            'assets/Hit_It_All_BatandBall/Baller_Sprite/Baller_Sprite.png'
        );

        this.load.audio('sfx_wicket_down', 'assets/sfx/wicket down.mp3');
        this.load.audio('sfx_crowd', 'assets/sfx/vishiv-crowd-cheering-in-stadium-435357.mp3');
        this.load.audio('sfx_ball_hit_bat', 'assets/sfx/ball hit bat.mp3');
        this.load.audio('sfx_game_lose', 'assets/sfx/game lose.mp3');
        this.load.audio('sfx_game_win', 'assets/sfx/game win.mp3');
        this.load.audio('sfx_play_click', 'assets/sfx/matthewvakaliuk73627-mouse-click-290204.mp3');
    }

    playSfx(key, config = {}) {
        if (!this.getBoolConfig('audio', 'enabled', true)) return;
        const audioMap = { sfx_wicket_down: 'wicket', sfx_ball_hit_bat: 'ballHit', sfx_game_win: 'win', sfx_game_lose: 'lose' };
        const audioKey = audioMap[key];
        if (audioKey && !this.getBoolConfig('audio', audioKey, true)) return;
        if (!this.sound || !this.cache.audio.exists(key)) return;
        const volume = config.volume === undefined ? this.getNumberConfig('audio', 'sfxVolume', 0.9, 0, 1) : config.volume;
        this.sound.play(key, { ...config, volume });
    }

    startCrowdSound() {
        if (!this.sound || !this.cache.audio.exists('sfx_crowd')) return;

        if (!this.crowdSound) {
            this.crowdSound = this.sound.add('sfx_crowd', {
                loop: true,
                volume: this.getNumberConfig('audio', 'crowdVolume', 0.28, 0, 1)
            });
        }

        if (!this.crowdSound.isPlaying) {
            this.crowdSound.play();
        }
    }

    stopCrowdSound() {
        if (this.crowdSound && this.crowdSound.isPlaying) {
            this.crowdSound.stop();
        }
    }

    reflowForResize(gameSize) {
        const W = (gameSize && typeof gameSize.width === 'number') ? gameSize.width : this.scale.width;
        const H = (gameSize && typeof gameSize.height === 'number') ? gameSize.height : this.scale.height;
        const mode = this.getLayoutMode(W, H);
        const layout = mode.layout;
        const baseWidth = mode.baseWidth;
        const baseHeight = mode.baseHeight;

        const coverScale = Math.max(W / baseWidth, H / baseHeight);
        const fallbackScale = Math.min(W / baseWidth, H / baseHeight);

        this.backgroundContainer.setPosition(W / 2, H / 2).setScale(coverScale);
        this.mainContainer.setPosition(0, 0).setScale(1);

        this.fieldContainer.setPosition(0, 0).setScale(1);
        this.flagContainer.setPosition(0, 0).setScale(1);
        this.scoreboardContainer.setPosition(0, 0).setScale(1);
        this.logoContainer.setPosition(0, 0).setScale(1);
        this.overlayContainer.setPosition(0, 0).setScale(1);

        for (const key in layout) {
            if (!this[key]) continue;

            const { x, y, scale, alpha = 1, depth, angle = 0 } = layout[key];

            const displayX = x - baseWidth / 2;
            const displayY = y - baseHeight / 2;

            if (key === 'ball' && this.ballInMotion) {
                // keep current position and alpha
            } else if (key === 'hand_pointer' && this.isHandPointerActive) {
                // reposition handled later
            } else {
                this[key].setPosition(displayX, displayY);
                this[key].setAlpha(alpha);
                if (scale !== undefined) this[key].setScale(scale);
            }

            this[key].setAngle(angle);

            if (depth !== undefined) {
                this[key].setDepth(depth);
            }
        }

        this.fixIndianPlayerSize();
        this.fixBowlerSize();
        this.repositionHandPointer();

        this.positionCountdown();
        this.positionTimer();
        this.positionChaseTarget();
        this.positionBatsmanRuns();
        this.positionShotFeedback();

        const gameplayBounds = this.getGameplayBounds();
        const marginX = Math.max(16, W * 0.025);
        const marginY = Math.max(16, H * 0.025);
        const responsiveScale = gameplayBounds
            ? Math.min((W - marginX * 2) / gameplayBounds.width, (H - marginY * 2) / gameplayBounds.height)
            : fallbackScale;
        const finalScale = Phaser.Math.Clamp(responsiveScale, 0.1, coverScale);

        this.currentFitScale = finalScale;

        if (gameplayBounds) {
            const centerX = gameplayBounds.x + gameplayBounds.width / 2;
            const centerY = gameplayBounds.y + gameplayBounds.height / 2;
            this.mainContainer.setPosition(
                W / 2 - centerX * finalScale,
                H / 2 - centerY * finalScale
            );
        } else {
            this.mainContainer.setPosition(W / 2, H / 2);
        }

        this.mainContainer.setScale(finalScale);
        this.sortContainerDepths();
    }

    getGameplayBounds() {
        const keys = [
            'hit_it_logo',
            'india_flag',
            'australia_flag',
            'scoreboard_with_text',
            'cricket_pitch',
            'cricket_wicket__l',
            'cricket_wicket__r',
            'indian_plyer',
            'austrialian_plyer'
        ];

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        keys.forEach((key) => {
            const obj = this[key];
            if (!obj || obj.alpha === 0) return;

            const width = obj.displayWidth || obj.width || 0;
            const height = obj.displayHeight || obj.height || 0;
            const originX = obj.originX ?? 0.5;
            const originY = obj.originY ?? 0.5;
            const left = obj.x - width * originX;
            const top = obj.y - height * originY;
            const right = left + width;
            const bottom = top + height;

            minX = Math.min(minX, left);
            minY = Math.min(minY, top);
            maxX = Math.max(maxX, right);
            maxY = Math.max(maxY, bottom);
        });

        if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

        return {
            x: minX,
            y: minY,
            width: Math.max(1, maxX - minX),
            height: Math.max(1, maxY - minY)
        };
    }

    sortContainerDepths() {
        this.backgroundContainer.sort('depth');
        this.fieldContainer.sort('depth');
        this.flagContainer.sort('depth');
        this.scoreboardContainer.sort('depth');
        this.logoContainer.sort('depth');
        this.overlayContainer.sort('depth');

        this.backgroundContainer.setDepth(1);
        this.mainContainer.setDepth(2);
        this.fieldContainer.setDepth(1);
        this.flagContainer.setDepth(10);
        this.scoreboardContainer.setDepth(20);
        this.logoContainer.setDepth(40);
        this.overlayContainer.setDepth(80);
    }

    _endGame(reason) {
        if (this.endingGame) return;
        this.endingGame = true;

        this._stopTimer();
        this._stopDeliveryLoop();
        this.stopCrowdSound();
        this.gameActive = false;

        const endData = {
            reason,
            runs: this.indiaRuns,
            target: this.targetScore
        };

        if (!this.cameras?.main) {
            this.scene.start('End', endData);
            return;
        }

        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('End', endData);
        });
        this.cameras.main.fadeOut(650, 0, 0, 0);
    }
}
