"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Users,
  Calendar,
  CreditCard,
  X,
} from "lucide-react";

const menu = [
  { name: "Dashboard", href: "/", icon: Building2 },
  { name: "Obras", href: "/obras", icon: Building2 },
  { name: "Colaboradores", href: "/colaboradores", icon: Users },
  { name: "Diárias", href: "/diarias", icon: Calendar },
  { name: "Pagamentos", href: "/pagamentos", icon: CreditCard },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {!isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static left-0 top-16 md:top-0 h-[calc(100vh-4rem)] md:h-screen w-64 bg-slate-900 text-white shadow-lg transition-transform duration-300 z-40 ${
          !isOpen ? "-translate-x-full md:translate-x-0" : ""
        }`}
      >
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-bold">🏗️ Mão de Obra</h2>
          <p className="text-xs text-slate-400 mt-1">Tailored Engenharia</p>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {menu.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      isActive
                        ? "bg-blue-600 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                    onClick={onClose}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:hidden text-white hover:bg-slate-800 p-2 rounded"
        >
          <X size={24} />
        </button>
      </aside>
    </>
  );
}
