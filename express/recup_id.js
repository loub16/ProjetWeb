async function get_ID(username, password){
    
    
    let browser = await puppeteer.launch();
    let page = await browser.newPage();
    //pour polytech
    await page.goto("https://edt.univ-angers.fr/edt/ressources?id=G9FDC055BB1B94F92E0530100007F467B");
    
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
    
    //login
    await page.type("#username", username);
    await page.type("#password", password);
    await page.click('input.btn.btn-submit');
    await page.waitForSelector('div.fc-title'); // Wait for a button to appear
    await page.screenshot({ path: "screenshot.png" }); // Specify the file path to save the screenshot   
    const content = await page.content();
    var id = content.split("webcal://edt.univ-angers.fr/edt/ics?id=")[1]
    id = id.split("<")[0]
    console.log("id : ", id)
    await browser.close();
    return id;
}