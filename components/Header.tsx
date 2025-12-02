"use client";

import React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-blue-500 rounded-lg"
          >
            <Menu size={24} />
          </button>
          <Link href="/" className="font-bold text-xl">
            🏗️ Controle Mão de Obra
          </Link>
        </div>
        <div className="text-sm opacity-90">
          Tailored Engenharia
        </div>
      </div>
    </header>
  );
}
