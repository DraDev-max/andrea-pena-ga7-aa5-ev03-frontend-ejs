const API_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:3000/api';

const VALID_CREDENTIALS = new Map([
    ['admin:123456', 'admin'],
    ['cliente:123456', 'cliente'],
    ['test:123456', 'test']
]);

function validarCredenciales(usuario, password) {
    if (typeof usuario !== 'string' || typeof password !== 'string') {
        return null;
    }

    return VALID_CREDENTIALS.get(`${usuario}:${password}`) || null;
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCategoryLabel(value) {
    if (!value) {
        return '';
    }

    const label = String(value).replace(/-/g, ' ').trim();
    return label.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mapProductForCatalog(product) {
    return {
        id: product.id,
        title: product.nombre,
        brand: product.marca || 'Sport Family',
        price: toNumber(product.precio, 0),
        stock: toInteger(product.stock, 0),
        category: product.categoria_nombre || product.categoria || 'general',
        thumbnail: product.imagen_url || product.thumbnail || ''
    };
}

function mapProductForInventory(product) {
    return {
        id: product.id,
        nombre: product.nombre,
        precio: toNumber(product.precio, 0),
        stock: toInteger(product.stock, 0),
        categoria: normalizeCategoryLabel(product.categoria_nombre || product.categoria || 'general'),
        marca: product.marca || 'Sport Family'
    };
}

function mapCartItem(item) {
    return {
        id: item.id,
        nombre: item.producto_nombre ?? item.nombre ?? '',
        precio: toNumber(item.precio ?? item.precio_unitario, 0),
        cantidad: toInteger(item.cantidad, 0),
        subtotal: toNumber(item.subtotal, 0)
    };
}

function buildCartSummary(payload) {
    const items = Array.isArray(payload.items) ? payload.items.map(mapCartItem) : [];
    const itemsCount = Number.isFinite(Number(payload.items_count))
        ? Number(payload.items_count)
        : items.reduce((total, item) => total + item.cantidad, 0);
    const total = Number.isFinite(Number(payload.total))
        ? Number(payload.total)
        : items.reduce((sum, item) => sum + item.subtotal, 0);

    return {
        success: payload.success !== false,
        items_count: itemsCount,
        total,
        items
    };
}

async function backendRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, options);
    const text = await response.text();

    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }

    if (!response.ok) {
        const message = data && typeof data === 'object' && data.error
            ? data.error
            : `HTTP ${response.status}`;
        throw new Error(message);
    }

    return data;
}

function asegurarSesionCarrito(req) {
    if (!req.session.catalogoSessionId) {
        req.session.catalogoSessionId = req.session.id;
    }

    return req.session.catalogoSessionId;
}

async function leerCarritoBackend(req) {
    const sessionId = asegurarSesionCarrito(req);
    const data = await backendRequest(`/carrito?session_id=${encodeURIComponent(sessionId)}&estado=activo`);
    return buildCartSummary(data);
}

function requireLogin(req, res) {
    if (!req.session.loggedin) {
        res.status(401).json({ error: 'No autorizado' });
        return false;
    }

    return true;
}

export function getLogin(req, res) {
    if (req.session.loggedin) {
        return res.redirect('/menu');
    }

    res.render('login', { error: null });
}

export function postLogin(req, res) {
    const { usuario } = req.body;
    const password = req.body.password ?? req.body.contraseña;
    const validado = validarCredenciales(usuario, password);

    if (!validado) {
        return res.render('login', { error: 'Usuario o contraseña incorrectos' });
    }

    req.session.usuario = validado;
    req.session.loggedin = true;
    req.session.cookie.maxAge = 30 * 60 * 1000;
    asegurarSesionCarrito(req);

    return res.redirect('/menu');
}

export function getIndex(req, res) {
    if (req.session.loggedin) {
        return res.redirect('/menu');
    }

    return res.redirect('/login');
}

export function getMenu(req, res) {
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }

    res.render('menu', { usuario: req.session.usuario || 'usuario' });
}

export function logout(req, res) {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
        }

        res.redirect('/login');
    });
}

export async function getProductos(req, res) {
    if (!requireLogin(req, res)) {
        return;
    }

    try {
        const products = await backendRequest('/productos?activo=1');
        res.json({ products: products.map(mapProductForCatalog) });
    } catch (error) {
        console.error('Error al cargar productos:', error);
        res.status(502).json({ error: 'No se pudieron cargar los productos del backend' });
    }
}

export async function getInventario(req, res) {
    if (!requireLogin(req, res)) {
        return;
    }

    try {
        const products = await backendRequest('/productos?activo=1');
        res.json({ productos: products.map(mapProductForInventory) });
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        res.status(502).json({ error: 'No se pudo cargar el inventario del backend' });
    }
}

export async function getCarrito(req, res) {
    if (!requireLogin(req, res)) {
        return;
    }

    try {
        const carrito = await leerCarritoBackend(req);
        res.json(carrito);
    } catch (error) {
        console.error('Error al cargar carrito:', error);
        res.status(502).json({ error: 'No se pudo cargar el carrito del backend' });
    }
}

export async function postCarrito(req, res) {
    if (!requireLogin(req, res)) {
        return;
    }

    try {
        const sessionId = asegurarSesionCarrito(req);
        const accion = req.body.accion;

        if (!accion) {
            return res.json(await leerCarritoBackend(req));
        }

        if (accion === 'agregar') {
            const productoId = toInteger(req.body.id, null);
            const cantidad = Math.max(1, toInteger(req.body.cantidad, 1));
            const nombre = String(req.body.nombre ?? '').trim();
            const precio = toNumber(req.body.precio, 0);

            await backendRequest('/carrito', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    producto_id: productoId,
                    producto_nombre: nombre,
                    precio_unitario: precio,
                    cantidad
                })
            });
        } else if (accion === 'actualizar') {
            const id = toInteger(req.body.id, null);
            const cantidad = toInteger(req.body.cantidad, 0);

            if (id === null) {
                return res.status(400).json({ error: 'ID de carrito invalido' });
            }

            if (cantidad <= 0) {
                await backendRequest(`/carrito/${id}`, { method: 'DELETE' });
            } else {
                await backendRequest(`/carrito/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ cantidad })
                });
            }
        } else if (accion === 'eliminar') {
            const id = toInteger(req.body.id, null);

            if (id === null) {
                return res.status(400).json({ error: 'ID de carrito invalido' });
            }

            await backendRequest(`/carrito/${id}`, { method: 'DELETE' });
        } else if (accion === 'vaciar') {
            await backendRequest(`/carrito?session_id=${encodeURIComponent(sessionId)}`, {
                method: 'DELETE'
            });
        } else {
            return res.status(400).json({ error: 'Accion de carrito no soportada' });
        }

        res.json(await leerCarritoBackend(req));
    } catch (error) {
        console.error('Error al modificar carrito:', error);
        res.status(502).json({ error: 'No se pudo sincronizar el carrito con el backend' });
    }
}

export async function postPedido(req, res) {
    if (!requireLogin(req, res)) {
        return;
    }

    try {
        const sessionId = asegurarSesionCarrito(req);
        const pedido = await backendRequest('/pedidos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId,
                estado: 'enviado'
            })
        });

        const carrito = await leerCarritoBackend(req);
        res.json({
            success: true,
            pedido,
            carrito
        });
    } catch (error) {
        console.error('Error al crear pedido:', error);
        res.status(502).json({ error: 'No se pudo crear el pedido en el backend' });
    }
}

export function getDashboardAlias(req, res) {
    return getMenu(req, res);
}

export function getLoginAlias(req, res) {
    return getLogin(req, res);
}
