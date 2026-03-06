import { describe, expect, it } from 'vitest'

import {
  buildReleasePrompt,
  computeDevOnlyFlags,
  computePrivateDisabledFlags,
  deriveHotfixState,
  deriveReleaseState,
  extractDescription,
  extractPrNumbers,
  parseEnvFeatureFlags,
} from './release'

describe('deriveReleaseState', () => {
  const base = {
    releaseSha: 'aaa',
    mainSha: 'aaa',
    developSha: 'bbb',
    privateSha: 'aaa',
    latestTagSha: 'aaa',
    latestTagName: 'v1.1015.0',
    nextVersion: 'v1.1016.0',
    openPrereleasePr: undefined,
    openReleasePr: undefined,
  }

  it('returns idle when develop is ahead of main and no PR exists', () => {
    expect(deriveReleaseState(base)).toBe('idle')
  })

  it('returns idle when prerelease was merged (release matches develop, ahead of main)', () => {
    expect(
      deriveReleaseState({
        ...base,
        releaseSha: 'bbb',
      }),
    ).toBe('idle')
  })

  it('returns prerelease_pr_open when develop -> release PR exists', () => {
    expect(
      deriveReleaseState({
        ...base,
        openPrereleasePr: { number: 41, title: 'chore: prerelease v1.1016.0' },
      }),
    ).toBe('prerelease_pr_open')
  })

  it('returns release_pr_open when a release -> main PR exists', () => {
    expect(
      deriveReleaseState({
        ...base,
        releaseSha: 'bbb',
        openReleasePr: { number: 42, title: 'chore: release v1.1016.0' },
      }),
    ).toBe('release_pr_open')
  })

  it('returns merged_untagged when main is ahead of latest tag', () => {
    expect(
      deriveReleaseState({
        ...base,
        mainSha: 'ccc',
        releaseSha: 'ccc',
      }),
    ).toBe('merged_untagged')
  })

  it('returns tagged_private_stale when tagged but private is behind', () => {
    expect(
      deriveReleaseState({
        ...base,
        latestTagName: 'v1.1016.0',
        latestTagSha: 'aaa',
        mainSha: 'aaa',
        privateSha: 'zzz',
      }),
    ).toBe('tagged_private_stale')
  })

  it('returns done when everything is in sync', () => {
    expect(
      deriveReleaseState({
        ...base,
        developSha: 'aaa',
      }),
    ).toBe('done')
  })

  it('returns idle not tagged_private_stale for old completed releases', () => {
    expect(
      deriveReleaseState({
        ...base,
        privateSha: 'zzz',
      }),
    ).toBe('idle')
  })

  it('prioritizes prerelease_pr_open over everything', () => {
    expect(
      deriveReleaseState({
        ...base,
        openPrereleasePr: { number: 41, title: 'chore: prerelease v1.1016.0' },
        openReleasePr: { number: 42, title: 'chore: release v1.1016.0' },
      }),
    ).toBe('prerelease_pr_open')
  })

  it('prioritizes release_pr_open over merged_untagged', () => {
    expect(
      deriveReleaseState({
        ...base,
        mainSha: 'ccc',
        releaseSha: 'bbb',
        openReleasePr: { number: 42, title: 'chore: release v1.1016.0' },
      }),
    ).toBe('release_pr_open')
  })
})

describe('deriveHotfixState', () => {
  const base = {
    mainSha: 'aaa',
    privateSha: 'aaa',
    latestTagSha: 'aaa',
    latestTagName: 'v1.1015.0',
    nextVersion: 'v1.1015.1',
    openHotfixPr: undefined,
  }

  it('returns idle when no hotfix in progress', () => {
    expect(deriveHotfixState(base)).toBe('idle')
  })

  it('returns hotfix_pr_open when hotfix PR exists', () => {
    expect(
      deriveHotfixState({
        ...base,
        openHotfixPr: { number: 99, title: 'chore: hotfix v1.1015.1' },
      }),
    ).toBe('hotfix_pr_open')
  })

  it('returns merged_untagged when main moved past tag', () => {
    expect(
      deriveHotfixState({
        ...base,
        mainSha: 'bbb',
      }),
    ).toBe('merged_untagged')
  })

  it('returns tagged_private_stale when tagged but private behind', () => {
    expect(
      deriveHotfixState({
        ...base,
        latestTagName: 'v1.1015.1',
        privateSha: 'zzz',
      }),
    ).toBe('tagged_private_stale')
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
    expect(
      extractPrNumbers(['feat: thing (#100)', 'fix: same thing (#100)']),
    ).toEqual([100])
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
    const body = '## Description\n<!-- hidden -->This is visible and long enough to pass.\n## Testing'
    expect(extractDescription(body)).toBe('This is visible and long enough to pass.')
  })

  it('truncates descriptions over 500 chars', () => {
    const long = 'A'.repeat(600)
    const body = `## Description\n${long}\n## Testing`
    const result = extractDescription(body)
    expect(result).toHaveLength(503)
    expect(result!.endsWith('...')).toBe(true)
  })
})

describe('parseEnvFeatureFlags', () => {
  it('parses feature flags from env content', () => {
    const content = `
VITE_FEATURE_FOO=true
VITE_FEATURE_BAR=false
SOME_OTHER_VAR=hello
# VITE_FEATURE_COMMENTED=true
`
    expect(parseEnvFeatureFlags(content)).toEqual({
      VITE_FEATURE_FOO: true,
      VITE_FEATURE_BAR: false,
    })
  })

  it('handles empty content', () => {
    expect(parseEnvFeatureFlags('')).toEqual({})
  })

  it('handles values with equals signs', () => {
    const content = 'VITE_FEATURE_THING=true=extra'
    expect(parseEnvFeatureFlags(content)).toEqual({})
  })
})

describe('computeDevOnlyFlags', () => {
  it('finds flags enabled in dev but not prod', () => {
    const base = 'VITE_FEATURE_A=false\nVITE_FEATURE_B=false'
    const prod = 'VITE_FEATURE_A=false'
    const dev = 'VITE_FEATURE_A=true\nVITE_FEATURE_B=true'
    expect(computeDevOnlyFlags(base, prod, dev)).toEqual(['A', 'B'])
  })

  it('excludes flags that are also enabled in prod', () => {
    const base = ''
    const prod = 'VITE_FEATURE_A=true'
    const dev = 'VITE_FEATURE_A=true'
    expect(computeDevOnlyFlags(base, prod, dev)).toEqual([])
  })

  it('returns sorted results', () => {
    const base = ''
    const prod = ''
    const dev = 'VITE_FEATURE_ZEBRA=true\nVITE_FEATURE_ALPHA=true'
    expect(computeDevOnlyFlags(base, prod, dev)).toEqual(['ALPHA', 'ZEBRA'])
  })
})

describe('computePrivateDisabledFlags', () => {
  it('finds flags enabled in prod but disabled in private', () => {
    const base = ''
    const prod = 'VITE_FEATURE_X=true\nVITE_FEATURE_Y=true'
    const priv = 'VITE_FEATURE_X=false'
    expect(computePrivateDisabledFlags(base, prod, priv)).toEqual(['X', 'Y'])
  })
})

describe('buildReleasePrompt', () => {
  it('includes commit messages and PR context', () => {
    const prBodies = new Map([[123, '## Description\nSome context here for the PR.\n## Testing']])
    const prompt = buildReleasePrompt(
      'v1.1016.0',
      ['feat: something (#123)', 'fix: other thing (#456)'],
      prBodies,
      ['CELO'],
      ['LENDING'],
    )

    expect(prompt).toContain('v1.1016.0')
    expect(prompt).toContain('feat: something (#123)')
    expect(prompt).toContain('fix: other thing (#456)')
    expect(prompt).toContain('Context: Some context here for the PR.')
    expect(prompt).toContain('CELO')
    expect(prompt).toContain('LENDING')
  })

  it('omits dev-only section when no flags', () => {
    const prompt = buildReleasePrompt('v1.0.0', ['feat: thing (#1)'], new Map(), [], [])
    expect(prompt).not.toContain('Dev-only feature flags')
  })
})
