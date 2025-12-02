"use client";

import { useState } from "react";
import { calcularPagamentoGeral } from "@/lib/pagamentos";
import { supabase } from "@/lib/supabaseClient";

export default function GerarPagamentosPage() {
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // BOTÃO: CALCULAR PAGAMENTOS
  async function handleCalcular() {
    setLoading(true);
    setMensagem("");

    const res = await calcularPagamentoGeral();
    setResultado(res);

    setLoading(false);
  }

  // BOTÃO: SALVAR PAGAMENTO NO BANCO
  async function handleSalvarPagamento() {
    if (!resultado) return;

    setLoading(true);

    const data_inicio = resultado.colaboradores
      .map((c: any) => c.periodo?.split(" a ")[0])
      .filter(Boolean)[0];

    const data_fim = resultado.colaboradores
      .map((c: any) => c.periodo?.split(" a ")[1])
      .filter(Boolean)[0];

    const { data: pagamento, error } = await supabase
      .from("pagamentos_gerados")
      .insert({
        data_inicio,
        data_fim,
        valor_total: resultado.totalGeral,
        status: "PENDENTE",
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Erro ao salvar pagamento");
      setLoading(false);
      return;
    }

    // Salvar itens
    for (const item of resultado.colaboradores) {
      await supabase.from("pagamentos_itens").insert({
        pagamento_id: pagamento.id,
        colaborador_id: item.id,
        valor: item.valor,
        horas: item.horas || null,
        quantidade: item.quantidade || null,
        valor_unitario: item.valor_unitario || null,
        tipo: item.tipo,
        chave_pix: item.pix,
      });
    }

    setMensagem("Pagamento salvo como pendente!");
    setLoading(false);
  }

  // BOTÃO: GERAR PDF
  async function handleGerarPDF() {
    if (!resultado) return;

    const periodo = resultado.colaboradores
      .map((c: any) => c.periodo)
      .filter(Boolean)[0];

    const res = await fetch("/api/gerar-pdf", {
      method: "POST",
      body: JSON.stringify({
        colaboradores: resultado.colaboradores,
        totalGeral: resultado.totalGeral,
        periodo,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const json = await res.json();

    if (json.url) {
      window.open(json.url, "_blank");
    } else {
      alert("Erro ao gerar PDF");
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gerar Pagamentos</h1>

      <button
        onClick={handleCalcular}
        className="px-4 py-2 bg-blue-600 text-white rounded-md"
        disabled={loading}
      >
        {loading ? "Calculando..." : "Calcular Pagamentos"}
      </button>

      {mensagem && (
        <p className="mt-4 text-green-700 font-semibold">{mensagem}</p>
      )}

      {!resultado ? null : (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Prévia dos Pagamentos</h2>

          <table className="w-full border bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Colaborador</th>
                <th className="p-2 text-left">Tipo</th>
                <th className="p-2 text-left">Período</th>
                <th className="p-2 text-left">Valor (R$)</th>
                <th className="p-2 text-left">Chave Pix</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {resultado.colaboradores.map((c: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{c.nome}</td>
                  <td className="p-2 capitalize">{c.tipo}</td>
                  <td className="p-2">{c.periodo ?? "-"}</td>
                  <td className="p-2">
                    {c.valor ? `R$ ${Number(c.valor).toFixed(2)}` : "-"}
                  </td>
                  <td className="p-2">{c.pix ?? "-"}</td>
                  <td className="p-2">
                    {c.erro ? (
                      <span className="text-red-600 font-bold">
                        {c.erro}
                      </span>
                    ) : (
                      <span className="text-green-700 font-semibold">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* BOTÕES */}
          <div className="flex gap-3 mt-5">

            <button
              onClick={handleGerarPDF}
              className="px-5 py-2 bg-purple-600 text-white rounded-md"
            >
              Gerar PDF
            </button>

            <button
              onClick={handleSalvarPagamento}
              className="px-5 py-2 bg-green-600 text-white rounded-md"
            >
              Salvar Pagamento como Pendente
            </button>

          </div>

          <p className="mt-4 text-lg font-bold">
            TOTAL GERAL: R$ {Number(resultado.totalGeral).toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
