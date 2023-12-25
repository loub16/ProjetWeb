import puppeteer from 'puppeteer';
/** Get the id of a student based on its username and password from the UA website
 * @param {string} username The username of the student
 * @param {string} password the password of the student
 * @returns {string} the id of the student
 * */
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
    return id;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to execute Puppeteer action');
  }
}

/** Get the timetable of a student based on its id and the date of the week
 * @param {string} id The id of the student
 * @param {string} datedebut date of the first day of the week in format : YYYYMMDD
 * @param {string} datefin date of the last day of the week in format : YYYYMMDD
 * @returns {JSON} the timetable in JSON
 * */
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