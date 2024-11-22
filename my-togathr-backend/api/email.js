import nodemailer from 'nodemailer';
import smtpTransport from 'nodemailer-smtp-transport';
import multer from 'multer';
import * as dotenv from 'dotenv';
import ical from 'ical-generator';
import cors from 'cors';

dotenv.config();

// CORS middleware
// const corsHandler = (req, res) => {
//   res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins or you can restrict it
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
//   if (req.method === 'OPTIONS') {
//     return res.status(200).end(); // Pre-flight request handling
//   }
// };
const corsMiddleware = cors({
  origin: '*', // Allow all origins
  methods: ['POST', 'OPTIONS'], // Allow specific methods
});


// Setup Multer memory storage for file uploads
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 100 * 1024 * 1024 }, // 100MB file size limit
// });

// Nodemailer configuration for Gmail SMTP

const transporter = nodemailer.createTransport(smtpTransport({
  host: `${process.env.SMTP_HOST}`,
  port:  `${process.env.SMTP_PORT}`,
  secure: false,
  auth: {
    user: `${process.env.SMTP_MAIL}`,
    pass: `${process.env.SMTP_PASSWORD}`,
  },
}));

// Helper function to send an email
const sendEmail = async (sendto, subject, message, nameOfGuest) => {
  try {
    if (!Array.isArray(sendto)) {
      sendto = [sendto]; // Wrap in array if it's not an array
    }

    const responses = [];

    for (const email of sendto) {
      const mailOptions = {
        from: 'togather.ignite@gmail.com',
        to: email,
        subject: subject,
        text: message,
        html: `
        <h1>Hi ${nameOfGuest}</h1>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <p>Please respond to this email by clicking one of the links below:</p>
        <p><a href="https://email-rsvp-page.vercel.app/?email=${email}&name=${nameOfGuest}">Open form</a></p>
        `,            
        // icalEvent: {
        //   filename: 'invite.ics',
        //   method: 'publish',
        //   content: icsContent,
        // },
        // attachments: attachmentFiles, // Attachments from the request
      };

      // Send email one by one and wait for each one to finish
      const response = await new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              email: `${email}`,
              status: 'Invited',
            });
          }
        });
      });

      responses.push(response); // Collect responses

      // Delay for 1 second after sending each email
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return responses;

  } catch (error) {
    throw error;
  }
};

// The main handler function for the endpoint
export default async (req, res) => {
  // corsHandler(req, res); // Handle CORS
  corsMiddleware(req, res, async () => {
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  if (req.method === 'POST') {
    const { email, subject, message, nameOfGuest, guestAllData } = req.body;

    if (!guestAllData || !email || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedGuestAllData = typeof guestAllData === 'string' ? JSON.parse(guestAllData) : guestAllData;

    const emailArray = email ? email.split(',').map(email => email.trim()) : [];
    const guestDetailsArray = Array.isArray(parsedGuestAllData)
      ? parsedGuestAllData.map(guest => ({
          email: guest.email,
          name: `${guest.first_name} ${guest.last_name}` // Combine first and last name
        }))
      : [];

    // if (!req.body.files) {
    //   return res.status(400).send('No files were uploaded.');
    // }

    // Use multer's files to create attachment array for Nodemailer
    // const attachmentFiles = req.body.files.map(file => ({
    //   filename: file.originalname,
    //   content: file.buffer, // Use buffer for in-memory file
    // }));

    try {
      const responses = [];

      for (let i = 0; i < guestDetailsArray.length; i++) {
        const response = await sendEmail(guestDetailsArray[i].email, subject, message, guestDetailsArray[i].name);
        responses.push(response); // Store each response
      }

      res.status(200).json({ message: 'Emails sent successfully', responses });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: 'Error sending email', error });
    }

  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
  });
};
