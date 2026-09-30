// Single source of truth for where a session lives in localStorage.
//
// Every portal used to share one `clinic_<host>_` slot, so logging into the
// Staff portal overwrote the Veterinarian token and a refresh of a
// /veterinarian/* URL silently landed on /staff/dashboard. Each portal now owns
// its own namespace, which lets a Staff and a Veterinarian account stay signed
// in side by side in the same browser.
//
// AuthContext, the api.js interceptor and the socket handshake all resolve keys
// through this module so they can never disagree about which token is current.

const STORAGE_PREFIX_BY_PORTAL = {
  admin: 'admin_',
  staff: 'staff_',
  veterinarian: 'vet_',
  owner: 'owner_',
  public: 'public_',
};

const PORTAL_ROLE = {
  admin: 'Admin',
  staff: 'Staff',
  veterinarian: 'Veterinarian',
  owner: 'Owner',
  public: null,
};

// Longest paths first so /veterinarian is never mistaken for /staff etc.
const PORTAL_BY_PATH = [
  ['/admin', 'admin'],
  ['/veterinarian', 'veterinarian'],
  ['/staff', 'staff'],
  ['/owner', 'owner'],
];

const LOGIN_PATH_BY_PORTAL = {
  admin: '/admin/login',
  staff: '/staff/login',
  veterinarian: '/veterinarian/login',
  owner: '/owner/login',
  public: '/owner/login',
};

const DASHBOARD_PATH_BY_ROLE = {
  Admin: '/admin/overview',
  Veterinarian: '/veterinarian/dashboard',
  Staff: '/staff/dashboard',
  Owner: '/owner/dashboard',
};

export function portalFromPathname(pathname) {
  const path = String(pathname || '');
  for (const [prefix, portal] of PORTAL_BY_PATH) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return portal;
  }
  return 'public';
}

export function roleForPortal(portal) {
  return PORTAL_ROLE[portal] ?? null;
}

export function storagePrefixForPortal(portal, hostname = window.location.hostname) {
  return `${STORAGE_PREFIX_BY_PORTAL[portal] || STORAGE_PREFIX_BY_PORTAL.public}${hostname}_`;
}

export function loginPathForPortal(portal) {
  return LOGIN_PATH_BY_PORTAL[portal] || LOGIN_PATH_BY_PORTAL.public;
}

export function loginPathForPathname(pathname) {
  return loginPathForPortal(portalFromPathname(pathname));
}

export function dashboardPathForRole(role) {
  return DASHBOARD_PATH_BY_ROLE[role] || '/owner/dashboard';
}

// True when the role is allowed to be sitting on this URL.
export function roleMatchesPath(role, pathname) {
  switch (portalFromPathname(pathname)) {
    case 'admin':
      return role === 'Admin';
    case 'veterinarian':
      return role === 'Veterinarian';
    case 'staff':
      return role === 'Staff';
    case 'owner':
      return role === 'Owner';
    default:
      return true;
  }
}

export function decodeToken(token) {
  try {
    const payload = String(token || '').split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

// Prefixes to search for this portal's session, canonical first. The clinic
// portals also look in the retired shared `clinic_` slot — and the vet portal
// checks `staff_` too, because that key used to hold either clinic role.
function sessionPrefixes(portal, hostname) {
  const canonical = storagePrefixForPortal(portal, hostname);
  const prefixes = [canonical];

  if (portal === 'staff' || portal === 'veterinarian') {
    prefixes.push(`clinic_${hostname}_`);
  }
  if (portal === 'veterinarian') {
    prefixes.push(`staff_${hostname}_`);
  }

  return prefixes;
}

function clearPrefix(prefix) {
  try {
    localStorage.removeItem(`${prefix}token`);
    localStorage.removeItem(`${prefix}user`);
  } catch {
    /* storage disabled (private mode / quota) — nothing to clean up */
  }
}

function clearAllPrefixes(prefixes) {
  for (const prefix of prefixes) clearPrefix(prefix);
}

// Reads this portal's session, adopting a legacy clinic slot when — and only
// when — its JWT role belongs to this portal. A Staff token sitting in the old
// shared slot is never handed to the Veterinarian portal, so the two roles can
// no longer impersonate each other across a refresh.
export function loadPortalSession(portal, hostname = window.location.hostname) {
  const expectedRole = roleForPortal(portal);
  const prefixes = sessionPrefixes(portal, hostname);
  const [canonical] = prefixes;

  for (const prefix of prefixes) {
    let token;
    try {
      token = localStorage.getItem(`${prefix}token`);
    } catch {
      return { token: null, user: null };
    }
    if (!token) continue;

    if (isTokenExpired(token)) {
      clearPrefix(prefix);
      continue;
    }

    const decoded = decodeToken(token);
    if (!decoded || !decoded.role) {
      clearPrefix(prefix);
      continue;
    }

    const isLegacySlot = prefix !== canonical;
    if (isLegacySlot && expectedRole && decoded.role !== expectedRole) {
      continue; // belongs to the other clinic portal — leave it signed in
    }

    let saved = null;
    try {
      const raw = localStorage.getItem(`${prefix}user`);
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      saved = null;
    }

    // The JWT is the source of truth for the role.
    let user = saved && typeof saved === 'object' ? saved : null;
    if (user && user.role !== decoded.role) {
      user = { ...user, role: decoded.role };
    }
    if (!user) {
      user = { id: decoded.id, email: decoded.email, role: decoded.role };
    }

    if (isLegacySlot) {
      // Move the session into this portal's own namespace so both clinic
      // sessions survive side by side.
      try {
        localStorage.setItem(`${canonical}token`, token);
        localStorage.setItem(`${canonical}user`, JSON.stringify(user));
      } catch {
        /* keep going with the in-memory values */
      }
      clearPrefix(prefix);
    } else {
      try {
        localStorage.setItem(`${prefix}user`, JSON.stringify(user));
      } catch {
        /* keep going with the in-memory values */
      }
    }

    return { token, user };
  }

  return { token: null, user: null };
}

export function savePortalSession(portal, token, user, hostname = window.location.hostname) {
  const prefix = storagePrefixForPortal(portal, hostname);
  localStorage.setItem(`${prefix}token`, token);
  localStorage.setItem(`${prefix}user`, JSON.stringify(user));
}

export function readAuthToken(portal, hostname = window.location.hostname) {
  return loadPortalSession(portal, hostname).token;
}

export function clearPortalSession(portal, hostname = window.location.hostname) {
  clearAllPrefixes(sessionPrefixes(portal, hostname));
}
