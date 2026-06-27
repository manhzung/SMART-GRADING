import re

filepath = "client/web/src/pages/QuestionBankPage.tsx"

with open(filepath, "rb") as f:
    content = f.read()

original = content

# --- Step 1: Add EntityPageHeader import after EntityListPage import ---
# Note: file uses CRLF line endings
old_import = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\n\r\n// "
new_import = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\nimport EntityPageHeader from '../presentation/components/shared/EntityPageHeader';\r\n\r\n// "

if old_import in content:
    content = content.replace(old_import, new_import, 1)
    print("Step 1: EntityPageHeader import added")
else:
    print("WARNING: EntityListPage import pattern not found")
    idx = content.find(b"EntityListPage")
    if idx >= 0:
        print("Found at:", idx, repr(content[idx:idx+200]))

# --- Step 2: Replace header div with EntityPageHeader ---
# Find header using unique markers
# Pattern: </p></div> then canManage buttons then </div> (close header)
marker_end = b"      </div>\r\n\r\n      {/* "
if marker_end in content:
    # Find where header starts
    header_start_marker = b"<div className={styles.header}>"
    if header_start_marker in content:
        start_idx = content.index(header_start_marker)
        end_idx = content.index(marker_end) + len(marker_end)
        
        new_header = b"""      <EntityPageHeader
        mode="teacher"
        title="Question Bank"
        subtitle="Create, manage, and filter academic questions and equations"
        extraActions={
          canManage ? (
            <>
              <button className={styles.createBtn} style={{ backgroundColor: '#7c3aed' }} onClick={() => setIsAiModalOpen(true)}>
                <Sparkles size={18} />
                <span>T\xe1\xba\xa1o b\xe1\xba\xebng AI</span>
              </button>
              <button className={styles.createBtn} onClick={() => setIsAddModalOpen(true)}>
                <Plus size={18} />
                <span>Add Question</span>
              </button>
            </>
          ) : undefined
        }
      />

"""
        content = content[:start_idx] + new_header + content[end_idx:]
        print("Step 2: Header div replaced with EntityPageHeader")
    else:
        print("WARNING: header div marker not found")
else:
    print("WARNING: marker_end not found")

# --- Step 3: Wrap outer container with EntityListPage ---
old_return_open = b"  return (\r\n    <div className={styles.container}>"
new_return_open = b"""  return (
    <EntityListPage<{ _id: string }>
      mode="teacher"
      title=""
      subtitle=""
      rows={[]}
      columns={[{ key: '_id', header: '' }]}
      rowKey={(r) => r._id}
      pagination={{ page: 1, pages: 1 }}
      onSearch={() => {}}
      onPageChange={() => {}}
      searchPlaceholder=""
      loading={false}
      error={null}
      headerExtra={null}
    >
      <div className={styles.container}>"""

if old_return_open in content:
    content = content.replace(old_return_open, new_return_open, 1)
    print("Step 3: Outer container wrapped with EntityListPage")
else:
    print("WARNING: return open pattern not found")

# --- Step 4: Close EntityListPage ---
# Find last "</div>\r\n  );"
old_return_close = b"\n    </div>\n  );"
new_return_close = b"\n    </div>\n    </EntityListPage>\n  );"

if old_return_close in content:
    last_idx = content.rfind(old_return_close)
    content = content[:last_idx] + new_return_close + content[last_idx + len(old_return_close):]
    print("Step 4: EntityListPage closing tag added")
else:
    # Try with \r\n
    old_rc = b"\r\n    </div>\r\n  );"
    new_rc = b"\r\n    </div>\r\n    </EntityListPage>\r\n  );"
    if old_rc in content:
        last_idx = content.rfind(old_rc)
        content = content[:last_idx] + new_rc + content[last_idx + len(old_rc):]
        print("Step 4: EntityListPage closing tag added (CRLF)")
    else:
        print("WARNING: return close pattern not found")

# --- Step 5: Remove unused QuestionRow/questionColumns ---
unused = b"\r\ninterface QuestionRow { _id: string; text: string; difficulty: string; type: string; tags?: string[]; schoolName?: string; }\r\n\r\nconst questionColumns: Column<QuestionRow>[] = [\r\n  { key: 'text', header: 'N\xe1\xbb\x99i dung', render: (r) => r.text.slice(0, 80) },\r\n  { key: 'difficulty', header: '\xc4\x90\xe1\xbb\x99 kh\xc3\xb3' },\r\n  { key: 'tags', header: 'Tags', render: (r) => (r.tags ?? []).join(', ') },\r\n];\r\n"
if unused in content:
    content = content.replace(unused, b"\r\n")
    print("Step 5: Unused interface/columns removed")
else:
    pattern = rb'\r\ninterface QuestionRow \{.*?questionColumns.*?\r\n\}\r\n'
    new_content, n = re.subn(pattern, b'\r\n', content, flags=re.DOTALL)
    if n > 0:
        content = new_content
        print(f"Step 5: Unused removed via regex ({n} replacements)")
    else:
        print("WARNING: unused interface not found (may not exist)")

# --- Write result ---
if content != original:
    with open(filepath, "wb") as f:
        f.write(content)
    print(f"\nSUCCESS: File modified. Delta: {len(content) - len(original):+d} bytes")
else:
    print("\nNO CHANGES MADE")
