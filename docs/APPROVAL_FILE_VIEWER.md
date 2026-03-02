# PDF and Word file viewer for client approvals

## Can we implement in-browser viewing with text selection and comments?

### PDF
- **Yes.** PDFs can be viewed in-browser (e.g. with [PDF.js](https://mozilla.github.io/pdf.js/) or a simple `<iframe>` with a blob URL). Text selection is supported by the browser or PDF.js. Adding **comments** (e.g. “highlight this paragraph”) would require:
  - Either an overlay layer where you store comment ranges (e.g. character or position ranges) and show pins/tooltips, or
  - A dedicated PDF annotation library that supports annotations and saving them (e.g. PDF.js + custom annotation layer, or a commercial viewer).
- **Recommendation:** Implement a PDF viewer (PDF.js or similar) and a comment layer that stores selection ranges and displays pins. This is feasible and commonly done.

### Word (.doc / .docx)
- **Harder in-browser.** Browsers do not natively render Word files. Options:
  1. **Convert to PDF on upload** (server-side, e.g. LibreOffice or a cloud service) and then use the same PDF viewer + comments as above. Clients would see and comment on the PDF version.
  2. **Use an external viewer** (e.g. Microsoft Office Online, Google Docs viewer) via iframe – limited control over commenting and branding.
  3. **Use a dedicated doc-viewer SDK** (e.g. some vendors offer docx viewer with annotations) – often paid and more integration work.
- **Recommendation:** For a consistent “highlight text + add comment” experience, **convert Word files to PDF on upload** (or on first view) and use the same PDF viewer and comment flow. That way both PDF and Word approvals behave the same.

### Summary
| File type | In-browser view | Text selection | Comments (e.g. highlight + pin) |
|-----------|-----------------|----------------|---------------------------------|
| PDF       | Yes (PDF.js / iframe) | Yes        | Yes (with custom or annotation layer) |
| Word      | Via conversion to PDF | Yes (on PDF) | Yes (same as PDF after conversion) |

So: **PDF and Word can both support a “view, highlight, comment” flow** if you add a PDF viewer and, for Word, a server-side conversion step to PDF. The current app already supports image commenting (click-to-pin); extending that to PDF (and PDF-from-Word) is the next step.
