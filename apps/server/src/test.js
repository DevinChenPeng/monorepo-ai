import { Document } from '@langchain/core/documents';
import { SemanticSimilarityExampleSelector } from '@langchain/core/example_selectors';
import { Chroma } from '@langchain/community/vectorstores/chroma'; // Chroma 向量存储
import { OllamaEmbeddings } from '@langchain/ollama'; // 本地嵌入模型
import { ChatOllama } from '@langchain/ollama'; // 可选：用于后续 Few-Shot 示例
import { PromptTemplate } from '@langchain/core/prompts'; // 可选：用于构建提示词
import { CallbackManager } from '@langchain/core/callbacks/manager';

// 导入回调处理器（用于监听步骤）

// 1. 初始化回调管理器（打印每个步骤的日志）
const callbackManager = CallbackManager.fromHandlers({
  // 监听 LLM 生成环节（推理的核心：模型正在生成回答）
  llmStart: (params) => {
    console.log('\n=== 推理环节：模型开始生成回答 ===');
    console.log('输入给模型的 Prompt：', params.prompts[0]);
  },
  // 监听 LLM 生成结束（推理完成，即将返回回答）
  llmEnd: (output) => {
    console.log('\n=== 推理环节：模型生成结束 ===');
    console.log('模型原始输出：', output.generations[0][0].text);
  },
  // 监听整个链路结束（最终回答已生成）
  chainEnd: (output) => {
    console.log('\n=== 最终回答 ===');
    console.log('整理后的回答：', output.text);
  },
});
// 3. 初始化关键组件
// 3.1 嵌入模型（本地 Ollama，无密钥）
const embeddings = new OllamaEmbeddings({
  model: 'nomic-embed-text:latest', // 轻量嵌入模型
  baseUrl: 'http://localhost:11434', // Ollama 服务地址
});

// 3.2 准备示例数据（用于筛选的样本，格式：对象数组，含输入/输出等字段）
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

// 4. 创建 Chroma 向量存储（存储示例数据的向量）
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
    collectionName: 'few-shot-examples', // Chroma 集合名称（类似数据库表名） 若 Chroma 已存在同名集合（collectionName），会直接复用，不会重复创建
    url: 'http://localhost:8000', // Chroma 服务地址
    persistDirectory: './chroma-data', // 本地 Chroma 时可选（指定数据存储路径）
  }
);
// 5. 实例化 SemanticSimilarityExampleSelector（核心步骤）
const exampleSelector = new SemanticSimilarityExampleSelector({
  vectorStore, // 绑定 Chroma 向量存储（示例数据存在这里）
  k: 2, // 最多返回 2 个最相似的示例
  inputKeys: ['input'], // 用于计算相似度的「查询字段」（与示例的 input 对应）
});

// 6. 筛选相似示例（核心功能）
const userQuery = 'Chroma 数据怎么持久化到本地？'; // 用户查询

await Promise.all(examples.map((item) => exampleSelector.addExample(item)));
const selectedExamples = await exampleSelector.selectExamples({ input: userQuery });

// 7. 结合 LLM 实现 Few-Shot 回答（完整落地场景）
// 7.1 构建提示词模板（包含筛选出的示例）
const promptTemplate = PromptTemplate.fromTemplate(`
	参考：{examples}
	你现在需要解决用户的问题，要求如下：
	1. 先输出你的思考步骤（分点列出，每一步说明你的分析逻辑）；
	2. 再输出最终的清晰回答；
	3. 思考步骤和最终回答用明确的分隔符分开（例如：---分割线---）。
	问题：{question}
	`);

// 7.2 格式化示例（转为自然语言文本）
const formattedExamples = selectedExamples.map((ex) => `问：${ex.input}\n答：${ex.output}`).join('\n\n');

// 7.3 初始化 LLM（本地 Ollama，无密钥）
const llm = new ChatOllama({
  model: 'deepseek-r1:1.5b',
  temperature: 0.3, // 降低随机性
  think: true,
});

// 7.4 执行链（提示词 + LLM）
const chain = promptTemplate.pipe(llm);
const response = await chain.invoke({
  examples: formattedExamples,
  question: userQuery,
});
console.log('\n=== LLM 最终回答 ===');
console.log(response.content);
