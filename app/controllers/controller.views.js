import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api";

function decodeUsuarioFromToken(token) {
    if (typeof token !== "string" || token.trim() === "") {
        return null;
    }

    try {
        const parts = token.split(".");
        if (parts.length < 2) {
            return null;
        }

        const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
        return payload.usuario || null;
    } catch {
        return null;
    }
}

// ============================================
// VISTA 1: LOGIN
// ============================================

export const getLogin = (req, res) => {
    if (req.session.token) {
        return res.redirect("/menu");
    }

    res.render("login", { error: null });
};

export const postLogin = async (req, res) => {
    const { usuario } = req.body;
    const contraseña = req.body.contraseña ?? req.body.password;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario, contraseña })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.render("login", {
                error: data.error || data.message || "Credenciales inválidas"
            });
        }

        req.session.token = data.token;
        req.session.usuario = decodeUsuarioFromToken(data.token) || usuario || "usuario";
        res.redirect("/menu");
    } catch (error) {
        console.error("Error en login:", error);
        res.render("login", { error: "Error de conexión con el servidor" });
    }
};

// ============================================
// VISTA 2: MENÚ PRINCIPAL
// ============================================

export const getMenu = (req, res) => {
    res.render("menu", { usuario: req.session.usuario || "usuario" });
};

export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error("Error al cerrar sesión:", err);
        res.redirect("/");
    });
};

// ============================================
// VISTA 3: LISTAR REGISTROS
// ============================================

export const getUsuarios = async (req, res) => {
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            headers: {
                Authorization: `Bearer ${req.session.token}`
            }
        });

        if (!response.ok) {
            throw new Error("Error al obtener usuarios");
        }

        const usuarios = await response.json();
        res.render("listar", {
            usuarios,
            usuario: req.session.usuario || "usuario"
        });
    } catch (error) {
        console.error("Error:", error);
        res.render("listar", {
            usuarios: [],
            usuario: req.session.usuario || "usuario"
        });
    }
};

// ============================================
// VISTA 4: CREAR REGISTRO
// ============================================

export const getNuevoUsuario = (req, res) => {
    res.render("crear", {
        error: null,
        usuario: req.session.usuario || "usuario"
    });
};

export const postCrearUsuario = async (req, res) => {
    const { nombre, email, password } = req.body;

    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, email, password })
        });

        if (!response.ok) {
            const data = await response.json();
            return res.render("crear", {
                error: data.error || data.message || "Error al crear usuario",
                usuario: req.session.usuario || "usuario"
            });
        }

        res.redirect("/usuarios");
    } catch (error) {
        console.error("Error:", error);
        res.render("crear", {
            error: "Error de conexión con el servidor",
            usuario: req.session.usuario || "usuario"
        });
    }
};

// ============================================
// VISTA 5: EDITAR REGISTRO
// ============================================

export const getEditarUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            headers: {
                Authorization: `Bearer ${req.session.token}`
            }
        });

        if (!response.ok) {
            return res.redirect("/usuarios");
        }

        const usuario = await response.json();
        res.render("editar", {
            usuario,
            error: null,
            sesionUsuario: req.session.usuario || "usuario"
        });
    } catch (error) {
        console.error("Error:", error);
        res.redirect("/usuarios");
    }
};

export const postEditarUsuario = async (req, res) => {
    const { id, nombre, email } = req.body;

    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, email })
        });

        if (!response.ok) {
            const data = await response.json();
            const usuario = { id, nombre, email };

            return res.render("editar", {
                usuario,
                error: data.error || data.message || "Error al actualizar",
                sesionUsuario: req.session.usuario || "usuario"
            });
        }

        res.redirect("/usuarios");
    } catch (error) {
        console.error("Error:", error);
        const usuario = { id, nombre, email };
        res.render("editar", {
            usuario,
            error: "Error de conexión",
            sesionUsuario: req.session.usuario || "usuario"
        });
    }
};

// ============================================
// VISTA 6: ELIMINAR REGISTRO
// ============================================

export const postEliminarUsuario = async (req, res) => {
    const { id } = req.body;

    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${req.session.token}`
            }
        });

        if (!response.ok) {
            console.error("Error al eliminar usuario");
        }

        res.redirect("/usuarios");
    } catch (error) {
        console.error("Error:", error);
        res.redirect("/usuarios");
    }
};
