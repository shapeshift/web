import { Button, Card, CardBody, CardFooter, Stack } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYClaimRoute } from '../../types'
import { ClaimAddressInput } from './components/ClaimAddressInput'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'

export const ClaimConfirm = () => {
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleBack = useCallback(() => {
    navigate(TCYClaimRoute.Select)
  }, [navigate])

  const handleConfirm = useCallback(() => {
    navigate(TCYClaimRoute.Status)
  }, [navigate])

  return (
    <SlideTransition>
      <Stack>
        <DialogHeader>
          <DialogHeader.Left>
            <DialogBackButton onClick={handleBack} />
          </DialogHeader.Left>
          <DialogHeader.Middle>
            <RawText>{translate('TCY.claimConfirm.confirmTitle')}</RawText>
          </DialogHeader.Middle>
        </DialogHeader>
        <Card mx={4}>
          <CardBody textAlign='center' py={12}>
            <AssetIcon assetId={ethAssetId} />
            <Amount.Crypto
              fontWeight='bold'
              value='100'
              mt={4}
              symbol='TCY'
              color='text.base'
              fontSize='lg'
            />
            <Amount.Fiat fontSize='sm' value='100' color='text.subtle' />
          </CardBody>
        </Card>
        <CardBody>
          <ClaimAddressInput />
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
              <Amount.Fiat value='0.000000000000000000' />
            </Row.Value>
          </Row>
          <Button size='lg' colorScheme='blue' onClick={handleConfirm}>
            {translate('TCY.claimConfirm.confirmAndClaim')}
          </Button>
        </CardFooter>
      </Stack>
    </SlideTransition>
  )
}
