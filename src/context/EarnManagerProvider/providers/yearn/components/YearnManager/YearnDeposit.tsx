import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Flex, Link, Stack, Tag, useColorModeValue } from '@chakra-ui/react'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Asset } from '@shapeshiftoss/types'
import { useSteps } from 'chakra-ui-steps'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { VerticalStepper } from 'components/VerticalStepper/VerticalStepper'
import { Approve } from 'context/EarnManagerProvider/components/Approve/Approve'
import { BroadcastTx } from 'context/EarnManagerProvider/components/BroadcastTx/BroadcastTx'
import { Confirm } from 'context/EarnManagerProvider/components/Confirm/Confirm'
import { Deposit } from 'context/EarnManagerProvider/components/Deposit/Deposit'
import { EarnActionsButtons } from 'context/EarnManagerProvider/context/EarnActions/EarnActionsProvider'

const steps = [
  { hideNav: true, label: 'Deposit Amount' },
  { label: 'Approve USDC' },
  { label: 'Confirm Deposit' },
  { label: 'Broadcast' }
]

export const YearnDeposit = () => {
  const history = useHistory()
  const { nextStep, activeStep } = useSteps({ initialStep: 0 })
  const stepperBg = useColorModeValue('gray.50', 'gray.850')
  const stepperBorder = useColorModeValue('gray.100', 'gray.750')
  const asset = {} as Asset

  const handlePercentChange = () => {}

  const handleContinueDeposit = () => {
    nextStep()
  }

  const handleApprove = async () => {
    nextStep()
  }

  const handleConfirm = async () => {
    nextStep()
  }

  const handleCurrencyToggle = () => {
    console.info('toggle currency')
  }

  const handleViewPosition = () => {}

  const handleCancel = () => {
    history.goBack()
  }

  const renderStep = (_step: number) => {
    switch (_step) {
      case 0:
        return (
          <Deposit
            // apy='' mocks dont show this
            asset={asset}
            cryptoAmount=''
            cryptoAmountAvailable=''
            estimatedCryptoYield=''
            estimatedFiatYield=''
            fiatAmount=''
            fiatAmountAvailable=''
            fiatTotalPlusFees=''
            slippage='0.5'
            maxOptions={['25%', '50%', '75%', 'Max']}
            onCancel={handleCancel}
            onContinue={handleContinueDeposit}
            onSlippageChange={() => {}}
            onPercentClick={handlePercentChange}
            onCurrencyToggle={handleCurrencyToggle}
          />
        )
      case 1:
        return (
          <Approve
            asset={asset}
            cryptoEstimatedGasFee=''
            disableAction
            fiatEstimatedGasFee=''
            // learnMoreLink='' optional
            loading={false}
            loadingText='Approve on Wallet'
            onCancel={handleCancel}
            onConfirm={handleApprove}
            wallet={{} as HDWallet}
          />
        )
      case 2:
        return (
          <Confirm
            onCancel={handleCancel}
            onConfirm={handleConfirm}
            prefooter={<Text color='gray.500' translation='modals.confirm.preFooter' />}
            assets={[
              {
                ...asset,
                color: '#FF0000',
                cryptoAmount: '100',
                fiatAmount: '100'
              },
              {
                ...asset,
                color: '#FFFFFF',
                cryptoAmount: '100',
                fiatAmount: '100'
              }
            ]}
          >
            <Stack spacing={6}>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.depositTo' />
                </Row.Label>
                <Row.Value fontWeight='bold'>Year Finance</Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.estimatedGas' />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat fontWeight='bold' value='30.00' />
                    <Amount.Crypto color='gray.500' value='0.024' symbol='ETH' />
                  </Box>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.averageApr' />
                </Row.Label>
                <Row.Value>
                  <Tag colorScheme='green'>4%</Tag>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.estimatedReturns' />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat fontWeight='bold' value='529.04' />
                    <Amount.Crypto color='gray.500' value='529.04' symbol='USDC' />
                  </Box>
                </Row.Value>
              </Row>
            </Stack>
          </Confirm>
        )
      case 3:
        return (
          <BroadcastTx
            onClose={handleCancel}
            onContinue={handleViewPosition}
            loading={true}
            statusText='modals.broadcast.header.pending'
            statusIcon={<ArrowForwardIcon />}
            assets={[
              {
                ...asset,
                cryptoAmount: '100',
                fiatAmount: '100'
              },
              {
                ...asset,
                cryptoAmount: '100',
                fiatAmount: '100'
              }
            ]}
          >
            <Stack spacing={6}>
              <Row>
                <Row.Label>
                  <Text translation='modals.broadcast.transactionId' />
                </Row.Label>
                <Row.Value>
                  <Link href='http://google.com' isExternal color='blue.500' fontWeight='bold'>
                    <MiddleEllipsis maxWidth='200px'>
                      0x73060cb15ae5b6a5edc71c3b8b49dd20746240990d0a1047481b4218c690ad1c
                    </MiddleEllipsis>
                  </Link>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.depositTo' />
                </Row.Label>
                <Row.Value fontWeight='bold'>Year Finance</Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.estimatedGas' />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat fontWeight='bold' value='30.00' />
                    <Amount.Crypto color='gray.500' value='0.024' symbol='ETH' />
                  </Box>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.averageApr' />
                </Row.Label>
                <Row.Value>
                  <Tag colorScheme='green'>4%</Tag>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.estimatedReturns' />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat fontWeight='bold' value='529.04' />
                    <Amount.Crypto color='gray.500' value='529.04' symbol='USDC' />
                  </Box>
                </Row.Value>
              </Row>
            </Stack>
          </BroadcastTx>
        )
      default:
        throw new Error('Step does not exist')
    }
  }

  return (
    <Flex
      width='full'
      minWidth={{ base: '100%', xl: '500px' }}
      flexDir={{ base: 'column', lg: 'row' }}
    >
      {!steps[activeStep].hideNav && (
        <Box
          bg={stepperBg}
          px={4}
          py={6}
          flex={1}
          borderRightWidth={{ base: 0, lg: 1 }}
          borderBottomWidth={{ base: 1, lg: 0 }}
          borderColor={stepperBorder}
          borderTopLeftRadius='xl'
          borderTopRightRadius={{ base: 'xl', lg: 'none' }}
          borderBottomLeftRadius={{ base: 'none', lg: 'xl' }}
          minWidth='250px'
        >
          <VerticalStepper activeStep={activeStep} steps={steps} />
        </Box>
      )}
      <Flex flexDir='column' width='full' minWidth='400px'>
        {activeStep === 0 && <EarnActionsButtons />}
        {renderStep(activeStep)}
      </Flex>
    </Flex>
  )
}
