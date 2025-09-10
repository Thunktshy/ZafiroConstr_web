// API para gestion de cajas
const cajasAPI = {
    async getAll() {
        const response = await fetch('/api/cajas/get_all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async getById(id) {
        const response = await fetch(`/api/cajas/por_id/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async getByComponents(letra, cara, nivel) {
        const response = await fetch(`/api/cajas/por_componentes?letra=${letra}&cara=${cara}&nivel=${nivel}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async insert(data) {
        const response = await fetch('/api/cajas/insert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async update(data) {
        const response = await fetch('/api/cajas/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async remove(id) {
        const response = await fetch(`/api/cajas/delete/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    }
};

export { cajasAPI };