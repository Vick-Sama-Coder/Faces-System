import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  if(req.url === '/'){
    res.end('Hello World!')
  }
  //res.json({ message: 'API do Faces System funcionando!' });
});
app.listen(port, () => console.log(`Rodando na porta ${port}`))
export default app;
