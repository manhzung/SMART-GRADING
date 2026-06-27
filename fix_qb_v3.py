import re

filepath = "client/web/src/pages/QuestionBankPage.tsx"

with open(filepath, "rb") as f:
    content = f.read()

original = content

def check(label):
    o = content.count(b'{')
    cl = content.count(b'}')
    print(f"  {label}: O={o} C={cl} D={o-cl}")

print("Initial:", end=""); check("init")

# ─── STEP 1: Add EntityPageHeader import ───
old_import = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\n\r\n// "
new_import = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\nimport EntityPageHeader from '../presentation/components/shared/EntityPageHeader';\r\n\r\n// "
assert old_import in content, "Step 1: not found"
content = content.replace(old_import, new_import, 1)
print("Step 1: import added"); check("")

# ─── STEP 2: Replace header div ───
# Find the <div className={styles.header}> block (from Question Bank h1 backtrack)
qb_idx = content.find(b'Question Bank</h1>')
assert qb_idx > 0, "Step 2: QBank not found"
header_div = b'<div className={styles.header}>'
header_start = content.rfind(header_div, 0, qb_idx)
assert header_start > 0, "Step 2: header div not found"
# Find header end: "      </div>" before "/* ─── Main Layout"
ml = content.find(b'Main Layout', header_start)
assert ml > 0, "Step 2: Main Layout not found"
ml_close = content.rfind(b'      </div>', 0, ml)
assert ml_close > 0, "Step 2: header close not found"
header_end = ml_close + len(b'      </div>\r\n')

# Build new EntityPageHeader WITH buttons preserved in extraActions
# buttons contain Vietnamese chars - use byte values
tao_bang_ai = 'Tạo bằng AI'.encode('utf-8')
new_header = (
    b"      <EntityPageHeader\r\n"
    b"        mode=\"teacher\"\r\n"
    b"        title=\"Question Bank\"\r\n"
    b"        subtitle=\"Create, manage, and filter academic questions and equations\"\r\n"
    b"        extraActions={\r\n"
    b"          canManage ? (\r\n"
    b"            <>\r\n"
    b"              <button className={styles.createBtn} style={{ backgroundColor: '#7c3aed' }} onClick={() => setIsAiModalOpen(true)}>\r\n"
    b"                <Sparkles size={18} />\r\n"
    b"                <span>" + tao_bang_ai + b"</span>\r\n"
    b"              </button>\r\n"
    b"              <button className={styles.createBtn} onClick={() => setIsAddModalOpen(true)}>\r\n"
    b"                <Plus size={18} />\r\n"
    b"                <span>Add Question</span>\r\n"
    b"              </button>\r\n"
    b"            </>\r\n"
    b"          ) : undefined\r\n"
    b"        }\r\n"
    b"      />\r\n"
)
content = content[:header_start] + new_header + content[header_end:]
print("Step 2: header replaced with buttons preserved"); check("")

# ─── STEP 3: Wrap outer container ───
old_return = b"  return (\r\n    <div className={styles.container}>"
assert old_return in content, "Step 3: return not found"
new_return = (
    b"  return (\r\n"
    b"    <EntityListPage<{ _id: string }>\r\n"
    b"      mode=\"teacher\"\r\n"
    b"      title=\"\"\r\n"
    b"      subtitle=\"\"\r\n"
    b"      rows={[]}\r\n"
    b"      columns={[{ key: '_id', header: '' }]}\r\n"
    b"      rowKey={(r) => r._id}\r\n"
    b"      pagination={{ page: 1, pages: 1 }}\r\n"
    b"      onSearch={() => {}}\r\n"
    b"      onPageChange={() => {}}\r\n"
    b"      searchPlaceholder=\"\"\r\n"
    b"      loading={false}\r\n"
    b"      error={null}\r\n"
    b"      headerExtra={null}\r\n"
    b"    >\r\n"
    b"      <div className={styles.container}>"
)
content = content.replace(old_return, new_return, 1)
print("Step 3: wrapped"); check("")

# ─── STEP 4: Close EntityListPage ───
old_close = b"\r\n    </div>\r\n  );"
assert old_close in content, "Step 4: close not found"
new_close = b"\r\n    </div>\r\n    </EntityListPage>\r\n  );"
last_close = content.rfind(old_close)
content = content[:last_close] + new_close + content[last_close + len(old_close):]
print("Step 4: closed"); check("")

# ─── STEP 5: Remove QuestionRow + questionColumns (module-level dead code) ───
qr_start = b"\r\ninterface QuestionRow {"
if qr_start in content:
    s = content.index(qr_start)
    rest = content[s:]
    e = rest.find(b"]);\r\n")
    assert e > 0, "Step 5: end not found"
    end = s + e + len(b"]);\r\n")
    content = content[:s] + b"\r\n" + content[end:]
    print("Step 5: removed"); check("")
else:
    print("Step 5: not found"); check("")

# ─── Write ───
if content != original:
    with open(filepath, "wb") as f:
        f.write(content)
    print(f"\nSUCCESS: {len(content) - len(original):+d} bytes")
    with open(filepath, "rb") as f:
        final = f.read()
    check("FINAL")
    o = final.count(b'{'); cl = final.count(b'}')
    print(f"Balanced: {'YES' if o == cl else f'NO ({o-cl})'}")
else:
    print("\nNO CHANGES")
