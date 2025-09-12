// API para gestión de productos
const productosAPI = {
    async getAll() {
        const response = await fetch('/productos/get_all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async getAllActive() {
        const response = await fetch('/productos/get_all_active', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async getById(id) {
        const response = await fetch(`/productos/por_id/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async getByNombre(nombre) {
        const response = await fetch(`/productos/buscar_por_nombre/${encodeURIComponent(nombre)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async insert(data) {
        const response = await fetch('/productos/insert', {
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
        const response = await fetch('/productos/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return await response.json();
    },

    async softDelete(id) {
        const response = await fetch('/productos/soft_delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ producto_id: id }),
            credentials: 'include'
        });
        return await response.json();
    },

    async delete(id, force = false) {
        const response = await fetch('/productos/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ producto_id: id, force }),
            credentials: 'include'
        });
        return await response.json();
    },

    // Métodos para obtener datos relacionados
    async getCategorias() {
        const response = await fetch('/categorias/get_list', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async getCategoriasSecundarias() {
        const response = await fetch('/categorias_secundarias/get_list', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async getSubcategorias() {
        const response = await fetch('/subcategorias/get_list', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async getUnits() {
        const response = await fetch('/units/get_all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async getSizes() {
        const response = await fetch('/sizes/get_all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async getBrands() {
        const response = await fetch('/brands/get_all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await response.json();
    },

    async insertWithStock(data) {
        const response = await fetch('/productos/insert_with_stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return await response.json();
    },

    async getCajaByComponents(letra, cara, nivel) {
        const response = await fetch(
            `/cajas/por_componentes?letra=${encodeURIComponent(letra)}&cara=${Number(cara)}&nivel=${Number(nivel)}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
        );
        return await response.json();
    },

    async getCajasList() {
        const response = await fetch('/cajas/get_list', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        return await response.json();
    }
};

export { productosAPI };