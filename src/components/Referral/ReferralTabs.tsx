import { Badge, Button, HStack, Text, useColorModeValue } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

type ReferralTab = 'referrals' | 'codes'

type ReferralTabsProps = {
  activeTab: ReferralTab
  onTabChange: (tab: ReferralTab) => void
}

export const ReferralTabs = ({ activeTab, onTabChange }: ReferralTabsProps) => {
  const translate = useTranslate()
  const activeTabBg = useColorModeValue('background.surface.raised.base', 'white')
  const activeTabColor = useColorModeValue('white', 'black')

  return (
    <HStack spacing={3}>
      <Button
        onClick={() => onTabChange('referrals')}
        colorScheme={activeTab === 'referrals' ? 'whiteAlpha' : 'gray'}
        bg={activeTab === 'referrals' ? activeTabBg : 'background.surface.raised.base'}
        color={activeTab === 'referrals' ? activeTabColor : 'text.subtle'}
        borderRadius='full'
        border='1px solid'
        borderColor='gray.700'
        px={4}
        _hover={{
          bg: activeTab === 'referrals' ? activeTabBg : 'whiteAlpha.100',
        }}
      >
        {translate('referral.referrals')}
      </Button>
      <Button
        onClick={() => onTabChange('codes')}
        colorScheme={activeTab === 'codes' ? 'whiteAlpha' : 'gray'}
        bg={activeTab === 'codes' ? activeTabBg : 'background.surface.raised.base'}
        color={activeTab === 'codes' ? activeTabColor : 'text.subtle'}
        border='1px solid'
        borderColor='gray.700'
        borderRadius='full'
        px={4}
        _hover={{
          bg: activeTab === 'codes' ? activeTabBg : 'whiteAlpha.100',
        }}
      >
        {translate('referral.codes')}
      </Button>

      <Button
        isDisabled
        colorScheme='gray'
        border='1px solid'
        borderColor='gray.700'
        bg='transparent'
        color='text.subtle'
        borderRadius='full'
        px={4}
        cursor='not-allowed'
      >
        <HStack spacing={2}>
          <Text>{translate('referral.dashboard')}</Text>
          <Badge colorScheme='blue' fontSize='xs' borderRadius='full'>
            Coming Soon
          </Badge>
        </HStack>
      </Button>
    </HStack>
  )
}
