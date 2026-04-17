const bcrypt = require("bcryptjs");
const { z } = require("zod");
const AppError = require("../../shared/errors/AppError");
const EmpleadosRepository = require("./empleados.repository");
const {
  createEmpleadoSchema,
  updateEmpleadoSchema,
  listEmpleadosSchema,
  changePasswordSchema,
  rolePermissionsSchema,
} = require("./empleados.validation");

const idSchema = z.coerce.number().int().positive();

function parseId(value) {
  const parsed = idSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError("Identificador invalido.", 400, "VALIDATION_ERROR");
  }

  return parsed.data;
}

function parsePermisos(permisos) {
  if (!permisos) {
    return {};
  }

  return typeof permisos === "string" ? JSON.parse(permisos) : permisos;
}

function compactPermisos(permisos) {
  return Object.fromEntries(
    Object.entries(permisos || {}).filter(([, value]) => value && value !== "none")
  );
}

const EmpleadosService = {
  async listar(query) {
    const parsed = listEmpleadosSchema.safeParse(query);

    if (!parsed.success) {
      throw new AppError("Parametros invalidos.", 400, "VALIDATION_ERROR");
    }

    const result = await EmpleadosRepository.findAll(parsed.data);

    return {
      ...result,
      rows: result.rows.map((item) => ({
        ...item,
        permisos: parsePermisos(item.permisos),
      })),
    };
  },

  async obtener(id) {
    const empleadoId = parseId(id);
    const empleado = await EmpleadosRepository.findById(empleadoId);

    if (!empleado) {
      throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");
    }

    return { ...empleado, permisos: parsePermisos(empleado.permisos) };
  },

  async crear(data) {
    const parsed = createEmpleadoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    const role = await EmpleadosRepository.findRoleById(parsed.data.rol_id);
    if (!role) {
      throw new AppError("El rol seleccionado no existe.", 404, "NOT_FOUND");
    }

    const existingEmail = await EmpleadosRepository.findByEmail(parsed.data.email);
    if (existingEmail) {
      throw new AppError("Ya existe un empleado con ese email.", 409, "EMAIL_IN_USE");
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const empleado = await EmpleadosRepository.create({
      rol_id: parsed.data.rol_id,
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido,
      telefono: parsed.data.telefono || null,
      email: parsed.data.email,
      password_hash: passwordHash,
      activo: 1,
    });

    return { ...empleado, permisos: parsePermisos(empleado.permisos) };
  },

  async actualizar(id, data) {
    const empleadoId = parseId(id);
    const existing = await EmpleadosRepository.findById(empleadoId);

    if (!existing) {
      throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");
    }

    const parsed = updateEmpleadoSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    if (parsed.data.rol_id) {
      const role = await EmpleadosRepository.findRoleById(parsed.data.rol_id);
      if (!role) {
        throw new AppError("El rol seleccionado no existe.", 404, "NOT_FOUND");
      }
    }

    if (parsed.data.email && parsed.data.email !== existing.email) {
      const emailUsed = await EmpleadosRepository.findByEmail(parsed.data.email);
      if (emailUsed) {
        throw new AppError("Ya existe un empleado con ese email.", 409, "EMAIL_IN_USE");
      }
    }

    if (existing.rol_id === 1 && parsed.data.activo === false) {
      const adminsActivos = await EmpleadosRepository.countAdminsActivos();
      if (adminsActivos <= 1) {
        throw new AppError("Debe quedar al menos un administrador activo.", 400, "LAST_ADMIN");
      }
    }

    const empleado = await EmpleadosRepository.update(empleadoId, {
      ...parsed.data,
      ...(parsed.data.telefono !== undefined && { telefono: parsed.data.telefono || null }),
    });

    return { ...empleado, permisos: parsePermisos(empleado.permisos) };
  },

  async cambiarPassword(id, data, solicitante) {
    const empleadoId = parseId(id);
    const parsed = changePasswordSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    const empleado = await EmpleadosRepository.findById(empleadoId);
    if (!empleado) {
      throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");
    }

    const permisos = solicitante?.permisos || {};
    const isAdmin = permisos["*"] === "rw";

    if (!isAdmin && Number(solicitante?.id) !== empleadoId) {
      throw new AppError("No tienes permiso para cambiar esta contraseña.", 403, "FORBIDDEN");
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await EmpleadosRepository.updatePassword(empleadoId, passwordHash);
  },

  async eliminar(id, solicitanteId) {
    const empleadoId = parseId(id);

    if (empleadoId === Number(solicitanteId)) {
      throw new AppError("No puedes eliminarte a ti mismo.", 400, "SELF_DELETE");
    }

    const empleado = await EmpleadosRepository.findById(empleadoId);

    if (!empleado) {
      throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");
    }

    if (empleado.rol_id === 1) {
      const adminsActivos = await EmpleadosRepository.countAdminsActivos();
      if (adminsActivos <= 1) {
        throw new AppError("Debe quedar al menos un administrador activo.", 400, "LAST_ADMIN");
      }
    }

    await EmpleadosRepository.softDelete(empleadoId);
  },

  async listarRoles() {
    const roles = await EmpleadosRepository.listRoles();
    return roles.map((role) => ({
      ...role,
      permisos: parsePermisos(role.permisos),
    }));
  },

  async actualizarRol(id, data) {
    const roleId = parseId(id);
    const existing = await EmpleadosRepository.findRoleById(roleId);

    if (!existing) {
      throw new AppError("Rol no encontrado.", 404, "NOT_FOUND");
    }

    if (roleId === 1) {
      throw new AppError("El rol administrador no se puede modificar.", 400, "ADMIN_ROLE_LOCKED");
    }

    const parsed = rolePermissionsSchema.safeParse(data);

    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Datos invalidos.", 400, "VALIDATION_ERROR");
    }

    const updated = await EmpleadosRepository.updateRole(roleId, {
      ...(parsed.data.nombre && { nombre: parsed.data.nombre }),
      permisos: JSON.stringify(compactPermisos(parsed.data.permisos)),
    });

    return { ...updated, permisos: parsePermisos(updated.permisos) };
  },
};

module.exports = EmpleadosService;
