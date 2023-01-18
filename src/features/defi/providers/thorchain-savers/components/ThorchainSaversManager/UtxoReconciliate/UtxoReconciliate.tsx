import { ArrowDownIcon, WarningIcon } from '@chakra-ui/icons'
import { Avatar, Box, Button, Divider, Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { FeeDataEstimate, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  ThorchainSaversDefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import type { SendInput } from 'components/Modals/Send/Form'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'
import { estimateFees, handleSend } from 'components/Modals/Send/utils'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { Address } from 'components/TransactionHistoryRows/TransactionDetails/Address'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectMarketDataById,
  selectSelectedCurrency,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

// There are two reconciliation types we need to handle
// Both stem from the same need of sending from a specific address, but no / not enough value UTXO outputs are available for said address
//
// - The first is for withdraws where dust is needed to identify that the withdraw is coming from the address originally deposited from
// - The second is for re-deposits, which should be done from the same address as originally deposited from, else it will count as an entirely new deposit
//  and funds will be effectively "lost" (as in, theoretically derivable but we would have to bake custom logic to retrieve them)
export enum ReconciliationType {
  Withdraw = 'withdraw-send-dust',
  Deposit = 'deposit-send-amount',
}

export type UtxoReconciliateProps = {
  accountId: AccountId | undefined
}

const moduleLogger = logger.child({ namespace: ['ThorchainSaversDeposit:UtxoReconciliate'] })

export const UtxoReconciliate: React.FC<UtxoReconciliateProps> = ({ accountId }) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [estimatedFees, setEstimatedFees] = useState<FeeDataEstimate<UtxoChainId> | undefined>()
  const [txId, setTxId] = useState<string>('')
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<
    ThorchainSaversDefiQueryParams,
    DefiParams
  >()
  const { accountAddress, estimatedGasCrypto, chainId, assetReference, assetNamespace } = query

  const { state: walletState } = useWallet()

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, assetId ?? ''))

  const estimateFeesArgs: EstimateFeesInput = useMemo(
    () => ({
      cryptoAmount: query.cryptoAmount ?? '',
      asset: asset!,
      to: accountAddress,
      sendMax: false,
      accountId: accountId ?? '',
      contractAddress: '',
    }),
    [accountAddress, accountId, asset, query?.cryptoAmount],
  )

  const serializedTxIndex = useMemo(() => {
    if (!(txId && accountId && accountAddress)) return ''
    return serializeTxIndex(accountId, txId, accountAddress)
  }, [txId, accountId, accountAddress])

  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  useEffect(() => {
    if (confirmedTransaction && confirmedTransaction.status !== 'Pending') {
      setLoading(false)
      history.push({
        pathname: location.pathname,
        search: qs.stringify({
          ...query,
          modal:
            query.reconciliationType === ReconciliationType.Deposit
              ? DefiAction.Deposit
              : DefiAction.Withdraw,
        }),
      })
    }
  }, [confirmedTransaction, history, location.pathname, query])

  useEffect(() => {
    ;(async () => {
      const estimatedFees = (await estimateFees(estimateFeesArgs)) as FeeDataEstimate<UtxoChainId>
      setEstimatedFees(estimatedFees)
    })()
  }, [estimateFeesArgs])
  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  const getUtxoReconciliateSendInput: () => SendInput | undefined = useCallback(() => {
    if (!(accountId && asset && accountAddress && estimatedFees)) return

    try {
      const sendInput: SendInput = {
        cryptoAmount: query.cryptoAmount,
        asset,
        from: '', // autoselect output
        to: accountAddress,
        sendMax: false,
        accountId: accountId ?? '',
        amountFieldError: '',
        cryptoSymbol: asset?.symbol ?? '',
        estimatedFees,
        feeType: FeeDataKey.Fast,
        fiatAmount: '',
        fiatSymbol: selectedCurrency,
        vanityAddress: '',
        input: accountAddress,
      }

      return sendInput
    } catch (e) {
      moduleLogger.error({ fn: 'getSendInput', e }, 'Error building THORChain savers Tx')
    }
  }, [accountId, asset, accountAddress, estimatedFees, query.cryptoAmount, selectedCurrency])

  const handleBack = useCallback(() => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [history, location.pathname, query])

  const handleConfirm = useCallback(async () => {
    setLoading(true)
    const utxoReconciliateSendInput = getUtxoReconciliateSendInput()
    const maybeTxId = await handleSend({
      sendInput: utxoReconciliateSendInput!,
      wallet: walletState.wallet!,
    })

    setTxId(maybeTxId)
  }, [getUtxoReconciliateSendInput, walletState.wallet])

  return (
    <Flex
      width='full'
      minWidth={{ base: '100%', md: '500px' }}
      maxWidth={{ base: 'full', md: '500px' }}
      flexDir='column'
    >
      <DefiModalHeader
        title={translate('defi.modals.saversVaults.utxoReconciliate')}
        onBack={handleBack}
      />
      <Stack spacing={0} divider={<Divider />}>
        <Row variant='vert-gutter' gap={2} alignItems='center'>
          <Row.Label>
            <Avatar
              icon={<ArrowDownIcon />}
              colorScheme='blue'
              bg={useColorModeValue('gray.200', 'gray.700')}
              color={useColorModeValue('blue.500', 'blue.200')}
            >
              <WarningIcon
                position='absolute'
                color={useColorModeValue('yellow.500', 'yellow.200')}
                right={0}
                top={0}
              />
            </Avatar>
          </Row.Label>
          <Row.Value textAlign='center'>
            <Text
              fontWeight='medium'
              translation={`defi.modals.saversVaults.utxoReconciliateBody.${
                query.reconciliationType === ReconciliationType.Deposit ? 'sendAmount' : 'sendDust'
              }`}
            />
          </Row.Value>
        </Row>
        <Row variant='vert-gutter' alignItems='center' gap={0} py={8}>
          <Row.Value>
            <Amount.Crypto fontSize='3xl' value={query.cryptoAmount} symbol='BTC' />
          </Row.Value>
          <Row.Label>
            <Amount.Fiat fontSize='2xl' value={query.fiatAmount} color='gray.500' prefix='≈' />
          </Row.Label>
        </Row>
        <Summary bg='transparent' borderWidth={0} px={8} py={6} divider={<></>}>
          <Row variant='gutter' px={0}>
            <Row.Label>{translate('defi.modals.saversVaults.addressToSendTo')}</Row.Label>
            <Row.Value fontSize='md'>
              <Address
                explorerAddressLink={`${asset?.explorerAddressLink}${txId}`}
                address={query.accountAddress}
              />
            </Row.Value>
          </Row>
          <Row variant='gutter' px={0}>
            <Row.Label>{translate('defi.modals.saversVaults.estimatedFee')}</Row.Label>
            <Row.Value>
              <Box textAlign='right'>
                <Amount.Fiat
                  fontWeight='bold'
                  value={bnOrZero(estimatedGasCrypto)
                    .div(`1e+${asset?.precision ?? 0}`)
                    .times(feeMarketData.price)
                    .toFixed(2)}
                />
                <Amount.Crypto color='gray.500' value='0' symbol='BTC' />
              </Box>
            </Row.Value>
          </Row>
          <Stack width='full' direction='row'>
            <Button size='lg' colorScheme='gray' width='full' onClick={handleBack}>
              {translate('modals.confirm.cancel')}
            </Button>
            <Button
              size='lg'
              width='full'
              colorScheme='blue'
              data-test='defi-modal-utxo-reconciliate-confirm'
              isLoading={loading}
              disabled={loading}
              onClick={handleConfirm}
            >
              {translate('defi.modals.saversVaults.utxoReconciliate')}
            </Button>
          </Stack>
        </Summary>
      </Stack>
    </Flex>
  )
}
