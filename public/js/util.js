//============LITTLE HELPERS
const camel2title = (w)=>w.replace(/([A-Z])/g,(m)=>` ${m}`).replace(/^./, (m)=>m.toUpperCase());
const camelCaseIt = s=>(a=>(a.length-1)?a.reduce((s,w,i)=>(i>0)?s+w[0].toUpperCase()+w.slice(1).toLowerCase():s+w.toLowerCase(),''):a[0][0].toLowerCase()+a[0].slice(1))(s.trim().split(/[.\-_\s]/g));
const isYearKey = (key) =>  ((typeof countryData[0].properties[key]) == 'object')
// checks whether obj has valid numerical keys for these keys (required for scatter display in x and y )
function hasData(obj, ...keys) {
  let isValid = true;
  keys.forEach(key => {
    let keyValid = (obj.properties[key])
                    ? isYearKey(key)
                      ? (typeof obj.properties[key][state.year] == 'number')
                      : (typeof obj.properties[key] == 'number')
                    : false;
    isValid = isValid && keyValid
  })
  return isValid;
}

// get fill color from elem data and state.key --> used by scatter, map and bar chart
const setElemColor = d => (hasData(d, state.key))
                            ? isYearKey(state.key) 
                              ? colorScales[state.key](d.properties[state.key][state.year])
                              : colorScales[state.key](d.properties[state.key])
                            : '#ccc'

// formats numerical data into readable output with separator (defined as global const) and appropriate rounding
const formatted = (value, sep = digitSeparator, dec = decimalAdjust) => 
  (value >= 1e10)
    ? Math.round(value / 1e9 * dec) / dec + ' bil'
    : (value >= 1e7)
      ? Math.round(value / 1e6 * dec) / dec + ' mil'
      : (value >= 1e6)
        ? Math.floor(value / 1e6).toString() + sep 
          + Math.floor((value - Math.floor(value / 1e6) * 1e6) / 1e3).toString() + sep 
          + Math.floor((value - Math.floor(value / 1e3) * 1e3) * dec) / dec + ''
        : (value >= 1e3)
          ? Math.floor(value / 1e3).toString() + sep 
            + Math.floor((value - Math.floor(value / 1e3) * 1e3) * dec) / dec + ''
          : Math.floor((value) * 100) / 100 + ''
