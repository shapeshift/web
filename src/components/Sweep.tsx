import { Box, Button, Divider, Flex, Skeleton, Stack, Text as CText } from '@chakra-ui/react'
import { type AccountId, type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import { useWallet } from 'hooks/useWallet/useWallet'
import { fromBaseUnit } from 'lib/math'
import { sleep } from 'lib/poll/poll'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import { useGetEstimatedFeesQuery } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Amount } from './Amount/Amount'
import { AssetIcon } from './AssetIcon'
import { handleSend } from './Modals/Send/utils'

const divider = <Divider />

type SweepProps = {
  assetId: AssetId
  fromAddress: string | null
  accountId: AccountId | undefined
  onBack: () => void
  onSweepSeen: () => void
}

export const Sweep = ({
  assetId,
  fromAddress,
  accountId,
  onBack: handleBack,
  onSweepSeen: handleSwepSeen,
}: SweepProps) => {
  const [isSweepPending, setIsSweepPending] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)

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

  useEffect(() => {
    if (!adapter || !fromAddress) return
    // Once we have a Txid, the Tx is in the mempool which is enough to broadcast the actual Tx
    // but we still need to double check that the matching UTXO is seen to ensure coinselect gets fed the right UTXO data
    if (!txId) return
    ;(async () => {
      await sleep(60_000)
      const utxos = await adapter.getUtxos({
        pubkey: fromAddress,
      })
      if (utxos.some(utxo => utxo.txid === txId)) handleSwepSeen()
    })()
  }, [adapter, fromAddress, handleSwepSeen, txId])

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
              {translate('modals.send.consolidate.body', { asset: asset.name })}
            </CText>
          </Stack>
          <Stack justifyContent='space-between'>
            <Button
              onClick={handleSweep}
              disabled={isEstimatedFeesDataLoading || isSweepPending}
              size='lg'
              colorScheme={'blue'}
              width='full'
              data-test='utxo-sweep-button'
              isLoading={isEstimatedFeesDataLoading || isSweepPending}
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
