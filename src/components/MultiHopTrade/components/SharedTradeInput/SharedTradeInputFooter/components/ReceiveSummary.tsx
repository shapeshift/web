import { QuestionIcon } from '@chakra-ui/icons'
import { Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import type { FC } from 'react'
import { memo, useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { SwapperIcon } from '../../../TradeInput/components/SwapperIcon/SwapperIcon'

import { Amount } from '@/components/Amount/Amount'
import { FeeModal } from '@/components/FeeModal/FeeModal'
import type { RowProps } from '@/components/Row/Row'
import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { BigNumber, bnOrZero } from '@/lib/bignumber/bignumber'

type ReceiveSummaryProps = {
  isLoading?: boolean
  swapperName: SwapperName | undefined
  swapSource: SwapSource | undefined
  inputAmountUsd?: string
  affiliateBps?: string
  affiliateFeeAfterDiscountUserCurrency?: string
  children?: JSX.Element | null
} & RowProps

const shapeShiftFeeModalRowHover = { textDecoration: 'underline', cursor: 'pointer' }

const tradeFeeSourceTranslation: TextPropTypes['translation'] = [
  'trade.tradeFeeSource',
  { tradeFeeSource: 'ShapeShift' },
]

export const ReceiveSummary: FC<ReceiveSummaryProps> = memo(
  ({
    swapperName,
    swapSource,
    isLoading,
    inputAmountUsd,
    affiliateBps,
    affiliateFeeAfterDiscountUserCurrency,
    children,
  }) => {
    const translate = useTranslate()
    const [showFeeModal, setShowFeeModal] = useState(false)

    const greenColor = useColorModeValue('green.600', 'green.200')
    const textColor = useColorModeValue('gray.800', 'whiteAlpha.900')

    const toggleFeeModal = useCallback(() => {
      setShowFeeModal(!showFeeModal)
    }, [showFeeModal])

    return (
      <>
        <Stack spacing={4} py={4} px={6} fontSize='sm'>
          <Row alignItems='center'>
            <Row.Label display='flex' gap={2} alignItems='center'>
              {translate('trade.protocol')}
            </Row.Label>
            <Row.Value display='flex' gap={2} alignItems='center'>
              {swapperName !== undefined && <SwapperIcon size='2xs' swapperName={swapperName} />}
              {swapSource !== undefined && (
                <RawText fontWeight='semibold' color={textColor}>
                  {swapSource}
                </RawText>
              )}
            </Row.Value>
          </Row>

          {children}

          <Row isLoading={isLoading}>
            <Row.Label display='flex'>
              <Text translation={tradeFeeSourceTranslation} />
              {affiliateFeeAfterDiscountUserCurrency !== '0' && (
                <RawText>&nbsp;{`(${affiliateBps} bps)`}</RawText>
              )}
            </Row.Label>
            <Row.Value onClick={toggleFeeModal} _hover={shapeShiftFeeModalRowHover}>
              <Flex alignItems='center' gap={2}>
                {bnOrZero(affiliateFeeAfterDiscountUserCurrency).gt(0) ? (
                  <>
                    <Amount.Fiat
                      value={bnOrZero(affiliateFeeAfterDiscountUserCurrency).toFixed(
                        2,
                        BigNumber.ROUND_HALF_UP,
                      )}
                    />
                    <QuestionIcon />
                  </>
                ) : (
                  <>
                    <Text translation='trade.free' fontWeight='semibold' color={greenColor} />
                    <QuestionIcon color={greenColor} />
                  </>
                )}
              </Flex>
            </Row.Value>
          </Row>
        </Stack>
        <FeeModal
          isOpen={showFeeModal}
          onClose={toggleFeeModal}
          inputAmountUsd={inputAmountUsd}
          feeModel='SWAPPER'
        />
      </>
    )
  },
)
