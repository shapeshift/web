import { Button, useMediaQuery } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { BuySellIcon } from 'components/Icons/Buysell'
import { Text } from 'components/Text'

import { MainNavLink } from './MainNavLink'

export const BuySellHeader = () => {
  const [isLargerThan765] = useMediaQuery('(min-width: 765px)')
  const translate = useTranslate()

  return (
    <>
      {isLargerThan765 && (
        <>
          <Button
            variant='ghost'
            onClick={() => {}}
            isActive={true}
            justifyContent='flex-start'
            _focus={{
              shadow: 'outline-inset'
            }}
            p={'25px'}
          >
            <MainNavLink
              icon={<BuySellIcon color='inherit' />}
              href={'/buysell'}
              to={'/buysell'}
              label={translate('buysell.page.routeTitle')}
              aria-label={translate('buysell.page.routeTitle')}
              data-test={`navbar-${'buysell.page.routeTitle'.split('.')[1]}-button`}
            />
            <Text translation='buysell.page.headerLabel' fontSize={'small'} />
          </Button>
        </>
      )}
      {!isLargerThan765 && (
        <>
          <MainNavLink
            icon={<BuySellIcon color='inherit' />}
            href={'/buysell'}
            to={'/buysell'}
            label={translate('buysell.page.routeTitle')}
            aria-label={translate('buysell.page.routeTitle')}
            data-test={`navbar-${'buysell.page.routeTitle'.split('.')[1]}-button`}
          />
        </>
      )}
    </>
  )
}
