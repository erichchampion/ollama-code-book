import cors from 'cors';

app.use(cors({
  origin: [
    'https://app.yourdomain.com',
    'https://staging.yourdomain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));