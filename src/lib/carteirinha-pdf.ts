import { jsPDF } from "jspdf";

export interface CarteirinhaData {
  full_name: string;
  matricula: string;
  cpf: string;
  joined_at: string | null;
  tenant_name: string;
  primary_color: string;
  accent_color: string;
  verify_url: string;
  photo_data_url?: string | null;
  qr_data_url?: string | null;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

export function generateCarteirinhaPDF(d: CarteirinhaData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54] });
  const [pr, pg, pb] = hexToRgb(d.primary_color);
  const [ar, ag, ab] = hexToRgb(d.accent_color);

  // background gradient (simulated with overlapping rects)
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, 85.6, 54, "F");
  doc.setFillColor(ar, ag, ab);
  doc.setGState(doc.GState({ opacity: 0.5 }));
  doc.rect(40, 0, 45.6, 54, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

  // header text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("CARTEIRA DE FILIADO", 5, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(d.tenant_name.slice(0, 36), 5, 10);

  // photo
  if (d.photo_data_url) {
    try { doc.addImage(d.photo_data_url, "JPEG", 5, 15, 18, 22); }
    catch { /* ignore */ }
  } else {
    doc.setFillColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.15 }));
    doc.rect(5, 15, 18, 22, "F");
    doc.setGState(doc.GState({ opacity: 1 }));
  }

  // name + matricula
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("NOME", 26, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(d.full_name.slice(0, 32), 26, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("MATRÍCULA", 26, 28);
  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.text(d.matricula, 26, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("CPF", 26, 37);
  doc.setFont("helvetica", "bold");
  doc.text(d.cpf, 26, 40);

  // QR
  if (d.qr_data_url) {
    try { doc.addImage(d.qr_data_url, "PNG", 65, 30, 18, 18); }
    catch { /* ignore */ }
  }

  // footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.text(`Desde ${d.joined_at ?? "—"}  ·  verificável online`, 5, 51);

  doc.save(`carteirinha-${d.matricula}.pdf`);
}
