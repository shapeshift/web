import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Flex } from '@chakra-ui/layout'
import { Button, IconButton } from '@chakra-ui/react'
import { useSteps } from 'chakra-ui-steps'
import { useHistory } from 'react-router-dom'
import rewards from 'assets/rewards.svg'
import risk from 'assets/risk.svg'
import withdraw from 'assets/withdraw.svg'
import { CarouselDots } from 'components/CarouselDots/CarouselDots'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { DefiModalHeader } from '../DefiModalHeader/DefiModalHeader'

const STEPS_LENGTH = 3
const STEP_TO_ELEMENTS_MAPPING = {
  1: {
    bodies: [
      'defi.learnMore.bodies.rateFluctuationInfo',
      'defi.learnMore.bodies.amountStakingInfo',
      'defi.learnMore.bodies.withdrawInfo'
    ],
    header: 'defi.learnMore.headers.aboutStakingRewards',
    headerImageSrc: rewards
  },
  2: {
    bodies: ['defi.learnMore.bodies.unbondingInfo'],
    header: 'defi.learnMore.headers.unstaking',
    headerImageSrc: withdraw
  },
  3: {
    bodies: ['defi.learnMore.bodies.slashingInfo', 'defi.learnMore.bodies.partnerInfo'],
    header: 'defi.learnMore.headers.risks',
    headerImageSrc: risk
  }
}

type LearnMoreProps = {
  assetId: string
}

export const LearnMore = ({ assetId }: LearnMoreProps) => {
  const history = useHistory()
  const { cosmos } = useModal()
  // TODO: wire me up, parentheses are nice but let's get asset name from selectAssetNameById instead of this
  const asset = (_ => ({
    name: 'Osmo'
  }))(assetId)

  const { nextStep, prevStep, activeStep } = useSteps({
    initialStep: 1
  })

  // activeStep from useSteps() can have an infinite of step, but at runtime, it is effectively restricted to max. 3 in our case
  // This makes tsc happy regarding exhaustive property access of STEP_TO_ELEMENTS_MAPPING
  let currentStep = activeStep as 1 | 2 | 3

  const isLastStep = currentStep === STEPS_LENGTH
  const isFirstStep = currentStep === 1

  const handleNextOrCloseClick = () => {
    if (isLastStep) return cosmos.close()

    nextStep()
  }

  const handlePrevClick = () => {
    if (isFirstStep) {
      return history.goBack()
    }

    prevStep()
  }

  return (
    <>
      <IconButton
        variant='ghost'
        color='white'
        icon={<ArrowBackIcon />}
        aria-label={'common.back'}
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        onClick={handlePrevClick}
      />
      <Box pt='36px' pb='20px' px='24px'>
        <Flex
          direction='column'
          maxWidth='395px'
          height='520px'
          alignItems='center'
          justifyContent='space-between'
        >
          <SlideTransition key={currentStep}>
            <Flex direction='column' alignItems='center'>
              <DefiModalHeader
                headerImageSrc={STEP_TO_ELEMENTS_MAPPING[currentStep].headerImageSrc}
                headerText={[
                  STEP_TO_ELEMENTS_MAPPING[currentStep].header,
                  { assetName: asset.name }
                ]}
                headerImageWidth={120}
              />
              <Box>
                <Flex direction='column'>
                  {STEP_TO_ELEMENTS_MAPPING[currentStep].bodies.map((body, i) => (
                    <Box textAlign='left' key={i} mb='18px'>
                      <Text
                        translation={[body, { assetName: asset.name }]}
                        color='gray.500'
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
                <Text translation={isLastStep ? 'defi.learnMore.close' : 'defi.learnMore.next'} />
              </Button>
            </Box>
            <Box width='46px'>
              <CarouselDots length={STEPS_LENGTH} activeIndex={currentStep} />
            </Box>
          </Flex>
        </Flex>
      </Box>
    </>
  )
}
