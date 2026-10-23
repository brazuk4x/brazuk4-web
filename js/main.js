/**
 * Brazuk4 Web Loader
 * Modern Project Uploader & Host Runner
 * Integrated with Simulated Google Auth & Admin Ban Protection
 */

// ================= IndexedDB Database Setup =================
const DB_NAME = 'brazuk4_web_loader_db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('slug', 'slug', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveProjectToDB(project) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(project);
        req.onsuccess = () => resolve(project);
        req.onerror = () => reject(req.error);
    });
}

async function getAllProjectsFromDB() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
            const list = req.result || [];
            list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
            resolve(list);
        };
        req.onerror = () => reject(req.error);
    });
}

async function deleteProjectFromDB(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// ================= State Management =================
const state = {
    currentSiteName: '',
    selectedFiles: [],
    allProjects: [],
    updatingProjectId: null,
    updateSelectedFiles: [],
    currentUser: null
};

// ================= DOM Elements =================
const el = {
    // Top Bar & Auth
    btnOpenGoogleLogin: document.getElementById('btnOpenGoogleLogin'),
    userProfileBadge: document.getElementById('userProfileBadge'),
    userAvatarImg: document.getElementById('userAvatarImg'),
    userNameText: document.getElementById('userNameText'),
    userEmailText: document.getElementById('userEmailText'),
    btnLogout: document.getElementById('btnLogout'),
    bannedAlertBanner: document.getElementById('bannedAlertBanner'),
    btnNewWebTop: document.getElementById('btnNewWebTop'),

    // Google Auth Modal
    googleAuthModal: document.getElementById('googleAuthModal'),
    btnCloseAuthModal: document.getElementById('btnCloseAuthModal'),
    googleLoginForm: document.getElementById('googleLoginForm'),
    googleInputName: document.getElementById('googleInputName'),
    googleInputEmail: document.getElementById('googleInputEmail'),
    quickAccountsContainer: document.getElementById('quickAccountsContainer'),

    // Wizard Containers
    step1Container: document.getElementById('step1Container'),
    step2Container: document.getElementById('step2Container'),
    step3Loading: document.getElementById('step3Loading'),
    step4Success: document.getElementById('step4Success'),

    // Step 1
    formStep1: document.getElementById('formStep1'),
    siteNameInput: document.getElementById('siteNameInput'),
    btnNextStep1: document.getElementById('btnNextStep1'),
    btnLoadDemo: document.getElementById('btnLoadDemo'),

    // Step 2
    currentProjectBadge: document.getElementById('currentProjectBadge'),
    btnBackToStep1: document.getElementById('btnBackToStep1'),
    dropZone: document.getElementById('dropZone'),
    btnSelectFiles: document.getElementById('btnSelectFiles'),
    btnSelectFolder: document.getElementById('btnSelectFolder'),
    fileInputFiles: document.getElementById('fileInputFiles'),
    fileInputFolder: document.getElementById('fileInputFolder'),
    fileListContainer: document.getElementById('fileListContainer'),
    fileCountBadge: document.getElementById('fileCountBadge'),
    fileTotalSize: document.getElementById('fileTotalSize'),
    fileItemsList: document.getElementById('fileItemsList'),
    btnClearFiles: document.getElementById('btnClearFiles'),
    btnConfirmUpload: document.getElementById('btnConfirmUpload'),

    // Step 3 (Loading)
    loadingStatusText: document.getElementById('loadingStatusText'),
    uploadProgressBar: document.getElementById('uploadProgressBar'),
    loadingStepDetail: document.getElementById('loadingStepDetail'),
    loadingPercent: document.getElementById('loadingPercent'),

    // Step 4 (Success)
    successUrlInput: document.getElementById('successUrlInput'),
    btnCopySuccessUrl: document.getElementById('btnCopySuccessUrl'),
    copySuccessText: document.getElementById('copySuccessText'),
    btnOpenSuccessSite: document.getElementById('btnOpenSuccessSite'),
    btnNewWebFromSuccess: document.getElementById('btnNewWebFromSuccess'),

    // Dashboard Projects
    projectsGrid: document.getElementById('projectsGrid'),
    emptyProjectsState: document.getElementById('emptyProjectsState'),
    projectSearchInput: document.getElementById('projectSearchInput'),
    btnEmptyStateNewWeb: document.getElementById('btnEmptyStateNewWeb'),

    // Update Modal
    updateModal: document.getElementById('updateModal'),
    btnCloseUpdateModal: document.getElementById('btnCloseUpdateModal'),
    btnCancelUpdateModal: document.getElementById('btnCancelUpdateModal'),
    updateModalProjectName: document.getElementById('updateModalProjectName'),
    modalUpdateDropZone: document.getElementById('modalUpdateDropZone'),
    modalUpdateFileInput: document.getElementById('modalUpdateFileInput'),
    modalUpdateFilesList: document.getElementById('modalUpdateFilesList'),
    modalUpdateProgress: document.getElementById('modalUpdateProgress'),
    modalUpdateProgressBar: document.getElementById('modalUpdateProgressBar'),
    btnConfirmUpdateModal: document.getElementById('btnConfirmUpdateModal'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// ================= Utility Helpers =================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const icon = type === 'success' ? 'fa-circle-check text-emerald-400' : (type === 'error' ? 'fa-circle-xmark text-red-400' : 'fa-circle-info text-cyan-400');
    toast.className = 'toast-enter pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#111827] border border-gray-700/80 shadow-2xl text-xs font-medium text-white';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function generateRandomSlug(length = 14) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateRandomHierarchicalPath() {
    const part1 = generateRandomSlug(14);
    const part2 = generateRandomSlug(14);
    const part3 = generateRandomSlug(6);
    return `/${part1}/${part2}/${part3}`;
}

function sanitizeSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'mi-web';
}

function getFileExtensionIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
        case 'html':
        case 'htm':
            return '<i class="fa-brands fa-html5 text-orange-400"></i>';
        case 'css':
            return '<i class="fa-brands fa-css3-alt text-blue-400"></i>';
        case 'js':
            return '<i class="fa-brands fa-js text-yellow-400"></i>';
        case 'json':
            return '<i class="fa-solid fa-code text-emerald-400"></i>';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
        case 'webp':
            return '<i class="fa-regular fa-image text-pink-400"></i>';
        case 'zip':
            return '<i class="fa-solid fa-file-zipper text-purple-400"></i>';
        default:
            return '<i class="fa-regular fa-file text-gray-400"></i>';
    }
}

// ================= Auth & User Profile Management =================
function syncAuthState() {
    state.currentUser = window.BrazukAuth.getCurrentUser();

    if (state.currentUser) {
        el.btnOpenGoogleLogin.classList.add('hidden');
        el.userProfileBadge.classList.remove('hidden');
        el.userAvatarImg.src = state.currentUser.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user';
        el.userNameText.textContent = state.currentUser.name;
        el.userEmailText.textContent = state.currentUser.email;

        // Check Ban status
        if (state.currentUser.isBanned) {
            el.bannedAlertBanner.classList.remove('hidden');
            el.userProfileBadge.classList.add('border-red-500/80', 'bg-red-950/40');
        } else {
            el.bannedAlertBanner.classList.add('hidden');
            el.userProfileBadge.classList.remove('border-red-500/80', 'bg-red-950/40');
        }
    } else {
        el.btnOpenGoogleLogin.classList.remove('hidden');
        el.userProfileBadge.classList.add('hidden');
        el.bannedAlertBanner.classList.add('hidden');
    }
}

// Open Google Login Modal
function openGoogleModal() {
    renderQuickAccounts();
    el.googleAuthModal.classList.remove('hidden');
}

function closeGoogleModal() {
    el.googleAuthModal.classList.add('hidden');
    el.googleLoginForm.reset();
}

function renderQuickAccounts() {
    const allUsers = window.BrazukAuth.getStoredUsers();
    el.quickAccountsContainer.innerHTML = `
        <span class="text-[11px] text-gray-400 font-semibold block uppercase tracking-wider mb-1">
            Cuentas detectadas:
        </span>
    `;

    allUsers.slice(0, 3).forEach(user => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'w-full p-2.5 rounded-2xl bg-[#0F1420] hover:bg-[#1a2336] border border-gray-700/80 flex items-center gap-3 transition text-left cursor-pointer';
        
        const bannedBadge = user.isBanned ? '<span class="text-[9px] text-red-400 font-bold ml-auto border border-red-500/30 px-1.5 py-0.5 rounded-full bg-red-500/10">BANEADO</span>' : '';

        btn.innerHTML = `
            <img src="${user.avatar}" class="w-8 h-8 rounded-full border border-gray-600 bg-gray-800" />
            <div class="truncate">
                <span class="font-bold text-xs text-white block">${user.name}</span>
                <span class="text-[11px] text-gray-400 block truncate">${user.email}</span>
            </div>
            ${bannedBadge}
        `;

        btn.addEventListener('click', () => {
            const res = window.BrazukAuth.loginOrRegisterGoogleUser(user.name, user.email, user.avatar);
            if (!res.success && res.isBanned) {
                alert(`🚫 ACCESO DENEGADO:\n${res.message}`);
                return;
            }
            closeGoogleModal();
            syncAuthState();
            showToast(`Bienvenido de nuevo, ${user.name}`);
        });

        el.quickAccountsContainer.appendChild(btn);
    });
}

el.btnOpenGoogleLogin.addEventListener('click', openGoogleModal);
el.btnCloseAuthModal.addEventListener('click', closeGoogleModal);

el.googleLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = el.googleInputName.value.trim();
    const email = el.googleInputEmail.value.trim();

    if (!name || !email) return;

    const res = window.BrazukAuth.loginOrRegisterGoogleUser(name, email);
    if (!res.success && res.isBanned) {
        alert(`🚫 ACCESO DENEGADO:\n${res.message}`);
        return;
    }

    closeGoogleModal();
    syncAuthState();
    showToast(res.isNew ? `¡Cuenta de Google registrada con éxito!` : `Sesión iniciada como ${name}`);
});

el.btnLogout.addEventListener('click', () => {
    window.BrazukAuth.logoutUser();
    syncAuthState();
    showToast('Sesión cerrada');
});

// ================= Navigation & Step Transitions =================
function showStep(stepNumber) {
    el.step1Container.classList.add('hidden');
    el.step1Container.classList.remove('active-step');

    el.step2Container.classList.add('hidden');
    el.step2Container.classList.remove('active-step');

    el.step3Loading.classList.add('hidden');
    el.step3Loading.classList.remove('active-step');

    el.step4Success.classList.add('hidden');
    el.step4Success.classList.remove('active-step');

    if (stepNumber === 1) {
        el.step1Container.classList.remove('hidden');
        el.step1Container.classList.add('active-step');
        el.siteNameInput.focus();
    } else if (stepNumber === 2) {
        el.step2Container.classList.remove('hidden');
        el.step2Container.classList.add('active-step');
    } else if (stepNumber === 3) {
        el.step3Loading.classList.remove('hidden');
        el.step3Loading.classList.add('active-step');
    } else if (stepNumber === 4) {
        el.step4Success.classList.remove('hidden');
        el.step4Success.classList.add('active-step');
    }
}

function resetToNewWeb() {
    state.currentSiteName = '';
    state.selectedFiles = [];
    el.siteNameInput.value = '';
    el.fileItemsList.innerHTML = '';
    el.fileListContainer.classList.add('hidden');
    el.fileInputFiles.value = '';
    el.fileInputFolder.value = '';
    showStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Step 1: Submit Name
el.formStep1.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = el.siteNameInput.value.trim();
    if (!name) {
        showToast('Por favor escribe el nombre de tu página web', 'error');
        el.siteNameInput.focus();
        return;
    }
    state.currentSiteName = name;
    el.currentProjectBadge.textContent = sanitizeSlug(name);
    showStep(2);
});

el.btnBackToStep1.addEventListener('click', () => {
    showStep(1);
});

// Demo Template
el.btnLoadDemo.addEventListener('click', () => {
    el.siteNameInput.value = 'mi-cyber-portafolio';
    state.currentSiteName = 'mi-cyber-portafolio';
    el.currentProjectBadge.textContent = 'mi-cyber-portafolio';

    state.selectedFiles = [
        {
            path: 'index.html',
            type: 'text/html',
            isBase64: false,
            size: 1420,
            content: `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Cyber Web | Brazuk4 Loader</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="card">
        <div class="badge">PROYECTO ACTIVO</div>
        <h1>¡Bienvenido a mi Web! 🚀</h1>
        <p>Esta página fue creada y publicada instantáneamente usando <strong>Brazuk4 Web Loader</strong>.</p>
        <button id="btnClick">¡Haz clic aquí!</button>
        <div id="counter">Clicks: 0</div>
    </div>
    <script src="script.js"></script>
</body>
</html>`
        },
        {
            path: 'style.css',
            type: 'text/css',
            isBase64: false,
            size: 980,
            content: `body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, #111827 0%, #030712 100%);
    font-family: 'Segoe UI', system-ui, sans-serif;
    color: #f3f4f6;
}
.card {
    background: rgba(17, 24, 39, 0.8);
    border: 1px solid #10b981;
    border-radius: 24px;
    padding: 40px;
    text-align: center;
    max-width: 480px;
    box-shadow: 0 20px 50px rgba(16, 185, 129, 0.15);
    backdrop-filter: blur(10px);
}
.badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 16px;
}
h1 { margin: 0 0 12px; font-size: 28px; }
p { color: #9ca3af; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
button {
    background: linear-gradient(135deg, #10b981, #06b6d4);
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    color: #000;
    font-weight: bold;
    cursor: pointer;
    font-size: 14px;
    transition: transform 0.2s;
}
button:hover { transform: scale(1.05); }
#counter { margin-top: 16px; font-size: 13px; color: #6ee7b7; font-family: monospace; }`
        },
        {
            path: 'script.js',
            type: 'application/javascript',
            isBase64: false,
            size: 320,
            content: `let count = 0;
const btn = document.getElementById('btnClick');
const counter = document.getElementById('counter');
btn.addEventListener('click', () => {
    count++;
    counter.textContent = 'Clicks: ' + count;
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => { btn.style.transform = 'scale(1.05)'; }, 100);
});`
        }
    ];

    renderSelectedFilesPreview();
    showStep(2);
    showToast('Plantilla demo cargada con éxito', 'info');
});

// ================= File Reading & Processing =================
async function readFileAsTextOrBase64(file) {
    return new Promise((resolve) => {
        const isText = file.type.startsWith('text/') || 
                       file.name.endsWith('.html') || 
                       file.name.endsWith('.htm') || 
                       file.name.endsWith('.css') || 
                       file.name.endsWith('.js') || 
                       file.name.endsWith('.json') || 
                       file.name.endsWith('.svg') || 
                       file.name.endsWith('.txt');

        const reader = new FileReader();
        if (isText) {
            reader.onload = (e) => resolve({ content: e.target.result, isBase64: false });
            reader.readAsText(file);
        } else {
            reader.onload = (e) => {
                const base64 = e.target.result.split(',')[1] || '';
                resolve({ content: base64, isBase64: true });
            };
            reader.readAsDataURL(file);
        }
    });
}

async function handleZipFile(zipFile) {
    try {
        const zip = await JSZip.loadAsync(zipFile);
        const extracted = [];
        
        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir) continue;
            if (relativePath.includes('__MACOSX') || relativePath.includes('.DS_Store')) continue;

            const isText = relativePath.endsWith('.html') || 
                           relativePath.endsWith('.htm') || 
                           relativePath.endsWith('.css') || 
                           relativePath.endsWith('.js') || 
                           relativePath.endsWith('.json') || 
                           relativePath.endsWith('.svg') || 
                           relativePath.endsWith('.txt');

            if (isText) {
                const text = await zipEntry.async('text');
                extracted.push({
                    path: relativePath,
                    content: text,
                    isBase64: false,
                    size: text.length,
                    type: 'text/plain'
                });
            } else {
                const base64 = await zipEntry.async('base64');
                extracted.push({
                    path: relativePath,
                    content: base64,
                    isBase64: true,
                    size: Math.round(base64.length * 0.75),
                    type: 'application/octet-stream'
                });
            }
        }
        return extracted;
    } catch (err) {
        console.error('Error unzipping file:', err);
        showToast('Error al descomprimir el archivo .ZIP', 'error');
        return [];
    }
}

async function processDataTransferItems(items) {
    const fileEntries = [];

    async function traverseEntry(entry, path = '') {
        if (entry.isFile) {
            return new Promise((resolve) => {
                entry.file(async (file) => {
                    const fullPath = path ? `${path}/${file.name}` : file.name;
                    if (file.name.toLowerCase().endsWith('.zip')) {
                        const zipFiles = await handleZipFile(file);
                        fileEntries.push(...zipFiles);
                    } else {
                        const { content, isBase64 } = await readFileAsTextOrBase64(file);
                        fileEntries.push({
                            path: fullPath,
                            content,
                            isBase64,
                            size: file.size,
                            type: file.type
                        });
                    }
                    resolve();
                });
            });
        } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const entries = await new Promise((resolve) => {
                dirReader.readEntries((results) => resolve(results || []));
            });
            for (const child of entries) {
                await traverseEntry(child, path ? `${path}/${entry.name}` : entry.name);
            }
        }
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
            const entry = item.webkitGetAsEntry();
            if (entry) {
                await traverseEntry(entry);
                continue;
            }
        }
        const file = item.getAsFile ? item.getAsFile() : item;
        if (file) {
            if (file.name.toLowerCase().endsWith('.zip')) {
                const zipFiles = await handleZipFile(file);
                fileEntries.push(...zipFiles);
            } else {
                const { content, isBase64 } = await readFileAsTextOrBase64(file);
                fileEntries.push({
                    path: file.name,
                    content,
                    isBase64,
                    size: file.size,
                    type: file.type
                });
            }
        }
    }

    return fileEntries;
}

async function processFileList(fileList) {
    const results = [];
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const relativePath = file.webkitRelativePath || file.name;
        
        if (file.name.toLowerCase().endsWith('.zip')) {
            const zipFiles = await handleZipFile(file);
            results.push(...zipFiles);
        } else {
            const { content, isBase64 } = await readFileAsTextOrBase64(file);
            results.push({
                path: relativePath,
                content,
                isBase64,
                size: file.size,
                type: file.type
            });
        }
    }
    return results;
}

function renderSelectedFilesPreview() {
    if (state.selectedFiles.length === 0) {
        el.fileListContainer.classList.add('hidden');
        el.fileItemsList.innerHTML = '';
        return;
    }

    el.fileListContainer.classList.remove('hidden');
    el.fileCountBadge.textContent = state.selectedFiles.length;

    let totalBytes = 0;
    el.fileItemsList.innerHTML = '';

    state.selectedFiles.forEach(f => {
        totalBytes += f.size || 0;
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between py-1 px-2 rounded-lg bg-gray-900/60 hover:bg-gray-800/80 transition';
        row.innerHTML = `
            <div class="flex items-center gap-2 truncate">
                ${getFileExtensionIcon(f.path)}
                <span class="truncate text-gray-300">${f.path}</span>
            </div>
            <span class="text-[10px] text-gray-500 font-mono ml-2 flex-shrink-0">${formatBytes(f.size)}</span>
        `;
        el.fileItemsList.appendChild(row);
    });

    el.fileTotalSize.textContent = formatBytes(totalBytes);
}

// Drag & Drop
['dragenter', 'dragover'].forEach(eventName => {
    el.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.dropZone.classList.add('drag-over');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    el.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.dropZone.classList.remove('drag-over');
    });
});

el.dropZone.addEventListener('drop', async (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.items && dt.items.length > 0) {
        const files = await processDataTransferItems(dt.items);
        if (files.length > 0) {
            state.selectedFiles = files;
            renderSelectedFilesPreview();
            showToast(`${files.length} archivos reconocidos`, 'success');
        }
    } else if (dt && dt.files && dt.files.length > 0) {
        const files = await processFileList(dt.files);
        if (files.length > 0) {
            state.selectedFiles = files;
            renderSelectedFilesPreview();
            showToast(`${files.length} archivos reconocidos`, 'success');
        }
    }
});

el.dropZone.addEventListener('click', (e) => {
    if (e.target.closest('#btnSelectFiles') || e.target.closest('#btnSelectFolder')) return;
    el.fileInputFiles.click();
});

el.btnSelectFiles.addEventListener('click', (e) => {
    e.stopPropagation();
    el.fileInputFiles.click();
});

el.btnSelectFolder.addEventListener('click', (e) => {
    e.stopPropagation();
    el.fileInputFolder.click();
});

el.fileInputFiles.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = await processFileList(e.target.files);
        state.selectedFiles = files;
        renderSelectedFilesPreview();
        showToast(`${files.length} archivos seleccionados`, 'success');
    }
});

el.fileInputFolder.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = await processFileList(e.target.files);
        state.selectedFiles = files;
        renderSelectedFilesPreview();
        showToast(`Carpeta cargada (${files.length} archivos)`, 'success');
    }
});

el.btnClearFiles.addEventListener('click', () => {
    state.selectedFiles = [];
    el.fileInputFiles.value = '';
    el.fileInputFolder.value = '';
    renderSelectedFilesPreview();
});

// ================= Step 3: Loading Progress & Publish =================
el.btnConfirmUpload.addEventListener('click', async () => {
    syncAuthState();

    // Check Ban
    if (state.currentUser && state.currentUser.isBanned) {
        alert('🚫 TU CUENTA ESTÁ BANEADA:\nNo tienes permiso para subir proyectos. Contacta al programador.');
        return;
    }

    if (state.selectedFiles.length === 0) {
        showToast('Por favor selecciona o arrastra al menos un archivo', 'error');
        return;
    }

    // Begin upload simulation
    showStep(3);

    const stages = [
        { pct: 20, status: 'Analizando estructura del proyecto...', detail: 'Validando index.html y assets' },
        { pct: 50, status: 'Empaquetando y optimizando archivos...', detail: 'Preparando virtual filesystem' },
        { pct: 80, status: 'Generando ruta aleatoria y enlace público...', detail: 'Creando subdirectorios /p/...' },
        { pct: 100, status: '¡Despliegue completado con éxito!', detail: 'Sitio listo y en línea' }
    ];

    for (const stage of stages) {
        el.uploadProgressBar.style.width = `${stage.pct}%`;
        el.loadingPercent.textContent = `${stage.pct}%`;
        el.loadingStatusText.textContent = stage.status;
        el.loadingStepDetail.textContent = stage.detail;
        await new Promise(r => setTimeout(r, 400));
    }

    // Generate project metadata
    const projectId = 'proj_' + Date.now().toString(36) + '_' + generateRandomSlug(6);
    const slug = sanitizeSlug(state.currentSiteName);
    const randomPath = `/p/${slug}${generateRandomHierarchicalPath()}`;
    
    let totalBytes = 0;
    state.selectedFiles.forEach(f => totalBytes += f.size || 0);

    const origin = window.location.origin;
    const pathName = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
    const publicUrl = `${origin}${pathName}/view.html?id=${projectId}&slug=${slug}`;

    const newProject = {
        id: projectId,
        name: state.currentSiteName,
        slug: slug,
        randomPath: randomPath,
        publicUrl: publicUrl,
        author: state.currentUser ? { name: state.currentUser.name, email: state.currentUser.email } : { name: 'Anónimo' },
        files: state.selectedFiles,
        fileCount: state.selectedFiles.length,
        totalBytes: totalBytes,
        totalSizeFormatted: formatBytes(totalBytes),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        await saveProjectToDB(newProject);
        
        el.successUrlInput.value = publicUrl;
        el.btnOpenSuccessSite.href = publicUrl;
        showStep(4);
        showToast('¡Proyecto publicado exitosamente!', 'success');

        await loadAndRenderProjects();
    } catch (err) {
        console.error('Error saving project:', err);
        showToast('Error al guardar el proyecto en el almacenamiento', 'error');
        showStep(2);
    }
});

// Step 4 Actions
el.btnCopySuccessUrl.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(el.successUrlInput.value);
        el.copySuccessText.textContent = '¡Copiado!';
        el.btnCopySuccessUrl.classList.add('bg-emerald-500/30', 'text-emerald-300');
        showToast('Enlace copiado al portapapeles');
        setTimeout(() => {
            el.copySuccessText.textContent = 'Copiar';
            el.btnCopySuccessUrl.classList.remove('bg-emerald-500/30', 'text-emerald-300');
        }, 2000);
    } catch (e) {
        el.successUrlInput.select();
        document.execCommand('copy');
        showToast('Enlace copiado al portapapeles');
    }
});

el.btnNewWebFromSuccess.addEventListener('click', resetToNewWeb);
el.btnNewWebTop.addEventListener('click', resetToNewWeb);
el.btnEmptyStateNewWeb.addEventListener('click', resetToNewWeb);

// ================= Dashboard: Render Projects List =================
async function loadAndRenderProjects(filterText = '') {
    try {
        state.allProjects = await getAllProjectsFromDB();
        renderProjectsList(filterText);
    } catch (err) {
        console.error('Error loading projects:', err);
    }
}

function renderProjectsList(filterText = '') {
    const query = filterText.toLowerCase().trim();
    const filtered = state.allProjects.filter(p => {
        return p.name.toLowerCase().includes(query) || (p.randomPath && p.randomPath.toLowerCase().includes(query));
    });

    el.projectsGrid.innerHTML = '';

    if (filtered.length === 0) {
        if (state.allProjects.length === 0) {
            el.emptyProjectsState.classList.remove('hidden');
        } else {
            el.emptyProjectsState.classList.add('hidden');
            el.projectsGrid.innerHTML = `
                <div class="col-span-full py-8 text-center text-gray-500 text-xs">
                    No se encontraron proyectos con "${filterText}"
                </div>
            `;
        }
        return;
    }

    el.emptyProjectsState.classList.add('hidden');

    filtered.forEach(project => {
        const card = document.createElement('div');
        card.className = 'bg-[#111827] border border-gray-800 hover:border-gray-700/80 rounded-2xl p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group';
        
        const dateStr = new Date(project.updatedAt || project.createdAt).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });

        const authorName = project.author && project.author.name ? project.author.name : 'Usuario';

        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between gap-2 mb-3">
                    <div class="flex items-center gap-2.5 truncate">
                        <div class="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 group-hover:scale-105 transition">
                            <i class="fa-solid fa-globe text-sm"></i>
                        </div>
                        <div class="truncate">
                            <h3 class="font-bold text-white text-sm sm:text-base truncate group-hover:text-emerald-400 transition" title="${project.name}">
                                ${project.name}
                            </h3>
                            <span class="text-[10px] text-gray-500 font-mono block">Por: ${authorName} • ${dateStr}</span>
                        </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex-shrink-0">
                        Pública
                    </span>
                </div>

                <!-- Custom Random Path Badge -->
                <div class="mb-4 bg-[#090D16] border border-gray-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono text-gray-400">
                    <span class="truncate text-emerald-400/90 text-[11px]" title="${project.randomPath}">
                        ${project.randomPath || ('/p/' + project.slug)}
                    </span>
                    <button class="btn-copy-card-path ml-1.5 text-gray-500 hover:text-emerald-400 transition" title="Copiar enlace" data-url="${project.publicUrl}">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                </div>

                <div class="flex items-center gap-3 text-[11px] text-gray-400 mb-4 pb-3 border-b border-gray-800/60">
                    <span><i class="fa-regular fa-file-code text-teal-400 mr-1"></i> ${project.fileCount} archivos</span>
                    <span>•</span>
                    <span><i class="fa-solid fa-hard-drive text-cyan-400 mr-1"></i> ${project.totalSizeFormatted}</span>
                </div>
            </div>

            <div class="flex items-center justify-between gap-1.5 pt-1">
                <a 
                    href="${project.publicUrl}" 
                    target="_blank" 
                    class="flex-1 py-2 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition"
                >
                    <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                    <span>Ver Web</span>
                </a>

                <button 
                    class="btn-update-project py-2 px-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium border border-gray-700 transition flex items-center gap-1"
                    data-id="${project.id}"
                    data-name="${project.name}"
                    title="Mandar nuevos archivos para actualizar"
                >
                    <i class="fa-solid fa-rotate text-teal-400 text-[11px]"></i>
                    <span class="hidden sm:inline">Actualizar</span>
                </button>

                <button 
                    class="btn-download-zip p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition" 
                    data-id="${project.id}" 
                    title="Descargar ZIP"
                >
                    <i class="fa-solid fa-download text-xs"></i>
                </button>

                <button 
                    class="btn-delete-project p-2 rounded-xl bg-gray-800 hover:bg-red-500/20 hover:text-red-400 text-gray-500 border border-gray-700 transition" 
                    data-id="${project.id}" 
                    title="Eliminar proyecto"
                >
                    <i class="fa-regular fa-trash-can text-xs"></i>
                </button>
            </div>
        `;

        el.projectsGrid.appendChild(card);
    });

    attachCardEventListeners();
}

function attachCardEventListeners() {
    document.querySelectorAll('.btn-copy-card-path').forEach(btn => {
        btn.addEventListener('click', async () => {
            const url = btn.getAttribute('data-url');
            try {
                await navigator.clipboard.writeText(url);
                showToast('Enlace copiado al portapapeles');
            } catch (err) {
                prompt('Copia este enlace:', url);
            }
        });
    });

    document.querySelectorAll('.btn-update-project').forEach(btn => {
        btn.addEventListener('click', () => {
            syncAuthState();
            if (state.currentUser && state.currentUser.isBanned) {
                alert('🚫 TU CUENTA ESTÁ BANEADA:\nNo puedes actualizar proyectos.');
                return;
            }
            const id = btn.getAttribute('data-id');
            const name = btn.getAttribute('data-name');
            openUpdateModal(id, name);
        });
    });

    document.querySelectorAll('.btn-download-zip').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const project = state.allProjects.find(p => p.id === id);
            if (!project) return;

            showToast('Generando archivo ZIP...', 'info');
            const zip = new JSZip();

            project.files.forEach(file => {
                const normPath = file.path.replace(/^\/+/, '');
                if (file.isBase64) {
                    zip.file(normPath, file.content, { base64: true });
                } else {
                    zip.file(normPath, file.content);
                }
            });

            const content = await zip.generateAsync({ type: 'blob' });
            const downloadUrl = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${project.slug || 'proyecto'}-brazuk4.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            showToast('Descarga iniciada');
        });
    });

    document.querySelectorAll('.btn-delete-project').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const project = state.allProjects.find(p => p.id === id);
            if (!project) return;

            if (confirm(`¿Estás seguro de que deseas eliminar "${project.name}"?`)) {
                await deleteProjectFromDB(id);
                showToast(`Proyecto "${project.name}" eliminado`, 'info');
                await loadAndRenderProjects(el.projectSearchInput.value);
            }
        });
    });
}

el.projectSearchInput.addEventListener('input', (e) => {
    renderProjectsList(e.target.value);
});

// ================= Update Modal Logic =================
function openUpdateModal(projectId, projectName) {
    state.updatingProjectId = projectId;
    state.updateSelectedFiles = [];
    el.updateModalProjectName.textContent = projectName;
    el.modalUpdateFilesList.innerHTML = '';
    el.modalUpdateFilesList.classList.add('hidden');
    el.modalUpdateProgress.classList.add('hidden');
    el.btnConfirmUpdateModal.disabled = true;
    el.updateModal.classList.remove('hidden');
}

function closeUpdateModal() {
    state.updatingProjectId = null;
    state.updateSelectedFiles = [];
    el.updateModal.classList.add('hidden');
}

el.btnCloseUpdateModal.addEventListener('click', closeUpdateModal);
el.btnCancelUpdateModal.addEventListener('click', closeUpdateModal);

['dragenter', 'dragover'].forEach(eventName => {
    el.modalUpdateDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.modalUpdateDropZone.classList.add('drag-over');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    el.modalUpdateDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.modalUpdateDropZone.classList.remove('drag-over');
    });
});

el.modalUpdateDropZone.addEventListener('drop', async (e) => {
    const dt = e.dataTransfer;
    let files = [];
    if (dt && dt.items && dt.items.length > 0) {
        files = await processDataTransferItems(dt.items);
    } else if (dt && dt.files && dt.files.length > 0) {
        files = await processFileList(dt.files);
    }

    if (files.length > 0) {
        state.updateSelectedFiles = files;
        renderModalUpdateFilesList();
    }
});

el.modalUpdateDropZone.addEventListener('click', () => {
    el.modalUpdateFileInput.click();
});

el.modalUpdateFileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = await processFileList(e.target.files);
        state.updateSelectedFiles = files;
        renderModalUpdateFilesList();
    }
});

function renderModalUpdateFilesList() {
    if (state.updateSelectedFiles.length === 0) {
        el.modalUpdateFilesList.classList.add('hidden');
        el.btnConfirmUpdateModal.disabled = true;
        return;
    }

    el.modalUpdateFilesList.classList.remove('hidden');
    el.modalUpdateFilesList.innerHTML = `<div class="font-bold text-gray-400 mb-1 text-[11px]">Nuevos archivos (${state.updateSelectedFiles.length}):</div>`;

    state.updateSelectedFiles.forEach(f => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between py-0.5 text-gray-300';
        item.innerHTML = `<span class="truncate">${f.path}</span><span class="text-gray-500 font-mono text-[10px]">${formatBytes(f.size)}</span>`;
        el.modalUpdateFilesList.appendChild(item);
    });

    el.btnConfirmUpdateModal.disabled = false;
}

el.btnConfirmUpdateModal.addEventListener('click', async () => {
    syncAuthState();
    if (state.currentUser && state.currentUser.isBanned) {
        alert('🚫 TU CUENTA ESTÁ BANEADA:\nNo puedes actualizar proyectos.');
        return;
    }

    if (!state.updatingProjectId || state.updateSelectedFiles.length === 0) return;

    const project = state.allProjects.find(p => p.id === state.updatingProjectId);
    if (!project) return;

    el.modalUpdateProgress.classList.remove('hidden');
    el.btnConfirmUpdateModal.disabled = true;

    for (let p = 20; p <= 100; p += 25) {
        el.modalUpdateProgressBar.style.width = `${p}%`;
        await new Promise(r => setTimeout(r, 180));
    }

    let totalBytes = 0;
    state.updateSelectedFiles.forEach(f => totalBytes += f.size || 0);

    project.files = state.updateSelectedFiles;
    project.fileCount = state.updateSelectedFiles.length;
    project.totalBytes = totalBytes;
    project.totalSizeFormatted = formatBytes(totalBytes);
    project.updatedAt = new Date().toISOString();

    try {
        await saveProjectToDB(project);
        showToast(`Proyecto "${project.name}" actualizado exitosamente`, 'success');
        closeUpdateModal();
        await loadAndRenderProjects(el.projectSearchInput.value);
    } catch (err) {
        console.error('Error updating project:', err);
        showToast('Error al actualizar el proyecto', 'error');
    }
});

// ================= Initialize App =================
window.addEventListener('DOMContentLoaded', async () => {
    syncAuthState();
    await loadAndRenderProjects();
    showStep(1);
});
