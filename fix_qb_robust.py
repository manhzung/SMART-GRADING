"""
Task 2.4 - Robust surgical refactor
Using regex for complex multi-line pattern matching.
"""
import re, filepath_operations as fp

filepath = "client/web/src/pages/QuestionBankPage.tsx"

with open(filepath, "rb") as f:
    content = f.read()

def check(label):
    O = content.count(b'{')
    C = content.count(b'}')
    print(f"  {label}: O={O} C={C} D={O-C}")

print("=== Initial ===")
check("init")

# ── 1. Add EntityPageHeader import ──
# Insert after EntityListPage import
old_imp = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\n"
new_imp = (
    b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\n"
    b"import EntityPageHeader from '../presentation/components/shared/EntityPageHeader';\r\n"
)
content = content.replace(old_imp, new_imp, 1)
print("1. Added EntityPageHeader import"); check("")

# ── 2. Add QuestionRow interface + questionColumns before function (if not present) ──
func_match = re.search(rb"export default function QuestionBankPage", content)
func_pos = func_match.start()

# Check if QuestionRow already exists
has_qr = rb"interface QuestionRow" in content[:func_pos]
has_qc = rb"const questionColumns" in content[:func_pos]

qr_def = (
    rb"\r\n"
    rb"interface QuestionRow {\r\n"
    rb"  _id: string;\r\n"
    rb"  text: string;\r\n"
    rb"  difficulty: string;\r\n"
    rb"  type: string;\r\n"
    rb"  tags?: string[];\r\n"
    rb"}\r\n"
    rb"\r\n"
    rb"const questionColumns: Column<QuestionRow>[] = [\r\n"
    rb"  { key: 'text', header: 'N" + b'\xc3\xb4'.decode('latin-1').encode('utf-8') + rb"i dung', render: (r) => r.text.slice(0, 80) },\r\n"
    rb"  { key: 'difficulty', header: '\xc4\x90" + b'\xe1\xbb\x99'.decode('latin-1').encode('utf-8') + rb" kh" + b'\xc3\xb3'.decode('latin-1').encode('utf-8') + rb"' },\r\n"
    rb"  { key: 'tags', header: 'Tags', render: (r) => (r.tags ?? []).join(', ') },\r\n"
    rb"];\r\n"
)

if not has_qr:
    # Insert before function
    insert_before = content.rfind(b"\r\n\r\n", 0, func_pos)
    content = content[:insert_before] + qr_def + content[insert_before:]
    print("2a. Added QuestionRow interface + questionColumns"); check("")
else:
    print("2. QuestionRow/columns already present"); check("")

# ── 3. Wrap outer container with EntityListPage ──
# Find: "  return (\n    <div className={styles.container}>"
old_return = rb"  return (\r\n    <div className={styles.container}>"
m = re.search(rb"  return \(\r\n    <div className=\{styles\.container\}>", content)
assert m, "3. Return pattern not found"

new_return = (
    rb"  return (\r\n"
    rb"    <EntityListPage<QuestionRow>\r\n"
    rb"      mode=\"teacher\"\r\n"
    rb"      title=\"Question Bank\"\r\n"
    rb"      subtitle=\"Create, manage, and filter academic questions and equations\"\r\n"
    rb"      rows={questionRows}\r\n"
    rb"      columns={questionColumns}\r\n"
    rb"      rowKey={(r) => r._id}\r\n"
    rb"      loading={isLoading}\r\n"
    rb"      error={error}\r\n"
    rb"      pagination={{ page: pagination.page, pages: pagination.pages }}\r\n"
    rb"      onSearch={(q) => setFilters({ search: q })}\r\n"
    rb"      onPageChange={(p) => fetchQuestions({ page: p, limit: pagination.limit })}\r\n"
    rb"      searchPlaceholder=\"T\xecm ki\xe1\xbb\x83m...\"\r\n"
    rb"    >\r\n"
    rb"      <div className={styles.container}>"
)
content = content[:m.start()] + new_return + content[m.end():]
print("3. Wrapped outer container with EntityListPage"); check("")

# ── 4. Remove inner EntityListPage + its EntityPageHeader ──
# Pattern: inner ELP starts after Browse Questions section comment,
# ends before the Browse Questions header h2
# We need to find and remove the inner EntityListPage JSX and its EntityPageHeader

# Find the Browse Questions section (which contains the inner ELP)
# Pattern: "// ─── Right: Questions" comment → inner ELP → Browse Questions header
right_questions = rb"/* ─── Right: Questions"
rq_match = re.search(right_questions + rb".*?<EntityListPage", content, re.DOTALL)
if rq_match:
    print("Found Right: Questions section with inner ELP")
    check("")

# Find the inner ELP block
inner_elp = rb"<EntityListPage\r\n          mode=\"teacher\"\r\n          title=\"Browse Questions\""
elp_match = re.search(rb"<EntityListPage\r\n          mode=\"teacher\"\r\n          title=\"Browse Questions\".*?</EntityListPage>", content, re.DOTALL)
if elp_match:
    inner_block = elp_match.group()
    print(f"Found inner ELP block: {len(inner_block)} bytes, O={inner_block.count(b'{')}, C={inner_block.count(b'}')}")
    
    # The inner ELP renders: <div className={styles.page}> + EntityPageHeader + Browse Questions header + content
    # We want to KEEP the Browse Questions header + content, REMOVE the ELP wrapper and EntityPageHeader
    
    # Extract what to keep: the section content (browseHeader, question cards, pagination)
    # The content starts after the inner EntityPageHeader
    inner_ehp = rb"<EntityPageHeader\r\n          mode=\"teacher\"\r\n          title=\"Browse Questions\""
    ehp_match = re.search(rb"<EntityPageHeader\r\n          mode=\"teacher\"\r\n          title=\"Browse Questions\".*?/>", inner_block, re.DOTALL)
    
    if ehp_match:
        # Remove EntityPageHeader from inner block
        inner_without_ehp = inner_block[:ehp_match.start()] + inner_block[ehp_match.end():]
        # Also remove the page div wrapper that EntityListPage adds
        page_div = rb"<div className=\{styles\.page\}>"
        pd_match = re.search(page_div, inner_without_ehp)
        if pd_match:
            # Find closing </div> for this page div
            # Look for the closing </div> of the page div (6 spaces indent)
            page_div_end = re.search(rb"      </div>", inner_without_ehp[pd_match.end():])
            if page_div_end:
                inner_content = (
                    inner_without_ehp[:pd_match.start()] +
                    inner_without_ehp[pd_match.end():pd_match.end() + page_div_end.start()] +
                    inner_without_ehp[pd_match.end() + page_div_end.end():]
                )
                inner_without_ehp = inner_content
        
        # Replace inner ELP with just its content (without EHP and page wrapper)
        content = content[:elp_match.start()] + inner_without_ehp + content[elp_match.end():]
        print("4. Removed inner EntityListPage and its EntityPageHeader"); check("")
    else:
        print("4. Inner EntityPageHeader not found in inner ELP block")
        check("")
else:
    print("4. Inner ELP not found"); check("")

# ── 5. Add questionRows mapping before return ──
# This maps clientFiltered from the store to QuestionRow[]
mapping = (
    rb"\r\n  // Map store questions to QuestionRow[] for EntityListPage shell\r\n"
    rb"  const questionRows: QuestionRow[] = clientFiltered.map((q) => ({\r\n"
    rb"    _id: q._id,\r\n"
    rb"    text: q.text,\r\n"
    rb"    difficulty: q.difficulty,\r\n"
    rb"    type: q.type ?? 'single_choice',\r\n"
    rb"    tags: q.tags,\r\n"
    rb"  }));\r\n"
)

# Insert before the return
return_pos = content.find(b"  return (")
insert_before_return = content.rfind(b"\r\n", 0, return_pos)
content = content[:insert_before_return] + mapping + content[insert_before_return:]
print("5. Added questionRows mapping"); check("")

# ── 6. Close EntityListPage ──
old_close = rb"\r\n    </div>\r\n  );"
new_close = rb"\r\n    </div>\r\n    </EntityListPage>\r\n  );"
if old_close in content:
    last_close = content.rfind(old_close)
    content = content[:last_close] + new_close + content[last_close + len(old_close):]
    print("6. Added closing EntityListPage"); check("")
else:
    print("6. Close pattern not found, trying CRLF")
    old_close2 = rb"\r\n    </div>\r\n  );"
    if old_close2 in content:
        last_close = content.rfind(old_close2)
        content = content[:last_close] + new_close + content[last_close + len(old_close2):]
        print("6. Added closing (CRLF variant)"); check("")

# ── 7. Remove QuestionRow+questionColumns dead code (if duplicate) ──
# Check if there's duplicate QuestionRow definition (one in module scope, one in function?)
# Actually the QuestionRow interface is now needed for the EntityListPage type
# The questionColumns is also needed. No removal needed.
print("7. (no-op)"); check("")

# ── Write ──
with open(filepath, "wb") as f:
    f.write(content)

O = content.count(b'{')
C = content.count(b'}')
print(f"\n=== RESULT ===")
print(f"Balanced: {'YES' if O == C else f'NO ({O-C})'}")
