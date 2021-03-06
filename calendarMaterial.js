// ==UserScript==
// @name         Google calendar Material design
// @version      0.3.1
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

    GM_addStyle(GM_getResourceText('calendarCSS'));

    /**
     * Define the calendarFlair object and expose to global scope
     */
    var calendarFlair = unsafeWindow.calendarFlair = function() {

        /**
         * URL prefix for image URLs
         */
        const baseURL = 'https://raw.githubusercontent.com/amitkeret/google-calendar-material-userscript/master/';

        /**
         * Object containing key-Array pairs in the form of:
         * (image prefix): [(keyword1), (keyword2)... (keywordN)]
         */
        const calendarFlairData = JSON.parse(GM_getResourceText('calendarFlairData')).calendarFlairData;

        const GMaps = {
            /**
             * Globaly-defined dimentions for photos/maps
             */
            dimentions: {
                width: 2002,
                height: 696
            },
            /**
             * Populated by GMaps API services after "onload" fired
             */
            geocoder:   new google.maps.Geocoder(),
            places:     new google.maps.places.PlacesService(document.createElement('div')) // DOM elemenet param required
        };

        /**
         * Perform initial one-off changes
         */
        function globalChanges() {
            let goog = document.querySelector('.gb_3b .gb_5b'),
                logo = goog.cloneNode(true);
            logo.id = 'app-logo';
            goog.parentNode.appendChild(logo);
        }

        /**
         * Apply a given background to a given element
         * @param {Node} element
         * @param {String} background
         */
        function applyBg(element, background) {
            element.style.backgroundImage = 'url("' + background + '")';
            element.style.backgroundColor = '#CCC';
            element.style.backgroundBlendMode = 'multiply';
            element.classList.add('flair');
            element.parentNode.classList.add('flair');
        }

        /**
         * Format a background-image URL
         * @param {String} type
         * @param {String} param
         */
        function getBgURL(type, param) {
            let baseImgURL = baseURL + 'images/';
            if ('flair' === type) baseImgURL += 'flairs/img_' + param;
            else baseImgURL += 'months/' + param;
            return baseImgURL + '.jpg';
        }

        /**
         * Format a URL to call GMaps static maps service
         * @param {String} address
         */
        function getStaticMapURL(address) {
            let prefix = 'https://maps.googleapis.com/maps/api/staticmap?maptype=roadmap&format=png&visual_refresh=true',
                size = '&size=' + GMaps.dimentions.width + 'x' + GMaps.dimentions.height + '&scale=2',
                add = '&markers=color:red|size:small|' + encodeURIComponent(address);
            return prefix + size + add;
        }

        /**
         * Flair matching function
         * Iterates through the key-Array pairings in calendarFlairData object
         * Two cycles:
         *  1. Exact match of entire string to the keyword
         *  2. "Fuzzy" match: checks if keywords in included anywhere in the string
         * If a match is found, the corresponding keyword is the basis for the background applied
         * @param {String} text
         * @param {Node} element
         */
        function checkForFlair(text, element) {
            let flair = false,
                exactFunction = function(el) { return text.toLowerCase() == el; },
                fuzzyFunction = function(el) { return text.toLowerCase().indexOf(el) !== -1; };
            // try an exact match
            for (let eventFlairItem in calendarFlairData) {
                if (!flair && calendarFlairData[eventFlairItem].filter(exactFunction).length) {
                    flair = eventFlairItem;
                }
            }
            if (false === flair) {
                // try a "fuzzy" match
                for (let eventFlairItem in calendarFlairData) {
                    if (!flair && calendarFlairData[eventFlairItem].filter(fuzzyFunction).length) {
                        flair = eventFlairItem;
                    }
                }
            }
            if (false !== flair) applyBg(element, getBgURL('flair', flair));
        }

        /**
         * Check GMaps API for a valid address
         * If found, applies background as static-map format
         * @param {String} address
         * @param {Node} element
         */
        function checkForGeo(address, element) {
            GMaps.geocoder.geocode({ 'address': address }, function (results, status) {
                if (status === google.maps.GeocoderStatus.OK && results.length > 0) {
                    applyBg(element, getStaticMapURL(address));
                }
            });
        }

        /**
         * Check GMaps API if this address is a valid "place"
         * (Place has to have at least one photo associated with it)
         *  - If found, fetch the first photo and apply background
         *  - If not found, fallback to address-search
         * @param {String} address
         * @param {Node} element
         */
        function checkForPlace(address, element) {
            GMaps.places.textSearch({ 'query': address }, function (results, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                    let placeId = results[0].place_id;
                    GMaps.places.getDetails({ 'placeId' : placeId}, function (place, status) {
                        if (status == google.maps.places.PlacesServiceStatus.OK && place.photos && place.photos.length > 0) {
                            element.classList.add('fadein');
                            let placeURL = place.photos[0].getUrl({'maxWidth': GMaps.dimentions.width, 'maxHeight': GMaps.dimentions.height});
                            applyBg(element, placeURL);
                        }
                        else checkForGeo(address, element);
                    });
                }
                else checkForGeo(address, element);
            });
        }

        /**
         * Wrapper function
         * @param {String} address
         * @param {Node} element
         * @param {boolean} checkPlace
         */
        function checkForAddress(address, element, checkPlace) {
            if (false === checkPlace) checkForGeo(address, element);
            else checkForPlace(address, element);
        }

        /**
         * Apply global grid background according to calendar month
         */
        function changeGlobalBg() {
            let month = new Date(document.querySelector('.date-top').innerText.split('–')[0].trim());
            if (undefined === month) month = 0;
            else month = month.getMonth();
            document.getElementById('vr-nav').style.backgroundImage = 'url("' + getBgURL('month', month) + '")';
        }

        /**
         * Agenda view
         * Fired whenever the agenda timeframe is "scrolled"
         */
        function agendaView() {
            // detect we're in agenda view
            let events = document.querySelectorAll('.lv-row');
            if (events.length > 0) {
                events.forEach(function(event){
                    // skip events already styled by the script
                    if (event.dataset.styled) return;
                    let eventTitle = event.querySelector('.lv-event-title-line');
                    eventTitle.style.backgroundColor = eventTitle.querySelector('span').style.color;
                    eventTitle.style.borderBottomColor = eventTitle.style.backgroundColor;
                    let eventTime = event.querySelector('.lv-event-time').innerText;
                    if (eventTime.toLowerCase() !== 'all day') {
                        let span2 = document.createElement('span');
                        span2.classList.add('.lv-event-description');
                        span2.innerText = eventTime;
                        eventTitle.appendChild(span2);
                    }
                    /**
                     * Doesn't work - possibly too many calls on Mutation call?
                     */
                    //let addressLink = eventTitle.querySelector('.lv-location');
                    //if (addressLink) checkForAddress(addressLink.innerText, eventTitle, false);
                    checkForFlair(eventTitle.innerText, eventTitle);
                    event.dataset.styled = 1;
                });
            }
        }

        /**
         * Single-event view
         * Fired when entering event details
         */
        function singleEventView() {
            let event = document.querySelector('.ep');
            if (null !== event) {
                var bgimg = document.createElement('div');
                bgimg.id = 'ep-bgimg';
                event.appendChild(bgimg);
                let addressLink = event.querySelector('.ep-dp-input');
                if (addressLink) {
                    let addressLinkInput = addressLink.querySelector('input');
                    if (addressLinkInput && addressLinkInput.value.length > 0) checkForAddress(addressLinkInput.value, bgimg);
                    else if (addressLink.innerText.length > 0) checkForAddress(addressLink.innerText, bgimg);
                }
                let epTitle = document.querySelector('.ep-title');
                if (epTitle.querySelectorAll('input').length) checkForFlair(epTitle.querySelector('input').value, bgimg);
                else checkForFlair(epTitle.innerText, bgimg);
            }
        }

        /**
         * Mutation callback for grid views
         * (day|week|month|4 days|agenda)
         */
        function gridMutationFunc() {
            changeGlobalBg();
            agendaView();
        }

        /**
         * Mutation callback for single-event view
         */
        function coverInnerMutationFunc() {
            singleEventView();
        }

        /**
         * Event handler for grid-based clicks
         * (event tooltips)
         */
        function clickListener() {
            var bubbleEvent = document.querySelector('.bubblemain');
            if (null === bubbleEvent) return;
            let bgimg = document.createElement('div');
            bgimg.id = 'bubble-bgimg';
            bubbleEvent.insertBefore(bgimg, bubbleEvent.firstChild);
            let addressLink = bubbleEvent.querySelector('a.neb-map-link');
            // .innerText include "map" at the end of the string, have to slice() it out...
            if (addressLink) checkForAddress(addressLink.parentNode.innerText.split('').slice(0, -3).join(''), bgimg);
            checkForFlair(bubbleEvent.innerText.split('\n')[0].trim(), bgimg);
        }

        /**
         * Apply initial changes
         */
        globalChanges();
        gridMutationFunc();

        /**
         * Bind mutation/event callbacks
         */
        var grid = document.getElementById('gridcontainer'),
            cover = document.getElementById('coverinner'),
            observer1 = new MutationObserver(gridMutationFunc),
            observer2 = new MutationObserver(coverInnerMutationFunc),
            config = { attributes: true, childList: true, characterData: true };
        observer1.observe(grid, config);
        observer2.observe(cover, config);
        grid.addEventListener('click', function() { setTimeout(clickListener, 1); } );

    };

    /**
     * 1. Inject GMaps API script
     * 2. Initialize modifications after it's loaded
     */
    var gmaps = document.createElement('script'),
        ts = new Date();
    gmaps.setAttribute('onload', 'var cf = new calendarFlair();');
    document.body.appendChild(gmaps);
    gmaps.src = 'https://maps.google.com/maps/api/js?libraries=places&ts=' + ts;

})();
