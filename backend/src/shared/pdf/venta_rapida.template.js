const PDFDocument = require("pdfkit");

function appendMoney(symbol, value) {
  return `${symbol} ${Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function generarVentaRapidaPDF(venta, configuracion) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    const doc = new PDFDocument({ margin: 32, size: "A4" });

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const symbol = configuracion.moneda_simbolo || "$";
    const medioPagoLabel = {
      efectivo: "Efectivo",
      tarjeta: "Tarjeta",
      transferencia: "Transferencia",
      otro: "Otro",
    }[venta.medio_pago] || venta.medio_pago;

    doc.fontSize(18).font("Helvetica-Bold").fillColor("#1f2a44").text(configuracion.taller_nombre || "TallerPro");
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#4b5563")
      .text(configuracion.taller_direccion || "")
      .text(`Tel: ${configuracion.taller_telefono || "-"} - CUIT: ${configuracion.taller_cuit || "-"}`);

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#111827")
      .text("Comprobante caja rapida", 330, 32, { align: "right" })
      .fontSize(14)
      .text(`#${venta.id}`, 330, 54, { align: "right" });

    doc.moveTo(32, 94).lineTo(563, 94).strokeColor("#d1d5db").stroke();

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#6b7280").text("VENTA", 32, 112);
    doc
      .font("Helvetica")
      .fillColor("#111827")
      .text(`Fecha: ${formatDateTime(venta.created_at || venta.fecha)}`, 32, 128)
      .text(`Medio de pago: ${medioPagoLabel}`, 32, 142)
      .text(`Registrado por: ${venta.empleado_nombre?.trim() || "-"}`, 32, 156);

    let cursorY = 190;
    doc.rect(32, cursorY, 531, 20).fill("#eef2ff");
    doc
      .fillColor("#111827")
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("Producto", 38, cursorY + 5)
      .text("Cant.", 310, cursorY + 5)
      .text("Precio", 385, cursorY + 5)
      .text("Subtotal", 486, cursorY + 5, { width: 70, align: "right" });
    cursorY += 20;

    (venta.items || []).forEach((item, index) => {
      if (cursorY > 740) {
        doc.addPage();
        cursorY = 40;
      }

      if (index % 2 === 0) {
        doc.rect(32, cursorY, 531, 20).fill("#f8fafc");
      }

      doc
        .fillColor("#111827")
        .font("Helvetica")
        .fontSize(8)
        .text(item.producto_nombre, 38, cursorY + 5, { width: 260 })
        .text(`${item.cantidad} ${item.unidad || ""}`.trim(), 310, cursorY + 5, { width: 60 })
        .text(appendMoney(symbol, item.precio_unitario), 385, cursorY + 5, { width: 80 })
        .text(appendMoney(symbol, item.subtotal), 486, cursorY + 5, { width: 70, align: "right" });

      cursorY += 20;
    });

    cursorY += 16;
    doc.moveTo(32, cursorY).lineTo(563, cursorY).strokeColor("#d1d5db").stroke();
    cursorY += 16;

    const subtotal = (venta.items || []).reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    doc.fontSize(9).font("Helvetica").fillColor("#4b5563");
    doc.text("Subtotal:", 385, cursorY);
    doc.text(appendMoney(symbol, subtotal), 455, cursorY, { width: 95, align: "right" });

    if (Number(venta.iva_monto) > 0) {
      cursorY += 14;
      doc.text(`IVA ${Number(venta.iva_porcentaje || 0).toLocaleString("es-AR")}%:`, 385, cursorY);
      doc.text(appendMoney(symbol, venta.iva_monto), 455, cursorY, { width: 95, align: "right" });
    }

    cursorY += 22;
    doc.rect(385, cursorY - 6, 178, 28).fill("#1f2937");
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("TOTAL", 397, cursorY)
      .text(appendMoney(symbol, venta.total), 455, cursorY, { width: 95, align: "right" });

    if (venta.notas) {
      cursorY += 44;
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#6b7280").text("Notas", 32, cursorY);
      doc.font("Helvetica").fillColor("#111827").text(venta.notas, 32, cursorY + 14, { width: 531 });
    }

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#9ca3af")
      .text(`Generado el ${new Date().toLocaleDateString("es-AR")}`, 32, 785, { align: "center", width: 531 });

    doc.end();
  });
}

module.exports = { generarVentaRapidaPDF };
