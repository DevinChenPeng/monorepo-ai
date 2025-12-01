import type { DocumentInterface } from '@langchain/core/documents';
import { PromptTemplate } from '@langchain/core/prompts';

const ragPromptTemplate = PromptTemplate.fromTemplate(
  `基于以下相关上下文信息回答问题。如果上下文中没有相关信息，请基于你的知识回答。

  相关上下文：
  {context}

  问题：{question}

  请提供准确、详细的回答：`
);
const formatRagPrompt = (context: string, question: string) => {
  return ragPromptTemplate.format({ context, question });
};

const formatContext = (docs: DocumentInterface[]) => {
  return docs.map((doc, index) => `${index + 1}. ${doc.pageContent}`).join('\n\n');
};
export { formatRagPrompt, formatContext };
