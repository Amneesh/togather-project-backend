import cors from 'cors';

const corsMiddleware = cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'OPTIONS'], // Allow specific methods
});

export default function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, () => {
    res.status(200).json({ message: 'Hello nammy' });
  });
}
