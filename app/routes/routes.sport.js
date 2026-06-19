import { Router } from "express";
import {
    getIndex,
    getLogin,
    postLogin,
    getMenu,
    logout,
    getProductos,
    getInventario,
    getCarrito,
    postCarrito,
    postPedido,
    getDashboardAlias,
    getLoginAlias
} from "../controllers/controller.sport.js";
import { verificarSesion } from "../middleware/sport.middleware.js";

const router = Router();

router.get("/", getIndex);
router.get("/index.jsp", getIndex);
router.get("/login", getLoginAlias);
router.post("/login", postLogin);
router.get("/jsp/login.jsp", getLoginAlias);

router.get("/menu", verificarSesion, getMenu);
router.get("/jsp/dashboard.jsp", verificarSesion, getDashboardAlias);
router.get("/logout", logout);
router.get("/jsp/logout.jsp", logout);

router.get("/productos", getProductos);
router.get("/inventario", getInventario);
router.get("/carrito", getCarrito);
router.post("/carrito", postCarrito);
router.post("/pedidos", postPedido);

export default router;
