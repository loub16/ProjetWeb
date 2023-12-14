const searchParams = new URLSearchParams(window.location.search);
const id = searchParams.get('id');
const [firstday, lastday] = getFirstAndLastDayOfCurrentWeek();
const edt = await getEdt(id, firstday, lastday);
const lastLessonHour = getLastLessonHour(edt, '29/11/2023');
resultElement.textContent = "Heure de fin des cours d'aujourd'hui : " + lastLessonHour;



/** Get the timetable of a student in JSON format from the server
 * @param {string} id The ID of the student
 * @param {string} datedebut date of the first day of the current week
 * @param {string} datefin date of the last day of the current week
 * @returns {JSON} the timetable in JSON
 * */
async function getEdt(id, datedebut, datefin) {
    try {
        const response = await fetch(`/getEdt?id=${id}&dateDebut=${datedebut}&dateFin=${datefin}`);
        const edt = await response.json();
        return edt;
    } catch (error) {
        console.error(error);
    }

}

/** Get the first and last day of the current week
 * @returns {Array} the first and last day in an array in format : YYYYMMDD
 * */
function getFirstAndLastDayOfCurrentWeek() {
    var curr = new Date();
    var first = curr.getDate() - curr.getDay() + 1;
    var last = first + 6;

    // Create new Date objects for firstday and lastday
    var firstday = new Date(curr.setDate(first)).toISOString().slice(0, 10).replace(/-/g, "");
    curr = new Date(); // Reset curr to the current date
    var lastday = new Date(curr.setDate(last)).toISOString().slice(0, 10).replace(/-/g, "");
    return [firstday, lastday];
}

/** Get the first and last day of the asked week
 * @param {String} date the date to get the first and last day of in format : YYYY-MM-DD
 * @returns {Array} the first and last day in an array in format : YYYYMMDD
 * */
function getFirstAndLastDayOfAnyWeek(date) {
    var date = new Date(date);
    console.log("date : " + date)
    var first = date.getDate() - date.getDay() + 1;
    var last = first + 6;

    // Create new Date objects for firstday and lastday
    var firstday = new Date(date.setDate(first)).toISOString().slice(0, 10).replace(/-/g, "");
    var date = new Date(date);
    var lastday = new Date(date.setDate(last)).toISOString().slice(0, 10).replace(/-/g, "");
    return [firstday, lastday];
}

/** Get the hour of the end of the last lesson of the day
 * @param {JSON} json The JSON of the timetable
 * @param {string} date The date of the day to get the last lesson of in format : DD/MM/YYYY
 * @returns {string} the hour in format : HH:MM:SS
 * */
function getLastLessonHour(json, date) {
    let lastHour = "";

    json.forEach(lesson => {
        lesson = JSON.stringify(lesson);
        lesson = JSON.parse(lesson);
        const date_debut = lesson.date_debut;
        const date_day = date.slice(0, 2);
        const date_month = date.slice(3, 5);
        const date_year = date.slice(6, 10);
        if (date_debut.slice(0, 2) == date_day && date_debut.slice(3, 5) == date_month && date_debut.slice(6, 10) == date_year) {
            if (lesson.date_fin.slice(-8) > lastHour) {
                lastHour = lesson.date_fin.slice(-8);
            }

        }
    })
    return lastHour;
}