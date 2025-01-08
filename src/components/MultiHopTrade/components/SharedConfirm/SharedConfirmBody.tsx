import { Box, Card, HStack, Step, Stepper } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'

import { AssetSummaryStep } from '../MultiHopTradeConfirm/components/AssetSummaryStep'

const stepContainerProps = { width: '100%', pb: 0 }

type SharedConfirmBodyProps = {
  InnerSteps: React.ComponentType
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  buyAmountCryptoBaseUnit: string
}

export const SharedConfirmBody: React.FC<SharedConfirmBodyProps> = ({
  InnerSteps,
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  buyAmountCryptoBaseUnit,
}) => {
  return (
    <Card flex={1} bg='transparent' borderWidth={0} borderRadius={0} width='full' boxShadow='none'>
      <HStack width='full' justifyContent='space-between' px={4}>
        <Stepper index={-1} orientation='vertical' gap='0' mb={6} width='full'>
          <AssetSummaryStep asset={sellAsset} amountCryptoBaseUnit={sellAmountCryptoBaseUnit} />

          <Step {...stepContainerProps}>
            <Box width='full' flex={1} zIndex={2}>
              <Stepper
                bg='background.surface.raised.base'
                index={-1}
                orientation='vertical'
                gap='0'
                width='full'
                borderWidth='1px'
                borderColor='border.base'
                borderRadius='xl'
                pb={0}
              >
                <InnerSteps />
              </Stepper>
            </Box>
          </Step>

          <AssetSummaryStep asset={buyAsset} amountCryptoBaseUnit={buyAmountCryptoBaseUnit} />
        </Stepper>
      </HStack>
    </Card>
  )
}
