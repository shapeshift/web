import { Button, ButtonGroup } from '@chakra-ui/react'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams } from 'react-router-dom'

export const DefiActionButtons = ({ vaultExpired }: { vaultExpired: boolean }) => {
  const translate = useTranslate()
  const params = useParams()
  const navigate = useNavigate()

  const handleClick = (action: DefiAction) => {
    if (params) {
      const { earnType, provider } = params
      navigate(`/defi/${earnType}/${provider}/${action}`)
    }
  }

  let activeDeposit = params?.action === DefiAction.Deposit
  let activeWithdraw = params?.action === DefiAction.Withdraw
  return (
    <ButtonGroup variant='ghost' colorScheme='blue' px={6} pt={6}>
      <Button
        isActive={activeDeposit}
        onClick={() => handleClick(DefiAction.Deposit)}
        isDisabled={vaultExpired}
      >
        {translate('common.deposit')}
      </Button>
      <Button isActive={activeWithdraw} onClick={() => handleClick(DefiAction.Withdraw)}>
        {translate('common.withdraw')}
      </Button>
    </ButtonGroup>
  )
}
