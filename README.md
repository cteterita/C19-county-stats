# [Covid-19 County Stats Comparison Tool](https://cteterita.github.io/C19-county-stats/)

This is a tool that allows users to compare critical Covid-19 infection statistics across multiple United States counties. They can enter up to 5 counties, searched by zip code.

![Screenshot of app](/screenshots/primary.png)

Technologies & Services Used:
- Javscript, jQuery, HTML, and CSS
- [Chart.js](https://www.chartjs.org/)
- [ncov19.us API](https://api.ncov19.us/redoc) (which sources data from the [COVID-19 Data Repository by the Center for Systems Science and Engineering (CSSE) at Johns Hopkins University](https://github.com/CSSEGISandData/COVID-19))
- [US census Bureau API](https://www.census.gov/data/developers/data-sets/popest-popproj/popest.html)

Future Feature Ideas:
- Search for locations using the Google Places API & autofill search box
- Graph stats from all selected counties in a single chart
