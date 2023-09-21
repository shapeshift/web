import { Box, Button, Flex, ModalBody, Text as CText } from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { btcAssetId, btcChainId, fromAccountId } from '@shapeshiftoss/caip'
import pull from 'lodash/pull'
import { useCallback } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { deriveUtxoAccountIdsAndMetadata } from 'lib/account/utxo'
import type { BN } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppDispatch } from 'state/store'

export const LedgerChains = () => {
  const wallet = useWallet().state.wallet
  const dispatch = useAppDispatch()

  const handleConnectClick = useCallback(async () => {
    if (!wallet) return
    // TODO(gomes): we don't have multi account support here yet but we may want to
    const accountNumber = 0
    const chainIds = [btcChainId]
    // TODO(gomes): this should be programmatic

    const accountMetadataByAccountId = await deriveUtxoAccountIdsAndMetadata({
      accountNumber,
      chainIds,
      wallet,
    })

    const accountIds: AccountId[] = Object.keys(accountMetadataByAccountId)
    const { getAccount } = portfolioApi.endpoints
    const opts = { forceRefetch: true }
    // do *not* upsertOnFetch here - we need to check if the fetched account is empty
    const accountPromises = accountIds.map(accountId =>
      dispatch(getAccount.initiate({ accountId }, opts)),
    )
    const accountResults = await Promise.allSettled(accountPromises)

    /**
     * because UTXO chains can have multiple accounts per number, we need to aggregate
     * balance by chain id to see if we fetch the next by accountNumber
     */
    const balanceByChainId = accountResults.reduce<Record<ChainId, BN>>((acc, res, idx) => {
      if (res.status === 'rejected') return acc
      const { data: account } = res.value
      if (!account) return acc
      const accountId = accountIds[idx]
      const { chainId } = fromAccountId(accountId)
      const accountBalance = Object.values(account.accountBalances.byId).reduce<BN>(
        (acc, byAssetId) => {
          Object.values(byAssetId).forEach(balance => (acc = acc.plus(bnOrZero(balance))))
          return acc
        },
        bnOrZero(0),
      )
      acc[chainId] = bnOrZero(acc[chainId]).plus(accountBalance)
      // don't upsert empty accounts past account 0
      if (accountNumber > 0 && accountBalance.eq(0)) return acc
      const accountMetadata = accountMetadataByAccountId[accountId]
      const payload = { [accountId]: accountMetadata }
      dispatch(portfolio.actions.upsertAccountMetadata(payload))
      dispatch(portfolio.actions.upsertPortfolio(account))
      return acc
    }, {})

    /**
     * if the balance for all accounts for the current chainId and accountNumber
     * is zero, we've exhausted that chain, don't fetch more of them
     */
    Object.entries(balanceByChainId).forEach(([chainId, balance]) => {
      if (balance.eq(0)) pull(chainIds, chainId) // pull mutates chainIds, but we want to
    })
  }, [dispatch, wallet])

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
            <Flex alignItems='center' justifyContent='space-between' mb={4}>
              <Flex alignItems='center'>
                <AssetIcon assetId={btcAssetId} mr={2} />
                <CText>Bitcoin</CText>
              </Flex>
              <Button colorScheme='blue' onClick={handleConnectClick}>
                Connect
              </Button>
            </Flex>
          </Box>
        </Box>
      </ModalBody>
    </>
  )
}
