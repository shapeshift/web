import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // https://github.com/shapeshift/web/blob/c85fbdd27c360fc09cd8a2aaabec493f9c4e8b78/src/plugins/foxPage/hooks/useFoxyApr.ts#L27
    process.env.REACT_APP_TOKEMAK_STATS_URL!,
  ],
}
