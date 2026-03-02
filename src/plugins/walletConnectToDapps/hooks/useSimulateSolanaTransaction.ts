import { solanaChainId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'

import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { simulateSolanaTransaction } from '@/plugins/walletConnectToDapps/utils/solana-simulation'

export const useSimulateSolanaTransaction = ({
  transaction,
}: {
  transaction: string | undefined
}) => {
  const simulationQuery = useQuery({
    queryKey: ['solanaSimulation', transaction],
    queryFn: transaction
      ? () => {
          const chainAdapter = assertGetSolanaChainAdapter(solanaChainId)
          const connection = chainAdapter.getConnection()
          return simulateSolanaTransaction(connection, transaction)
        }
      : skipToken,
    staleTime: 60_000,
    retry: false,
  })

  return { simulationQuery }
}
