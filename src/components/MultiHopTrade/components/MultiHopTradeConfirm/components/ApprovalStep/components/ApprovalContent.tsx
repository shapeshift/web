import {
  Box,
  Button,
  Card,
  CircularProgress,
  Icon,
  Text as CText,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import type { InterpolationOptions } from 'node-polyglot'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'

export type ApprovalContentProps = {
  buttonTranslation: string
  isDisabled: boolean
  isLoading: boolean
  subHeadingTranslation?: string | [string, InterpolationOptions]
  titleTranslation: string
  tooltipTranslation: string | [string, InterpolationOptions]
  topRightContent?: JSX.Element
  transactionExecutionState: TransactionExecutionState
  onSubmit: () => void
  children?: JSX.Element
}

export const ApprovalContent = ({
  buttonTranslation,
  isDisabled,
  isLoading,
  subHeadingTranslation,
  titleTranslation,
  tooltipTranslation,
  topRightContent,
  transactionExecutionState,
  onSubmit,
  children,
}: ApprovalContentProps) => {
  const translate = useTranslate()

  return (
    <Card p='2' width='full'>
      <VStack width='full'>
        <Row px={2}>
          <Row.Label display='flex' alignItems='center'>
            <Text color='text.subtle' translation={titleTranslation} fontWeight='bold' />
            <Tooltip
              label={
                typeof tooltipTranslation === 'string'
                  ? translate(tooltipTranslation)
                  : translate(...tooltipTranslation)
              }
            >
              <Box ml={1}>
                <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.7em' />
              </Box>
            </Tooltip>
          </Row.Label>
          {topRightContent && (
            <Row.Value textAlign='right' display='flex' alignItems='center'>
              {topRightContent}
            </Row.Value>
          )}
        </Row>
        {subHeadingTranslation && (
          <Row px={2}>
            <Row.Label textAlign='left' display='flex'>
              <CText color='text.subtle'>
                {typeof subHeadingTranslation === 'string'
                  ? translate(subHeadingTranslation)
                  : translate(...subHeadingTranslation)}
              </CText>
            </Row.Label>
          </Row>
        )}
        {children}
        <Button
          width='full'
          size='sm'
          colorScheme={
            transactionExecutionState === TransactionExecutionState.Failed ? 'red' : 'blue'
          }
          isDisabled={isDisabled}
          isLoading={isLoading}
          onClick={onSubmit}
        >
          {transactionExecutionState === TransactionExecutionState.Pending && (
            <CircularProgress isIndeterminate size={2} mr={2} />
          )}
          {translate(buttonTranslation)}
        </Button>
      </VStack>
    </Card>
  )
}
