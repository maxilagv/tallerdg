const PDFDocument = require("pdfkit");

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-AR");
}

function ensureSpace(doc, cursorY, needed = 60) {
  if (cursorY + needed <= 760) return cursorY;
  doc.addPage();
  return 40;
}

function drawHeader(doc, orden, configuracion) {
  doc.fontSize(20).font("Helvetica-Bold").fillColor("#1f2a44").text(configuracion.taller_nombre || "TallerPro");
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
    .text("Orden de trabajo", 360, 40, { align: "right" })
    .fontSize(14)
    .text(orden.numero, 360, 62, { align: "right" });

  doc.moveTo(40, 104).lineTo(555, 104).strokeColor("#d1d5db").stroke();
}

function drawDataBlock(doc, orden) {
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#6b7280").text("CLIENTE", 40, 120);
  doc
    .font("Helvetica")
    .fillColor("#111827")
    .text(`${orden.cliente_apellido}, ${orden.cliente_nombre}`, 40, 134)
    .text(`Telefono: ${orden.cliente_telefono || "-"}`, 40, 148)
    .text(`Fecha ingreso: ${formatDate(orden.created_at)}`, 40, 162);

  doc.fontSize(9).font("Helvetica-Bold").fillColor("#6b7280").text("VEHICULO", 320, 120);
  doc
    .font("Helvetica")
    .fillColor("#111827")
    .text(`${orden.patente} - ${orden.marca} ${orden.modelo} ${orden.anio || ""}`, 320, 134)
    .text(`Km ingreso: ${(Number(orden.km_entrada) || 0).toLocaleString("es-AR")}`, 320, 148)
    .text(`Estado: ${String(orden.estado || "-").replace(/_/g, " ")}`, 320, 162);
}

function drawSectionTitle(doc, title, y) {
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#1f2a44").text(title, 40, y);
  return y + 18;
}

function drawRows(doc, rows, y, labels) {
  doc.rect(40, y, 515, 18).fill("#eef2ff");
  doc
    .fillColor("#111827")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text(labels.descripcion, 45, y + 4)
    .text(labels.codigo || "", 365, y + 4)
    .text("Cant.", 480, y + 4, { width: 60, align: "right" });

  let cursorY = y + 18;
  rows.forEach((item, index) => {
    cursorY = ensureSpace(doc, cursorY, 24);
    if (index % 2 === 0) {
      doc.rect(40, cursorY, 515, 18).fill("#f8fafc");
    }

    doc
      .fillColor("#111827")
      .font("Helvetica")
      .fontSize(8)
      .text(item.descripcion, 45, cursorY + 4, { width: 300 })
      .text(item.codigo || "", 365, cursorY + 4, { width: 90 })
      .text(String(item.cantidad), 480, cursorY + 4, { width: 60, align: "right" });

    cursorY += 18;
  });

  return cursorY;
}

async function generarOrdenTrabajoPDF(orden, configuracion) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    drawHeader(doc, orden, configuracion);
    drawDataBlock(doc, orden);

    let cursorY = 205;

    if (orden.notas_cliente) {
      cursorY = ensureSpace(doc, cursorY, 52);
      cursorY = drawSectionTitle(doc, "Solicitud / notas del cliente", cursorY);
      doc.font("Helvetica").fontSize(9).fillColor("#111827").text(orden.notas_cliente, 40, cursorY, { width: 515 });
      cursorY += Math.max(24, doc.heightOfString(orden.notas_cliente, { width: 515 }) + 14);
    }

    if (orden.servicios?.length) {
      cursorY = ensureSpace(doc, cursorY + 6, 56);
      cursorY = drawSectionTitle(doc, "Trabajos a realizar / realizados", cursorY + 6);
      cursorY = drawRows(
        doc,
        orden.servicios.map((servicio) => ({
          descripcion: servicio.descripcion || servicio.servicio_nombre,
          cantidad: servicio.cantidad,
        })),
        cursorY,
        { descripcion: "Descripcion" }
      );
    }

    if (orden.productos?.length) {
      cursorY = ensureSpace(doc, cursorY + 14, 56);
      cursorY = drawSectionTitle(doc, "Repuestos y materiales", cursorY + 14);
      cursorY = drawRows(
        doc,
        orden.productos.map((producto) => ({
          descripcion: producto.descripcion || producto.producto_nombre,
          codigo: producto.codigo || "-",
          cantidad: `${producto.cantidad} ${producto.unidad || ""}`.trim(),
        })),
        cursorY,
        { descripcion: "Producto", codigo: "Codigo" }
      );
    }

    if (orden.notas_mecanico) {
      cursorY = ensureSpace(doc, cursorY + 18, 60);
      cursorY = drawSectionTitle(doc, "Observaciones del mecanico", cursorY + 18);
      doc.font("Helvetica").fontSize(9).fillColor("#111827").text(orden.notas_mecanico, 40, cursorY, { width: 515 });
    }

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#9ca3af")
      .text(`Generado el ${new Date().toLocaleDateString("es-AR")}`, 40, 785, { align: "center", width: 515 });

    doc.end();
  });
}

module.exports = { generarOrdenTrabajoPDF };
