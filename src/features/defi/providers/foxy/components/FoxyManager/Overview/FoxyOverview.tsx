import { Flex } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { Route, Switch, useLocation } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'

import { Claim } from './Claim/Claim'
import { FoxyDetails } from './FoxyDetails'

export const FoxyOverview = () => {
  const location = useLocation()

  return (
    <Flex width='full' minWidth={{ base: '100%', md: '500px' }} flexDir='column'>
      <Flex flexDir='column' width='full'>
        <AnimatePresence exitBeforeEnter initial={false}>
          <Switch location={location} key={location.key}>
            <Route exact path='/'>
              <SlideTransition>
                <FoxyDetails />
              </SlideTransition>
            </Route>
            <Route exact path='/claim' component={Claim} />
          </Switch>
        </AnimatePresence>
      </Flex>
    </Flex>
  )
}
