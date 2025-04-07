export async function tryLogin(user, password) {
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user, password })
        });

        return await response.json();
    } catch (error) {
        console.error("Error in tryLogin:", error);
        throw error;
    }
}


async function getUserId(user) {
    try {
        const response = await fetch(`/users/getId?username=${encodeURIComponent(user)}`); // Pass the username as a query parameter
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.Usuario_Id; // Return the user ID from the response
    } catch (error) {
        console.error("Error fetching user ID:", error);
        throw error; // Rethrow the error for handling in tryLogin
    }
}

async function getUserPassword(username) {
    try {
        const response = await fetch(`/users/getpassword?username=${encodeURIComponent(username)}`); // Pass the username as a query parameter
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.password; // Return the password from the response
    } catch (error) {
        console.error("Error fetching user password:", error);
        throw error; // Rethrow the error for handling in tryLogin
    }
}