import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { colaborador_id, periodo_inicio, periodo_fim } = body;

    if (!colaborador_id || !periodo_inicio || !periodo_fim) {
      return NextResponse.json({ ok: false, error: 'colaborador_id, periodo_inicio e periodo_fim são necessários' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('colaborador_id', colaborador_id)
      .gte('data_pagamento', periodo_inicio)
      .lte('data_pagamento', periodo_fim);

    if (error) {
      console.error('Erro ao checar pagamentos existentes:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, exists: (data && data.length > 0), matches: data || [] });
  } catch (err) {
    console.error('Erro no endpoint check pagamentos:', err);
    return NextResponse.json({ ok: false, error: (err as any)?.message || 'Erro interno' }, { status: 500 });
  }
}
