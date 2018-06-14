const width = 960;
const height = 600;
var delayedTT;
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
var state = {
  projection: 'mercator'
}




//=============GET DATA================================
d3.queue()
  .defer(d3.csv, './data/country_data.csv', row => ({
    country: row.country,
    countryCode: row.countryCode,
    population: +row.population,
    medianAge: +row.medianAge,
    area: +row.landArea,
    fertilityRate: +row.fertilityRate,
    popDensity: +row.population / +row.landArea
  }))
  .defer(d3.json, 'https://unpkg.com/world-atlas@1/world/110m.json')
  .await((e, populationData, mapData) => {
    if (e) throw e;
  //--------convert TopoJSON to GeoJSON
    let geoData = topojson.feature(mapData, mapData.objects.countries).features;
    let landMass = topojson.feature(mapData, mapData.objects.land).features;

  //????????????????????--Why Doesn`t it work????????????????????????
  // It seems to create exactly the right kind of data but throws error when...
  // ...accessing d.properties[val]

    // geoData.forEach(obj => {
    //     obj.properties = populationData.filter(row => row.countryCode === obj.id)[0];
    // })
  //---------link population data --> geoData.properties---------
    populationData.forEach(row => {
      var countries = geoData.filter(d => d.id === row.countryCode);
      countries.forEach(country => country.properties = row);
    });
        // console.log(geoData[0])


  //================setup projections, paths and grid
  //------------create and configure graticule grid------
    let graticule = d3.geoGraticule()


    let projections = {
      'mercator': d3.geoMercator()
                    .scale(150)
                    .translate([width / 2, height / 1.45]),
        'ortho': d3.geoOrthographic()
                    .scale(275)
                    .translate([width / 2, height / 2])
                    .clipAngle(90)
                    .precision(.1),
        'twoworld': d3.geoGilbert()
                    .scale(330)
                    .translate([width / 2, height / 1.75])
                    .clipAngle(90)
                    .precision(.1)
      };
    resetRotation(); 
    function resetRotation() {
      projections['mercator'].rotate([-15,0]);
      projections['ortho'].rotate([0,-10]);
      projections['twoworld'].rotate([30,0]);
    }

    
    //---paths is an object containing all paths accessible as paths[key]
      let paths = {
        'mercator': d3.geoPath()
                    .projection(projections['mercator']),
        'ortho': d3.geoPath()
                    .projection(projections['ortho']),
        'twoworld': d3.geoPath()
                    .projection(projections['twoworld'])
      };


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

    //---------add landMass path---------------
      svg.append('path')
        .datum(landMass[0])
        .attr('class', 'land')

    //-------add all country paths-------------        
    svg.selectAll('.country')
        .data(geoData)
        .enter()
        .append('path')
            .classed('country', true)
            .attr('id', d => d.id)
    //---------setup tooltip for Country data--------------------------
            .on('click', markCountry)
            .on('mousemove touchstart', showTooltip)
            .on('mouseout touchend', hideTooltip)

      //-------Tooltips------------------------
    var tooltip = d3.select('body')
                    .append('div')
                    .classed('tooltip', true)

  

  //===========select and set projection=============================
  //--------projection selector--------------------------------------
    d3.select('#projection')
        .on('change', () => {
          state.projection = d3.event.target.value;
          createMap()
        });


    //---initial map
    createMap('mercator');
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


//================APPLY COLORS===============================
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
                          .domain(d3.extent(populationData, d => d[val]))
        d3.selectAll('.country')
          .transition()
          .duration(750)
          .ease(d3.easeBackIn)
          .attr('fill', d => d.properties[val] ? scale(d.properties[val]) : '#ccc');
    }

    var x0,
        r0,
        rNow;

    function showTooltip(d, e){
      console.log(d, e);
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

    function dragStart(d) {
      // if (state.projection == 'twoworld') return; // gilbert
      if (state.projection == 'ortho') {          // ortho
        v0 = versor.cartesian(projections[state.projection].invert(d3.mouse(this)));
        r0 = projections[state.projection].rotate();
        q0 = versor(r0);
      } else {
        r0 = projections[state.projection].rotate()[0];                                  // mercator
        x0 = d3.event.x;
      }
    }
    function drag(d) {
      // if (state.projection == 'twoworld') return; // gilbert
      if (state.projection == 'ortho') {          // ortho
          var v1 = versor.cartesian(projections[state.projection].rotate(r0).invert(d3.mouse(this)));
          var q1 = versor.multiply(q0, versor.delta(v0, v1));
          var r1 = versor.rotation(q1);
          projections.ortho.rotate(r1);
      } else {                                    
        dx = d3.event.x - x0;
        projections[state.projection].rotate([r0 + dx / 2.87, 0]);
      }
      createMap();
    }

    function markCountry() {
      d3.select(d3.event.target)
        .classed('active', !d3.select(d3.event.target).classed('active'))
    }

    });