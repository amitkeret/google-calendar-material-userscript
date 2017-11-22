// ==UserScript==
// @name         Google calendar Material design
// @version      0.4.2
// @description
// @author       amitkeret
// @match        https://calendar.google.com/calendar/*
// @updateURL    https://raw.githubusercontent.com/amitkeret/google-calendar-material-userscript/native-material/calendarMaterial.js
// @require      https://maps.googleapis.com/maps/api/js?libraries=places&key=AIzaSyCzZllDMWGt8Jop33POXBZ4Z-CH3sBdxUQ
// @resource     calendarCSS       https://raw.githubusercontent.com/amitkeret/google-calendar-material-userscript/master/calendarMaterial.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

(function(gm) {
    'use strict';

    GM_addStyle(GM_getResourceText('calendarCSS'));

    /**
     * URL prefix for image URLs
     */
    const baseURL = 'https://raw.githubusercontent.com/amitkeret/google-calendar-material-userscript/master/';

    /**
     * Expose to global window for subsequent Google services to load properly
     */
    unsafeWindow.google = { maps: gm };
    let GMaps = {
        /**
         * Globaly-defined dimentions for photos/maps
         */
        dimentions: {
            width: 2002,
            height: 696
        },
        geocoder: new gm.Geocoder(),
        dummyMap: new gm.Map(document.createElement('div')) // DOM elemenet param required
    };
    GMaps.places = new gm.places.PlacesService(GMaps.dummyMap);

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
        element.style.backgroundImage = 'url("' + background + '"), linear-gradient(to top, #CCC, #CCC 20%, white 40%)';
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center center';
        element.style.backgroundColor = 'transparent';
        element.style.backgroundBlendMode = 'multiply';
        if (!element.classList.contains('t09REd')) {
            element.classList.add('t09REd');
            element.parentNode.classList.add('fEQAz');
        }
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
            size = '&size=' + GMaps.dimentions.width + 'x' + GMaps.dimentions.height + '&zoom=17',
            add = '&center=' + encodeURIComponent(address) + '&markers=color:red|size:medium|' + encodeURIComponent(address);
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
            if (status === gm.GeocoderStatus.OK && results.length > 0) {
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
            if (status == gm.places.PlacesServiceStatus.OK && results.length > 0 && results[0].photos && results[0].photos.length > 0) {
                element.classList.add('fadein');
                let placeURL = results[0].photos[0].getUrl({'maxWidth': GMaps.dimentions.width, 'maxHeight': GMaps.dimentions.height});
                applyBg(element, placeURL);
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
        let dateRange = document.querySelector('.BXL82c .rSoRzd').innerText.split(' ');
        let month = new Date(dateRange[0].trim() + ' ' + dateRange[dateRange.length-1].trim());
        if (undefined === month) month = 0;
        else month = month.getMonth();
        applyBg(document.querySelector('.hEtGGf.HDIIVe'), getBgURL('month', month));
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
        var bubbleEvent = document.querySelector('.RDlrG.J9Nfi.iWO5td');
        if (null === bubbleEvent) return;
        let addressLink = bubbleEvent.querySelector('#xDetDlgLoc');
        if (addressLink) {
            let addressInner = addressLink.querySelector('.DX3x9d');
            let addressText = addressInner.querySelector('.DN1TJ').textContent.length > 0 ? addressInner.querySelector('.DN1TJ').textContent : addressInner.childNodes[0].textContent;
            checkForAddress(addressText, bubbleEvent.querySelector('.i5a7ie'));
        }
    }

    /**
     * Apply initial changes
     */
    //globalChanges();
    //gridMutationFunc();

    /**
     * Bind mutation/event callbacks
     */
/*
    var grid = document.getElementById('gridcontainer'),
        cover = document.getElementById('coverinner'),
        observer1 = new MutationObserver(gridMutationFunc),
        observer2 = new MutationObserver(coverInnerMutationFunc),
        config = { attributes: true, childList: true, characterData: true };
    observer1.observe(grid, config);
    observer2.observe(cover, config);
*/
    var observer = new MutationObserver(gridMutationFunc).observe(document.body, { attributes: true, childList: true, characterData: true });
    document.body.addEventListener('click', function() { setTimeout(clickListener, 300); } );

})(google.maps);
