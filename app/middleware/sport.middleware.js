export function verificarSesion(req, res, next) {
    if (req.session.loggedin) {
        return next();
    }

    res.redirect("/login");
}
