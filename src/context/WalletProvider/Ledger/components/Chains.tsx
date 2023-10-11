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
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { deriveAccountIdsAndMetadataForChainNamespace } from 'lib/account/account'
import type { BN } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectAssets, selectWalletChainIds } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

export const LedgerChains = () => {
  const { state: walletState } = useWallet()
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const walletChainIds = useAppSelector(selectWalletChainIds)

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

  const handleConnectClick = useCallback(
    async (chainId: ChainId) => {
      if (!walletState.adapters) return
      if (!walletState?.wallet) return

      setLoadingChains(prevLoading => ({ ...prevLoading, [chainId]: true }))

      try {
        const { chainNamespace } = fromChainId(chainId)
        const chainIds = chainId === ethChainId ? getSupportedEvmChainIds() : [chainId]
        const accountMetadataByAccountId = await deriveAccountIdsAndMetadataForChainNamespace[
          chainNamespace
        ]({
          accountNumber: 0,
          chainIds,
          wallet: walletState.wallet,
        })

        const accountIds = Object.keys(accountMetadataByAccountId)
        const { getAccount } = portfolioApi.endpoints
        const opts = { forceRefetch: true }
        const accountPromises = accountIds.map(accountId =>
          dispatch(getAccount.initiate({ accountId }, opts)),
        )
        const accountResults = await Promise.allSettled(accountPromises)

        const balanceByChainId = accountResults.reduce<Record<ChainId, BN>>((acc, res, idx) => {
          if (res.status === 'rejected') {
            console.error(`Failed to fetch account ${accountIds[idx]}`, res.reason)
            return acc
          }
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
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingChains(prevLoading => ({ ...prevLoading, [chainId]: false }))
      }
    },
    [availableChainIds, dispatch, walletState.adapters, walletState.wallet],
  )

  const chainsRows = useMemo(
    () =>
      availableAssets.map(asset => (
        <Flex alignItems='center' justifyContent='space-between' mb={4} key={asset.assetId}>
          <Flex alignItems='center'>
            <AssetIcon assetId={asset.assetId} mr={2} />
            <CText>{asset.name}</CText>
          </Flex>
          {walletChainIds.includes(asset.chainId) ? (
            <CText>Added</CText>
          ) : loadingChains[asset.chainId] ? (
            <Spinner />
          ) : (
            <Button colorScheme='blue' onClick={() => handleConnectClick(asset.chainId)}>
              Connect
            </Button>
          )}
        </Flex>
      )),
    [availableAssets, handleConnectClick, loadingChains, walletChainIds],
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
          <Box>{chainsRows}</Box>
        </Box>
      </ModalBody>
    </>
  )
}
