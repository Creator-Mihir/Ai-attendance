export function formatTime(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

export function formatDate(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatISODateOnly(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toISOString().split('T')[0];
}

export function calculateWorkingHours(checkInIso?: string, checkOutIso?: string): string {
  if (!checkInIso || !checkOutIso) return '--:--';
  const start = new Date(checkInIso).getTime();
  const end = new Date(checkOutIso).getTime();
  const diffMs = Math.max(0, end - start);
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export function isTimeLate(dateInput: string | Date = new Date(), cutoffTime = '08:45'): boolean {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const [cutoffH, cutoffM] = cutoffTime.split(':').map(Number);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  return hours > cutoffH || (hours === cutoffH && minutes > cutoffM);
}
