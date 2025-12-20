export type ConcurrencyAcquireResult = {
  allowed: boolean
  active: number
  limit: number
  release?: () => void
}

export class InMemoryConcurrencyLimiter {
  private counts = new Map<string, number>()

  constructor(public readonly limit: number) {}

  acquire(key: string): ConcurrencyAcquireResult {
    const current = this.counts.get(key) ?? 0

    if (current >= this.limit) {
      return {
        allowed: false,
        active: current,
        limit: this.limit,
      }
    }

    const next = current + 1
    this.counts.set(key, next)

    let released = false

    return {
      allowed: true,
      active: next,
      limit: this.limit,
      release: () => {
        if (released) return
        released = true

        const latest = this.counts.get(key) ?? 0
        if (latest <= 1) {
          this.counts.delete(key)
        } else {
          this.counts.set(key, latest - 1)
        }
      },
    }
  }
}
