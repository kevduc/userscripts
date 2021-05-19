// ==UserScript==
// @name         Seedrs Portfolio Gains
// @version      1.0.0
// @author       kevduc
// @namespace    https://kevduc.github.io/
// @homepageURL  https://github.com/kevduc/userscripts
// @downloadURL  https://github.com/kevduc/userscripts/raw/master/SeedrsPortfolio.user.js
// @updateURL    https://github.com/kevduc/userscripts/raw/master/SeedrsPortfolio.user.js
// @supportURL   https://github.com/kevduc/userscripts/issues
// @include      https://www.seedrs.com/portfolio*
// @grant        none
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=128&domain=seedrs.com
// ==/UserScript==

;(function () {
  function fsign(sign, positiveVal, negativeVal, neutralVal) {
    return sign > 0 ? positiveVal : sign < 0 ? negativeVal : neutralVal
  }

  const FloatRE = /(?:\d+,)?\d+(?:.\d+)?/
  const MatchIndex = 0

  function getFloat(str) {
    return Number.parseFloat(str.match(FloatRE)[MatchIndex].replace(',', ''))
  }

  function showPerformance() {
    document.querySelectorAll('.summary-details-cells-container').forEach((cell) => {
      let investmentAmountCell = cell.querySelector('.summary-column-investment-amount')
      let sharesCell = cell.querySelector('.summary-column-shares')
      let currentSharePriceCell = cell.querySelector('.summary-column-current-share-price')
      let currency

      let investmentAmountText = investmentAmountCell.innerText
      let investmentAmount = getFloat(investmentAmountText)
      if (isNaN(investmentAmount)) {
        console.debug('investmentAmount is NaN!', investmentAmountCell)
        return
      } else currency = investmentAmountText[0]

      let sharesSpan = sharesCell.firstElementChild
      if (sharesSpan === null) {
        console.debug('sharesSpan is null!', sharesCell)
        return
      }
      let shares = getFloat(sharesSpan.title)
      if (isNaN(shares)) {
        console.debug('shares is NaN!', sharesSpan)
        return
      }

      let currentSharePriceSpan = currentSharePriceCell.firstElementChild
      if (currentSharePriceSpan === null) {
        console.debug('currentSharePriceSpan is null!', currentSharePriceCell)
        return
      }
      let currentSharePriceText = currentSharePriceSpan.title
      let currentSharePrice = getFloat(currentSharePriceText)
      if (isNaN(currentSharePrice)) {
        console.debug('currentSharePrice is NaN!', currentSharePriceSpan)
        return
      } else currency = currentSharePriceText[0]

      // Compute
      let currentValue = shares * currentSharePrice
      let profit = currentValue - investmentAmount
      profit = Math.round(100 * profit) / 100
      let error = shares * 0.005
      let profitSign = profit > error ? +1 : profit < -error ? -1 : 0

      // Display
      let div = investmentAmountCell
      div.style.whiteSpace = 'nowrap'

      let arrowHTML = `<span style="
        color: ${fsign(profitSign, 'limegreen', 'red', 'inherit')};
        font-weight: ${fsign(profitSign, 'bold', 'bold', 'inherit')};
      ">
        ${fsign(profitSign, '&nearr;', '&searr;', profit == 0 ? '&rarr;' : '~')}
      </span>`

      let currentValueHTML = `<span style="
        font-weight: ${fsign(profitSign, 'bold', 'bold', 'inherit')};
      ">
        ${currency}${currentValue.toFixed(2)}
      </span>`

      let profitHTML = `<span style="
        color: ${fsign(profitSign, 'limegreen', 'red', 'inherit')};
      ">
        ${fsign(profitSign, '+', '-', profit == 0 ? '' : '~')}${currency}${Math.abs(profit).toFixed(2)}
      </span>`

      div.insertAdjacentHTML('beforeend', arrowHTML + '&nbsp;' + currentValueHTML + '&nbsp;(' + profitHTML + ')')
    })
  }

  let portfolioBusinessList = document.querySelector('#portfolio-business-list')
  function connectObserver() {
    observer.observe(portfolioBusinessList, { attributes: false, childList: true, subtree: true })
  }
  let observer = new MutationObserver(function () {
    observer.disconnect()
    showPerformance()
    connectObserver()
  })

  showPerformance()
  connectObserver()
})()
