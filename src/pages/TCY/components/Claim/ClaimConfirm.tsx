import { Button, Card, CardBody, CardFooter, ModalCloseButton, Stack } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
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
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'

type ClaimConfirmProps = {
  claim: Claim | undefined
  setClaimTxid: (txId: string) => void
}

type AddressFormValues = {
  manualRuneAddress: string
}

export const ClaimConfirm = ({ claim, setClaimTxid }: ClaimConfirmProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const { state: walletState } = useWallet()
  const [runeAddress, setRuneAddress] = useState<string>()
  const methods = useForm<AddressFormValues>()

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
    memo: `tcy:${runeAddress}`,
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
    onError: error => {
      console.error('Failed to broadcast claim transaction:', error)
      // TODO: Handle error state
    },
  })

  const handleConfirm = useCallback(async () => {
    await handleClaim()
  }, [handleClaim])

  if (!claim) return null

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
              <AssetIcon assetId={claim.assetId} />
              <Amount.Crypto
                fontWeight='bold'
                value={claim.amountThorBaseUnit}
                mt={4}
                symbol='TCY'
                color='text.base'
                fontSize='lg'
              />
              <Amount.Fiat fontSize='sm' value={claim.amountThorBaseUnit} color='text.subtle' />
            </CardBody>
          </Card>
          <CardBody>
            <ClaimAddressInput onChange={setRuneAddress} value={runeAddress} />
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
                <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? '0'} />
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
