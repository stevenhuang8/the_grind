export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function daysAgo(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr + 'T00:00:00').getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
