// src/server.ts
import express from 'express';
import { DevOpsAssistant } from './assistant';

const app = express();
app.use(express.json());

const assistant = new DevOpsAssistant({
  models: { primary: 'codellama:34b' },
  openaiKey: process.env.OPENAI_API_KEY
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await assistant.processRequest(message);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/k8s/deployment', async (req, res) => {
  try {
    const { appName, image, options } = req.body;
    const yaml = await assistant.generateKubernetesDeployment(
      appName,
      image,
      options
    );
    res.json({ yaml });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('DevOps AI API running on port 3000');
});