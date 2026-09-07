const API_BASE_URL = 'http://localhost:8000';

function getAuthToken() {
    return sessionStorage.getItem('fresh_os_token') || localStorage.getItem('fresh_os_token');
}

function getAuthUser() {
    const raw = sessionStorage.getItem('fresh_os_user') || localStorage.getItem('fresh_os_user');
    try {
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function setAuthData(token, user, remember = false) {
    if (remember) {
        localStorage.setItem('fresh_os_token', token);
        localStorage.setItem('fresh_os_user', JSON.stringify(user));
    }
    sessionStorage.setItem('fresh_os_token', token);
    sessionStorage.setItem('fresh_os_user', JSON.stringify(user));
}

function clearAuthData() {
    sessionStorage.removeItem('fresh_os_token');
    sessionStorage.removeItem('fresh_os_user');
    localStorage.removeItem('fresh_os_token');
    localStorage.removeItem('fresh_os_user');
}

function logout() {
    clearAuthData();
    window.location.href = 'sign-in.html';
}

async function requireAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = 'sign-in.html';
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            clearAuthData();
            window.location.href = 'sign-in.html';
            return null;
        }

        const user = await response.json();
        sessionStorage.setItem('fresh_os_user', JSON.stringify(user));
        updateUserUI(user);
        return user;
    } catch (err) {
        // If server is temporarily unreachable, fall back to cached user info if available
        const cachedUser = getAuthUser();
        if (cachedUser) {
            updateUserUI(cachedUser);
            return cachedUser;
        }
        return null;
    }
}

function formatRoleName(role) {
    if (!role) return '';
    const map = {
        'consumer': 'Consumer',
        'retail_manager': 'Retail Manager',
        'warehouse_operator': 'Warehouse Operator',
        'food_quality_inspector': 'Food Quality Inspector',
        'admin': 'Administrator'
    };
    return map[role] || role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function updateUserUI(user) {
    if (!user) return;
    
    // Update header name display
    const nameDisplays = document.querySelectorAll('.header-user-name, [data-user-name]');
    nameDisplays.forEach(el => {
        el.textContent = user.full_name;
    });

    // Update header role display
    const roleDisplays = document.querySelectorAll('.header-user-role, [data-user-role]');
    roleDisplays.forEach(el => {
        el.textContent = formatRoleName(user.role);
    });

    // Update greeting heading if present
    const greetingDisplays = document.querySelectorAll('.user-greeting');
    greetingDisplays.forEach(el => {
        const firstName = user.full_name.split(' ')[0];
        el.textContent = `Good morning, ${firstName}`;
    });
}
