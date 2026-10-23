export class CsvClientReader {
  parse(buffer: Buffer): Record<string, string>[] {
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return [];
    }

    const delimiter = this.detectDelimiter(lines[0]);
    const headers = this.parseLine(lines[0], delimiter);

    return lines.slice(1).map((line) => {
      const values = this.parseLine(line, delimiter);
      return headers.reduce<Record<string, string>>((acc, header, index) => {
        acc[header] = values[index] ?? '';
        return acc;
      }, {});
    });
  }

  private detectDelimiter(firstLine: string): ',' | ';' {
    const commaCount = (firstLine.match(/,/g) ?? []).length;
    const semicolonCount = (firstLine.match(/;/g) ?? []).length;
    return semicolonCount > commaCount ? ';' : ',';
  }

  private parseLine(line: string, delimiter: ',' | ';'): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];

      if (char === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === delimiter && !inQuotes) {
        values.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current);
    return values.map((value) => value.trim());
  }
}
