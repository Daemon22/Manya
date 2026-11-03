type Window = { count: number; expiresAt: number }

// This process-local guard slows repeated attempts. Apply a shared or edge-level
// rate limit in production because serverless instances do not share memory.
const windows = new Map<string, Window>()

export function allowAuthAttempt(key: string, limit: number, durationMs: number): boolean {
  const now = Date.now()
  const current = windows.get(key)

  if (!current || current.expiresAt <= now) {
    if (windows.size >= 5000) {
      for (const [candidate, value] of windows) {
        if (value.expiresAt <= now) windows.delete(candidate)
      }
      if (windows.size >= 5000) return false
    }
    windows.set(key, { count: 1, expiresAt: now + durationMs })
    return true
  }

  if (current.count >= limit) return false
  current.count += 1
  return true
}
