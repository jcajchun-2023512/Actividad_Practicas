"use strict";

// =====================================================================
// 1. DATOS Y CONFIGURACIÓN
// =====================================================================

// Nombres con los que se guarda la información en el navegador (localStorage)
const CLAVE_DATOS = "mis-pendientes-datos";
const CLAVE_TEMA = "mis-pendientes-tema";

const ETIQUETAS_PRIORIDAD = { alta: "Alta", media: "Media", baja: "Baja" };
const FILTROS_VALIDOS = ["todas", "pendientes", "terminadas"];

// Tareas que aparecen la primera vez que se abre la página (datos de ejemplo).
// Cada tarea es un objeto: id, texto, terminada, prioridad y fecha ("" si no tiene).
const TAREAS_DE_EJEMPLO = [
  { id: 1, texto: "Revisar los apuntes de la clase", terminada: false, prioridad: "media", fecha: "" },
  { id: 2, texto: "Practicar ejercicios de JavaScript", terminada: false, prioridad: "alta", fecha: "" },
  { id: 3, texto: "Instalar Git en mi computadora", terminada: true, prioridad: "baja", fecha: "" }
];

// Estado de la aplicación (lo que cambia mientras se usa la página)
let tareas = [];            // lista de tareas, en el orden en que se muestran
let filtroActual = "todas"; // "todas", "pendientes" o "terminadas"
let siguienteId = 1;        // id que recibirá la próxima tarea
let idEditando = null;      // id de la tarea que se está editando (o null)
let idArrastrando = null;   // id de la tarea que se está arrastrando (o null)

// =====================================================================
// 2. ELEMENTOS DE LA PÁGINA
// =====================================================================

const formulario = document.getElementById("formulario");
const campoTarea = document.getElementById("campo-tarea");
const campoFecha = document.getElementById("campo-fecha");
const campoPrioridad = document.getElementById("campo-prioridad");
const lista = document.getElementById("lista");
const contador = document.getElementById("contador");
const mensajeVacio = document.getElementById("mensaje-vacio");
const botonesFiltro = document.querySelectorAll(".filtro");
const botonBorrarTerminadas = document.getElementById("borrar-terminadas");
const botonTema = document.getElementById("boton-tema");

// =====================================================================
// 3. GUARDAR Y CARGAR (localStorage)
// =====================================================================

// Guarda las tareas y el filtro en el navegador.
// try/catch evita que la página falle si el navegador no permite guardar.
function guardarDatos() {
  try {
    localStorage.setItem(
      CLAVE_DATOS,
      JSON.stringify({ tareas: tareas, filtro: filtroActual })
    );
  } catch (error) {
    // Si no se puede guardar, la página sigue funcionando sin persistencia.
  }
}

// Lee lo guardado. Devuelve null si no hay nada o si los datos están dañados.
function cargarDatos() {
  try {
    const texto = localStorage.getItem(CLAVE_DATOS);
    if (!texto) {
      return null;
    }
    const datos = JSON.parse(texto);
    if (!datos || !Array.isArray(datos.tareas)) {
      return null;
    }
    return datos;
  } catch (error) {
    return null;
  }
}

// Comprueba que un elemento guardado tenga lo mínimo para ser una tarea
function esTareaValida(t) {
  return t && typeof t.texto === "string" && Number.isFinite(Number(t.id));
}

// Deja la tarea con todos sus campos en el formato correcto
function normalizarTarea(t) {
  return {
    id: Number(t.id),
    texto: String(t.texto),
    terminada: Boolean(t.terminada),
    prioridad: ETIQUETAS_PRIORIDAD[t.prioridad] ? t.prioridad : "media",
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(t.fecha) ? t.fecha : ""
  };
}

// =====================================================================
// 4. FECHAS
// =====================================================================

// Fecha de hoy en formato AAAA-MM-DD (el mismo que usa <input type="date">)
function fechaHoy() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mes + "-" + dia;
}

// Convierte "2026-10-25" en "25/10/2026"
function formatearFecha(fecha) {
  const partes = fecha.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// =====================================================================
// 5. DIBUJAR LA LISTA EN PANTALLA
// =====================================================================

// Devuelve solo las tareas que corresponden al filtro elegido
function tareasVisibles() {
  if (filtroActual === "pendientes") {
    return tareas.filter(function (t) { return !t.terminada; });
  }
  if (filtroActual === "terminadas") {
    return tareas.filter(function (t) { return t.terminada; });
  }
  return tareas;
}

// Borra la lista y la vuelve a dibujar con los datos actuales.
// Se llama cada vez que algo cambia, así la pantalla siempre está al día.
function mostrarTareas() {
  lista.innerHTML = "";

  const visibles = tareasVisibles();
  visibles.forEach(function (tarea) {
    lista.appendChild(crearElementoTarea(tarea));
  });

  actualizarResumen(visibles.length);
  actualizarFiltros();

  // Si hay una tarea en edición, ponemos el cursor en su campo
  if (idEditando !== null) {
    const campo = lista.querySelector(".campo-edicion");
    if (campo) {
      campo.focus();
      campo.select();
    }
  }
}

// Crea el <li> de una tarea (en modo normal o en modo edición)
function crearElementoTarea(tarea) {
  if (tarea.id === idEditando) {
    return crearElementoEdicion(tarea);
  }

  const item = document.createElement("li");
  item.className = "tarea" + (tarea.terminada ? " terminada" : "");
  item.draggable = true;
  item.dataset.id = tarea.id;

  // Asa visual que indica que se puede arrastrar
  const asa = document.createElement("span");
  asa.className = "asa";
  asa.setAttribute("aria-hidden", "true");
  asa.textContent = "⋮⋮";

  // Casilla para marcar como terminada
  const casilla = document.createElement("input");
  casilla.type = "checkbox";
  casilla.checked = tarea.terminada;
  casilla.setAttribute("aria-label", "Marcar como terminada");
  casilla.addEventListener("change", function () {
    alternarTarea(tarea.id);
  });

  // Texto de la tarea (textContent evita que se ejecute código escrito en el campo)
  const texto = document.createElement("span");
  texto.className = "texto";
  texto.textContent = tarea.texto;
  texto.addEventListener("dblclick", function () {
    iniciarEdicion(tarea.id);
  });

  // Etiquetas: prioridad y fecha límite
  const meta = document.createElement("div");
  meta.className = "meta";

  const etiquetaPrioridad = document.createElement("span");
  etiquetaPrioridad.className = "etiqueta prioridad-" + tarea.prioridad;
  etiquetaPrioridad.textContent = "Prioridad " + ETIQUETAS_PRIORIDAD[tarea.prioridad].toLowerCase();
  meta.appendChild(etiquetaPrioridad);

  if (tarea.fecha) {
    const vencida = !tarea.terminada && tarea.fecha < fechaHoy();
    const etiquetaFecha = document.createElement("span");
    etiquetaFecha.className = "etiqueta" + (vencida ? " vencida" : "");
    etiquetaFecha.textContent =
      (vencida ? "Vencida: " : "Vence: ") + formatearFecha(tarea.fecha);
    meta.appendChild(etiquetaFecha);
  }

  const contenido = document.createElement("div");
  contenido.className = "contenido";
  contenido.appendChild(texto);
  contenido.appendChild(meta);

  // Botones Editar y Eliminar
  const acciones = document.createElement("div");
  acciones.className = "acciones";

  const botonEditar = document.createElement("button");
  botonEditar.type = "button";
  botonEditar.className = "editar";
  botonEditar.textContent = "Editar";
  botonEditar.addEventListener("click", function () {
    iniciarEdicion(tarea.id);
  });

  const botonEliminar = document.createElement("button");
  botonEliminar.type = "button";
  botonEliminar.className = "eliminar";
  botonEliminar.textContent = "Eliminar";
  botonEliminar.addEventListener("click", function () {
    eliminarTarea(tarea.id);
  });

  acciones.appendChild(botonEditar);
  acciones.appendChild(botonEliminar);

  item.appendChild(asa);
  item.appendChild(casilla);
  item.appendChild(contenido);
  item.appendChild(acciones);

  activarArrastre(item, tarea.id);
  return item;
}

// Crea el <li> de una tarea mientras se está editando
function crearElementoEdicion(tarea) {
  const item = document.createElement("li");
  item.className = "tarea editando";
  item.dataset.id = tarea.id;

  const campo = document.createElement("input");
  campo.type = "text";
  campo.className = "campo-edicion";
  campo.value = tarea.texto;
  campo.maxLength = 200;
  campo.setAttribute("aria-label", "Editar tarea");

  // Enter guarda y Escape cancela
  campo.addEventListener("keydown", function (evento) {
    if (evento.key === "Enter") {
      evento.preventDefault();
      guardarEdicion(tarea.id, campo.value);
    } else if (evento.key === "Escape") {
      cancelarEdicion();
    }
  });

  const acciones = document.createElement("div");
  acciones.className = "acciones";

  const botonGuardar = document.createElement("button");
  botonGuardar.type = "button";
  botonGuardar.className = "guardar";
  botonGuardar.textContent = "Guardar";
  botonGuardar.addEventListener("click", function () {
    guardarEdicion(tarea.id, campo.value);
  });

  const botonCancelar = document.createElement("button");
  botonCancelar.type = "button";
  botonCancelar.className = "cancelar";
  botonCancelar.textContent = "Cancelar";
  botonCancelar.addEventListener("click", cancelarEdicion);

  acciones.appendChild(botonGuardar);
  acciones.appendChild(botonCancelar);

  item.appendChild(campo);
  item.appendChild(acciones);
  return item;
}

// Actualiza el contador, el mensaje de lista vacía y el botón "Borrar terminadas"
function actualizarResumen(cantidadVisibles) {
  const pendientes = tareas.filter(function (t) { return !t.terminada; }).length;
  const terminadas = tareas.length - pendientes;

  contador.textContent = pendientes + " pendiente(s) de " + tareas.length + " en total";

  if (tareas.length === 0) {
    mensajeVacio.textContent = "No tienes tareas. ¡Agrega la primera!";
    mensajeVacio.hidden = false;
  } else if (cantidadVisibles === 0) {
    mensajeVacio.textContent = "No hay tareas en este filtro.";
    mensajeVacio.hidden = false;
  } else {
    mensajeVacio.hidden = true;
  }

  botonBorrarTerminadas.disabled = terminadas === 0;
}

// Marca como activo el botón del filtro elegido
function actualizarFiltros() {
  botonesFiltro.forEach(function (boton) {
    const activo = boton.dataset.filtro === filtroActual;
    boton.classList.toggle("activo", activo);
    boton.setAttribute("aria-pressed", String(activo));
  });
}

// =====================================================================
// 6. ACCIONES SOBRE LAS TAREAS
// =====================================================================

// Cada acción hace tres cosas: cambia los datos, los guarda y redibuja la lista.
function guardarYMostrar() {
  guardarDatos();
  mostrarTareas();
}

function agregarTarea(texto, fecha, prioridad) {
  tareas.push({
    id: siguienteId,
    texto: texto,
    terminada: false,
    prioridad: prioridad,
    fecha: fecha
  });
  siguienteId++;

  // Si el filtro actual ocultaría la tarea nueva, volvemos a "todas"
  if (filtroActual === "terminadas") {
    filtroActual = "todas";
  }
  guardarYMostrar();
}

function alternarTarea(id) {
  const tarea = tareas.find(function (t) { return t.id === id; });
  if (!tarea) {
    return;
  }
  tarea.terminada = !tarea.terminada;
  guardarYMostrar();
}

function eliminarTarea(id) {
  tareas = tareas.filter(function (t) { return t.id !== id; });
  if (idEditando === id) {
    idEditando = null;
  }
  guardarYMostrar();
}

function borrarTerminadas() {
  const cantidad = tareas.filter(function (t) { return t.terminada; }).length;
  if (cantidad === 0) {
    return;
  }
  if (!confirm("¿Borrar " + cantidad + " tarea(s) terminada(s)?")) {
    return;
  }
  tareas = tareas.filter(function (t) { return !t.terminada; });
  idEditando = null;
  guardarYMostrar();
}

// ----- Edición -----

function iniciarEdicion(id) {
  idEditando = id;
  mostrarTareas();
}

function guardarEdicion(id, nuevoTexto) {
  const texto = nuevoTexto.trim();
  if (texto === "") {
    return; // no se permite dejar una tarea sin texto
  }
  const tarea = tareas.find(function (t) { return t.id === id; });
  if (tarea) {
    tarea.texto = texto;
  }
  idEditando = null;
  guardarYMostrar();
}

function cancelarEdicion() {
  idEditando = null;
  mostrarTareas();
}

// ----- Reordenar con arrastrar y soltar -----

// Mueve la tarea "idOrigen" a la posición de la tarea "idDestino".
// Si se arrastra hacia abajo queda después del destino; hacia arriba, antes.
function moverTarea(idOrigen, idDestino) {
  if (idOrigen === idDestino) {
    return;
  }
  const desde = tareas.findIndex(function (t) { return t.id === idOrigen; });
  const hasta = tareas.findIndex(function (t) { return t.id === idDestino; });
  if (desde === -1 || hasta === -1) {
    return;
  }
  const movida = tareas.splice(desde, 1)[0];
  tareas.splice(hasta, 0, movida);
  guardarYMostrar();
}

// Conecta los eventos de arrastre a un elemento de la lista
function activarArrastre(item, id) {
  item.addEventListener("dragstart", function (evento) {
    idArrastrando = id;
    item.classList.add("arrastrando");
    evento.dataTransfer.effectAllowed = "move";
    evento.dataTransfer.setData("text/plain", String(id)); // Firefox lo exige
  });

  item.addEventListener("dragover", function (evento) {
    if (idArrastrando === null) {
      return;
    }
    evento.preventDefault(); // necesario para permitir soltar aquí
    item.classList.add("sobre");
  });

  item.addEventListener("dragleave", function (evento) {
    if (!item.contains(evento.relatedTarget)) {
      item.classList.remove("sobre");
    }
  });

  item.addEventListener("drop", function (evento) {
    evento.preventDefault();
    const origen = idArrastrando;
    idArrastrando = null;
    if (origen !== null) {
      moverTarea(origen, id);
    }
  });

  item.addEventListener("dragend", function () {
    idArrastrando = null;
    item.classList.remove("arrastrando");
    lista.querySelectorAll(".sobre").forEach(function (el) {
      el.classList.remove("sobre");
    });
  });
}

// =====================================================================
// 7. MODO CLARO / OSCURO
// =====================================================================

function aplicarTema(tema) {
  document.documentElement.setAttribute("data-tema", tema);
  botonTema.textContent = tema === "oscuro" ? "Modo claro" : "Modo oscuro";
}

function cambiarTema() {
  const actual = document.documentElement.getAttribute("data-tema");
  const nuevo = actual === "oscuro" ? "claro" : "oscuro";
  aplicarTema(nuevo);
  try {
    localStorage.setItem(CLAVE_TEMA, nuevo);
  } catch (error) {
    // Si no se puede guardar, el tema solo dura mientras la página esté abierta.
  }
}

// =====================================================================
// 8. EVENTOS
// =====================================================================

// Al enviar el formulario (botón "Agregar" o tecla Enter)
formulario.addEventListener("submit", function (evento) {
  evento.preventDefault(); // evita que la página se recargue

  const texto = campoTarea.value.trim(); // quita espacios sobrantes
  if (texto === "") {
    return; // no se agregan tareas vacías
  }

  agregarTarea(texto, campoFecha.value, campoPrioridad.value);

  campoTarea.value = "";
  campoFecha.value = "";
  campoPrioridad.value = "media";
  campoTarea.focus();
});

// Botones de filtro
botonesFiltro.forEach(function (boton) {
  boton.addEventListener("click", function () {
    filtroActual = boton.dataset.filtro;
    idEditando = null;
    guardarYMostrar();
  });
});

botonBorrarTerminadas.addEventListener("click", borrarTerminadas);
botonTema.addEventListener("click", cambiarTema);

// =====================================================================
// 9. INICIO
// =====================================================================

const guardado = cargarDatos();

if (guardado) {
  tareas = guardado.tareas.filter(esTareaValida).map(normalizarTarea);
  if (FILTROS_VALIDOS.includes(guardado.filtro)) {
    filtroActual = guardado.filtro;
  }
} else {
  tareas = TAREAS_DE_EJEMPLO.map(function (t) {
    return Object.assign({}, t);
  });
}

// El siguiente id es uno más que el mayor que exista
siguienteId = tareas.reduce(function (mayor, t) {
  return Math.max(mayor, t.id);
}, 0) + 1;

aplicarTema(document.documentElement.getAttribute("data-tema") || "claro");
mostrarTareas();