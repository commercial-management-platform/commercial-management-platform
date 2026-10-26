/**
 * Separador de columnas. Excel en español (configuración regional de Colombia) usa
 * punto y coma como separador de listas: con coma abre todo en una sola columna.
 */
const DELIMITER = ';'

/** Genera y descarga un CSV (con BOM para que Excel respete las tildes). */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  // Comillas según RFC 4180 si el valor trae separador, comillas o saltos de línea.
  const escape = (value: string | number | null) => {
    const text = value == null ? '' : String(value)
    return /[",;\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }

  const csv = [headers, ...rows].map((row) => row.map(escape).join(DELIMITER)).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
