class UIEditor {
    constructor(
        scene,
        {
            enabled = false,
            keys = [],
            gridSize = 10,
            infoX = 10,
            infoY = 10,
            outlineColor = 0x00ff00,
            outlineThickness = 3,
            depth = 999999,
            fileName = "start.js",
            uiVisible = true,
            sceneKeys = ["Start", "Game", "End"],
        } = {},
    ) {
        this.scene = scene;
        this.enabled = enabled;
        this.keysList = keys;
        this.gridSize = gridSize;
        this.infoX = infoX;
        this.infoY = infoY;
        this.outlineColor = outlineColor;
        this.outlineThickness = outlineThickness;
        this.overlayDepth = depth;
        this.fileName = fileName;
        this.uiVisible = uiVisible;

        this.selected = null;
        this.snapEnabled = false;
        this.boundUpdate = this.update.bind(this);

        if (this.enabled) {
            this.init();
        }
    }

    init() {
        const scene = this.scene;

        this.keysList.forEach((key) => {
            const obj = scene[key];
            if (!obj) return;
            obj.setInteractive();
            scene.input.setDraggable(obj);
            obj.__editKey = key;
        });

        this.editorGfx = scene.add.graphics().setDepth(this.overlayDepth);

        this.editorText = scene.add
            .text(this.infoX, this.infoY, "", {
                fontFamily: "Arial",
                fontSize: "18px",
                color: "#ffffff",
                backgroundColor: "rgba(0,0,0,0.45)",
                padding: { x: 10, y: 6 },
            })
            .setScrollFactor(0)
            .setDepth(this.overlayDepth);

        this.keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
        });

        this.onPointerDown = (pointer) => {
            if (!this.enabled) return;
            const hits = scene.input.hitTestPointer(pointer);
            const hitEditable = hits.some((obj) => obj.__editKey !== undefined);
            if (!hitEditable) {
                this.selected = null;
                this.renderUI();
            }
        };

        this.onGameObjectDown = (pointer, gameObject) => {
            if (!this.enabled) return;
            this.selectObject(gameObject);
        };

        this.onDrag = (pointer, gameObject, dragX, dragY) => {
            if (!this.enabled) return;
            if (!gameObject.__editKey) return;

            gameObject.x = Math.round(dragX);
            gameObject.y = Math.round(dragY);

            this.syncLinkedObjects(gameObject);
            this.persistToLayout(gameObject);
            this.renderUI();
        };

        this.onWheel = (pointer, gameObjects, deltaX, deltaY) => {
            if (!this.enabled || !this.selected) return;
            const step = 0.02;
            const dir = deltaY > 0 ? -1 : 1;
            const s = Phaser.Math.Clamp(
                (this.selected.scaleX || 1) + dir * step,
                0.02,
                10,
            );
            this.selected.setScale(s);
            this.persistToLayout(this.selected);
            this.renderUI();
        };

        this.onKeyDown = (event) => {


            const key = event.key;
            const shift = event.shiftKey;

            // Toggle Editor ON/OFF
            if (key === "e" || key === "E") {
                this.toggleEditor();
                return;
            }

            // Scene Switching
            if (key === "1") {
                this.switchScene("Start");
                return;
            }
            if (key === "2") {
                this.switchScene("Game");
                return;
            }
            if (key === "3") {
                this.switchScene("End");
                return;
            }

            if (!this.enabled) return;

            // Scale UP
            if ((key === "=" || key === "+") && this.selected) {
                this.selected.setScale((this.selected.scaleX || 1) + 0.05);
                this.persistToLayout(this.selected);
                this.renderUI();
            }

            // Scale DOWN
            if ((key === "-" || key === "_") && this.selected) {
                this.selected.setScale(
                    Math.max(0.02, (this.selected.scaleX || 1) - 0.05),
                );
                this.persistToLayout(this.selected);
                this.renderUI();
            }

            // Depth UP
            if ((key === "d" || key === "D") && !shift && this.selected) {
                this.selected.setDepth((this.selected.depth || 0) + 1);
                this.persistToLayout(this.selected);
                this.renderUI();
            }

            // Depth DOWN
            if ((key === "d" || key === "D") && shift && this.selected) {
                this.selected.setDepth((this.selected.depth || 0) - 1);
                this.persistToLayout(this.selected);
                this.renderUI();
            }

            // Rotation
            if ((key === "r" || key === "R") && this.selected) {
                this.selected.rotation += shift ? 0.05 : -0.05;
                this.persistToLayout(this.selected);
                this.renderUI();
            }

            // Grid Snap toggle
            if (key === "g" || key === "G") {
                this.snapEnabled = !this.snapEnabled;
                this.renderUI();
            }

            // Save to file
            if ((key === "s" || key === "S") && shift) {
                this.saveLayoutToFile();
            }

            // Toggle UI
            if (key === "h" || key === "H") {
                this.toggleUI();
            }
        };

        scene.input.on("pointerdown", this.onPointerDown);
        scene.input.on("gameobjectdown", this.onGameObjectDown);
        scene.input.on("drag", this.onDrag);
        scene.input.on("wheel", this.onWheel);
        scene.input.keyboard.on("keydown", this.onKeyDown);
        scene.events.on("update", this.boundUpdate);

        if (typeof scene.reflowForResize === "function") {
            scene.reflowForResize({
                width: scene.scale.width,
                height: scene.scale.height,
            });
        }

        this.renderUI();
    }

    setKeys(keys = []) {
        this.keysList = keys;
        this.keysList.forEach((key) => {
            const obj = this.scene[key];
            if (!obj) return;
            obj.setInteractive();
            this.scene.input.setDraggable(obj);
            obj.__editKey = key;
        });
        this.renderUI();
    }

    selectObject(obj) {
        if (!obj || !obj.__editKey) return;
        this.selected = obj;
        this.renderUI();
    }

    applySnap(obj) {
        obj.x = Math.round(obj.x / this.gridSize) * this.gridSize;
        obj.y = Math.round(obj.y / this.gridSize) * this.gridSize;
    }

    getActiveLayout() {
        const isLandscape = this.scene.scale.width > this.scene.scale.height;
        return isLandscape
            ? this.scene.LAYOUT_LANDSCAPE
            : this.scene.LAYOUT_PORTRAIT;
    }

    persistToLayout(obj) {
        const key = obj.__editKey;
        if (!key) return;

        if (this.snapEnabled) this.applySnap(obj);

        const layout = this.getActiveLayout();
        if (!layout[key]) layout[key] = {};

        layout[key].x = Math.round(obj.x);
        layout[key].y = Math.round(obj.y);
        layout[key].scale = Number((obj.scaleX || 1).toFixed(3));
        layout[key].angle = Number((obj.angle || 0).toFixed(3));
        layout[key].alpha = Number((obj.alpha ?? 1).toFixed(3));
        layout[key].depth = obj.depth ?? 0;

        // NEW
        layout[key].__edited = true;

        this.syncLinkedObjects(obj);
    }

    exportCurrentLayoutJSON() {
        const isLandscape = this.scene.scale.width > this.scene.scale.height;
        const layout = this.getActiveLayout();
        const varName = isLandscape ? "LAYOUT_LANDSCAPE" : "LAYOUT_PORTRAIT";

        const baseW = isLandscape ? 1920 : 1080;
        const baseH = isLandscape ? 1080 : 1920;

        const lines = Object.keys(layout)
            .map((k) => {
                const v = { ...layout[k] };
                if (!v) return null;

                if (v.__edited) {
                    v.x = Math.round(v.x + baseW / 2);
                    v.y = Math.round(v.y + baseH / 2);
                }

                delete v.__edited;

                const parts = [];
                if (v.x !== undefined) parts.push(`x: ${v.x}`);
                if (v.y !== undefined) parts.push(`y: ${v.y}`);
                if (v.scale !== undefined) parts.push(`scale: ${v.scale}`);
                if (v.angle !== undefined && v.angle !== 0)
                    parts.push(`angle: ${v.angle}`);
                if (v.alpha !== undefined && v.alpha !== 1)
                    parts.push(`alpha: ${v.alpha}`);
                if (v.depth !== undefined && v.depth !== 0)
                    parts.push(`depth: ${v.depth}`);

                return `            ${k}: { ${parts.join(", ")} },`;
            })
            .filter(Boolean);

        return {
            varName,
            layoutCode: `this.${varName} = {\n${lines.join("\n")}\n        };`,
        };
    }

    async saveLayoutToFile() {
        const { varName, layoutCode } = this.exportCurrentLayoutJSON();

        console.log(layoutCode);

        const threadId = window.JUSTGAMEADS_THREAD_ID;
        const apiBase = window.JUSTGAMEADS_API_URL || "http://localhost:8000";

        if (!threadId) {
            this.showToast("No session — open this game via the chat first", "error");
            return;
        }

        try {
            const response = await fetch(`${apiBase}/api/v1/save-layout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    layoutName: varName,
                    layoutCode: layoutCode,
                    fileName: this.fileName,
                    thread_id: threadId,
                }),
            });

            const result = await response.json();
            if (result.success) {
                this.showToast(`${varName} saved to ${this.fileName}`, "success");
            } else {
                this.showToast(`Save failed: ${result.detail || "unknown error"}`, "error");
            }
        } catch (err) {
            this.showToast(`Could not reach the game server`, "error");
        }
    }

    showToast(message, type = "success") {
        const colors = {
            success: { bg: 0x1a7a3a, border: 0x2ecc71, icon: "✅" },
            error: { bg: 0x7a1a1a, border: 0xe74c3c, icon: "❌" },
            info: { bg: 0x1a3a7a, border: 0x3498db, icon: "📋" },
            warning: { bg: 0x7a5a1a, border: 0xf39c12, icon: "⚠️" },
        };

        const { bg, border, icon } = colors[type] || colors.info;

        const W = this.scene.scale.width;
        const H = this.scene.scale.height;
        const TOAST_W = 420;
        const TOAST_H = 64;
        const PADDING = 20;
        const RADIUS = 10;

        // Final resting position — bottom right corner
        const finalX = W - TOAST_W - PADDING;
        const finalY = H - TOAST_H - PADDING;

        // Draw gfx at local 0,0 (container will position it)
        const gfx = this.scene.add.graphics();

        // Shadow
        gfx.fillStyle(0x000000, 0.35);
        gfx.fillRoundedRect(4, 4, TOAST_W, TOAST_H, RADIUS);

        // Background
        gfx.fillStyle(bg, 1);
        gfx.fillRoundedRect(0, 0, TOAST_W, TOAST_H, RADIUS);

        // Border
        gfx.lineStyle(2, border, 1);
        gfx.strokeRoundedRect(0, 0, TOAST_W, TOAST_H, RADIUS);

        // Left accent bar
        gfx.fillStyle(border, 1);
        gfx.fillRoundedRect(0, 0, 5, TOAST_H, RADIUS);

        // Text at local position inside container
        const text = this.scene.add
            .text(20, TOAST_H / 2, `${icon}  ${message}`, {
                fontFamily: "Arial",
                fontSize: "16px",
                color: "#ffffff",
                fontStyle: "bold",
            })
            .setOrigin(0, 0.5);

        // Container starts BELOW screen, slides UP to finalY
        const container = this.scene.add.container(finalX, H + TOAST_H, [
            gfx,
            text,
        ]);
        container.setDepth(99999999).setScrollFactor(0);

        // Slide in
        this.scene.tweens.add({
            targets: container,
            y: finalY,
            duration: 300,
            ease: "Back.Out",
            onComplete: () => {
                // Hold 2.5s then slide out
                this.scene.time.delayedCall(2500, () => {
                    this.scene.tweens.add({
                        targets: container,
                        y: H + TOAST_H,
                        alpha: 0,
                        duration: 300,
                        ease: "Power2.In",
                        onComplete: () => container.destroy(),
                    });
                });
            },
        });
    }

    renderUI() {
        if (!this.enabled || !this.uiVisible) {
            if (this.editorGfx) this.editorGfx.clear();
            if (this.editorText) this.editorText.setVisible(false);
            return;
        }

        this.editorText.setVisible(true);
        this.editorGfx.clear();

        const sel = this.selected;
        if (sel) {
            const b = sel.getBounds();
            this.editorGfx.lineStyle(this.outlineThickness, this.outlineColor, 1);
            this.editorGfx.strokeRect(b.x, b.y, b.width, b.height);
        }

        const savedPos = sel ? this.getSavedPosition(sel) : null;

        const layoutType =
            this.scene.scale.width > this.scene.scale.height
                ? "LANDSCAPE"
                : "PORTRAIT";

        const divider = "  ════════════════════════";
        const thin = "  ────────────────────────";

        const keymap = [
            "",
            divider,
            "        ⚙  CONTROLS",
            divider,
            "",
            "  📦  MOVE",
            thin,
            "  ← ↑ → ↓                :  Move ",
            "  SHIFT  +  Arrows  : Move Fast ",
            "",
            "  🔍  SCALE",
            thin,
            "  +                    :  Scale Up",
            "  -                     :  Scale Down",
            "  Scroll Wheel  :  Scale Up / Down",
            "",
            "  🗂  LAYER",
            thin,
            "  D                   : Bring Forward",
            "  SHIFT  +  D  :  Send Backward",
            "",
            "  🔄  ROTATION",
            thin,
            "  R                  :  Rotate Clockwise",
            "  SHIFT  +  R :  Rotate Anti-Clockwise",
            "",
            "  🎬  SCENES",
            thin,
            "  1                  :  Open Start Scene",
            "  2                  :  Open Game Scene",
            "  3                  :  Open End Scene",
            "",
            "  ⚡  ACTIONS",
            thin,
            `  G                  :  Grid Snap  [ ${this.snapEnabled ? "ON  ✓" : "OFF ✗"} ]`,
            `  SHIFT  +  S  :  Save `,
            `  E                  :  Toggle Editor [ ${this.enabled ? "ON  ✓" : "OFF ✗"} ]`,
            `  H                  :  Toggle Editor UI [ ${this.uiVisible ? "ON  ✓" : "OFF ✗"} ]`,
            "",
            divider,
        ].join("\n");

        const selInfo = sel
            ? [
                "",
                divider,
                "        🎯  SELECTED ASSET",
                divider,
                `  Mode     :  ${layoutType}`,
                `  File        :  ${this.fileName}`,
                thin,
                `  Asset    :  ${sel.__editKey}`,
                thin,
                `  X        :  ${savedPos.x}`,
                `  Y        :  ${savedPos.y}`,
                `  Scale    :  ${(sel.scaleX || 1).toFixed(3)}`,
                `  Rotation :  ${(sel.rotation || 0).toFixed(3)} `,
                `  Depth    :  ${sel.depth || 0}`,
                `  Alpha    :  ${(sel.alpha ?? 1).toFixed(2)}`,
                divider,
                keymap,
            ].join("\n")
            : [
                "",
                divider,
                "        🖱  UI EDITOR",
                divider,
                `  Mode  :  ${layoutType}`,
                `  File     :  ${this.fileName}`,
                thin,
                "  Click any asset to select it.",
                divider,
                keymap,
            ].join("\n");

        this.editorText.setText(selInfo);
    }

    getSavedPosition(obj) {
        const isLandscape = this.scene.scale.width > this.scene.scale.height;
        const baseW = isLandscape ? 1920 : 1080;
        const baseH = isLandscape ? 1080 : 1920;

        const layout = this.getActiveLayout();
        const entry = layout[obj.__editKey];

        if (entry?.__edited) {
            return {
                x: Math.round(obj.x + baseW / 2),
                y: Math.round(obj.y + baseH / 2),
            };
        }

        return {
            x: Math.round(obj.x),
            y: Math.round(obj.y),
        };
    }

    toggleUI() {
        if (!this.enabled) return;

        this.uiVisible = !this.uiVisible;

        if (this.editorText) {
            this.editorText.setVisible(this.uiVisible);
        }

        if (!this.uiVisible && this.editorGfx) {
            this.editorGfx.clear();
        }

        if (this.uiVisible) {
            this.renderUI();
            this.showToast("Editor UI Enabled", "success");
        } else {
            this.showToast("Editor UI Hidden", "warning");
        }
    }

    toggleEditor() {
        this.enabled = !this.enabled;

        if (!this.enabled) {
            this.selected = null;

            if (this.editorGfx) this.editorGfx.clear();
            if (this.editorText) this.editorText.setVisible(false);

            this.showToast("Editor Disabled", "warning");
        } else {
            if (this.editorText) this.editorText.setVisible(this.uiVisible);
            this.renderUI();
            this.showToast("Editor Enabled", "success");
        }
    }

    switchScene(sceneKey) {
        if (!sceneKey) return;
        if (this.scene.scene.key === sceneKey) {
            this.showToast(`${sceneKey} scene already active`, "info");
            return;
        }

        this.showToast(`Switching to ${sceneKey}`, "info");
        this.scene.scene.start(sceneKey);
    }

    syncLinkedObjects(obj) {
        if (!obj || !obj.__editKey) return;

        const key = obj.__editKey;
        const overlay = this.scene.cardBackOverlays?.[key];

        if (overlay) {
            overlay.setPosition(obj.x, obj.y);
            overlay.setScale(obj.scaleX, obj.scaleY);
            overlay.setAngle(Phaser.Math.RadToDeg(obj.rotation || 0));

            const depth = obj.depth ?? 0;
            overlay.setDepth(depth + 1);

            if (typeof obj.alpha !== "undefined") {
                overlay.setAlpha(obj.alpha);
            }
        }

        const glow = this.scene.cardGlows?.[key];
        if (glow) {
            glow.setPosition(obj.x, obj.y);
            glow.setScale(obj.scaleX * 2.4, obj.scaleY * 2.4);
            glow.setAngle(Phaser.Math.RadToDeg(obj.rotation || 0));
            glow.setDepth((obj.depth ?? 1) - 1);
        }
    }

    update() {
        if (!this.enabled || !this.selected) return;

        const left = this.scene.input.keyboard.checkDown(this.keys.left, 0)
            ? -1
            : 0;
        const right = this.scene.input.keyboard.checkDown(this.keys.right, 0)
            ? 1
            : 0;
        const up = this.scene.input.keyboard.checkDown(this.keys.up, 0) ? -1 : 0;
        const down = this.scene.input.keyboard.checkDown(this.keys.down, 0) ? 1 : 0;

        if (left || right || up || down) {
            const step = this.keys.shift.isDown ? 10 : 2;
            this.selected.x = Math.round(this.selected.x + (left + right) * step);
            this.selected.y = Math.round(this.selected.y + (up + down) * step);

            if (this.snapEnabled) this.applySnap(this.selected);

            this.syncLinkedObjects(this.selected);
            this.persistToLayout(this.selected);
            this.renderUI();
        }
    }

    destroy() {
        const scene = this.scene;

        if (this.editorGfx) this.editorGfx.destroy();
        if (this.editorText) this.editorText.destroy();

        scene.input.off("pointerdown", this.onPointerDown);
        scene.input.off("gameobjectdown", this.onGameObjectDown);
        scene.input.off("drag", this.onDrag);
        scene.input.off("wheel", this.onWheel);

        if (scene.input.keyboard) {
            scene.input.keyboard.off("keydown", this.onKeyDown);
        }

        scene.events.off("update", this.boundUpdate);
        this.selected = null;
    }
}
