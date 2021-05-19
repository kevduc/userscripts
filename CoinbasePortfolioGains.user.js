// ==UserScript==
// @name         Coinbase Portfolio Gains
// @version      1.2.1
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

;(function () {
  'use strict'

  // User editable

  const totalInvestment = 0 // Change this to the total amount you invested (in your local currency)

  // ----------------------------------------------------
  // ----------------- Helper functions -----------------
  // ----------------------------------------------------

  // Async tools

  const pause = (milli) => new Promise((resolve, reject) => setTimeout(resolve, milli))

  const waitForTruthy = async (func, milli = 200) => {
    let result
    while (!(result = func())) await pause(milli)
    return result
  }

  document.querySelectorWhenLoaded = async (query) => await waitForTruthy(() => document.querySelector(query))

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

  const totalInvestmentHistory = TotalInvestmentHistory.getInstance()
  totalInvestmentHistory.update(totalInvestment)

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
    const balanceValue = parseLocaleFloat(balanceValueStr) // undefined locale means use computer default
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
      // undefined locale means use computer default
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

  const createProfitElement = (balanceElement) => {
    const profitElement = document.createElement('h2')
    profitElement.className = balanceElement.className
    profitElement.style = `display:inline-block; font-size:20px`

    balanceElement.style.display = 'inline-block'
    balanceElement.insertAdjacentElement('afterend', profitElement)

    return profitElement
  }

  // ----------------------------------------------------
  // -------------------- Initialize --------------------
  // ----------------------------------------------------

  async function init() {
    const balanceElement = await document.querySelectorWhenLoaded('h1[class*="Balance__BalanceHeader"]')
    const balanceTextNode = balanceElement.firstChild

    updateBalanceCurrencyTemplate(balanceElement)

    const profitElement = createProfitElement(balanceElement)

    const update = () => updateProfit(profitElement, getBalanceValue(balanceElement))
    const observer = new MutationObserver(update)
    observer.observe(balanceTextNode, { characterData: true })

    update()
  }

  init()
})()
