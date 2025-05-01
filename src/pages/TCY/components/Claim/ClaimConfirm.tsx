import {
  Button,
  Card,
  CardBody,
  CardFooter,
  ModalCloseButton,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import { fromAccountId, tcyAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYClaimRoute } from '../../types'
import { ClaimAddressInput } from './components/ClaimAddressInput'
import type { Claim } from './types'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bn } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ClaimConfirmProps = {
  claim: Claim | undefined
  setClaimTxid: (txId: string) => void
}

type AddressFormValues = {
  manualRuneAddress: string
}

// There is no market-data for this asset just yet, so we hardcode it to the starting 0.1$ price
// See https://gitlab.com/thorchain/thornode/-/blob/f62daad263a3690f50c75a24298320f7a9514d6e/docs/concepts/tcy.md?plain=0#user-interaction

export const ClaimConfirm = ({ claim, setClaimTxid }: ClaimConfirmProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const { state: walletState } = useWallet()
  const [runeAddress, setRuneAddress] = useState<string>()
  const methods = useForm<AddressFormValues>()

  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const tcyMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, tcyAssetId),
  )

  const amountCryptoPrecision = useMemo(
    () => fromBaseUnit(claim?.amountThorBaseUnit ?? '0', THOR_PRECISION),
    [claim?.amountThorBaseUnit],
  )

  const amountUserCurrency = useMemo(() => {
    return bn(amountCryptoPrecision).times(tcyMarketData.price).toFixed(2)
  }, [tcyMarketData.price, amountCryptoPrecision])

  const fromAddress = useMemo(
    () => (claim?.accountId ? fromAccountId(claim.accountId).account : null),
    [claim?.accountId],
  )

  const { estimatedFeesData, executeTransaction } = useSendThorTx({
    accountId: claim?.accountId ?? null,
    action: 'claimTcy',
    amountCryptoBaseUnit: '0',
    assetId: claim?.assetId,
    fromAddress,
    memo: runeAddress ? `tcy:${runeAddress}` : '',
    enableEstimateFees: Boolean(runeAddress && claim?.accountId),
  })

  const { mutateAsync: handleClaim, isPending: isClaimMutationPending } = useMutation({
    mutationFn: async () => {
      if (!claim || !runeAddress) return

      const txid = await executeTransaction()
      if (!txid) throw new Error('Failed to broadcast transaction')

      return txid
    },
    onSuccess: (txid: string | undefined) => {
      if (!txid) return

      setClaimTxid(txid)
      navigate(TCYClaimRoute.Status)
    },
  })

  const handleConfirm = useCallback(async () => {
    await handleClaim()
  }, [handleClaim])

  if (!claim || !tcyAsset) return null

  return (
    <FormProvider {...methods}>
      <SlideTransition>
        <Stack>
          <DialogHeader>
            <DialogHeader.Middle>
              <RawText>{translate('TCY.claimConfirm.confirmTitle')}</RawText>
            </DialogHeader.Middle>
            <DialogHeader.Right>
              <ModalCloseButton />
            </DialogHeader.Right>
          </DialogHeader>
          <Card mx={4}>
            <CardBody textAlign='center' py={8}>
              <AssetIcon assetId={thorchainAssetId} />
              <Amount.Crypto
                fontWeight='bold'
                value={amountCryptoPrecision}
                symbol={tcyAsset.symbol}
                mt={4}
                color='text.base'
                fontSize='lg'
              />
              <Amount.Fiat fontSize='sm' value={amountUserCurrency} color='text.subtle' />
            </CardBody>
          </Card>
          <CardBody>
            <ClaimAddressInput onActiveAddressChange={setRuneAddress} address={runeAddress} />
          </CardBody>
          <CardFooter
            flexDir='column'
            gap={4}
            pb={6}
            bg='background.surface.raised.accent'
            borderBottomRadius='lg'
          >
            <Row fontSize='sm'>
              <Row.Label>{translate('TCY.claimConfirm.networkFee')}</Row.Label>
              <Row.Value>
                <Skeleton isLoaded={!!estimatedFeesData}>
                  <Row.Value>
                    <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? '0.00'} />
                  </Row.Value>
                </Skeleton>
              </Row.Value>
            </Row>
            <Button
              size='lg'
              colorScheme='blue'
              onClick={handleConfirm}
              isDisabled={!walletState.isConnected || !runeAddress}
              isLoading={isClaimMutationPending}
            >
              {translate('TCY.claimConfirm.confirmAndClaim')}
            </Button>
          </CardFooter>
        </Stack>
      </SlideTransition>
    </FormProvider>
  )
}
