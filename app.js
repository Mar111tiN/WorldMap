
//=================STATE============================== 
//---------initial projection--------
var state = {                           
  projection: null,
  hiResMap : null,
  year: null,
  key: null,
}

const links = {
    mapDataUrl : {
      hiResUrl: './data/world-50m.json',
      loResUrl: 'https://unpkg.com/world-atlas@1/world/110m.json'
      },
      dataUrl : ['./data/emmission_data.csv', './data/country_data.csv', './data/consumerprise.csv'],
      equations : ['']
  }

//fetch mapData [Array] 
getData(links);

// gets called from within data.js for asynchronous action of makeMap 
function createDisplay(mapData) {
  createDataSelect(mapData.worldLoRes);
  makeMap(mapData);
}

// !!!make a selector for data selection
function createDataSelect(data) {
  var dataSelect = d3.select('#data');
  for (let key in data.units) {
    var keyText = key.split('')[0].toUpperCase() + key.slice(1).replace( /([A-Z])/g, " $1" ).trim();
    dataSelect
      .append('option')
      .property('value', key)
      .text(keyText)
  }  
}