"use client";

import { useEffect, useState } from "react";
import { Table, Button, Modal, Input, Select } from "@/components/UI";
import { getDiarias, createDiaria, updateDiaria, deleteDiaria, getObras, getColaboradores, type Diaria, type Obra, type Colaborador } from "@/lib/api";
import { Plus, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function DiariasPage() {
  const [diarias, setDiarias] = useState<Diaria[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({
    obra_id: "",
    colaborador_id: "",
    data: "",
    valor: "",
    descricao: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [diasData, obrasData, colaboradoresData] = await Promise.all([
        getDiarias(),
        getObras(),
        getColaboradores(),
      ]);
      setDiarias(diasData || []);
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
      if (!formData.obra_id || !formData.colaborador_id || !formData.data || !formData.valor) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      const payload = {
        obra_id: String(formData.obra_id),
        colaborador_id: String(formData.colaborador_id),
        data: String(formData.data),
        valor: parseFloat(String(formData.valor || 0)),
        descricao: String(formData.descricao || ""),
      };

      if (editingId) {
        await updateDiaria(editingId, payload);
        toast.success("Diária atualizada");
      } else {
        await createDiaria(payload);
        toast.success("Diária criada");
      }

      setFormData({ obra_id: "", colaborador_id: "", data: "", valor: "", descricao: "" });
      setEditingId(null);
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error("Erro ao salvar diária");
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Tem certeza?")) {
      try {
        await deleteDiaria(id);
        toast.success("Diária deletada");
        loadData();
      } catch (error) {
        toast.error("Erro ao deletar");
      }
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Diárias</h1>
        <Button
          onClick={() => {
            setEditingId(null);
            setFormData({ obra_id: "", colaborador_id: "", data: "", valor: "", descricao: "" });
            setIsModalOpen(true);
          }}
          variant="primary"
        >
          <Plus size={20} className="mr-2" /> Nova Diária
        </Button>
      </div>

      <Table
        columns={[
          { key: "data", label: "Data" },
          { key: "obra_id", label: "Obra" },
          { key: "colaborador_id", label: "Colaborador" },
          { key: "valor", label: "Valor" },
        ]}
        data={diarias.map(d => ({
          ...d,
          valor: `R$ ${parseFloat(String(d.valor || 0)).toFixed(2)}`,
        })) as Record<string, unknown>[]}
        loading={loading}
        actions={(row) => (
          <div className="flex gap-2">
            <button
              onClick={() => {
                const diaria = row as Diaria;
                setEditingId(diaria.id);
                setFormData(diaria);
                setIsModalOpen(true);
              }}
              className="text-blue-600 hover:text-blue-900"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => handleDelete((row as Diaria).id)}
              className="text-red-600 hover:text-red-900"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        title={editingId ? "Editar Diária" : "Nova Diária"}
        onClose={() => setIsModalOpen(false)}
      >
        <Select
          label="Obra"
          value={String(formData.obra_id || "")}
          onChange={(e) => setFormData({ ...formData, obra_id: e.target.value })}
          options={obras.map(o => ({ value: o.id, label: o.nome }))}
        />
        <Select
          label="Colaborador"
          value={String(formData.colaborador_id || "")}
          onChange={(e) => setFormData({ ...formData, colaborador_id: e.target.value })}
          options={colaboradores.map(c => ({ value: c.id, label: c.nome }))}
        />
        <Input
          label="Data"
          type="date"
          value={String(formData.data || "")}
          onChange={(e) => setFormData({ ...formData, data: e.target.value })}
        />
        <Input
          label="Valor"
          type="number"
          step="0.01"
          value={String(formData.valor || "")}
          onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || "" })}
          placeholder="0.00"
        />
        <Input
          label="Descrição"
          value={String(formData.descricao || "")}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          placeholder="Descrição do trabalho (opcional)"
        />
        <div className="flex gap-2 mt-6">
          <Button variant="primary" onClick={handleSubmit} className="flex-1">
            Salvar
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsModalOpen(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
