export function initials(username: string): string {
  const parts = username.split(/[._-]/).filter((part) => part.length > 0);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] ?? '').slice(0, 2);
  return letters.toUpperCase();
}
