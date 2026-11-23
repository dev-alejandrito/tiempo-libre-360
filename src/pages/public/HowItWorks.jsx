import { Link } from "@/lib/router";
import { PageHeader } from "../../components/ui";

const FLOW = [
  ["Crea tu perfil", "Añade lo que ofreces y lo que quieres aprender (nombre, categoría, descripción, nivel y modalidad) y tu disponibilidad semanal."],
  ["Busca o recibe coincidencias", "Explora personas o mira las recomendaciones, con el motivo de cada una."],
  ["Envía una solicitud", "Elige la duración (15, 30, 45, 60, 90 o 120 minutos; 1 minuto = 1 crédito) y propón un horario. Tus créditos quedan reservados."],
  ["Acuerden el horario", "La otra persona acepta, rechaza o propone otro horario. Pueden añadir un enlace o lugar."],
  ["Realicen la sesión", "Se encuentran en persona o en línea, en la fecha acordada."],
  ["Ambos confirman", "Cuando las dos partes confirman que se realizó, los créditos pasan de quien aprendió a quien enseñó. Después se valoran mutuamente."],
];
const CREDITS = [["Disponible", "Créditos que puedes usar ahora."], ["Reservado", "Apartados para solicitudes abiertas. Se devuelven si se rechaza o cancela."], ["Recibido", "Todo lo que has ganado: sesiones, bienvenida y retos."], ["Utilizado", "Créditos que ya pagaste por sesiones completadas."]];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader title="Cómo funciona" subtitle="Un banco de tiempo: cada minuto que compartes se convierte en un minuto que puedes recibir." />
      <ol className="grid gap-4 md:grid-cols-2">
        {FLOW.map(([t, d], i) => (
          <li key={t} className="card flex gap-4">
            <span className="num grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber text-xl font-bold">{i + 1}</span>
            <div><h2 className="text-xl font-bold">{t}</h2><p className="mt-1 text-[#3c3829]">{d}</p></div>
          </li>
        ))}
      </ol>
      <h2 className="mt-14 text-3xl font-extrabold">Tu cartera de créditos</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CREDITS.map(([t, d]) => <div key={t} className="card-dark dark-surface"><h3 className="text-lg font-bold text-amber">{t}</h3><p className="mt-2 text-[#d9e2f0]">{d}</p></div>)}
      </div>
      <div className="card mt-6">
        <h3 className="text-xl font-bold">Reglas que protegen a todos</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[#3c3829]">
          <li>Cada movimiento queda registrado en tu historial y no se puede modificar ni duplicar.</li>
          <li>Nunca puedes quedar con saldo negativo: solo puedes solicitar lo que tienes disponible.</li>
          <li>Si surge un problema, puedes abrir un conflicto y el equipo de moderación decide con los créditos en custodia.</li>
          <li>Las cancelaciones tardías se anotan en tu pasaporte de confianza.</li>
          <li>No hay dinero real: esto no es una tienda ni un servicio de pago.</li>
        </ul>
      </div>
      <div className="mt-10 text-center"><Link to="/registro" className="btn btn-primary">Empezar ahora</Link></div>
    </div>
  );
}
