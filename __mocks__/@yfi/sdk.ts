const sdk = jest.createMockFromModule('@yfi/sdk')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Yearn = jest.fn().mockImplementation(() => ({ ...(sdk as any).Yearn }))

export { Yearn }
