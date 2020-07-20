'use strict';
const ncovBase19URL = 'https://api.ncov19.us/zip';
const censusBaseURL = 'https://api.census.gov/data/2019/pep/population';
const censusAPIKey = '3e74754aa5baddee8dfd6645aa7d3e3d5dbabc4a';

let zipSet = new Set(); // A list of unique zip codes
var zip2fips = {} // We will read this from a JSON file when we initialize the page

function addSingleLocation(zipCode) {
    // Fetch ncov19 data
    const options = {
        method: 'POST',
        body: JSON.stringify({zip_code: zipCode})
    };
    const promise1 = fetch(ncovBase19URL, options)
        .then(response => response.json());

    // Fetch census data
    let fip = zip2fips[zipCode]; // This is a 5 digit code
    const promise2 = fetch(`${censusBaseURL}?get=POP&for=county:${fip.slice(2)}&in=state:${fip.slice(0,2)}&key=${censusAPIKey}`)
        .then(response => response.json());

    // Wait for both APIs to return & render new location card
    Promise.all([promise1, promise2])
        .then(function(responses) {
            let data = responses[0].message;
            data.population = parseInt(responses[1][1][0]);
            data.zipCode = zipCode;
            renderSingleLocation(data);
        });
}

function renderSingleLocation(data) {
    // Calculate new fields
    let percentPop = (data.confirmed/data.population*100).toFixed(1);
    let percentGrowth = (data.new/data.confirmed*100).toFixed(1)

    // Add new location card
    $('#card-holder').prepend(`
        <section class="item location-card" zip="${data.zipCode}">
            ${data.county_name} County <br>
            ${data.state_name} <br>
            Confirmed Cases: ${data.confirmed} <br>
            % of Population: ${percentPop}% <br>
            Fatality Rate: ${data.fatality_rate} <br>
            New Cases: ${data.new} <br>
            % Case Growth: ${percentGrowth}% <br>
            Last Update: ${data.last_update} <br>
            <button class="remove-location">Remove</button>
        </section>
    `);
}

function addZip(zipCode) {
    // Add the new zip code (if it isn't already in the list)
    if (zipSet.has(zipCode)) return;
    zipSet.add(zipCode);
    updateURL();

    // Render new zipcode
    addSingleLocation(zipCode);
}

function updateURL() {
    window.history.pushState(null, null, `/?zip=${[...zipSet].join(',')}`);
}

function initialize() {
    // Grab zipcodes from the URL, in case the user has bookmarked results
    const urlParams = new URLSearchParams(document.location.search);
    let zipString = urlParams.get('zip');
    if (zipString) {
        zipString.split(',').forEach(zip => zipSet.add(zip));
    }

    // Load zip2fips JSON (for looking up fip code for census API) & render locations from URL
    fetch('zip2fips.json')
        .then(response => response.json())
        .then(function(json) {
            zip2fips = json;
            zipSet.forEach(zip => addSingleLocation(zip));
        });

    // Listen for user to add another zip code
    $('#zip-form').submit(function(event) {
        event.preventDefault();
        // TODO: Validate input (check that it is a zip code)
        addZip($('#zipcode').val());
        $('#zipcode').val('');
    });

    // Listen for user to remove location
    $('.remove-location').click(e => console.log(e));
    $('#card-holder').on('click', '.remove-location', function(e) {
        // Get the appropriate location card and its zip code
        let locationCard = $(e.target).parent();
        let zip = locationCard.attr('zip');

        // Remove location card and remove zip from zipList
        $(locationCard).remove();
        zipSet.delete(zip);
        updateURL();
    });
}

$(initialize());