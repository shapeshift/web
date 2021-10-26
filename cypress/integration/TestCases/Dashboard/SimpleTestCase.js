describe('Simple Testing Examples', () => {
    it('Should Load Correct URL',()=>{
        cy.visit('http://example.com')
    })

    it('Should check Correct URL',()=>{
        cy.url().should('include', 'example.com')
    })

    it('Should check for current element on the page',()=>{
        cy.get('h1').should('be.visible')
    })

    it('Should check for current element on the page',()=>{
        cy.get('h1').should('be.visible')
    })

    it('Should wait for 3 Seconds',()=>{
        cy.wait(3000)
    })

    it('Should Pause the execution',()=>{
        //cy.pause()
    })


})
