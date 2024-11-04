import axios from 'axios'
import axiosRetry from 'axios-retry'

import type { Strategy } from './validators'

export const getVotingPower = async (
  addresses: string[],
  network: string,
  strategies: Strategy[],
  snapshot: number | 'latest',
  space: string,
  delegation: boolean,
) => {
  const axiosWithRetry = axios.create()

  axiosRetry(axiosWithRetry, {
    retries: 5,
    shouldResetTimeout: true,
    // We absolutely want to retry on any error or users will pay fees for nothing if we can't fetch its vote power
    retryCondition: _error => true,
  })

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const body = {
    params: {
      addresses,
      network,
      strategies,
      snapshot,
      space,
      delegation,
    },
  }

  const { data } = await axiosWithRetry.post('https://score.snapshot.org/api/scores', body, {
    headers,
  })
  return data.result
}
