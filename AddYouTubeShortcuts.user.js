// ==UserScript==
// @name         AddYouTubeShortcuts
// @version      1.0
// @description  Add YouTube keyboard shortcuts to any video
// @author       kevduc
// @namespace    https://kevduc.github.io/
// @homepageURL  https://github.com/kevduc/userscripts
// @downloadURL  https://raw.githubusercontent.com/kevduc/userscripts/master/AddYouTubeShortcuts.user.js
// @updateURL    https://raw.githubusercontent.com/kevduc/userscripts/master/AddYouTubeShortcuts.user.js
// @supportURL   https://github.com/kevduc/userscripts/issues
// @include      *
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const stack = document.createElement('div');
    stack.style = `
        position: fixed;
        bottom: 0;
        right: 0;
        padding: 0.5rem;
    `;
    document.body.appendChild(stack);

    const notify = (message, timeout) => {
        const transitionDelay = 500;
        const div = document.createElement('div');
        div.style = `
            background-color: #222;
            border: 2px solid #ddd;
            padding: 0.5rem;
            font-size: smaller;
            font-family: sans-serif;
            color: #ddd;
            margin: 0.5rem 0 0 auto;
            min-width: 7ch;
            width: fit-content;
            border-radius: 0.5rem;
            opacity: 1;
            transition: opacity ${transitionDelay}ms ease-in;
            text-align: center;
        `;
        div.innerText = message;
        stack.appendChild(div);
        setTimeout(() => {
            div.style.opacity = "0";
            setTimeout(() => div.remove(), transitionDelay);
        }, timeout);
    }


    const closestSibling = (element, query) => {
        const parent = element.parentElement;
        if (parent === null) return null;
        const sibling = parent.querySelector(query);
        if (sibling != null) return sibling;
        return closestSibling(parent, query);
    }

    document.addEventListener("keydown", (e) => {
        const video = closestSibling(document.activeElement, "video");
        const notifySpeed = () => notify(`${video.playbackRate}x`, 1500)

        switch(e.key) {
            case ">": { video.playbackRate += 0.25; notifySpeed(); break; }
            case "<": { video.playbackRate -= 0.25; notifySpeed(); break; }
            default: break;
        }

    })
})();