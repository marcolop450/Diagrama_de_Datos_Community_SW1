# 📐 CASE Tool Colaborativo con IA — SW1

> Herramienta CASE (Computer-Aided Software Engineering) colaborativa potenciada con Inteligencia Artificial para el diseño de diagramas de clases UML y generación automática de código.

## 🎯 Descripción

Esta herramienta permite a equipos de desarrollo de software:

- **Diseñar diagramas de clases UML** de forma colaborativa en tiempo real
- **Usar IA por voz** para crear y modificar clases ("Créame la clase Estudiante con atributos nombre y edad")
- **Usar IA por foto** para convertir diagramas de pizarra en diagramas digitales
- **Generar automáticamente** proyectos Spring Boot completos (Entity, Repository, Service, Controller)
- **Generar esquemas PostgreSQL** (DDL) a partir del modelo de clases
- **Generar colecciones Postman** para probar los endpoints generados
- **Importar/Exportar XMI** para compatibilidad con herramientas como ArchiTec

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Canvas UML | React Flow (v12) |
| Estado | Zustand |
| Estilos | Tailwind CSS |
| Backend | Spring Boot 4.1.0 (Java 26) |
| WebSocket | Spring WebSocket + STOMP + Yjs (CRDT) |
| Base de Datos | PostgreSQL (Supabase) |
| IA | Gemini API (visión + texto) |
| Voz | Web Speech API |

## 📁 Estructura del Proyecto

```
├── backend/          → Spring Boot API (CASE Tool)
├── frontend/         → React Web App (Editor UML)
├── docs/             → Documentación del proyecto
├── .env.example      → Variables de entorno (plantilla)
└── README.md         → Este archivo
```

## 🚀 Instalación y Ejecución

### Requisitos
- Java JDK 17+ (recomendado 26)
- Node.js 18+
- Maven 3.9+
- Cuenta de Supabase

### Backend
```bash
cd backend
./mvnw spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 👥 Equipo
- Desarrollo individual potenciado con IA

## 📄 Licencia
Proyecto académico — Universidad SW1

## 🔗 Links
- [Repositorio GitHub](https://github.com/marcolop450/Diagrama_de_Datos_Community_SW1)
- [Supabase Dashboard](https://supabase.com/dashboard/project/ttopqwgoilgqkphwptjf)
