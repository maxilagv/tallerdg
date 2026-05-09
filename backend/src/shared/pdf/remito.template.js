const PDFDocument = require("pdfkit");

function appendMoney(symbol, value) {
  return `${symbol} ${Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function generarRemitoPDF(orden, configuracion) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const symbol = configuracion.moneda_simbolo || "$";

    doc.fontSize(20).font("Helvetica-Bold").fillColor("#1f2a44").text(configuracion.taller_nombre || "TallerPro");
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#4b5563")
      .text(configuracion.taller_direccion || "")
      .text(`Tel: ${configuracion.taller_telefono || "-"} · CUIT: ${configuracion.taller_cuit || "-"}`);

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#111827")
      .text("Remito", 400, 40, { align: "right" })
      .fontSize(14)
      .text(orden.remito_numero, 400, 62, { align: "right" });

    doc.moveTo(40, 102).lineTo(555, 102).strokeColor("#d1d5db").stroke();

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#6b7280").text("CLIENTE", 40, 118);
    doc
      .font("Helvetica")
      .fillColor("#111827")
      .text(`${orden.cliente_apellido}, ${orden.cliente_nombre}`, 40, 132)
      .text(`Telefono: ${orden.cliente_telefono || "-"}`, 40, 146);

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#6b7280").text("VEHICULO", 320, 118);
    doc
      .font("Helvetica")
      .fillColor("#111827")
      .text(`${orden.patente} · ${orden.marca} ${orden.modelo} ${orden.anio || ""}`, 320, 132)
      .text(`Km ingreso: ${(orden.km_entrada || 0).toLocaleString("es-AR")}`, 320, 146);

    let cursorY = 184;

    if (orden.servicios?.length) {
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#1f2a44").text("Mano de obra", 40, cursorY);
      cursorY += 18;

      doc.rect(40, cursorY, 515, 18).fill("#eef2ff");
      doc
        .fillColor("#111827")
        .fontSize(8)
        .font("Helvetica-Bold")
        .text("Descripcion", 45, cursorY + 4)
        .text("Cant.", 370, cursorY + 4)
        .text("Precio", 420, cursorY + 4)
        .text("Subtotal", 485, cursorY + 4);
      cursorY += 18;

      orden.servicios.forEach((servicio, index) => {
        if (index % 2 === 0) {
          doc.rect(40, cursorY, 515, 16).fill("#f8fafc");
        }

        doc
          .fillColor("#111827")
          .font("Helvetica")
          .fontSize(8)
          .text(servicio.descripcion || servicio.servicio_nombre, 45, cursorY + 3, { width: 310 })
          .text(String(servicio.cantidad), 370, cursorY + 3)
          .text(appendMoney(symbol, servicio.precio_unitario), 420, cursorY + 3, { width: 55 })
          .text(appendMoney(symbol, servicio.subtotal), 485, cursorY + 3, { width: 65, align: "right" });

        cursorY += 16;
      });
    }

    if (orden.productos?.length) {
      cursorY += 12;
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#1f2a44").text("Repuestos y materiales", 40, cursorY);
      cursorY += 18;

      doc.rect(40, cursorY, 515, 18).fill("#fff7ed");
      doc
        .fillColor("#111827")
        .fontSize(8)
        .font("Helvetica-Bold")
        .text("Producto", 45, cursorY + 4)
        .text("Codigo", 295, cursorY + 4)
        .text("Cant.", 360, cursorY + 4)
        .text("Precio", 410, cursorY + 4)
        .text("Subtotal", 485, cursorY + 4);
      cursorY += 18;

      orden.productos.forEach((producto, index) => {
        if (index % 2 === 0) {
          doc.rect(40, cursorY, 515, 16).fill("#fffbf5");
        }

        doc
          .fillColor("#111827")
          .font("Helvetica")
          .fontSize(8)
          .text(producto.descripcion || producto.producto_nombre, 45, cursorY + 3, { width: 240 })
          .text(producto.codigo || "-", 295, cursorY + 3)
          .text(String(producto.cantidad), 360, cursorY + 3)
          .text(appendMoney(symbol, producto.precio_unitario), 410, cursorY + 3, { width: 60 })
          .text(appendMoney(symbol, producto.subtotal), 485, cursorY + 3, { width: 65, align: "right" });

        cursorY += 16;
      });
    }

    cursorY += 14;
    doc.moveTo(40, cursorY).lineTo(555, cursorY).strokeColor("#d1d5db").stroke();
    cursorY += 12;

    doc.fontSize(9).font("Helvetica").fillColor("#4b5563");
    doc.text("Subtotal:", 385, cursorY);
    doc.text(appendMoney(symbol, orden.subtotal), 470, cursorY, { width: 80, align: "right" });

    if (Number(orden.descuento) > 0) {
      cursorY += 14;
      doc.fillColor("#dc2626").text("Descuento:", 385, cursorY);
      doc.text(`- ${appendMoney(symbol, orden.descuento)}`, 440, cursorY, { width: 110, align: "right" });
    }

    if (Number(orden.iva_monto) > 0) {
      const baseImponible = Math.max(0, Number(orden.subtotal) - Number(orden.descuento || 0));
      cursorY += 14;
      doc.fillColor("#4b5563").text("Base imponible:", 385, cursorY);
      doc.text(appendMoney(symbol, baseImponible), 440, cursorY, { width: 110, align: "right" });

      cursorY += 14;
      doc.text(`IVA ${Number(orden.iva_porcentaje || 0).toLocaleString("es-AR")}%:`, 385, cursorY);
      doc.text(appendMoney(symbol, orden.iva_monto), 440, cursorY, { width: 110, align: "right" });
    }

    cursorY += 18;
    doc.rect(380, cursorY - 4, 175, 24).fill("#1f2937");
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("TOTAL", 390, cursorY)
      .text(appendMoney(symbol, orden.total), 455, cursorY, { width: 90, align: "right" });

    if (orden.notas_mecanico) {
      cursorY += 38;
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#6b7280").text("Observaciones del mecanico", 40, cursorY);
      doc.font("Helvetica").fillColor("#111827").text(orden.notas_mecanico, 40, cursorY + 14, { width: 515 });
    }

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#9ca3af")
      .text(`Generado el ${new Date().toLocaleDateString("es-AR")}`, 40, 785, { align: "center", width: 515 });

    doc.end();
  });
}

module.exports = { generarRemitoPDF };
