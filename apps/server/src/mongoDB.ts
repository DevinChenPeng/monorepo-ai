import MongoChatHistoryTool from './utils/mongodb/chatHistory.js';
import MongodbVectorTool from './utils/mongodb/vector.js';
import MongoDBUtil from './utils/mongodb/index.js';

async function bootstrap() {
  const mongo = MongoDBUtil.getInstance();
  await mongo.connect();

  const sessionId = 'session-123';
  const historyTool = new MongoChatHistoryTool();

  await historyTool.appendSystemMessage(sessionId, '你是一位乐于助人的助手。');
  await historyTool.appendHumanMessage(sessionId, '嗨，你能解释一下 LangChain 吗？');
  await historyTool.appendAIMessage(sessionId, 'LangChain 能将语言模型与外部数据源相连接。');

  console.log(await historyTool.getMessages(sessionId));
  console.log(await historyTool.getMessagesAsBuffer(sessionId, 'User', '助手'));

  const vectorTool = new MongodbVectorTool({});
  await vectorTool.initialize();
  await MongodbVectorTool.initSearchIndex(vectorTool.getCollection());

  // await vectorTool.addTexts(['LangChain 是一个用于构建具备情境感知功能的应用程序的框架。'], [{ tag: 'intro' }]);
  console.log(await vectorTool.similaritySearchWithScore('LangChain是什么？', 1));

  // await historyTool.deleteSession(sessionId);
  await mongo.disconnect();
}

bootstrap().catch(console.error);
