import MongodbVectorTool from './utils/mongodb/vector.js';

async function main() {
  try {
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
    const chromaToolbox = new MongodbVectorTool({});
    // 确保初始化完成
    await chromaToolbox.initialize();
    const exampleDocuments = MongodbVectorTool.toDocuments(examples, (example) => ({
      category: example.category,
    }));

    console.log('准备添加文档...');
    console.log(exampleDocuments);
    // await chromaToolbox.addDocuments(exampleDocuments);
    console.log('文档添加完成');

    // 添加一些调试信息
    console.log('执行相似度搜索...');
    chromaToolbox.testNativeVectorSearch();
  } catch (error: any) {
    console.error('MongoDB Vector Tool error:', error.message);
    console.error('Error stack:', error.stack);
    // 这里可以添加降级处理逻辑
    console.log('Continuing without vector search functionality...');
  }
}

main();
