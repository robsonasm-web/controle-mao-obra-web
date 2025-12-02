"use client";

import { useEffect, useState } from "react";
import { Table, Button, Modal, Input, Select } from "@/components/UI";
import { getObras, createObra, updateObra, deleteObra, type Obra } from "@/lib/api";
import { Plus, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Obra>>({ nome: "", local: "", status: "ativo" });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadObras();
  }, []);

  async function loadObras() {
    try {
      const data = await getObras();
      setObras(data || []);
    } catch (error) {
      toast.error("Erro ao carregar obras");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    try {
      if (!formData.nome || !formData.local) {
        toast.error("Preencha todos os campos");
        return;
      }

      if (editingId) {
        await updateObra(editingId, formData as Partial<Obra>);
        toast.success("Obra atualizada");
      } else {
        await createObra(formData as Omit<Obra, "id" | "created_at">);
        toast.success("Obra criada");
      }

      setFormData({ nome: "", local: "", status: "ativo" });
      setEditingId(null);
      setIsModalOpen(false);
      loadObras();
    } catch (error) {
      toast.error("Erro ao salvar obra");
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Tem certeza?")) {
      try {
        await deleteObra(id);
        toast.success("Obra deletada");
        loadObras();
      } catch (error) {
        toast.error("Erro ao deletar");
      }
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Obras</h1>
        <Button
          onClick={() => {
            setEditingId(null);
            setFormData({ nome: "", local: "", status: "ativo" });
            setIsModalOpen(true);
          }}
          variant="primary"
        >
          <Plus size={20} className="mr-2" /> Nova Obra
        </Button>
      </div>

      <Table
        columns={[
          { key: "nome", label: "Nome" },
          { key: "local", label: "Local" },
          { key: "status", label: "Status" },
        ]}
        data={obras as Record<string, unknown>[]}
        loading={loading}
        actions={(row) => (
          <div className="flex gap-2">
            <button
              onClick={() => {
                const obra = row as Obra;
                setEditingId(obra.id);
                setFormData(obra);
                setIsModalOpen(true);
              }}
              className="text-blue-600 hover:text-blue-900"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => handleDelete((row as Obra).id)}
              className="text-red-600 hover:text-red-900"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        title={editingId ? "Editar Obra" : "Nova Obra"}
        onClose={() => setIsModalOpen(false)}
      >
        <Input
          label="Nome da Obra"
          value={formData.nome ?? ""}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          placeholder="Ex: Reforma Casa João"
        />
        <Input
          label="Local"
          value={formData.local ?? ""}
          onChange={(e) => setFormData({ ...formData, local: e.target.value })}
          placeholder="Ex: Rua das Flores, 123"
        />
        <Select
          label="Status"
          value={formData.status ?? "ativo"}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          options={[
            { value: "ativo", label: "Ativo" },
            { value: "pausado", label: "Pausado" },
            { value: "concluido", label: "Concluído" },
          ]}
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
