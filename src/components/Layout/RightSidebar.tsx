import { Rail } from 'components/Layout/Rail'

export const RightSidebar: React.FC = ({ children }) => {
  return <Rail minWidth={{ base: 'auto', lg: '420px' }}>{children}</Rail>
}
