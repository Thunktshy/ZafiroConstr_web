// API para gestión de unidades de medida
const unidadesAPI = {
    async getAll() {
        const response = await fetch('/units/get_all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async getById(id) {
        const response = await fetch(`/units/por_id/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async insert(data) {
        const response = await fetch('/units/insert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async update(data) {
        const response = await fetch('/units/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async remove(id) {
        const response = await fetch('/units/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ unit_id: id })
        });
        return await response.json();
    }
};

export { unidadesAPI };