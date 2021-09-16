// ==UserScript==
// @name         NetflixVideoSpeedControl
// @version      1.0
// @description  Add speed control to Netflix
// @author       kevduc
// @namespace    https://kevduc.github.io/
// @homepageURL  https://github.com/kevduc/userscripts
// @downloadURL  https://raw.githubusercontent.com/kevduc/userscripts/master/NetflixVideoSpeedControl.user.js
// @updateURL    https://raw.githubusercontent.com/kevduc/userscripts/master/NetflixVideoSpeedControl.user.js
// @supportURL   https://github.com/kevduc/userscripts/issues
// @include      https://www.netflix.com/watch/*
// @grant        none
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=128&domain=netflix.com
// ==/UserScript==

;(function () {
  'use strict'

  addSpeedControl()

  function addSpeedControl() {
    // Get the video
    const video = document.querySelector('video')
    // Get a toolbar button (e.g. "Report a problem")
    const reportAProblemDiv = document.querySelector('.ReportAProblemPopupContainer')

    // Check if the video and the button are on the page yet
    if (video === null || reportAProblemDiv === null) {
      // If not, wait a bit before retrying
      window.setTimeout(addSpeedControl, 500)
      return
    }

    // Clone the toolbar button
    const videoSpeedDiv = reportAProblemDiv.insertAdjacentElement('afterend', reportAProblemDiv.cloneNode(true))

    // Fix: Prevent propagation of mouseup event (because the document mouseup event handler is annoying and closes the dropdown)
    videoSpeedDiv.addEventListener('mouseup', (event) => event.stopPropagation())

    // Change the description and icon of the buttton
    const button = videoSpeedDiv.querySelector('button')
    button.ariaLabel = 'Control the video speed'
    button.innerHTML = `<img src="https://fonts.gstatic.com/s/i/materialicons/speed/v6/24px.svg" class="svg-icon" style="filter: invert(1);">`

    // Change the popup content
    const contentWrapperDiv = videoSpeedDiv.querySelector('.popup-content-wrapper')
    contentWrapperDiv.innerHTML = `
      <div class="ReportAProblem--popup popup-content" style="cursor: auto">
        <span class="ReportAProblem--popup-text">
          <span id="video-speed-popup-span">
          </span>
        </span>
      </div>`
    const spanPopup = contentWrapperDiv.querySelector('#video-speed-popup-span')

    // Create the speed selection dropdown
    const select = document.createElement('select')
    select.style = 'background-color: #262626; cursor: pointer; border: none'

    const options = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((value) => {
      let option = document.createElement('option')
      option.innerText = value === 1 ? 'Normal' : value
      option.value = value
      if (value == video.playbackRate) option.selected = true
      return option
    })

    options.forEach((option) => select.appendChild(option))

    // Update the video playback speed when the speed selection dropdown is used
    select.addEventListener('change', (event) => (video.playbackRate = parseFloat(event.target.value)))

    // Add the speed selection dropdown to the popup
    spanPopup.appendChild(select)

    // Show the popup when the mouse enters the button
    videoSpeedDiv.addEventListener('mouseenter', (event) => {
      const button = videoSpeedDiv.querySelector('button')
      button.classList.add('PlayerControls--control-element--active')

      const contentWrapperDiv = videoSpeedDiv.querySelector('.popup-content-wrapper')
      contentWrapperDiv.classList.add('active')
    })

    // Hide the popup when the mouse leaves the popup and the button
    videoSpeedDiv.addEventListener('mouseleave', (event) => {
      const button = videoSpeedDiv.querySelector('button')
      button.classList.remove('PlayerControls--control-element--active')

      const contentWrapperDiv = videoSpeedDiv.querySelector('.popup-content-wrapper')
      contentWrapperDiv.classList.remove('active')
    })
  }
})()
