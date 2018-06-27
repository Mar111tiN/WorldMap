function makeScatter({
    width = 400,
    height = 400,
    padding = 50,
    cData = countryData,    // an array of objects containing only countryData
    minColor = 'green',
    maxColor = 'darkblue',
    rMin = 5,
    rMax = 20
} = {}) {

  var inputKey = {
    x: 'x-Axis',
    y: 'y-Axis',
    r: 'DotSize'
  };
  var data = [],
      firstRun = true,
      scatterScales = {};



  if (state.newData) {
    (firstRun) 
    ? init()
    : (initScatterSelector(),      // creates initial scatterState {x: key, y:key, color:key, r: key} + event handlers
    updateScatterSelector()
    )    // set Scatter Selector options based on available cData.units
  }

  function init() {
    setupScatterLayout();       // draw axes title  STATIC
    initScatterSelector();      // creates initial scatterState {x: key, y:key, color:key, r: key} + event handlers
    updateScatterSelector();    // set Scatter Selector options based on available cData.units
    drawScatter(); 
    firstRun = false;         // so init() only runs once
  }
  setScatterState();            // runs whenever makeScatter is called with synchronous data
  drawScatter();              // eigentlich brauch ich nur scatterScales.r !!!!!
  updateScatterRC();         // runs whenever makeScatter is called with synchronous data


  //=======================AXES===BLANK======================================     
    //----------sets up axes and legend sceletons--------------------  
  function setupScatterLayout() {         // static
    d3.select('svg#scatter')
        .attr('width', width)
        .attr('height', height)
      .append('g')
        .classed('x-axis', true)
        .attr('transform', 'translate(0,' + (height - padding) + ')')

    d3.select('svg#scatter')
      .append('g')
        .classed('y-axis', true)
        .attr('transform', 'translate(' + padding + ', 0)')
    //---------------------title----------
    d3.select('svg#scatter')
        .append('text')
            .classed('title', true)
            .style('font-size', '1.4em')
            .attr('x', width / 2)
            .attr('y', padding / 2)
            .style('text-anchor', 'middle')
    //---------------------x-legend----------
    d3.select('svg#scatter')
        .append('text')
          .classed('x-axis', true)
          .attr('x', width / 2)
          .attr('y', height - padding - 5)
          .attr('dy', '2.5em')
          .style('text-anchor', 'middle')
          .style('font-size', '1.1em')
    //---------------------y-legend----------
    d3.select('svg#scatter')
        .append('text')
          .classed('y-axis', true)
          .attr('transform', 'rotate(-90)')
          .attr('x', - height / 2)
          .attr('y', -10)
          .attr('dy', '1.5em')
          .style('font-size', '1.1em')
          .style('text-anchor', 'middle')
  }

  // creates initial scatterState object and foundations for scatter selector
  function initScatterSelector(){
    //---------filter data keys that are not state.key for additional data select----------
    var objKeys = Object.keys(cData.units).filter(key => key != state.key);
    // select default data selection for init scatter plot
    scatterState = {
        x: objKeys[0],
        y: objKeys[1],   
        r: objKeys[2]
        }; 
    // create for each inputKey (x, y, color, r) a div with a label and a select
    for (let key in inputKey) {
      d3.select('#scatterSelect')
        .append('div')
          .attr('class', 'selector')
          .text(inputKey[key])
          .append('select')
            .attr('id', 'select' + key)   // this breaks firstScatter!!!!
    // set event handlers for scatter selector
            .on('input', () => {        
              setScatterState();    // get properties of scatter selectors
              updateYearSelect();//        
              drawScatter();        // refresh scatter with new data 
            });
    }
  }
// is executed once at initiation and when new datasets are imported
  function updateScatterSelector(){
    // keyArray contains all data keys
    let keyArray = Object.keys(cData.units);
    // create a select item for each scatter item (x, y, color, r)
    for (let key in scatterState) {
      let options = d3.select('.selector #select' + key)
          .selectAll('option')
          .data(keyArray, d => d)
      options.exit().remove()
      options     
        .enter()
          .append('option')
          .property('value', d => d)
          .text(d => camel2title(d))
      // set selected based on scatterState 
          .property('selected', d => d == scatterState[key])
      }
    state.newData = false;        // does not run unless new data is coming in
  }

  // reads out scatter state from scatter selector
  // runs after changes in dataSelect and scatterSelector
  function setScatterState() {
    for (let key in scatterState) {
      scatterState[key] = d3.select(`#select${key}`)  // if this works, scatter does not work at first run
        .property('value')
    }
    console.log('scatterState: ',scatterState.x, scatterState.y, scatterState.r)
  }


// draws all circles and populates axes but does not apply colors --> updateScatterColor
  function drawScatter() {
  //=======================DATA-SETUP=================================
    //---------filter out data with incomplete data in scatterState.x or .y 
    let xyData = cData.filter(d => {
      return hasData(d, scatterState.x, scatterState.y)
    }
    );
    setScatterScales(xyData);
    updateScatterXY(xyData);
  }


  //=======================SCALES======================================
  // set scales and legends based on selected data
  function setScatterScales(data) {
      //---------prepare scales------------------------------
    var xRange = d3.extent(data, d => isYearKey(scatterState.x)
                                                ? d.properties[scatterState.x][state.year]
                                                : d.properties[scatterState.x]
                                                );
    ((xRange[1] / xRange[0]) < logLimit)
      ? scatterScales.x = d3.scaleLinear()
      : scatterScales.x = d3.scaleLog()


    scatterScales.x.domain(xRange).rangeRound([padding, width-padding]);

    var yRange = d3.extent(data, d => isYearKey(scatterState.y)
                                                ? d.properties[scatterState.y][state.year]
                                                : d.properties[scatterState.y]
                                                );
    ((yRange[1] / yRange[0]) < logLimit)
      ? scatterScales.y = d3.scaleLinear()
      : scatterScales.y = d3.scaleLog()

    scatterScales.y.domain(yRange)
                    .rangeRound([height-padding, padding])

    var rRange = d3.extent(data, d => (hasData(d, scatterState.r))
                                        ? isYearKey(scatterState.r)
                                                ? d.properties[scatterState.r][state.year]
                                                : d.properties[scatterState.r]
                                        : null);

    ((rRange[1] / rRange[0]) < logLimit)
      ? scatterScales.r = d3.scaleLinear()
      : scatterScales.r = d3.scaleLog()

    scatterScales.r.domain(rRange)
                  .range([rMin,rMax]);
    //-----------declare Axes------------------
    var xAxis = d3.axisBottom(scatterScales.x)
                    .tickSize(-height + 2 * padding)
                    .tickSizeOuter(0)
                    .tickFormat(d3.format('~s'))
                    .tickArguments([5])
    var yAxis = d3.axisLeft(scatterScales.y)
                    .tickSize(-width + 2 * padding)
                    .tickSizeOuter(0)
                    .tickFormat(d3.format('~s'))
                    .tickArguments([5])
//---grids can be styles via CSS: '.tick line'
    //-----------------call-Axes--------------------
    d3.select('g.x-axis')
      .call(xAxis)
        .style('font-size', '0.8em')
        
    d3.select('g.y-axis')
      .call(yAxis)
        .style('font-size', '0.8em')


      //----------set-Axis-titles-----------------------
    var keyText = {};
  //----------retrieve fitting key text from corresponding data attributes
    for (let key in scatterState) {
      keyText[key] = camel2title(scatterState[key])
    }
    
    d3.select('text.title')
        .text(`${keyText.x} vs ${keyText.y}`)

    d3.select('text.x-axis')
      .text(`${keyText.x}`)

    d3.select('text.y-axis')
      .text(keyText.y)

  }

  function updateScatterXY(data) {
    //=====================CREATE-&-UPDATE-PLOT=====================
    var t = d3.transition()
    .duration(1050);
    var colorScale = colorScales[state.key];
    var plot = d3.select('svg#scatter')
                .selectAll('circle')
                .data(data, d => d.properties.countryCode)
    //---------update--------------------------------
                .attr('class', 'update')
    //---------enter--------------------------------
    plot.enter()
      .append('circle')
        .attr('class', 'enter')
        .attr('id', d => 'cc' + d.properties.countryCode)
        .attr('r',1e-5)
        .attr('cx', d => {
          return isYearKey(scatterState.x)
                          ? scatterScales.x(d.properties[scatterState.x][state.year])
                          : scatterScales.x(d.properties[scatterState.x])
                          })
        .attr('cy', d => isYearKey(scatterState.y) 
                          ? scatterScales.y(d.properties[scatterState.y][state.year])
                          : scatterScales.y(d.properties[scatterState.y])
                          )
  //---------tooltip--------------------------------
        .on('click', syncClick)
        .on('mousemove touchstart', d => {
          showTooltip(d);
          syncHover(d);
        })
        .on('mouseout touchend', hideTooltip)

      .merge(plot)
        .style('opacity',0.8)
        .attr('stroke', d => hasData(d, scatterState.r) ? '#fff' : 'red')
        .attr('stroke-dasharray', d => hasData(d, scatterState.r) ? 'none' : '1.9, 0.5')

        .attr('stroke-width', d => hasData(d, scatterState.r) ? 0.7 : 1.2)

        .transition(t)
          .attr('cx', d => isYearKey(scatterState.x) 
                                ? scatterScales.x(d.properties[scatterState.x][state.year])
                                : scatterScales.x(d.properties[scatterState.x])
                                )
          .attr('cy', d => isYearKey(scatterState.y) 
                                ? scatterScales.y(d.properties[scatterState.y][state.year])
                                : scatterScales.y(d.properties[scatterState.y])
                                );

 //   ---------remove--------------------------------
    plot.exit()
      .transition(t)
      .style('opacity',0)
      .style('r', 0)
      .remove();
  }

  function updateScatterRC() {
    var colorScale = colorScales[state.key];
    var t = d3.transition()
      .duration(1050);
    d3.select('svg#scatter')
      .selectAll('circle')
      .transition(t)
      .attr('fill', d => (hasData(d, state.key))
                                ? isYearKey(state.key) 
                                  ? colorScale(d.properties[state.key][state.year])
                                  : colorScale(d.properties[state.key])
                                : 'gray'
                                )
      .attr('r', d => {
            let rad = hasData(d, scatterState.r)
                              ? isYearKey(scatterState.r) 
                                ? scatterScales.r(d.properties[scatterState.r][state.year])
                                : scatterScales.r(d.properties[scatterState.r])
                              : 10
            return rad;
          });
  }

}