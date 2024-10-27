import { QuestionIcon } from '@chakra-ui/icons'
import { Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import type { SwapperName } from '@shapeshiftoss/swapper'
import { type FC, memo, useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { FeeModal } from 'components/FeeModal/FeeModal'
import { Row, type RowProps } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'

import { SwapperIcon } from './SwapperIcon/SwapperIcon'

type ReceiveSummaryProps = {
  isLoading?: boolean
  swapperName: string
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
              <SwapperIcon size='2xs' swapperName={swapperName as SwapperName} />
              <RawText fontWeight='semibold' color={textColor}>
                {swapSource}
              </RawText>
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
                {!!affiliateFeeAfterDiscountUserCurrency &&
                affiliateFeeAfterDiscountUserCurrency !== '0' ? (
                  <>
                    <Amount.Fiat value={affiliateFeeAfterDiscountUserCurrency} />
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
