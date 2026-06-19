import { Router } from "express";
import {
    getLogin, postLogin,
    getMenu, logout,
    getUsuarios,
    getNuevoUsuario, postCrearUsuario,
    getEditarUsuario, postEditarUsuario,

    postEliminarUsuario

} from "../controllers/controller.views.js";
import { verificarSesion } from "../middleware/auth.middleware.js";

const router = Router();

// ============================================
// RUTAS DE AUTENTICACIÓN (sin protección)
// ============================================
router.get("/", getLogin);
router.post("/login", postLogin);

// ============================================
// RUTAS PROTEGIDAS (requieren sesión)
// ============================================
router.get("/menu", verificarSesion, getMenu);
router.get("/logout", logout);

// CRUD de Usuarios
router.get("/usuarios", verificarSesion, getUsuarios);
router.get("/usuarios/nuevo", verificarSesion, getNuevoUsuario);
router.post("/usuarios/crear", verificarSesion, postCrearUsuario);
router.get("/usuarios/editar/:id", verificarSesion, getEditarUsuario);
router.post("/usuarios/editar", verificarSesion, postEditarUsuario);
router.post("/usuarios/eliminar", verificarSesion, postEliminarUsuario);


export default router;