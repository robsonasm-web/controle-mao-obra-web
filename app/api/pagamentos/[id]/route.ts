import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const VALID_METODOS = ["pix", "dinheiro", "deposito", "transferencia"];
const VALID_STATUS = ["pendente", "pago", "cancelado"];

function isValidDateYYYYMMDD(value: string) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export async function PUT(req: NextRequest, context: any) {
  try {
    const params = await (context.params ?? context?.params);
    const id = params?.id;
    const updates = await req.json();

    // Basic validation for updates
    if (updates.valor != null) {
      const nv = typeof updates.valor === 'number' ? updates.valor : Number(updates.valor);
      if (Number.isNaN(nv) || nv <= 0) {
        return NextResponse.json({ error: "'valor' inválido" }, { status: 400 });
      }
      updates.valor = nv;
    }

    if (updates.data_pagamento != null) {
      if (!isValidDateYYYYMMDD(updates.data_pagamento)) {
        return NextResponse.json({ error: "'data_pagamento' deve ter formato YYYY-MM-DD" }, { status: 400 });
      }
    }

    if (updates.metodo != null && !VALID_METODOS.includes(updates.metodo)) {
      return NextResponse.json({ error: "'metodo' inválido" }, { status: 400 });
    }

    if (updates.status != null && !VALID_STATUS.includes(updates.status)) {
      return NextResponse.json({ error: "'status' inválido" }, { status: 400 });
    }

    const { data, error } = await supabase.from("pagamentos").update(updates).eq("id", id).select();

    if (error) {
      console.error("Supabase error (update pagamento):", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ data: data?.[0] || null });
  } catch (err) {
    console.error("Error in PUT /api/pagamentos/[id]:", err);
    return NextResponse.json({ error: (err as any)?.message || String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: any) {
  try {
    const params = await (context.params ?? context?.params);
    const id = params?.id;
    const { error } = await supabase.from("pagamentos").delete().eq("id", id);
    if (error) {
      console.error("Supabase error (delete pagamento):", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in DELETE /api/pagamentos/[id]:", err);
    return NextResponse.json({ error: (err as any)?.message || String(err) }, { status: 500 });
  }
}
