"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/UI";
import { getEstatisticas } from "@/lib/api";
import { Building2, Users, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";
import ProtectedPage from '../components/ProtectedPage';

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
    <ProtectedPage>
      <h1>Bem-vindo ao Controle de Mão de Obra</h1>
    </ProtectedPage>
  );

