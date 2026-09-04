# DOCUMENTACION DEL PROYECTO — CASE Tool Colaborativo con IA

> **Materia**: Ingenieria de Software 1 (SW1)  
> **Proyecto**: Herramienta CASE Colaborativa con Inteligencia Artificial  
> **Fecha de entrega**: 21 de septiembre de 2026  

---

## PARTE 1: FUNDAMENTACION TEORICA

### 1.1 Ingenieria de Software Asistida por Computadora (CASE)

#### Que es CASE?
Las herramientas CASE (Computer-Aided Software Engineering) son aplicaciones de software que proporcionan soporte automatizado para actividades del proceso de desarrollo de software. Estas herramientas mejoran la **productividad** del desarrollador al automatizar tareas repetitivas, verificar la consistencia del diseno y facilitar la documentacion.

#### Clasificacion de herramientas CASE
- **Upper CASE**: Soporte para las fases de analisis y diseno (diagramas UML, modelado de datos)
- **Lower CASE**: Soporte para implementacion, pruebas y mantenimiento (generadores de codigo, depuradores)
- **Integrated CASE (I-CASE)**: Cubren todo el ciclo de vida del software

#### Nuestra herramienta
Este proyecto implementa una herramienta **I-CASE** que cubre desde el diseno (diagramas de clases UML) hasta la implementacion (generacion de codigo Spring Boot) y pruebas (colecciones Postman).

**Productividad que aporta:**
- Eliminacion de codificacion manual repetitiva
- Generacion automatica de las 4 capas de Spring Boot (Entity, Repository, Service, Controller)
- Reduccion de errores humanos en el mapeo diagrama a codigo
- Colaboracion en tiempo real que elimina conflictos de versiones

---

### 1.2 Desarrollo de Software Basado en Componentes (CBD)

- **Arquitectura Modular**: Frontend desacoplado con componentes reactivos independientes en React 18 y TypeScript.
- **Microservicios y Modulos Backend**: Division limpia de responsabilidades (Seguridad JWT, Administracion RBAC, Motor de Suscripciones y Facturacion PayPal, Diseno CASE UML).
- **Interoperabilidad**: Interfaces estandarizadas REST JSON con contratos inmutables DTO.

---

### 1.3 Arquitectura de Software

- **Patron Arquitectonico**: Cliente-Servidor Desacoplado con Single Page Application (SPA) y Backend RESTful en Spring Boot 4.1.0.
- **Persistencia**: PostgreSQL 17 relacional en Supabase con soporte de tipos JSONB para cargas raw de pasarelas de pago y esquemas dinamicos UML.
- **Seguridad**: Token Bearer JWT volatil en sessionStorage (sin cookies vulnerables a CSRF), filtros de seguridad stateless `OncePerRequestFilter`, control de acceso basado en roles (RBAC: `SUPER_ADMIN`, `ARQUITECTO`, `COLABORADOR`) y auditoria de seguridad inmutable en tabla `audit_logs`.

---

## PARTE 2: REGISTROS DEL PROCESO DE DESARROLLO UNIFICADO (PUDS)

### 2.1 Catalogo de Casos de Uso Implementados

| Caso de Uso | Nombre Comercial | Actor Principal | Descripcion Sintetica |
|---|---|---|---|
| **CU01** | Autenticacion y Perfil de Usuario | Usuario / Arquitecto | Registro, inicio de sesion seguro con JWT volatil, actualizacion de credenciales y eliminacion en 2 pasos. |
| **CU02** | Gobernanza RBAC y Auditoria | Super Administrador | Gestion de usuarios de plataforma, alternancia de estado activo/inactivo, asignacion de roles y registro inmutable de auditoria. |
| **CU03** | Suscripcion SaaS y Facturacion (30 Dias) | Arquitecto / Equipo | Compra y renovacion de plan por 30 dias mediante PayPal Sandbox oficial, emision de factura fiscal imprimible y cancelacion inmediata (Opcion A). |

---

### 2.2 Especificacion Detallada del CU03: Suscripcion SaaS (30 Dias con PayPal Sandbox)

#### 2.2.1 Proposito y Alcance
Permitir a los arquitectos de software adquirir o renovar licencias de uso avanzado (Plan Pro Architect $9.99 USD / 30 dias o Plan Enterprise Team $29.99 USD / 30 dias) mediante la pasarela certificada **PayPal Sandbox**, asegurando:
1. Una vigencia exacta de 30 dias calendario.
2. Persistencia inmutable del pago en la tabla `payments_log` con payload transaccional completo.
3. Actualizacion del rol y plan en `user_profiles`.
4. Registro del evento de auditoria `SUBSCRIPTION_PURCHASED`.
5. Emision de recibo fiscal digital con formato `INV-YYYYMMDD-XXXX` y vista de impresion.
6. **Modulo de Cancelacion con Garantia Antifallos (Opcion A)**: Reversion inmediata al plan `COMMUNITY`, limpieza de fecha de expiracion a `null` y registro de auditoria `SUBSCRIPTION_CANCELLED`, permitiendo al usuario volver a comprar y probar de forma ilimitada sin inconsistencias en la base de datos.

#### 2.2.2 Diagrama de Secuencia UML (Compra de Suscripcion 30 Dias)

```mermaid
sequenceDiagram
    autonumber
    actor U as Arquitecto (Cliente)
    participant UI as React Frontend (SettingsPage)
    participant PP as PayPal Sandbox SDK
    participant API as SubscriptionController
    participant SVC as SubscriptionService
    participant DB as Supabase PostgreSQL
    participant AUD as AuditLogService

    U->>UI: Selecciona Plan Pro ($9.99) y click "Adquirir Plan"
    UI->>API: POST /api/subscription/paypal/create-order {planId: "PLAN_PRO_ARCHITECT"}
    API->>SVC: createPayPalOrder(userId, planId)
    SVC->>PP: REST API v2 /v2/checkout/orders (Bearer OAuth)
    PP-->>SVC: orderId: "SANDBOX-ORD-XXXX"
    SVC-->>API: CreatePayPalOrderResponse(orderId)
    API-->>UI: 200 OK {orderId}
    
    UI->>PP: Abre Popup PayPal con cuenta Zuigo54@example.com
    U->>PP: Autoriza el pago de $9.99 USD
    PP-->>UI: onApprove(data: {orderID, payerID})
    
    UI->>API: POST /api/subscription/paypal/capture-order {orderId, planId, payerId}
    API->>SVC: capturePayPalOrder(userId, req, ip, userAgent)
    Note over SVC: Calcula vigencia: now + 30 dias
    SVC->>DB: INSERT INTO payments_log (status: 'COMPLETED', amount: 9.99)
    SVC->>DB: UPDATE user_profiles SET subscription_plan = 'PRO_ARCHITECT', subscription_expires_at = now + 30d
    SVC->>AUD: recordAction('SUBSCRIPTION_PURCHASED')
    AUD->>DB: INSERT INTO audit_logs (...)
    SVC-->>API: PaymentReceiptResponse (invoiceNumber: "INV-20260904-4DF8")
    API-->>UI: 200 OK {receipt}
    UI->>UI: Actualiza authStore y renderiza recibo digital imprimible
    UI-->>U: Notificacion Toast: "Suscripcion activada por 30 dias"
```

#### 2.2.3 Diagrama de Secuencia UML (Cancelacion Inmediata — Opcion A)

```mermaid
sequenceDiagram
    autonumber
    actor U as Arquitecto (Cliente)
    participant UI as React Frontend (SettingsPage)
    participant API as SubscriptionController
    participant SVC as SubscriptionService
    participant DB as Supabase PostgreSQL
    participant AUD as AuditLogService

    U->>UI: Click en "Cancelar Suscripcion"
    UI->>U: Despliega modal de confirmacion (Garantia Antifallos)
    U->>UI: Confirma Cancelacion Inmediata
    UI->>API: POST /api/subscription/cancel
    API->>SVC: cancelSubscription(userId, ip, userAgent)
    Note over SVC: Opcion A: Reset inmediato a COMMUNITY y expires_at = null
    SVC->>DB: UPDATE user_profiles SET subscription_plan = 'COMMUNITY', subscription_expires_at = NULL
    SVC->>AUD: recordAction('SUBSCRIPTION_CANCELLED', details: {cancellationType: 'OPTION_A_IMMEDIATE_RESET'})
    AUD->>DB: INSERT INTO audit_logs (...)
    SVC-->>API: SubscriptionStatusResponse(planId: 'COMMUNITY', active: false)
    API-->>UI: 200 OK {status}
    UI->>UI: Actualiza authStore (plan: 'COMMUNITY')
    UI-->>U: Toast: "Suscripcion cancelada. Revertido a Community."
```

#### 2.2.4 Diagrama de Robustez (Analisis PUDS)

```mermaid
flowchart LR
    subgraph Boundary[Objetos de Limite / Interfaz]
        B1[SettingsPage: Tab Suscripcion]
        B2[PayPalButtons SDK Modal]
        B3[Modal Recibo Digital Factura]
        B4[Modal Confirmacion Cancelacion]
    end

    subgraph Control[Objetos de Control]
        C1[SubscriptionController]
        C2[SubscriptionService]
        C3[PayPalHttpClient]
        C4[AuditLogService]
    end

    subgraph Entity[Objetos de Entidad / Persistencia]
        E1[(user_profiles)]
        E2[(subscription_plans)]
        E3[(payments_log)]
        E4[(audit_logs)]
    end

    B1 -->|Ver catalogo y estado| C1
    B1 -->|Iniciar compra| B2
    B2 -->|Crear orden| C1
    B2 -->|Capturar aprobacion| C1
    B1 -->|Solicitar cancelacion| B4
    B4 -->|Confirmar cancelacion| C1
    B1 -->|Ver recibo| B3

    C1 --> C2
    C2 --> C3
    C2 --> C4
    C2 --> E1
    C2 --> E2
    C2 --> E3
    C4 --> E4
```

---

## PARTE 3: GUIA DE VERIFICACION PAYPAL SANDBOX

Para ejecutar pruebas del flujo completo de compra y facturacion:
1. **Credenciales del Comercio (Merchant Receptor)**:
   - Cuenta Comercio: `Lis54@example.com`
   - Client ID: `BAAEZt0Yfq-bOz9gNms5brjPxsI5rg76weuPR4Af4MdDP5g5XkLEMd9FOfZppWGz2g1q-3CeacCFe4Pc-w`
2. **Credenciales del Comprador (Personal Buyer)**:
   - Correo Comprador: `Zuigo54@example.com`
3. **Flujo de Prueba**:
   - Iniciar sesion como Arquitecto.
   - Ir a la pestana **Suscripcion y Facturacion** en `/settings?tab=subscription`.
   - Seleccionar **Pro Architect** o **Enterprise Team**.
   - Completar el pago con el boton oficial PayPal o el boton de bypass de pruebas directas Sandbox.
   - Observar el contador de 30 dias y la barra de progreso activa.
   - Presionar **Ver Factura** para visualizar e imprimir el recibo digital oficial.
   - Presionar **Cancelar Suscripcion** para verificar la reversion limpia a `COMMUNITY`.
