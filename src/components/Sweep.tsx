import { Box, Button, Divider, Flex, Skeleton, Stack, Text as CText } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { Amount } from './Amount/Amount'
import { AssetIcon } from './AssetIcon'
import { handleSend } from './Modals/Send/utils'

import { Row } from '@/components/Row/Row'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { fromBaseUnit } from '@/lib/math'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { useGetEstimatedFeesQuery } from '@/pages/Lending/hooks/useGetEstimatedFeesQuery'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const divider = <Divider />

type SweepProps = {
  assetId: AssetId
  fromAddress: string | null
  accountId: AccountId | undefined
  protocolName?: string
  onBack?: () => void
  onSweepSeen: () => void
  requiredConfirmations?: number
  isLoading?: boolean
}

export const Sweep = ({
  assetId,
  fromAddress,
  accountId,
  protocolName,
  onBack,
  onSweepSeen: handleSwepSeen,
  requiredConfirmations,
  isLoading,
}: SweepProps) => {
  const [isSweepPending, setIsSweepPending] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const navigate = useNavigate()

  const {
    state: { wallet },
  } = useWallet()
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const {
    data: estimatedFeesData,
    isLoading: isEstimatedFeesDataLoading,
    isSuccess: isEstimatedFeesDataSuccess,
  } = useGetEstimatedFeesQuery({
    amountCryptoPrecision: '0',
    feeAssetId: assetId,
    assetId,
    to: fromAddress ?? '',
    sendMax: true,
    accountId: accountId ?? '',
    contractAddress: undefined,
    enabled: Boolean(accountId),
  })

  const handleBack = useCallback(() => {
    if (onBack) return onBack()

    navigate(-1)
  }, [navigate, onBack])

  const handleSweep = useCallback(async () => {
    if (!wallet) return

    setIsSweepPending(true)

    try {
      if (!fromAddress)
        throw new Error(`Cannot get from address for accountId: $accountIdcollateralAccountId}`)
      if (!accountId) throw new Error('accountId is required')
      if (!estimatedFeesData) throw new Error('Cannot get estimated fees')
      const sendInput = {
        accountId,
        to: fromAddress,
        input: fromAddress,
        assetId,
        from: '',
        amountCryptoPrecision: '0',
        sendMax: true,
        estimatedFees: estimatedFeesData.estimatedFees,
        amountFieldError: '',
        fiatAmount: '',
        vanityAddress: '',
        feeType: FeeDataKey.Fast,
        fiatSymbol: '',
      }

      const txId = await handleSend({ wallet, sendInput })
      setTxId(txId)
    } catch (e) {
      console.error(e)
    }
  }, [accountId, assetId, estimatedFeesData, fromAddress, wallet])

  const adapter = assertGetUtxoChainAdapter(fromAssetId(assetId).chainId)

  useQuery({
    queryKey: ['utxoSweepTxStatus', txId, requiredConfirmations],
    queryFn: async () => {
      if (!adapter || !fromAddress) return
      // Once we have a Txid, the Tx is in the mempool which is enough to broadcast the actual Tx
      // but we still need to double check that the matching UTXO is seen to ensure coinselect gets fed the right UTXO data
      // and wait for a confirmations if requiredConfirmations is set and > 0
      if (!txId) return
      const utxos = await adapter.getUtxos({
        pubkey: fromAddress,
      })
      if (
        utxos.some(
          utxo =>
            utxo.txid === txId &&
            (!requiredConfirmations || utxo.confirmations >= requiredConfirmations),
        )
      )
        handleSwepSeen()
    },
    enabled: Boolean(txId && adapter && fromAddress),
    refetchInterval: 60_000,
    // We need to set initialData to undefined using staleTime to avoid the query throwing its initial fetch before 60sec
    // or UTXO data might be not propagated yet
    staleTime: 60_000,
    initialData: undefined,
  })

  if (!asset) return null

  return (
    <Stack spacing={0} divider={divider}>
      <Stack py={4} spacing={4} fontSize='sm' fontWeight='medium'>
        <Stack flex={1} spacing={6} textAlign='center'>
          <Stack
            spacing={4}
            direction='row'
            alignItems='center'
            justifyContent='center'
            color='text.subtle'
            pt={6}
          >
            <Flex gap={2} alignItems='center' flexDir='column'>
              <Flex gap={4}>
                <AssetIcon size='xs' src={asset.icon} />
                <AssetIcon position='relative' size='xs' src={asset.icon} mt={-4} />
                <AssetIcon size='xs' src={asset.icon} />
              </Flex>
              <Box position='relative'>
                <Box
                  position='absolute'
                  width='50px'
                  height='auto'
                  borderBottomWidth={2}
                  borderStyle='dotted'
                  borderColor='border.base'
                  transform='rotate(90deg)'
                />
                <Box
                  position='absolute'
                  width='50px'
                  height='auto'
                  borderBottomWidth={2}
                  borderStyle='dotted'
                  borderColor='border.base'
                  transformOrigin='0 0'
                  transform='rotate(-135deg) translate(-45%)'
                />
                <Box
                  position='absolute'
                  width='50px'
                  height='auto'
                  borderBottomWidth={2}
                  borderStyle='dotted'
                  borderColor='border.base'
                  transformOrigin='100% 0'
                  transform='rotate(-45deg) translate(30%)'
                />
                <AssetIcon size='md' src={asset.icon} />
              </Box>
            </Flex>
          </Stack>
          <Stack>
            <CText color='text.subtle'>
              {translate('modals.send.consolidate.body', {
                asset: asset.name,
                protocolName: protocolName ?? SwapperName.Thorchain,
              })}
            </CText>
          </Stack>
          <Stack justifyContent='space-between'>
            <Button
              onClick={handleSweep}
              disabled={isEstimatedFeesDataLoading || isSweepPending || !fromAddress || isLoading}
              size='lg'
              colorScheme={'blue'}
              width='full'
              data-test='utxo-sweep-button'
              isLoading={isEstimatedFeesDataLoading || isSweepPending || isLoading}
              loadingText={translate('common.loadingText')}
            >
              {translate('modals.send.consolidate.consolidateFunds')}
            </Button>
            <Button
              onClick={handleBack}
              size='lg'
              width='full'
              colorScheme='gray'
              isDisabled={false}
            >
              {translate('common.cancel')}
            </Button>
          </Stack>
        </Stack>
        <Stack px={2}>
          <Row>
            <Row.Label>{translate('modals.approve.estimatedGas')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={isEstimatedFeesDataSuccess}>
                <Box textAlign='right'>
                  <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? '0'} />
                  <Amount.Crypto
                    color='text.subtle'
                    value={fromBaseUnit(
                      estimatedFeesData?.txFeeCryptoBaseUnit ?? '0',
                      asset.precision,
                    )}
                    symbol={asset.symbol}
                  />
                </Box>
              </Skeleton>
            </Row.Value>
          </Row>
        </Stack>
      </Stack>
    </Stack>
  )
}
