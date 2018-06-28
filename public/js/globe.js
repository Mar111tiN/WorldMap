function makeMap({
  width = 750,
  height = 400,
  init = {
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


} = {}) {
  //================makeMap SCOPE=========================
  //--------------bounding values for projections-------------

  var x0,
      y0,
      r0,
      v0,
      q0,
      ty0,
      tmin,
      tmax,
      scaleFactor,
      projections,
      zoom,
      paths,
      firstRun = true;

    if (firstRun) initMap()
  
    function initMap() {
      setupMap();               // setup static map elements and selects with event handlers
      setupProjections(); //  ||--> STATE.scale
      resetProjection();  //  reset scales and translation after projection change
      firstRun = false;         // so init() only runs once
    }

  updatePaths();    //   STATE.projection --> |paths|
  updateMap();      // STATE.projection --> |map d|


  // ================Create Static Map Elements==================  
  function setupMap() {
    state.scale = init.defaultZoom.mercator;          //-----set scale State
    map
      .attr('width', width)
      .attr('height', height)
  //-------add drag functionality-------------
    map.call(d3.drag()
        .on('start', dragStart)
        .on('drag', drag))

    //-------add graticule path)
    let graticule = d3.geoGraticule()
    map.append('path')
      .datum(graticule)
      .attr('class', 'graticule')

    //-------add globe cover--------------------
    map.append('circle')
        .attr('class', 'globecover')
    //==========Selectors=======================
    //--------projection selector--------------------------------------
    projectionSelect
      .on('change', () => {
        setState();
        resetProjection(); // reset rotation and scale to default/ set state
        updateMap();
      });

     //--------Resolution selector--------------------------------------     
    d3.select('#resolution')
      .on('click', () => {
        setState();
      //   hiRes  Option --> state
        ({geoData:geoData, landMass:landMass, countryData:countryData} = updateData());
        updatePaths();
        updateMap();
      });

    //------initialize zoom----------------
    zoom = d3.zoom()
      .scaleExtent(init.zoomScale[state.projection])   //--------initial zoom scale
      .on('zoom', zoomIt);
    map.call(zoom);

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
    map.select('.land')
                  .datum(landMass[0])
                    .append('path')
                    .attr('class', 'land')
                    .attr('d', paths[state.projection])
      d3.selectAll('.country')

    //-------add all country paths-------------        
    let country = map.selectAll('.country')
        .data(geoData, d => d.properties.countryCode)
        .classed('updated', true)
        .attr('d', paths[state.projection])
    country.exit().remove();
    country.enter()
        .append('path')
            .classed('country', true)
            .on('click', syncClick)
            .on('mousemove touchstart', d => {
              showTooltip(d);
              syncHover(d);
            })
            .on('mouseout touchend', hideTooltip)
            .attr('id', d => 'cc' + d.properties.countryCode)
            .attr('d', paths[state.projection])
  }



  //------Path refresher based on selected paths
  function updateMap() {
      map.classed('flat', () => state.projection == 'mercator');

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
    // by default, at scale 90 and ty = h / 2 full map is covered (-90 < lat < 90)
    // impacting factors are (scale / 90) and (maxLat / 90) --> go figure!
      tmin = height * (1 - state.scale * init.maxLat.bottom / 16200);
      tmax = height * state.scale  * init.maxLat.top / 16200;
  }
}