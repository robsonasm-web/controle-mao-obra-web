export async function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
import { PDFDocument, StandardFonts } from "pdf-lib";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    const { colaboradores, totalGeral, periodo } = await req.json();

    // Criar o PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = 760;

    page.drawText("Tailored Engenharia", {
      x: 200,
      y,
      size: 18,
      font,
    });

    y -= 30;

    page.drawText("Relatório de Pagamentos", {
      x: 200,
      y,
      size: 14,
      font,
    });

    y -= 30;
    page.drawText(`Período: ${periodo}`, { x: 50, y, size: 12, font });

    y -= 40;

    interface Colaborador {
      nome: string;
      tipo: string;
      valor: number;
      pix?: string;
    }

    colaboradores.forEach((c: Colaborador) => {
      page.drawText(
        `${c.nome} | ${c.tipo} | R$ ${Number(c.valor).toFixed(
          2
        )} | PIX: ${c.pix ?? "-"}`,
        { x: 50, y, size: 10, font }
      );
      y -= 20;
    });

    y -= 20;

    page.drawText(
      `TOTAL GERAL: R$ ${Number(totalGeral).toFixed(2)}`,
      { x: 50, y, size: 14, font }
    );

    const pdfBytes = await pdfDoc.save();

    const fileName = `pagamento_${Date.now()}.pdf`;
    // Se as variáveis do Supabase estiverem configuradas, tente fazer upload.
    const hasSupabase = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    if (hasSupabase) {
      const { error: uploadError } = await supabase.storage
        .from("pdf_pagamentos")
        .upload(fileName, pdfBytes, {
          contentType: "application/pdf",
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        // Em caso de falha de upload, cair no fallback e retornar o PDF como data URL
      } else {
        const { data: publicData } = await supabase.storage
          .from("pdf_pagamentos")
          .getPublicUrl(fileName);

        if (publicData?.publicUrl) {
          return NextResponse.json({ url: publicData.publicUrl, fileName });
        }
      }
    }

    // Fallback local: retornar o PDF como data URL (base64). Útil para desenvolvimento
    const base64 = Buffer.from(pdfBytes).toString("base64");
    const dataUrl = `data:application/pdf;base64,${base64}`;
    console.info(`Generated PDF ${fileName} (${pdfBytes?.length ?? base64.length} bytes). Using fallback dataUrl.`);
    return NextResponse.json({ dataUrl, fileName });
  } catch (error) {
    console.error("ERRO AO GERAR PDF:", error);
    return NextResponse.json(
      { error: "Erro interno ao gerar PDF." },
      { status: 500 }
    );
  }
}
