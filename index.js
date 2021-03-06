'use strict';
const ncovBase19URL = 'https://api.ncov19.us';
const censusBaseURL = 'https://api.census.gov/data/2019/pep/population';
const censusAPIKey = '3e74754aa5baddee8dfd6645aa7d3e3d5dbabc4a';

// Global variables
let zipSet = new Set(); // A list of unique zip codes
var zip2fips = {}; // We will read this from a JSON file when we initialize the page
var chart;
var chartData = [];
var chartColors = [
    'rgb(186, 160, 166',
    'rgb(97, 155, 138)',
    'rgb(161, 193, 129)',
    'rgb(252, 202, 70)',
    'rgb(254, 127, 45)',
];

async function initializeChart() {
    // Load national averages for chart data
    const covPromise = fetch(`${ncovBase19URL}/stats`)
        .then(response => response.json());

    const censusPromise = fetch(`${censusBaseURL}?get=POP&for=us:*&key=${censusAPIKey}`)
        .then(response => response.json());

    await Promise.all([covPromise, censusPromise])
        .then(function(responses) {
            let data = responses[0].message;
            let population = parseInt(responses[1][1][0]);

            let percentPop = (data.confirmed/population*100).toFixed(1);
            let percentGrowth = (data.todays_confirmed/data.confirmed*100).toFixed(1);
            let fatalityRate = (data.deaths/data.confirmed*100).toFixed(1);

            let color = 'rgb(58, 100, 126)';
            
            // Add location card
            $('#card-holder').append(`
                <section class="item location-card">
                    National Average
                </section>
            `);

            // Add to chart
            chartData.push({
                label: 'National Average',
                backgroundColor: color,
                borderColor: color,
                data: [percentPop,percentGrowth,fatalityRate]
            });
            chart = new Chart(document.getElementById('mainChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: [
                        'Infection Rate', 
                        'Fatality Rate', 
                        'Growth Rate'
                    ],
                    datasets: chartData
                },
            
                options: {
                    legend: {
                        display: false
                    },
                    scales: {
                        yAxes: [{
                            ticks: {
                                callback: function(value, index, values) {
                                    return `${value}%`;
                                }
                            }
                        }]
                    },
                    tooltips: {
                        callbacks: {
                            label: function (tooltipItem, data) {
                                return `${tooltipItem.yLabel}%`;
                            }
                        }
                    },
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        });
}

function updateChart() {
    chart.data.datasets = chartData;
    chart.update();
}

function addSingleLocation(zipCode, fip) {
    // Fetch ncov19 data
    const options = {
        method: 'POST',
        body: JSON.stringify({zip_code: zipCode})
    };
    const promise1 = fetch(`${ncovBase19URL}/zip`, options)
        .then(response => response.json());

    // Fetch census data
    const promise2 = fetch(`${censusBaseURL}?get=POP&for=county:${fip.slice(2)}&in=state:${fip.slice(0,2)}&key=${censusAPIKey}`)
        .then(response => response.json());

    // Wait for both APIs to return & render new location card
    Promise.all([promise1, promise2])
        .then(function(responses) {
            let data = responses[0].message;

            // Catch the few cases where a valid zip isn't in the c19 database (example: 98765)
            if (!data) {
                zipSet.delete(zipCode);
                updateURL();
                throw `${zipCode} not found in database`;
            }
            data.population = parseInt(responses[1][1][0]);
            data.zipCode = zipCode;
            renderSingleLocation(data);
        })
        .catch(e => showError(e));
}

function renderSingleLocation(data) {
    // Calculate new fields
    let percentPop = (data.confirmed/data.population*100).toFixed(1);
    let percentGrowth = (data.new/data.confirmed*100).toFixed(1);
    let fatalityRate = data.fatality_rate.replace('%','');
    let color = chartColors.pop();

    // Add new location card
    $('#card-holder').append(`
        <section class="item location-card" zip="${data.zipCode}" style="background-color:${color}">
            <div class="county-label">
                ${data.county_name} County</b> <br>
                ${data.state_name}
            </div>
            <div class="remove-button-holder">
                <button class="remove-location">X</button>
            </div>
        </section>
    `);

    // Add data to chartData
    chartData.push({
            zip: data.zipCode,
            label: `${data.county_name} County`,
            backgroundColor: color,
            borderColor: color,
            data: [percentPop, fatalityRate, percentGrowth]
    });

    updateChart();
}

function addZip(zipCode) {
    // Validate the zip code
    let fip = zip2fips[zipCode];
    // Check that it's a valid zip by looking up its fip
    if (!fip) throw `${zipCode} is not a valid US zip code`;
    // Check that we don't already have it in our list
    if (zipSet.has(zipCode)) throw `${zipCode} is already displayed`;

    // Add it to the list of zips
    zipSet.add(zipCode);
    updateURL();

    // Limit to 5 zips at a time
    if (zipSet.size >= 5) {
        $('#zipcode').prop('disabled', true);
    }

    // Render new zipcode
    addSingleLocation(zipCode, fip);
}

function showError(e) {
    $('#error-message').text(e);
    $('#error-message').show();
    updateURL(); // Remove any erroneous zips the user may have put in the URL
}

function updateURL() {
    window.history.pushState(null, null, `${window.location.pathname}?zip=${[...zipSet].join(',')}`);
}

function initialize() {
    // Initializes the chart with national average data
    const promise1 = initializeChart();

    // Grab zipcodes from the URL, in case the user has bookmarked results
    const urlParams = new URLSearchParams(document.location.search);
    let zipString = urlParams.get('zip');
    let initZipSet = [];
    if (zipString) zipString.split(',').slice(0,5).forEach(zip => initZipSet.push(zip));

    // Load zip2fips JSON (for looking up fip code for census API)
    const promise2 = fetch('zip2fips.json')
        .then(response => response.json());

    // Wait until chart is initialized and zip2fips is loaded, then add locations from URL
    Promise.all([promise1,promise2])
        .then(function(responses) {
            zip2fips = responses[1];
            initZipSet.forEach(zip => addZip(zip));
        })
        .catch(e => showError(e));

    // Listen for user to add another zip code
    $('#zip-form').submit(function(event) {
        event.preventDefault();
        $('#error-message').hide();

        let zip = $('#zipcode').val();
        try {
            addZip(zip);
            $('#zipcode').val(''); 
        } catch(e) {
            zipSet.delete(zip);
            showError(e);
        }     
    });

    // Listen for user to remove location
    $('#card-holder').on('click', '.remove-location', function(e) {
        // Get the appropriate location card and its zip code
        let locationCard = $(e.target).parent().parent();
        let zip = locationCard.attr('zip');

        // Remove location card and remove zip from zipList
        $(locationCard).remove();
        zipSet.delete(zip);
        updateURL();

        // Remove data from chart
        let removalIndex = chartData.findIndex(item => item.zip === zip);
        let dataToRemove = chartData.splice(removalIndex, 1);
        chartColors.push(dataToRemove[0].backgroundColor);
        updateChart();

        // Re-enable search form
        if (zipSet.size < 5) {
            $('#zipcode').prop('disabled', false);
        }
    });
}

$(initialize());