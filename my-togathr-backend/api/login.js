import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import connectToDatabase from '../utils/db.js';
import UserModel from '../models/userModel.js';

const corsMiddleware = cors({
    origin: '*', // Allow all origins
    methods: ['POST', 'OPTIONS'], // Allow specific methods
});

export default function handler(req, res) {

    // Apply CORS middleware
    corsMiddleware(req, res, async () => {

        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method Not Allowed' });
          }
        
          await connectToDatabase();
        
          const { email, password } = req.body;
        
          try {
            const user = await UserModel.findOne({ email });
        
            if (!user) {
              return res.status(400).json({ message: 'User does not exist' });
            }
        
            const isPasswordValid = await bcrypt.compare(password, user.password);
        
            if (!isPasswordValid) {
              return res.status(401).json({ message: 'Invalid password' });
            }
        
            const token = jwt.sign(
              { _id: user._id, email: user.email },
              process.env.JWT_SECRET,
              { expiresIn: process.env.JWT_TIMEOUT }
            );
        
            user.isActive = true;
            await user.save();
        
            return res.status(200).json({ message: 'Login successful', token });
          } catch (error) {
            console.error('Error during login:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
          }

    });


}
