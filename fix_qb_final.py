"""
Task 2.4: Refactor QuestionBankPage outer shell to use EntityListPage.

Current state (HEAD with step 1 EntityListPage wrapper):
  return (
    <div className={styles.container}>          ← outer wrapper (EntityListPage's page)
      <EntityPageHeader />                       ← provides TEACHER badge
      <section className={styles.browseContent}>  ← browse section
        <EntityListPage ...>                   ← INNER (old, broken)
          <EntityPageHeader />                 ← second TEACHER badge
          ...question cards...
        </EntityListPage>
        ...question cards (duplicate content)...
      </section>
    </div>

Target state:
  return (
    <EntityListPage ...>                     ← outer shell (page-level)
      <div className={styles.container}>      ← preserves existing styles
        <section>                             ← browse section with cards
          ...existing question cards...
        </section>
        ...modals...
      </div>
    </EntityListPage>
"""

filepath = "client/web/src/pages/QuestionBankPage.tsx"

with open(filepath, "rb") as f:
    content = f.read()

def check(label):
    O = content.count(b'{')
    C = content.count(b'}')
    print(f"  {label}: O={O} C={C} D={O-C}")

print("=== HEAD (with step1 wrapper) ===")
check("initial")

# ─── STEP 1: Add EntityPageHeader import (needed for inner removal) ───
ehp_import = b"import EntityPageHeader from '../presentation/components/shared/EntityPageHeader';\r\n"
if ehp_import not in content:
    # Insert after EntityListPage import
    ilp = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\n"
    content = content.replace(ilp, ilp + ehp_import, 1)
    print("Step 1: Added EntityPageHeader import"); check("")
else:
    print("Step 1: EHP import already present"); check("")

# ─── STEP 2: Add page-level columns, interface, and data mapping ───
# Find the QuestionRow interface and questionColumns (before function)
qr = b"\r\ninterface QuestionRow {"
if qr in content:
    print("QuestionRow interface found (OK, will map it)"); check("")
else:
    # Add it before the function
    func_start = content.find(b"export default function QuestionBankPage")
    insert_point = content.rfind(b"\r\n\r\n", 0, func_start)
    question_interface = (
        b"\r\ninterface QuestionRow {\r\n"
        b"  _id: string;\r\n"
        b"  text: string;\r\n"
        b"  difficulty: string;\r\n"
        b"  type: string;\r\n"
        b"  tags?: string[];\r\n"
        b"}\r\n"
    )
    content = content[:insert_point] + question_interface + content[insert_point:]
    print("Step 2: Added QuestionRow interface"); check("")

# ─── STEP 3: Add questionColumns before the function ───
func_start = content.find(b"export default function QuestionBankPage")
qc = b"const questionColumns"
if qc not in content:
    insert_point = content.rfind(b"\r\n\r\n", 0, func_start)
    columns_def = (
        b"const questionColumns: Column<QuestionRow>[] = [\r\n"
        b"  { key: 'text', header: 'N\\xc3\\xb4i dung', render: (r) => r.text.slice(0, 80) },\r\n"
        b"  { key: 'difficulty', header: '\\xc4\\x90\\xe1\\xbb\\x99 kh\\xc3\\xb3' },\r\n"
        b"  { key: 'tags', header: 'Tags', render: (r) => (r.tags ?? []).join(', ') },\r\n"
        b"];\r\n"
    )
    content = content[:insert_point] + columns_def + content[insert_point:]
    print("Step 3: Added questionColumns"); check("")
else:
    print("Step 3: questionColumns already present"); check("")

# ─── STEP 4: Add clientFiltered mapping before return ───
# Find "return (" of the main component
main_return = content.find(b"  return (\r\n    <div className={styles.container}>")
assert main_return > 0, "Step 4: main return not found"
# Find where to insert the mapping - just before the return
# The mapping: clientFiltered.map(q => ({ _id: q._id, text: q.text, ... }))
mapping_insert = (
    b"\r\n  // Map store questions to QuestionRow for EntityListPage\r\n"
    b"  const questionRows: QuestionRow[] = clientFiltered.map((q) => ({\r\n"
    b"    _id: q._id,\r\n"
    b"    text: q.text,\r\n"
    b"    difficulty: q.difficulty,\r\n"
    b"    type: q.type ?? 'single_choice',\r\n"
    b"    tags: q.tags,\r\n"
    b"  }));\r\n"
)
content = content[:main_return] + mapping_insert + content[main_return:]
print("Step 4: Added questionRows mapping"); check("")

# ─── STEP 5: Wrap outer <div> with EntityListPage ───
# Current: "  return (\r\n    <div className={styles.container}>"
# Target:   "  return (\r\n    <EntityListPage<QuestionRow>\r\n      ...props...\r\n    >\r\n      <div className={styles.container}>"
old_return_open = b"  return (\r\n    <div className={styles.container}>"
assert old_return_open in content, "Step 5: return pattern not found"
new_return_open = (
    b"  return (\r\n"
    b"    <EntityListPage<QuestionRow>\r\n"
    b"      mode=\"teacher\"\r\n"
    b"      title=\"Question Bank\"\r\n"
    b"      subtitle=\"Create, manage, and filter academic questions and equations\"\r\n"
    b"      rows={questionRows}\r\n"
    b"      columns={questionColumns}\r\n"
    b"      rowKey={(r) => r._id}\r\n"
    b"      loading={isLoading}\r\n"
    b"      error={error}\r\n"
    b"      pagination={{ page: pagination.page, pages: pagination.pages }}\r\n"
    b"      onSearch={(q) => setFilters({ search: q })}\r\n"
    b"      onPageChange={(p) => fetchQuestions({ page: p, limit: pagination.limit })}\r\n"
    b"      searchPlaceholder=\"T\\xc3\\xacm n\\xe1\\xbb\\x99i dung...\"\r\n"
    b"    >\r\n"
    b"      <div className={styles.container}>"
)
content = content.replace(old_return_open, new_return_open, 1)
print("Step 5: Wrapped with EntityListPage"); check("")

# ─── STEP 6: Remove the INNER broken EntityListPage + EntityPageHeader ───
# The inner ELP starts with: <EntityListPage\r\n          mode="teacher"\r\n          title="Browse Questions"
# It ends with: the browseContent's Browse Questions header + question cards
# We need to remove the inner ELP block entirely

# Find inner ELP start
inner_elp_start = content.find(b"<EntityListPage\r\n          mode=\"teacher\"\r\n          title=\"Browse Questions\"")
if inner_elp_start < 0:
    # Try other format
    inner_elp_start = content.find(b"<EntityListPage\r\n          mode=\"teacher\"")
    if inner_elp_start > 0:
        print(f"Found inner ELP at {inner_elp_start} (variant)"); check("")
assert inner_elp_start > 0, "Step 6: inner ELP not found"

# The inner ELP ends where the browseContent section's own content starts
# Look for the Browse Questions header which comes after the inner ELP closes
# Pattern: </EntityListPage> then Browse Questions h2
inner_elp_end_search = content.find(b"</EntityListPage>", inner_elp_start)
assert inner_elp_end_search > 0, "Step 6: inner ELP close not found"
inner_elp_end = inner_elp_end_search + len(b"</EntityListPage>")

# The inner ELP's content includes:
# 1. EntityPageHeader (inside ELP, BEFORE the section content)
# 2. The browseContent (inside ELP)
# After </EntityListPage>: the original Browse Questions h2 + question cards

# Check what comes after </EntityListPage>
after_close = content[inner_elp_end:inner_elp_end+200]
print(f"After inner ELP close: {repr(after_close[:100])}")

# Remove the inner ELP wrapper (keep its content: EntityPageHeader + browseContent)
# We need to remove:
#   <EntityListPage...>\r\n
#   ...children (EntityPageHeader + browseContent section)...
#   </EntityListPage>
# But KEEP the children content
inner_block = content[inner_elp_start:inner_elp_end]
print(f"Inner ELP block: O={inner_block.count(b'{')} C={inner_block.count(b'}')}")

# The inner ELP children are everything between "<EntityListPage...>" and "</EntityListPage>"
# But EntityListPage renders its children in a <div class={page}>, so the actual content
# is inside that div. We want to keep the section.browseContent and the Browse Questions h2/pagination.
# The EntityPageHeader inside ELP provides the second TEACHER badge.

# Actually: remove the ENTIRE inner EntityListPage block (from opening to closing)
# But KEEP the content that was inside it (the <section className={styles.browseContent}> with cards)
# The content inside ELP is the browseContent section

# Find what the inner ELP actually contains
# It's: <EntityListPage> + <section> + </EntityListPage>
# The <section> contains the Browse Questions header + question cards
# We need to KEEP the section but REMOVE the ELP wrapper and EntityPageHeader inside

# Find the <section className={styles.browseContent}> inside the inner ELP
section_idx = content.find(b"<section className={styles.browseContent}>", inner_elp_start)
assert section_idx > 0 and section_idx < inner_elp_end, "Step 6: browseContent section not found in inner ELP"

# The inner ELP content is from section_idx to inner_elp_end - len("</EntityListPage>\r\n")
# The EntityPageHeader inside the inner ELP is between <EntityListPage> and <section>
ehp_in_inner = content.find(b"<EntityPageHeader", inner_elp_start, inner_elp_end)
if ehp_in_inner > 0:
    # Find where the inner EntityPageHeader ends
    ehp_close = content.find(b"      />", ehp_in_inner)
    if ehp_close > 0 and ehp_close < section_idx:
        # Remove the inner EntityPageHeader (between ELP open and section)
        # Also remove the <div className={styles.page}> that wraps ELP's children
        # The ELP renders: <div class={styles.page}> + EntityPageHeader + children
        page_div_in_elp = content.find(b"<div className={styles.page}>", inner_elp_start, section_idx)
        if page_div_in_elp > 0:
            # Remove from page div open to section start (inclusive)
            to_remove = content[page_div_in_elp:section_idx]
            print(f"Removing: {repr(to_remove[:50])}...{repr(to_remove[-50:])}")
            content = content[:page_div_in_elp] + content[section_idx:]
            print("Step 6: Removed inner EntityPageHeader and page div wrapper"); check("")
        else:
            # Just remove the EntityPageHeader
            to_remove = content[ehp_in_inner:section_idx]
            content = content[:ehp_in_inner] + content[section_idx:]
            print("Step 6: Removed inner EntityPageHeader"); check("")
    else:
        print("Step 6: EHP in inner not in expected position"); check("")
else:
    print("Step 6: No EntityPageHeader in inner ELP"); check("")

# ─── STEP 7: Remove QuestionRow+questionColumns dead code (now moved) ───
# Find the duplicate QuestionRow/questionColumns in module scope
qr2 = b"\r\ninterface QuestionRow {"
qc2 = b"const questionColumns: Column<QuestionRow>[]"
if qr2 in content and qc2 in content:
    # Find where the FIRST occurrence is (module-level, not the one we just added)
    first_qr = content.find(qr2)
    second_qr = content.find(qr2, first_qr + 1)
    if second_qr > 0:
        # Remove from first_qr to end of questionColumns
        qc2_end = content.find(b"];\r\n", first_qr) + len(b"];\r\n")
        old_block = content[first_qr:qc2_end]
        content = content[:first_qr] + b"\r\n" + content[qc2_end:]
        print("Step 7: Removed duplicate QuestionRow+columns"); check("")
    else:
        print("Step 7: Only one QuestionRow found (OK)"); check("")
else:
    print("Step 7: Module-level QuestionRow/columns not found"); check("")

# ─── STEP 8: Close the outer EntityListPage ───
old_close = b"\r\n    </div>\r\n  );"
new_close = b"\r\n    </div>\r\n    </EntityListPage>\r\n  );"
assert old_close in content, "Step 8: close pattern not found"
last_close = content.rfind(old_close)
content = content[:last_close] + new_close + content[last_close + len(old_close):]
print("Step 8: Added closing EntityListPage"); check("")

# ─── Write ───
with open(filepath, "wb") as f:
    f.write(content)

O = content.count(b'{')
C = content.count(b'}')
print(f"\n=== FINAL ===")
print(f"Balanced: {'YES' if O == C else f'NO ({O-C})'}")

if O != C:
    print("WARNING: Brace imbalance detected!")
