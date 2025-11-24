import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
// 1. 定义 CoT 输出结构（JSON Schema）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const outputParser: StructuredOutputParser<any> = StructuredOutputParser.fromNamesAndDescriptions({
  thought: '模型的逐步思考过程，详细说明推理逻辑',
  answer: '最终答案，简洁明了',
});

// 2. 生成 CoT 提示模板（包含输出格式约束）
const cotPromptTemplate = PromptTemplate.fromTemplate(`
请用思维链解答以下问题，严格按照输出格式要求返回结果。

问题：{question}

{format_instructions}
`);

export { cotPromptTemplate, outputParser };
