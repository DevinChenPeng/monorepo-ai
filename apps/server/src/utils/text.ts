/**
 * 将文本按换行符分割成数组，并过滤空行
 * @param text 要分割的文本
 * @returns 过滤空行后的文本数组
 */
export function splitTextToLines(text: string): string[] {
  return text.split("\n").filter((line) => line.trim() !== "");
}

/**
 * 将文本数组合并成单个字符串
 * @param lines 文本行数组
 * @param separator 分隔符，默认为换行符
 * @returns 合并后的文本
 */
export function joinLines(lines: string[], separator: string = "\n"): string {
  return lines.join(separator);
}
