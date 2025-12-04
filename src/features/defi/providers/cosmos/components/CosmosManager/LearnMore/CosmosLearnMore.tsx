import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, IconButton } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { useSteps } from 'chakra-ui-steps'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import rewards from '@/assets/rewards.svg?url'
import risk from '@/assets/risk.svg?url'
import withdraw from '@/assets/withdraw.svg?url'
import { CarouselDots } from '@/components/CarouselDots/CarouselDots'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { DefiModalHeader } from '@/plugins/cosmos/components/DefiModalHeader/DefiModalHeader'
import { assetIdToUnbondingDays } from '@/plugins/cosmos/components/modals/Staking/StakingCommon'
import { selectAssetNameById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const STEP_TO_ELEMENTS_MAPPING = [
  {
    bodies: [
      'defi.modals.learnMore.bodies.rateFluctuationInfo',
      'defi.modals.learnMore.bodies.amountStakingInfo',
      'defi.modals.learnMore.bodies.withdrawInfo',
    ],
    header: 'defi.modals.learnMore.headers.aboutStakingRewards',
    headerImageSrc: rewards,
  },
  {
    bodies: ['defi.modals.learnMore.bodies.unbondingInfo'],
    header: 'defi.modals.learnMore.headers.unstaking',
    headerImageSrc: withdraw,
  },
  {
    bodies: [
      'defi.modals.learnMore.bodies.slashingInfo',
      'defi.modals.learnMore.bodies.partnerInfo',
    ],
    header: 'defi.modals.learnMore.headers.risks',
    headerImageSrc: risk,
  },
]

type LearnMoreProps = {
  onClose: () => void
}

const arrowBackIcon = <ArrowBackIcon />

const minWidthProps = { base: '100%', md: '500px' }
const maxWidthProps = { base: 'full', md: '500px' }

export const CosmosLearnMore = ({ onClose }: LearnMoreProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference } = query
  const assetNamespace = 'slip44'

  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const assetName = useAppSelector(state => selectAssetNameById(state, assetId))
  const unbondingDays = useMemo(() => assetIdToUnbondingDays(assetId), [assetId])

  const { nextStep, prevStep, setStep, activeStep } = useSteps({
    initialStep: 1,
  })

  const stepsLength = Object.keys(STEP_TO_ELEMENTS_MAPPING).length
  const isFirstStep = activeStep === 1
  const isLastStep = activeStep === stepsLength

  const handleNextOrCloseClick = useCallback(() => {
    if (isLastStep) return onClose()

    nextStep()
  }, [isLastStep, nextStep, onClose])

  const handlePrevClick = useCallback(() => {
    if (isFirstStep) {
      return navigate(-1)
    }

    prevStep()
  }, [navigate, isFirstStep, prevStep])

  const currentElement = STEP_TO_ELEMENTS_MAPPING[activeStep - 1]

  const defiModalHeaderText: [string, Record<string, string>] = useMemo(
    () => [currentElement.header, { assetName }],
    [currentElement.header, assetName],
  )

  return (
    <>
      <IconButton
        variant='ghost'
        icon={arrowBackIcon}
        aria-label={translate('common.back')}
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        onClick={handlePrevClick}
      />
      <Box
        pt='36px'
        pb='20px'
        px='24px'
        width='full'
        minWidth={minWidthProps}
        maxWidth={maxWidthProps}
      >
        <Flex direction='column' height='520px' alignItems='center' justifyContent='space-between'>
          <SlideTransition key={activeStep}>
            <Flex direction='column' alignItems='center'>
              <DefiModalHeader
                headerImageSrc={currentElement.headerImageSrc}
                headerText={defiModalHeaderText}
                headerImageMaxWidth={120}
              />
              <Box>
                <Flex direction='column'>
                  {currentElement.bodies.map((body, i) => (
                    <Box textAlign='left' key={i} mb='18px'>
                      <Text
                        // we need to pass a local scope arg here, so we need an anonymous function wrapper
                        translation={[body, { assetName, unbondingDays }]}
                        color='text.subtle'
                        fontWeight='semibold'
                        fontSize='15px'
                      />
                    </Box>
                  ))}
                </Flex>
              </Box>
            </Flex>
          </SlideTransition>
          <Flex width='100%' direction='column' justifyContent='center' alignItems='center'>
            <Box width='100%'>
              <Button
                size='lg'
                zIndex={1}
                width='100%'
                colorScheme='blue'
                mb='20px'
                onClick={handleNextOrCloseClick}
              >
                <Text
                  translation={
                    isLastStep ? 'defi.modals.learnMore.close' : 'defi.modals.learnMore.next'
                  }
                />
              </Button>
            </Box>
            <Box width='46px'>
              <CarouselDots length={stepsLength} activeIndex={activeStep} onClick={setStep} />
            </Box>
          </Flex>
        </Flex>
      </Box>
    </>
  )
}
