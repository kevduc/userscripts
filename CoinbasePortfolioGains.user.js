// ==UserScript==
// @name         Coinbase Portfolio Gains
// @version      1.4.3
// @description  Shows Coinbase portfolio gains
// @author       kevduc
// @namespace    https://kevduc.github.io/
// @homepageURL  https://github.com/kevduc/userscripts
// @downloadURL  https://raw.githubusercontent.com/kevduc/userscripts/master/CoinbasePortfolioGains.user.js
// @updateURL    https://raw.githubusercontent.com/kevduc/userscripts/master/CoinbasePortfolioGains.user.js
// @supportURL   https://github.com/kevduc/userscripts/issues
// @match        https://www.coinbase.com/*
// @grant        none
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=128&domain=coinbase.com
// ==/UserScript==

;(async function () {
  ;('use strict')

  // ----------------------------------------------------
  // ----------------- User Parameters ------------------
  // ----------------------------------------------------

  const totalInvestment = 0 // Change this to the total amount you invested (in your local currency)

  /**
   * gainsPosition is one of:
   * - 'centered': gains will be shown above the graph, horizontally centered
   * - 'near-balance': gains will be shown above the graph, next to the total balance (used by default if gainsPosition value is invalid)
   */
  const gainsPosition = 'centered' // Change this to the position you prefer ('centered', 'near-balance')

  // ----------------------------------------------------
  // ----------------- Helper functions -----------------
  // ----------------------------------------------------

  // Async tools

  const pause = (milli) => new Promise((resolve, reject) => setTimeout(resolve, milli))

  const waitForTruthy = async (func, milli = 200) => {
    let result
    while (!(result = await Promise.resolve(func()))) await pause(milli)
    return result
  }

  Document.prototype.querySelectorWhenLoaded = Element.prototype.querySelectorWhenLoaded = async function (query) {
    return await waitForTruthy(() => this.querySelector(query))
  }

  // Queries

  const coinbaseClassQuery = (className) => `[class*="${className}"]`
  const loadedQuery = '[data-element-handle*="step-loaded"]'
  const loadedActiveQuery = '[data-element-handle="step-loaded-active"]'
  const activeTransitionerQuery = `${coinbaseClassQuery('Transitioner__Container')} ${loadedActiveQuery}`
  const profitId = 'tampermonkey-profit'

  // Local Storage

  const getLocalStorageArray = (keyName) => {
    const string = localStorage.getItem(keyName)

    const arrayDefault = []
    let array

    try {
      array = JSON.parse(string) || []
    } catch (e) {
      console.warn(`Error parsing "${string}":\n${e}`)
      console.warn(`Cannot parse value of ${keyName} (local storage) as an array, defaulting to [${arrayDefault}].`)
      array = arrayDefault
    }

    return array
  }

  const setLocalStorageArray = (keyName, array) => localStorage.setItem(keyName, JSON.stringify(array))

  // Locale Support

  // From https://stackoverflow.com/a/42213804, credit to naitsirch
  const parseLocaleFloat = (string, locale) => {
    const thousandSeparator = (1111).toLocaleString(locale).replace(/\p{Number}/gu, '')
    const decimalSeparator = (1.1).toLocaleString(locale).replace(/\p{Number}/gu, '')

    return parseFloat(
      string.replace(new RegExp('\\' + thousandSeparator, 'g'), '').replace(new RegExp('\\' + decimalSeparator), '.')
    )
  }

  // ----------------------------------------------------
  // -------------------- Investment --------------------
  // ----------------------------------------------------

  class TotalInvestmentHistory {
    constructor() {}

    static getInstance() {
      if (!TotalInvestmentHistory.instance) {
        TotalInvestmentHistory.instance = new TotalInvestmentHistory()
        // Get the list of previous investments (empty array if none)
        TotalInvestmentHistory.instance.history = getLocalStorageArray('totalInvestmentHistory')
      }

      return TotalInvestmentHistory.instance
    }

    // Get the latest total investment value from the history (null if none)
    latest() {
      return this.history[0] || null
    }

    update(totalInvestment) {
      // Get the last investement value
      const lastTotalInvestment = this.latest()

      // Total investment value has changed
      if (totalInvestment !== 0 && totalInvestment !== lastTotalInvestment) {
        // Add the new value to the history
        this.history.unshift(totalInvestment)
        // Save the new history
        setLocalStorageArray('totalInvestmentHistory', this.history)
      }
    }
  }

  // Create/retrieve the investment history
  const totalInvestmentHistory = TotalInvestmentHistory.getInstance()

  // Update the history with the current investment value (user parameter specified at the top of this script)
  totalInvestmentHistory.update(totalInvestment)

  // Use the latest investment value (or 0 if none) for the profit calculation
  const invested = totalInvestmentHistory.latest() || 0

  // ----------------------------------------------------
  // --------------------- Balance ----------------------
  // ----------------------------------------------------

  const balanceValueRegex = /(?:[,\.]?\p{Number}+)+/gu

  const getBalanceValueStr = (balanceElement) => {
    const balanceText = balanceElement.innerText
    const balanceValueStr = balanceText.match(balanceValueRegex)
    if (balanceValueStr === null) throw new Error(`Cannot read balance value from ${balanceText}.`)
    return balanceValueStr[0]
  }

  const getBalanceValue = (balanceElement) => {
    const balanceValueStr = getBalanceValueStr(balanceElement)
    const balanceValue = parseLocaleFloat(balanceValueStr) // Not specifying locale (second argument) means we use the computer's default language
    if (isNaN(balanceValue)) throw new Error(`Cannot parse balance value "${balanceValueStr}" to a float.`)
    return balanceValue
  }

  let applyBalanceCurrencyTemplate = (value) => value // By default, return value unchanged

  const updateBalanceCurrencyTemplate = (balanceElement) => {
    applyBalanceCurrencyTemplate = (value) => balanceElement.innerText.replace(balanceValueRegex, `${value}`)
  }

  // ----------------------------------------------------
  // ---------------------- Profit ----------------------
  // ----------------------------------------------------

  const formatProfit = (profit) =>
    `${profit > 0 ? '' : '-'}${applyBalanceCurrencyTemplate(
      // Using undefined for locale (first argument) means we use the computer's default language
      Math.abs(profit).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    )}`

  const formatProfitPercent = (profitPercent) => `${profitPercent > 0 ? '+' : '-'}${Math.abs(profitPercent).toFixed(2)}%`

  const updateProfit = (profitElement, balanceValue) => {
    const profit = balanceValue - invested
    const profitPercent = (100 * profit) / invested
    const profitColor = profit > 0 ? 'green' : 'red'
    profitElement.style.color = profitColor
    profitElement.innerText = `${formatProfitPercent(profitPercent)} (${formatProfit(profit)})`
  }

  const createProfitElementFrom = (balanceElement, position) => {
    const profitElement = document.createElement('h2')
    profitElement.id = profitId
    profitElement.className = balanceElement.className
    profitElement.style = `display:inline-block; font-size:20px;`

    switch (position) {
      case 'centered': {
        const balanceContainer = balanceElement.closest(coinbaseClassQuery('Balance__Container'))
        balanceContainer.insertAdjacentElement('afterend', profitElement)
        break
      }
      default:
      case 'near-balance': {
        balanceElement.style.display = 'inline-block'
        balanceElement.insertAdjacentElement('afterend', profitElement)
        break
      }
    }

    return profitElement
  }

  // ----------------------------------------------------
  // -------------------- Initialize --------------------
  // ----------------------------------------------------

  function initialize() {
    const chartSection =
      document.querySelector(`${coinbaseClassQuery('DashboardContent__PortfolioChartSection')} ${activeTransitionerQuery}`) ||
      document.querySelector(`${coinbaseClassQuery('PortfolioContent__PortfolioChartContainer')} ${activeTransitionerQuery}`)
    if (chartSection === null) return

    let balanceElement = chartSection.querySelector(coinbaseClassQuery('Balance__BalanceHeader'))
    if (balanceElement === null) return

    const balanceTextNode = balanceElement.firstChild
    if (balanceTextNode === null) return

    if (document.querySelector(`#${profitId}`) !== null) return // profit element already exists
    const profitElement = createProfitElementFrom(balanceElement, gainsPosition)

    updateBalanceCurrencyTemplate(balanceElement)

    // Update the profit when hovering over the chart area to match portfolio value.
    /* Note: No need to call disconnect() for previously created MutationObserver objects because:
     * https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/disconnect#usage_notes
     * "If the element being observed is removed from the DOM, and then subsequently released by the browser's
     *  garbage collection mechanism, the MutationObserver is likewise deleted." */
    const update = () => updateProfit(profitElement, getBalanceValue(balanceElement))
    const balanceObserver = new MutationObserver(() => update())
    balanceObserver.observe(balanceTextNode, { characterData: true })

    update()
  }

  // Try to re-initialize the profit element if needed when the page content changes
  const contentObserver = new MutationObserver(() => initialize())

  const content = await document.querySelectorWhenLoaded(
    `${coinbaseClassQuery('LayoutDesktop__StyledContent')}  ${activeTransitionerQuery}`
  )

  // Watch the page content for any tree modification (=> potentially need to re-initialize the profit element if switching to Home or Portfolio main pages)
  contentObserver.observe(content, { childList: true, subtree: true })

  initialize()
})()
