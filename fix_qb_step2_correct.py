"""
Step 2 (corrected): 
- Remove the outer EntityPageHeader (was added in step 1 - wrong)
- Keep outer <div className={styles.container}>
- Modify the inner EntityListPage to use it as the outer page shell
- Remove EntityPageHeader from inside inner EntityListPage
- Remove QuestionRow + questionColumns dead code
"""
filepath = "client/web/src/pages/QuestionBankPage.tsx"

with open(filepath, "rb") as f:
    content = f.read()

orig_O = content.count(b'{')
orig_C = content.count(b'}')
print(f"Initial: O={orig_O} C={orig_C} D={orig_O-orig_C}")

# --- A: Remove outer EntityPageHeader (restore original outer header div) ---
# The current file has: <div className={styles.container}>
#   <!-- comment -->
#   <EntityPageHeader .../>  ← WRONG, needs to be old <div className={styles.header}>
#   <div className={styles.pageLayout}>
# Restore the old header div
old_outer_ehp = (
    b"      <EntityPageHeader\r\n"
    b"        mode=\"teacher\"\r\n"
    b"        title=\"Question Bank\"\r\n"
    b"        subtitle=\"Create, manage, and filter academic questions and equations\"\r\n"
    b"        extraActions={\r\n"
    b"          canManage ? (\r\n"
    b"            <>\r\n"
    b"              <button className={styles.createBtn} style={{ backgroundColor: '#7c3aed' }} onClick={() => setIsAiModalOpen(true)}>\r\n"
    b"                <Sparkles size={18} />\r\n"
    b"                <span>T\xe1\xba\xa1o b\xe1\xba\xebng AI</span>\r\n"
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
old_outer_div = (
    b"      {/* \xe2\x94\x80\xe2\x94\x80\xe2\x94\x80 Top Header \xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80 */}\r\n"
    b"      <div className={styles.header}>\r\n"
    b"        <div className={styles.headerInfo}>\r\n"
    b"          <h1>Question Bank</h1>\r\n"
    b"          <p>Create, manage, and filter academic questions and equations</p>\r\n"
    b"        </div>\r\n"
    b"        {canManage && (\r\n"
    b"          <div style={{ display: 'flex', gap: '8px' }}>\r\n"
    b"            <button className={styles.createBtn} style={{ backgroundColor: '#7c3aed' }} onClick={() => setIsAiModalOpen(true)}>\r\n"
    b"              <Sparkles size={18} />\r\n"
    b"              <span>T\xe1\xba\xa1o b\xe1\xba\xebng AI</span>\r\n"
    b"            </button>\r\n"
    b"            <button className={styles.createBtn} onClick={() => setIsAddModalOpen(true)}>\r\n"
    b"              <Plus size={18} />\r\n"
    b"              <span>Add Question</span>\r\n"
    b"            </button>\r\n"
    b"          </div>\r\n"
    b"        )}\r\n"
    b"      </div>\r\n"
)
if old_outer_ehp in content:
    content = content.replace(old_outer_ehp, old_outer_div, 1)
    print("A: Restored old outer header div"); check("")
else:
    print("A: WARNING - outer EHP not found"); check("")

# --- B: Modify inner EntityListPage to be the outer page shell ---
# Current: EntityListPage with title="Browse Questions", has EntityPageHeader inside
# Target: EntityListPage with title="Ngân hàng câu hỏi", mode="teacher"
# Remove the inner EntityPageHeader from inside EntityListPage

# First, update the inner EntityListPage props to use it as page shell
# Find the inner EntityListPage JSX
inner_elp_marker = (
    b"<EntityListPage\r\n"
    b"          mode=\"teacher\"\r\n"
    b"          title=\"Browse Questions\""
)
assert inner_elp_marker in content, "B: Inner ELP not found"

# The inner ELP has title="Browse Questions", subtitle="" which causes EntityPageHeader to render
# Update to use proper page shell values
old_inner_elp_title = (
    b"<EntityListPage\r\n"
    b"          mode=\"teacher\"\r\n"
    b"          title=\"Browse Questions\"\r\n"
    b"          subtitle=\"\""
)
new_inner_elp_title = (
    b"<EntityListPage\r\n"
    b"          mode=\"teacher\"\r\n"
    b"          title=\"Ng\xe2\x80\x99n h\xe1\xba\xa5ng c\xe2\x80\xa6u h\xe1\xbb\x8fi\"\r\n"
    b"          subtitle=\"Qu\xe1\xba\xa3n l\xc3\xbd c\xc3\xa2u h\xe1\xbb\x8fi c\xe1\xbb\xa7a b\xe1\xba\xa1n\""
)
if old_inner_elp_title in content:
    content = content.replace(old_inner_elp_title, new_inner_elp_title, 1)
    print("B: Updated inner ELP title/subtitle"); check("")
else:
    print("B: Inner ELP title pattern not found"); check("")

# Also update searchPlaceholder to be more user-friendly
old_sp = b'          searchPlaceholder="T\xc3\xacm n\xe1\xbb\x99i dung..."'
new_sp = b'          searchPlaceholder="T\xc3\xacm ki\xe1\xba\xebm..."'
if old_sp in content:
    content = content.replace(old_sp, new_sp, 1)
    print("B2: Updated search placeholder"); check("")

# Also update the questionColumns key from 'text' to 'content' if needed
# Actually, the data has 'text' not 'content', so keep as-is

# --- C: Remove QuestionRow + questionColumns dead code ---
qr = b"\r\ninterface QuestionRow {"
if qr in content:
    s = content.index(qr)
    rest = content[s:]
    e = rest.find(b"]);\r\n")
    if e > 0:
        end = s + e + len(b"]);\r\n")
        content = content[:s] + b"\r\n" + content[end:]
        print("C: Removed QuestionRow+columns"); check("")
    else:
        print("C: QuestionRow found but end not found"); check("")
else:
    print("C: QuestionRow not found"); check("")

# --- D: Remove EntityPageHeader import (no longer needed) ---
old_ehp_import = b"import EntityPageHeader from '../presentation/components/shared/EntityPageHeader';\r\n"
if old_ehp_import in content:
    content = content.replace(old_ehp_import, b"")
    print("D: Removed EHP import"); check("")
else:
    print("D: EHP import not found"); check("")

# --- Write ---
with open(filepath, "wb") as f:
    f.write(content)
print(f"\nFinal: O={content.count(b'{')} C={content.count(b'}')}")
if content.count(b'{') != content.count(b'}'):
    print("WARNING: Imbalanced braces!")
