import { ChatOpenAI } from '@langchain/openai';
import OpenAI from 'openai';
import { HumanMessage } from '@langchain/core/messages';
import { performance } from 'node:perf_hooks';
import * as dotenv from 'dotenv';
dotenv.config();

const main = async () => {
  //  初始化 LLM（使用环境变量配置）
  const llm = new ChatOpenAI({
    model: 'qwen-plus',
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
    },
    // 关键：通过 modelKwargs 传递 enable_thinking 参数
    modelKwargs: {
      extra_body: {
        enable_thinking: true, // 开启思考模式
      },
    },
    enable_thinking: true,
  });
  // 1. 记录开始时间（高精度）
  const startTime = performance.now();
  const messages = [
    {
      role: 'user',
      content: 'Chroma 如何持久化数据？',
    },
  ];
  try {
    const res = await llm.invoke(messages);
    console.log(res.content);
    console.log('1111111111111111111111111111111\n\n');
  } catch (error) {
    console.log(startTime - performance.now());
    console.error('错误详情：', error.message); // 打印具体错误（是连接超时还是响应超时）
  }
};
main();
