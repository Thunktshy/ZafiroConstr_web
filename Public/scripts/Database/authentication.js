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
