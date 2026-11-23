import { Link } from "@/lib/router";
import { PageHeader } from "../../components/ui";
import WhatsAppButton from "../../components/WhatsAppButton";
import SocialLinks from "../../components/SocialLinks";
import { CONTACT_EMAIL, gmailComposeUrl } from "../../lib/contact";

const TEMAS = [
  ["Programación", "?q=programaci%C3%B3n", "Lógica, algoritmos, web, bases de datos y más."],
  ["Matemáticas", "?q=matem%C3%A1ticas", "Cálculo, álgebra, probabilidad: asesorías para avanzar con confianza."],
  ["Electrónica", "?q=electr%C3%B3nica", "Circuitos, microcontroladores y prácticas de laboratorio."],
  ["Diseño", "?categoria=Arte%20y%20dise%C3%B1o", "Diseño gráfico, planos, presentaciones y creatividad."],
  ["Idiomas", "?categoria=Idiomas", "Inglés técnico y otros idiomas para estudiar y trabajar."],
  ["Tecnología", "?categoria=Tecnolog%C3%ADa", "Redes, herramientas digitales y soporte técnico."],
];
const GRUPOS = [["Estudiantes", "Pide asesorías y comparte lo que dominas."], ["Docentes", "Ofrece tutorías y aprende de otras disciplinas."], ["Egresados", "Devuelve experiencia profesional a quien viene detrás."], ["Trabajadores", "Comparte oficios y habilidades; también aprende nuevas."]];

export default function Politecnica() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader title="Comunidad Politécnica" subtitle="Un espacio para que estudiantes, docentes, egresados y trabajadores del ámbito politécnico intercambien conocimientos, asesorías y habilidades con créditos de tiempo." />
      <section aria-labelledby="quienes" className="mt-2">
        <h2 id="quienes" className="text-2xl font-bold">Para toda la comunidad</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GRUPOS.map(([t, d]) => <li key={t} className="card"><h3 className="text-lg font-bold">{t}</h3><p className="mt-1 text-slate-700">{d}</p></li>)}
        </ul>
      </section>
      <section aria-labelledby="temas" className="mt-10">
        <h2 id="temas" className="text-2xl font-bold">Temas para aprender y enseñar</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMAS.map(([t, q, d]) => (
            <li key={t}><Link to={"/explorar" + q} className="card block h-full hover:shadow-md"><h3 className="text-lg font-bold">{t}</h3><p className="mt-1 text-slate-700">{d}</p><span className="mt-3 inline-block font-bold underline underline-offset-4">Ver personas</span></Link></li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="pasos" className="mt-10">
        <h2 id="pasos" className="text-2xl font-bold">Cómo empezar en 4 pasos</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Crea tu cuenta","Gratis y sin correo institucional."],["Publica lo que sabes","Una habilidad para enseñar y otra que quieras aprender."],["Agenda una clase","Elige un horario libre; los créditos se apartan solos."],["Confirma y valora","Al terminar, ambas personas confirman y ganan reputación."]].map(([t, d], i) => <li key={t} className="card"><span className="text-sm font-bold text-teal-800">Paso {i + 1}</span><h3 className="text-lg font-bold">{t}</h3><p className="mt-1 text-slate-700">{d}</p></li>)}
        </ol>
      </section>
      <section aria-labelledby="ideas" className="mt-10 card">
        <h2 id="ideas" className="text-2xl font-bold">Ideas de intercambio</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 list-disc pl-5 text-slate-700">
          <li>Asesoría de cálculo a cambio de práctica de inglés técnico.</li>
          <li>Ayuda con un circuito a cambio de diseño de un cartel o presentación.</li>
          <li>Repaso de programación a cambio de apoyo con redacción de reportes.</li>
          <li>Sesión de laboratorio en pareja o clase virtual de 30 minutos.</li>
        </ul>
      </section>
      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="card-dark dark-surface">
          <h2 className="text-2xl font-bold">Abierta a todas las personas</h2>
          <p className="mt-2 text-[#d5deec]">Aunque nuestro enfoque principal es la comunidad politécnica, cualquier persona puede registrarse y participar. No pedimos correo institucional: basta con un correo cualquiera.</p>
          <Link to="/registro" className="btn btn-primary mt-4">Crear mi cuenta</Link>
        </div>
        <div className="card">
          <h2 className="text-2xl font-bold">¿Hablamos?</h2>
          <p className="mt-2 text-slate-700">Escríbenos para dudas, ideas o para sumar tu grupo o academia.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a className="btn btn-ghost min-h-11" href={gmailComposeUrl()} target="_blank" rel="noopener noreferrer">Enviar correo</a>
            <WhatsAppButton />
          </div>
          <SocialLinks className="mt-3" />
        </div>
      </section>
      <p className="mt-8 text-sm text-slate-700">TIEMPO LIBRE 360 es una iniciativa independiente de la comunidad. No es una plataforma oficial del Instituto Politécnico Nacional ni cuenta con su respaldo institucional.</p>
    </div>
  );
}
