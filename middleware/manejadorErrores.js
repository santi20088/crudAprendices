const manejadorErrores =(error ,req,res,next)=>{
    const codigoEstado =error.ststusCode || 500
    const mensaje = error.message || "error inesperado"
    console.error(`hubo un error: ${new Date().toISOString()} 
    - ${codigoEstado} - ${mensaje}`)
    //verificar mas informacion del error
    if(error.stack){
        console.error(error.stack)
    };

    //respuesta formato json
    res.json({
        Estado :"ERROR",
        codigoEstado,
        mensaje,
        //solo cuando esta en desarrollo
        ...(process.env.NODE_ENV ==="development" && {stack:error.stack})
    })
}


module.exports=manejadorErrores