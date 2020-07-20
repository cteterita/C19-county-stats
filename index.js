'use strict';
const ncov19Url = 'https://api.ncov19.us/zip';


let zipSet = new Set(); // We use a set because we never want zip codes duplicated

function renderLocations() {
    zipSet.forEach(zip => addSingleLocation(zip));
}

function addSingleLocation(zipCode) {
    const options = {
        method: 'POST',
        body: JSON.stringify({zip_code: zipCode})
    };
    
    fetch(ncov19Url, options)
        .then(response => response.json())
        .then(parsedResponse => renderSingleLocation(parsedResponse.message));
}

function renderSingleLocation(data) {
    console.log(data);

    $('#card-holder').prepend(`
        <section class="item location-card">
            ${data.county_name} County <br>
            ${data.state_name} <br>
            Confirmed Cases: ${data.confirmed} <br>
            Fatality Rate: ${data.fatality_rate} <br>
            New Cases: ${data.new} <br>
            Last Update: ${data.last_update} <br>
        </section>
    `);
}

function addZip(zipCode) {
    zipSet.add(zipCode);
    document.location.search = `zip=${[...zipSet].join(',')}`;
}

function initialize() {
    // Grab zipcodes from the URL, in case the user has bookmarked results
    const urlParams = new URLSearchParams(document.location.search);
    let zipString = urlParams.get('zip');
    if (zipString) {
        zipString.split(',').forEach(zip => zipSet.add(zip));
        renderLocations();
    }

    $('#zip-form').submit(function(event) {
        event.preventDefault();
        addZip($('#zipcode').val());
    });
}

$(initialize());