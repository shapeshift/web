import '../SimpleSwap.css'

import { Box, Flex } from '@chakra-ui/react'
import { GrSync } from 'react-icons/gr'
import { ImArrowRight } from 'react-icons/im'
import { Text } from 'components/Text'

import { OG_COLORS } from '../constants'

type CenterRowProps = {
  currentStep: string
  isFinalStep: boolean
  shouldShowClassicVersion: boolean
  handleClickSwitchAssets: () => void
  hasSubmittedTrade: boolean
}

export const CenterRow = ({
  currentStep,
  isFinalStep,
  shouldShowClassicVersion,
  handleClickSwitchAssets,
  hasSubmittedTrade,
}: CenterRowProps) => {
  if (shouldShowClassicVersion) {
    return (
      <Flex direction='row' height='70px' justifyContent='center' alignItems='center'>
        <ImArrowRight
          style={{ cursor: 'pointer' }}
          onClick={handleClickSwitchAssets}
          color={OG_COLORS.lighterBlue}
          size={50}
        />
      </Flex>
    )
  }

  return (
    <Flex direction='row' justifyContent='center' alignItems='center'>
      {hasSubmittedTrade ? (
        <Box fontSize='xs'>
          <Text as='span' translation='simpleSwap.modern.yourTradeIs' />
          <Text as='span' fontWeight='bold' translation={`simpleSwap.modern.${currentStep}`} />
          {isFinalStep && (
            <Text
              fontSize='xs'
              translation='simpleSwap.modern.sovereign'
              width='160px'
              textAlign='center'
              marginLeft='-10px'
              marginTop={4}
            />
          )}
        </Box>
      ) : (
        <GrSync className='grSync-white' onClick={handleClickSwitchAssets} size={25} />
      )}
    </Flex>
  )
}
