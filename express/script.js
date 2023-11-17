document.addEventListener('DOMContentLoaded', () => {
    const executeButton = document.getElementById('executeButton');
    const resultElement = document.getElementById('result');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    executeButton.addEventListener('click', async () => {
        try {
            const username = usernameInput.value;
            const password = passwordInput.value;

            if (!username || !password) {
                resultElement.textContent = 'Please enter both username and password.';
                return;
            }

            const id = await getId(username, password);
            resultElement.textContent = 'ID : ' + id;

            //get the first and last day of the week in two variables
            const [firstday, lastday] = getFirstAndLastDayOfWeek();
            //get the edt of the week
            const edt = await getEdt(id, firstday, lastday);
            //get the last lesson hour of the day
            const lastLessonHour = getLastLessonHour(edt);
            resultElement.textContent = "Heure de fin des cours d'aujourd'hui : " + lastLessonHour;
        } catch (error) {
            console.error(error);
            resultElement.textContent = 'Failed to get ID, check your username and password.';
        }
    });
});

async function getId(username, password) {
    try {
        //encodage des paramètres pour l'URL
        const encodedUsername = encodeURIComponent(username);
        const encodedPassword = encodeURIComponent(password);

        const response = await fetch(`/getID?username=${encodedUsername}&password=${encodedPassword}`, {
            method: 'GET',
        });

        if (response.ok) {
            return response.text();
        } else {
            console.error('Failed to execute Puppeteer action');
            return 'Failed to get ID, check your username and password.';
        }
    } catch (error) {
        console.error(error);
    }
}

async function getEdt(id, datedebut, datefin) {
    try {
        //recuperation de l'edt
        const response = await fetch(`/getEdt?id=${id}&dateDebut=${datedebut}&dateFin=${datefin}`);
        const edt = await response.json();
        return edt
    } catch (error) {
        console.error(error);
    }

}

//Get the first day and last day of the week in format : YYYYMMDD
function getFirstAndLastDayOfWeek() {
    var curr = new Date();
    var first = curr.getDate() - curr.getDay() + 1;
    var last = first + 6;

    // Create new Date objects for firstday and lastday
    var firstday = new Date(curr.setDate(first)).toISOString().slice(0, 10).replace(/-/g, "");
    curr = new Date(); // Reset curr to the current date
    var lastday = new Date(curr.setDate(last)).toISOString().slice(0, 10).replace(/-/g, "");
    return [firstday, lastday];
}

function getLastLessonHour(json){
    let lastHour = "";
    
    json.forEach(lesson => {
        lesson = JSON.stringify(lesson);
        lesson = JSON.parse(lesson);
        const date_debut = lesson.date_debut;
        const current_date = new Date();
        if (date_debut.slice(0,2) == current_date.getDate() && date_debut.slice(3,5) == (current_date.getMonth() +1) && date_debut.slice(6,10) == current_date.getFullYear()){
            lastHour = lesson.date_fin.slice(-8);
        }
    })
    return lastHour;
}