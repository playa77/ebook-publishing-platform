import { zipSync, strToU8 } from 'fflate';
export const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export function docx(content = '<w:p><w:pPr><w:pStyle w:val="Titel"/></w:pPr><w:r><w:t>Kapitel ÄÖÜ</w:t></w:r></w:p><w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Gelieferter Punkt: 800 Wörter.</w:t></w:r></w:p>', extra: Record<string, string> = {}) {
    return zipSync(Object.fromEntries(Object.entries({
        '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
        'word/document.xml': `<w:document xmlns:w="${W}"><w:body>${content}</w:body></w:document>`,
        'word/styles.xml': `<w:styles xmlns:w="${W}"><w:style w:styleId="Base"><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style><w:style w:styleId="Titel"><w:basedOn w:val="Base"/></w:style></w:styles>`,
        ...extra,
    }).map(([key, value]) => [key, strToU8(value)])));
}
