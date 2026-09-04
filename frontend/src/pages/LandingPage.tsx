import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, 
  FileCode, 
  ShieldCheck, 
  Cpu, 
  Users, 
  Share2, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  Zap, 
  Sparkles, 
  Database, 
  Workflow,
  Check,
  Server,
  FileCheck
} from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { AuroraBackground } from '../components/common/AuroraBackground';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Layers className="w-6 h-6 text-blue-400" />,
      title: 'Modelado Visual UML 2.5+',
      description: 'Canvas grafocéntrico reactivo para diseñar clases, atributos tipados, modificadores de acceso y relaciones con cardinalidad estandarizada.',
      tag: 'Core CASE'
    },
    {
      icon: <FileCode className="w-6 h-6 text-indigo-400" />,
      title: 'Generador Spring Boot 4 Capas',
      description: 'Compilación instantánea en ZIP de proyectos Maven completos con Controller, Service, Repository y Entity JPA compilables con ./mvnw.',
      tag: 'FreeMarker Engine'
    },
    {
      icon: <Database className="w-6 h-6 text-emerald-400" />,
      title: 'Esquema DDL SQL & Postman v2.1',
      description: 'Generación automática de scripts DDL para PostgreSQL 17 con restricciones relacionales y colecciones JSON de Postman con Runner interactivo.',
      tag: 'Zero Friction'
    },
    {
      icon: <Workflow className="w-6 h-6 text-purple-400" />,
      title: 'Interoperabilidad XMI ArchiTec',
      description: 'Exportación e importación conforme a la especificación OMG XMI 2.1 con layout automático Dagre para compatibilidad con StarUML y ArchiTec.',
      tag: 'OMG Standard'
    },
    {
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      title: 'Asistencia IA Multimodal',
      description: 'Modelado por dictado de voz (PLN) y digitalización de fotos de pizarra con Circuit Breaker y fallback resiliente (Gemini 2.5 Flash → Groq).',
      tag: 'Multi-IA Fallback'
    },
    {
      icon: <Users className="w-6 h-6 text-cyan-400" />,
      title: 'Colaboración WSS con DNI',
      description: 'Salas multiusuario sincronizadas en tiempo real vía WebSockets/STOMP (< 50ms latencia) con acceso por código y DNI para co-diseño ágil.',
      tag: 'Realtime WSS'
    }
  ];

  const pricingPlans = [
    {
      id: 'COMMUNITY',
      name: 'Community Free',
      badge: 'Básico',
      price: '$0.00',
      period: 'para siempre',
      description: 'Ideal para estudiantes y aprendizaje individual de modelado UML y fundamentos de datos.',
      features: [
        'Hasta 3 proyectos activos',
        'Modelado visual de clases y relaciones',
        'Validación de normalización 1NF a 3NF',
        '1 sala colaborativa (máx. 2 participantes)',
        'Exportación de diagramas en PNG y JSON',
        'Sesión volátil protegida en memoria'
      ],
      cta: 'Comenzar Gratis',
      popular: false,
      buttonStyle: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
    },
    {
      id: 'PRO_ARCHITECT',
      name: 'Pro Architect',
      badge: 'Recomendado',
      price: '$9.99',
      period: 'por 30 días de vigencia',
      description: 'Para arquitectos de software e ingenieros que requieren generación de código y asistencia IA.',
      features: [
        'Proyectos y clases ilimitadas',
        'Generador Backend Spring Boot 4 Capas (ZIP)',
        'Generador de Esquema DDL PostgreSQL 17',
        'Generador de Colección Postman v2.1 + Runner',
        'Exportación e Importación XMI 2.1 (ArchiTec)',
        'Asistente IA por Dictado de Voz y Fotos de Pizarra',
        'Recibo digital de pago persistido en bitácora'
      ],
      cta: 'Adquirir Plan Pro',
      popular: true,
      buttonStyle: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25'
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise Team',
      badge: 'Empresas',
      price: '$29.99',
      period: 'por 30 días de vigencia',
      description: 'Para equipos de desarrollo, universidades y organizaciones con administración centralizada.',
      features: [
        'Todo lo incluido en Pro Architect',
        'Salas colaborativas multiusuario simultáneas',
        'Consola Super Admin con gestión RBAC',
        'Auditoría inmutable de bitácora y pagos',
        'Historial de versiones y papelera de proyectos',
        'Soporte técnico prioritario y SLA 99.9%'
      ],
      cta: 'Contactar Enterprise',
      popular: false,
      buttonStyle: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative selection:bg-blue-500 selection:text-white font-sans">
      {/* Background Aurora Canvas */}
      <AuroraBackground opacity={0.65} />

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo size="md" />

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#caracteristicas" className="hover:text-blue-400 transition-colors">Características</a>
            <a href="#arquitectura" className="hover:text-blue-400 transition-colors">Arquitectura PUDS</a>
            <a href="#precios" className="hover:text-blue-400 transition-colors">Planes SaaS</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-all"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md shadow-blue-500/20 transition-all group"
            >
              <span>Comenzar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Page Content with Smooth Page-Enter Animation */}
      <div className="animate-page-enter">
        {/* Main Hero Section */}
        <section className="relative z-10 pt-16 pb-24 lg:pt-24 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Project Tag / Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-fade-in font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>CASE Architecture • OMG UML 2.5+ • Spring Boot 4 Capas</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          Plataforma CASE Inteligente para <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
            Modelado UML y Generación de Software
          </span>
        </h1>

        {/* Subtitle description */}
        <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Diseña diagramas de clases UML 2.5+ con normalización relacional en tiempo real, interoperabilidad XMI (ArchiTec) y generación automatizada de backend en <strong>Spring Boot (4 capas)</strong>, <strong>DDL PostgreSQL</strong> y <strong>Postman v2.1</strong> con asistencia de IA multimodal.
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Iniciar Modelador CASE</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <a
            href="#precios"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-base font-semibold text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center gap-2 transition-all"
          >
            <Zap className="w-5 h-5 text-amber-400" />
            <span>Ver Planes SaaS</span>
          </a>
        </div>

        {/* Key Technical Badges */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-center gap-3">
            <Server className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <div className="text-xs text-slate-400 font-mono">Backend</div>
              <div className="text-sm font-semibold text-white">Spring Boot 4 Capas</div>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-center gap-3">
            <Lock className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs text-slate-400 font-mono">Seguridad</div>
              <div className="text-sm font-semibold text-white">Sesión Volátil JWT</div>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-center gap-3">
            <Cpu className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <div className="text-xs text-slate-400 font-mono">Resiliencia</div>
              <div className="text-sm font-semibold text-white">Multi-IA Fallback</div>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-center gap-3">
            <Share2 className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-xs text-slate-400 font-mono">Concurrencia</div>
              <div className="text-sm font-semibold text-white">WSS + Acceso DNI</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="caracteristicas" className="relative z-10 py-20 bg-slate-900/40 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-400 font-mono mb-2">
              Funcionalidades del Sistema
            </h2>
            <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Herramientas de ingeniería de software completas para el ciclo de vida
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/90 hover:bg-slate-850 transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 group-hover:scale-105 transition-transform">
                      {feat.icon}
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700/50">
                      {feat.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture & PUDS Section */}
      <section id="arquitectura" className="relative z-10 py-20 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/90 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold font-mono uppercase mb-4">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Metodología PUDS & Clean Architecture</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4">
                  Generación de Backend en 4 Capas Limpias
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                  El motor CASE evalúa el modelo relacional a través de plantillas FreeMarker y produce un proyecto Maven estructurado rigurosamente en:
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white text-sm">Capas de Entidad (@Entity JPA):</strong>
                      <span className="text-slate-400 text-sm"> Anotaciones de tabla, claves foráneas, getters/setters y mapeo de tipos.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white text-sm">Capa de Persistencia (@Repository):</strong>
                      <span className="text-slate-400 text-sm"> Interfaces Spring Data JPA con métodos CRUD y consultas por atributos.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white text-sm">Capa de Negocio (@Service):</strong>
                      <span className="text-slate-400 text-sm"> Inyección de dependencias, transaccionalidad y lógica de validación de reglas.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white text-sm">Capa de Control (@RestController):</strong>
                      <span className="text-slate-400 text-sm"> Endpoints REST documentados con OpenAPI 3.0 listos para consumo.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Code Generation Visual Preview */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 font-mono text-xs text-slate-300 shadow-inner overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-500 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                  </div>
                  <span className="text-[11px] text-slate-400">backend-springboot.zip</span>
                </div>
                <div className="text-slate-400 space-y-1">
                  <div>src/main/java/com/sw1/generated/</div>
                  <div className="pl-4 text-blue-400">├── controller/PacienteController.java</div>
                  <div className="pl-4 text-purple-400">├── service/PacienteService.java</div>
                  <div className="pl-4 text-indigo-400">├── repository/PacienteRepository.java</div>
                  <div className="pl-4 text-emerald-400">└── model/Paciente.java</div>
                  <div>src/main/resources/</div>
                  <div className="pl-4 text-amber-400">├── schema.sql (PostgreSQL 17)</div>
                  <div className="pl-4 text-cyan-400">└── postman_collection.json (v2.1)</div>
                  <div className="text-slate-300 pt-2 font-bold">pom.xml (Spring Boot 4.1.0)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precios" className="relative z-10 py-20 bg-slate-900/40 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-400 font-mono mb-2">
              Modelo Comercial SaaS
            </h2>
            <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Planes de suscripción transparentes y flexibles
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Integración nativa con pasarela de pagos PayPal Sandbox y recibo digital emitido en bitácora.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`p-8 rounded-3xl flex flex-col justify-between transition-all duration-300 ${
                  plan.popular
                    ? 'bg-slate-900/90 border-2 border-blue-500 shadow-2xl shadow-blue-500/10 relative scale-105'
                    : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-md">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    {!plan.popular && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">{plan.description}</p>

                  <div className="mb-6 pb-6 border-b border-slate-800">
                    <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-xs text-slate-400 font-medium ml-2">USD / {plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((item, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${plan.buttonStyle}`}
                >
                  <span>{plan.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-12 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div>
            Modelado Visual de Clases • Interoperabilidad XMI ArchiTec • Motor Generador CASE
          </div>
          <div>
            Plataforma de Arquitectura de Software
          </div>
        </div>
      </footer>
    </div>
  );
};
