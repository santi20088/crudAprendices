const jwtoken =require("jsonwebtoken")
//extraer el token o capturarlo
const autenticarToken =(req,res,next)=>{
    const token =req.header("autenticacion")?.split(" ")[1]
    if(!token){
         // CORRECCIÓN: Se agrega return para detener la ejecución aquí
         return res.status(401).json({error:"Acceso denegado , no provee el token"})
    }

    //verificacion del token
    jwtoken.verify(token,process.env.JWT_SECRET,(error,usuario)=>{
        // CORRECCIÓN: Se agrega return para que no avance si el token falló
        if(error) return res.status(403).json({Error: "Token invalido"});
        req.usuario =usuario;
        console.log("de autenticacion",req.usuario);
        next();
    })
}

module.exports = autenticarToken
