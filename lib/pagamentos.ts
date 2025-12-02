// ===============================================
// CÁLCULO DE DATA DE CORTE - DIARISTAS
// ===============================================

/**
 * Retorna a data do último corte baseado no dia de corte configurado
 * Exemplo:
 * diaCorte = 4 (quinta) → retorna a última quinta-feira
 */
export function getUltimoCorte(diaCorte: number): string {
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=Domingo ... 6=Sábado

  const diff = (diaSemana - diaCorte + 7) % 7;

  const ultimo = new Date(hoje);
  ultimo.setDate(hoje.getDate() - diff);

  return ultimo.toISOString().split("T")[0];
}

/**
 * Retorna a data do penúltimo corte
 */
export function getPenultimoCorte(diaCorte: number): string {
  const ultimo = new Date(getUltimoCorte(diaCorte));
  ultimo.setDate(ultimo.getDate() - 7);
  return ultimo.toISOString().split("T")[0];
}

// ===============================================
// PERÍODOS FIXOS PARA EMPREITEIROS
// ===============================================

/**
 * Período 01 → 15 ou 16 → último dia do mês
 */
export function getPeriodoEmpreiteiro() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;

  const dia = hoje.getDate();

  if (dia <= 15) {
    return {
      inicio: `${ano}-${String(mes).padStart(2,"0")}-01`,
      fim: `${ano}-${String(mes).padStart(2,"0")}-15`,
    };
  }

  // Último dia do mês
  const ultimoDia = new Date(ano, mes, 0).getDate();

  return {
    inicio: `${ano}-${String(mes).padStart(2,"0")}-16`,
    fim: `${ano}-${String(mes).padStart(2,"0")}-${String(ultimoDia).padStart(2,"0")}`,
  };
}

// ===============================================
// CÁLCULO GERAL DO PAGAMENTO
// ===============================================

import { supabase } from "./supabaseClient";

/**
 * Calcula pagamento de TODOS os colaboradores (diaristas + empreiteiros).
 * Este é o método que será chamado pelo botão "Gerar Pagamento".
 */
interface Colaborador {
  id: string;
  nome: string;
  tipo_pagamento?: string;
  tipo?: string;
  dia_corte?: number;
  chave_pix?: string;
  valor_diaria?: number;
  valor_m2?: number;
}

interface ResultadoPagamento {
  nome: string;
  tipo: string;
  valor?: number;
  pix?: string;
  periodo?: string;
  erro?: string;
}

export async function calcularPagamentoGeral() {
  const { data: colaboradores } = await supabase
    .from("colaboradores")
    .select("*")
    .order("nome");

  if (!colaboradores) return { erro: "Nenhum colaborador encontrado." };

  const resultados: ResultadoPagamento[] = [];
  let totalGeral = 0;

  for (const colab of colaboradores) {
    const tipo = (colab as any).tipo || (colab as any).tipo_pagamento;
    if (tipo === "diarista") {
      // DIARISTA
      const resultado = await calcularPagamentoDiarista(colab);
      if (resultado.valor > 0) {
        resultados.push(resultado);
        totalGeral += resultado.valor;
      }
    } else {
      // EMPREITEIRO
      const resultado = await calcularPagamentoEmpreiteiro(colab);
      if (resultado.erro) {
        resultados.push(resultado); // Inserimos erro para mostrar na interface
      } else {
        if (resultado.valor > 0) {
          resultados.push(resultado);
          totalGeral += resultado.valor;
        }
      }
    }
  }

  return {
    colaboradores: resultados,
    totalGeral,
  };
}

// ===============================================
// CÁLCULO DE DIARISTAS
// ===============================================

async function calcularPagamentoDiarista(colab: Colaborador) {
  const penultimo = getPenultimoCorte(colab.dia_corte ?? 4);
  const ultimo = getUltimoCorte(colab.dia_corte ?? 4);

  const { data: diarias } = await supabase
    .from("diarias")
    .select("data, horas_trabalhadas, funcoes(valor_diaria)")
    .eq("colaborador_id", colab.id)
    .gte("data", penultimo)
    .lte("data", ultimo);

  if (!diarias || diarias.length === 0) {
    return { id: colab.id, nome: colab.nome, tipo: "diarista", valor: 0 };
  }

  let valorTotal = 0;
  let horasTotal = 0;

  for (const d of diarias) {
    // `funcoes` vem como um array quando selecionado via relacionamento
    // Ex: funcoes: [{ valor_diaria: 100 }]
    const funcoes = (d as any).funcoes;
    const valorFuncoes = Array.isArray(funcoes) ? Number(funcoes[0]?.valor_diaria ?? NaN) : Number(funcoes?.valor_diaria ?? NaN);
    const baseDiaria = !isNaN(valorFuncoes) ? valorFuncoes : Number(colab.valor_diaria ?? 0);

    // data da diaria para definir horas padrao
    const dataStr = (d as any).data;
    let diaSemana = null;
    try {
      diaSemana = new Date(dataStr).getDay(); // 0=Dom,1=Seg...6=Sab
    } catch (e) {
      diaSemana = null;
    }

    // horas padrao: seg(1)-qui(4)=9h, sex(5)=8h, outros=0 (usa horas_trabalhadas diretamente)
    let horasPadrao = 0;
    if (diaSemana >= 1 && diaSemana <= 4) horasPadrao = 9;
    else if (diaSemana === 5) horasPadrao = 8;

    const horasTrab = Number((d as any).horas_trabalhadas ?? horasPadrao ?? 0);
    horasTotal += horasTrab;

    // calcula valor por hora com base na diaria padrao; se horasPadrao==0 usa baseDiaria como valor fixo
    let valorDia = 0;
    if (horasPadrao > 0) {
      const valorHora = baseDiaria / horasPadrao;
      valorDia = valorHora * horasTrab;
    } else {
      // sem referencia de horas padrao, usa valor proporcional às horas trabalhadas considerando 1 dia
      valorDia = baseDiaria * (horasTrab || 1);
    }

    valorTotal += Number(valorDia || 0);
  }

  return {
    id: colab.id,
    nome: colab.nome,
    tipo: "diarista",
    periodo: `${penultimo} a ${ultimo}`,
    horasTotal,
    valor: valorTotal,
    pix: colab.chave_pix,
  };
}

// ===============================================
// CÁLCULO DE EMPREITEIROS
// ===============================================

async function calcularPagamentoEmpreiteiro(colab: Colaborador) {
  const periodo = getPeriodoEmpreiteiro();

  const { data: medicao } = await supabase
    .from("medicoes")
    .select("*")
    .eq("colaborador_id", colab.id)
    .eq("periodo_inicio", periodo.inicio)
    .eq("periodo_fim", periodo.fim)
    .maybeSingle();

  if (!medicao) {
    return {
      id: colab.id,
      nome: colab.nome,
      tipo: "empreiteiro",
      erro: `SEM MEDIÇÃO PARA O PERÍODO ${periodo.inicio} a ${periodo.fim}`,
    };
  }

  const valorUnitario = Number(medicao.valor_unitario ?? colab.valor_m2 ?? 0);
  const quantidade = Number(medicao.quantidade ?? 0);
  const valorTotal = Number(medicao.valor_total ?? (quantidade * valorUnitario));

  return {
    id: colab.id,
    nome: colab.nome,
    tipo: "empreiteiro",
    periodo: `${periodo.inicio} a ${periodo.fim}`,
    quantidade: quantidade,
    valor_unitario: valorUnitario,
    valor: valorTotal,
    pix: colab.chave_pix,
  };
}
