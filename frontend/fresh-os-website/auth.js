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

function setAuthData(token, user) {
    if (token) {
        localStorage.setItem('fresh_os_token', token);
        sessionStorage.setItem('fresh_os_token', token);
    }
    if (user) {
        localStorage.setItem('fresh_os_user', JSON.stringify(user));
        sessionStorage.setItem('fresh_os_user', JSON.stringify(user));
    }
}

function clearAuthData() {
    sessionStorage.removeItem('fresh_os_token');
    sessionStorage.removeItem('fresh_os_user');
    localStorage.removeItem('fresh_os_token');
    localStorage.removeItem('fresh_os_user');
    localStorage.removeItem('fresh_os_remembered');
    localStorage.removeItem('fresh_os_remembered_name');
    localStorage.removeItem('fresh_os_remembered_email');
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
        'warehouse_manager': 'Warehouse Manager',
        'food_quality_inspector': 'Food Quality Inspector',
        'admin': 'Administrator'
    };
    return map[role] || role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function updateUserUI(user) {
    if (!user) return;
    
    const apply = () => {
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

        // Initialize Notification Bell System
        initNotificationBell();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }
}

// -------------------------------------------------------------
// In-App Notification Bell System
// -------------------------------------------------------------
let cachedNotifications = [];
let activeNotifScope = 'all';

async function fetchUserNotifications() {
    const token = getAuthToken();
    if (!token) return [];

    try {
        const res = await fetch(`${API_BASE_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return [];
        const data = await res.json();
        cachedNotifications = data.items || [];
        updateNotificationBadges(data.unread_count || 0);
        return cachedNotifications;
    } catch (e) {
        return [];
    }
}

function updateNotificationBadges(unreadCount) {
    const bells = findNotificationBells();
    bells.forEach(bell => {
        let badge = bell.querySelector('.notification-badge-dot');
        if (!badge) {
            badge = bell.querySelector('span.notification-badge-dot') || bell.querySelector('span.rounded-full');
            if (badge) {
                badge.classList.add('notification-badge-dot');
            }
        }

        if (unreadCount > 0) {
            const displayCount = unreadCount > 9 ? '9+' : unreadCount;
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge-dot absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#ba1a1a] text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center shadow-md animate-pulse pointer-events-none';
                bell.appendChild(badge);
            }
            badge.textContent = displayCount;
            badge.classList.remove('hidden');
            badge.style.display = 'flex';
        } else if (badge) {
            badge.classList.add('hidden');
            badge.style.display = 'none';
        }
    });
}

function findNotificationBells() {
    const candidateList = Array.from(document.querySelectorAll('#notificationBellBtn, [data-notification-bell], button, a'));
    return candidateList.filter(btn => {
        if (btn.closest('#freshOsNotificationDropdown')) return false;
        if (btn.id === 'notificationBellBtn' || btn.hasAttribute('data-notification-bell')) return true;
        const icon = btn.querySelector('.material-symbols-outlined, [data-icon="notifications"]');
        if (icon && (icon.textContent || '').trim().includes('notifications')) return true;
        const text = btn.textContent || '';
        return text.includes('notifications') && !text.includes('Settings') && !text.includes('Push') && !text.includes('In-App');
    });
}

function ensureNotificationDropdown() {
    let dropdown = document.getElementById('freshOsNotificationDropdown');
    if (dropdown) return dropdown;

    dropdown = document.createElement('div');
    dropdown.id = 'freshOsNotificationDropdown';
    dropdown.className = 'fixed z-[9999] w-84 sm:w-96 max-w-[calc(100vw-24px)] bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-variant hidden flex-col overflow-hidden text-on-surface';
    dropdown.innerHTML = `
        <div class="p-4 border-b border-surface-variant flex items-center justify-between bg-surface-container-low">
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-error text-[22px]">warning</span>
                <div>
                    <div class="font-bold text-sm text-on-surface leading-tight">Spoilage Alerts</div>
                    <div class="text-[10px] text-on-surface-variant">Active food risk monitoring</div>
                </div>
                <span id="notifUnreadPill" class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-error/15 text-error ml-1">0 new</span>
            </div>
            <button onclick="markAllNotificationsRead()" class="text-xs font-semibold text-primary hover:underline">Mark all read</button>
        </div>
        <div id="notifTabsContainer" class="flex border-b border-surface-variant px-2 pt-2 bg-surface-container-low gap-1 text-xs">
            <button id="notif-tab-all" onclick="filterNotifScope('all')" class="px-3 py-1.5 font-bold border-b-2 border-primary text-primary transition-colors">All Alerts</button>
            <button id="notif-tab-personal" onclick="filterNotifScope('personal')" class="px-3 py-1.5 font-semibold text-on-surface-variant hover:text-on-surface border-b-2 border-transparent transition-colors">My Storage</button>
            <button id="notif-tab-shared" onclick="filterNotifScope('shared')" class="px-3 py-1.5 font-semibold text-on-surface-variant hover:text-on-surface border-b-2 border-transparent transition-colors">Shared Inventory</button>
        </div>
        <div id="notifListContainer" class="max-h-84 overflow-y-auto divide-y divide-surface-variant/40 flex flex-col">
            <div class="p-6 text-center text-xs text-on-surface-variant">Loading spoilage alerts...</div>
        </div>
        <div class="p-2.5 text-center bg-surface-container-low border-t border-surface-variant text-[11px] text-on-surface-variant flex items-center justify-center gap-1.5">
            <span class="material-symbols-outlined text-[14px] text-primary">verified_user</span>
            <span>Fresh.OS Real-Time Spoilage &amp; Safety Monitoring</span>
        </div>
    `;

    document.body.appendChild(dropdown);

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        const isBell = findNotificationBells().some(b => b.contains(e.target));
        if (!isBell && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
            dropdown.classList.remove('flex');
        }
    });

    return dropdown;
}

function updateTabsForUserRole() {
    const user = getAuthUser();
    const isCustomer = user && (user.role === 'consumer');
    const personalTab = document.getElementById('notif-tab-personal');
    const allTab = document.getElementById('notif-tab-all');
    const sharedTab = document.getElementById('notif-tab-shared');

    if (!personalTab) return;

    if (!isCustomer) {
        // Staff/non-customer roles: notifications are strictly from shared inventory
        personalTab.style.display = 'none';
        if (allTab) allTab.style.display = 'none';
        if (sharedTab) {
            sharedTab.textContent = 'Inventory Spoilage Alerts';
            sharedTab.className = 'px-3 py-1.5 font-bold border-b-2 border-primary text-primary transition-colors';
            activeNotifScope = 'shared';
        }
    } else {
        personalTab.style.display = 'inline-block';
        if (allTab) allTab.style.display = 'inline-block';
        if (sharedTab) {
            sharedTab.textContent = 'Shared Inventory';
        }
    }
}

function filterNotifScope(scope) {
    activeNotifScope = scope;
    ['all', 'personal', 'shared'].forEach(s => {
        const tab = document.getElementById(`notif-tab-${s}`);
        if (!tab) return;
        if (s === scope) {
            tab.className = 'px-3 py-1.5 font-bold border-b-2 border-primary text-primary transition-colors';
        } else {
            tab.className = 'px-3 py-1.5 font-semibold text-on-surface-variant hover:text-on-surface border-b-2 border-transparent transition-colors';
        }
    });
    renderNotificationList();
}

function renderNotificationList() {
    const container = document.getElementById('notifListContainer');
    const unreadPill = document.getElementById('notifUnreadPill');
    if (!container) return;

    const unreadCount = cachedNotifications.filter(n => !n.is_read).length;
    if (unreadPill) unreadPill.textContent = `${unreadCount} new`;

    let filtered = cachedNotifications;
    if (activeNotifScope !== 'all') {
        filtered = cachedNotifications.filter(n => n.scope === activeNotifScope);
    }

    if (filtered.length === 0) {
        const emptyMsg = activeNotifScope === 'personal'
            ? 'No spoilage alerts in your personal storage.'
            : (activeNotifScope === 'shared' ? 'No spoilage alerts in inventory.' : 'No active food spoilage alerts.');
        container.innerHTML = `
            <div class="p-8 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
                <span class="material-symbols-outlined text-3xl text-primary/60">check_circle</span>
                <span class="font-semibold text-on-surface">Optimal Freshness</span>
                <span>${emptyMsg}</span>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(notif => {
        const isPersonal = notif.scope === 'personal';
        const titleLower = (notif.title || '').toLowerCase();
        const typeLower = (notif.type || '').toLowerCase();

        const isCritical = typeLower === 'spoilage_critical' ||
                           typeLower === 'personal_expired' ||
                           titleLower.includes('critical') ||
                           titleLower.includes('expired') ||
                           titleLower.includes('spoiled');

        let icon = isCritical ? 'report_problem' : 'warning';
        let iconColor = isCritical ? 'text-error bg-error/15' : 'text-[#b45309] bg-[#fef3c7]';
        let borderHighlight = isCritical ? 'border-l-4 border-l-error' : 'border-l-4 border-l-[#f59e0b]';
        let severityTag = isCritical
            ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-error/10 text-error uppercase tracking-wider">Spoiled</span>'
            : '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#fef3c7] text-[#b45309] uppercase tracking-wider">Near Spoilage</span>';

        const unreadDot = !notif.is_read ? '<span class="w-2 h-2 rounded-full bg-error shrink-0 animate-pulse"></span>' : '';
        const targetUrl = isPersonal ? 'inventory.html?scope=personal' : (notif.item_id ? `item-details.html?id=${notif.item_id}` : 'inventory.html');

        return `
            <div onclick="handleNotificationClick(${notif.id}, '${targetUrl}')" class="p-3.5 hover:bg-surface-container transition-colors flex items-start gap-3 cursor-pointer ${borderHighlight} ${!notif.is_read ? 'bg-error/5' : ''}">
                <div class="w-8 h-8 rounded-full ${iconColor} flex items-center justify-center shrink-0 mt-0.5">
                    <span class="material-symbols-outlined text-[18px]">${icon}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-1 mb-1">
                        <div class="flex items-center gap-1.5 truncate">
                            <span class="text-xs font-bold text-on-surface truncate">${notif.title}</span>
                            ${severityTag}
                        </div>
                        ${unreadDot}
                    </div>
                    <p class="text-xs text-on-surface-variant line-clamp-2 leading-relaxed mb-1.5">${notif.message}</p>
                    <div class="flex items-center gap-2 text-[10px] text-on-surface-variant/80">
                        <span class="px-1.5 py-0.2 rounded font-semibold ${isPersonal ? 'bg-purple-100 text-purple-800' : 'bg-surface-container text-on-surface-variant'}">${isPersonal ? 'My Storage' : 'Inventory'}</span>
                        ${notif.batch_id ? `<span class="font-mono">Lot #${notif.batch_id}</span>` : ''}
                    </div>
                </div>
                <button onclick="event.stopPropagation(); dismissNotification(${notif.id})" title="Dismiss" class="text-on-surface-variant hover:text-error p-1 transition-colors">
                    <span class="material-symbols-outlined text-[16px]">close</span>
                </button>
            </div>
        `;
    }).join('');
}

window.toggleNotificationDropdown = async function(e, bellEl) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const dropdown = ensureNotificationDropdown();
    const bell = bellEl || document.getElementById('notificationBellBtn') || findNotificationBells()[0];

    if (dropdown.classList.contains('hidden')) {
        if (bell) {
            const rect = bell.getBoundingClientRect();
            dropdown.style.position = 'fixed';
            dropdown.style.top = `${rect.bottom + 8}px`;
            const rightOffset = Math.max(16, window.innerWidth - rect.right - 8);
            dropdown.style.right = `${rightOffset}px`;
            dropdown.style.left = 'auto';
        }
        dropdown.classList.remove('hidden');
        dropdown.classList.add('flex');
        updateTabsForUserRole();
        await fetchUserNotifications();
        renderNotificationList();
    } else {
        dropdown.classList.add('hidden');
        dropdown.classList.remove('flex');
    }
};

async function handleNotificationClick(id, targetUrl) {
    await markNotificationRead(id);
    if (targetUrl && !window.location.href.includes(targetUrl)) {
        window.location.href = targetUrl;
    }
}

async function markNotificationRead(id) {
    const token = getAuthToken();
    try {
        await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const n = cachedNotifications.find(item => item.id === id);
        if (n) n.is_read = true;
        const unread = cachedNotifications.filter(item => !item.is_read).length;
        updateNotificationBadges(unread);
        renderNotificationList();
    } catch (e) {}
}

async function markAllNotificationsRead() {
    const token = getAuthToken();
    try {
        await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        cachedNotifications.forEach(n => n.is_read = true);
        updateNotificationBadges(0);
        renderNotificationList();
    } catch (e) {}
}

async function dismissNotification(id) {
    const token = getAuthToken();
    try {
        await fetch(`${API_BASE_URL}/notifications/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        cachedNotifications = cachedNotifications.filter(n => n.id !== id);
        const unread = cachedNotifications.filter(item => !item.is_read).length;
        updateNotificationBadges(unread);
        renderNotificationList();
    } catch (e) {}
}

function initNotificationBell() {
    const bells = findNotificationBells();
    if (bells.length === 0) return;

    ensureNotificationDropdown();

    bells.forEach(bell => {
        bell.style.position = 'relative';
        // Remove existing hardcoded badges to avoid duplicate dots
        const existingStaticDot = bell.querySelector('span.absolute:not(.notification-badge-dot)');
        if (existingStaticDot) existingStaticDot.remove();

        bell.onclick = (e) => {
            window.toggleNotificationDropdown(e, bell);
        };
    });

    // Initial check for unread notifications and badge display
    fetchUserNotifications();
}

// Auto-run bell initialization on DOM ready if user is authenticated
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (getAuthToken()) {
                initNotificationBell();
            }
        });
    } else {
        if (getAuthToken()) {
            initNotificationBell();
        }
    }
    // Re-check notifications on window focus
    window.addEventListener('focus', () => {
        if (getAuthToken()) {
            fetchUserNotifications();
        }
    });
}
