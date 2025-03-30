export async function tryLogin(user, password) {
    try {
        const userID = await getUserId(user); // Await the getUser  Id function
        const storedPassword = await getUserPassword(user); // Get the stored password using the username

        // Here you should compare the provided password with the stored password
        if (storedPassword === password) {
            //console.log("Login successful for user ID:", userID); // Log success
            return { success: true, userID }; // Return success and user ID
        } else {
            //console.error("Error during login:", error); // Log the error
            return { success: false, message: "Inicio de sesión fallido. Verifique su usuario y contraseña." }; // Return failure with error message
        }
    } catch (error) {
        console.error("Error during login:", error); // Log the error
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