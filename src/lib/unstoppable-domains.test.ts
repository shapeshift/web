import { resolveUnstoppableDomain } from './unstoppable-domains'

const mockAddr = jest.fn()
jest.mock('@unstoppabledomains/resolution', () => {
  return function () {
    return {
      addr: mockAddr,
    }
  }
})

describe('resolveUnstoppableDomain', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('can resolve domain to address', async () => {
    const domain = 'unstoppable.eth'
    const expectedAddress = '0x123'
    mockAddr.mockResolvedValue(expectedAddress)
    const address = await resolveUnstoppableDomain({ domain })
    expect(address).toBe(expectedAddress)
  })

  it('can return empty string for unresolveable address', async () => {
    const domain = 'foo'
    mockAddr.mockResolvedValueOnce('')
    const address = await resolveUnstoppableDomain({ domain })
    expect(address).toBe('')
  })

  it('can log and return return empty string on error', async () => {
    const domain = 'shouldresolvebutwont.eth'
    const errMessage = 'this is bad'
    mockAddr.mockRejectedValueOnce(errMessage)
    const address = await resolveUnstoppableDomain({ domain })
    expect(address).toBe('')
    expect(console.error).toHaveBeenCalled()
  })
})
