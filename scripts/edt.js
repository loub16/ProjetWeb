import puppeteer from 'puppeteer';

export async function getId(username, password) {
  try {
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
  } catch (error) {
    console.error(error);
    return 'Failed to get ID, check your username and password.';
  }
    return id;
}

export async function getEdt(id, datedebut, datefin) {
    try{
        const response = await fetch(`https://edt.univ-angers.fr/edt/jsonSemaine?id=${id}&dateDebut=${datedebut}&dateFin=${datefin}`,
      {
        method: 'POST'
      });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return 'Failed to get timetable, check the ID and the dates.';
    }
}