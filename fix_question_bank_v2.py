import re

filepath = "client/web/src/pages/QuestionBankPage.tsx"

with open(filepath, "rb") as f:
    content = f.read()

original = content

def check(msg, c):
    o = c.count(b'{')
    cl = c.count(b'}')
    print(f"  {msg}: opens={o}, closes={cl}, diff={o-cl}")

print("Initial:", end=""); check("", content)

# Unicode box chars for comments (hex escapes)
# "───" = E2 94 80 E2 94 80 E2 94 80
DASH3 = b'\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80'  # "───"

# --- STEP 1: Add EntityPageHeader import ---
old_import = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\n\r\n// " + DASH3 + b" LaTeX renderer " + DASH3
new_import = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\nimport EntityPageHeader from '../presentation/components/shared/EntityPageHeader';\r\n\r\n// " + DASH3 + b" LaTeX renderer " + DASH3
assert old_import in content, "Step 1: Pattern not found"
content = content.replace(old_import, new_import, 1)
print("Step 1: EntityPageHeader import added"); check("", content)

# --- STEP 2: Replace header div ---
# Top Header comment: "/* " + DASH3 + " Top Header" + DASH3 + " */"
top_header_comment = b"/* " + DASH3 + b" Top Header " + DASH3 + b" */"
assert top_header_comment in content, f"Step 2: Top Header comment not found"
# The header div: starts with: "*/}\r\n      <div className={styles.header}>"
comment_end_marker = b"*/}\r\n      <div className={styles.header}>"
assert comment_end_marker in content, "Step 2: Header div marker not found"
start_idx = content.index(comment_end_marker)

# Header ends before Main Layout comment
# "      </div>\r\n\r\n      /* " + DASH3 + " Main Layout" + DASH3 + " */"
header_close_marker = b"      </div>\r\n\r\n      /* " + DASH3 + b" Main Layout " + DASH3 + b" */"
assert header_close_marker in content, "Step 2: Header close not found"
end_idx = content.index(header_close_marker) + len(header_close_marker)

new_header = (
    b"      <EntityPageHeader\r\n"
    b"        mode=\"teacher\"\r\n"
    b"        title=\"Question Bank\"\r\n"
    b"        subtitle=\"Create, manage, and filter academic questions and equations\"\r\n"
    b"      />\r\n"
)
content = content[:start_idx] + new_header + content[end_idx:]
print("Step 2: Header replaced"); check("", content)

# --- STEP 3: Wrap outer container with EntityListPage ---
old_return_open = b"  return (\r\n    <div className={styles.container}>"
assert old_return_open in content, "Step 3: Return pattern not found"
new_return_open = (
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
content = content.replace(old_return_open, new_return_open, 1)
print("Step 3: Outer wrapped"); check("", content)

# --- STEP 4: Close EntityListPage ---
old_close = b"\r\n    </div>\r\n  );"
assert old_close in content, "Step 4: Close pattern not found"
new_close = b"\r\n    </div>\r\n    </EntityListPage>\r\n  );"
last_idx = content.rfind(old_close)
content = content[:last_idx] + new_close + content[last_idx + len(old_close):]
print("Step 4: Closed"); check("", content)

# --- STEP 5: Remove unused QuestionRow/questionColumns ---
# Pattern starts with newline before interface
qr_start = b"\r\ninterface QuestionRow {"
if qr_start in content:
    start = content.index(qr_start)
    # Find end: look for "];\r\n" after questionColumns
    # questionColumns starts after interface, look for the closing ]); 
    rest = content[start:]
    # Find "];\r\n"  (end of questionColumns array)
    end_marker = rest.find(b"]);\r\n")
    assert end_marker >= 0, "Step 5: Could not find end of questionColumns"
    end = start + end_marker + len(b"]);\r\n")
    old_block = content[start:end]
    new_block = b"\r\n"
    content = content[:start] + new_block + content[end:]
    print("Step 5: Unused removed"); check("", content)
else:
    print("Step 5: QuestionRow not found (may not exist)"); check("", content)

# --- Write ---
if content != original:
    with open(filepath, "wb") as f:
        f.write(content)
    print(f"\nSUCCESS: {len(content) - len(original):+d} bytes")
else:
    print("\nNO CHANGES")
