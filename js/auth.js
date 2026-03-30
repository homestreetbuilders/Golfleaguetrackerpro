/* =====================================================
   GolfLeague TrackerPro — Authentication (Netlify Identity)
   Supports roles: admin, scorer, player
   ===================================================== */

(function () {
  const IDENTITY_URL = '/.netlify/identity';

  // DOM elements
  const authScreen = document.getElementById('authScreen');
  const authForm = document.getElementById('authForm');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authName = document.getElementById('authName');
  const nameFieldWrapper = document.getElementById('nameFieldWrapper');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authMessage = document.getElementById('authMessage');
  const authSubtitle = document.getElementById('authSubtitle');
  const authToggleText = document.getElementById('authToggleText');
  const authToggleLink = document.getElementById('authToggleLink');
  const logoutBtn = document.getElementById('logoutBtn');
  const userDisplay = document.getElementById('userDisplay');

  let isSignUp = false;

  // ---- Expose current user role globally ----
  window.GLTP_USER = { role: 'player', email: '', name: '', roles: [] };

  function showMessage(text, isError) {
    authMessage.textContent = text;
    authMessage.className = 'auth-message ' + (isError ? 'auth-error' : 'auth-success');
    authMessage.style.display = 'block';
  }

  function hideMessage() {
    authMessage.style.display = 'none';
  }

  function setLoading(loading) {
    authSubmitBtn.disabled = loading;
    authSubmitBtn.textContent = loading
      ? (isSignUp ? 'Creating Account...' : 'Signing In...')
      : (isSignUp ? 'Sign Up' : 'Sign In');
  }

  function toggleMode() {
    isSignUp = !isSignUp;
    hideMessage();
    if (isSignUp) {
      authSubtitle.textContent = 'Create your account';
      authSubmitBtn.textContent = 'Sign Up';
      authToggleText.textContent = 'Already have an account?';
      authToggleLink.textContent = 'Sign In';
      nameFieldWrapper.style.display = 'block';
    } else {
      authSubtitle.textContent = 'Sign in to your account';
      authSubmitBtn.textContent = 'Sign In';
      authToggleText.textContent = "Don't have an account?";
      authToggleLink.textContent = 'Sign Up';
      nameFieldWrapper.style.display = 'none';
    }
  }

  authToggleLink.addEventListener('click', function (e) {
    e.preventDefault();
    toggleMode();
  });

  // --- API calls ---

  async function apiSignup(email, password, fullName) {
    var body = { email: email, password: password };
    if (fullName) {
      body.data = { full_name: fullName };
    }
    var res = await fetch(IDENTITY_URL + '/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.msg || data.error_description || data.error || 'Signup failed');
    }
    return data;
  }

  async function apiLogin(email, password) {
    var params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', email);
    params.append('password', password);
    var res = await fetch(IDENTITY_URL + '/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.msg || data.error_description || data.error || 'Login failed');
    }
    return data;
  }

  async function apiGetUser(token) {
    var res = await fetch(IDENTITY_URL + '/user', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return null;
    return await res.json();
  }

  // --- Role helpers ---

  function extractRoles(user) {
    // Roles come from app_metadata (set by identity-signup function or admin API)
    var roles = [];
    if (user && user.app_metadata && user.app_metadata.roles) {
      roles = user.app_metadata.roles;
    }
    // fallback: check user_metadata
    if (roles.length === 0 && user && user.user_metadata && user.user_metadata.roles) {
      roles = user.user_metadata.roles;
    }
    if (roles.length === 0) roles = ['player'];
    return roles;
  }

  function getPrimaryRole(roles) {
    // Priority: admin > scorer > player
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('scorer')) return 'scorer';
    return 'player';
  }

  function applyRoleAccess(role) {
    document.body.setAttribute('data-role', role);
    // Show role badge in topbar
    var roleBadge = document.getElementById('roleBadge');
    if (roleBadge) {
      var labels = { admin: 'Admin', scorer: 'Scorer Admin', player: 'Player' };
      roleBadge.textContent = labels[role] || 'Player';
      roleBadge.className = 'role-badge role-' + role;
    }
  }

  // --- Session management ---

  function saveSession(tokenData) {
    var session = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in * 1000),
      token_type: tokenData.token_type
    };
    localStorage.setItem('gltp_session', JSON.stringify(session));
    document.cookie = 'nf_jwt=' + tokenData.access_token + '; path=/; max-age=' + tokenData.expires_in;
    return session;
  }

  function getSession() {
    try {
      var raw = localStorage.getItem('gltp_session');
      if (!raw) return null;
      var session = JSON.parse(raw);
      if (session.expires_at && Date.now() > session.expires_at) {
        clearSession();
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem('gltp_session');
    document.cookie = 'nf_jwt=; path=/; max-age=0';
  }

  function showDashboard(user) {
    authScreen.style.display = 'none';
    var displayName = '';
    if (user && user.user_metadata && user.user_metadata.full_name) {
      displayName = user.user_metadata.full_name;
    } else if (user && user.email) {
      displayName = user.email;
    }
    if (userDisplay) {
      userDisplay.textContent = displayName;
    }

    // Set global user info with roles
    var roles = extractRoles(user);
    var role = getPrimaryRole(roles);
    window.GLTP_USER = {
      role: role,
      roles: roles,
      email: (user && user.email) || '',
      name: displayName,
      id: (user && user.id) || '',
      token: getSession()?.access_token || ''
    };

    applyRoleAccess(role);

    // Trigger role-ready event so app.js can react
    window.dispatchEvent(new CustomEvent('gltp-role-ready', { detail: window.GLTP_USER }));
  }

  function showAuthScreen() {
    authScreen.style.display = 'flex';
  }

  // --- Form submission ---

  authForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideMessage();
    var email = authEmail.value.trim();
    var password = authPassword.value;

    if (!email || !password) {
      showMessage('Please enter both email and password.', true);
      return;
    }

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters.', true);
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        var fullName = authName.value.trim();
        var signupResult = await apiSignup(email, password, fullName);

        if (signupResult.confirmed_at || signupResult.access_token) {
          var tokenData = await apiLogin(email, password);
          saveSession(tokenData);
          var user = await apiGetUser(tokenData.access_token);
          showDashboard(user || signupResult);
        } else {
          showMessage('Account created! Please check your email to confirm your account, then sign in.', false);
          toggleMode();
        }
      } else {
        var tokenData = await apiLogin(email, password);
        saveSession(tokenData);
        var user = await apiGetUser(tokenData.access_token);
        showDashboard(user);
      }
    } catch (err) {
      showMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  });

  // --- Logout ---

  logoutBtn.addEventListener('click', function () {
    clearSession();
    window.GLTP_USER = { role: 'player', email: '', name: '', roles: [] };
    document.body.removeAttribute('data-role');
    showAuthScreen();
    authEmail.value = '';
    authPassword.value = '';
    authName.value = '';
    hideMessage();
  });

  // --- Handle confirmation/recovery tokens in URL hash ---

  async function handleHashCallback() {
    var hash = window.location.hash;
    if (!hash) return false;

    var params = new URLSearchParams(hash.substring(1));

    if (params.has('confirmation_token')) {
      try {
        var res = await fetch(IDENTITY_URL + '/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: params.get('confirmation_token'),
            type: 'signup'
          })
        });
        if (res.ok) {
          showMessage('Email confirmed! You can now sign in.', false);
        } else {
          showMessage('Email confirmation failed. The link may have expired.', true);
        }
      } catch (e) {
        showMessage('Email confirmation failed.', true);
      }
      window.location.hash = '';
      return true;
    }

    if (params.has('recovery_token')) {
      showMessage('Password recovery - please enter your new password and sign in.', false);
      window.location.hash = '';
      return true;
    }

    return false;
  }

  // --- Init: check for existing session ---

  async function initAuth() {
    var handledCallback = await handleHashCallback();

    var session = getSession();
    if (session && session.access_token) {
      try {
        var user = await apiGetUser(session.access_token);
        if (user) {
          showDashboard(user);
          return;
        }
      } catch (e) {
        // Token invalid, clear and show login
      }
      clearSession();
    }
    showAuthScreen();
  }

  initAuth();
})();
