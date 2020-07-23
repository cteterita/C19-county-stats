'use strict';
const ncovBase19URL = 'https://api.ncov19.us';
const censusBaseURL = 'https://api.census.gov/data/2019/pep/population';
const censusAPIKey = '3e74754aa5baddee8dfd6645aa7d3e3d5dbabc4a';

// Global variables
let zipSet = new Set(); // A list of unique zip codes
var zip2fips = {}; // We will read this from a JSON file when we initialize the page
var chart;
var chartData = [];
var chartColors = ['rgb(0, 99, 132)','rgb(100, 99, 132)','rgb(255, 99, 0)'];

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

            chartData.push({
                label: 'National Average',
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: [percentPop,percentGrowth,fatalityRate]
            });
            chart = new Chart(document.getElementById('myChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['% Population Infected', 'Fatality Rate', '% Case Growth'],
                    datasets: chartData
                },
            
                // TODO: Configuration options
                options: {
                    legend: {
                        display: 'no'
                    }
                }
            });
        });
}

function updateChart() {
    chart.data.datasets = chartData;
    chart.update();
}

function addSingleLocation(zipCode) {
    // Fetch ncov19 data
    const options = {
        method: 'POST',
        body: JSON.stringify({zip_code: zipCode})
    };
    const promise1 = fetch(`${ncovBase19URL}/zip`, options)
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
    let percentGrowth = (data.new/data.confirmed*100).toFixed(1);
    let fatalityRate = data.fatality_rate.replace('%','');

    // Add new location card
    $('#card-holder').prepend(`
        <section class="item location-card" zip="${data.zipCode}">
            ${data.county_name} County <br>
            ${data.state_name} <br>
            Confirmed Cases: ${data.confirmed} <br>
            % of Population: ${percentPop}% <br>
            Fatality Rate: ${fatalityRate}% <br>
            New Cases: ${data.new} <br>
            % Case Growth: ${percentGrowth}% <br>
            Last Update: ${data.last_update} <br>
            <button class="remove-location">Remove</button>
        </section>
    `);

    // Add data to chartData
    chartData.push({
            zip: data.zipCode,
            label: `${data.county_name} County`,
            backgroundColor: chartColors.pop(),
            borderColor: 'rgb(0, 99, 132)',
            data: [percentPop, fatalityRate, percentGrowth]
    });

    updateChart();
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
    window.history.pushState(null, null, `${window.location.pathname}?zip=${[...zipSet].join(',')}`);
}

function initialize() {
    // Initializes the chart with national average data
    const promise1 = initializeChart();

    // Grab zipcodes from the URL, in case the user has bookmarked results
    const urlParams = new URLSearchParams(document.location.search);
    let zipString = urlParams.get('zip');
    if (zipString) {
        zipString.split(',').forEach(zip => zipSet.add(zip));
    }

    // Load zip2fips JSON (for looking up fip code for census API)
    const promise2 = fetch('zip2fips.json')
        .then(response => response.json());

    // Wait until chart is initialized and zip2fips is loaded, then add locations from URL
    Promise.all([promise1,promise2])
        .then(function(responses) {
            zip2fips = responses[1];
            zipSet.forEach(zip => addSingleLocation(zip));
        }) 

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

        // Remove data from chart
        chartData = chartData.filter(item => item.zip !== zip);
        updateChart();
        // TODO: Deal with chart colors
    });
}

$(initialize());