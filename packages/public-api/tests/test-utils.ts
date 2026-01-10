export type TestResult = {
  name: string
  passed: boolean
  critical: boolean
  duration: number
  error?: string
  details?: unknown
}

export type TestSuiteResult = {
  timestamp: number
  apiUrl: string
  totalTests: number
  passed: number
  failed: number
  criticalFailures: number
  results: TestResult[]
}

export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000,
): Promise<Response> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export const runTest = async (
  name: string,
  critical: boolean,
  testFn: () => Promise<void>,
): Promise<TestResult> => {
  const start = Date.now()
  try {
    await testFn()
    return { name, passed: true, critical, duration: Date.now() - start }
  } catch (error) {
    return {
      name,
      passed: false,
      critical,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))
