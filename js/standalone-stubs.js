/**
 * RhinoMap Toolbox — Standalone shim
 * ------------------------------------------------------------------
 * Replaces the old backend layer (config.js / auth.js / async-helpers.js).
 * Everything here runs 100% client-side: no API, no account, no tokens.
 * Loaded BEFORE every other module so the carto code finds the globals
 * it expects (logger, API_CONFIG, TokenManager, currentUser, ...).
 * Declared with var/function so a stray redeclaration never throws.
 * ------------------------------------------------------------------
 */

/* --- Environment & logger (ported from config.js) --- */
var IS_PRODUCTION = false;
var DEBUG = false;
try { if (localStorage.getItem('DEBUG') !== null) DEBUG = localStorage.getItem('DEBUG') === 'true'; } catch (e) {}
window.IS_PRODUCTION = IS_PRODUCTION;
window.logger = {
    log:            DEBUG ? console.log.bind(console)   : function () {},
    debug:          DEBUG ? console.debug.bind(console) : function () {},
    info:           DEBUG ? console.info.bind(console)  : function () {},
    warn:           console.warn.bind(console),
    error:          console.error.bind(console),
    table:          DEBUG ? console.table.bind(console) : function () {},
    group:          DEBUG ? console.group.bind(console) : function () {},
    groupEnd:       DEBUG ? console.groupEnd.bind(console) : function () {},
    groupCollapsed: DEBUG ? console.groupCollapsed.bind(console) : function () {}
};

/* --- API config (no backend) --- */
var API_CONFIG = {
    BASE_URL: '',
    ENDPOINTS: {},
    COSTS: { OVERPASS_GENERATE: 0, IMAGE_ANALYZE: 0 }
};

/* --- Fake local user: always "signed in", unlimited, offline --- */
var currentUser = {
    id: 1,
    username: 'local',
    email: 'standalone@local',
    tokens_balance: 999999,
    unlimited_tokens: true
};

var TokenManager = {
    getAccessToken:  function () { return null; },
    getRefreshToken: function () { return null; },
    setTokens:       function () {},
    clearTokens:     function () {},
    isAuthenticated: function () { return true; }
};

var APIClient = {
    request:                    function () { return Promise.reject(new Error('Standalone mode: no backend')); },
    refreshToken:               function () { return Promise.resolve(true); },
    showAuthenticationRequired: function () {}
};

function authFetch() { return Promise.reject(new Error('Standalone mode: no backend')); }
window.authFetch = authFetch;

/* --- Auth no-ops (auth.js is not loaded in standalone) --- */
function checkAuth() {}
function refreshAccessToken() { return Promise.resolve(true); }
function startTokenRefresh() {}
function stopTokenRefresh() {}
function handleSessionExpired() {}
function logout() {}
function showLoginModal() {}
function showRegisterModal() {}
function showForgotPasswordModal() {}
function showAccountPage() {}
function toggleUserMenu() {}
function closeModal(id) { var m = document.getElementById(id); if (m) m.classList.remove('active'); }
window.handleSessionExpired = handleSessionExpired;

/* --- ShareManager stub (share-manager.js not loaded) --- */
function ShareManager() {}
ShareManager.prototype.init = function () {};
window.ShareManager = ShareManager;
