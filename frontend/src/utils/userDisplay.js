/**
 * Shared user display helpers so name, initials, and profile color
 * stay consistent across the site (Profile, Activity Feed, User Management, Contact list).
 * Never use email for display name or initials — use firstName + lastName, then username.
 */

/**
 * Display name for a user: firstName + lastName, or username; never email.
 * @param {Object} user - User object with firstName, lastName, username, email
 * @param {string} fallback - Value when no name/username (e.g. '-' for tables, 'Someone' for avatars)
 * @returns {string}
 */
export function getUserDisplayName(user, fallback = 'Someone') {
  if (!user) return fallback;
  const first = (user.firstName || '').trim();
  const last = (user.lastName || '').trim();
  const name = [first, last].filter(Boolean).join(' ');
  if (name) return name;
  if (user.username && String(user.username).trim()) return user.username.trim();
  return fallback;
}
