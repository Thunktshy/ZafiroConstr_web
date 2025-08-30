/**
 * Fetches all usernames from the server.
 * Calls the /users/getUsernames route in server.js
 */
export async function getUsernames() {

    try {
        const usernameList = await fetch(`/users/getUsernames`);
        if (!usernameList.ok) {
            throw new Error(`HTTP error! status: ${users.status}`);
        }
        return await usernameList.json();
        
    } catch (error) {
        console.error("Error fetching usernames:", error);
        throw error;
    }
}

/**
 * Submits a new user registration to the server.
 * Calls the /users/register route in server.js
 */
export async function submitNewUser(newUserData) {
    try {
        const response = await fetch('/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUserData),
        });

        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || `HTTP error! Status: ${response.status}`);
        }
        return result;
    } catch (error) {
        console.error("Error submitting new user:", error);
        throw error;
    }
}
