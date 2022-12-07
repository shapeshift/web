import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, Stack, Tooltip } from '@chakra-ui/react'
import type {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

export type DefiButtonProps = {
  label: string
  icon: JSX.Element
  action: DefiAction
  toolTip?: string
} & ButtonProps

export type DefiActionButtonProps = {
  menu: DefiButtonProps[]
}

export const DefiActionButtons: React.FC<DefiActionButtonProps> = ({ menu }) => {
  const translate = useTranslate()
  const { history, query, location } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const handleClick = useCallback(
    (action: DefiAction) => {
      return history.push({
        pathname: location.pathname,
        search: qs.stringify({
          ...query,
          modal: action,
        }),
      })
    },
    [history, location.pathname, query],
  )

  const renderMenu = useMemo(() => {
    return menu.map(({ action, icon, label, toolTip, isDisabled, ...rest }) => (
      <Tooltip key={action} label={toolTip} isDisabled={!isDisabled} hasArrow>
        <Box width='full'>
          <Button
            width='full'
            onClick={() => handleClick(action)}
            leftIcon={icon}
            isDisabled={isDisabled}
            {...rest}
          >
            {translate(label)}
          </Button>
        </Box>
      </Tooltip>
    ))
  }, [handleClick, menu, translate])

  return (
    <Stack width='full' direction={{ base: 'column', md: 'row' }}>
      {renderMenu}
    </Stack>
  )
}
