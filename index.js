const express = require('express');
const ejs = require('ejs');
const app = express();
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs')
app.get('/', function(req, res) {
    res.render('index');
});

app.listen(3000, function() {
    console.log('"TopoWorldMap running on 3000')
})
