import { Box, Button, Card, CircularProgress, Icon, Tooltip, VStack } from '@chakra-ui/react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'

export type AllowanceApprovalContentProps = {
  buttonTranslation: string
  isDisabled: boolean
  isLoading: boolean
  titleTranslation: string
  tooltipTranslation: string
  topRightContent?: JSX.Element
  transactionExecutionState: TransactionExecutionState
  onSubmit: () => void
  children?: JSX.Element
}

export const AllowanceApprovalContent = ({
  buttonTranslation,
  isDisabled,
  isLoading,
  titleTranslation,
  tooltipTranslation,
  topRightContent,
  transactionExecutionState,
  onSubmit,
  children,
}: AllowanceApprovalContentProps) => {
  const translate = useTranslate()

  return (
    <Card p='2' width='full'>
      <VStack width='full'>
        <Row px={2}>
          <Row.Label display='flex' alignItems='center'>
            <Text color='text.subtle' translation={titleTranslation} />
            <Tooltip label={translate(tooltipTranslation)}>
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
        {children}
        <Button
          width='full'
          size='sm'
          colorScheme='blue'
          isDisabled={isDisabled}
          isLoading={isLoading}
          onClick={onSubmit}
        >
          {transactionExecutionState !== TransactionExecutionState.AwaitingConfirmation && (
            <CircularProgress isIndeterminate size={2} mr={2} />
          )}
          {translate(buttonTranslation)}
        </Button>
      </VStack>
    </Card>
  )
}
