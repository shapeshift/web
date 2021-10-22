import { Button, Flex, ModalBody } from '@chakra-ui/react'
// import { Asset } from '@shapeshiftoss/types'
import { useSteps } from 'chakra-ui-steps'
import React, { useState } from 'react'
import { useHistory } from 'react-router'
import { VerticalStepper } from 'components/VerticalStepper/VerticalStepper'
import { Approve } from 'context/EarnManagerProvider/components/Approve/Approve'
import { BroadcastTx } from 'context/EarnManagerProvider/components/BroadcastTx/BroadcastTx'
import { Confirm } from 'context/EarnManagerProvider/components/Confirm/Confirm'
import { Deposit } from 'context/EarnManagerProvider/components/Deposit/Deposit'

const steps = [
  { hideNav: true, label: 'Input Amount', component: Deposit },
  { label: 'Approve', component: Approve },
  { label: 'Confirm', component: Confirm },
  { label: 'Broadcast', component: BroadcastTx }
]

const YearnDepositContext = React.createContext(null)

export const YearnDeposit = () => {
  const history = useHistory()
  const [state, setState] = useState({})
  const { nextStep, activeStep } = useSteps({ initialStep: 0 })
  // const asset = {} as Asset

  const handlePercentChange = () => {}

  const handleContinueDeposit = () => {
    nextStep()
  }

  const handleCancel = () => {
    history.goBack()
  }

  return (
    <YearnDepositContext.Provider value={null}>
      <ModalBody>
        <Flex>
          {!steps[activeStep].hideNav && <VerticalStepper activeStep={activeStep} steps={steps} />}
          {React.createElement(steps[activeStep].component, {
            ...state,
            onContinue: handleContinueDeposit
            //   callback
          })}
          <Button onClick={handleContinueDeposit}></Button>
        </Flex>
        {/* <Deposit
          asset={asset}
          cryptoAmount=''
          cryptoAmountAvailable=''
          fiatAmount=''
          fiatAmountAvailable=''
          onPercentClick={handlePercentChange}
          onCancel={handleCancel}
          apy=''
          estimatedFiatYield=''
          estimatedCryptoYield=''
          onContinue={handleContinueDeposit}
        /> */}
      </ModalBody>
    </YearnDepositContext.Provider>
  )
}
