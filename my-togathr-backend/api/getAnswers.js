import { google } from 'googleapis';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
// console.log(process.env.GOOGLE_SHEETS_PRIVATE_KEY);

const g_sheets_client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
console.log(process.env.GOOGLE_SHEETS_PRIVATE_KEY);

const g_sheets_private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n");


// const authClient = new google.auth.JWT(
//   GOOGLE_SHEETS_CLIENT_EMAIL,
//   null,
//   GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n"),
//   ["https://www.googleapis.com/auth/spreadsheets"]
// );

const client = new google.auth.JWT(g_sheets_client_email, null, g_sheets_private_key, [
  'https://www.googleapis.com/auth/spreadsheets'
]);
const corsMiddleware = cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'OPTIONS'], // Allow specific methods
});



// Fetch data from Google Sheets
const fetchData = async () => {
  const token = await client.authorize();
  client.setCredentials(token);

  const res = await google.sheets("v4").spreadsheets.values.get({
    auth: client,
    spreadsheetId: "13Sq_S52noOgbO3MqNjpHHeLG-rGHW9pQwbFq3Mqa_Bs",
    range: 'Data!A:C',
  });

  return (res.data.values || []).slice(1).map(row => ({
    name: row[0],
    email: row[1],
    status: row[2],
  }));
};

// CORS middleware

// Main handler function
export default async (req, res) => {
  // Handle CORS
  corsMiddleware(req, res, async () => {


  // Handle pre-flight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
    if (req.method === 'GET') {
      try {
        const answers = await fetchData();
        res.status(200).json(answers.length ? answers : { message: "No data found." });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch answers' });
      }
    } else {
      res.status(405).json({ message: 'Method Not Allowed' });
    }
  });
};
