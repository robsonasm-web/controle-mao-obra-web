import { NextResponse } from 'next/server';
import { calcularPagamentoGeral } from '@/lib/pagamentos';

export async function GET() {
  try {
    const resultado = await calcularPagamentoGeral();
    return NextResponse.json({ ok: true, resultado });
  } catch (err) {
    console.error('Erro ao calcular cortes:', err);
    return NextResponse.json({ ok: false, error: (err as any)?.message || 'Erro interno' }, { status: 500 });
  }
}
