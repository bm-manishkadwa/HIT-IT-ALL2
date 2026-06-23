const http = require('http');
const fs = require('fs');
const path = require('path');

const ALLOWED_FILES = ['start.js', 'game.js', 'end.js'];
const PORT = Number(process.env.PORT) || 8000;

const server = http.createServer((req, res) => {

    // ✅ CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // ================= SAVE LAYOUT =================
    if (req.method === 'POST' && req.url === '/save-layout') {
        let body = '';

        req.on('data', chunk => { body += chunk.toString(); });

        req.on('end', () => {
            try {
                const { layoutName, layoutCode, fileName } = JSON.parse(body);

                // ✅ Security check
                if (!ALLOWED_FILES.includes(fileName)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: `File not allowed: ${fileName}` }));
                }

                const filePath = path.join(__dirname, 'scenes', fileName);

                if (!fs.existsSync(filePath)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'File not found' }));
                }

                let fileContent = fs.readFileSync(filePath, 'utf8');

                // Match the full layout block
                const regexPattern = 'this\\.' + layoutName + '\\s*=\\s*\\{[\\s\\S]*?\\};';
                const regex = new RegExp(regexPattern, 'g');

                if (!regex.test(fileContent)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: `${layoutName} not found in ${fileName}` }));
                }

                // Replace layout
                const updatedContent = fileContent.replace(regex, layoutCode);

                fs.writeFileSync(filePath, updatedContent, 'utf8');

                console.log(`✅ ${layoutName} updated in ${fileName}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));

            } catch (err) {
                console.error('❌ Error:', err);

                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });

        return;
    }

    // ================= STATIC FILE SERVER =================
    if (req.method === 'GET' || req.method === 'HEAD') {
        const requestUrl = new URL(req.url, `http://${req.headers.host}`);
        const decodedPath = decodeURIComponent(requestUrl.pathname);
        const safePath = decodedPath === '/' ? 'index.html' : decodedPath;
        const filePath = path.normalize(path.join(__dirname, safePath));

        // ✅ Prevent path traversal attack
        if (!filePath.startsWith(__dirname + path.sep)) {
            res.writeHead(403);
            return res.end('Forbidden');
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                return res.end('Not found');
            }

            const ext = path.extname(filePath).toLowerCase();

            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon',
                '.ttf': 'font/ttf',
                '.mp3': 'audio/mpeg'
            };

            res.writeHead(200, {
                'Content-Type': mimeTypes[ext] || 'application/octet-stream'
            });

            if (req.method === 'HEAD') {
                return res.end();
            }

            res.end(data);
        });

        return;
    }

    // ================= DEFAULT =================
    res.writeHead(404);
    res.end('Not found');
});

// ================= START SERVER =================
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
        console.error(`Use the running server, stop it, or start another one with: PORT=${PORT + 1} node server.js`);
        process.exit(1);
    }

    throw err;
});

server.listen(PORT, () => {
    console.log(`UI Editor server running at http://localhost:${PORT}`);
});
