const { error } = require('console');
const express = require('express');
const multer= require("multer")             // MOVIDO ARRIBA para evitar fallos de inicialización
const sistemaArchivos = require ('fs');    // MOVIDO ARRIBA
const ruta = require('path')                // MOVIDO ARRIBA para que funcione en el almacenamiento de multer
const registroMiddleware =require("./middleware/registroMiddleware")
const manejoErrores  = require ("./middleware/manejadorErrores")
const autenticarToken= require("./middleware/autenticar")
const jwtoken =require("jsonwebtoken")


require('dotenv/config');
const app = express();
const PORT = process.env.PORT || 3000;

// Importar validaciones
const { validarCampos } = require('./validacion/validar');

//body-parse
app.use(express.json());
app.use(express.urlencoded({extended:true}));

//creacion de usu de middleware
app.use((req,res,next)=>{
  const tiempoMilisegundos =Date.now()
  console.log(`tiempo:${tiempoMilisegundos}`)
  next()
})
app.use(registroMiddleware)

//utilizacion de libreria multer
//configurar almacenamiento
const almacenamiento =multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,"misImagenes/")
  },
  filename:(req,file,cb)=>{
    // CORRECCIÓN: Se añade la extensión del archivo original para que no se guarde sin formato
    const ext = ruta.extname(file.originalname);
    cb(null,`${Date.now()}${ext}`)
  }
})

const cargar =multer({storage:almacenamiento})
//generar una ruta para el archivo aprendices.json
const rutaArchivojson = ruta.join(__dirname,'listaDatos.json');

//ruta raiz
app.get('/', (req, res) => {
  res.send('Servidor inicializado correctamente');
});

//endpoint para obtener todos los aprendices
app.get('/aprendices', (req, res) => {
  sistemaArchivos.readFile(rutaArchivojson, "utf-8", (error, datos) =>{
    if (error){
      return res.status(500).json({error: "Error al leer el archivo, conexion db"})
    }
    const listaaprendices = JSON.parse(datos);
    res.json(listaaprendices)
  })
});

// Endpoint para obtener un aprendiz por su DNI
app.get('/aprendices/:dni', (req, res) => {
    const dniBusqueda = String(req.params.dni);

    sistemaArchivos.readFile(rutaArchivojson, "utf-8", (error, datos) => {
        if (error) {
            return res.status(500).json({ error: "Error al leer el archivo" });
        }

        try {
            const listaCampres = JSON.parse(datos);
            // Buscar el aprendiz que coincida con el DNI proporcionado
            const aprendizEncontrado = listaCampres.find(aprendiz => String(aprendiz.dni) === dniBusqueda);

            // Si no se encuentra, retornar un estado 404
            if (!aprendizEncontrado) {
                return res.status(404).json({ error: "Aprendiz no encontrado" });
            }

            // Si se encuentra, retornar el objeto del aprendiz
            res.json(aprendizEncontrado);

        } catch (errorParse) {
            res.status(500).json({ error: "Error al procesar el formato de los datos" });
        }
    });
});

//endpoint para crear un aprendiz
app.post("/aprendices",cargar.single("imagen"), validarCampos, (req, res) => {
  const datosAprendiz= req.body
  //modificar datoAprendiz con la ruta de la foto
  sistemaArchivos.readFile(rutaArchivojson, "utf-8", (error, datos) => {
    if (error) {
      return res.status(500).json({ error: "Error al leer el archivo" });
    }

    const listaaprendices = JSON.parse(datos);
    
    // CORRECCIÓN: Se cambió 'req.filename' y la sintaxis errónea de comas '${req,file,filename}' por 'req.file.filename'
    datosAprendiz.avatar = req.file ? `/misImagenes/${req.file.filename}` : "sin imagen"

    // Generar DNI automáticamente: 1, 2, 3, 4...
    const dni = listaaprendices.length + 1;

    // CORRECCIÓN: Se cambió 'datoAprendiz' por 'datosAprendiz' para usar el objeto que ya tiene el avatar asignado arriba
    const nuevoDatoAprendiz = {
      dni: dni,
      ...datosAprendiz
    };

    listaaprendices.push(nuevoDatoAprendiz);

    //adicionar al archivo  el nuevo aprendiz
    sistemaArchivos.writeFile(
      rutaArchivojson,
      JSON.stringify(listaaprendices, null, 2),
      (error) => {
        if (error) {
          return res.status(500).json({
            error: "No se puede registrar el aprendiz."
          });
        }

        res.status(201).json(nuevoDatoAprendiz);
      }
    );
  });
});

//endpoint editar aprendiz por dni
// CORRECCIÓN: Se agrega cargar.single("imagen") para capturar datos multimedia en la edición
app.put("/aprendices/:dni", cargar.single("imagen"), validarCampos, (req, res) => {
  const dni = String(req.params.dni);
  const datoAprendiz = req.body;

  sistemaArchivos.readFile(rutaArchivojson, "utf-8", (error, datos) => {
    if (error) {
      return res.status(500).json({ error: "Error al leer el archivo" });
    }

    let listaaprendices = JSON.parse(datos);

    // Si se sube una nueva imagen en la edición, se actualiza el campo avatar
    if (req.file) {
      datoAprendiz.avatar = `/misImagenes/${req.file.filename}`;
    }

    listaaprendices = listaaprendices.map((aprendiz) => {
      return String(aprendiz.dni) === dni ? { ...aprendiz, ...datoAprendiz } : aprendiz;
    });

    sistemaArchivos.writeFile(rutaArchivojson, JSON.stringify(listaaprendices, null, 2), (error) => {
      if (error) {
        return res.status(500).json({ error: "No se puede registrar el aprendiz." });
      }
      res.json({ mensaje: "Aprendiz modificado con éxito", datoAprendiz });
    });
  });
});


// 4. ELIMINAR UN APRENDIZ POR DNI
app.delete('/aprendices/:dni', (req, res) => {
  const dniBusqueda = String(req.params.dni);

  sistemaArchivos.readFile(rutaArchivojson, 'utf-8', (error, datos) => {
    if (error) {
      return res.status(500).json({ error: 'Error al leer el archivo' });
    }
    try {
      let listaAprendices = JSON.parse(datos);
      const existe = listaAprendices.some(aprendiz => String(aprendiz.dni) === dniBusqueda);

      if (!existe) {
        return res.status(404).json({ error: 'Aprendiz no encontrado' });
      }

      const listaFiltrada = listaAprendices.filter(aprendiz => String(aprendiz.dni) !== dniBusqueda);

      sistemaArchivos.writeFile(rutaArchivojson, JSON.stringify(listaFiltrada, null, 2), (errorEscribir) => {
        if (errorEscribir) {
          return res.status(500).json({ error: 'Error al guardar los cambios de eliminación' });
        }
        res.json({ mensaje: 'Aprendiz eliminado con éxito' });
      });
    } catch (errorParse) {
      res.status(500).json({ error: 'Error al procesar el formato de los datos' });
    }
  });
});

//endpoint para provocar un error
app.get("/error",(req,res,next)=>{
  next(new Error("Error provocado"))
})

//endpoint con ruta protegida
app.get("/rutaProtegida",autenticarToken,(req,res)=>{
  res.json({mensaje:"Es este una ruta protegida"})
})

//endpoint inicio sesion para generar token
app.post("/login", (req,res)=>{
  const {usuario,clave} =req.body
  //simular bd
  const usuariobd={
    "usuario":"Alejandro",
    "clave":"abc123"
  }
  //validar datos del usuario
  if (usuario !== usuariobd.usuario || clave !== usuariobd.clave){
    // CORRECCIÓN: Se añade return para que detenga la ejecución si las credenciales fallan
    return res.status(401).json({mensaje:"usuario y/o clave incorrecta."})
  }
  //crear token
  const token = jwtoken.sign(
  //pasamos datos del usaurio
  {user:usuario},
  // CORRECCIÓN: Corregido 'proccess' por 'process' y 'expirexIn' por 'expiresIn'
  process.env.JWT_SECRET,
  {expiresIn:"1h"}
  )
  res.json({token})
})
//manejador de errores
app.use(manejoErrores)
//modo de escucha del servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
