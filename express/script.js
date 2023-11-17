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
            const edt = await getEdt(id, "20231016", "20231022");
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
        const response = fetch(`/getEdt?id=${id}&dateDebut=${datedebut}&dateFin=${datefin}`);

        if (response.ok) {
            console.log("response : " + response.json());
            return response.json();
        } else {
            return 'Failed to get edt.';
        }
    } catch (error) {
        console.error(error);
    }

}


