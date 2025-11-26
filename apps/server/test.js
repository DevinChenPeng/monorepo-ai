import * as dotenv from 'dotenv';
dotenv.config();
import { Document } from '@langchain/core/documents';
import { SemanticSimilarityExampleSelector } from '@langchain/core/example_selectors';
import { Chroma } from '@langchain/community/vectorstores/chroma'; // Chroma 向量存储
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama'; // 本地嵌入模型
import { PromptTemplate } from '@langchain/core/prompts'; // 可选：用于构建提示词
import { CallbackManager } from '@langchain/core/callbacks/manager';
import { ChatOpenAI } from '@langchain/openai';
const embeddings = new OllamaEmbeddings({
  model: process.env.OLLAMA_EMBED_MODEL, // 轻量嵌入模型
  baseUrl: process.env.OLLAMA_BASE_URL, // Ollama 服务地址
});
// 1. 初始化回调管理器（打印每个步骤的日志）
const callbackManager = CallbackManager.fromHandlers({
  // 监听 LLM 生成环节（推理的核心：模型正在生成回答）
  handleLLMStart: (params) => {
    console.log('\n=== 推理环节：模型开始生成回答 ===');
    console.log('输入给模型的 Prompt：', params);
  },
  // 监听 LLM 生成结束（推理完成，即将返回回答）
  handleLLMEnd: (output) => {
    console.log('模型原始输出：', output);
    console.log('\n=== 推理环节：模型生成结束 ===');
  },
});
// 2 准备示例数据（用于筛选的样本，格式：对象数组，含输入/输出等字段）
const examples = [
  {
    input: '如何在 Node.js 中安装 LangChain？',
    output: '执行命令：npm install @langchain/core @langchain/community',
    category: '安装问题', // 可选：元数据，用于过滤
  },
  {
    input: 'Chroma 如何持久化数据？',
    output: '启动 Chroma 时指定 --path 目录（本地）或挂载 Docker 卷（容器）',
    category: 'Chroma 问题',
  },
  {
    input: 'SemanticSimilarityExampleSelector 作用是什么？',
    output: '根据查询的语义相似度，从示例集中筛选最相关的样本（用于 Few-Shot）',
    category: 'ExampleSelector 问题',
  },
  {
    input: 'Ollama 如何启动服务？',
    output: '终端执行命令：ollama serve（默认端口 11434）',
    category: 'Ollama 问题',
  },
];

// 3. 创建 Chroma 向量存储（存储示例数据的向量）
const vectorStore = await Chroma.fromDocuments(
  // 将示例数据转为 Document 类（Chroma 要求输入为 Document 数组）
  examples.map(
    (example) =>
      new Document({
        pageContent: JSON.stringify(example), // 存储示例完整信息（JSON 字符串）
        metadata: { category: example.category }, // 元数据（用于后续过滤）
      })
  ),
  embeddings, // 嵌入模型（自动将示例转为向量）
  {
    collectionName: process.env.CHROMA_COLLECTION_NAME, // Chroma 集合名称（类似数据库表名） 若 Chroma 已存在同名集合（collectionName），会直接复用，不会重复创建
    url: process.env.CHROMA_URL, // Chroma 服务地址
    persistDirectory: process.env.CHROMA_PERSIST_DIR, // 本地 Chroma 时可选（指定数据存储路径）
  }
);
// 4. 实例化 SemanticSimilarityExampleSelector（核心步骤）
const exampleSelector = new SemanticSimilarityExampleSelector({
  vectorStore, // 绑定 Chroma 向量存储（示例数据存在这里）
  k: 2, // 最多返回 2 个最相似的示例
  inputKeys: ['input'], // 用于计算相似度的「查询字段」（与示例的 input 对应）
});

// 5. 筛选相似示例（核心功能）
const userQuery = 'Chroma 数据怎么持久化到本地？'; // 用户查询

await Promise.all(examples.map((item) => exampleSelector.addExample(item)));
const selectedExamples = await exampleSelector.selectExamples({ input: userQuery });

// 6. 结合 LLM 实现 Few-Shot 回答（完整落地场景）
// 构建提示词模板（包含筛选出的示例）
const promptTemplate = PromptTemplate.fromTemplate(`
	参考：{examples}
	问题：{question}
	`);

// 格式化示例（转为自然语言文本）
const formattedExamples = selectedExamples.map((ex) => `问：${ex.input}\n答：${ex.output}`).join('\n\n');

//  初始化 LLM（使用环境变量配置）
const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  baseUrl: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
  streaming: true,
  callbacks: callbackManager,
});
console.log(llm);

// 执行链（提示词 + LLM）
const chain = promptTemplate.pipe(llm);
const response = await chain.stream({
  examples: formattedExamples,
  question: userQuery,
});
for await (const element of response) {
  console.log(element);
}
console.log('\n=== LLM 最终回答 ===');
console.log(response.content);
