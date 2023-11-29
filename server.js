import {getTransportAt} from './scripts/trajet.js';
import {getId, getEdt} from './scripts/edt.js';
import  http from 'http';
import express from 'express';


import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
const app = express();

// Serve static files from the 'express' directory
app.use(express.static(path.join(__dirname, 'express')));

// Getting the ID of the user with puppeteer by logging in the edt website
app.get('/getID', async (req, res) => {
  //Getting the username and password from the request
  const username = req.query.username;
  const password = req.query.password;
  try {
    const id = await getId(username, password);
    res.send(id);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error executing Puppeteer action');
  }
});

// Getting the timetable of the student with the API of the edt website
app.get('/getEdt', async (req, res) => {
  const id = req.query.id;
  const datedebut = req.query.dateDebut;
  const datefin = req.query.dateFin;
  try {
    const data = await getEdt(id, datedebut, datefin);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error executing fetching edt');
  }

});
app.get('/getTransport', async (req, res) => {
  var list=getTransportAt(req.query.arret, new Date('August 19, 1975 23:15:30')).then((value) => {
    res.json(value)
  })
});

// Sending the page to the client
app.use('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/express/index.html'));
});

const server = http.createServer(app);
const port = 3000;
server.listen(port, () => {
  console.debug('Server listening on port ' + port);
});
