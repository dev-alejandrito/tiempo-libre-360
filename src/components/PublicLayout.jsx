import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "@/lib/router";

import WhatsAppButton from "./WhatsAppButton";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "../lib/contact";

import { Logo } from "./ui";
import { useAuth } from "../lib/auth";
import SocialLinks from "./SocialLinks";
import { CONTACT_EMAIL, gmailComposeUrl } from "../lib/contact";

const NAV = [["/", "Inicio"], ["/como-funciona", "Cómo funciona"], ["/explorar", "Explorar habilidades"], ["/comunidad", "Comunidad"], ["/comunidad-politecnica", "Comunidad Politécnica"], ["/faq", "FAQ"], ["/contacto", "Contacto"]];

/** @param {{ children?: import("react").ReactNode }} props */
export default function PublicLayout({ children }) {
  const [open, setOpen] = useState(false);
  const { me } = useAuth();
  const loc = useLocation();
  const link = ({ isActive }) => `rounded-full px-3 py-2 text-[.95rem] font-semibold no-underline ${isActive ? "bg-ink text-white" : "text-ink hover:bg-sand"}`;
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-amber focus:p-3 focus:font-bold">Saltar al contenido</a>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
            {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={link}>{label}</NavLink>)}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            {me ? <Link to="/app" className="btn btn-dark btn-sm">Mi panel</Link> : <>
              <Link to="/ingresar" className="btn btn-ghost btn-sm">Iniciar sesión</Link>
              <Link to="/registro" className="btn btn-primary btn-sm">Crear cuenta</Link>
            </>}
          </div>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="menu-movil">
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}<span className="sr-only">Menú</span>
          </button>
        </div>
        {open && (
          <nav id="menu-movil" aria-label="Menú móvil" className="border-t border-line bg-paper px-4 pb-4 lg:hidden">
            <ul className="flex flex-col gap-1 py-2">
              {NAV.map(([to, label]) => <li key={to}><NavLink to={to} end={to === "/"} onClick={() => setOpen(false)} className={(s) => link(s) + " block"}>{label}</NavLink></li>)}
            </ul>
            <div className="flex gap-2">
              {me ? <Link to="/app" onClick={() => setOpen(false)} className="btn btn-dark flex-1">Mi panel</Link> : <>
                <Link to="/ingresar" onClick={() => setOpen(false)} className="btn btn-ghost flex-1">Iniciar sesión</Link>
                <Link to="/registro" onClick={() => setOpen(false)} className="btn btn-primary flex-1">Crear cuenta</Link>
              </>}
            </div>
          </nav>
        )}
      </header>
      <main id="contenido" key={loc.pathname} className="flex-1">{children || <Outlet />}</main>
      <footer className="dark-surface bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-sm text-[#d5deec]">Tu tiempo tiene valor. Tus conocimientos también. Una comunidad donde 1 minuto de ayuda equivale a 1 crédito, sin dinero de por medio.</p>
          </div>
          <nav aria-label="Secciones">
            <h2 className="mb-3 text-lg font-bold">Plataforma</h2>
            <ul className="space-y-2 text-[#d5deec]">
              {NAV.map(([to, label]) => <li key={to}><Link className="underline-offset-4 hover:underline" to={to}>{label}</Link></li>)}
            </ul>
          </nav>
          <nav aria-label="Tu cuenta">
            <h2 className="mb-3 text-lg font-bold">Tu cuenta</h2>
            <ul className="space-y-2 text-[#d5deec]">
              <li><Link className="underline-offset-4 hover:underline" to="/registro">Crear cuenta</Link></li>
              <li><Link className="underline-offset-4 hover:underline" to="/ingresar">Iniciar sesión</Link></li>
            </ul>
            <p className="mt-6 text-sm text-[#d5deec]">Tel. <a className="underline underline-offset-4" href={"tel:" + CONTACT_PHONE_TEL}>{CONTACT_PHONE_DISPLAY}</a></p>
            <p className="mt-1 text-sm text-[#d5deec]">Correo <a className="break-all underline underline-offset-4" href={gmailComposeUrl()} target="_blank" rel="noopener noreferrer">{CONTACT_EMAIL}</a></p>
            <div className="mt-1 text-sm"><WhatsAppButton variant="footer">WhatsApp</WhatsAppButton></div>
            <SocialLinks footer className="mt-3" />
            <p className="mt-3 text-sm text-[#b9c6da]">{"\n"}</p>
          </nav>
          <nav aria-label="Información legal">
            <h2 className="mb-3 text-lg font-bold">Legal y confianza</h2>
            <ul className="space-y-2">
              {[["privacidad","Aviso de privacidad"],["terminos","Términos y condiciones"],["convivencia","Normas de convivencia"],["cancelaciones","Cancelaciones e intercambios"],["creditos","Créditos y cómo funcionan"],["datos-personales","Solicitudes sobre datos"]].map(([s,l]) => <li key={s}><Link className="underline-offset-4 hover:underline" to={"/legal/"+s}>{l}</Link></li>)}
            </ul>
          </nav>
        </div>
        <div className="border-t border-white/15 py-4 text-center text-sm text-[#b9c6da]">© {new Date().getFullYear()} TIEMPO LIBRE 360 — Banco de tiempo comunitario</div>
      </footer>
    </div>
  );
}
