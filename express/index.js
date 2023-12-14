document.addEventListener('DOMContentLoaded', () => {
    const executeButton = document.getElementById('executeButton');
    const resultElement = document.getElementById('result');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    executeButton.addEventListener('click', async () => {

        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!username || !password) {
            resultElement.textContent = 'Please enter both username and password.';
            return;
        }

        const id = await fetchId(username, password);
        if (id === undefined) {
            resultElement.textContent = 'Failed to get ID, check your username and password.';
            return;
        } else {
            window.location.href = "main.html?id=" + id;
        }      

    });
});

/** Fetch the ID of a student based on the login and password from the server
 * @param {string} username
 * @param {string} password
 * @returns {string} the ID of the student
*/
async function fetchId(username, password) {
    try {
        const encodedUsername = encodeURIComponent(username);
        const encodedPassword = encodeURIComponent(password);

        const response = await fetch(`/getID?username=${encodedUsername}&password=${encodedPassword}`, {
            method: 'GET',
        });

        if (response.ok) {
            return response.text();
        } else {
            throw new Error('Failed to execute Puppeteer action');
        }
    } catch (error) {
        console.error(error);
    }
}

