import { RequireAuth, useAuth } from "../lib/auth";
import { Navigate } from "../lib/router";
import Shell from "./Shell";
import { adminNav, memberNav } from "../nav";
import AdminHome from "../pages/admin/AdminHome";

export function MemberShell() { const { isStaff } = useAuth(); return <RequireAuth><Shell kind="member" items={memberNav(isStaff)} /></RequireAuth>; }
function StaffShellInner() { const { isAdmin } = useAuth(); return <Shell kind="admin" items={adminNav(isAdmin)} />; }
export function StaffShell() { return <RequireAuth staff><StaffShellInner /></RequireAuth>; }
export function AdminIndex() { const { isAdmin } = useAuth(); return isAdmin ? <AdminHome /> : <Navigate to="/admin/reportes" replace />; }
export function AdminOnly({ children }) { const { isAdmin } = useAuth(); return isAdmin ? children : <Navigate to="/admin/reportes" replace />; }
