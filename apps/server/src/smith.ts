import llmInstance from './utils/langchain/llm.js';

async function main() {
  const llm = llmInstance.getInstance();
  const data = llm.chatStream('ollama');
  for await (const chunk of data) {
    console.log(chunk);
  }
}
main();
