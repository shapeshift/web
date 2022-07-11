import { Button, ButtonGroup, ButtonProps } from '@chakra-ui/react'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useTranslate } from 'react-polyglot'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

type DefiButtonProps = {
  label: string
  icon: JSX.Element
  action: DefiAction
} & ButtonProps
export type DefiActionButtonProps = {
  menu: DefiButtonProps[]
}

export const DefiActionButtons = ({ menu }: DefiActionButtonProps) => {
  const translate = useTranslate()
  const { history, query, location } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const handleClick = (action: DefiAction) => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: action,
      }),
    })
  }

  return (
    <ButtonGroup width='full'>
      {menu.map(({ action, icon, label, ...rest }) => (
        <Button
          width='full'
          key={action}
          onClick={() => handleClick(action)}
          leftIcon={icon}
          {...rest}
        >
          {translate(label)}
        </Button>
      ))}
    </ButtonGroup>
  )
}
