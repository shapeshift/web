import { Box, Flex } from '@chakra-ui/react'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Asset } from '@shapeshiftoss/types'
import { useSteps } from 'chakra-ui-steps'
import { useHistory } from 'react-router'
import { Row } from 'components/Row/Row'
import { VerticalStepper } from 'components/VerticalStepper/VerticalStepper'
import { Approve } from 'context/EarnManagerProvider/components/Approve/Approve'
import { BroadcastTx } from 'context/EarnManagerProvider/components/BroadcastTx/BroadcastTx'
import { Confirm } from 'context/EarnManagerProvider/components/Confirm/Confirm'
import { Deposit } from 'context/EarnManagerProvider/components/Deposit/Deposit'
import { EarnActionsButtons } from 'context/EarnManagerProvider/context/EarnActions/EarnActionsProvider'

const steps = [
  { hideNav: true, label: 'Deposit Amount' },
  { label: 'Approve' },
  { label: 'Confirm' },
  { label: 'Broadcast' }
]

export const YearnDeposit = () => {
  const history = useHistory()
  const { nextStep, activeStep } = useSteps({ initialStep: 0 })
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
            fromAsset={asset}
            onCancel={handleCancel}
            onConfirm={handleConfirm}
            toAsset={asset}
          >
            <Row>
              <Row.Label></Row.Label>
              <Row.Value></Row.Value>
            </Row>
          </Confirm>
        )
      case 3:
        return (
          <BroadcastTx
            fromAsset={asset}
            loading={false}
            onClose={handleCancel}
            onContinue={handleViewPosition}
            status='pending'
            statusText=''
            toAsset={asset}
            txid=''
          >
            <Row>
              <Row.Label></Row.Label>
              <Row.Value></Row.Value>
            </Row>
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
          bg='gray.850'
          px={4}
          py={6}
          flex={1}
          borderRightWidth={1}
          borderColor='gray.750'
          borderTopLeftRadius='xl'
          borderBottomLeftRadius='xl'
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
