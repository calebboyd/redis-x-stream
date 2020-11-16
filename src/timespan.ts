const factors = {
  s: 1e3,
  m: 6e4,
  h: 3.6e6,
  d: 8.64e7,
  y: 31536007978.608,
}

export class TimeSpan {
  private constructor(private ms: number) {}
  static fromMilliseconds(ms: number) {
    return new TimeSpan(ms)
  }
  static fromSeconds(seconds: number) {
    return new TimeSpan(seconds * factors.s)
  }
  static fromMinutes(minutes: number) {
    return new TimeSpan(minutes * factors.m)
  }
  static fromHours(hours: number) {
    return new TimeSpan(hours * factors.h)
  }
  static fromDays(days: number) {
    return new TimeSpan(days * factors.d)
  }
  static fromYears(years: number) {
    return new TimeSpan(years * factors.y)
  }
  valueOf() {
    return this.ms
  }
  get milliseconds(): number {
    return this.ms
  }
  get seconds(): number {
    return this.ms / factors.s
  }
  get minutes(): number {
    return this.ms / factors.m
  }
  get hours(): number {
    return this.ms / factors.h
  }
  get days(): number {
    return this.ms / factors.d
  }
  get years(): number {
    return this.ms / factors.y
  }
}
