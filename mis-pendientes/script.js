// ---------- 1. Datos ----------
// Las tareas viven en una lista. Cada tarea es un objeto con:
// id, texto y terminada (true/false).
// Son solo datos de ejemplo.
let tareas = [
  { id: 1, texto: "Revisar los apuntes de la clase", terminada: false },
  { id: 2, texto: "Practicar ejercicios de JavaScript", terminada: false },
  { id: 3, texto: "Instalar Git en mi computadora", terminada: true }
];

// Contador para dar un id nuevo a cada tarea agregada
let siguienteId = 4;

// ---------- 2. Elementos de la página ----------
const formulario = document.getElementById("formulario");
const campoTarea = document.getElementById("campo-tarea");
const lista = document.getElementById("lista");
const contador = document.getElementById("contador");
const mensajeVacio = document.getElementById("mensaje-vacio");

// ---------- 3. Dibujar la lista en pantalla ----------
// Esta función borra la lista y la vuelve a dibujar con los datos actuales.
// Se llama cada vez que algo cambia, así la pantalla siempre refleja los datos.
function mostrarTareas() {
  lista.innerHTML = "";

  tareas.forEach(function (tarea) {
    const item = document.createElement("li");
    item.className = "tarea" + (tarea.terminada ? " terminada" : "");

    // Casilla para marcar como terminada
    const casilla = document.createElement("input");
    casilla.type = "checkbox";
    casilla.checked = tarea.terminada;
    casilla.addEventListener("change", function () {
      alternarTarea(tarea.id);
    });

    // Texto de la tarea (textContent evita que se ejecute código escrito en el campo)
    const texto = document.createElement("span");
    texto.className = "texto";
    texto.textContent = tarea.texto;

    // Botón para eliminar
    const botonEliminar = document.createElement("button");
    botonEliminar.className = "eliminar";
    botonEliminar.textContent = "Eliminar";
    botonEliminar.addEventListener("click", function () {
      eliminarTarea(tarea.id);
    });

    item.appendChild(casilla);
    item.appendChild(texto);
    item.appendChild(botonEliminar);
    lista.appendChild(item);
  });

  actualizarResumen();
}

// Muestra cuántas tareas faltan y el mensaje de lista vacía
function actualizarResumen() {
  const pendientes = tareas.filter(function (t) {
    return !t.terminada;
  }).length;

  contador.textContent =
    pendientes + " pendiente(s) de " + tareas.length + " en total";

  mensajeVacio.hidden = tareas.length > 0;
}

// ---------- 4. Acciones ----------
function agregarTarea(texto) {
  tareas.push({ id: siguienteId, texto: texto, terminada: false });
  siguienteId++;
  mostrarTareas();
}

function alternarTarea(id) {
  const tarea = tareas.find(function (t) {
    return t.id === id;
  });
  tarea.terminada = !tarea.terminada;
  mostrarTareas();
}

function eliminarTarea(id) {
  tareas = tareas.filter(function (t) {
    return t.id !== id;
  });
  mostrarTareas();
}

// ---------- 5. Eventos ----------
// Al enviar el formulario (botón "Agregar" o tecla Enter)
formulario.addEventListener("submit", function (evento) {
  evento.preventDefault(); // evita que la página se recargue

  const texto = campoTarea.value.trim(); // quita espacios sobrantes
  if (texto === "") {
    return; // no se agregan tareas vacías
  }

  agregarTarea(texto);
  campoTarea.value = "";
  campoTarea.focus();
});

// ---------- 6. Inicio ----------
mostrarTareas();
