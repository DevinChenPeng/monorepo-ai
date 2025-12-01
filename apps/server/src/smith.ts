import llmInstance from './utils/langchain/llm.js';

async function main() {
  const llm = llmInstance.getInstance();
  const data = await llm.chat('ollama');
  console.log(data);
}
main();
