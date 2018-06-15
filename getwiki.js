

const countryWiki = 'U.S';

let countryWikiUrl = 'https://en.wikipedia.org/wiki/'

d3.queue()
    .defer(d3.xml, 'https://en.wikipedia.org/wiki/')
    .await( (e, wikiData) => {
        if(e) throw e;
        console.log(wikiData)
    } )