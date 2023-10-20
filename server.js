const http = require('http');
const express = require('express');
const path = require('path');
const puppeteer = require("puppeteer");
const app = express();
app.use(express.json());
app.use(express.static("express"));

// Récupération de l'id de l'étudiant avec Puppeteer depuis une requête GET
app.get('/getID', async (req, res) => {
  //Récupération de l'identifiant et du mot de passe depuis les parametres de la requête
  const username = req.query.username;
  const password = req.query.password;
  //Lancement de Puppeteer
  try {
    //Puppeteer va sur la page de l'edt de l'université d'Angers
    let browser = await puppeteer.launch();
    let page = await browser.newPage();
    await page.goto("https://edt.univ-angers.fr/edt/ressources?id=G9FDC055BB1B94F92E0530100007F467B");
    //Puppeteer clique sur le bouton "Mon emploi du temps"
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
    //Puppeteer remplit les champs de login
    await page.type("#username", username);
    await page.type("#password", password);
    //Puppeteer clique sur le bouton de login
    await page.click('input.btn.btn-submit');
    await page.waitForSelector('div.fc-title'); 
    //Puppeteer récupère le contenu de la page 
    const content = await page.content();
    //Parse du contenu pour récupérer l'id de l'étudiant
    var id = content.split("webcal://edt.univ-angers.fr/edt/ics?id=")[1]
    id = id.split("<")[0]
    await browser.close();
    //Envoi de l'id dans la réponse
    res.send(id);
  }catch (error) {
    console.error(error);
    res.status(500).send('Error executing Puppeteer action');
  }
});

// Affichage de la page html
app.use('/', function(req,res){
  res.sendFile(path.join(__dirname+'/express/index.html'));
});

const server = http.createServer(app);
const port = 3000;
server.listen(port, () => {
    console.debug('Server listening on port ' + port);
});
