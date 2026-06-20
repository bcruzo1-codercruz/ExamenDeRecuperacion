const API_URL = '/api/cartelera';
let peliculasCache = []; 

const carteleraGrid = document.getElementById('carteleraGrid');
const form = document.getElementById('peliculaForm');
const filtroNombre = document.getElementById('filtroNombre');
const filtroUbicacion = document.getElementById('filtroUbicacion');

// Serie I: Petición GET
async function cargarCartelera() {
    try {
        const respuesta = await fetch(API_URL);
        if (!respuesta.ok) throw new Error('Error en la red');
        peliculasCache = await respuesta.json();
        
        // Invertimos el arreglo para que las más recientes (o recién agregadas) salgan primero
        peliculasCache.reverse(); 
        renderizarPeliculas(peliculasCache);
    } catch (error) {
        console.error('Error al cargar datos:', error);
    }
}

// Renderizar tarjetas
function renderizarPeliculas(peliculas) {
    carteleraGrid.innerHTML = '';
    peliculas.forEach(pelicula => {
        const card = document.createElement('div');
        card.className = 'card';
        
        card.onclick = (e) => {
            if(e.target.tagName !== 'BUTTON') {
                abrirDetalle(pelicula.imdbID);
            }
        };

        card.innerHTML = `
            <img src="${pelicula.Poster || 'https://via.placeholder.com/300x450/212c40/ffffff?text=Sin+Imagen'}" alt="${pelicula.Title}" class="poster-img" onerror="this.src='https://via.placeholder.com/300x450/212c40/ffffff?text=Error+Imagen'">
            <div class="card-content">
                <h3 class="card-title">${pelicula.Title || 'Sin título'}</h3>
                <p class="card-info"><strong>Año:</strong> ${pelicula.Year} | <strong>Género:</strong> ${pelicula.Type}</p>
                <p class="card-info"><strong>Ubicación:</strong> ${pelicula.Ubication}</p>
                <div class="card-actions">
                    <button class="btn-edit" onclick="prepararEdicion('${pelicula.imdbID}')">Editar</button>
                    <button class="btn-danger" onclick="eliminarPelicula('${pelicula.imdbID}')">Eliminar</button>
                </div>
            </div>
        `;
        carteleraGrid.appendChild(card);
    });
}

// Serie II: POST y PUT (CORRECCIÓN DEL ERROR APLICADA AQUÍ)
form.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const idInput = document.getElementById('imdbID').value;
    
    // Si idInput está vacío (es una película nueva), generamos un ID automático.
    // Esto previene el error 400/500 de la base de datos al no recibir un ID.
    const idFinal = idInput ? idInput : "ID_" + Date.now();
    
    const peliculaData = {
        imdbID: idFinal,
        Title: document.getElementById('Title').value,
        Year: document.getElementById('Year').value,
        Type: document.getElementById('Type').value,
        Poster: document.getElementById('Poster').value,
        description: document.getElementById('description').value,
        Ubication: document.getElementById('Ubication').value,
        Estado: true
    };

    try {
        let respuesta;
        if (idInput) {
            // Modo Edición (PUT)
            respuesta = await fetch(`${API_URL}/${idInput}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(peliculaData)
            });
        } else {
            // Modo Creación (POST)
            respuesta = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(peliculaData)
            });
        }

        if (respuesta.ok) {
            limpiarFormulario();
            cargarCartelera(); 
        } else {
            // Logueamos la respuesta del servidor para ver exactamente qué falló
            const errorText = await respuesta.text();
            console.error('Detalle del error del servidor:', errorText);
            alert('Error al guardar. Revisa la consola (F12) para más detalles.');
        }
    } catch (error) {
        console.error('Error de red en POST/PUT:', error);
    }
});

// Preparar edición
function prepararEdicion(id) {
    const pelicula = peliculasCache.find(p => p.imdbID === id);
    if (!pelicula) return;

    document.getElementById('imdbID').value = pelicula.imdbID;
    document.getElementById('Title').value = pelicula.Title;
    document.getElementById('Year').value = pelicula.Year;
    document.getElementById('Type').value = pelicula.Type;
    document.getElementById('Poster').value = pelicula.Poster;
    document.getElementById('description').value = pelicula.description;
    document.getElementById('Ubication').value = pelicula.Ubication;
    
    document.getElementById('formTitulo').innerText = 'Editar Película';
    document.getElementById('btnCancelar').classList.remove('hidden');
    
    // Cambiar color del botón para indicar edición
    document.getElementById('btnGuardar').innerText = 'Actualizar Película';
    document.getElementById('btnGuardar').style.backgroundColor = '#3498db';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('btnCancelar').onclick = limpiarFormulario;

function limpiarFormulario() {
    form.reset();
    document.getElementById('imdbID').value = '';
    document.getElementById('formTitulo').innerText = 'Agregar Nueva Película';
    document.getElementById('btnCancelar').classList.add('hidden');
    
    // Restaurar estilo del botón principal
    const btnGuardar = document.getElementById('btnGuardar');
    btnGuardar.innerText = 'Guardar Película';
    btnGuardar.style.backgroundColor = ''; // Vuelve al color original de CSS
}

// Serie II: DELETE
async function eliminarPelicula(id) {
    if (!confirm('¿Seguro que deseas eliminar esta película de la base de datos?')) return;

    try {
        const respuesta = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (respuesta.ok) {
            cargarCartelera(); 
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
    }
}

// Serie III: Filtros dinámicos
function aplicarFiltros() {
    const textoNombre = filtroNombre.value.toLowerCase();
    const textoUbicacion = filtroUbicacion.value.toLowerCase();

    const filtradas = peliculasCache.filter(p => {
        const coincideNombre = (p.Title || '').toLowerCase().includes(textoNombre);
        const coincideUbicacion = (p.Ubication || '').toLowerCase().includes(textoUbicacion);
        return coincideNombre && coincideUbicacion;
    });

    renderizarPeliculas(filtradas);
}

filtroNombre.addEventListener('input', aplicarFiltros);
filtroUbicacion.addEventListener('input', aplicarFiltros);

// Serie III: Detalle
async function abrirDetalle(id) {
    try {
        const respuesta = await fetch(`${API_URL}/${id}`);
        if (!respuesta.ok) throw new Error('Error al obtener detalle');
        const detalle = await respuesta.json();

        document.getElementById('modalNombre').innerText = detalle.Title;
        document.getElementById('modalPoster').src = detalle.Poster || 'https://via.placeholder.com/300x450/212c40/ffffff?text=Sin+Imagen';
        document.getElementById('modalInfo').innerHTML = `
            <p style="color: #9aa0a6;"><strong>ID Sistema:</strong> ${detalle.imdbID}</p>
            <p><strong>📍 Ubicación:</strong> ${detalle.Ubication}</p>
            <p><strong>📅 Año:</strong> ${detalle.Year} | <strong>🎬 Género:</strong> ${detalle.Type}</p>
            <p style="margin-top: 15px; border-top: 1px solid #32415c; padding-top: 15px;">
                <strong>Sinopsis:</strong><br><br>${detalle.description}
            </p>
        `;
        
        document.getElementById('detalleModal').classList.remove('hidden');
    } catch (error) {
        console.error(error);
    }
}

// Modal Cierre
document.querySelector('.close-btn').onclick = () => {
    document.getElementById('detalleModal').classList.add('hidden');
};
window.onclick = (e) => {
    const modal = document.getElementById('detalleModal');
    if (e.target == modal) {
        modal.classList.add('hidden');
    }
};

// Iniciar aplicación
cargarCartelera();