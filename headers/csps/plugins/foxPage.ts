import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const mode = process.env.NODE_ENV || 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    // https://github.com/shapeshift/web/blob/c85fbdd27c360fc09cd8a2aaabec493f9c4e8b78/src/state/apis/foxy/foxyApi.ts#L21
    env.VITE_TOKEMAK_STATS_URL!,
    // https://github.com/shapeshift/web/blob/965e5f3365e62f02f4cff3d0f78a020e0bf6b376/src/plugins/foxPage/hooks/getGovernanceData.ts#L47
    env.VITE_BOARDROOM_API_BASE_URL!,
  ],
}
