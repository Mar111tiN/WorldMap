const express = require('express');
const ejs = require('ejs');
const app = express();
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs')
app.get('/', function(req, res) {
    res.render('index');
});

app.listen(8080, function() {
    console.log('Worldmap running on 8080')
})
