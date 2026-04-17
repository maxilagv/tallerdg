const BusquedaRepository = require("./busqueda.repository");
const AppError = require("../../shared/errors/AppError");

function canAccess(permisos, modulo) {
  return permisos?.["*"] === "rw" || Boolean(permisos?.[modulo]);
}

const BusquedaService = {
  async buscar(query, user) {
    if (!query || query.trim().length < 2) {
      throw new AppError(
        "Escribe al menos 2 caracteres para buscar.",
        400,
        "QUERY_TOO_SHORT"
      );
    }

    const q = query.trim();
    const permisos = user?.permisos || {};

    const tasks = [
      canAccess(permisos, "clientes")
        ? BusquedaRepository.buscarClientes(q)
        : Promise.resolve([]),
      canAccess(permisos, "vehiculos")
        ? BusquedaRepository.buscarVehiculos(q)
        : Promise.resolve([]),
      canAccess(permisos, "ordenes")
        ? BusquedaRepository.buscarOrdenes(q)
        : Promise.resolve([]),
    ];

    const [clientes, vehiculos, ordenes] = await Promise.all(tasks);

    return {
      clientes,
      vehiculos,
      ordenes,
      total: clientes.length + vehiculos.length + ordenes.length,
    };
  },
};

module.exports = BusquedaService;
