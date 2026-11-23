import { Menu, X, LogOut, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "@/lib/router";

import { Logo } from "./ui";
import { useAuth } from "../lib/auth";
import { api, pb } from "../lib/pb";

export default function Shell({ items, kind }) {
  const { me, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const loc = useLocation();

  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  // Session reminders are created when the panel is open (there is no background scheduler).
  useEffect(() => {
    if (kind === "admin") return undefined;
    const run = () => api("/me/reminders", { method: "POST" }).then((r) => { if (r?.created) window.dispatchEvent(new Event("tl-notifs")); }).catch(() => {});
    run();
    const t = setInterval(run, 300000);
    return () => clearInterval(t);
  }, [kind]);
  useEffect(() => {
    let live = true;
    const load = () => pb.collection("notifications").getList(1, 1, { filter: "read = false", requestKey: null }).then((r) => live && setUnread(r.totalItems)).catch(() => {});
    load();
    const t = setInterval(load, 45000);
    window.addEventListener("tl-notifs", load);
    return () => { live = false; clearInterval(t); window.removeEventListener("tl-notifs", load); };
  }, []);

  const nav = (
    <nav aria-label={kind === "admin" ? "Administración" : "Panel"} className="flex-1 overflow-y-auto px-3 pb-4">
      <ul className="space-y-1">
        {items.map((it) => it && (
          <li key={it.to}>
            {it.section && <p className="px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-wider text-[#b9c6da]">{it.section}</p>}
            <NavLink to={it.to} end={it.end} className={({ isActive }) => `sidelink ${isActive ? "active" : ""}`}>
              <it.icon size={19} aria-hidden="true" />
              <span className="flex-1">{it.label}</span>
              {it.to === "/app/notificaciones" && unread > 0 && <span className="num rounded-full bg-mint px-2 text-xs font-bold text-ink">{unread}<span className="sr-only"> sin leer</span></span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
  const foot = (
    <div className="border-t border-white/10 p-3">
      <p className="truncate px-2 text-sm font-semibold text-white">{me?.name}</p>
      <p className="truncate px-2 pb-2 text-xs capitalize text-[#b9c6da]">{me?.role === "admin" ? "Administración" : me?.role === "moderator" ? "Moderación" : "Miembro"}</p>
      <button type="button" onClick={logout} className="sidelink w-full"><LogOut size={19} aria-hidden="true" />Cerrar sesión</button>
    </div>
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#panel" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[70] focus:rounded-lg focus:bg-amber focus:p-3 focus:font-bold">Saltar al contenido</a>
      <aside className="dark-surface sticky top-0 hidden h-screen flex-col bg-ink lg:flex">
        <div className="p-5"><Logo light /></div>
        {nav}{foot}
      </aside>
      <div className="dark-surface sticky top-0 z-40 flex items-center justify-between bg-ink px-4 py-2.5 lg:hidden">
        <Logo light />
        <div className="flex items-center gap-2">
          <Link to="/app/notificaciones" className="relative grid h-11 w-11 place-items-center rounded-full text-white"><Bell size={22} aria-hidden="true" />{unread > 0 && <span className="num absolute right-0 top-0 rounded-full bg-mint px-1.5 text-xs font-bold text-ink">{unread}</span>}<span className="sr-only">Notificaciones{unread > 0 ? ", " + unread + " sin leer" : ""}</span></Link>
          <button type="button" onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/60 text-white" aria-expanded={open}><Menu size={22} aria-hidden="true" /><span className="sr-only">Abrir menú</span></button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-ink/70" onClick={() => setOpen(false)} aria-label="Cerrar menú" />
          <div className="dark-surface absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink">
            <div className="flex items-center justify-between p-4"><Logo light /><button type="button" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full text-white" aria-label="Cerrar menú"><X size={22} aria-hidden="true" /></button></div>
            {nav}{foot}
          </div>
        </div>
      )}
      <main id="panel" className="min-w-0 p-4 md:p-8"><div className="mx-auto max-w-6xl"><Outlet /></div></main>
    </div>
  );
}
