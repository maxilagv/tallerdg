const XLSX = require("xlsx");

function pickValue(row, keys) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet);
}

function parsearProductosExcel(buffer) {
  const rows = parseWorkbook(buffer);

  return rows
    .map((row) => {
      const stockMinimoValue = pickValue(row, ["Stock mínimo", "stock_minimo", "stock minimo"]);

      return {
        nombre: String(pickValue(row, ["Nombre", "nombre", "NOMBRE"]) || "").trim(),
        codigo: String(pickValue(row, ["Código", "Codigo", "codigo"]) || "").trim(),
        marca: String(pickValue(row, ["Marca", "marca"]) || "").trim(),
        precio_costo: toNumber(pickValue(row, ["Precio costo", "precio_costo", "Costo"])),
        precio_venta: toNumber(pickValue(row, ["Precio venta", "precio_venta", "Precio", "precio"])),
        stock_actual: toNumber(pickValue(row, ["Stock", "stock_actual", "stock"])),
        stock_minimo: stockMinimoValue === undefined ? undefined : toNumber(stockMinimoValue),
        unidad: String(pickValue(row, ["Unidad", "unidad"]) || "unidad").trim(),
      };
    })
    .filter((row) => row.nombre);
}

function parsearServiciosExcel(buffer) {
  const rows = parseWorkbook(buffer);

  return rows
    .map((row) => ({
      nombre: String(pickValue(row, ["Nombre", "nombre"]) || "").trim(),
      descripcion: String(pickValue(row, ["Descripción", "descripcion", "Descripción breve"]) || "").trim(),
      precio_base: toNumber(pickValue(row, ["Precio", "precio_base", "precio"])),
    }))
    .filter((row) => row.nombre);
}

module.exports = {
  parsearProductosExcel,
  parsearServiciosExcel,
};
