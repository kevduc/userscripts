// ==UserScript==
// @name         Coinbase Portfolio Gains
// @version      1.0
// @description  Shows Coinbase portfolio gains
// @author       KevDuc
// @namespace    https://kevduc.github.io/
// @homepageURL  https://github.com/kevduc/userscripts
// @downloadURL  https://raw.githubusercontent.com/kevduc/userscripts/master/CoinbasePortfolioGains.user.js
// @updateURL    https://raw.githubusercontent.com/kevduc/userscripts/master/CoinbasePortfolioGains.user.js
// @supportURL   https://github.com/kevduc/userscripts/issues
// @match        https://www.coinbase.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const totalInvestment = 0; // Change this to the total amount you invested (in your local currency)

    // Helper functions
    const pause = (milli) => new Promise((resolve, reject) => setTimeout(resolve, milli));

    const waitForTruthy = async (func, milli = 200) => {
        let result;
        while(!(result = func())) await pause(milli);
        return result;
    }

    document.querySelectorWhenLoaded = async (query) => await waitForTruthy(() => document.querySelector(query));

    // -------------------------

    let invested = localStorage.getItem('invested');

    if (invested === null || totalInvestment !== 0 && invested !== totalInvestment) {
        invested = totalInvestment;
        localStorage.setItem('invested', invested);
    }

    function updateROI(balance, roi) {
        const value = parseFloat(balance.innerText.replace(/[$€£,]/g,''));
        const profit = value - invested;
        roi.style.color = profit > 0 ? 'green' : 'red';
        roi.innerText = `${profit > 0 ? '+' : '-'}£${Math.abs(profit).toFixed(2)} (${(100*profit/invested).toFixed(2)}%)`;
    }

    async function init() {
        const balance = await document.querySelectorWhenLoaded('h1[class*="Balance__BalanceHeader"]');

        const roi = document.createElement('h1');
        roi.className = balance.className;
        roi.style = `display:inline-block; font-size:x-large`;
        roi.id = "balanceROI-tampermonkey";

        balance.style.display = 'inline-block';
        balance.insertAdjacentElement('afterend', roi);

        const balanceTextNode = balance.firstChild;

        const update = () => updateROI(balance, roi);
        const observer = new MutationObserver(update);
        observer.observe(balanceTextNode, { characterData: true });

        update();
    }

    init();
})();
