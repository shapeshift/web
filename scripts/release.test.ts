import { describe, expect, it } from 'vitest'

import {
  buildReleasePrompt,
  deriveHotfixState,
  deriveReleaseState,
  extractDescription,
  extractPrNumbers,
} from './release'

describe('deriveReleaseState', () => {
  const base = {
    mainSha: 'aaa',
    latestTagSha: 'aaa',
    releaseIsAheadOfMain: false,
    privateContentMatchesMain: true,
    openReleasePr: undefined,
  }

  it('returns idle when everything is synced and release matches main', () => {
    expect(deriveReleaseState(base)).toBe('idle')
  })

  it('returns release_ready when release is ahead of main and no release PR exists', () => {
    expect(deriveReleaseState({ ...base, releaseIsAheadOfMain: true })).toBe('release_ready')
  })

  it('returns release_open when release->main PR exists', () => {
    expect(
      deriveReleaseState({
        ...base,
        openReleasePr: { number: 42, title: 'chore: release v1.1016.0' },
      }),
    ).toBe('release_open')
  })

  it('returns needs_tag when main has moved past the latest tag', () => {
    expect(deriveReleaseState({ ...base, mainSha: 'ccc' })).toBe('needs_tag')
  })

  it('returns sync_pending when private is behind main', () => {
    expect(deriveReleaseState({ ...base, privateContentMatchesMain: false })).toBe('sync_pending')
  })

  it('prioritizes release_open over needs_tag', () => {
    expect(
      deriveReleaseState({
        ...base,
        mainSha: 'ccc',
        openReleasePr: { number: 42, title: 'chore: release v1.1016.0' },
      }),
    ).toBe('release_open')
  })

  it('prioritizes needs_tag over sync_pending', () => {
    expect(deriveReleaseState({ ...base, mainSha: 'ccc', privateContentMatchesMain: false })).toBe(
      'needs_tag',
    )
  })

  it('prioritizes sync_pending over release_ready', () => {
    expect(
      deriveReleaseState({ ...base, privateContentMatchesMain: false, releaseIsAheadOfMain: true }),
    ).toBe('sync_pending')
  })
})

describe('deriveHotfixState', () => {
  const base = {
    mainSha: 'aaa',
    latestTagSha: 'aaa',
    privateContentMatchesMain: true,
    openHotfixPr: undefined,
  }

  it('returns idle when no hotfix in progress and everything is synced', () => {
    expect(deriveHotfixState(base)).toBe('idle')
  })

  it('returns hotfix_open when hotfix PR exists', () => {
    expect(
      deriveHotfixState({
        ...base,
        openHotfixPr: { number: 99, title: 'chore: hotfix v1.1015.1' },
      }),
    ).toBe('hotfix_open')
  })

  it('returns needs_tag when main moved past tag', () => {
    expect(deriveHotfixState({ ...base, mainSha: 'bbb' })).toBe('needs_tag')
  })

  it('returns sync_pending when private is behind main', () => {
    expect(deriveHotfixState({ ...base, privateContentMatchesMain: false })).toBe('sync_pending')
  })

  it('prioritizes hotfix_open over needs_tag', () => {
    expect(
      deriveHotfixState({
        ...base,
        mainSha: 'bbb',
        openHotfixPr: { number: 99, title: 'chore: hotfix v1.1015.1' },
      }),
    ).toBe('hotfix_open')
  })

  it('prioritizes needs_tag over sync_pending', () => {
    expect(deriveHotfixState({ ...base, mainSha: 'bbb', privateContentMatchesMain: false })).toBe(
      'needs_tag',
    )
  })
})

describe('extractPrNumbers', () => {
  it('extracts PR numbers from commit messages', () => {
    expect(
      extractPrNumbers([
        'feat: add chainflip lending (#12026)',
        'fix: bsc broadcast (#12053)',
        'chore: no pr number here',
      ]),
    ).toEqual([12026, 12053])
  })

  it('deduplicates PR numbers', () => {
    expect(extractPrNumbers(['feat: thing (#100)', 'fix: same thing (#100)'])).toEqual([100])
  })

  it('returns empty array for no matches', () => {
    expect(extractPrNumbers(['no numbers', 'also none'])).toEqual([])
  })
})

describe('extractDescription', () => {
  it('extracts description section from PR body', () => {
    const body = '## Description\nThis is a fix for the thing.\n\n## Testing\nTest it.'
    expect(extractDescription(body)).toBe('This is a fix for the thing.')
  })

  it('returns undefined for missing description', () => {
    expect(extractDescription('## Testing\nJust tests.')).toBeUndefined()
  })

  it('returns undefined for very short descriptions', () => {
    expect(extractDescription('## Description\nShort.\n## Testing')).toBeUndefined()
  })

  it('strips HTML comments', () => {
    const body =
      '## Description\n<!-- hidden -->This is visible and long enough to pass.\n## Testing'
    expect(extractDescription(body)).toBe('This is visible and long enough to pass.')
  })

  it('truncates descriptions over 500 chars', () => {
    const long = 'A'.repeat(600)
    const body = `## Description\n${long}\n## Testing`
    const result = extractDescription(body)
    expect(result).toHaveLength(503)
    expect(result?.endsWith('...')).toBe(true)
  })
})

describe('buildReleasePrompt', () => {
  it('includes commit messages and PR context', () => {
    const prBodies = new Map([[123, '## Description\nSome context here for the PR.\n## Testing']])
    const prompt = buildReleasePrompt(
      'v1.1016.0',
      ['feat: something (#123)', 'fix: other thing (#456)'],
      prBodies,
    )

    expect(prompt).toContain('v1.1016.0')
    expect(prompt).toContain('feat: something (#123)')
    expect(prompt).toContain('fix: other thing (#456)')
    expect(prompt).toContain('Context: Some context here for the PR.')
    expect(prompt).toContain('.env')
    expect(prompt).toContain('.env.production')
    expect(prompt).toContain('.env.development')
  })

  it('instructs Claude to read env files for flag detection', () => {
    const prompt = buildReleasePrompt('v1.0.0', ['feat: thing (#1)'], new Map())
    expect(prompt).toContain('VITE_FEATURE_')
    expect(prompt).toContain('OFF in production')
  })
})
