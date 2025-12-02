import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const VALID_METODOS = ["pix", "dinheiro", "deposito", "transferencia"];
const VALID_STATUS = ["pendente", "pago", "cancelado"];

function isValidDateYYYYMMDD(value: string) {
  if (typeof value !== "string") return false;
  // basic YYYY-MM-DD check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function validateCreatePayload(body: any) {
  const errors: string[] = [];
  const { obra_id, colaborador_id, valor, data_pagamento, metodo, status } = body;

  if (!obra_id) errors.push("'obra_id' é obrigatório");
  if (!colaborador_id) errors.push("'colaborador_id' é obrigatório");

  const numValor = typeof valor === "number" ? valor : Number(valor);
  if (Number.isNaN(numValor)) errors.push("'valor' deve ser um número");
  else if (numValor <= 0) errors.push("'valor' deve ser maior que 0");

  if (!data_pagamento) errors.push("'data_pagamento' é obrigatório");
  else if (!isValidDateYYYYMMDD(data_pagamento)) errors.push("'data_pagamento' deve ter formato YYYY-MM-DD");

  if (metodo && !VALID_METODOS.includes(metodo)) errors.push(`'metodo' inválido. Valores permitidos: ${VALID_METODOS.join(", ")}`);
  if (status && !VALID_STATUS.includes(status)) errors.push(`'status' inválido. Valores permitidos: ${VALID_STATUS.join(", ")}`);

  return { valid: errors.length === 0, errors, normalized: { obra_id, colaborador_id, valor: numValor, data_pagamento, metodo, status } };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { valid, errors, normalized } = validateCreatePayload(body);
    if (!valid) return NextResponse.json({ error: "Validação falhou", details: errors }, { status: 400 });

    const { obra_id, colaborador_id, valor, data_pagamento, metodo, status } = normalized;

    // Try inserting including metodo/status. If the table is missing these columns,
    // Supabase/Postgres will return an error — catch it and retry without the problematic columns.
    try {
      const { data, error } = await supabase.from("pagamentos").insert([
        { obra_id, colaborador_id, valor, data_pagamento, metodo: metodo || "pix", status: status || "pendente" },
      ]).select();

      if (error) throw error;
      return NextResponse.json({ data: data?.[0] || null });
    } catch (insertErr: any) {
      console.warn("Insert with metodo/status failed, checking for missing-column error:", insertErr?.message || insertErr);

      const msg: string = insertErr?.message || "";
      // Detect common Supabase/Postgres missing column messages
      const missingCols: string[] = [];
      const colMatch = msg.match(/could not find the '?(\w+)'? column/i) || msg.match(/column \"?(\w+)\"? does not exist/i);
      if (colMatch && colMatch[1]) missingCols.push(colMatch[1]);

      if (missingCols.length > 0) {
        // Build object excluding missing columns
        const payload: any = { obra_id, colaborador_id, valor, data_pagamento };
        // Try insert without missing columns
        try {
          const { data: data2, error: err2 } = await supabase.from("pagamentos").insert([payload]).select();
          if (err2) {
            console.error("Retry insert failed:", err2);
            return NextResponse.json({ error: err2.message, details: err2 }, { status: 500 });
          }
          console.info("Insert succeeded after removing missing columns:", missingCols);
          return NextResponse.json({ data: data2?.[0] || null });
        } catch (retryErr: any) {
          console.error("Retry insert threw:", retryErr);
          return NextResponse.json({ error: retryErr?.message || String(retryErr), details: retryErr }, { status: 500 });
        }
      }

      // If not a missing-column error, return the original error
      console.error("Supabase error (create pagamento):", insertErr);
      return NextResponse.json({ error: insertErr.message || String(insertErr), details: insertErr }, { status: 500 });
    }
  } catch (err) {
    console.error("Error in POST /api/pagamentos:", err);
    return NextResponse.json({ error: (err as any)?.message || String(err) }, { status: 500 });
  }
}
