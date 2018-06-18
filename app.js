
//=================STATE============================== 
//---------initial projection--------
var state = {                           
  projection: 'mercator',
  HiResMap : false
}

const links = {
    mapDataUrl : {
      hiResUrl: './data/world-50m.json',
      loResUrl: 'https://unpkg.com/world-atlas@1/world/110m.json'
      },
    dataUrl : ['./data/emmission_data.csv', './data/country_data.csv']
  }

//fetch mapData [Array] 
getData(links);

// gets called from within data.js for asynchronous action of makeMap 
function createDisplay(mapData) {
  createDataSelect();
  makeMap(mapData);
}

// !!!make a selector for data selection
//function createDataSelect