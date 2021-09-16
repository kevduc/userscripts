// ==UserScript==
// @name         Read chess.com lesson messages
// @version      1.0
// @description  Add text-to-speech to chess.com messages in lessons
// @author       kevduc
// @namespace    https://kevduc.github.io/
// @homepageURL  https://github.com/kevduc/userscripts
// @downloadURL  https://github.com/kevduc/userscripts/raw/master/T2Schess.comLessonMessages.user.js
// @updateURL    https://github.com/kevduc/userscripts/raw/master/T2Schess.comLessonMessages.user.js
// @supportURL   https://github.com/kevduc/userscripts/issues
// @include      https://www.chess.com/lessons/*
// @grant        none
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=128&domain=chess.com
// ==/UserScript==

;(function () {
  'use strict'

  const sidebar = document.querySelector('.challenge-question-v5-component')

  const T2S_div = document.createElement('div')
  T2S_div.style.margin = '1.2rem 1.3rem 0 1.5rem'
  T2S_div.style.textAlign = 'right'

  const label = document.createElement('label')
  label.for = 'T2S'
  label.innerText = 'Autoplay messages'

  const toggle = document.createElement('input')
  toggle.id = 'T2S'
  toggle.style = 'margin-left: .7rem; vertical-align: bottom'
  toggle.type = 'checkbox'

  let T2SOn = localStorage.getItem('T2SOn')
  if (T2SOn === null) {
    T2SOn = true
    localStorage.setItem('T2SOn', T2SOn)
  } else {
    T2SOn = T2SOn === 'true'
  }

  toggle.checked = T2SOn

  toggle.addEventListener('click', () => {
    T2SOn = toggle.checked
    // if (!T2SOn) speechSynthesis.cancel();
    if (T2SOn) readAll()
    localStorage.setItem('T2SOn', T2SOn)
    // showAllPlayButtons(T2SOn)
  })

  label.appendChild(toggle)
  T2S_div.appendChild(label)
  T2S_div.style.display = 'none'
  sidebar.insertAdjacentElement('afterbegin', T2S_div)

  let allText = new Map()

  window.addEventListener('unload', function (event) {
    speechSynthesis.cancel()
  })

  let chosenVoice
  function getVoices() {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) {
      window.setTimeout(getVoices, 500)
      return
    }
    chosenVoice = voices.find((voice) => voice.name === 'Google US English') // my personal preference, even tho the coach's avatar is a man
    if (!chosenVoice) chosenVoice = voices.find((voice) => voice.lang === 'en-US' && voice.name.includes('Male'))
    if (!chosenVoice) chosenVoice = voices.find((voice) => voice.lang === 'en-US')
    if (!chosenVoice) chosenVoice = voices.find((voice) => voice.lang.startsWith('en-'))
  }
  getVoices()

  function play(text, playbutton) {
    const msg = new SpeechSynthesisUtterance()
    msg.voice = chosenVoice
    //msg.volume = 1; // From 0 to 1
    msg.rate = 1.1 // From 0.1 to 10
    msg.pitch = 0 // From 0 to 2
    msg.text = text

    const icon = playbutton.querySelector('.secondary-actions-v5-icon')
    msg.addEventListener('start', () => {
      icon.classList.add('square')
      icon.classList.remove('play')
    })
    msg.addEventListener('end', () => {
      icon.classList.add('play')
      icon.classList.remove('square')
    })

    speechSynthesis.speak(msg)
  }

  let allPlayButtons = []

  function showAllPlayButtons(show) {
    allPlayButtons.forEach((button) => (button.style.display = show ? 'block' : 'none'))
  }

  function addPlayTextButton(commentDiv) {
    const playIcon = document.createElement('span')
    playIcon.className = 'icon-font-chess play secondary-actions-v5-icon secondary-actions-v5-link'

    const playButton = document.createElement('button')
    playButton.className = 'secondary-actions-v5-action'
    playButton.name = 'play-button'
    playButton.style = 'position: absolute; top: .6rem; right: .6rem'
    const callback = function () {
      const icon = this.querySelector('.secondary-actions-v5-icon')
      const shouldPlay = icon.classList.contains('play')
      speechSynthesis.cancel()
      if (shouldPlay) {
        play(commentDiv.innerText, this)
      }
    }
    playButton.addEventListener('click', callback)

    playButton.appendChild(playIcon)
    // playButton.style.display = T2SOn ? "block" : "none";
    allPlayButtons.push(playButton)
    commentDiv.appendChild(playButton)
  }

  const videoComment = document.querySelector('.video-details-v5-component')
  videoComment.style.paddingRight = '4rem'
  addPlayTextButton(videoComment)

  function processComment(commentDiv, first) {
    if (!commentDiv.dataset.processed) {
      commentDiv.dataset.processed = true
      const title =
        commentDiv.querySelector('.question-feedback-v5-label') || commentDiv.querySelector('.question-feedback-text-v5-header')
      if (title) {
        const span = document.createElement('span')
        span.innerText = '.'
        span.style.fontSize = 0
        title.appendChild(span)
      }
      addPlayTextButton(commentDiv)
    }
    if (!T2SOn) return false
    const playButton = commentDiv.querySelector('[name=play-button]')
    if (!commentDiv.dataset.read) {
      const text = commentDiv.innerText
      allText.set(commentDiv, text)
      commentDiv.dataset.read = true
      if (first) speechSynthesis.cancel()
      play(text, playButton)
      return true
    } else {
      const oldText = allText.get(commentDiv)
      const text = commentDiv.innerText
      if (oldText !== text) {
        allText.set(commentDiv, text)
        if (T2SOn) {
          if (first) speechSynthesis.cancel()
          play(text, playButton)
        }
        return true
      }
    }
    return false
  }

  const targetNode = document.querySelector('.challenge-question-v5-details')

  function readAll() {
    const divs = targetNode.querySelectorAll('.question-feedback-v5-comment')
    let first = true
    divs.forEach((div) => {
      first = !processComment(div, first)
    })
  }

  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: true, characterData: true }

  // Callback function to execute when mutations are observed
  const callback = function (mutationsList, observer) {
    let first = true

    mutationsList.forEach((m) => {
      if (m.type === 'childList') {
        m.addedNodes.forEach((node) => {
          let divs = []
          if (m.target.classList.contains('question-feedback-v5-label') && node.nodeType === Node.TEXT_NODE) {
            divs.push(m.target.closest('.question-feedback-v5-comment'))
          }
          if (node.nodeType === Node.ELEMENT_NODE) {
            const label = node.querySelector('.question-feedback-v5-label')
            if (label && label.innerText === '') {
              return
            }
            if (node.classList.contains('question-feedback-v5-comment')) divs.push(node)
            divs = divs.concat(...node.querySelectorAll('.question-feedback-v5-comment'))
          }
          divs.forEach((div) => {
            first = !processComment(div, first)
          })
        })
      } else if (m.type === 'characterData') {
        const div = m.target.parentElement.closest('.question-feedback-v5-comment')
        if (div) first = !processComment(div, first)
      }
    })

    if (targetNode.querySelectorAll('.question-feedback-v5-comment').length === 0) {
      speechSynthesis.cancel()
      T2S_div.style.display = 'none'
      allPlayButtons = []
      allText = new Map()
    } else {
      T2S_div.style.display = 'block'
    }
  }

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback)

  // Start observing the target node for configured mutations
  observer.observe(targetNode, config)

  readAll()
})()
