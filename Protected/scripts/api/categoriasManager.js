// API para gestión de categorías (todos los niveles)
const categoriasAPI = {
    // Categorías principales
    async principalesGetAll() {
        const response = await fetch('/categorias/get_all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async principalesGetById(id) {
        const response = await fetch(`/categorias/por_id/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async principalesInsert(data) {
        const response = await fetch('/categorias/insert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async principalesUpdate(data) {
        const response = await fetch('/categorias/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async principalesRemove(id) {
        const response = await fetch('/categorias/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ categoria_id: id })
        });
        return await response.json();
    },

    // Categorías secundarias
    async secundariasGetAll() {
        const response = await fetch('/categorias_secundarias/get_all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async secundariasGetById(id) {
        const response = await fetch(`/categorias_secundarias/por_id/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async secundariasInsert(data) {
        const response = await fetch('/categorias_secundarias/insert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async secundariasUpdate(data) {
        const response = await fetch('/categorias_secundarias/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async secundariasRemove(id) {
        const response = await fetch('/categorias_secundarias/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ categoria_secundaria_id: id })
        });
        return await response.json();
    },

    // Subcategorías
    async subcategoriasGetAll() {
        const response = await fetch('/subcategorias/get_all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async subcategoriasGetById(id) {
        const response = await fetch(`/subcategorias/por_id/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    },

    async subcategoriasInsert(data) {
        const response = await fetch('/subcategorias/insert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async subcategoriasUpdate(data) {
        const response = await fetch('/subcategorias/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async subcategoriasRemove(id) {
        const response = await fetch('/subcategorias/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subcategoria_id: id })
        });
        return await response.json();
    }
};

export { categoriasAPI };