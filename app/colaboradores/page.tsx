"use client";

import { useEffect, useState } from "react";
import { Table, Button, Modal, Input, Select } from "@/components/UI";
import { getColaboradores, createColaborador, updateColaborador, deleteColaborador, type Colaborador } from "@/lib/api";
import { Plus, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    tipo: "diarista",
    chave_pix: "",
    valor_diaria: "",
    valor_m2: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadColaboradores();
  }, []);

  async function loadColaboradores() {
    try {
      const data = await getColaboradores();
      setColaboradores(data || []);
    } catch (error) {
      toast.error("Erro ao carregar colaboradores");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    try {
      if (!formData.nome || !formData.cpf) {
        toast.error("Preencha nome e CPF");
        return;
      }

      const payload = {
        ...formData,
        valor_diaria: formData.valor_diaria !== undefined && formData.valor_diaria !== "" ? Number(formData.valor_diaria) : 0,
        valor_m2: formData.valor_m2 !== undefined && formData.valor_m2 !== "" ? Number(formData.valor_m2) : 0,
      };

      if (editingId) {
        await updateColaborador(editingId, payload);
        toast.success("Colaborador atualizado");
      } else {
        await createColaborador(payload);
        toast.success("Colaborador criado");
      }

      setFormData({ nome: "", cpf: "", email: "", telefone: "", tipo: "diarista", chave_pix: "", valor_diaria: 0, valor_m2: 0 });
      setEditingId(null);
      setIsModalOpen(false);
      loadColaboradores();
    } catch (error: any) {
      console.error("Erro salvando colaborador:", error);
      const msg = error?.message || error?.error || String(error);
      toast.error("Erro ao salvar colaborador: " + msg);
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Tem certeza?")) {
      try {
        await deleteColaborador(id);
        toast.success("Colaborador deletado");
        loadColaboradores();
      } catch (error) {
        toast.error("Erro ao deletar");
      }
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Colaboradores</h1>
        <Button
          onClick={() => {
            setEditingId(null);
            setFormData({ nome: "", cpf: "", email: "", telefone: "", tipo: "diarista", chave_pix: "", valor_diaria: 0, valor_m2: 0 });
            setIsModalOpen(true);
          }}
          variant="primary"
        >
          <Plus size={20} className="mr-2" /> Novo Colaborador
        </Button>
      </div>

      <Table
        columns={[
          { key: "nome", label: "Nome" },
          { key: "cpf", label: "CPF" },
          { key: "tipo", label: "Tipo" },
          { key: "telefone", label: "Telefone" },
        ]}
        data={colaboradores}
        loading={loading}
        actions={(row) => (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingId((row as Colaborador).id);
                setFormData(row as Colaborador);
                setIsModalOpen(true);
              }}
              className="text-blue-600 hover:text-blue-900"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => handleDelete((row as Colaborador).id)}
              className="text-red-600 hover:text-red-900"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        title={editingId ? "Editar Colaborador" : "Novo Colaborador"}
        onClose={() => setIsModalOpen(false)}
      >
        <Input
          label="Nome"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          placeholder="Nome completo"
        />
        <Input
          label="CPF"
          value={formData.cpf}
          onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
          placeholder="000.000.000-00"
        />
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="email@example.com"
        />
        <Input
          label="Telefone"
          value={formData.telefone}
          onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
          placeholder="(11) 99999-9999"
        />
        <Select
          label="Tipo"
          value={formData.tipo}
          onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
          options={[
            { value: "diarista", label: "Diarista" },
            { value: "empreiteiro", label: "Empreiteiro" },
            { value: "supervisor", label: "Supervisor" },
          ]}
        />
        <Input
          label="Chave PIX"
          value={formData.chave_pix as string}
          onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
          placeholder="Chave PIX para pagamento"
        />
        {formData.tipo === 'diarista' && (
          <Input
            label="Valor da diária"
            type="number"
            step="0.01"
            value={(formData.valor_diaria ?? 0) as any}
            onChange={(e) => setFormData({ ...formData, valor_diaria: parseFloat(e.target.value) })}
            placeholder="0.00"
          />
        )}
        {formData.tipo === 'empreiteiro' && (
          <Input
            label="Valor por m²"
            type="number"
            step="0.01"
            value={(formData.valor_m2 ?? 0) as any}
            onChange={(e) => setFormData({ ...formData, valor_m2: parseFloat(e.target.value) })}
            placeholder="0.00"
          />
        )}
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
