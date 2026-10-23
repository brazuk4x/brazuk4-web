/**
 * Brazuk4 Web Loader - Authentication & User Management Module
 * Simulated Seamless Google Auth (No external API keys required)
 * Shared between main app and secret admin panel
 */

const AUTH_STORAGE_KEY = 'brazuk4_current_user';
const USERS_STORAGE_KEY = 'brazuk4_registered_users';
const ADMIN_SECRET_KEY = 'brazuk4_master_2026';

// Default initial users for preview (including "Juanito")
const INITIAL_USERS = [
    {
        id: 'usr_g_juanito',
        name: 'Juanito Pérez',
        email: 'juanito.perez@gmail.com',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Juanito',
        isBanned: false,
        registeredAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        projectsCount: 2
    },
    {
        id: 'usr_g_maria',
        name: 'María González',
        email: 'maria.gonzalez@gmail.com',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Maria',
        isBanned: false,
        registeredAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        projectsCount: 1
    },
    {
        id: 'usr_g_carlos',
        name: 'Carlos Dev',
        email: 'carlos.coder@gmail.com',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Carlos',
        isBanned: true,
        registeredAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        projectsCount: 0
    }
];

// Initialize users storage
function getStoredUsers() {
    try {
        const raw = localStorage.getItem(USERS_STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
            return INITIAL_USERS;
        }
        return JSON.parse(raw);
    } catch (e) {
        console.error('Error reading users from storage:', e);
        return INITIAL_USERS;
    }
}

function saveStoredUsers(users) {
    try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
        console.error('Error saving users to storage:', e);
    }
}

// Current logged in user
function getCurrentUser() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        const user = JSON.parse(raw);
        // Sync with users database to check if banned
        const allUsers = getStoredUsers();
        const found = allUsers.find(u => u.email.toLowerCase() === user.email.toLowerCase());
        if (found) {
            user.isBanned = !!found.isBanned;
        }
        return user;
    } catch (e) {
        return null;
    }
}

function setCurrentUser(user) {
    if (!user) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
}

// Register or Login with Google data (Name + Email only, NO password)
function loginOrRegisterGoogleUser(name, email, customAvatar = null) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const users = getStoredUsers();

    let existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (existingUser) {
        // If banned, refuse login
        if (existingUser.isBanned) {
            return {
                success: false,
                isBanned: true,
                message: `La cuenta (${cleanEmail}) ha sido suspendida/baneada por el administrador.`
            };
        }
        existingUser.name = cleanName || existingUser.name;
        if (customAvatar) existingUser.avatar = customAvatar;
        saveStoredUsers(users);
        setCurrentUser(existingUser);
        return { success: true, user: existingUser, isNew: false };
    }

    // Create new registered user
    const avatar = customAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName || cleanEmail)}`;
    const newUser = {
        id: 'usr_g_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        name: cleanName || cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: avatar,
        isBanned: false,
        registeredAt: new Date().toISOString(),
        projectsCount: 0
    };

    users.unshift(newUser);
    saveStoredUsers(users);
    setCurrentUser(newUser);

    return { success: true, user: newUser, isNew: true };
}

// Ban user
function banUser(userId) {
    const users = getStoredUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        user.isBanned = true;
        saveStoredUsers(users);

        // If the banned user is currently logged in, sync their state
        const current = getCurrentUser();
        if (current && current.id === userId) {
            current.isBanned = true;
            setCurrentUser(current);
        }
        return true;
    }
    return false;
}

// Unban user
function unbanUser(userId) {
    const users = getStoredUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        user.isBanned = false;
        saveStoredUsers(users);

        // If the unbanned user is currently logged in, sync their state
        const current = getCurrentUser();
        if (current && current.id === userId) {
            current.isBanned = false;
            setCurrentUser(current);
        }
        return true;
    }
    return false;
}

// Delete user
function deleteUser(userId) {
    let users = getStoredUsers();
    users = users.filter(u => u.id !== userId);
    saveStoredUsers(users);

    const current = getCurrentUser();
    if (current && current.id === userId) {
        setCurrentUser(null);
    }
    return true;
}

// Logout
function logoutUser() {
    setCurrentUser(null);
}

// Expose functions globally
window.BrazukAuth = {
    getStoredUsers,
    getCurrentUser,
    setCurrentUser,
    loginOrRegisterGoogleUser,
    banUser,
    unbanUser,
    deleteUser,
    logoutUser,
    ADMIN_SECRET_KEY
};
