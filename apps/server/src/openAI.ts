import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from 'langchain';
import llmInstance from './utils/llm.js';

/**
 * 处理流式响应，分离思考过程和实际回答
 */
async function processStreamWithThinking() {
  console.log('📊 开始处理流式响应...\n');

  const responseStream = await llmInstance.chat('写一首春天的诗');
  console.log(responseStream);
}

export default processStreamWithThinking;
