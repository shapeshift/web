import { Button, Flex, HStack, Text, useColorModeValue } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { WalletIcon } from 'components/Icons/WalletIcon'
import { middleEllipsis } from 'lib/utils'

type FoxWifHatHoldingLineProps = {
  accountId: string
  accountNumber: number
  amount: string
  symbol: string
  discountPercent: string
  isClaimed?: boolean
  onClaim?: () => void
}

export const FoxWifHatHoldingLine = ({
  accountId,
  accountNumber,
  amount,
  symbol,
  discountPercent,
  isClaimed,
  onClaim,
}: FoxWifHatHoldingLineProps) => {
  const textColor = useColorModeValue('gray.500', 'gray.400')
  const translate = useTranslate()

  return (
    <Flex width='full' alignItems='center' justifyContent='space-between' px={6} py={4}>
      <HStack spacing={4}>
        <WalletIcon color={textColor} boxSize={6} />
        <Flex direction='column' alignItems='flex-start'>
          <Text fontWeight='bold' fontSize='sm'>
            {middleEllipsis(accountId)}
          </Text>
          <Text color={textColor} fontSize='xs'>
            {translate('accounts.accountNumber', { accountNumber })}
          </Text>
        </Flex>
      </HStack>

      <Flex alignItems='center' gap={6} width='full' justifyContent='space-around'>
        <Text fontWeight='bold'>
          {amount} {symbol}
        </Text>
        <Text color='green.500' fontSize='sm' fontWeight='bold'>
          {translate('foxPage.foxWifHat.discountText', { percent: discountPercent })}
        </Text>
      </Flex>

      <Flex alignItems='center' gap={6} width='100%' maxWidth='150px' justifyContent='flex-end'>
        <Button
          colorScheme={isClaimed ? 'green' : 'gray'}
          size='sm'
          onClick={!isClaimed ? onClaim : undefined}
        >
          {isClaimed
            ? translate('foxPage.foxWifHat.claimed')
            : translate('foxPage.foxWifHat.claim')}
        </Button>
      </Flex>
    </Flex>
  )
}
