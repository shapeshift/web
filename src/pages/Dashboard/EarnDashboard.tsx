import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Flex, Heading } from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as NavLink } from 'react-router-dom'
import { DeFiEarn } from 'components/StakingVaults/DeFiEarn'
import { RawText } from 'components/Text'

const alignItems = { base: 'flex-start', md: 'center' }
const padding = { base: 4, xl: 0 }

const EarnHeader = () => {
  const translate = useTranslate()

  return (
    <Flex alignItems={alignItems} px={padding} flexWrap='wrap'>
      <Flex width='full' justifyContent='space-between' alignItems='center'>
        <Heading fontSize='xl'>{translate('defi.myPositions')}</Heading>
        <Button
          colorScheme='purple'
          variant='ghost'
          as={NavLink}
          to='/earn'
          size='sm'
          ml='auto'
          rightIcon={<ArrowForwardIcon />}
        >
          {translate('defi.viewAllPositions')}
        </Button>
      </Flex>
      <RawText color='text.subtle'>{translate('defi.myPositionsBody')}</RawText>
    </Flex>
  )
}

export const EarnDashboard = memo(() => {
  return <DeFiEarn includeEarnBalances header={<EarnHeader />} />
})
