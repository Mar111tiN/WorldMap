'use strict'


  //===============SET DEFAULTS=========================
  //--------------color ranges for data types !! add more!!
const logLimit = 200,
      allowLogScale = true,
      colorRanges = [
        ['black', 'orange'],
        ['white', 'black'],
        ['black', 'orange'],
        ['white', 'red'],
        ['green', 'red'],
        ['white', 'black'],
        ['red', 'green']
      ],
      digitSeparator = ' ',   // separator betweeen 1e3 range
      round = 2,              // how many decimals
      links = {         //----------will be created via import mask
        mapDataUrl : {
          hiResUrl: './data/world-50m.json',
          loResUrl: './data/world-110m.json'
        },
        dataUrl : ['./data/emmission_data.csv', './data/country_data.csv', './data/consumerprise.csv'],
        equations : ['']
      };



//=================STATE============================== 
//---------initial projection--------
var state = {newData : true}, // true when data collection has changed --> set false by updateScatterSelector()
    colorScales = {},
    yearRange = {},   // object of {yearKey: [min, max]} | is computed by setYearRanges();;
    scatterState = {},        // scatter state
    mapData,
    geoData,
    range,
    countryData,
    tooltip,  
    activeData = new Set(),   // dataSet of active countries for bar Chart 
    landMass,
    decimalAdjust = Math.pow(10,round),
    firstRun = true;



// -------vars for selections
var map = d3.select('svg#map'),
    dataSelect = d3.select('#data'),
    projectionSelect = d3.select('#projection'),
    resSelect = d3.select('input#resolution'),
    yearSelect = d3.select('#year');



//fetch mapData [Array] 
getData(links); // links--> |fetch+convert+merge*async| --> setUp(mapData)
//===============INIT===================
function setUp(data) {
  mapData = data; // bring mapData from data.js into global scope
  setState();   // init: STATE.year --> 2000
  updateData(); // state.hiResMap --> ||  --> geoData + landMass + countryData
  updateDataSelect();
  setYearRange(); //initialize yearRange 
  updateYearSelect(); // state --> |year Range Bar|
  setColorScales();
  makeMap();
  setTT();          // tooltip
  makeScatter();    // everything is in scatter
  updateColors();    //  STATE.year --> |svg color|-  apply fill to .country paths
  firstRun = false;
}


//==================STATE====================================
function setState() {
  state.projection = projectionSelect.property('value');
  state.hiResMap = resSelect.node().checked;
  state.year = (firstRun) ? 2000 : +yearSelect.property('value');
  state.key = dataSelect.property('value');
  console.log('STATE:', state.key, state.year, state.projection, state.hiResMap) 
}

  //==================DATA select====================================
  // geoData and landMass is updated based on hiRes selection
  function updateData() {
    geoData = state.hiResMap ? mapData.worldHiRes : mapData.worldLoRes;
    landMass = state.hiResMap ? mapData.landHiRes : mapData.landLoRes;
    //    countryData contains only valid countries
    countryData = geoData.filter(d => ((d.properties.country) || (d.properties.countryCode))).map(d => ({properties:d.properties}));
    countryData.units = geoData.units;
    return {
      geoData:geoData,
      landMass: landMass,
      countryData: countryData
    }
  }  

  //===============Central DATA selector for all 
  function updateDataSelect() {
    let keyArray = Object.keys(geoData.units)
      dataSelect
      .selectAll('option')
        .data(keyArray, d => d)
          .enter()
            .append('option')
            .property('value', d => d)
            .text(d => camel2title(d))
      //----------------get Data selector value-----------------------
      dataSelect
            .on('change', () => {
              setState();
              updateColors();    // update Map
              makeScatter();    // update Scatter
              updateDisplay();  
              updateYearSelect();             
            });
      dataSelect.selectAll('option').exit().remove()
      //----------------get yearSelector value-----------------------      
      yearSelect
        .on("input", () => {
          setState();
          updateDisplay(); 
          updateColors();
          makeScatter();
        });
  }  



//==================YEAR RANGES FOR SCALES AND YEAR SELECTOR=================
  function updateDisplay() {
    // set current year in yearSelect
    d3.select('#current-year')
      .text(state.year)
    // set main title
    let units = (geoData.units[state.key])
                ? `in ${geoData.units[state.key]}`
                : ''
    let year = (isYearKey(state.key))
                ? ` for ${state.year}`
                : ''
    d3.select('#subtitle')
      .text((state.key == 'nodata') 
                  ? 'Select data for display!' 
                  : `- Showing ${camel2title(state.key)} ${units} ${year} -`)
  }

  // create year ranges for all keys with annual data
  function setYearRange() {
    for (let key in geoData.units) {
      if (isYearKey(key)) {
        yearRange[key] = getYearRange(key);
      }
    }
    return yearRange;
    // returns range for annual keys
    function getYearRange(key) {
      // iterate over all countries in countryData and store individual ranges in rangeArray
      let rangeArray = countryData
      .filter(obj => obj.properties[key]) // only countries that have the key
        .map(obj => d3.extent(Object.keys(obj.properties[key])));   // compute extent of the year keys
    // get minimum of rangeArray minima
      let min = d3.min(rangeArray, d => d[0]);
    // get maximum of rangeArray maxima
      let max = d3.max(rangeArray, d => d[1]);
      return [min, max];
    }
  }

  // adjust the yearSelect depending on current key
  function updateYearSelect() {
    // use state.key if it is a year key or the first key in the yearRange object

    let yearKeyOnDataSelect = isYearKey(state.key);
    let yearKeyOnScatterSelect = isYearKey(scatterState.x) || isYearKey(scatterState.y) || isYearKey(scatterState.r);
    yearKeyOnDataSelect
      ? d3.select('#data-select').node().append(d3.select('.selector.year').classed('hidden', false).node())
      : yearKeyOnScatterSelect
        ? d3.select('#scatter-select').node().append(d3.select('.selector.year').classed('hidden', false).node())
        : d3.select('.year').classed('hidden', true);


    let key = isYearKey(state.key) ? state.key : Object.keys(yearRange)[0];
    yearSelect
      .property("min", yearRange[key][0])
      .property("max", yearRange[key][1])
      .property("value", Math.max(+state.year, yearRange[key][0]));
    // hide 
    
  }

  //================APPLY COLORS===============================
    //--------------color scales for individual data types
  function setColorScales() {
    colorScales.countryCode = d3.scaleSequential()
                .interpolator(d3.interpolateRainbow)
                .domain(d3.extent(countryData, d => d.properties.countryCode));
//--------------color scale for Other keys---------------
    Object.keys(geoData.units).forEach((key,i) => {
      let validData = countryData.filter(d => (d.properties[key]));
      //--------------color scale for Year Keys---------------
      if (isYearKey(key)) {
        // make custom range for year keys over all annual data
        range = [Infinity,-Infinity];
        for (let d = 0; d < validData.length; d++) {
          for (let y = yearRange[key][0]; y <= yearRange[key][1]; y++) {
            let value = validData[d].properties[key][y];
            if (value < range[0]) range[0] = value;
            if (value > range[1]) range[1] = value;
          }
        }       
      // color scales for nonYear keys            
      } else {  
        range = d3.extent(validData, d => d.properties[key]);   
      }
      // set colorScales.key from range and Log or Lin based on allowLogScale and range of values
      colorScales[key] = (!allowLogScale) 
                                ? d3.scaleLinear()
                                : ((range[1] / range[0]) > logLimit) 
                                    ? d3.scaleLog() 
                                    : d3.scaleLinear();
      colorScales[key] 
        .domain(range)
          .nice()
        .range(colorRanges[i % 6])  
    });
  }

//===========================MAP ADJUSTMENT --> MOVE TO globe.js!!
  function updateColors() {
    updateMapColor();


    function updateMapColor() {
    //set color uses colorScales constant                      
      d3.selectAll('path.country')
        .transition()
          .duration(1050)
          .ease(d3.easeBackIn)
          .attr('fill', setElemColor);
    }
  }


//===============================SYNCHRONIZER==============================
  function syncClick(d) {
    let isActive = d3.select(d3.event.target).classed('active');
    d3.selectAll('#cc' + d.properties.countryCode)
      .classed('active', !isActive)
    isActive = !isActive;
    // raise clicked circle element to top
    let activeCircle = d3.select('circle#cc' + d.properties.countryCode).node()
    d3.select('svg#scatter').node().append(activeCircle);
    // add active data to activeData set
    (isActive) ? activeData.add(d) : activeData.delete(d);

  }
  function syncHover(d) {
    d3.selectAll('#cc' + d.properties.countryCode)
      .classed('hover', true)
  }


  //========================================================================
  //================TOOLTIP BEHAVIOR========================================

  function setTT() {
  //-------Tooltips------------------------
    tooltip = d3.select('body')
                    .append('div')
                    .classed('tooltip', true)
  }

  function showTooltip(d){
    // show countryName as tooltip header and activeKey (if it is not not countryCode)
    let toolTipText = `<h4>${d.properties.country}</h4>` + toolTipEntry(state.key, {isActive:true});

    // if tooltip is coming from map, show general data
    if (~d3.event.target.tagName.indexOf('path')) {
      // set selectedKeys to all selected values except state.key (to avoid duplicate entries)
      let selectedKeys = new Set([state.key, 'landArea', 'population', 'medianAge', 'fertilityRate']);
      selectedKeys.delete(state.key);
      selectedKeys.forEach(key => toolTipText += toolTipEntry(key))

    // if tooltip is coming from scatterplot show selected data
    } else if (~d3.event.target.tagName.indexOf('circle')) {  
      // store selected data in Set to avoid duplication
      let selectedKeys = new Set([state.key]);
      Object.values(scatterState).forEach(key => selectedKeys.add(key));
      selectedKeys.delete(state.key); 
      selectedKeys.forEach(key => toolTipText = toolTipText + toolTipEntry(key));
    } 
    tooltip
     .style('opacity',1)
     .html(toolTipText)
      .style('left', d3.event.clientX - (tooltip.node().offsetWidth / 2) + 'px')
      .style('top', d3.event.clientY + 25 + 'px');

    // helper function to create tooltip entries from keys of selectedKeys and active key
    function toolTipEntry(key, {isActive:isActive = false} = {}) {
      let value = (d.properties[key])
                        ? (isYearKey(key)) 
                          ? d.properties[key][state.year] 
                          : d.properties[key] 
                        : 'no data'
      // if active key is countryCode == noData, do not output line
      return (key == 'countryCode')
              ? ''
              : `<p ${(isActive) ? ' class="activeKey"' : ''}> ${camel2title(key)} 
                      ${(countryData.units[key]) 
                        ? '(' + countryData.units[key] + ')' 
                        : ''}: ${formatted(value)} </p>`
    }
  }

  function hideTooltip(d) { 
    tooltip
      .style('opacity', 0);
    d3.selectAll('#cc' + d.properties.countryCode)
      .classed('hover', false)
  }  