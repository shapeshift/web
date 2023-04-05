import { Button } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'

type DashboardTabProps = {
  icon: ReactNode
  label: string
  fiatValue: string
  path: string
  color: string
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ label, path, color = 'green.500' }) => {
  const history = useHistory()
  const location = useLocation()
  const translate = useTranslate()
  const handleClick = useCallback(() => {
    history.push(path)
  }, [history, path])

  const isActive = useMemo(() => path === location.pathname, [location.pathname, path])

  return (
    <Button
      variant='tab'
      onClick={handleClick}
      isActive={isActive}
      _active={{ color, borderColor: color }}
      _hover={{ color, borderColor: color }}
    >
      {translate(label)}
    </Button>
  )
}
