import axios from 'axios'
import { useEffect, useState } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { getConfig } from '../config'

type BoardroomGovernanceData = Array<{
  currentState: string
  title: string
  choices: Array<string>
  results: Array<{ total: number; choice: number }>
  refId: string
}>

const BOARDROOM_API_BASE_URL = getConfig().REACT_APP_BOARDROOM_API_BASE_URL

const parseGovernanceData = (governanceData: BoardroomGovernanceData) => {
  const activeProposals = governanceData.filter(data => data.currentState === 'active')
  const proposals = activeProposals.length ? activeProposals : [governanceData[0]]

  return proposals.map(({ title, choices, results, refId }) => {
    const totalResults = results.reduce((acc, currentResult) => {
      acc = acc.plus(currentResult.total)
      return acc
    }, bnOrZero('0'))

    return {
      refId,
      title,
      choices,
      results: results.map(result => ({
        absolute: result.total,
        percent: bnOrZero(result.total).div(totalResults).toString(),
      })),
    }
  })
}

export const useGetGovernanceData = () => {
  const [data, setData] = useState<ReturnType<typeof parseGovernanceData>>([])
  const [error, setError] = useState<any>()
  const [loaded, setLoaded] = useState<boolean>(false)

  useEffect(() => {
    const loadGovernanceData = async () => {
      try {
        const response = await axios.get<{ data: BoardroomGovernanceData }>(
          `${BOARDROOM_API_BASE_URL}proposals`,
        )
        const governanceData = response?.data?.data
        const parsedGovernanceData = parseGovernanceData(governanceData)
        setData(parsedGovernanceData)
      } catch (e) {
        setError(e)
      } finally {
        setLoaded(true)
      }
    }

    loadGovernanceData()
  }, [])

  return { data, error, loaded }
}
