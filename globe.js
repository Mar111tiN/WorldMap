

function makeMap({worldLoRes, landLoRes, worldHiRes, landHiRes}) {
  //================makeMap SCOPE=========================
  const width = 960;
  const height = 600;
  var x0,
      y0,
      r0,
      v0,
      q0,
      ty0,
      tmin,
      tmax,
      scaleFactor,
      geoData,
      countryData,
      landMass,
      projections,
      zoom,
      range,
      tooltip,
      paths,
      yearSelect;
  var colorScales = {},
      yearRange = {},   // object of {yearKey: [min, max]} | is computed by setYearRanges();;
      state = {};
  var firstRun = true;
  var svg = d3.select('svg');
  var dataSelect = d3.select('#data');
  const logLimit = 200;
  const camel2title = (camelCase) => camelCase.replace(/([A-Z])/g, (match) => ` ${match}`).replace(/^./, (match) => match.toUpperCase());
  var allowLogScale = false;
  


  //===============SET DEFAULTS=========================
  //--------------color ranges for data types !! add more!!
  const colorRanges = [
    ['white', 'purple'],
    ['white', 'black'],
    ['black', 'orange'],
    ['white', 'red'],
    ['green', 'red'],
    ['white', 'black'],
    ['red', 'green'],
  ];

  //--------------bounding values for projections-------------
  const init = {
    zoomScale : {
      'mercator' : [150, 2000],
      ortho: [275, 2000],
      'twoworld': [300, 2000]
    },
    defaultZoom : {
      mercator: 150,
      'ortho': 275,
      'twoworld': 300 
    },
    defaultRotation : {
      mercator: [-11.2,0],
      'ortho': [0,-10],
      'twoworld': [30,0] 
    },
    maxLat : {
        top: 81,
        bottom: 81
      }
  }
//===============INIT===================
  setState();   // init: STATE.year --> 2000
  updateData(); // state --> |geoData + landMass|
  setCCColorScale();
  setYearRange(); //initialize yearRange 
  updateYearSelect(); // state --> |year Range Bar|
  setupMap();   //    ||--> STATE.key
  setupProjections(); //  ||--> STATE.scale
  resetProjection();  //  input--> |projections|--> STATE.projection
  updatePaths();    //   STATE.projection --> |paths|
  updateMap();      // STATE.projection --> |svg d|
  setColorScales();
  setColor();    //  STATE.year --> |svg color|-  apply coloring
  firstRun = false;   //checked by updateYearColor


  //==================STATE====================================
  function setState() {
    state.projection = d3.select('#projection').property('value');
    state.hiResMap = d3.select('#res input').node().checked;
    state.year = (firstRun) ? 2000 : +yearSelect.property('value');
    state.key = dataSelect.property('value'); 
  }

  //==================DATA select====================================
  function updateData() {
    geoData = state.hiResMap ? worldHiRes : worldLoRes;
    landMass = state.hiResMap ? landHiRes : landLoRes;
    //    countryData contains only valid countries
    countryData = geoData.filter(d => ((d.properties.country) || (d.properties.countryCode)));
    countryData.units = geoData.units;
  }  

//==================YEAR RANGES FOR SCALES AND YEAR SELECTOR=================
  function setYearRange() {
    for (let key in geoData.units) {
      if (isYearKey(key)) {
        yearRange[key] = getYearRange(key);
      }
    }
    return yearRange;
  }
  // get the global year range for passed-in key
  function getYearRange(key) {
    // iterate over all countries in countryData and store individual ranges in rangeArray
    let rangeArray = countryData
    .filter(obj => obj.properties[key])
      .map(obj => d3.extent(Object.keys(obj.properties[key])));
  // get minimum of rangeArray minima
    let min = d3.min(rangeArray, d => d[0]);
  // get maximum of rangeArray maxima
    let max = d3.max(rangeArray, d => d[1]);
    return [min, max];
  }

  function isYearKey(key) {
    return ((typeof countryData[0].properties[key]) == 'object')
  }

  function updateYearSelect() {
    // use state.key if it is a year key or the first key in the yearRange object
    let key = isYearKey(state.key) ? state.key : Object.keys(yearRange)[0];
    yearSelect = d3.select('#year')
      .property("min", yearRange[key][0])
      .property("max", yearRange[key][1])
      .property("value", Math.max(+state.year, yearRange[key][0]));
    d3.select('selector.year')
      .insert('span', '#year').text(yearRange[key][0])     
    d3.select('selector.year').append('span').text(yearRange[key][1]) 
  }

  // ================Create Static Map Elements==================  
  function setupMap() {
    state.scale = init.defaultZoom.mercator;          //-----set scale State
    svg
      .attr('width', width)
      .attr('height', height)
  //-------add drag functionality-------------
    svg.call(d3.drag()
        .on('start', dragStart)
        .on('drag', drag))

    //-------add graticule path)
    let graticule = d3.geoGraticule()
    svg.append('path')
      .datum(graticule)
      .attr('class', 'graticule')

    //-------add globe cover--------------------
    svg.append('circle')
        .attr('class', 'globecover')
    //==========Selectors
    //===============Central DATA selector for all 
    //----------------get data from selector-----------------------
    dataSelect
      .on('change', () => {
        setState();  
        if (isYearKey(state.key)) {
          d3.select('.year').classed('hidden', false);
          updateYearSelect();    
        }
   //  key-->STATE
        setColor();
      })

    updateYearSelect();
    yearSelect
      .on("input", () => {
        setState();
        setColor();
      });
    //--------projection selector--------------------------------------
    d3.select('#projection')
      .on('change', () => {
        setState();
        resetProjection(); // reset rotation and scale to default/ set state
        updateMap();
        setColor(state.key);
      });

     //--------Resolution selector--------------------------------------     
    d3.select('#res')
      .on('click', () => {
        setState();
      //   hiRes  Option --> state
        updateData();
        updatePaths();
      });
    //-------Tooltips------------------------
    tooltip = d3.select('body')
                    .append('div')
                    .classed('tooltip', true)

    //------initialize zoom----------------
    zoom = d3.zoom()
      .scaleExtent(init.zoomScale[state.projection])   //--------initial zoom scale
      .on('zoom', zoomIt);
    svg.call(zoom);

  }


  // ===============SETUP STATIC PROJECTION ELEMENTS==================  
  function setupProjections() {
      //------------create projections object for easy switching between projections------
    projections = {
      'mercator': d3.geoMercator()
                    .translate([width / 2, height / 1.45])
                    .rotate([-11.2,0,0]),
        'ortho': d3.geoOrthographic()
                    .translate([width / 2, height / 2])
                    .clipAngle(90)
                    .precision(.1),
        'twoworld': d3.geoGilbert()
                    .translate([width / 2, height / 1.75])
                    .clipAngle(90)
                    .precision(.1)
    };

    //---paths is an object containing all paths accessible as paths[key]
    paths = {
      'mercator': d3.geoPath()
                  .projection(projections.mercator),
      'ortho': d3.geoPath()
                  .projection(projections['ortho']),
      'twoworld': d3.geoPath()
                  .projection(projections['twoworld'])
    };
  }
  //===========SET PROJECTION=============================
  function resetProjection() {
    zoom.scaleExtent(init.zoomScale[state.projection])     // adjust zoom range
    projections[state.projection].rotate(init.defaultRotation[state.projection]); // default rotation
    projections[state.projection].scale(init.defaultZoom[state.projection]);      // default Zoom
  }

//=================UPDATE PATH DATA=================================

  function updatePaths() {
    //---------add landMass path---------------
    svg.select('.land')
                  .datum(landMass[0])
                    .append('path')
                    .attr('class', 'land')
                    .attr('d', paths[state.projection])
      d3.selectAll('.country')

    //-------add all country paths-------------        
    let map = svg.selectAll('.country')
        .data(geoData, d => d.properties.countryCode)
        .classed('updated', true)
        .attr('d', paths[state.projection])
    map.exit().remove();
    map.enter()
        .append('path')
            .classed('country', true)
            .on('click', markCountry)
            .on('mousemove touchstart', showTooltip)
            .on('mouseout touchend', hideTooltip)
            .attr('id', d => d.properties.countryCode)
            .attr('d', paths[state.projection])
  }



  //------Path refresher based on selected paths
  function updateMap() {
      svg.classed('flat', () => state.projection == 'mercator');

      d3.selectAll('.land')
          .attr('d', paths[state.projection])

      d3.selectAll('.country')
          .attr('d', paths[state.projection]);

      d3.select('.globecover')
        .attr('cx', projections[state.projection].translate()[0])
        .attr('cy', projections[state.projection].translate()[1])
        .attr('r', projections[state.projection].scale())

      d3.select('.graticule')
          .attr('d', paths[state.projection])
  }

  //--------------color scale for NoData---------------
  function setCCColorScale() {
    colorScales.countryCode = d3.scaleSequential()
                .interpolator(d3.interpolateRainbow)
                .domain(d3.extent(countryData, d => d.properties.countryCode));
              }
  //================APPLY COLORS===============================
    //--------------color scales for individual data types
  function setColorScales() {

//--------------color scale for Other keys---------------
    Object.keys(geoData.units).forEach((key,i) => {
      let validData;
      //--------------color scale for Year Keys---------------
      if (isYearKey(key)) {
        validData = countryData.filter(data => (data.properties[key]));
        // make custom extent
        range = [Infinity,-Infinity];
        for (let d = 0; d < validData.length; d++) {
          for (let y = yearRange[key][0]; y <= yearRange[key][1]; y++) {
            let value = validData[d].properties[key][y];
            if (value < range[0]) range[0] = value;
            if (value > range[1]) range[1] = value;
          }
        }                   
      } else {

        validData = countryData.filter(d => (d.properties[key]));
        range = d3.extent(validData, d => d.properties[key]);   
      }
      // true is a placeholder for log evaluation (false)
      colorScales[key] = (!allowLogScale) ? d3.scaleLinear()
                                : ((range[1] / range[0]) > logLimit) 
                                    ? d3.scaleLog() 
                                    : d3.scaleLinear();
      colorScales[key].domain(range).range(colorRanges[i % 6])   
    });
  }

  function setColor() {
      let key = state.key;
  //set color uses colorScales constant     
      var cScale = colorScales[key];                    
      d3.selectAll('.country')
        .transition()
        .duration(750)
        .ease(d3.easeBackIn)
        .attr('fill', d => (d.properties[key]) 
                              ? (isYearKey(key)) 
                                  ? (d.properties[key][state.year])
                                    ? cScale(d.properties[key][state.year]) 
                                    : '#ccc'
                                  : (d.properties[key])
                                    ? cScale(d.properties[key]) 
                                    : '#ccc'
                              : '#ccc'
                            );
  }

  //========================================================================
  //================TOOLTIP BEHAVIOR========================================
  function showTooltip(d, e){
    let currentValue = (d.properties[state.key])
                        ? (isYearKey(state.key)) 
                          ? d.properties[state.key][state.year] 
                          : d.properties[state.key] 
                        : 'no data'
    tooltip
     .style('opacity',1)
     .html(`
        <h4>${d.properties.country}</h4>
        <p class="activeKey"> ${camel2title(state.key)} ${(countryData.units[state.key]) ? '(' + countryData.units[state.key] + ')' : ''}: 
        ${currentValue} </p>
        <p>Area (km2): ${d.properties.landArea} </p>
        <p>Population (Mio): ${Math.round(d.properties.population / 1e4)/1e2} </p>
        <p>Median Age: ${d.properties.medianAge} </p>
        <p>Fertility Rate: ${d.properties.fertilityRate} </p>
        <p>Population Density (/km2): ${Math.round(d.properties.populationDensity*100) /100}</p>
      `)
      .style('left', d3.event.x - (tooltip.node().offsetWidth / 2) + 'px')
      .style('top', d3.event.y + 25 + 'px');
    d3.select('.activeKey')
      .style('background', d3.select(`#id${d.properties.countryCode}`)).style('fill');
  }

  function hideTooltip() { 
    tooltip
      .style('opacity', 0)
  }  
  //========================================================================
  //================DRAG BEHAVIOR===========================================
  function dragStart(d) {
    // if (state.projection == 'twoworld') return; // gilbert
    if (state.projection == 'ortho') {          // ortho
      v0 = versor.cartesian(projections[state.projection].invert(d3.mouse(this)));
      r0 = projections[state.projection].rotate();
      q0 = versor(r0);
    } else {
      r0 = projections[state.projection].rotate()[0];                                  // mercator
      x0 = d3.event.x;
      y0 = d3.event.y;
      ty0 = projections[state.projection].translate()[1];
      setPanLimit();
    }
  }
  function drag(d) {
    // if (state.projection == 'twoworld') return; // gilbert
    if (state.projection == 'ortho') {          // ortho
        var v1 = versor.cartesian(projections.ortho.rotate(r0).invert(d3.mouse(this)));
        var q1 = versor.multiply(q0, versor.delta(v0, v1));
        var r1 = versor.rotation(q1);
        projections.ortho.rotate(r1);
    } else {                                    
      let dx = d3.event.x - x0;
      let dy = d3.event.y - y0;

      dt = Math.max(Math.min(ty0 + dy, tmax), tmin)
      scaleFactor = 57 / state.scale;
      projections[state.projection].translate([width / 2, dt]);
      projections[state.projection].rotate([r0 + dx * scaleFactor, 0]);
    }
    updateMap();
  }

  //========================================================================
  //================ZOOM BEHAVIOR===========================================
  //------catch zoom value from d3.event----------------
  function zoomIt() {
    if (d3.event) {
      state.scale = d3.event.transform.k;       //-----  scale --> state
      projections[state.projection].scale(state.scale);
      if (state.projection == 'mercator') containPan(); // keep translate within boundaries
      updateMap();
    }
  }
  //------------------contain view within panLimit during scaling for mercator----------
  function containPan() {
    setPanLimit();
    if (projections.mercator.translate()[1] >= tmax) projections.mercator.translate([width / 2, tmax]);
    else if (projections.mercator.translate()[1] <= tmin) projections.mercator.translate([width / 2, tmin]);
  }
  //----------set translate limits based on scaling (state.scale)
  function setPanLimit() {
    // by default, at scale 90 and ty = h / 2 full svg is covered (-90 < lat < 90)
    // impacting factors are (scale / 90) and (maxLat / 90) --> go figure!
      tmin = height * (1 - state.scale * init.maxLat.bottom / 16200);
      tmax = height * state.scale  * init.maxLat.top / 16200;
  }


  //========================================================================
  // =================INTERACTIVITY========================================
  //----------------select countries-------------------------------------
  function markCountry() {
    d3.select(d3.event.target)
      .classed('active', !d3.select(d3.event.target).classed('active'))
  }
}