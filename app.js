

//=================STATE============================== 
//---------initial projection--------
var state = {                           
  projection: 'mercator',
  HiResMap: false
}

//=============DATA======================================
//-------------get Data----------------------------------
d3.queue()
  .defer(d3.csv, './data/country_data.csv', row => ({
    country: row.country,
    countryCode: +row.countryCode,
    population: +row.population,
    medianAge: +row.medianAge,
    area: +row.landArea,
    fertilityRate: +row.fertilityRate,
    popDensity: +row.population / +row.landArea
  }))
  .defer(d3.json, 'https://unpkg.com/world-atlas@1/world/110m.json')     //small map
  .defer(d3.json, './data/world-50m.json')                           //large map
  .await((e, populationData, map110, map50) => {
    if (e) throw e;
  //--------convert TopoJSON to GeoJSON
    //------------------------small map---------------
    let worldData110 = topojson.feature(map110, map110.objects.countries).features;
    let landData110 = topojson.feature(map110, map110.objects.land).features;
    //------------------------large map---------------
    let worldData50 = topojson.feature(map50, map50.objects.countries).features;
    let landData50 = topojson.feature(map50, map50.objects.land); 
  //????????????????????--Why Doesn`t it work????????????????????????
  // It seems to create exactly the right kind of data but throws error when...
  // ...accessing d.properties[val]

    // geoData.forEach(obj => {
    //     obj.properties = populationData.filter(row => row.countryCode === obj.id)[0];
    // })
  //---------link population data --> geoData.properties---------
  function linkData(geoData, countryData) {
    countryData.forEach(row => {
      var countries = geoData.filter(d => +d.id === row.countryCode);
      countries.forEach(country => {
        country.properties = row;
        country.id = +country.id;
      });
    });
  }
    linkData(worldData50, populationData);
    linkData(worldData110, populationData)
    makeMap(worldData110, landData110, worldData50, landData50);
  //================setup projections, paths and grid=============================
  //------------create and configure graticule grid------



  });