import { createApp } from './app.js';
import { config } from './config/index.js';
import './openAI.js';
import * as dotenv from 'dotenv';
dotenv.config();

const app = createApp();

app.listen(config.port, () => {
  console.log(`🚀 Server is running on http://localhost:${config.port}`);
  console.log(`📝 Environment: ${config.env}`);
});
