describe('Login Testing Examples', () => {


    it('Should Load Login Page',()=>{
        cy.visit('http://zero.webappsecurity.com/login.html')
        cy.clearCookies({log:true})
        cy.clearLocalStorage('you item',{log:true})
    })

    it('Should fill username',()=>{
        cy.get('#user_login').as('username')
        cy.get('@username').clear()
        cy.get('@username').type('Something', {delay:50})
    })

    it('Should fill password',()=>{
        cy.get('#user_password').clear()
        cy.get('#user_password').type('password', {delay:50})
    })

    it('Should submit login form',()=>{
        cy.contains('Sign in').click()
    })

    it('Should mark checkbox',()=>{
        cy.get('input[type="checkbox"]').click()
    })

    it('Should display error message',()=>{
        cy.get('.alert-error').should('be.visible').and('contain','Login and/or password are wrong.')
    })

})
