import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import smtpTransport from 'nodemailer-smtp-transport';
import formidable from 'formidable';

dotenv.config();

const transporter = nodemailer.createTransport(smtpTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
}));

const sendEmail = async (sendto, subject, message, nameOfGuest, attachmentFiles, icsContent) => {
  try {
    if (!Array.isArray(sendto)) {
      sendto = [sendto]; // Wrap in array if it's not an array
    }

    const responses = [];

    for (const email of sendto) {
      const mailOptions = {
        from: process.env.SMTP_MAIL,
        to: email,
        subject: subject,
        text: message,
        html: `
        <h1>Hi ${nameOfGuest}</h1>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <p>Please respond to this email by clicking one of the links below:</p>
          <p><a href="https://amneesh.github.io/togathr-email-invite/?email=${email}&name=${nameOfGuest}">Open form</a></p>
        `,
        icalEvent: {
          filename: 'invite.ics',
          method: 'publish',
          content: icsContent,
        },
        attachments: attachmentFiles,
      };

      const response = await new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            reject(error);
          } else {
            resolve({ email: email, status: 'Invited' });
          }
        });
      });

      responses.push(response);
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay for 500ms
    }

    return responses;

  } catch (error) {
    throw error;
  }
};

export const config = {
  api: {
    bodyParser: false, // Disable default body parsing
  },
};

export default async (req, res) => {
  if (req.method === 'POST') {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'Error parsing the files' });
      }

      const { email, subject, message, nameOfGuest, guestAllData, icsContent } = fields;

      const emailArray = email ? email.split(',').map(email => email.trim()) : [];
      const guestDetailsArray = Array.isArray(guestAllData) ? JSON.parse(guestAllData) : [];

      const attachmentFiles = Object.values(files).map(file => ({
        filename: file.originalFilename,
        content: file.filepath, // Use the file path for the attachment
      }));

      try {
        const responses = [];
        for (const guest of guestDetailsArray) {
          const response = await sendEmail(guest.email, subject, message, guest.name, attachmentFiles, icsContent);
          responses.push(response);
        }

        res.status(200).json({ message: 'Emails sent successfully', responses });
      } catch (error) {
        res.status(500).json({ message: 'Error sending email', error });
      }
    });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};






