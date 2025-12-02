import { supabase } from "@/lib/supabaseClient";

export type Obra = {
  id: string;
  nome: string;
  local: string;
  status: string;
  created_at?: string;
};

export type Colaborador = {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  tipo: string;
  chave_pix?: string;
  valor_diaria?: number;
  valor_m2?: number;
  created_at?: string;
};

export type Diaria = {
  id: string;
  obra_id: string;
  colaborador_id: string;
  data: string;
  valor: number;
  descricao?: string;
  created_at?: string;
};

export type Pagamento = {
  id: string;
  obra_id: string;
  colaborador_id: string;
  valor: number;
  data_pagamento: string;
  metodo: string;
  status: string;
  created_at?: string;
};

// ============ OBRAS ============
export async function getObras(): Promise<Obra[]> {
  const { data, error } = await supabase
    .from("obras")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createObra(obra: Omit<Obra, "id" | "created_at">): Promise<Obra> {
  const { data, error } = await supabase
    .from("obras")
    .insert([obra])
    .select();
  
  if (error) throw new Error(error.message);
  return data?.[0] || ({} as Obra);
}

export async function updateObra(id: string, updates: { nome?: string; local?: string; status?: string }): Promise<Obra> {
  const { data, error } = await supabase
    .from("obras")
    .update(updates)
    .eq("id", id)
    .select();
  
  if (error) throw new Error(error.message);
  return data?.[0] || ({} as Obra);
}

export async function deleteObra(id: string) {
  const { error } = await supabase.from("obras").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============ COLABORADORES ============
export async function getColaboradores(): Promise<Colaborador[]> {
  const { data, error } = await supabase
    .from("colaboradores")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createColaborador(colab: Omit<Colaborador, "id" | "created_at">): Promise<Colaborador> {
  const { data, error } = await supabase
    .from("colaboradores")
    .insert([colab])
    .select();
  
  if (error) throw new Error(error.message);
  return data?.[0] || ({} as Colaborador);
}

export async function updateColaborador(id: string, updates: Partial<Colaborador>): Promise<Colaborador> {
  const { data, error } = await supabase
    .from("colaboradores")
    .update(updates)
    .eq("id", id)
    .select();
  
  if (error) throw new Error(error.message);
  return data?.[0] || ({} as Colaborador);
}

export async function deleteColaborador(id: string) {
  const { error } = await supabase.from("colaboradores").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============ DIÁRIAS ============
export async function getDiarias(filtros?: { obra_id?: string; colaborador_id?: string }): Promise<Diaria[]> {
  let query = supabase.from("diarias").select("*");
  
  if (filtros?.obra_id) query = query.eq("obra_id", filtros.obra_id);
  if (filtros?.colaborador_id) query = query.eq("colaborador_id", filtros.colaborador_id);
  
  const { data, error } = await query.order("data", { ascending: false });
  
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createDiaria(diaria: Omit<Diaria, "id" | "created_at">): Promise<Diaria> {
  const { data, error } = await supabase
    .from("diarias")
    .insert([diaria])
    .select();
  
  if (error) throw new Error(error.message);
  return data?.[0] || ({} as Diaria);
}

export async function updateDiaria(id: string, updates: Partial<Diaria>): Promise<Diaria> {
  const { data, error } = await supabase
    .from("diarias")
    .update(updates)
    .eq("id", id)
    .select();
  
  if (error) throw new Error(error.message);
  return data?.[0] || ({} as Diaria);
}

export async function deleteDiaria(id: string) {
  const { error } = await supabase.from("diarias").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============ PAGAMENTOS ============
export async function getPagamentos(filtros?: { obra_id?: string }): Promise<Pagamento[]> {
  let query = supabase.from("pagamentos").select("*");
  
  if (filtros?.obra_id) query = query.eq("obra_id", filtros.obra_id);
  
  const { data, error } = await query.order("data_pagamento", { ascending: false });
  
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createPagamento(pagamento: Omit<Pagamento, "id" | "created_at">): Promise<Pagamento> {
  // Use server-side API route to create pagamentos and receive structured errors
  const res = await fetch("/api/pagamentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pagamento),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Erro ao criar pagamento");
  }

  return json.data as Pagamento;
}

export async function updatePagamento(id: string, updates: Partial<Pagamento>): Promise<Pagamento> {
  const res = await fetch(`/api/pagamentos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Erro ao atualizar pagamento");
  }

  return json.data as Pagamento;
}

export async function deletePagamento(id: string) {
  const res = await fetch(`/api/pagamentos/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Erro ao deletar pagamento");
  }
}

// ============ ESTATÍSTICAS ============
export async function getEstatisticas() {
  const [obras, colaboradores, diarias, pagamentos] = await Promise.all([
    supabase.from("obras").select("id", { count: "exact" }),
    supabase.from("colaboradores").select("id", { count: "exact" }),
    supabase.from("diarias").select("valor"),
    supabase.from("pagamentos").select("valor"),
  ]);

  const totalDiarias = diarias.data?.reduce((acc, d) => acc + (d.valor || 0), 0) || 0;
  const totalPagamentos = pagamentos.data?.reduce((acc, p) => acc + (p.valor || 0), 0) || 0;

  return {
    totalObras: obras.count || 0,
    totalColaboradores: colaboradores.count || 0,
    totalDiarias,
    totalPagamentos,
  };
}
