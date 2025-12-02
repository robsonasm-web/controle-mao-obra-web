"use client";

import { useEffect, useState } from "react";
import { Button, Modal, Input, Select } from "@/components/UI";
import {
  getPagamentos,
  createPagamento,
  updatePagamento,
  deletePagamento,
  getObras,
  getColaboradores,
} from "@/lib/api";
import { Plus, Edit2, Trash2, Download } from "lucide-react";
import toast from "react-hot-toast";

export default function PagamentosPage() {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPdf, setLastPdf] = useState<null | { url?: string; dataUrl?: string; fileName?: string }>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    obra_id: "",
    colaborador_id: "",
    valor: "",
    data_pagamento: "",
    metodo: "pix",
    status: "pendente",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCortesOpen, setIsCortesOpen] = useState(false);
  const [cortesResult, setCortesResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [pagData, obrasData, colaboradoresData] = await Promise.all([
        getPagamentos(),
        getObras(),
        getColaboradores(),
      ]);
      setPagamentos(pagData || []);
      setObras(obrasData || []);
      setColaboradores(colaboradoresData || []);
    } catch (error) {
      toast.error("Erro ao carregar dados");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    try {
      if (!formData.obra_id || !formData.colaborador_id || !formData.valor || !formData.data_pagamento) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      const payload = {
        ...formData,
        valor: parseFloat(String(formData.valor)),
      };

      if (editingId) {
        await updatePagamento(editingId, payload);
        toast.success("Pagamento atualizado");
      } else {
        await createPagamento(payload);
        toast.success("Pagamento criado");
      }

      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar pagamento");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Confirma remoção deste pagamento?")) return;
    try {
      await deletePagamento(id);
      toast.success("Pagamento removido");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover pagamento");
    }
  }

  async function handleCalcularCortes() {
    try {
      setIsCortesOpen(true);
      const res = await fetch("/api/pagamentos/cortes");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao calcular cortes");
      setCortesResult(json);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao calcular cortes");
    }
  }

  async function handleCriarPagamentoFromCorte(c: any) {
    try {
      const periodoParts = (c.periodo || "").split(" a ");
      const periodoInicio = periodoParts[0];
      const periodoFim = periodoParts[1] || new Date().toISOString().split("T")[0];

      // check duplicate
      const checkRes = await fetch("/api/pagamentos/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colaborador_id: c.id, periodo_inicio: periodoInicio, periodo_fim: periodoFim }),
      });
      const checkJson = await checkRes.json();
      if (checkJson.exists) {
        const ok = confirm("Já existe pagamento para este colaborador no período. Deseja criar outro?");
        if (!ok) return;
      }

      const payload = {
        obra_id: "",
        colaborador_id: c.id || null,
        valor: Number(c.valor || 0),
        data_pagamento: periodoFim,
        metodo: "pix",
        status: "pendente",
      };

      await createPagamento(payload);
      toast.success("Pagamento criado para " + c.nome);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar pagamento");
    }
  }

  async function handleCriarTodosFromCortes() {
    if (!cortesResult) return;
    try {
      let created = 0;
      let skipped = 0;
      for (const c of cortesResult.colaboradores || []) {
        const periodoParts = (c.periodo || "").split(" a ");
        const periodoInicio = periodoParts[0];
        const periodoFim = periodoParts[1] || new Date().toISOString().split("T")[0];

        const checkRes = await fetch("/api/pagamentos/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ colaborador_id: c.id, periodo_inicio: periodoInicio, periodo_fim: periodoFim }),
        });
        const checkJson = await checkRes.json();
        if (checkJson.exists) {
          skipped++;
          continue;
        }

        const payload = {
          obra_id: "",
          colaborador_id: c.id || null,
          valor: Number(c.valor || 0),
          data_pagamento: periodoFim,
          metodo: "pix",
          status: "pendente",
        };
        await createPagamento(payload);
        created++;
      }

      toast.success(`Pagamentos criados: ${created}. Pulados por duplicidade: ${skipped}`);
      setIsCortesOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar pagamentos em lote");
    }
  }

  async function handleGerarPDF() {
    try {
      if (!cortesResult) {
        toast.error("Calcule os cortes antes de gerar o PDF");
        return;
      }

      const res = await fetch("/api/gerar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colaboradores: cortesResult.colaboradores, totalGeral: cortesResult.totalGeral, periodo: cortesResult.colaboradores?.[0]?.periodo || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao gerar PDF");

      if (data.url) {
        setLastPdf({ url: data.url, fileName: data.fileName });
        window.open(data.url, "_blank");
        return;
      }

      if (data.dataUrl) {
        const a = document.createElement("a");
        a.href = data.dataUrl;
        a.download = data.fileName || "pagamento.pdf";
        a.click();
        toast.success("PDF pronto para download");
        return;
      }

      toast.error("Resposta inesperada ao gerar PDF");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar PDF");
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pagamentos</h1>
        <div className="flex gap-2">
          <Button onClick={handleCalcularCortes} variant="secondary">
            Calcular Cortes
          </Button>
          <Button onClick={handleGerarPDF} variant="secondary">
            <Download size={18} className="mr-2" /> Gerar PDF
          </Button>
          <Button
            onClick={() => {
              setEditingId(null);
              setFormData({ obra_id: "", colaborador_id: "", valor: "", data_pagamento: "", metodo: "pix", status: "pendente" });
              setIsModalOpen(true);
            }}
            variant="primary"
          >
            <Plus size={18} className="mr-2" /> Novo Pagamento
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <table className="w-full table-auto">
          <thead>
            <tr className="text-left">
              <th>Colaborador</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Método</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pagamentos.map((p) => (
              <tr key={p.id} className="border-t">
                <td>{p.colaborador_id}</td>
                <td>R$ {Number(p.valor).toFixed(2)}</td>
                <td>{p.data_pagamento}</td>
                <td>{p.metodo}</td>
                <td>{p.status}</td>
                <td className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setFormData({
                        obra_id: p.obra_id || "",
                        colaborador_id: p.colaborador_id || "",
                        valor: String(p.valor || ""),
                        data_pagamento: p.data_pagamento || "",
                        metodo: p.metodo || "pix",
                        status: p.status || "pendente",
                      });
                      setIsModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} title={editingId ? "Editar Pagamento" : "Novo Pagamento"} onClose={() => setIsModalOpen(false)}>
        <Select
          label="Obra"
          value={formData.obra_id}
          onChange={(e) => setFormData({ ...formData, obra_id: e.target.value })}
          options={obras.map((o) => ({ value: o.id, label: o.nome }))}
        />
        <Select
          label="Colaborador"
          value={formData.colaborador_id}
          onChange={(e) => setFormData({ ...formData, colaborador_id: e.target.value })}
          options={colaboradores.map((c) => ({ value: c.id, label: c.nome }))}
        />
        <Input label="Valor" type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} placeholder="0.00" />
        <Input label="Data do Pagamento" type="date" value={formData.data_pagamento} onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })} />
        <Select
          label="Método"
          value={formData.metodo}
          onChange={(e) => setFormData({ ...formData, metodo: e.target.value })}
          options={[
            { value: "pix", label: "PIX" },
            { value: "dinheiro", label: "Dinheiro" },
            { value: "deposito", label: "Depósito" },
            { value: "transferencia", label: "Transferência" },
          ]}
        />
        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          options={[
            { value: "pendente", label: "Pendente" },
            { value: "pago", label: "Pago" },
            { value: "cancelado", label: "Cancelado" },
          ]}
        />
        <div className="flex gap-2 mt-6">
          <Button variant="primary" onClick={handleSubmit} className="flex-1">
            Salvar
          </Button>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
            Cancelar
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isCortesOpen} title="Cortes" onClose={() => setIsCortesOpen(false)}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <strong>Total Geral:</strong> R$ {Number(cortesResult?.totalGeral || 0).toFixed(2)}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCriarTodosFromCortes}>
                Criar Todos
              </Button>
              <Button variant="secondary" onClick={handleGerarPDF}>
                <Download size={16} className="mr-2" /> PDF
              </Button>
            </div>
          </div>

          <table className="w-full table-auto">
            <thead>
              <tr className="text-left">
                <th>Colaborador</th>
                <th>Tipo</th>
                <th>Horas</th>
                <th>Valor</th>
                <th>Período</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(cortesResult?.colaboradores || []).map((c: any) => (
                <tr key={c.id} className="border-t">
                  <td>{c.nome}</td>
                  <td>{c.tipo}</td>
                  <td>{c.horasTotal ?? "-"}</td>
                  <td>R$ {Number(c.valor || 0).toFixed(2)}</td>
                  <td>{c.periodo}</td>
                  <td className="flex gap-2">
                    <Button variant="primary" onClick={() => handleCriarPagamentoFromCorte(c)}>
                      Criar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
