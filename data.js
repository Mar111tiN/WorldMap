function getData({mapDataUrl, dataUrl}) {
  const showPopulationDensity = true;
  const formatted = key => key.toLowerCase().replace(/[.\-_\s]/g,'');  //!!!change to RegExp
  const isNumberString = string => !isNaN(+string) || (formatted(string) == 'na');
  const camelCaseIt = string => (array => (array.length - 1) ? array.reduce((string, word,i, stringArray) => (i > 0) ? string + word[0].toUpperCase() + word.slice(1).toLowerCase() : string + word.toLowerCase(), '') : array[0][0].toLowerCase() + array[0].slice(1))(string.trim().split(/[.\-_\s]/g));
  let mapData = {};
  let fetch = d3.queue();
  let keyArray = [];    // store all key types
  let units = {};           // store key:unit pairs
  let operator,
    arg1,
    text1,
    arg2,
    text2,
    result;
    operate = {
      '+': [(x,y) => x + y, 'plus'],
      '-': [(x,y) => x - y, 'minus'],
      '/': [(x,y) => x / y, 'per'],
      '*': [(x,y) => x * y, 'times']
    };
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
    console.log('newData',dataArray[2]);
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
      .defer(d3.csv, _dataUrl[0], csvFormatter())
      .defer(d3.csv, _dataUrl[1], csvFormatter('populationDensity = population / landArea'))
      .defer(d3.csv, _dataUrl[2], csvFormatter())
  }
  function csvFormatter(equation) {
    return (row,i,header) => customFormatter(row,i,header,equation)
  }

  function customFormatter(row,i,header, equation = false) {
    if (i == 0) {
      keyArray = [];
    //!!! use args to derive parameters
    // identify keys and store type in key array 
    //  (countryName = 'cn', countryCode = 'cc', year = 'y', other = 'o', value = 'v', x = 'did not work') 

      header.forEach((key, j) => {
        let formattedKey = formatted(key);
        let keytype = (['name,', 'country', 'countryname'].includes(formattedKey))
          ? 'cn'
          : (['id', 'iso2', 'code', 'countrycode'].includes(formattedKey))
            ? 'cc'
            : (formattedKey == 'year')
              ? 'y'
              : (isNumberString(row[key]) || (formatted(row[key]) == 'na') )
              ? 'v'
              : 'x'
        if (keytype == 'v') {
          let valueKey;
          let brack = key.search(/[\(]/g)
          if (~brack) {               // if there are brackets in column key
            valueKey = camelCaseIt(key.slice(0,brack));
            let unit = key.slice(brack+1, key.search(/[\)]/g));
            units[valueKey] = unit;
            keyArray.push(valueKey)
          } else {
            units[key] = null;
            keyArray.push(camelCaseIt(key));
          }
        } else keyArray.push(keytype);      
      });      
      if (equation) {
        result = camelCaseIt(equation.slice(0,equation.search('=')).trim());
        operator = equation.split('').reduce((operator,char) => (['+','-','*','/'].includes(char)) ? char + operator : operator, '').toString();
        arg1 = camelCaseIt(equation.slice(equation.indexOf('=') + 1, equation.indexOf(operator)).trim());
        arg2 = camelCaseIt(equation.slice(equation.indexOf(operator) + 1).trim());
        text1 = (units[arg1]) ? units[arg1] + ' ' : '';
        text2 = (units[arg2]) ? ' ' + units[arg2] : '';
        units[result] = text1 + operate[operator][1] + text2;
      }
    }
    let obj = {};
    Object.keys(row).forEach((key, i) => {
      (keyArray[i] == 'cn')
        ? obj.country = row[key] 
        : (keyArray[i] == 'cc')
          ? obj.countryCode = +row[key]
          : (keyArray[i] == 'y')
            ? obj.year = +row[key]
            : (keyArray[i] == 'x')
              ? obj[key] = row[key] 
              : obj[keyArray[i]] = +row[key]
    });
    if (equation) {
      obj[result] = (operate[operator][0])(obj[arg1], obj[arg2]);
    }
    return obj;  
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
    _mergedData.units = units;
    return _mergedData;
  }

  function linkGeoJsonToData(_geoData, dataSet) {
    _geoData.units = dataSet.units;
    dataSet.forEach((row, i) => {
      var countries = _geoData.filter(d => +d.id === +row.countryCode);
      countries.forEach(country => {
        country.properties = row;
      });
    });
  }
}