// API para gestión de usuarios
const usuariosAPI = {
    async getAll() {
        const response = await fetch('/usuarios/get_all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async getById(id) {
        const response = await fetch(`/usuarios/por_id/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async getByEmail(email) {
        const response = await fetch(`/usuarios/por_email/${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async insert(data) {
        const response = await fetch('/usuarios/insert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return await response.json();
    },

    async update(data) {
        const response = await fetch('/usuarios/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return await response.json();
    },

    async remove(id) {
        const response = await fetch('/usuarios/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario_id: id }),
            credentials: 'include'
        });
        return await response.json();
    },

    async setTipo(data) {
        const response = await fetch('/usuarios/set_tipo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return await response.json();
    },

    async setAdmin(id) {
        const response = await fetch('/usuarios/set_admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario_id: id }),
            credentials: 'include'
        });
        return await response.json();
    }
};

export { usuariosAPI };