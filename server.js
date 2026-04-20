require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 65000;
const ROOT_DIR = path.resolve(process.env.ROOT_DIR || './open-desktop');
const LOG_FILE = path.join(__dirname, 'access.log');

if (!fs.existsSync(ROOT_DIR)) {
    fs.mkdirSync(ROOT_DIR, { recursive: true });
}

// --- SISTEMA DE LOGS ROBUSTO ---
let lastLoggedDate = "";

// Función para recuperar la última fecha del archivo log al arrancar
const initializeLogger = () => {
    if (fs.existsSync(LOG_FILE)) {
        const content = fs.readFileSync(LOG_FILE, 'utf8').trim();
        const lines = content.split('\n');
        // Buscamos la última línea que contenga "INICIO DE JORNADA"
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].includes("INICIO DE JORNADA:")) {
                lastLoggedDate = lines[i].split(': ')[1].trim();
                break;
            }
        }
    }
};

const logger = (ip, action, details) => {
    const now = new Date();
    const currentDate = now.toLocaleDateString('es-ES');
    const fullTimestamp = now.toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    let logEntry = "";

    if (currentDate !== lastLoggedDate) {
        logEntry += `\n=================================================================================\n`;
        logEntry += `   INICIO DE JORNADA: ${currentDate}\n`;
        logEntry += `=================================================================================\n`;
        lastLoggedDate = currentDate;
    }

    logEntry += `[${fullTimestamp}] IP: ${ip} | Acción: ${action} | Ruta: ${details}\n`;
    
    console.log(logEntry.trim());
    fs.appendFileSync(LOG_FILE, logEntry);
};

// --- MIDDLEWARE: AUTENTICACIÓN (Variables de Entorno) ---
const basicAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Acceso Protegido"');
        return res.status(401).send('Se requiere autenticación');
    }

    const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');

    if (user === process.env.AUTH_USER && pass === process.env.AUTH_PASS) {
        next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Acceso Protegido"');
        return res.status(401).send('Credenciales incorrectas');
    }
};

// --- MIDDLEWARE: VALIDACIÓN DE RUTAS ---
const validatePath = (req, res, next) => {
    let relativePath = req.query.path || '';
    const absolutePath = path.resolve(ROOT_DIR, relativePath);
    const relative = path.relative(ROOT_DIR, absolutePath);

    const isSafe = !relative.startsWith('..') && !path.isAbsolute(relative);

    if (!isSafe) {
        logger(req.ip.replace('::ffff:', ''), 'ALERTA: INTENTO DE ESCAPE', relativePath);
        return res.status(403).json({ error: 'ACCESO DENEGADO' });
    }
    
    req.safePath = absolutePath;
    req.displayPath = relative === '' ? '/' : `/${relative.replace(/\\/g, '/')}`;
    req.isRoot = (relative === '' || relative === '.');
    next();
};

app.use(express.json());

// Rutas
app.use(basicAuth, express.static('public'));

app.get('/api/files', basicAuth, validatePath, (req, res) => {
    try {
        const files = fs.readdirSync(req.safePath, { withFileTypes: true });
        const response = files.map(file => ({
            name: file.name,
            isDirectory: file.isDirectory()
        }));
        res.json({ files: response, isRoot: req.isRoot });
    } catch (err) {
        res.status(500).json({ error: 'Error al leer el directorio' });
    }
});

app.get('/api/download', basicAuth, validatePath, (req, res) => {
    try {
        const stats = fs.statSync(req.safePath);
        const clientIp = req.ip.replace('::ffff:', '');
        let downloadName = path.basename(req.safePath);
        if (!downloadName || req.isRoot) downloadName = 'open-desktop';

        if (stats.isDirectory()) {
            logger(clientIp, 'DESCARGA CARPETA (ZIP)', req.displayPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            res.attachment(`${downloadName}.zip`);
            archive.pipe(res);
            archive.directory(req.safePath, false);
            archive.finalize();
        } else {
            logger(clientIp, 'DESCARGA ARCHIVO', req.displayPath);
            res.download(req.safePath);
        }
    } catch (err) {
        res.status(404).send('No encontrado');
    }
});

// Inicializar el logger y arrancar
initializeLogger();

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 SERVIDOR EN: http://localhost:${PORT}`);
    console.log(`📁 CARPETA: ${ROOT_DIR}`);
    console.log(`=========================================`);
});