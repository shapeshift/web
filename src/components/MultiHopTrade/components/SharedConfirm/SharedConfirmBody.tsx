import { Box, Card, HStack, Step, Stepper, StepSeparator } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'

import { AssetSummaryStep } from '../MultiHopTradeConfirm/components/AssetSummaryStep'

const stepContainerProps = { width: '100%', pb: 8 }

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
      <HStack width='full' justifyContent='space-between' px={6} marginTop={4}>
        <Stepper index={-1} orientation='vertical' gap='0' my={6} width='full'>
          <AssetSummaryStep asset={sellAsset} amountCryptoBaseUnit={sellAmountCryptoBaseUnit} />

          <Step {...stepContainerProps}>
            <Box
              bg='background.surface.overlay.base'
              borderRadius='xl'
              borderWidth='1px'
              borderColor='whiteAlpha.100'
              width='full'
              mx={-2}
              flex={1}
              zIndex={2}
            >
              <Stepper
                index={-1}
                orientation='vertical'
                gap='0'
                width='full'
                px={2}
                py={1}
                borderWidth='1px'
                borderColor='border.base'
                borderRadius='xl'
              >
                <InnerSteps />
              </Stepper>
            </Box>

            <StepSeparator />
          </Step>

          <AssetSummaryStep asset={buyAsset} amountCryptoBaseUnit={buyAmountCryptoBaseUnit} />
        </Stepper>
      </HStack>
    </Card>
  )
}
