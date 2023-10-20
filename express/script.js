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
      } catch (error) {
        console.error(error);
        resultElement.textContent = 'Failed to get ID, check your username and password.';
      }
    });
  });
  
  async function getId(username, password) {
    try {
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);
  
      const response = await fetch(`http://localhost:3000/getID?username=${encodedUsername}&password=${encodedPassword}`, {
        method: 'GET',
      });
  
      if (response.ok) {
        const id = await response.text();
        return id;
      } else {
        console.error('Failed to execute Puppeteer action');
        return 'Failed to get ID, check your username and password.';
      }
    } catch (error) {
      console.error(error);
    }
  }
  