/*
  Contour — CSV export (M6)

  Two pure pieces: turning columns + rows into a CSV string (RFC 4180-ish
  quoting), and triggering a client-side download of that string. No
  server, no dependency — a Blob + a temporary <a download> link, which is
  the standard mechanism for a static site to hand the browser a
  generated file.
*/

function escapeCell(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(columns, rows) {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCell(c.getValue(row))).join(","));
  return [header, ...lines].join("\r\n");
}

export function downloadCsv(filename, csvString) {
  // UTF-8 BOM so Excel renders accented characters (e.g. customer names
  // like "Bergström") correctly instead of guessing the wrong encoding.
  const blob = new Blob(["﻿" + csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
