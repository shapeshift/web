import axios from 'axios'

import type { Strategy } from './validators'

export const getVotingPower = async (
  address: string,
  network: string,
  strategies: Strategy[],
  snapshot: number | 'latest',
  space: string,
  delegation: boolean,
) => {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const body = {
    jsonrpc: '2.0',
    method: 'get_vp',
    params: {
      address,
      network,
      strategies,
      snapshot,
      space,
      delegation,
    },
  }

  const { data } = await axios.post('https://score.snapshot.org', body, {
    headers,
  })
  return data.result
}
