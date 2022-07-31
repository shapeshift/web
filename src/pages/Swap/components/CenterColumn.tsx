import '../SimpleSwap.css'

import { Box, Button, Flex, Switch } from '@chakra-ui/react'
import { GrSync } from 'react-icons/gr'
import { ImArrowRight } from 'react-icons/im'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'

import { OG_COLORS } from '../constants'

type CenterColumnProps = {
  currentStep: string
  handleClickNext: () => void
  isFinalStep: boolean
  isInitialStep: boolean
  shouldShowClassicVersion: boolean
  handleClickSwitchAssets: () => void
  handleClickSwitchVersions: () => void
  hasSubmittedTrade: boolean
}

export const CenterColumn = ({
  currentStep,
  handleClickNext,
  isFinalStep,
  isInitialStep,
  shouldShowClassicVersion,
  handleClickSwitchAssets,
  handleClickSwitchVersions,
  hasSubmittedTrade,
}: CenterColumnProps) => {
  const renderModernSkinCta = () => {
    if (hasSubmittedTrade) {
      return false
    }

    return (
      <Button
        height='20px'
        variant='outline'
        border='.5px lightblue solid'
        borderRadius='6px'
        borderColor='lightblue'
        fontSize='10px'
        p={isInitialStep ? '12px 25px' : '8px'}
        color='white'
        onClick={handleClickNext}
      >
        <Text
          translation={isInitialStep ? 'simpleSwap.modern.start' : 'simpleSwap.modern.executeTrade'}
        />
      </Button>
    )
  }

  if (shouldShowClassicVersion) {
    return (
      <Flex
        height='100%'
        direction='column'
        justifyContent='flex-start'
        alignItems='center'
        position='relative'
      >
        <Flex direction='column' height='200px' justifyContent='center' alignItems='center'>
          <ImArrowRight
            cursor='pointer'
            onClick={handleClickSwitchAssets}
            color={OG_COLORS.lighterBlue}
            size={40}
          />
        </Flex>
        <Switch
          size='sm'
          colorScheme={OG_COLORS.lightBlue}
          position='absolute'
          bottom={8}
          isChecked={shouldShowClassicVersion}
          onChange={handleClickSwitchVersions}
        />
      </Flex>
    )
  }

  return (
    <Flex
      height='100%'
      direction='column'
      justifyContent='flex-start'
      alignItems='center'
      position='relative'
    >
      <Flex
        direction='column'
        height={isInitialStep ? '186px' : '240px'}
        justifyContent='space-between'
        alignItems='center'
      >
        <Flex
          position='relative'
          direction='column'
          justifyContent='flex-start'
          alignItems='center'
          marginBottom={isInitialStep ? '58px' : '125px'}
        >
          <FoxIcon boxSize='35px' marginBottom='55px' />
          {hasSubmittedTrade ? (
            <Box fontSize='xs' whiteSpace='nowrap' textAlign='center'>
              <Text as='span' translation='simpleSwap.modern.yourTradeIs' />
              <Text as='span' fontWeight='bold' translation={`simpleSwap.modern.${currentStep}`} />
              {isFinalStep && (
                <Text
                  fontSize='xs'
                  translation='simpleSwap.modern.sovereign'
                  whiteSpace='normal'
                  width='160px'
                  textAlign='center'
                  marginTop='57px'
                />
              )}
            </Box>
          ) : (
            <GrSync
              cursor='pointer'
              onClick={handleClickSwitchAssets}
              size={25}
              className='grSync-white'
            />
          )}
        </Flex>
        {renderModernSkinCta()}
      </Flex>
      <Switch
        size='sm'
        position='absolute'
        bottom={8}
        isChecked={shouldShowClassicVersion}
        colorScheme={OG_COLORS.darkBlue}
        onChange={handleClickSwitchVersions}
      />
    </Flex>
  )
}
