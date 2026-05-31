/**
 * Escapes special characters in a string to be used as a literal in a regular expression.
 * Prevents ReDoS and unexpected query behavior.
 * @param {string} string - The string to escape
 * @returns {string} The escaped string
 */
export const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
