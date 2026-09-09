import express from 'express';
import cors from 'cors';

const app = express();
<<<<<<< HEAD
const port = 3000
app.use(cors());
=======

//app.use(cors());
>>>>>>> 11d51c0e28e89e75a284edeee652d45dc1caa7dc
app.use(express.json());

app.get('/', (req, res) => {
  if(req.url === '/'){
    res.end('Hello World!')
  }
  //res.json({ message: 'API do Faces System funcionando!' });
});
app.listen(port, () => console.log(`Rodando na porta ${port}`))
export default app;
