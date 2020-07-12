![World Map Screenshot](https://github.com/Mar111tiN/WorldMap/blob/master/worldmap-small.png?raw=true)
### interactive world map showcasing d3.js
+ features three different projections, 5 coloring schemes

+ has drag-n-drop capability for all projections
+ allows selecting individual countries with live update in all panes
+ shows tooltips for individual countries

+ best enjoyed as a container:
`docker run --rm -d -p <yourport>:8080 --name worldmap martin37szyska/worldmap`
  * see on [docker hub](https://hub.docker.com/r/martin37szyska/worldmap)

+ if not running in a container, run node index.js in an environment containing node.js >=12



