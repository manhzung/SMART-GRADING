"""
Step 2 (corrected): Remove the outer EntityPageHeader I incorrectly added in step 1.
The inner EntityListPage already provides the TEACHER badge.
"""
filepath = "client/web/src/pages/QuestionBankPage.tsx"

with open(filepath, "rb") as f:
    content = f.read()

orig_O = content.count(b'{')
orig_C = content.count(b'}')
print(f"Initial: O={orig_O} C={orig_C} D={orig_O-orig_C}")

# The current file has EntityPageHeader at top of container, which is WRONG.
# It should use the original <div className={styles.header}>.
# Remove the outer EntityPageHeader and restore the original header div.

# Find and replace: EntityPageHeader block → original header div
old_outer = (
    b"      {/* \xe2\x94\x80\xe2\x94\x80\xe2\x94\x80 Top Header \xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80 */}\r\n"
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
new_outer = (
    b"      {/* \xe2\x94\x80\xe2\x94\x80\xe2\x94\x80 Top Header \xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80 */}\r\n"
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
if old_outer in content:
    content = content.replace(old_outer, new_outer, 1)
    print("A: Restored original header div"); check("")
else:
    print("A: Pattern not found"); check("")

# Remove EntityPageHeader import (no longer used)
old_imp = b"import EntityPageHeader from '../presentation/components/shared/EntityPageHeader';\r\n"
if old_imp in content:
    content = content.replace(old_imp, b"")
    print("B: Removed EHP import"); check("")
else:
    print("B: EHP import not found"); check("")

# Remove QuestionRow + questionColumns dead code
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

with open(filepath, "wb") as f:
    f.write(content)
print(f"\nWritten. Final: O={content.count(b'{')} C={content.count(b'}')}")
if content.count(b'{') != content.count(b'}'):
    print("WARNING: Imbalanced!")
else:
    print("Braces balanced: OK")
