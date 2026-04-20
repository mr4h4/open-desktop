let currentPath = '';
const grid = document.getElementById('file-grid');
const backBtn = document.getElementById('backBtn');
const menu = document.getElementById('context-menu');
const downloadFullBtn = document.getElementById('downloadFullBtn');
let selectedItem = null;

// Configuración para móviles
let touchTimer;
const LONG_PRESS_DURATION = 600; 

async function loadFiles(newPath = '') {
    // Sanitizar la ruta antes de enviarla
    const sanitizedPath = newPath.replace(/\/+$/, "");
    
    const res = await fetch(`/api/files?path=${encodeURIComponent(sanitizedPath)}`);
    const data = await res.json();
    
    if (data.error) {
        alert(data.error);
        return;
    }

    currentPath = sanitizedPath;
    document.getElementById('currentPath').innerText = '/' + currentPath;
    backBtn.disabled = data.isRoot;
    grid.innerHTML = '';

    data.files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <span class="icon">${file.isDirectory ? '📁' : '📄'}</span>
            <span class="name">${file.name}</span>
        `;
        
        const itemFullPath = currentPath ? `${currentPath}/${file.name}` : file.name;

        // --- GESTIÓN DE EVENTOS ---

        // 1. CLICK IZQUIERDO (Navegar o Abrir Menú)
        div.onclick = (e) => {
            if (file.isDirectory) {
                loadFiles(itemFullPath);
            } else {
                showMenu(e, file, itemFullPath);
            }
        };

        // 2. CLICK DERECHO (PC)
        div.oncontextmenu = (e) => {
            e.preventDefault();
            showMenu(e, file, itemFullPath);
        };

        // 3. MANTENER PRESIONADO (Móvil)
        div.addEventListener('touchstart', (e) => {
            touchTimer = setTimeout(() => {
                // Usamos el primer punto de contacto del touch
                showMenu(e.touches[0], file, itemFullPath);
                if(e.cancelable) e.preventDefault();
            }, LONG_PRESS_DURATION);
        }, { passive: false });

        div.addEventListener('touchend', () => clearTimeout(touchTimer));
        div.addEventListener('touchmove', () => clearTimeout(touchTimer));

        grid.appendChild(div);
    });
}

function showMenu(e, file, fullPath) {
    selectedItem = { ...file, fullPath };
    menu.classList.remove('hidden');
    
    // Soporte para coordenadas de Mouse o de Touch
    const posX = e.pageX || (e.touches ? e.touches[0].pageX : e.clientX);
    const posY = e.pageY || (e.touches ? e.touches[0].pageY : e.clientY);

    menu.style.top = `${posY}px`;
    menu.style.left = `${posX}px`;
    
    // Solo mostrar "Abrir" si es carpeta
    document.getElementById('menu-open').style.display = file.isDirectory ? 'block' : 'none';
}

// Botón Descargar Todo (Carpeta Raíz)
downloadFullBtn.onclick = () => {
    window.location = `/api/download?path=`;
};

document.getElementById('menu-open').onclick = () => {
    if (selectedItem?.isDirectory) {
        loadFiles(selectedItem.fullPath);
        menu.classList.add('hidden');
    }
};

document.getElementById('menu-download').onclick = () => {
    if (selectedItem) {
        window.location = `/api/download?path=${encodeURIComponent(selectedItem.fullPath)}`;
        menu.classList.add('hidden');
    }
};

document.getElementById('menu-cancel').onclick = () => menu.classList.add('hidden');

backBtn.onclick = () => {
    const parts = currentPath.split('/').filter(p => p !== "");
    parts.pop();
    loadFiles(parts.join('/'));
};

// Cerrar menú al hacer click fuera
window.onclick = () => menu.classList.add('hidden');

// Carga inicial
loadFiles();