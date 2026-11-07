import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { crc32 } from 'node:zlib';
import yauzl from 'yauzl';
import { SaxesParser, type SaxesTagNS } from 'saxes';
import { parsedInputSchema, type ParsedInput } from '../contracts/domain';
import { ok, err, makeFault, isFault, type Outcome } from '../contracts/errors';
import { countWords } from './editor';
import { importLimits } from './outline';
const requestId = '00000000-0000-4000-8000-000000000000';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/package/2006/relationships';
function fail(code: 'INPUT_LIMIT' | 'MALFORMED_ARCHIVE' | 'TRACKED_CHANGES' | 'UNSUPPORTED_FORMAT'): never { throw makeFault(code, requestId); }
function xml(bytes: Buffer, open: (tag: SaxesTagNS) => void, text: (value: string) => void = () => {}, close: (tag: SaxesTagNS) => void = () => {}) {
    const parser = new SaxesParser({ xmlns: true });
    parser.on('doctype', () => fail('MALFORMED_ARCHIVE'));
    parser.on('error', () => fail('MALFORMED_ARCHIVE'));
    parser.on('opentag', open); parser.on('text', text); parser.on('cdata', text); parser.on('closetag', close);
    parser.write(new TextDecoder('utf-8', { fatal: true }).decode(bytes)).close();
}
function attr(tag: SaxesTagNS, name: string): string | undefined {
    return Object.values(tag.attributes).find(a => typeof a !== 'string' && a.local === name)?.value;
}
/** Lazy entries and bounded actual stream reads; no relationship is ever dereferenced. */
export async function parseDocx(input: Uint8Array, limits = importLimits): Promise<Outcome<ParsedInput>> {
    if (!input.length || input.length > limits.compressedBytes) return err(makeFault('INPUT_LIMIT', requestId));
    try {
        const deadline = performance.now() + limits.timeoutMs;
        const files = await new Promise<Map<string, Buffer>>((resolve, reject) => {
            yauzl.fromBuffer(Buffer.from(input), { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, archive) => {
                if (error || !archive) return reject(makeFault('MALFORMED_ARCHIVE', requestId));
                let finished = false, total = 0, entries = 0;
                const names = new Set<string>(), result = new Map<string, Buffer>();
                const stop = (e: unknown) => { if (finished) return; finished = true; clearTimeout(timer); archive.close(); reject(e); };
                const timer = setTimeout(() => stop(makeFault('INPUT_LIMIT', requestId)), limits.timeoutMs);
                archive.on('error', () => stop(makeFault('MALFORMED_ARCHIVE', requestId)));
                archive.on('end', () => { if (!finished) { finished = true; clearTimeout(timer); resolve(result); } });
                archive.on('entry', (entry: yauzl.Entry) => {
                    try {
                        if (++entries > limits.entries || performance.now() > deadline) fail('INPUT_LIMIT');
                        const name = entry.fileName;
                        if (names.has(name) || name.includes('\\') || name.startsWith('/') || /(^|\/)\.\.?($|\/)|^[a-z]:/iu.test(name) || name.includes('\0')) fail('MALFORMED_ARCHIVE');
                        names.add(name);
                        if (entry.generalPurposeBitFlag & 1 || ![0, 8].includes(entry.compressionMethod) || ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000) fail('UNSUPPORTED_FORMAT');
                        if (/vba|active[xX]|(?:^|\/)embeddings\//iu.test(name)) fail('UNSUPPORTED_FORMAT');
                        if (entry.uncompressedSize > limits.expandedBytes || entry.uncompressedSize > Math.max(1, entry.compressedSize) * 1000) fail('INPUT_LIMIT');
                        if (name.endsWith('/')) { archive.readEntry(); return; }
                        archive.openReadStream(entry, (error, stream) => {
                            if (error || !stream) return stop(makeFault('MALFORMED_ARCHIVE', requestId));
                            let size = 0, checksum = 0;
                            const chunks: Buffer[] = [];
                            const keep = /(?:\.xml|\.rels)$/u.test(name);
                            stream.on('error', () => stop(makeFault('MALFORMED_ARCHIVE', requestId)));
                            stream.on('data', (chunk: Buffer) => {
                                size += chunk.length; total += chunk.length; checksum = crc32(chunk, checksum);
                                if (total > limits.expandedBytes || performance.now() > deadline || size > Math.max(1, entry.compressedSize) * 1000) {
                                    stream.destroy(); stop(makeFault('INPUT_LIMIT', requestId)); return;
                                }
                                if (keep) chunks.push(chunk);
                            });
                            stream.on('end', () => { if (finished) return; if (size !== entry.uncompressedSize || checksum !== entry.crc32) return stop(makeFault('MALFORMED_ARCHIVE', requestId)); if (keep) result.set(name, Buffer.concat(chunks)); archive.readEntry(); });
                        });
                    } catch (e) { stop(e); }
                });
                archive.readEntry();
            });
        });
        const document = files.get('word/document.xml'), types = files.get('[Content_Types].xml');
        if (!document || !types) fail('UNSUPPORTED_FORMAT');
        const styles = new Map<string, { level?: number; basedOn?: string }>();
        let currentStyle = '', mainType = false, documentRoot = false;
        for (const [name, bytes] of files) {
            if (performance.now() > deadline) fail('INPUT_LIMIT');
            let rootSeen = false;
            xml(bytes, tag => {
                if (performance.now() > deadline) fail('INPUT_LIMIT');
                if (!rootSeen) { rootSeen = true; if (name === 'word/document.xml') { if (tag.uri !== W || tag.local !== 'document') fail('UNSUPPORTED_FORMAT'); documentRoot = true; } }
                if (name === '[Content_Types].xml' && tag.uri === 'http://schemas.openxmlformats.org/package/2006/content-types' && tag.local === 'Override' && attr(tag, 'PartName') === '/word/document.xml' && attr(tag, 'ContentType') === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml') mainType = true;
                if (name === '[Content_Types].xml' && /macroEnabled|vbaProject|activeX|oleObject/iu.test(attr(tag, 'ContentType') ?? '')) fail('UNSUPPORTED_FORMAT');
                if (tag.uri === R && tag.local === 'Relationship' && (attr(tag, 'TargetMode')?.toLowerCase() === 'external' || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(attr(tag, 'Target') ?? ''))) fail('UNSUPPORTED_FORMAT');
                if (tag.uri === W && ['ins', 'del', 'moveFrom', 'moveTo', 'altChunk', 'object', 'fldSimple', 'instrText'].includes(tag.local)) fail(['ins', 'del', 'moveFrom', 'moveTo'].includes(tag.local) ? 'TRACKED_CHANGES' : 'UNSUPPORTED_FORMAT');
                if (tag.uri === W && /PrChange$|moveFromRange|moveToRange/u.test(tag.local)) fail('TRACKED_CHANGES');
                if (name === 'word/styles.xml' && tag.uri === W) {
                    if (tag.local === 'style') { currentStyle = attr(tag, 'styleId') ?? ''; styles.set(currentStyle, {}); }
                    if (tag.local === 'outlineLvl' && currentStyle) { const level = Number(attr(tag, 'val')); if (level >= 0 && level < 6) styles.get(currentStyle)!.level = level + 1; }
                    if (tag.local === 'basedOn' && currentStyle) styles.get(currentStyle)!.basedOn = attr(tag, 'val');
                }
            }, undefined, tag => { if (tag.uri === W && tag.local === 'style') currentStyle = ''; });
        }
        if (!mainType || !documentRoot) fail('UNSUPPORTED_FORMAT');
        const styleLevel = (id: string): number | undefined => { const seen = new Set<string>(); let key: string | undefined = id; while (key) { if (seen.has(key)) fail('MALFORMED_ARCHIVE'); seen.add(key); const s = styles.get(key); if (s?.level) return s.level; key = s?.basedOn; } return undefined; };
        const paragraphs: string[] = [], headings: ParsedInput['headings'] = [], warnings = new Set<string>();
        let paragraph: { text: string; level?: number; list: boolean; depth: number } | undefined, inText = false;
        xml(document, tag => {
            if (performance.now() > deadline) fail('INPUT_LIMIT');
            if (tag.uri !== W) return;
            if (tag.local === 'p') { if (paragraph) fail('MALFORMED_ARCHIVE'); paragraph = { text: '', list: false, depth: 0 }; }
            if (tag.local === 't') inText = true;
            if (tag.local === 'drawing' || tag.local === 'pict') warnings.add('Bilder und Layout wurden nicht übernommen.');
            if (tag.local === 'commentReference') warnings.add('Kommentare wurden nicht übernommen.');
            if (!paragraph) return;
            if (tag.local === 'pStyle') paragraph.level = styleLevel(attr(tag, 'val') ?? '');
            if (tag.local === 'outlineLvl') { const n = Number(attr(tag, 'val')); if (n >= 0 && n < 6) paragraph.level = n + 1; }
            if (tag.local === 'numPr') paragraph.list = true;
            if (tag.local === 'ilvl') { const n = Number(attr(tag, 'val')); if (!Number.isInteger(n) || n < 0 || n > 8) fail('MALFORMED_ARCHIVE'); paragraph.depth = n; }
            if (tag.local === 'tab') paragraph.text += '\t';
            if (tag.local === 'br' || tag.local === 'cr') paragraph.text += '\n';
        }, value => { if (paragraph && inText) paragraph.text += value; }, tag => {
            if (tag.uri !== W) return;
            if (tag.local === 't') inText = false;
            if (tag.local === 'p' && paragraph) {
                if (paragraph.level && paragraph.text.trim()) headings.push({ level: paragraph.level, text: paragraph.text.trim() });
                paragraphs.push((paragraph.list ? '  '.repeat(paragraph.depth) + '- ' : '') + paragraph.text);
                paragraph = undefined;
            }
        });
        if ([...files.keys()].some(name => /word\/(?:comments|media|header|footer|footnotes|endnotes)/u.test(name))) warnings.add('Kommentare, Bilder, Kopf-/Fußzeilen und Fußnoten gehören nicht zum importierten Haupttext.');
        const text = paragraphs.join('\n');
        if (!text.trim()) fail('UNSUPPORTED_FORMAT');
        if (text.length > 2000000 || countWords(text) > limits.words || performance.now() > deadline) fail('INPUT_LIMIT');
        const parsed = parsedInputSchema.safeParse({ text, headings, warnings: [...warnings], sha256: createHash('sha256').update(input).digest('hex') });
        if (!parsed.success) fail('INPUT_LIMIT');
        return ok(parsed.data);
    } catch (e) { return err(isFault(e) ? e : makeFault('MALFORMED_ARCHIVE', requestId)); }
}
