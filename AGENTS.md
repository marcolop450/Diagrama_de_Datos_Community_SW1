# GUIA PERMANENTE DE DISENO Y DESARROLLO — CASE TOOL UML

Este documento define las reglas de observancia obligatoria para el desarrollo de cualquier nueva pantalla, componente o endpoint en la plataforma.

---

## 1. Reglas de Interfaz de Usuario (UI/UX)

### Regla 1.1: Cero Redundancia de Navegacion y Controles
* **Un solo control por destino:** Prohibido duplicar botones o enlaces que lleven al mismo destino en la misma vista.
* **Navegacion de retorno unica:** El boton "Volver al Dashboard" reside exclusivamente en el Header superior para todas las subpaginas (/admin/users, /settings, /editor). Ninguna subpagina debe contener botones adicionales de "Volver" en sus encabezados o barras de herramientas internas.
* **Acciones directas no repetitivas:** Si un panel o dashboard ya cuenta con un boton de llamada a la accion (CTA) principal hacia una seccion (ej. "Gestionar Usuarios (RBAC)"), no se deben agregar enlaces repetitivos identicos sobre las tarjetas de metricas o cabeceras adyacentes.

### Regla 1.2: Control de Usuario Unificado (Pildora Unica)
* El acceso a **Perfil y Configuracion** en el Header debe estar unificado en un solo componente interactivo que agrupe el avatar, el nombre de usuario y el icono de configuracion (Settings).
* Prohibido tener botones independientes contiguos que conduzcan a la misma ruta (/settings).

### Regla 1.3: Animaciones Fluidas y Microinteracciones
* **Apertura y Cierre de Barra Lateral (Sidebar):** El Sidebar debe animar su entrada y repliegue de manera continua y fluida mediante transiciones CSS de ancho (w-64 a w-0 con overflow-hidden y contenedor interno w-64 shrink-0) bajo la curva cubic-bezier(0.16, 1, 0.3, 1). En moviles, debe emplear deslizamiento horizontal (translate-x) y desvanecimiento suave del fondo translucido.
* **Animacion de Entrada de Paginas (animate-page-enter):** Toda pantalla o vista nueva que se cargue debe incluir la animacion de montaje suave (elevacion de 10px y transicion de opacidad de 0.35s).
* **Microinteracciones en Hover:** Los botones, tarjetas y selectores deben poseer respuesta haptica/visual suave (active:scale-95, rotacion sutil de iconos, realce de bordes).

### Regla 1.4: Pure Dark Mode Estricto
* Paleta exclusiva de modo oscuro de alto contraste (bg-slate-950, bg-slate-900, acentos blue-500, purple-500, emerald-500 segun rol).
* Queda terminantemente prohibido incorporar temas claros o alternadores a modo claro.

### Regla 1.5: Cero Emojis
* Toda la iconografia del sistema debe ser 100% vectorial con la libreria lucide-react.
* No utilizar emojis en botones, modales, tablas, notificaciones toast ni documentacion.

### Regla 1.6: Transparencia Comercial SaaS (Sin Codigos de Casos de Uso)
* Las pantallas visibles para el usuario no deben mostrar nomenclaturas academicas ni siglas de Casos de Uso como (CU01), (CU02), etc. La interfaz debe reflejar un producto SaaS comercial de ingenieria de software.

---

## 2. Reglas de Control de Acceso Basado en Roles (RBAC)

* **SUPER_ADMIN (Gobernanza):** Acceso a metricas de plataforma, gestion de usuarios, asignacion de roles y bitacora de auditoria. **No tiene lienzo de dibujado UML ni acceso a /editor** (redireccion forzada a /dashboard).
* **ARQUITECTO (Ingenieria CASE):** Disenador principal de modelos de clases UML, validacion de reglas de normalizacion (1NF a 3NF), generacion de codigo Spring Boot y exportacion XMI.
* **COLABORADOR (Co-Diseno):** Acceso a proyectos compartidos para modelado en tiempo real.
