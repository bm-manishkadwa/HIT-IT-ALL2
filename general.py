import os
import re
import shutil
import sys
import tkinter as tk
from tkinter import filedialog
import urllib.request


PHASER_CDN = (
    "https://cdnjs.cloudflare.com/ajax/libs/phaser/3.90.0/phaser.min.js"
)

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".tif"}
AUDIO_EXTENSIONS = {".mp3", ".ogg", ".wav", ".aac", ".m4a"}

# ============================================================
# TEMPLATE: index.html
# ============================================================
INDEX_HTML = """\

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <!-- Game name -->
    <title>{PROJECT_NAME}</title>
    <style>
        html,
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #000000;
            height: 100%;
        }

        #game-container,
        canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000000;
        }
    </style>
    <script src="phaser.js"></script>
    <script src="uieditor.js"></script>
    <script src="scenes/start.js"></script>
    <script src="scenes/game.js"></script>
    <script src="scenes/end.js"></script>
</head>

<body>
    <script>
        const PORTRAIT = { w: 1080, h: 1920 };
        const LANDSCAPE = { w: 1920, h: 1080 };

        const config = {
            type: Phaser.AUTO,
            width: PORTRAIT.w,
            height: PORTRAIT.h,
            parent: "game-container",
            backgroundColor: "#000",
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            scene: [Start, Game, End],
        };

        let game;

        function debounce(func, wait) {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func(...args), wait);
            };
        }

        function applyGameSizeForOrientation() {

            if (!game || !game.scale) return;

            const isLandscape = window.innerWidth > window.innerHeight;
            const size = isLandscape ? LANDSCAPE : PORTRAIT;
            game.scale.setGameSize(size.w, size.h);
            game.scale.refresh();
            ["Start", "Game", "End"].forEach((name) => {
                const s = game.scene.getScene(name);
                if (s && s.reflowForResize) {
                    s.reflowForResize({
                        width: game.scale.width,
                        height: game.scale.height,
                    });
                }
            });
        }

        const debouncedApplySize = debounce(applyGameSizeForOrientation, 250);

        window.addEventListener("load", () => {
            if (typeof Phaser === "undefined") {
                console.error("Phaser is NOT loaded. Check inline Phaser code.");
                return;
            }
            game = new Phaser.Game(config);
        });

        window.addEventListener("load", () => {
            if (game) applyGameSizeForOrientation();
        });

        window.addEventListener("resize", debouncedApplySize);
        window.addEventListener("orientationchange", () => {
            setTimeout(applyGameSizeForOrientation, 120);
        });
    </script>
    <div id="game-container"></div>
</body>

</html>

"""

# ============================================================
# PHASER JS STUB  (used when download fails / no internet)
# ============================================================
PHASER_STUB = """\
/*
 * ============================================================
 * PHASER 3 LIBRARY — PLACEHOLDER
 * ============================================================
 *
 * This file is a stub.  Replace it with the real Phaser 3
 * minified library before testing or building.
 *
 * Option 1 — Download manually:
 *   https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js
 *   Save the file contents here (overwrite this file).
 *
 * Option 2 — Use CDN in index.html instead:
 *   Replace:  <script src="phaser.js"></script>
 *   With:     <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
 *
 * Option 3 — npm:
 *   npm install phaser
 *   Then copy node_modules/phaser/dist/phaser.min.js here.
 *
 * ============================================================
 */
console.error(
  "[phaser.js] Phaser library not loaded — replace this stub with the real phaser.min.js"
);
"""

# ============================================================
# ASSET SCANNER
# ============================================================

def make_key(filename_no_ext: str) -> str:
    """Convert a filename (no extension) to a safe lowercase JS key: spaces → underscores."""
    key = filename_no_ext.strip()
    key = re.sub(r"\s+", "_", key)
    key = re.sub(r"[^\w]", "_", key)
    return key.lower()                          # ← always lowercase


def scan_assets(assets_dest: str):
    """
    Walk the assets destination folder and return two lists:
      images: list of (key, relative_path)
      sounds: list of (key, relative_path)
    relative_path is relative to the project root, e.g. "assets/game/bg.png"
    """
    images = []
    sounds = []

    for dirpath, _dirnames, filenames in os.walk(assets_dest):
        for filename in sorted(filenames):
            name_no_ext, ext = os.path.splitext(filename)
            ext = ext.lower()

            project_root = os.path.dirname(assets_dest)
            abs_path     = os.path.join(dirpath, filename)
            rel_path     = os.path.relpath(abs_path, project_root).replace("\\", "/")
            key          = make_key(name_no_ext)   # ← key is now always lowercase

            if ext in IMAGE_EXTENSIONS:
                images.append((key, rel_path))
            elif ext in AUDIO_EXTENSIONS:
                sounds.append((key, rel_path))

    return images, sounds


# ============================================================
# SHARED BLOCK BUILDERS  (reused by all three scene generators)
# ============================================================

def build_layout_block(images, indent="            "):
    """One layout entry per image, all with the same default values."""
    if images:
        return "\n".join(
            f"{indent}{key}: {{ x: 0, y: 0, scale:1, alpha: 1, angle: 0, depth: 1 }},"
            for key, _ in images
        )
    return f"{indent}// No image assets"


def build_add_image_block(images, indent="        "):
    """One this.key = this.add.image(...) line per image."""
    if images:
        return "\n".join(
            f"{indent}this.{key} = this.add.image(0, 0, '{key}').setOrigin(0.5).setAlpha(0);"
            for key, _ in images
        )
    return f"{indent}// No image assets to add"


# ============================================================
# START.JS GENERATOR
# ============================================================

def build_start_js(images, sounds):
    indent       = "            "
    layout_lines = build_layout_block(images, indent)
    ui_lines     = build_add_image_block(images)

    assets_lines = (
        "\n".join(f"{indent}{{ key: '{k}', path: '{p}' }}," for k, p in images)
        if images else f"{indent}// No image assets found"
    )
    sfxs_lines = (
        "\n".join(f"{indent}{{ key: '{k}', path: '{p}' }}," for k, p in sounds)
        if sounds else f"{indent}// No audio assets found"
    )
    editor_keys = "\n            ".join(f"'{k}'," for k, _ in images) if images else "// No image assets"
    return f"""\
class Start extends Phaser.Scene {{
    constructor() {{
        super('Start');

        this.LAYOUT_PORTRAIT = {{
{layout_lines}
        }};

        this.LAYOUT_LANDSCAPE = {{
{layout_lines}
        }};
    }}

    preload() {{
        this.loadAllTheAssets();
    }}

    create() {{
        this.createUI();
        this.onOrientationChange();
        this.uiEditor = new UIEditor(this, {{
            enabled: true,
            keys: this.getEditorKeys(),
            gridSize: 10,
            fileName: 'start.js'
        }});
    }}

    getEditorKeys() {{
        return [
            {editor_keys}
        ];
    }}

    createUI() {{
{ui_lines}
    }}

    onOrientationChange() {{
        this.reflowForResize({{ width: this.scale.width, height: this.scale.height }});
        this.scale.on('resize', this.reflowForResize, this);
    }}

    reflowForResize(gameSize = {{ width: this.scale.width, height: this.scale.height }}) {{
        const isLandscape = gameSize.width > gameSize.height;
        const layout = isLandscape ? this.LAYOUT_LANDSCAPE : this.LAYOUT_PORTRAIT;

        for (const key in layout) {{
            if (this[key] && layout.hasOwnProperty(key)) {{
                const {{ x, y, scale, alpha, depth, r }} = layout[key];
                this[key].setPosition(x, y).setRotation(r || 0);
                if (scale) this[key].setScale(scale);
                if (alpha !== undefined) this[key].setAlpha(alpha);
                if (depth) this[key].setDepth(depth);
            }}
        }}
    }}

    loadAllTheAssets() {{
        const assets = [
{assets_lines}
        ];

        const sfxs = [
{sfxs_lines}
        ];

        for (const asset of assets) {{
            this.load.image(asset.key, asset.path);
        }}

        for (const sfx of sfxs) {{
            this.load.audio(sfx.key, sfx.path);
        }}
    }}
}}
"""


# ============================================================
# GAME.JS GENERATOR
# ============================================================

def build_game_js(images):
    indent       = "            "
    layout_lines = build_layout_block(images, indent)
    ui_lines     = build_add_image_block(images)
    
    editor_keys = "\n            ".join(f"'{k}'," for k, _ in images) if images else "// No image assets"
    return f"""\
class Game extends Phaser.Scene {{
    constructor() {{
        super('Game');

        this.LAYOUT_PORTRAIT = {{
{layout_lines}
        }};

        this.LAYOUT_LANDSCAPE = {{
{layout_lines}
        }};
    }}

    create() {{
        this.createGameUI();
        this.onOrientationChange();
        this.uiEditor = new UIEditor(this, {{
            enabled: true,
            keys: this.getEditorKeys(),
            gridSize: 10,
            fileName: 'game.js'
        }});
    }}

    getEditorKeys() {{
        return [
            {editor_keys}
        ];
    }}

    createGameUI() {{
{ui_lines}
    }}

    onOrientationChange() {{
        this.reflowForResize({{ width: this.scale.width, height: this.scale.height }});
        this.scale.on('resize', this.reflowForResize, this);
    }}

    reflowForResize(gameSize = {{ width: this.scale.width, height: this.scale.height }}) {{
        const isLandscape = gameSize.width > gameSize.height;
        const layout = isLandscape ? this.LAYOUT_LANDSCAPE : this.LAYOUT_PORTRAIT;

        for (const key in layout) {{
            if (this[key] && layout.hasOwnProperty(key)) {{
                const {{ x, y, scale, alpha, depth, r }} = layout[key];
                this[key].setPosition(x, y).setRotation(r || 0);
                if (scale) this[key].setScale(scale);
                if (alpha !== undefined) this[key].setAlpha(alpha);
                if (depth) this[key].setDepth(depth);
            }}
        }}
    }}
}}
"""


# ============================================================
# END.JS GENERATOR
# ============================================================

def build_end_js(images):
    indent       = "            "
    layout_lines = build_layout_block(images, indent)
    ui_lines     = build_add_image_block(images)
    
    editor_keys = "\n            ".join(f"'{k}'," for k, _ in images) if images else "// No image assets"
    return f"""\
class End extends Phaser.Scene {{
    constructor() {{
        super('End');

        this.LAYOUT_PORTRAIT = {{
{layout_lines}
        }};

        this.LAYOUT_LANDSCAPE = {{
{layout_lines}
        }};
    }}

    create() {{
        this.createEndUI();
        this.onOrientationChange();
        this.uiEditor = new UIEditor(this, {{
            enabled: true,
            keys: this.getEditorKeys(),
            gridSize: 10,
            fileName: 'end.js'
        }});
    }}

    getEditorKeys() {{
        return [
            {editor_keys}
        ];
    }}

    createEndUI() {{
{ui_lines}
    }}

    onOrientationChange() {{
        this.reflowForResize({{ width: this.scale.width, height: this.scale.height }});
        this.scale.on('resize', this.reflowForResize, this);
    }}

    reflowForResize(gameSize = {{ width: this.scale.width, height: this.scale.height }}) {{
        const isLandscape = gameSize.width > gameSize.height;
        const layout = isLandscape ? this.LAYOUT_LANDSCAPE : this.LAYOUT_PORTRAIT;

        for (const key in layout) {{
            if (this[key] && layout.hasOwnProperty(key)) {{
                const {{ x, y, scale, alpha, depth, r }} = layout[key];
                this[key].setPosition(x, y).setRotation(r || 0);
                if (scale) this[key].setScale(scale);
                if (alpha !== undefined) this[key].setAlpha(alpha);
                if (depth) this[key].setDepth(depth);
            }}
        }}
    }}
}}
"""


# ============================================================
# HELPERS
# ============================================================

def try_download_phaser(dest_path: str) -> bool:
    """Try to download Phaser 3 minified from CDN. Returns True on success."""
    print(f"  Downloading Phaser 3 from CDN...")
    print(f"  URL: {PHASER_CDN}")
    try:
        req = urllib.request.Request(
            PHASER_CDN,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        with open(dest_path, "wb") as f:
            f.write(data)
        size_kb = round(len(data) / 1024)
        print(f"  ✓ Downloaded phaser.js  ({size_kb} KB)")
        return True
    except Exception as e:
        print(f"  ✗ Download failed: {e}")
        print("    Writing placeholder stub instead.")
        return False


def sanitise_name(name: str) -> str:
    """Strip characters that are unsafe in folder names."""
    name = name.strip()
    name = re.sub(r'[<>:"/\\|?*]', "", name)
    name = re.sub(r"\s+", "_", name)
    return name or "my_playable"


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 60)
    print("  PHASER 3 PLAYABLE AD PROJECT SCAFFOLDER")
    print("=" * 60)
    print()

    # ── Step 1: pick the assets folder ──────────────────────
    print("Step 1 — Select your assets folder")
    print("         (can contain images, audio, JSON, sub-folders)")
    print()
    _root = tk.Tk()
    _root.withdraw()
    assets_src = filedialog.askdirectory(title="Select your assets folder")
    _root.destroy()

    if not assets_src:
        print("No folder selected. Exiting.")
        sys.exit(1)

    assets_src = os.path.abspath(assets_src)
    print(f"  Selected: {assets_src}")
    print()

    # ── Step 2: ask for project name ────────────────────────
    print("Step 2 — Enter a project name")
    print("         This becomes the root folder for your project.")
    print()
    raw_name     = input("  Project name: ").strip()
    project_name = sanitise_name(raw_name)

    if not project_name:
        project_name = "my_playable"
        print(f"  (Using default name: {project_name})")

    print()
    print(f"  Project name: {project_name}")
    print()

    # ── Step 3: resolve output root ─────────────────────────
    script_dir   = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.join(script_dir, project_name)

    if os.path.exists(project_root):
        print(f"  ⚠  Folder already exists: {project_root}")
        answer = input("     Overwrite it? [y/N]: ").strip().lower()
        if answer != "y":
            print("  Aborted.")
            sys.exit(0)
        shutil.rmtree(project_root)

    os.makedirs(project_root)
    print(f"  Created: {project_root}")
    print()

    # ── Step 4: copy assets folder ──────────────────────────
    print("Step 3 — Copying assets...")
    assets_dest = os.path.join(project_root, "assets")   # ← always lowercase "assets"
    shutil.copytree(assets_src, assets_dest)
    copied = sum(len(files) for _, _, files in os.walk(assets_dest))
    print(f"  ✓ Copied {copied} file(s) to assets/")
    print()

    # ── Step 5: scan assets ─────────────────────────────────
    print("Step 4 — Scanning assets...")
    images, sounds = scan_assets(assets_dest)
    print(f"  ✓ Found {len(images)} image(s) and {len(sounds)} audio file(s)")
    if images:
        for key, path in images:
            print(f"      [IMG] {key}  →  {path}")
    if sounds:
        for key, path in sounds:
            print(f"      [SFX] {key}  →  {path}")
    print()

    # ── Step 6: create index.html ───────────────────────────
    print("Step 5 — Creating index.html...")
    html_path = os.path.join(project_root, "index.html")  # ← lowercase filename
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(INDEX_HTML.replace("{PROJECT_NAME}", project_name))
    print(f"  ✓ index.html")

    # ── Step 7: create phaser.js ────────────────────────────

    # ============================================================
    # EXTRA JS FILES
    # ============================================================

    SERVER_JS = """\
    const http = require('http');
    const fs = require('fs');
    const path = require('path');

    const ALLOWED_FILES = ['start.js', 'game.js', 'end.js'];
    const PORT = 8000;

    const server = http.createServer((req, res) => {

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.method === 'POST' && req.url === '/save-layout') {
            let body = '';

            req.on('data', chunk => { body += chunk.toString(); });

            req.on('end', () => {
                try {
                    const { layoutName, layoutCode, fileName } = JSON.parse(body);

                    // Security check
                    if (!ALLOWED_FILES.includes(fileName)) {
                        res.writeHead(403, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: `File not allowed: ${fileName}` }));
                        return;
                    }

                    const FILE_TO_UPDATE = path.join(__dirname, 'scenes', fileName);
                    let fileContent = fs.readFileSync(FILE_TO_UPDATE, 'utf8');

                    const regex = new RegExp(
                        `(this\\.${layoutName}\\s*=\\s*\\{)[^]*?(\\};)`,
                        'm'
                    );

                    if (!regex.test(fileContent)) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: `${layoutName} not found in ${fileName}` }));
                        return;
                    }

                    const updated = fileContent.replace(regex, layoutCode);
                    fs.writeFileSync(FILE_TO_UPDATE, updated, 'utf8');

                    console.log(`✅ ${layoutName} updated in ${fileName}`);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));

                } catch (err) {
                    console.error('❌ Error:', err.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });

            return;
        }

        res.writeHead(404);
        res.end('Not found');
    });

    server.listen(PORT, () => {
        console.log(`🚀 UI Editor server running at http://localhost:${PORT}`);
    });
    """

    UI_EDITOR_JS = """\


class UIEditor {
    constructor(
        scene,
        {
            enabled = true,
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
 
        this.loadFromLocalStorage();
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
 
        this.syncLinkedObjects(obj);
        this.saveToLocalStorage();
    }
 
    saveToLocalStorage() {
        const keyP = `uiEditor_${this.fileName}_PORTRAIT`;
        const keyL = `uiEditor_${this.fileName}_LANDSCAPE`;
        localStorage.setItem(keyP, JSON.stringify(this.scene.LAYOUT_PORTRAIT));
        localStorage.setItem(keyL, JSON.stringify(this.scene.LAYOUT_LANDSCAPE));
    }
 
    loadFromLocalStorage() {
        const keyP = `uiEditor_${this.fileName}_PORTRAIT`;
        const keyL = `uiEditor_${this.fileName}_LANDSCAPE`;
 
        const savedPortrait = localStorage.getItem(keyP);
        const savedLandscape = localStorage.getItem(keyL);
 
        if (savedPortrait) {
            Object.assign(this.scene.LAYOUT_PORTRAIT, JSON.parse(savedPortrait));
            this.showToast("Portrait layout restored from last session", "info");
        }
 
        if (savedLandscape) {
            Object.assign(this.scene.LAYOUT_LANDSCAPE, JSON.parse(savedLandscape));
            this.showToast("Landscape layout restored from last session", "info");
        }
    }
 
    exportCurrentLayoutJSON() {
        const isLandscape = this.scene.scale.width > this.scene.scale.height;
        const layout = this.getActiveLayout();
        const varName = isLandscape ? "LAYOUT_LANDSCAPE" : "LAYOUT_PORTRAIT";
 
        const lines = Object.keys(layout)
            .map((k) => {
                const v = layout[k];
                if (!v) return null;
 
                const parts = [];
                if (v.x !== undefined) parts.push(`x: ${v.x}`);
                if (v.y !== undefined) parts.push(`y: ${v.y}`);
                if (v.scale !== undefined) parts.push(`scale: ${v.scale}`);
                if (v.angle !== undefined && v.angle !== 0) parts.push(`angle: ${v.angle}`);
                if (v.alpha !== undefined && v.alpha !== 1)
                    parts.push(`alpha: ${v.alpha}`);
                if (v.depth !== undefined && v.depth !== 0)
                    parts.push(`depth: ${v.depth}`);
 
                return `            ${k}: { ${parts.join(", ")} },`;
            })
            .filter(Boolean);
 
        return {
            varName,
            layoutCode: [
                `this.${varName} = {`,
                ...lines,
                `};`
            ].join("\\n"),
        };
    }
 
    async saveLayoutToFile() {
        const { varName, layoutCode } = this.exportCurrentLayoutJSON();
 
        try {
            const response = await fetch("http://localhost:8000/save-layout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    layoutName: varName,
                    layoutCode: layoutCode,
                    fileName: this.fileName,
                }),
            });
 
            const result = await response.json();
 
            if (result.success) {
                this.showToast(`${varName} saved to ${this.fileName}`, "success");
            } else {
                this.showToast(`Save failed: ${result.error}`, "error");
            }
        } catch (err) {
            this.showToast(`Server not running! Run: node merge_munch/server.js`, "error");
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
 
        const finalX = W - TOAST_W - PADDING;
        const finalY = H - TOAST_H - PADDING;
 
        const gfx = this.scene.add.graphics();
 
        gfx.fillStyle(0x000000, 0.35);
        gfx.fillRoundedRect(4, 4, TOAST_W, TOAST_H, RADIUS);
 
        gfx.fillStyle(bg, 1);
        gfx.fillRoundedRect(0, 0, TOAST_W, TOAST_H, RADIUS);
 
        gfx.lineStyle(2, border, 1);
        gfx.strokeRoundedRect(0, 0, TOAST_W, TOAST_H, RADIUS);
 
        gfx.fillStyle(border, 1);
        gfx.fillRoundedRect(0, 0, 5, TOAST_H, RADIUS);
 
        const text = this.scene.add
            .text(20, TOAST_H / 2, `${icon}  ${message}`, {
                fontFamily: "Arial",
                fontSize: "16px",
                color: "#ffffff",
                fontStyle: "bold",
            })
            .setOrigin(0, 0.5);
 
        const container = this.scene.add.container(finalX, H + TOAST_H, [
            gfx,
            text,
        ]);
        container.setDepth(99999999).setScrollFactor(0);
 
        this.scene.tweens.add({
            targets: container,
            y: finalY,
            duration: 300,
            ease: "Back.Out",
            onComplete: () => {
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
        ].join("\\n");
 
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
                `  X        :  ${Math.round(sel.x)} `,
                `  Y        :  ${Math.round(sel.y)} `,
                `  Scale    :  ${(sel.scaleX || 1).toFixed(3)}`,
                `  Rotation :  ${(sel.rotation || 0).toFixed(3)} `,
                `  Depth    :  ${sel.depth || 0}`,
                `  Alpha    :  ${(sel.alpha ?? 1).toFixed(2)}`,
                divider,
                keymap,
            ].join("\\n")
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
            ].join("\\n");
 
        this.editorText.setText(selInfo);
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
    """
    
    print()
    print("Step 6 — Setting up phaser.js...")
    phaser_path = os.path.join(project_root, "phaser.js")  # ← lowercase filename
    downloaded  = try_download_phaser(phaser_path)
    if not downloaded:
        with open(phaser_path, "w", encoding="utf-8") as f:
            f.write(PHASER_STUB)
        print("  ✓ phaser.js  (stub — see comments inside for how to replace)")


    print()
    print("Step X — Creating extra JS files...")

    extra1_path = os.path.join(project_root, "server.js")
    with open(extra1_path, "w", encoding="utf-8") as f:
        f.write(SERVER_JS)
    print("  ✓ SERVER_JS")

    extra2_path = os.path.join(project_root, "uieditor.js")
    with open(extra2_path, "w", encoding="utf-8") as f:
        f.write(UI_EDITOR_JS)
    print("  ✓ UI_EDITOR_JS")

    # ── Step 8: create scenes/ folder + scene files ─────────
    print()
    print("Step 7 — Creating scenes/...")
    scenes_dir = os.path.join(project_root, "scenes")
    os.makedirs(scenes_dir)

    # start.js — lowercase filename
    with open(os.path.join(scenes_dir, "start.js"), "w", encoding="utf-8") as f:
        f.write(build_start_js(images, sounds))
    print(f"  ✓ scenes/start.js  ({len(images)} images, {len(sounds)} sfx wired in)")

    # game.js — lowercase filename
    with open(os.path.join(scenes_dir, "game.js"), "w", encoding="utf-8") as f:
        f.write(build_game_js(images))
    print(f"  ✓ scenes/game.js   ({len(images)} images wired in)")

    # end.js — lowercase filename
    with open(os.path.join(scenes_dir, "end.js"), "w", encoding="utf-8") as f:
        f.write(build_end_js(images))
    print(f"  ✓ scenes/end.js    ({len(images)} images wired in)")

    # ── Summary ─────────────────────────────────────────────
    print()
    print("=" * 50)
    print("  PROJECT CREATED SUCCESSFULLY")
    print("=" * 50)
    print(f"  Location : {project_root}")
    print(f"  Images   : {len(images)}")
    print(f"  SFX      : {len(sounds)}")
    print("=" * 50)


if __name__ == "__main__":
    main()
