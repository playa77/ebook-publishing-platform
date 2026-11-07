import { createHash } from 'node:crypto';
import { parsedInputSchema, type ParsedInput } from '../contracts/domain';
import { ok, err, makeFault, type Outcome } from '../contracts/errors';
import { countWords } from './editor';
export const importLimits = { compressedBytes: 5 * 1024 * 1024, expandedBytes: 20 * 1024 * 1024, entries: 2000, words: 100000, timeoutMs: 30000 };
const requestId = '00000000-0000-4000-8000-000000000000';
/** Preserve text and indentation verbatim; interpretation never upgrades supplied data to approval. */
export function parseOutline(input: { format: 'paste' | 'markdown'; text: string }, limits = importLimits): Outcome<ParsedInput> {
    if (!['paste', 'markdown'].includes(input.format) || typeof input.text !== 'string' || !input.text.trim() || input.text.includes('\0'))
        return err(makeFault('INVALID_INPUT', requestId));
    if (Buffer.byteLength(input.text) > limits.compressedBytes || input.text.length > 2000000 || countWords(input.text) > limits.words)
        return err(makeFault('INPUT_LIMIT', requestId));
    const headings: ParsedInput['headings'] = [], warnings: string[] = [];
    let fence: { char: string; length: number } | undefined;
    for (const line of input.text.split(/\r?\n/u)) {
        const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line);
        if (marker) {
            if (!fence) fence = { char: marker[1]![0]!, length: marker[1]!.length };
            else if (marker[1]![0] === fence.char && marker[1]!.length >= fence.length && !marker[2]!.trim()) fence = undefined;
            continue;
        }
        if (fence) continue;
        const heading = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line);
        if (heading) headings.push({ level: heading[1]!.length, text: heading[2]! });
    }
    if (/<\/?[a-z][^>]*>/iu.test(input.text)) warnings.push('HTML bleibt unveränderter Text und wird nicht ausgeführt.');
    if (/!?\[[^\]]*\]\([^)]*\)/u.test(input.text)) warnings.push('Links und Bilder bleiben Text; externe Inhalte werden nicht geladen.');
    if (fence) warnings.push('Ein Codeblock ist nicht geschlossen; sein Inhalt bleibt wörtlich erhalten.');
    const parsed = parsedInputSchema.safeParse({ text: input.text, headings, warnings, sha256: createHash('sha256').update(input.text).digest('hex') });
    return parsed.success ? ok(parsed.data) : err(makeFault('INPUT_LIMIT', requestId));
}
