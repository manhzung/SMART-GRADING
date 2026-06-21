import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set up fetch mock on globalThis BEFORE any imports
const mockFetch = vi.fn();
(globalThis as unknown as Record<string, unknown>).fetch = mockFetch;

// ─── Response helpers ─────────────────────────────────────────────────────

function pdfResp(blob: Blob): Response {
  return {
    ok: true, status: 200,
    headers: new Headers({ 'content-type': 'application/pdf' }),
    blob: () => Promise.resolve(blob),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  } as unknown as Response;
}

function errResp(status: number, message: string): Response {
  return {
    ok: false, status,
    headers: new Headers({ 'content-type': 'application/json' }),
    blob: () => Promise.resolve(new Blob()),
    json: () => Promise.resolve({ message }),
    text: () => Promise.resolve('{}'),
  } as unknown as Response;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('exportOmrTemplatePdf — server API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('fetches from GET /omr-templates/:id/pdf', async () => {
    mockFetch.mockResolvedValueOnce(pdfResp(new Blob(['pdf'], { type: 'application/pdf' })));
    const { exportOmrTemplatePdf } = await import('./examReportExport');
    await exportOmrTemplatePdf('template123', 'Test Exam', 'Test School');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect((mockFetch.mock.calls[0][0] as string)).toMatch('/omr-templates/template123/pdf');
  });

  it('appends examTitle and schoolName as query params', async () => {
    mockFetch.mockResolvedValueOnce(pdfResp(new Blob(['pdf'], { type: 'application/pdf' })));
    const { exportOmrTemplatePdf } = await import('./examReportExport');
    await exportOmrTemplatePdf('tid', 'Final Exam', 'Hanoi School');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('examTitle=Final+Exam');
    expect(url).toContain('schoolName=Hanoi+School');
  });

  it('throws on non-200 response', async () => {
    mockFetch.mockResolvedValueOnce(errResp(404, 'Template not found'));
    const { exportOmrTemplatePdf } = await import('./examReportExport');
    await expect(exportOmrTemplatePdf('bad', 'E', 'S')).rejects.toThrow('Template not found');
  });

  it('throws when response is not PDF', async () => {
    const notPdf = {
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      blob: () => Promise.resolve(new Blob(['not pdf'])),
      json: () => Promise.resolve({}), text: () => Promise.resolve('not pdf'),
    } as unknown as Response;
    mockFetch.mockResolvedValueOnce(notPdf);
    const { exportOmrTemplatePdf } = await import('./examReportExport');
    await expect(exportOmrTemplatePdf('tid', 'E', 'S')).rejects.toThrow('không phải PDF');
  });

  it('throws on empty blob', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'application/pdf' }),
      blob: () => Promise.resolve(new Blob([])),
      json: () => Promise.resolve({}), text: () => Promise.resolve(''),
    } as unknown as Response);
    const { exportOmrTemplatePdf } = await import('./examReportExport');
    await expect(exportOmrTemplatePdf('tid', 'E', 'S')).rejects.toThrow('rỗng');
  });
});

describe('exportOmrTemplateVersionSheetsPdf — server API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('single version calls GET /pdf (same as exportOmrTemplatePdf)', async () => {
    mockFetch.mockResolvedValueOnce(pdfResp(new Blob(['pdf'], { type: 'application/pdf' })));
    const { exportOmrTemplateVersionSheetsPdf } = await import('./examReportExport');
    await exportOmrTemplateVersionSheetsPdf('tid', ['A'], 'Exam', 'School');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect((mockFetch.mock.calls[0][0] as string)).toMatch('/omr-templates/tid/pdf');
  });

  it('multiple versions POSTs to /pdf/versions with version array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'application/zip' }),
      blob: () => Promise.resolve(new Blob(['zip'])),
      json: () => Promise.resolve({}), text: () => Promise.resolve(''),
    } as unknown as Response);
    const { exportOmrTemplateVersionSheetsPdf } = await import('./examReportExport');
    await exportOmrTemplateVersionSheetsPdf('tid', ['A', 'B', 'C'], 'Exam', 'School');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, opts] = mockFetch.mock.calls[0];
    expect((opts as RequestInit).method).toBe('POST');
    const body = JSON.parse(((opts as RequestInit).body as string));
    expect(body.versions).toEqual(['A', 'B', 'C']);
  });

  it('throws on POST non-200', async () => {
    mockFetch.mockResolvedValueOnce(errResp(500, 'Server error'));
    const { exportOmrTemplateVersionSheetsPdf } = await import('./examReportExport');
    await expect(exportOmrTemplateVersionSheetsPdf('tid', ['A', 'B'], 'E', 'S')).rejects.toThrow('Server error');
  });
});
