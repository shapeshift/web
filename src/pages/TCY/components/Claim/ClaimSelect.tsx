import { Stack, useDisclosure } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { poolAssetIdToAssetId } from '@shapeshiftoss/swapper'
import { isSome, isUtxoChainId } from '@shapeshiftoss/utils'
import { useQueries } from '@tanstack/react-query'
import axios from 'axios'
import { useCallback, useMemo, useState } from 'react'

import type { TCYRouteProps } from '../../types'
import { ClaimModal } from './ClaimRoutes'
import { AssetClaimButton } from './components/AssetClaimButton'
import type { Claim } from './types'

import { SlideTransition } from '@/components/SlideTransition'
import { getConfig } from '@/config'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { getThorchainSaversPosition } from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const useTCYClaims = (accountIds: AccountId[]) => {
  return useQueries({
    queries: accountIds.map(accountId => ({
      queryKey: ['tcy-claims', fromAccountId(accountId).account],
      queryFn: async (): Promise<Claim[]> => {
        // Mock data for dev only - the endpoints are not live yet
        // see https://gitlab.com/thorchain/thornode/-/merge_requests/4004/diffs#a8d2456698d55d9f33312808ecbfd863ea9966b3_0_96 for ref
        return [
          {
            asset: 'avax.avax',
            l1_address: '0x00112c24ebee9c96d177a3aa2ff55dcb93a53c80',
            amountThorBaseUnit: '335869573367',
            assetId: poolAssetIdToAssetId('avax.avax'.toUpperCase()) ?? '',
            accountId,
          },
        ]

        const activeAddress = await (async () => {
          // UTXO-based chains are the odd ones, for all address-based, we can simply use the `account` caip-10 part
          if (!isUtxoChainId(fromAccountId(accountId).chainId))
            return fromAccountId(accountId).account

          const chainId = fromAccountId(accountId).chainId
          const assetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()

          if (!assetId) return

          const position = await getThorchainSaversPosition({ accountId, assetId })

          if (!position) return

          return position.asset_address
        })()

        if (!activeAddress) return []

        const response = await axios.get(
          `${
            getConfig().VITE_THORCHAIN_NODE_URL
          }/lcd/thorchain/amountThorBaseUniterl/${activeAddress}`,
        )
        return response.data
      },
    })),
  })
}

export const ClaimSelect: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [activeClaim, setActiveClaim] = useState<Claim | undefined>()

  // TODO: implement me
  const accountNumber = 0

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const accountIds = useMemo(
    () => Object.values(accountIdsByAccountNumberAndChainId[accountNumber] || {}),
    [accountNumber, accountIdsByAccountNumberAndChainId],
  )

  const accountIdsUniqueAddresses = useMemo(
    () =>
      accountIds
        .flat()
        .reduce<{ accountId: AccountId; address: string }[]>((acc, accountId) => {
          if (!accountId) return acc

          const address = fromAccountId(accountId).account
          if (acc.find(x => x.address === address)) return acc

          acc.push({ address, accountId })
          return acc
        }, [])
        .map(({ accountId }) => accountId),
    [accountIds],
  )

  const claimsQueries = useTCYClaims(accountIdsUniqueAddresses)

  const claims = claimsQueries
    .map(query => query.data)
    .filter(isSome)
    .flat()

  const handleClick = useCallback(
    (claim: Claim) => {
      setActiveClaim(claim)
      onOpen()
    },
    [onOpen],
  )

  const handleClose = useCallback(() => {
    setActiveClaim(undefined)
    onClose()
  }, [onClose])

  return (
    <SlideTransition>
      {headerComponent}
      <Stack spacing={2}>
        <Stack px={2} pb={2} spacing={2}>
          {claims.map((claim, index) => (
            <AssetClaimButton key={index} claim={claim} onClick={handleClick} />
          ))}
        </Stack>
      </Stack>
      <ClaimModal isOpen={isOpen} onClose={handleClose} claim={activeClaim} />
    </SlideTransition>
  )
}
