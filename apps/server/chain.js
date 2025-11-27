// 导入核心模块
import { ChatDeepSeek } from '@langchain/deepseek';
import { createAgent } from 'langchain';
import { DynamicTool } from '@langchain/core/tools';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import * as dotenv from 'dotenv';
import { HumanMessage } from '@langchain/core/messages';
dotenv.config();
// 1. 初始化大模型（驱动Agent决策）
const llm = new ChatDeepSeek({
  model: process.env.DEEPSEEK_MODEL,
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
  temperature: 0.7,
  reasoning: true, // 开启思维链
});

// 2. 定义工作流的原子工具（可扩展）
// 工具1：数学计算工具
const calculateTool = new DynamicTool({
  name: 'calculator',
  description: '用于执行数学计算（加减乘除），输入必须是合法的数学表达式',
  func: async (input) => {
    try {
      // 简单安全的计算（生产环境需限制表达式）
      const result = eval(input);
      return `计算结果：${input} = ${result}`;
    } catch (e) {
      return `计算失败：${e.message}`;
    }
  },
});

// 工具2：模拟天气查询工具（真实场景可对接天气API）
const weatherTool = new DynamicTool({
  name: 'weather_checker',
  description: '查询指定城市的当日天气，输入格式：城市名',
  func: async (city) => {
    // 模拟天气数据
    const weatherMap = {
      北京: '晴，温度10-22℃，风力2级',
      上海: '多云，温度12-20℃，风力3级',
      广州: '小雨，温度18-25℃，风力1级',
    };
    return weatherMap[city] || `未查询到${city}的天气数据`;
  },
});

// 3. 组装工具列表（工作流的可执行单元）
const tools = [calculateTool, weatherTool];

// 4. 定义Agent的提示词（引导Agent正确决策）
const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `你是一个工作流编排助手，需要根据用户指令选择合适的工具完成任务。
  规则：
  1. 优先分析用户需求，选择匹配的工具；
  2. 如果需要多步执行，需串联工具调用；
  3. 只使用提供的工具，不编造结果；
  4. 最终返回清晰的任务完成结果。`,
  ],
  ['user', '{input}'],
]);

// // 5. 创建Agent（绑定LLM、工具、提示词）
const agent = createAgent({
  model: llm,
  tools,
  prompt,
});
// 7. 测试不同的工作流场景
async function runWorkflow() {
  // 场景1：单工具执行（计算）
  console.log('=== 场景1：单工具执行（计算）===');
  const result1 = await agent.invoke({ messages: [new HumanMessage('帮我计算1*2*999')] });
  console.log(result1.messages);
}

// 执行工作流
runWorkflow().catch(console.error);
