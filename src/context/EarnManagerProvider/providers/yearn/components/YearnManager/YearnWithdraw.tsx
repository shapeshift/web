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

import { YearnVaultApi } from '../../api/api'

const steps = [
  { hideNav: true, label: 'Input Amount' },
  { label: 'Confirm' },
  { label: 'Broadcast' }
]

export const YearnWithdraw = ({ api }: { api: YearnVaultApi }) => {
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

  const handleViewAsset = () => {
    console.info('view asset')
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
            onClose={handleCancel}
            onContinue={handleViewAsset}
            loading={true}
            statusText='modals.broadcast.header.pending'
            statusIcon={<ArrowForwardIcon />}
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
          />
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
