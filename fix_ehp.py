import re

filepath = "client/web/src/pages/QuestionBankPage.tsx"

with open(filepath, "rb") as f:
    content = f.read()

original = content

# --- Find EntityPageHeader JSX and replace with simpler approach ---
# Current EntityPageHeader with nested JSX in ternary
old_ehp = b"""<EntityPageHeader
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

# New: no extraActions, just the header
new_ehp = b"""<EntityPageHeader
        mode="teacher"
        title="Question Bank"
        subtitle="Create, manage, and filter academic questions and equations"
      />
"""

if old_ehp in content:
    content = content.replace(old_ehp, new_ehp, 1)
    print("Step 2b: Simplified EntityPageHeader (removed nested JSX in ternary)")
else:
    print("WARNING: old EntityPageHeader JSX not found")
    # Try regex
    pattern = rb'<EntityPageHeader.*?extraActions=\{.*?<>\s*<button.*?CreateBtn.*?</>\s*\)\s*:\s*undefined\s*\}.*?/>'
    new_content, n = re.subn(pattern, new_ehp, content, flags=re.DOTALL)
    if n > 0:
        content = new_content
        print(f"Step 2b: Simplified EntityPageHeader via regex ({n})")
    else:
        print("Could not find EntityPageHeader JSX pattern")

if content != original:
    with open(filepath, "wb") as f:
        f.write(content)
    print(f"\nResult: {'Modified' if content != original else 'No changes'} ({len(content) - len(original):+d} bytes)")
else:
    print("\nNo changes")
