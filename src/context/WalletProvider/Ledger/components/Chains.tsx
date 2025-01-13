import { CheckCircleIcon, InfoOutlineIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Flex,
  Icon,
  Link,
  ModalBody,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId, fromChainId, thorchainAssetId } from '@shapeshiftoss/caip'
import pull from 'lodash/pull'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { deriveAccountIdsAndMetadataForChainNamespace } from 'lib/account/account'
import type { BN } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { getSupportedEvmChainIds } from 'lib/utils/evm'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectAssets, selectWalletConnectedChainIds } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { availableLedgerAppAssetIds, availableLedgerAppChainIds } from '../constants'

export const LedgerChains = () => {
  const translate = useTranslate()
  const { state: walletState, dispatch: walletDispatch } = useWallet()
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const walletChainIds = useAppSelector(selectWalletConnectedChainIds)

  const availableAssets = useMemo(
    () => availableLedgerAppAssetIds.map(id => assets[id]).filter(isSome),
    [assets],
  )

  const [loadingChains, setLoadingChains] = useState<Record<ChainId, boolean>>({})

  const handleConnectClick = useCallback(
    async (chainId: ChainId) => {
      const { wallet, deviceId } = walletState

      if (!wallet || !deviceId) {
        console.error('No wallet found')
        return
      }

      setLoadingChains(prevLoading => ({ ...prevLoading, [chainId]: true }))

      try {
        const { chainNamespace } = fromChainId(chainId)
        const chainIds = chainId === ethChainId ? getSupportedEvmChainIds() : [chainId]
        const accountMetadataByAccountId = await deriveAccountIdsAndMetadataForChainNamespace[
          chainNamespace
        ]({
          accountNumber: 0,
          chainIds,
          wallet,
          isSnapInstalled: false,
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
          const payload = {
            accountMetadataByAccountId: { [accountId]: accountMetadata },
            walletId: deviceId,
          }

          dispatch(portfolio.actions.upsertAccountMetadata(payload))
          dispatch(portfolio.actions.upsertPortfolio(account))
          dispatch(portfolio.actions.enableAccountId(accountId))
          return acc
        }, {})

        Object.entries(balanceByChainId).forEach(([chainId, balance]) => {
          if (balance.eq(0)) pull(availableLedgerAppChainIds, chainId)
        })
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingChains(prevLoading => ({ ...prevLoading, [chainId]: false }))
      }
    },
    [dispatch, walletState],
  )

  const chainsRows = useMemo(
    () =>
      availableAssets.map(asset => (
        <Flex alignItems='center' justifyContent='space-between' mb={4} key={asset.assetId}>
          <Flex alignItems='center' gap={2}>
            <AssetIcon assetId={asset.assetId} size='sm' />
            <RawText fontWeight='bold'>{asset.name}</RawText>
            {asset.assetId === thorchainAssetId && (
              <Popover trigger='hover' placement='right-start'>
                <PopoverTrigger>
                  <Box>
                    <Icon
                      as={InfoOutlineIcon}
                      boxSize={4}
                      ml={1}
                      color='gray.500'
                      cursor='pointer'
                    />
                  </Box>
                </PopoverTrigger>
                <PopoverContent>
                  <PopoverArrow />
                  <PopoverBody>
                    {translate('walletProvider.ledger.chains.followTheInstructions')}{' '}
                    <Link
                      color='blue.200'
                      href='https://support.ledger.com/hc/en-us/articles/4402987997841-THORChain-RUNE-?docs=true'
                      isExternal
                    >
                      here
                    </Link>{' '}
                    {translate('walletProvider.ledger.chains.toGetTheRuneApp')}
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            )}
          </Flex>
          <Button
            isLoading={loadingChains[asset.chainId]}
            // we need to pass an arg here, so we need an anonymous function wrapper
            // eslint-disable-next-line react-memo/require-usememo
            onClick={() => handleConnectClick(asset.chainId)}
            colorScheme={walletChainIds.includes(asset.chainId) ? 'green' : 'gray'}
            isDisabled={walletChainIds.includes(asset.chainId)}
            leftIcon={walletChainIds.includes(asset.chainId) ? <CheckCircleIcon /> : undefined}
          >
            {walletChainIds.includes(asset.chainId)
              ? translate('walletProvider.ledger.chains.added')
              : translate('walletProvider.ledger.chains.connect')}
          </Button>
        </Flex>
      )),
    [availableAssets, handleConnectClick, loadingChains, translate, walletChainIds],
  )

  const handleClose = useCallback(() => {
    walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  }, [walletDispatch])

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
        <Alert status='info' mb={4}>
          <AlertIcon />
          <AlertDescription>
            <Text translation='walletProvider.ledger.connectWarning' />
          </AlertDescription>
        </Alert>
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
      <Flex justifyContent='center'>
        <Button onClick={handleClose}>{translate('common.close')}</Button>
      </Flex>
    </>
  )
}
