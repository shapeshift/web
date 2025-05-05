import { Button, Card, CardBody, CardFooter, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { PropsWithChildren, ReactNode } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'

type ReusableConfirmProps = {
  assetId: AssetId
  headerText: string
  cryptoAmount: string
  cryptoSymbol: string
  fiatAmount: string
  confirmText: string
  feeAmountFiat: string | undefined
  isDisabled: boolean
  isLoading: boolean
  headerLeftComponent?: ReactNode
  headerRightComponent?: ReactNode
  onConfirm: () => void
} & PropsWithChildren

export const ReusableConfirm = ({
  assetId,
  headerText,
  cryptoAmount,
  cryptoSymbol,
  fiatAmount,
  feeAmountFiat,
  confirmText,
  isDisabled,
  isLoading,
  headerLeftComponent,
  headerRightComponent,
  onConfirm,
  children,
}: ReusableConfirmProps) => {
  const translate = useTranslate()

  return (
    <SlideTransition>
      <DialogHeader>
        {headerLeftComponent && <DialogHeader.Left>{headerLeftComponent}</DialogHeader.Left>}
        <DialogHeader.Middle>
          <RawText>{headerText}</RawText>
        </DialogHeader.Middle>
        {headerRightComponent && <DialogHeader.Right>{headerRightComponent}</DialogHeader.Right>}
      </DialogHeader>
      <Stack spacing={6}>
        <Card mx={4}>
          <CardBody textAlign='center' py={8}>
            <AssetIcon assetId={assetId} />
            <Amount.Crypto
              fontWeight='bold'
              value={cryptoAmount}
              mt={4}
              symbol={cryptoSymbol}
              color='text.base'
              fontSize='lg'
            />
            <Amount.Fiat fontSize='sm' value={fiatAmount} color='text.subtle' />
          </CardBody>
        </Card>
        {children && <CardBody>{children}</CardBody>}
        <CardFooter
          flexDir='column'
          gap={4}
          pb={4}
          px={4}
          bg='background.surface.raised.accent'
          borderBottomRadius='lg'
        >
          <Row px={2} fontSize='sm'>
            <Row.Label>{translate('TCY.claimConfirm.networkFee')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={!!feeAmountFiat}>
                <Amount.Fiat value={feeAmountFiat} />
              </Skeleton>
            </Row.Value>
          </Row>
          <Button
            size='lg'
            colorScheme='blue'
            onClick={onConfirm}
            isDisabled={isDisabled}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </CardFooter>
      </Stack>
    </SlideTransition>
  )
}
