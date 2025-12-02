"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/UI";
import { getEstatisticas } from "@/lib/api";
import { Building2, Users, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [stats, setStats] = useState({
    totalObras: 0,
    totalColaboradores: 0,
    totalDiarias: 0,
    totalPagamentos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getEstatisticas();
        setStats(data);
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Bem-vindo ao sistema de controle de mão de obra</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    return (
      <ProtectedPage>
        <h1>Bem-vindo ao Controle de Mão de Obra</h1>
      </ProtectedPage>
    );
        />

        <Card
