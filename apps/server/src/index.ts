import { createApp } from './app.js';
import { config } from './config/index.js';
import llmInstance from './utils/llm.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`🚀 Server is running on http://localhost:${config.port}`);
  console.log(`📝 Environment: ${config.env}`);
});

// for await (const chunk of llmInstance.chatStream('你好，请问你是什么模型')) {
//   console.log(chunk);
// }
