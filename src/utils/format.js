export function formatEuro(cents) {
  return `€${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

export function formatTime(seconds) {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
