import { ChevronRightIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, Tooltip, useColorModeValue } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

import type { SupportedFiatRampConfig } from '../config'
import { FiatRampAction } from '../FiatRampsCommon'

type FiatRampButtonProps = {
  onClick: () => void
  accountFiatBalance: string
  action: FiatRampAction
} & SupportedFiatRampConfig

export const FiatRampButton: React.FC<FiatRampButtonProps> = ({
  onClick,
  accountFiatBalance,
  action,
  logo,
  label,
  info,
  tags,
  minimumSellThreshold,
}) => {
  const translate = useTranslate()
  const tagColor = useColorModeValue('gray.600', 'gray.400')
  const hasEnoughBalance = useMemo(
    () => bnOrZero(accountFiatBalance).gte(minimumSellThreshold ?? 0),
    [accountFiatBalance, minimumSellThreshold],
  )

  const renderTags = useMemo(() => {
    return tags?.map(tag => (
      <Tag key={tag} colorScheme='gray' size='xs' py={1} px={2}>
        <Text
          color={tagColor}
          fontSize='12px'
          translation={tag}
          style={{ textTransform: 'uppercase' }}
        />
      </Tag>
    ))
  }, [tagColor, tags])

  return (
    <Tooltip
      label={translate('fiatRamps.insufficientCryptoAmountToSell', {
        amount: minimumSellThreshold ?? 0,
      })}
      isDisabled={hasEnoughBalance || action === FiatRampAction.Buy}
      shouldWrapChildren
      hasArrow
    >
      <Button
        key={label}
        width='full'
        height='auto'
        justifyContent='space-between'
        variant='outline'
        fontWeight='normal'
        data-test={`fiat-ramp-${label}-button`}
        py={2}
        onClick={onClick}
        rightIcon={<ChevronRightIcon boxSize={4} />}
        disabled={!hasEnoughBalance && action === FiatRampAction.Sell}
      >
        <Flex
          flex={1}
          flexWrap='wrap'
          justifyContent='space-between'
          alignItems='center'
          gap={['1em', 0]}
          width='100%'
        >
          <Flex flexDirection='row' justifyContent='center' alignItems='center'>
            <AssetIcon src={logo} boxSize='8' />
            <Box textAlign='left' ml={2}>
              <Text fontWeight='bold' translation={label} />
              <Text translation={info ?? ''} />
            </Box>
          </Flex>
          <Flex gap={2}>{renderTags}</Flex>
        </Flex>
      </Button>
    </Tooltip>
  )
}
