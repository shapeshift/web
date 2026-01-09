type MetricEntry = {
  name: string
  duration: number
  timestamp: number
}

type SelectorMetrics = {
  name: string
  calls: number
  totalTime: number
  maxTime: number
}

type IndexedDBMetrics = {
  reads: number[]
  writes: number[]
}

type AssetSearchMetric = {
  query: string
  duration: number
  timestamp: number
}

export type PerformanceReport = {
  browser: string
  userAgent: string
  timestamp: string
  sessionDuration: number
  indexedDB: {
    readCount: number
    writeCount: number
    avgRead: number
    avgWrite: number
    maxRead: number
    maxWrite: number
    reads: number[]
    writes: number[]
  }
  selectors: {
    total: number
    slowCount: number
    slowSelectors: {
      name: string
      calls: number
      avgTime: number
      maxTime: number
    }[]
  }
  assetSearch: {
    searches: number
    avgLatency: number
    maxLatency: number
    entries: AssetSearchMetric[]
  }
  rawMetrics: MetricEntry[]
}

const SLOW_SELECTOR_THRESHOLD_MS = 16

const getBrowserInfo = (): string => {
  const ua = navigator.userAgent
  if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/(\d+\.\d+)/)
    return match ? `Firefox ${match[1]}` : 'Firefox'
  }
  if (ua.includes('Chrome/')) {
    const match = ua.match(/Chrome\/(\d+\.\d+)/)
    return match ? `Chrome ${match[1]}` : 'Chrome'
  }
  if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/(\d+\.\d+)/)
    return match ? `Safari ${match[1]}` : 'Safari'
  }
  return 'Unknown'
}

class PerformanceProfiler {
  private metrics: MetricEntry[] = []
  private selectorMetrics: Map<string, SelectorMetrics> = new Map()
  private indexedDBMetrics: IndexedDBMetrics = { reads: [], writes: [] }
  private assetSearchMetrics: AssetSearchMetric[] = []
  private enabled = false
  private startTime: number = Date.now()

  enable(): void {
    this.enabled = true
    this.startTime = Date.now()
    console.info('[PerformanceProfiler] Enabled')
  }

  disable(): void {
    this.enabled = false
    console.info('[PerformanceProfiler] Disabled')
  }

  isEnabled(): boolean {
    return this.enabled
  }

  mark(name: string): () => void {
    if (!this.enabled) return () => {}
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      this.metrics.push({ name, duration, timestamp: Date.now() })
    }
  }

  trackSelector(name: string, duration: number): void {
    if (!this.enabled) return
    const existing = this.selectorMetrics.get(name) || {
      name,
      calls: 0,
      totalTime: 0,
      maxTime: 0,
    }
    existing.calls++
    existing.totalTime += duration
    existing.maxTime = Math.max(existing.maxTime, duration)
    this.selectorMetrics.set(name, existing)
  }

  trackIndexedDB(type: 'read' | 'write', duration: number, key?: string): void {
    if (!this.enabled) return
    if (type === 'read') {
      this.indexedDBMetrics.reads.push(duration)
    } else {
      this.indexedDBMetrics.writes.push(duration)
    }
    if (key) {
      this.metrics.push({
        name: `indexedDB:${type}:${key}`,
        duration,
        timestamp: Date.now(),
      })
    }
  }

  trackAssetSearch(query: string, duration: number): void {
    if (!this.enabled) return
    this.assetSearchMetrics.push({
      query,
      duration,
      timestamp: Date.now(),
    })
  }

  getSnapshot(): PerformanceReport {
    const reads = this.indexedDBMetrics.reads
    const writes = this.indexedDBMetrics.writes

    const avgRead = reads.length > 0 ? reads.reduce((a, b) => a + b, 0) / reads.length : 0
    const avgWrite = writes.length > 0 ? writes.reduce((a, b) => a + b, 0) / writes.length : 0
    const maxRead = reads.length > 0 ? Math.max(...reads) : 0
    const maxWrite = writes.length > 0 ? Math.max(...writes) : 0

    const selectorEntries = Array.from(this.selectorMetrics.values())
    const slowSelectors = selectorEntries
      .filter(s => s.maxTime > SLOW_SELECTOR_THRESHOLD_MS)
      .sort((a, b) => b.maxTime - a.maxTime)
      .slice(0, 20)
      .map(s => ({
        name: s.name,
        calls: s.calls,
        avgTime: Math.round((s.totalTime / s.calls) * 100) / 100,
        maxTime: Math.round(s.maxTime * 100) / 100,
      }))

    const searchDurations = this.assetSearchMetrics.map(m => m.duration)
    const avgSearchLatency =
      searchDurations.length > 0
        ? searchDurations.reduce((a, b) => a + b, 0) / searchDurations.length
        : 0
    const maxSearchLatency = searchDurations.length > 0 ? Math.max(...searchDurations) : 0

    return {
      browser: getBrowserInfo(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      sessionDuration: Date.now() - this.startTime,
      indexedDB: {
        readCount: reads.length,
        writeCount: writes.length,
        avgRead: Math.round(avgRead * 100) / 100,
        avgWrite: Math.round(avgWrite * 100) / 100,
        maxRead: Math.round(maxRead * 100) / 100,
        maxWrite: Math.round(maxWrite * 100) / 100,
        reads,
        writes,
      },
      selectors: {
        total: selectorEntries.reduce((acc, s) => acc + s.calls, 0),
        slowCount: slowSelectors.length,
        slowSelectors,
      },
      assetSearch: {
        searches: this.assetSearchMetrics.length,
        avgLatency: Math.round(avgSearchLatency * 100) / 100,
        maxLatency: Math.round(maxSearchLatency * 100) / 100,
        entries: this.assetSearchMetrics,
      },
      rawMetrics: this.metrics,
    }
  }

  exportJSON(): void {
    const report = this.getSnapshot()
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `perf-${report.browser.toLowerCase().replace(' ', '-')}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    console.info('[PerformanceProfiler] Exported metrics to JSON')
  }

  reset(): void {
    this.metrics = []
    this.selectorMetrics.clear()
    this.indexedDBMetrics = { reads: [], writes: [] }
    this.assetSearchMetrics = []
    this.startTime = Date.now()
    console.info('[PerformanceProfiler] Reset all metrics')
  }

  logSummary(): void {
    const report = this.getSnapshot()
    console.group('[PerformanceProfiler] Summary')
    console.log('Browser:', report.browser)
    console.log('Session Duration:', Math.round(report.sessionDuration / 1000), 'seconds')
    console.log(
      'IndexedDB Reads:',
      report.indexedDB.readCount,
      '(avg:',
      report.indexedDB.avgRead,
      'ms)',
    )
    console.log(
      'IndexedDB Writes:',
      report.indexedDB.writeCount,
      '(avg:',
      report.indexedDB.avgWrite,
      'ms)',
    )
    console.log(
      'Selector Calls:',
      report.selectors.total,
      '(slow:',
      report.selectors.slowCount,
      ')',
    )
    console.log(
      'Asset Searches:',
      report.assetSearch.searches,
      '(avg:',
      report.assetSearch.avgLatency,
      'ms)',
    )
    if (report.selectors.slowSelectors.length > 0) {
      console.log('Slow Selectors (>16ms):')
      report.selectors.slowSelectors.forEach(s => {
        console.log(`  ${s.name}: ${s.maxTime}ms max, ${s.calls} calls`)
      })
    }
    console.groupEnd()
  }
}

export const profiler = new PerformanceProfiler()

if (typeof window !== 'undefined') {
  ;(window as unknown as { __profiler: PerformanceProfiler }).__profiler = profiler
}
