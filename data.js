function getData({mapDataUrl, dataUrl}) {
  let mapData = {};
  let fetch = d3.queue();
 //fetch GeoData (TopoJSON hiRes and loRes) and fill mapData with {worldLoRes, landLoRes, worldHiRes, landHiRes}
  queueMapData(mapDataUrl);
  //fetch countryData from dataUrl list
  queueCountryData(dataUrl);
  fetch.await((e, worldMapLoRes, worldMapHiRes, ...dataSets) => {
        if (e) throw e;
  //--------convert TopoJSON `countries` and `land` to GeoJSON and store in mapData object
    mapData.worldLoRes = topojson.feature(worldMapLoRes, worldMapLoRes.objects.countries).features;
    mapData.landLoRes = topojson.feature(worldMapLoRes, worldMapLoRes.objects.land).features;
    mapData.worldHiRes = topojson.feature(worldMapHiRes, worldMapHiRes.objects.countries).features;
    mapData.landHiRes = [topojson.feature(worldMapHiRes, worldMapHiRes.objects.land)];   // account for different data structure of loRes and HiRes land
    // convert annual dataSets (key: {year: value, year:value}) and store in dataArray
    let dataArray = dataSets.map((dataSet) => (containsAnnualData(dataSet)) ?  sortedByYear(dataSet) : dataSet);
    // merge dataSets by country into mergedDataset
    mergedDataset = mergeData(dataArray);
    // link mergedDataset to mapDatasets
    linkGeoJsonToData(mapData.worldLoRes, mergedDataset);
    linkGeoJsonToData(mapData.worldHiRes, mergedDataset);
    createDisplay(mapData);
  });
  

 //fetch GeoData (TopoJSON hiRes and loRes) and fill mapData with {worldLoRes, landLoRes, worldHiRes, landHiRes}
  function queueMapData({hiResUrl, loResUrl}, geoData) {
    fetch
      .defer(d3.json, loResUrl)     //small map
      .defer(d3.json, hiResUrl)     //large map
  }

  // fetch country Data from dataUrl list
  function queueCountryData(_dataUrl) {
    fetch
      .defer(d3.csv, _dataUrl[0], row => ({
      country: row.Country,
      countryCode: +row['Country Code'],
      emission: +row.Emissions,
      emissionPC: +row['Emissions Per Capita'],
      continent: row.Continent,
      region: row.Region,
      year: +row.Year
    }))
    .defer(d3.csv, _dataUrl[1], row => ({
      country: row.country,
      countryCode: +row.countryCode,
      population: +row.population,
      medianAge: +row.medianAge,
      area: +row.landArea,
      fertilityRate: +row.fertilityRate,
      popDensity: +row.population / +row.landArea
    }))
  }


  // Add AutoDetect dataSets with year property and returns 
  function containsAnnualData(dataSet) {
    return (countainsYearKey(dataSet) && multipleId(dataSet));
    //   checks, if dataSet contains multiple rows for the same country
    function multipleId(data) {
      let count = 0;
      // choose 5 data points within the dataSet
      let split = Math.round(data.length / 6);
      for (let i = 0; i < 5; i++) {
        let chosenData = data[i * split]
        if (data.filter(row => row.countryCode == chosenData.countryCode).length > 1) count++;
      }
      return count > 3;
    } 
    //   checks, if dataSet contains year key
    function countainsYearKey(data) {
      // check the first 10 entries for year keys
      let count = 0;
      for (let i = 0; i < 10; i++) {
        for (let key in data[i]) {
          if (key.toLowerCase() == 'year') count++; 
          }
      }
      return count > 3;
    }
  }

  //---sorts chronological data by Year into all keys in key-array 
  function sortedByYear(dataSet) {
    let keys = [];
    // transform keys into array if it is a single key
    if (!Array.isArray(keys)) keys = [keys];
    for (let key in dataSet[0]) {
      if (typeof dataSet[0][key] !== 'string' && key !== 'countryCode') keys.push(key);
    }
    let sortedData = [];
    dataSet.forEach(row => {
    // check if country object exists; if not create new object with all static keys
      if (!sortedData.filter(obj => obj.country == row.country).length) {
        let newObj = {};
        for (let key in row) {
          if (!keys.includes(key)) newObj[key] = row[key];
        }
        sortedData.push(newObj)
      }
      let country = sortedData.find(obj => obj.country == row.country);
      keys.forEach((key) => {
        if (key == 'year') return;
        if (!country[key]) country[key] = {};
        country[key][row.year] = row[key];
      });
    });
    return sortedData;
  }


  //----------------reduces array of Data sets to one unified set
  //!!! might be simplified using object assign ??
  function mergeData(_dataArray) {
    let _mergedData = _dataArray.reduce((accumData, addedData) => {
      addedData.forEach(row => {
        // if country does not exist in mergingData, add complete row to mergingData
        let country = accumData.filter(country => country.countryCode == row.countryCode)[0];
        if (!country) {
            accumData.push(row)
          } else {
        // if country exists in mergingData, add key:value pairs that are not in mergingData
            for (let key in row) {
                if (!country[key]) {
                  country[key] = row[key];
                }
              }
          } 
      })
      return accumData;
    }, []);
    return _mergedData;
  }

  function linkGeoJsonToData(_geoData, dataSet) {
    dataSet.forEach((row, i) => {
      var countries = _geoData.filter(d => +d.id === +row.countryCode);
      countries.forEach(country => {
        country.properties = row;
      });
    });
  }
}