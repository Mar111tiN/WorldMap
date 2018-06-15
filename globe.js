

function makeMap(geoData110, landMass110, geoData50, landMass50) {
  //================makeMap SCOPE=========================
  const width = 960;
  const height = 600;
  var x0,
      y0,
      r0,
      ty0,
      rNow,
      tmin,
      tmax,
      scaleFactor,
      geoData,
      landMass;

  //===============SET DEFAULTS=========================

  //--------------color scales for individual data types
  const colorScales = {           
              countryCode:  d3.scaleSequential()
                              .interpolator(d3.interpolateRainbow),
              population:   d3.scaleLinear()
                            .range(['white', 'purple']),
              medianAge:    d3.scaleLinear()
                            .range(['white', 'black']),
              fertilityRate: d3.scaleLinear()
                            .range(['black', 'orange']),
              popDensity:   d3.scaleLinear()
                            .range(['white', 'red'])
          };
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

  //------------create projections object for easy switching between projections------
  let projections = {
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
  let paths = {
    'mercator': d3.geoPath()
                .projection(projections.mercator),
    'ortho': d3.geoPath()
                .projection(projections['ortho']),
    'twoworld': d3.geoPath()
                .projection(projections['twoworld'])
  };

  state.scale = init.defaultZoom.mercator;          //-----set scale State

  let graticule = d3.geoGraticule()
  // ================Create Static Map Elements    
  var svg = d3.select('svg')
      .attr('width', width)
      .attr('height', height)
  //-------add drag functionality-------------
  svg.call(d3.drag()
      .on('start', dragStart)
      .on('drag', drag))

  //-------add graticule path)
  svg.append('path')
    .datum(graticule)
    .attr('class', 'graticule')

  //-------add globe cover--------------------
  svg.append('circle')
      .attr('class', 'globecover')

  updatePaths();
  createMap();

//=================UPDATE PATH DATA=================================
  d3.select('#res')
    .on('click', () => {
      state.hiResMap = d3.select('#res input').node().checked;
    //   hiRes  Option --> state
      updatePaths();
    });
  //---------add landMass path---------------
  function updatePaths() {
    geoData = state.hiResMap ? geoData50 : geoData110;
    landMass = state.hiResMap ? landMass50 : landMass110;
    var land = svg.select('.land')
                  .datum(landMass[0])
                    .append('path')
                    .attr('class', 'land')
                    .attr('d', paths[state.projection])
      d3.selectAll('.country')

    //-------add all country paths-------------        
    map = svg.selectAll('.country')
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

    //---------setup tooltip for Country data--------------------------
  }
    //-------Tooltips------------------------
  var tooltip = d3.select('body')
                  .append('div')
                  .classed('tooltip', true)

  //------initialize zoom----------------
  var zoom = d3.zoom()
    .scaleExtent(init.zoomScale[state.projection])   //--------initial zoom scale
    .on('zoom', zoomIt);
  svg.call(zoom);


  //===========SET PROJECTION=============================
  resetProjection('mercator'); 
  //--------projection selector--------------------------------------
  d3.select('#projection')
      .on('change', () => {
        resetProjection(d3.event.target.value)               // reset rotation and scale to default/ set state
        createMap()
      });

  function resetProjection(p) {
    state.projection = p;               // update projection state
    zoom.scaleExtent(init.zoomScale[p])     // adjust zoom range
    projections[p].rotate(init.defaultRotation[p]); // default rotation
    projections[p].scale(init.defaultZoom[p]);      // default Zoom
  }

  //---initial map
  createMap(state[projection]);
  //------Map refresher based on selected paths
  function createMap() {
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

  //================APPLY COLORS BY DATA===============================
  //----------------get data from selector-----------------------
  var dataSelect = d3.select('#data');
  dataSelect
      .on('change', d => setColor(d3.event.target.value))
  //------apply default coloring
  setColor(dataSelect.property('value'));


  function setColor(val) {
  //set color uses colorScales constant     
    if (val == 'nodata') val = 'countryCode';
      var scale = colorScales[val]
                        .domain(d3.extent(geoData, d => d.properties[val]))
      d3.selectAll('.country')
        .transition()
        .duration(750)
        .ease(d3.easeBackIn)
        .attr('fill', d => d.properties[val] ? scale(d.properties[val]) : '#ccc');
  }

  //========================================================================
  //================TOOLTIP BEHAVIOR========================================
  function showTooltip(d, e){
    tooltip
     .style('opacity',1)
     .html(`
        <h4>${d.properties.country}</h4>
        <p>Area (km2): ${d.properties.area} </p>
        <p>Population (Mio): ${Math.round(d.properties.population / 1e4)/1e2} </p>
        <p>Median Age: ${d.properties.medianAge} </p>
        <p>Fertility Rate: ${d.properties.fertilityRate} </p>
        <p>Population Density (/km2): ${Math.round(d.properties.popDensity*100) /100}</p>
      `)
      .style('left', d3.event.x - (tooltip.node().offsetWidth / 2) + 'px')
     .style('top', d3.event.y + 25 + 'px')
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
      dx = d3.event.x - x0;
      dy = d3.event.y - y0;

      dt = Math.max(Math.min(ty0 + dy, tmax), tmin)
      scaleFactor = 57 / state.scale;
      projections[state.projection].translate([width / 2, dt]);
      projections[state.projection].rotate([r0 + dx * scaleFactor, 0]);
    }
    createMap();
  }

  //========================================================================
  //================ZOOM BEHAVIOR===========================================


  //------catch zoom value from d3.event----------------
  function zoomIt() {
    if (d3.event) {
      state.scale = d3.event.transform.k;       //-----  scale --> state
      projections[state.projection].scale(state.scale);
      if (state.projection == 'mercator') containPan(); // keep translate within boundaries
      createMap();
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