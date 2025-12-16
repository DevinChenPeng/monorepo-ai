import MongodbVectorTool from './utils/mongodb/vector.js';

async function main() {
  const chromaToolbox = new MongodbVectorTool({});
  MongodbVectorTool.initSearchIndex(chromaToolbox.getCollection());
  // 确保初始化完成
  await chromaToolbox.initialize();

  const aa = await chromaToolbox.similaritySearch('如何在 Node.js 中安装 LangChain？', 2);
  console.log(aa);
}
main();
