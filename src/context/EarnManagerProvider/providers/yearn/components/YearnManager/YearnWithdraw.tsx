import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { useSteps } from 'chakra-ui-steps'
import { useHistory } from 'react-router'
import { VerticalStepper } from 'components/VerticalStepper/VerticalStepper'
import { BroadcastTx } from 'context/EarnManagerProvider/components/BroadcastTx/BroadcastTx'
import { Confirm } from 'context/EarnManagerProvider/components/Confirm/Confirm'
import { Withdraw } from 'context/EarnManagerProvider/components/Withdraw/Withdraw'
import { EarnActionsButtons } from 'context/EarnManagerProvider/context/EarnActions/EarnActionsProvider'

const steps = [
  { hideNav: true, label: 'Input Amount' },
  { label: 'Confirm' },
  { label: 'Broadcast' }
]

export const YearnWithdraw = () => {
  const history = useHistory()
  const { nextStep, activeStep } = useSteps({ initialStep: 0 })

  const handlePercentChange = () => {}

  const handleContinueWithdraw = () => {
    nextStep()
  }

  const handleConfirm = async () => {
    nextStep()
  }

  const handleCancel = () => {
    history.goBack()
  }

  const asset = {} as Asset

  const renderStep = (_step: number) => {
    switch (_step) {
      case 0:
        return (
          <Withdraw
            asset={asset}
            cryptoAmount=''
            cryptoAmountAvailable=''
            fiatAmount=''
            fiatAmountAvailable=''
            onPercentClick={handlePercentChange}
            onCancel={handleCancel}
            onContinue={handleContinueWithdraw}
          />
        )
      case 1:
        return (
          <Confirm
            onCancel={handleCancel}
            onConfirm={handleConfirm}
            apr='4%'
            provider='Yearn Finance'
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
          />
        )
      case 2:
        return (
          <BroadcastTx
            fromAsset={asset}
            loading={false}
            onClose={handleCancel}
            status='pending'
            statusText=''
            toAsset={asset}
            txid=''
          >
            <div>Rows</div>
          </BroadcastTx>
        )
      default:
        throw new Error('Step does not exist')
    }
  }

  return (
    <Flex>
      {!steps[activeStep].hideNav && <VerticalStepper activeStep={activeStep} steps={steps} />}
      <Flex flexDir='column'>
        {activeStep === 0 && <EarnActionsButtons />}
        {renderStep(activeStep)}
      </Flex>
    </Flex>
  )
}
