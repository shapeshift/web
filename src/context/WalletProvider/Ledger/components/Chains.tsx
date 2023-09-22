import { Box, Button, Flex, ModalBody, Spinner, Text as CText } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import {
  bchAssetId,
  bchChainId,
  btcAssetId,
  btcChainId,
  dogeAssetId,
  dogeChainId,
  ethAssetId,
  ethChainId,
  fromAccountId,
  fromChainId,
  ltcAssetId,
  ltcChainId,
} from '@shapeshiftoss/caip'
import pull from 'lodash/pull'
import { useCallback, useMemo, useState } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useWallet } from 'hooks/useWallet/useWallet'
import { deriveAccountIdsAndMetadataForChainNamespace } from 'lib/account/account'
import type { BN } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectAssets } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

export const LedgerChains = () => {
  const { state } = useWallet()
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  // TODO(gomes): KnownChainIds filter walletSupportsChain
  const availableAssetIds = useMemo(
    () => [btcAssetId, dogeAssetId, bchAssetId, ltcAssetId, ethAssetId],
    [],
  )

  const availableAssets = useMemo(
    () => availableAssetIds.map(id => assets[id]).filter(isSome),
    [assets, availableAssetIds],
  )

  const availableChainIds = useMemo(
    () => [btcChainId, dogeChainId, bchChainId, ltcChainId, ethChainId],
    [],
  )

  const [loadingChains, setLoadingChains] = useState<Record<ChainId, boolean>>({})
  const [loadedChains, setLoadedChains] = useState<Record<ChainId, boolean>>({})

  const handleConnectClick = useCallback(
    async (chainId: ChainId) => {
      if (!state.adapters) return
      // Re-pair device in case disconnecting an app disconnected the device
      // TODO(gomes): we may want this straight at hdwallet level and augment transport.call() with this
      // see https://github.com/shapeshift/hdwallet/pull/629/commits/5a78f55a6366e8ab0a89d7dac069dedb8f7b36be
      // pairDevice() now calls transport.create() vs. transport.request(), meaning this is effectively invisible for the user on re-connections
      const wallet = await state.adapters.get(KeyManager.Ledger)?.[0].pairDevice()
      if (!wallet) return

      setLoadingChains(prevLoading => ({ ...prevLoading, [chainId]: true }))

      try {
        // TODO(gomes): this should be programmatic
        const { chainNamespace } = fromChainId(chainId)
        const accountMetadataByAccountId = await deriveAccountIdsAndMetadataForChainNamespace[
          chainNamespace
        ]({
          accountNumber: 0,
          chainIds: [chainId],
          wallet,
        })

        const accountIds = Object.keys(accountMetadataByAccountId)
        const { getAccount } = portfolioApi.endpoints
        const opts = { forceRefetch: true }
        const accountPromises = accountIds.map(accountId =>
          dispatch(getAccount.initiate({ accountId }, opts)),
        )
        const accountResults = await Promise.allSettled(accountPromises)

        const balanceByChainId = accountResults.reduce<Record<ChainId, BN>>((acc, res, idx) => {
          if (res.status === 'rejected') return acc
          const { data: account } = res.value
          if (!account) return acc

          const accountId = accountIds[idx]
          const { chainId } = fromAccountId(accountId)
          const accountBalance = Object.values(account.accountBalances.byId).reduce(
            (acc, byAssetId) => {
              Object.values(byAssetId).forEach(balance => (acc = acc.plus(bnOrZero(balance))))
              return acc
            },
            bnOrZero(0),
          )

          acc[chainId] = bnOrZero(acc[chainId]).plus(accountBalance)

          const accountMetadata = accountMetadataByAccountId[accountId]
          const payload = { [accountId]: accountMetadata }
          dispatch(portfolio.actions.upsertAccountMetadata(payload))
          dispatch(portfolio.actions.upsertPortfolio(account))
          return acc
        }, {})

        Object.entries(balanceByChainId).forEach(([chainId, balance]) => {
          if (balance.eq(0)) pull(availableChainIds, chainId)
        })

        // Mark the chain as loaded
        setLoadedChains(prevLoaded => ({ ...prevLoaded, [chainId]: true }))
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingChains(prevLoading => ({ ...prevLoading, [chainId]: false }))
      }
    },
    [availableChainIds, dispatch, state.adapters],
  )

  return (
    <>
      <ModalBody textAlign='left' pb={8}>
        <Box mb={4}>
          <Text
            fontSize='lg'
            fontWeight='bold'
            translation={'walletProvider.ledger.chains.header'}
            mb={2}
          />
          <Text color='text.subtle' translation={'walletProvider.ledger.chains.body'} />
        </Box>
        <Box mb={4}>
          <Text
            fontSize='md'
            fontWeight='bold'
            translation={'walletProvider.ledger.chains.availableChains'}
            mb={2}
          />
          <Box>
            {availableAssets
              .sort(a => (loadedChains[a.chainId] ? 1 : -1))
              .map(asset => (
                <Flex alignItems='center' justifyContent='space-between' mb={4} key={asset.assetId}>
                  <Flex alignItems='center'>
                    <AssetIcon assetId={asset.assetId} mr={2} />
                    <CText>{asset.name}</CText>
                  </Flex>
                  {loadedChains[asset.chainId] ? (
                    <CText>Added</CText>
                  ) : loadingChains[asset.chainId] ? (
                    <Spinner />
                  ) : (
                    <Button colorScheme='blue' onClick={() => handleConnectClick(asset.chainId)}>
                      Connect
                    </Button>
                  )}
                </Flex>
              ))}
          </Box>
        </Box>
      </ModalBody>
    </>
  )
}
