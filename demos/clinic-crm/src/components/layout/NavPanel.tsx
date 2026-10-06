import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../ui";
import { isSpecialist, ROLE_LABELS } from "../../lib/roles";
import { NAV } from "./nav-items";

interface Props {
  onNavigate?: () => void;
}

export function NavPanel({ onNavigate }: Props) {
  const { user, logout } = useAuth();
  const items = NAV.filter((item) => user && item.roles.includes(user.role));

  return (
    <>
      <div className="px-5 py-5 border-b border-line space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-sm shadow-float">
            К
          </div>
          <div>
            <div className="font-semibold text-ink text-sm leading-tight">Клиника</div>
            <div className="text-[11px] text-ink-muted">Демо-расписание</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "block px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-brand-light text-brand-dark shadow-sm"
                  : "text-ink-muted hover:bg-surface hover:text-ink",
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-line space-y-2">
        <div className="rounded-2xl bg-surface px-3 py-2">
          <div className="text-[11px] text-ink-muted">Пользователь</div>
          <div className="text-sm font-semibold text-ink">{user?.username}</div>
          {user && (
            <div className="mt-1 text-[11px] text-ink-muted">
              {ROLE_LABELS[user.role]}
              {isSpecialist(user.role) && user.employeeName ? ` · ${user.employeeName}` : ""}
            </div>
          )}
          <Button
            variant="ghost"
            className="mt-2 h-8 w-full text-xs"
            onClick={() => {
              onNavigate?.();
              logout();
            }}
          >
            Выйти
          </Button>
        </div>
      </div>
    </>
  );
}
