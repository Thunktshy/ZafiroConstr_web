// API para gestión de tallas
const sizesAPI = {
    async getAll() {
        const response = await fetch('/sizes/get_all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async getById(id) {
        const response = await fetch(`/sizes/por_id/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async insert(data) {
        const response = await fetch('/sizes/insert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async update(data) {
        const response = await fetch('/sizes/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async remove(id) {
        const response = await fetch('/sizes/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ size_id: id })
        });
        return await response.json();
    }
};

export { sizesAPI };