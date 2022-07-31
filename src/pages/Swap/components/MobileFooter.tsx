import '../SimpleSwap.css'

import { Flex } from '@chakra-ui/layout'
import { Button, Switch } from '@chakra-ui/react'
import { Text } from 'components/Text'

import { OG_COLORS } from '../constants'

type MobileFooterProps = {
  handleClickNext: () => void
  isInitialStep: boolean
  shouldShowClassicVersion: boolean
  handleClickSwitchVersions: () => void
  hasSubmittedTrade: boolean
}

export const MobileFooter = ({
  handleClickNext,
  isInitialStep,
  shouldShowClassicVersion,
  handleClickSwitchVersions,
  hasSubmittedTrade,
}: MobileFooterProps) => {
  if (shouldShowClassicVersion) {
    return (
      <Flex h='100%' direction='row' justifyContent='center' alignItems='center'>
        <Switch
          size='sm'
          colorScheme={OG_COLORS.lightBlue}
          bottom={3}
          mt={3}
          isChecked={shouldShowClassicVersion}
          onChange={handleClickSwitchVersions}
        />
      </Flex>
    )
  }

  return (
    <Flex h='100%' direction='column' justifyContent='center' alignItems='center'>
      {!hasSubmittedTrade && (
        <Button
          height='20px'
          variant='outline'
          border='.5px lightblue solid'
          borderRadius='4px'
          borderColor='lightblue'
          fontSize='10px'
          p={isInitialStep ? '8px 20px' : '8px'}
          mb={8}
          color='white'
          onClick={handleClickNext}
        >
          <Text
            translation={
              isInitialStep ? 'simpleSwap.modern.start' : 'simpleSwap.modern.executeTrade'
            }
          />
        </Button>
      )}
      <Switch
        size='sm'
        colorScheme={OG_COLORS.lightBlue}
        bottom={3}
        isChecked={shouldShowClassicVersion}
        onChange={handleClickSwitchVersions}
      />
    </Flex>
  )
}
