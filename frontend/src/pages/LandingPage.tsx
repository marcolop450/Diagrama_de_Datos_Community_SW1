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
  Sparkles, 
  Database, 
  Workflow,
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
      description: 'Modelado por dictado de voz y digitalización de fotos de pizarra con redundancia multimodelo y fallback resiliente.',
      tag: 'Multi-IA Fallback'
    },
    {
      icon: <Users className="w-6 h-6 text-cyan-400" />,
      title: 'Colaboración WSS con DNI',
      description: 'Salas multiusuario sincronizadas en tiempo real vía WebSockets/STOMP (< 50ms latencia) con acceso por código y DNI para co-diseño ágil.',
      tag: 'Realtime WSS'
    }
  ];



  return (
    <div className="min-h-screen bg-[#0d0f14] text-slate-100 relative selection:bg-indigo-600 selection:text-white font-sans">
      {/* Background Aurora Canvas */}
      <AuroraBackground opacity={0.65} />

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0a0c10]/85 border-b border-[#242934] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo size="md" />

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
            <a href="#caracteristicas" className="hover:text-indigo-400 transition-colors">Características</a>
            <a href="#arquitectura" className="hover:text-indigo-400 transition-colors">Arquitectura</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-[#14171d] hover:bg-[#181c24] border border-[#242934] hover:border-[#2e3543] rounded-xl transition-all cursor-pointer"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/25 transition-all group cursor-pointer active:scale-95"
            >
              <span>Comenzar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Page Content with Smooth Page-Enter Animation */}
      <div className="animate-page-enter">
        {/* Main Hero Section */}
        <section className="relative z-10 pt-16 pb-20 lg:pt-24 lg:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          {/* Project Tag / Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-fade-in font-mono shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ingeniería CASE • OMG UML 2.5+ • Spring Boot</span>
          </div>

          {/* Main Headline - Balanced & Elegant */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.2] font-display">
            Plataforma CASE para{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-indigo-200">
              Modelado UML y Generación de Software
            </span>
          </h1>

          {/* Subtitle description */}
          <p className="mt-6 text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-sans font-normal">
            Diseña diagramas de clases UML con normalización relacional en tiempo real, interoperabilidad OMG XMI y generación automatizada de backend en <strong>Spring Boot 4 Capas</strong>, <strong>DDL PostgreSQL 17</strong> y <strong>colecciones Postman v2.1</strong> con IA multimodal.
          </p>

          {/* Primary CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-7 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>Iniciar Modelador CASE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#caracteristicas"
              className="w-full sm:w-auto px-7 py-3 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 bg-[#14171d] hover:bg-[#181c24] border border-[#242934] hover:border-[#2e3543] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Ver Características</span>
            </a>
          </div>

          {/* Key Technical Badges */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-[#14171d] border border-[#242934] flex items-center gap-3 hover:border-[#2e3543] transition-colors">
              <Server className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400 font-mono">Backend</div>
                <div className="text-xs font-semibold text-white font-sans">Spring Boot 4 Capas</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#14171d] border border-[#242934] flex items-center gap-3 hover:border-[#2e3543] transition-colors">
              <Lock className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400 font-mono">Seguridad</div>
                <div className="text-xs font-semibold text-white font-sans">Autenticación JWT</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#14171d] border border-[#242934] flex items-center gap-3 hover:border-[#2e3543] transition-colors">
              <Cpu className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400 font-mono">Resiliencia</div>
                <div className="text-xs font-semibold text-white font-sans">Multi-IA Fallback</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#14171d] border border-[#242934] flex items-center gap-3 hover:border-[#2e3543] transition-colors">
              <Share2 className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400 font-mono">Concurrencia</div>
                <div className="text-xs font-semibold text-white font-sans">WSS en Tiempo Real</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="caracteristicas" className="relative z-10 py-20 bg-[#0a0c10]/80 border-t border-[#242934]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-400 font-mono mb-2">
                Capacidades de Ingeniería CASE
              </h2>
              <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
                Herramientas completas para el ciclo de vida del software
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-[#14171d] border border-[#242934] hover:border-[#2e3543] hover:bg-[#181c24] transition-all duration-200 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-xl bg-[#0f1115] border border-[#242934] group-hover:scale-105 transition-transform">
                        {feat.icon}
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#0f1115] text-indigo-300 border border-indigo-500/20 font-medium">
                        {feat.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors font-display">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      {feat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Architecture & PUDS Section */}
        <section id="arquitectura" className="relative z-10 py-20 border-t border-[#242934]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-8 sm:p-12 rounded-2xl bg-[#14171d] border border-[#242934] shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold font-mono uppercase mb-4">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Metodología PUDS & Clean Architecture</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4 font-display">
                    Generación de Backend en 4 Capas Limpias
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 font-sans">
                    El motor CASE evalúa el modelo relacional a través de plantillas FreeMarker y produce un proyecto Maven estructurado rigurosamente en:
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white text-xs font-semibold">Capa de Entidad (@Entity JPA):</strong>
                        <span className="text-slate-400 text-xs"> Anotaciones de tabla, claves foráneas, getters/setters y mapeo de tipos.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white text-xs font-semibold">Capa de Persistencia (@Repository):</strong>
                        <span className="text-slate-400 text-xs"> Interfaces Spring Data JPA con métodos CRUD y consultas por atributos.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white text-xs font-semibold">Capa de Negocio (@Service):</strong>
                        <span className="text-slate-400 text-xs"> Inyección de dependencias, transaccionalidad y lógica de validación de reglas.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white text-xs font-semibold">Capa de Control (@RestController):</strong>
                        <span className="text-slate-400 text-xs"> Endpoints REST documentados con OpenAPI 3.0 listos para consumo.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Code Generation Visual Preview */}
                <div className="bg-[#0f1115] rounded-2xl border border-[#242934] p-5 font-mono text-xs text-slate-300 shadow-inner overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-[#242934] text-slate-500 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                    </div>
                    <span className="text-[10px] text-slate-400">backend-springboot.zip</span>
                  </div>
                  <div className="text-slate-400 space-y-1">
                    <div>src/main/java/com/sw1/generated/</div>
                    <div className="pl-4 text-indigo-400">├── controller/PacienteController.java</div>
                    <div className="pl-4 text-blue-400">├── service/PacienteService.java</div>
                    <div className="pl-4 text-emerald-400">├── repository/PacienteRepository.java</div>
                    <div className="pl-4 text-indigo-300">└── model/Paciente.java</div>
                    <div>src/main/resources/</div>
                    <div className="pl-4 text-amber-400">├── schema.sql • PostgreSQL 17</div>
                    <div className="pl-4 text-cyan-400">└── postman_collection.json • Postman v2.1</div>
                    <div className="text-white pt-2 font-bold font-mono">pom.xml • Spring Boot 4.1.0</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#242934] bg-[#0a0c10] py-10 text-center text-xs text-slate-500 font-mono">
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
