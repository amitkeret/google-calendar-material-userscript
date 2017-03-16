// ==UserScript==
// @name         Google calendar Material design
// @version      0.1.0
// @description
// @author       amitkeret
// @match        https://calendar.google.com/calendar/*
// @updateURL    https://raw.githubusercontent.com/amitkeret/google-calendar-material-userscript/master/calendarMaterial.js
// @resource     calendarCSS       https://raw.githubusercontent.com/amitkeret/google-calendar-material-userscript/master/calendarMaterial.css
// @resource     calendarFlairData https://raw.githubusercontent.com/amitkeret/google-calendar-material-userscript/master/calendarFlairData.json
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const baseURL = 'https://raw.githubusercontent.com/amitkeret/google-calendar-material-userscript/master/';

    GM_addStyle(GM_getResourceText('calendarCSS'));
    const calendarFlairData = JSON.parse(GM_getResourceText('calendarFlairData')).calendarFlairData;

    function globalchanges() {
        let goog = document.querySelector('.gb_3b .gb_5b'),
            logo = goog.cloneNode(true);
        logo.id = 'app-logo';
        goog.parentNode.appendChild(logo);
    }

    function applyBg(element, background) {
        element.style.backgroundImage = background;
        element.style.backgroundColor = '#CCC';
        element.style.backgroundBlendMode = 'multiply';
        element.classList.add('flair');
        element.parentNode.classList.add('flair');
    }

    function getBgURL(type, param) {
        let baseImgURL = 'url(' + baseURL + 'images/';
        if ('flair' === type) return baseImgURL + 'flairs/img_' + param + '.jpg)';
        else return baseImgURL + 'months/' + param + '.jpg)';
    }

    function checkForFlair(text, element) {
        let flair = false,
            compareFunction = function(el) { return text.toLowerCase().indexOf(el) !== -1; };
        for (var eventFlairItem in calendarFlairData) {
            if (!flair && calendarFlairData[eventFlairItem].filter(compareFunction).length) {
                flair = eventFlairItem;
            }
        }
        if (false !== flair) applyBg(element, getBgURL('flair', flair));
    }

    function changeGlobalBg() {
        let month = new Date(document.querySelector('.date-top').innerText.split('–')[0].trim());
        if (undefined === month) month = 0;
        else month = month.getMonth();
        document.getElementById('vr-nav').style.backgroundImage = getBgURL('month', month);
    }

    function agendaView() {
        // detect we're in agenda view
        let events = document.querySelectorAll('.lv-row');
        if (events.length > 0) {
            events.forEach(function(event){
                // skip events already styled by the script
                if (event.dataset.styled) return;
                let eventTitle = event.querySelector('.lv-event-title-line');
                eventTitle.style.backgroundColor = eventTitle.querySelector('span').style.color;
                eventTitle.style.borderBottom = '2px solid ' + eventTitle.style.backgroundColor;
                let eventTime = event.querySelector('.lv-event-time').innerText;
                if (eventTime.toLowerCase() !== 'all day') {
                    let span2 = document.createElement('span');
                    span2.classList.add('.lv-event-description');
                    span2.innerText = eventTime;
                    eventTitle.appendChild(span2);
                }
                checkForFlair(eventTitle.innerText, eventTitle);
                event.dataset.styled = 1;
            });
        }
    }

    function singleEventView() {
        let event = document.querySelector('.ep');
        if (null !== event) {
            var bgimg = document.createElement('div');
            bgimg.id = 'ep-bgimg';
            event.appendChild(bgimg);
            checkForFlair(document.querySelector('.ep-title input').value, bgimg);
        }
    }

    function gridMutationFunc() {
        changeGlobalBg();
        agendaView();
    }

    function coverInnerMutationFunc() {
        singleEventView();
    }

    function clickListener() {
        setTimeout(function() {
            var bubbleEvent = document.querySelector('.bubblemain');
            if (null === bubbleEvent) return;
            checkForFlair(bubbleEvent.innerText.split('\n')[0].trim(), bubbleEvent);
        }, 1);
    }

    globalchanges();

    var grid = document.getElementById('gridcontainer');
    var cover = document.getElementById('coverinner');

    var observer1 = new MutationObserver(gridMutationFunc);
    var observer2 = new MutationObserver(coverInnerMutationFunc);
    var config = { attributes: true, childList: true, characterData: true };
    observer1.observe(grid, config);
    observer2.observe(cover, config);

    grid.addEventListener('click', clickListener);

})();
