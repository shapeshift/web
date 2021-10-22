import { Box, Button, Flex } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { useState } from 'react'
import { useHistory } from 'react-router'
import { Deposit } from 'context/EarnManagerProvider/components/Deposit/Deposit'
import { Withdraw } from 'context/EarnManagerProvider/components/Withdraw/Withdraw'
import { useQuery } from 'hooks/useQuery/useQuery'

export enum ManagerActions {
  Deposit = 'deposit',
  Withdraw = 'withdraw'
}

export const YearnManager = () => {
  const query = useQuery()
  const history = useHistory()
  const [action, setAction] = useState(query.action || ManagerActions.Deposit)
  const asset = {} as Asset

  const handlePercentChange = () => {}

  const handleContinueDeposit = () => {}

  const handleContinueWithdraw = () => {}

  const handleCancel = () => {
    history.goBack()
  }

  const props = {
    asset,
    cryptoAmount: '',
    cryptoAmountAvailable: '',
    fiatAmount: '',
    fiatAmountAvailable: '',
    onPercentClick: handlePercentChange,
    onCancel: handleCancel
  }

  return (
    <Box>
      <Flex>
        <Button onClick={() => setAction(ManagerActions.Deposit)}>Deposit</Button>
        <Button onClick={() => setAction(ManagerActions.Withdraw)}>Withdraw</Button>
      </Flex>
      <Box>
        {action === ManagerActions.Deposit ? (
          <Deposit
            {...props}
            apy=''
            estimatedFiatYield=''
            estimatedCryptoYield=''
            onContinue={handleContinueDeposit}
          />
        ) : (
          <Withdraw {...props} onContinue={handleContinueWithdraw} />
        )}
      </Box>
    </Box>
  )
}
