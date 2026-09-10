const manejadorErrores =(error ,req,res,next)=>{
    const codigoEstado =error.ststusCode || 500
    const mensaje = error.message || "error inesperado"
    console.error(`hubo un error: ${new Date().toISOString()} 
    - ${codigoEstado} - ${mensaje}`)
}