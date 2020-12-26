const express = require('express');
const app = express();
const api = require('./api.js');

app.get('/', (req, res)=>{
    res.sendFile('/public/index.html', {root: __dirname});
})

app.use('/api', api);

app.use(express.static('public'))

app.listen(3000);