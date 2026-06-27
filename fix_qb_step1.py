"""
Step-by-step surgical refactor of QuestionBankPage.tsx.
Step 1 ONLY: Replace header div with EntityPageHeader.
"""
import re

filepath = "client/web/src/pages/QuestionBankPage.tsx"

with open(filepath, "rb") as f:
    content = f.read()

orig_O = content.count(b'{')
orig_C = content.count(b'}')
print(f"Original: O={orig_O} C={orig_C} D={orig_O-orig_C}")
assert orig_O == orig_C, "Original already imbalanced!"

# --- Step 1: Add EntityPageHeader import ---
old_import = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\n\r\n// "
new_import = old_import + b"\r\nimport EntityPageHeader from '../presentation/components/shared/EntityPageHeader';"
# Better: insert after the EntityListPage import line
old_import2 = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\n\r\n// \xe2\x94\x80\xe2\x94\x80\xe2\x94\x80 LaTeX renderer"
new_import2 = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\nimport EntityPageHeader from '../presentation/components/shared/EntityPageHeader';\r\n\r\n// \xe2\x94\x80\xe2\x94\x80\xe2\x94\x80 LaTeX renderer"
assert old_import2 in content, "Import pattern not found"
content = content.replace(old_import2, new_import2, 1)
print(f"After import: O={content.count(b'{')} C={content.count(b'}')} D={content.count(b'{')-content.count(b'}')}")

# --- Step 2: Replace header div ---
# Find the header: starts with <div className={styles.header}> after the Top Header comment
# Use Question Bank h1 as anchor
qb = b'Question Bank</h1>'
qb_idx = content.find(qb)
assert qb_idx > 0, "QB not found"

# Find <div className={styles.header}> before qb
hd = b'<div className={styles.header}>'
hd_start = content.rfind(hd, 0, qb_idx)
assert hd_start > 0, "Header div not found"
print(f"Header starts at {hd_start}: {content[hd_start:hd_start+50]}")

# Find header close: look for "      </div>" before Main Layout
ml = content.find(b'Main Layout', hd_start)
assert ml > 0, "Main Layout not found"
# The closing </div> for the header is the one right before the Main Layout comment
# Look for the </div> that is at the same indentation level (6 spaces)
# Pattern: "      </div>\r\n\r\n      /* ─── Main Layout"
# Let's find all </div> in the range and pick the one closest to Main Layout
section = content[hd_start:ml]
# Find the LAST "      </div>" in the header section (this closes the header div)
last_div = section.rfind(b'      </div>')
assert last_div > 0, "Header close div not found"
# header_end is right after the </div>\r\n
header_end = hd_start + last_div + len(b'      </div>\r\n')
old_header = content[hd_start:header_end]
print(f"Old header: O={old_header.count(b'{')} C={old_header.count(b'}')}")

# Build new header with buttons preserved
tao_bang = 'Tạo bằng AI'.encode('utf-8')
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
    b"                <span>" + tao_bang + b"</span>\r\n"
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
print(f"New header: O={new_header.count(b'{')} C={new_header.count(b'}')}")

content = content[:hd_start] + new_header + content[header_end:]
O = content.count(b'{'); C = content.count(b'}')
print(f"After header: O={O} C={C} D={O-C}")

# --- Write ---
with open(filepath, "wb") as f:
    f.write(content)
print(f"\nWritten. Delta: {len(content) - (52775)} bytes")
