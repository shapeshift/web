describe('Objects Testing Examples', () => {
    it('Should Load Books website',()=>{
        cy.visit('http://books.toscrape.com/index.html', {timeout : 10000})
        cy.url().should('include', 'index.html')
        cy.log('Website Loaded!')
    })

    it('Should click on Travel category', () => {
        cy.get('a').contains('Travel').click()
        cy.get('h1').contains('Travel')
    })

    it('Validate Count of Elements', () => {
        cy.get('.product_pod').its('length').should('eq',11)
    })

    it('Refresh & Reload Page', () => {
        cy.log('Before Reload')
        cy.reload()
        cy.log('After Reload')
    })
})
