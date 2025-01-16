import type { StackDirection } from '@chakra-ui/react'
import { Button, Flex, HStack, Stack, Text, useColorModeValue } from '@chakra-ui/react'
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

const actionsPaddingLeft = { base: 10, md: 0 }
const columnsWidth = { base: '100%', md: '50%' }
const columnsDirection: StackDirection = { base: 'column', md: 'row' }
const columnsAlignItems = { md: 'center' }
const columnsJustifyContent = { md: 'space-between' }
const columnsSpacing = { base: 4, md: 48 }

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
    <Stack
      width='full'
      px={6}
      py={4}
      spacing={columnsSpacing}
      direction={columnsDirection}
      alignItems={columnsAlignItems}
      justifyContent={columnsJustifyContent}
    >
      <Flex width={columnsWidth} alignItems='center' justifyContent='space-between'>
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

        <Text fontWeight='bold'>
          {amount} {symbol}
        </Text>
      </Flex>

      <Flex
        width={columnsWidth}
        alignItems='center'
        justifyContent='space-between'
        pl={actionsPaddingLeft}
      >
        <Text color='green.500' fontSize='sm' fontWeight='bold'>
          {translate('foxPage.foxWifHat.discountText', { percent: discountPercent })}
        </Text>

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
    </Stack>
  )
}
