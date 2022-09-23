import { AnimatePresence } from 'framer-motion'

import { Manager } from './views/Manager'

export const FiatRampsRouter = () => {
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Manager />
    </AnimatePresence>
  )
}
