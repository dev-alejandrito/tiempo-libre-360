// Adaptador: las páginas originales usaban React Router; aquí se apoyan en TanStack Router
// con la misma forma (Link, NavLink, useNavigate, useLocation, useParams, useSearchParams, Navigate, Outlet).
import { forwardRef, useEffect } from "react";
import {
  Link as TLink,
  Outlet,
  useNavigate as useTNavigate,
  useParams as useTParams,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";

export { Outlet };

function split(to) {
  const s = String(to ?? "/");
  const hashAt = s.indexOf("#");
  const hash = hashAt >= 0 ? s.slice(hashAt + 1) : undefined;
  const noHash = hashAt >= 0 ? s.slice(0, hashAt) : s;
  const qAt = noHash.indexOf("?");
  const pathname = (qAt >= 0 ? noHash.slice(0, qAt) : noHash) || "/";
  const search = qAt >= 0 ? Object.fromEntries(new URLSearchParams(noHash.slice(qAt + 1))) : undefined;
  return { pathname, search, hash };
}

export const Link = forwardRef(function Link({ to, state, replace, ...rest }, ref) {
  const t = split(to);
  return <TLink ref={ref} to={t.pathname} search={t.search ?? {}} hash={t.hash} state={state} replace={replace} {...rest} />;
});

export function useLocation() {
  return useRouterState({
    select: (s) => ({ pathname: s.location.pathname, search: s.location.searchStr || "", hash: s.location.hash ? "#" + s.location.hash : "", state: s.location.state }),
    structuralSharing: true,
  });
}

export const NavLink = forwardRef(function NavLink({ to, end, className, style, children, ...rest }, ref) {
  const { pathname } = useLocation();
  const target = split(to).pathname.replace(/\/+$/, "") || "/";
  const here = pathname.replace(/\/+$/, "") || "/";
  const isActive = end || target === "/" ? here === target : here === target || here.startsWith(target + "/");
  const cls = typeof className === "function" ? className({ isActive }) : className;
  const st = typeof style === "function" ? style({ isActive }) : style;
  return (
    <Link ref={ref} to={to} className={cls} style={st} aria-current={isActive ? "page" : undefined}
      activeProps={{}} inactiveProps={{}} activeOptions={{ exact: !!(end || target === "/"), includeSearch: false }} {...rest}>
      {typeof children === "function" ? children({ isActive }) : children}
    </Link>
  );
});

export function useNavigate() {
  const navigate = useTNavigate();
  const router = useRouter();
  return (to, opts = {}) => {
    if (typeof to === "number") { router.history.go(to); return; }
    const t = split(to);
    navigate({ to: t.pathname, search: t.search ?? {}, hash: t.hash, replace: !!opts.replace, state: opts.state });
  };
}

export function useParams() {
  return useTParams({ strict: false });
}

export function useSearchParams() {
  const { search } = useLocation();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const sp = new URLSearchParams(search);
  const set = (next, opts) => {
    const p = next instanceof URLSearchParams ? next : new URLSearchParams(typeof next === "function" ? next(sp) : next);
    const s = p.toString();
    nav(pathname + (s ? "?" + s : ""), opts);
  };
  return [sp, set];
}

export function Navigate({ to, replace, state }) {
  const nav = useNavigate();
  useEffect(() => { nav(to, { replace, state }); }, [to]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
