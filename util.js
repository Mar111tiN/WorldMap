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