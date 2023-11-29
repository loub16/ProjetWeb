import {getTransportAt} from './trajet.js';
import  http from 'http';
import express from 'express';
import puppeteer from 'puppeteer';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
const app = express();


// Getting the ID of the user with puppeteer by logging in the edt website
app.get('/getID', async (req, res) => {
  //Getting the username and password from the request
  const username = req.query.username;
  const password = req.query.password;
  //Launching puppeteer
  try {
    //Puppeteer connects to the edt website
    let browser = await puppeteer.launch();
    let page = await browser.newPage();
    await page.goto("https://edt.univ-angers.fr/edt/ressources?id=G9FDC055BB1B94F92E0530100007F467B");
    //Puppeteer clicks on the button to log in
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('article.text-center.g-color-white.g-overflow-hidden h2');
      for (const button of buttons) {
        if (button.textContent.trim() === 'Mon Emploi du temps') {
          button.click();
          break;
        }
      }
    });
    await page.waitForNavigation()
    //Puppeteer fills the username and password fields
    await page.type("#username", username);
    await page.type("#password", password);
    //Puppeteer clicks on the submit button
    await page.click('input.btn.btn-submit');
    await page.waitForSelector('div.fc-title');
    //Puppeteer gets the content of the page
    const content = await page.content();
    //Parsing the content to get the id
    var id = content.split("webcal://edt.univ-angers.fr/edt/ics?id=")[1]
    id = id.split("<")[0]
    await browser.close();
    //Sending the id to the client
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
    const response = await fetch(`https://edt.univ-angers.fr/edt/jsonSemaine?id=${id}&dateDebut=${datedebut}&dateFin=${datefin}`,
      {
        method: 'POST'
      });
    const data = await response.json();
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
