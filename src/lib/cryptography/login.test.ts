import { getPasswordHash } from './login'
describe('login-hash', () => {
  it('should fail on getPasswordHash without email', () => {
    const email = ''
    const password = 'testing123*'

    expect(() => getPasswordHash(email, password)).toThrow(
      'An email and password are required to hash the password.',
    )
  })
  it('should fail on getPasswordHash without password', () => {
    const email = 'test@test.com'
    const password = ''

    expect(() => getPasswordHash(email, password)).toThrow(
      'An email and password are required to hash the password.',
    )
  })
  it('should properly hash 1', () => {
    const email = 'test@test.com'
    const password = 'testing123*'
    const hashedPassword = getPasswordHash(email, password)
    expect(hashedPassword).toEqual('Yw62y1Orvg+w8WpQWYFxXqlnSBvjniyE3QrJ/4kuD1Y=')
  })

  it('should properly hash 2', () => {
    const email = 'test@test.com'
    const password = 'testing123!'
    const hashedPassword = getPasswordHash(email, password)
    expect(hashedPassword).toEqual('QVRYmZQOQeP/9i3iDRughSSdWNh8/QkHMPZ6Sk7DRXI=')
  })

  it('should properly hash 3', () => {
    const email = 'test1@test.com'
    const password = 'testing123!'
    const hashedPassword = getPasswordHash(email, password)
    expect(hashedPassword).toEqual('Yidoq/7aHI+XrMOTDel0itxywDzbWgrHK/+/Mix9YQE=')
  })
})
