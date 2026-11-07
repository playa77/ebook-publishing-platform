import { it, expect } from 'vitest';
import { zipSync } from 'fflate';
import { parseDocx } from '../../src/formats/docx';
import { parseOutline } from '../../src/formats/outline';
import { docx, W } from '../fixtures/docx';
it('extracts real DOCX text, inherited heading styles and nested lists', async () => {
    const r = await parseDocx(docx()); expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.headings).toEqual([{ level: 1, text: 'Kapitel ÄÖÜ' }]);
    expect(r.value.text).toBe('Kapitel ÄÖÜ\n  - Gelieferter Punkt: 800 Wörter.'); expect(r.value.sha256).toHaveLength(64);
});
it('retains Markdown headings, indentation, literal fences and HTML as inert supplied text', () => {
    const text = '# Kapitel\n  - Punkt **eins**\n```md\n# Kein Kapitel\n```\n<img src="https://example.test/x">';
    const r = parseOutline({ format: 'markdown', text }); expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value.text).toBe(text); expect(r.value.headings).toEqual([{ level: 1, text: 'Kapitel' }]); expect(r.value.warnings).toHaveLength(1); }
});
it.each(['ins', 'del', 'moveFrom', 'moveTo', 'pPrChange'])('rejects unresolved tracked %s content', async tag => {
    const r = await parseDocx(docx(`<w:p><w:${tag}><w:r><w:t>Änderung</w:t></w:r></w:${tag}></w:p>`)); expect(r.ok).toBe(false); if (!r.ok) expect(r.error.code).toBe('TRACKED_CHANGES');
});
it.each<Record<string, string>>([
    { 'word/_rels/document.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="hyperlink" Target="https://example.test" TargetMode="External"/></Relationships>' },
    { 'word/vbaProject.bin': 'macro' },
    { 'word/embeddings/oleObject.bin': 'active' },
    { 'word/comments.xml': `<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]><w:comments xmlns:w="${W}">&x;</w:comments>` },
    { '../outside.xml': '<x/>' },
    { '/absolute.xml': '<x/>' },
])('rejects active/external/traversal/entity archives without partial extraction', async extra => { const r = await parseDocx(docx(undefined, extra)); expect(r.ok).toBe(false); });
it('bounds actual decompression, entry count, extracted words and malformed archives', async () => {
    const bomb = docx('<w:p><w:r><w:t>' + 'x'.repeat(21 * 1024 * 1024) + '</w:t></w:r></w:p>');
    const entries = zipSync(Object.fromEntries(Array.from({ length: 2001 }, (_, i) => [`${i}.txt`, new Uint8Array()])));
    for (const bytes of [bomb, entries, new Uint8Array([1, 2, 3])]) expect((await parseDocx(bytes)).ok).toBe(false);
    expect(parseOutline({ format: 'paste', text: 'Wort '.repeat(100001) }).ok).toBe(false);
});
it('preserves tabs, line breaks and warns on ignored comments without extracting them', async () => {
    const r = await parseDocx(docx('<w:p><w:r><w:t>A</w:t><w:tab/><w:t>B</w:t><w:br/><w:t>C</w:t></w:r></w:p>', { 'word/comments.xml': `<w:comments xmlns:w="${W}"><w:comment><w:p><w:r><w:t>Geheim</w:t></w:r></w:p></w:comment></w:comments>` }));
    expect(r.ok).toBe(true); if (r.ok) { expect(r.value.text).toBe('A\tB\nC'); expect(r.value.warnings).toHaveLength(1); }
});
it('rejects CRC corruption and ZIPs masquerading as Word packages', async () => {
    const corrupted = Buffer.from(docx()), central = corrupted.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    corrupted.writeUInt32LE((corrupted.readUInt32LE(central + 16) ^ 1) >>> 0, central + 16);
    for (const bytes of [corrupted, docx(undefined, { '[Content_Types].xml': '<Types/>' }), docx(undefined, { 'word/document.xml': `<bogus xmlns:w="${W}"><w:p><w:r><w:t>Kein Word-Dokument</w:t></w:r></w:p></bogus>` })]) expect((await parseDocx(bytes)).ok).toBe(false);
});
it('honors lower configured size, entry, word and deadline limits', async () => {
    const limits = { compressedBytes: 5242880, expandedBytes: 20971520, entries: 2000, words: 100000, timeoutMs: 30000 };
    expect(parseOutline({ format: 'paste', text: 'eins zwei' }, { ...limits, words: 1 }).ok).toBe(false);
    for (const lowered of [{ entries: 1 }, { expandedBytes: 10 }, { compressedBytes: 10 }, { words: 1 }, { timeoutMs: 0 }]) expect((await parseDocx(docx(), { ...limits, ...lowered })).ok).toBe(false);
});
